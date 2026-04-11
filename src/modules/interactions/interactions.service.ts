import { prisma } from "@/lib/prisma";
import { CommentTargetType, Prisma, RatingTargetType } from "@prisma/client";
import type {
  AuthorSnapshot,
  CommentItem,
  CreateCommentInput,
  ListCommentsQuery,
  PaginatedCommentsResponse,
  RateInput,
  RateResult,
  RatingSummary,
  UserReputationSnapshot,
} from "./interactions.types";

type TxClient = Prisma.TransactionClient;

interface TargetAuthorRow {
  id: string;
  authorId: string;
}

interface UserRoleRow {
  role: string | null;
}

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

function sanitizePlainText(value: string): string {
  return value.replace(/\u0000/g, "").trim();
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function ratingLabel(totalRatings: number): string {
  return totalRatings > 0 ? "Calificado" : "Sin calificaciones";
}

async function fetchAuthor(userId: string): Promise<AuthorSnapshot | null> {
  if (!process.env.MS01_URL) return null;

  try {
    const response = await fetch(`${process.env.MS01_URL}/api/users/${userId}`, {
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const user = payload.user;
    if (!user) return null;

    return {
      id: user.id,
      username: user.username ?? "usuario",
      avatarUrl: user.avatarUrl ?? null,
      role: user.role ?? "UNKNOWN",
    };
  } catch {
    return null;
  }
}

async function attachCommentAuthors(comments: CommentItem[]): Promise<CommentItem[]> {
  if (comments.length === 0) return comments;

  const authorIds = Array.from(new Set(comments.map((comment) => comment.authorId)));
  const authorEntries = await Promise.all(
    authorIds.map(async (authorId) => {
      const author = await fetchAuthor(authorId);
      return [authorId, author] as const;
    })
  );

  const authorMap = new Map(authorEntries);
  return comments.map((comment) => ({
    ...comment,
    author: authorMap.get(comment.authorId) ?? null,
  }));
}

async function getPublicationTarget(publicationId: string): Promise<TargetAuthorRow | null> {
  const rows = await prisma.$queryRaw<TargetAuthorRow[]>(Prisma.sql`
    SELECT "id", "authorId"
    FROM "publications"."publications"
    WHERE "id" = ${publicationId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function getQuestionTarget(questionId: string): Promise<TargetAuthorRow | null> {
  const rows = await prisma.$queryRaw<TargetAuthorRow[]>(Prisma.sql`
    SELECT "id", "authorId"
    FROM "questions"."questions"
    WHERE "id" = ${questionId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function getAnswerTarget(answerId: string): Promise<TargetAuthorRow | null> {
  const rows = await prisma.$queryRaw<TargetAuthorRow[]>(Prisma.sql`
    SELECT "id", "authorId"
    FROM "questions"."answers"
    WHERE "id" = ${answerId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function assertPublicationExists(publicationId: string): Promise<TargetAuthorRow> {
  const publication = await getPublicationTarget(publicationId);
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  return publication;
}

async function assertQuestionExists(questionId: string): Promise<TargetAuthorRow> {
  const question = await getQuestionTarget(questionId);
  if (!question) throw new Error("QUESTION_NOT_FOUND");
  return question;
}

async function assertAnswerExists(answerId: string): Promise<TargetAuthorRow> {
  const answer = await getAnswerTarget(answerId);
  if (!answer) throw new Error("ANSWER_NOT_FOUND");
  return answer;
}

async function isAdminUser(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<UserRoleRow[]>(Prisma.sql`
    SELECT "role"
    FROM "users"."users"
    WHERE "id" = ${userId}
    LIMIT 1
  `);

  const role = rows[0]?.role?.toUpperCase();
  return !!role && ADMIN_ROLES.has(role);
}

async function listCommentsByTarget(
  targetType: CommentTargetType,
  targetId: string,
  query: ListCommentsQuery
): Promise<PaginatedCommentsResponse> {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.comment.count({
      where: { targetType, targetId },
    }),
  ]);

  const data = await attachCommentAuthors(comments);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function createCommentByTarget(
  targetType: CommentTargetType,
  targetId: string,
  authorId: string,
  data: CreateCommentInput
) {
  return prisma.comment.create({
    data: {
      authorId,
      targetType,
      targetId,
      content: sanitizePlainText(data.content),
    },
  });
}

async function deleteCommentByTarget(
  targetType: CommentTargetType,
  targetId: string,
  commentId: string,
  requesterId: string
): Promise<void> {
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      targetType,
      targetId,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!comment) throw new Error("COMMENT_NOT_FOUND");

  if (comment.authorId !== requesterId) {
    const isAdmin = await isAdminUser(requesterId);
    if (!isAdmin) throw new Error("FORBIDDEN_COMMENT_DELETE");
  }

  await prisma.comment.delete({
    where: {
      id: comment.id,
    },
  });
}

async function refreshUserReputation(
  tx: TxClient,
  userId: string
): Promise<UserReputationSnapshot> {
  const aggregate = await tx.rating.aggregate({
    where: { targetAuthorId: userId },
    _avg: { score: true },
    _count: { score: true },
  });

  const avgRating = roundOneDecimal(aggregate._avg.score ?? 0);
  const totalRatings = aggregate._count.score;

  await tx.userReputation.upsert({
    where: { userId },
    create: {
      userId,
      avgRating,
      totalRatings,
    },
    update: {
      avgRating,
      totalRatings,
    },
  });

  await tx.userStats.upsert({
    where: { userId },
    create: {
      userId,
      avgRating,
      totalRatings,
    },
    update: {
      avgRating,
      totalRatings,
    },
  });

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "users"."users"
      SET
        "avgRating" = ${avgRating},
        "totalRatings" = ${totalRatings},
        "updatedAt" = NOW()
      WHERE "id" = ${userId}
    `
  );

  return { userId, avgRating, totalRatings };
}

async function buildRatingSummary(
  targetType: RatingTargetType,
  targetId: string,
  targetAuthorId: string,
  requesterId?: string
): Promise<RatingSummary> {
  const aggregate = await prisma.rating.aggregate({
    where: { targetType, targetId },
    _avg: { score: true },
    _count: { score: true },
  });

  const myRating = requesterId
    ? await prisma.rating.findUnique({
        where: {
          raterId_targetType_targetId: {
            raterId: requesterId,
            targetType,
            targetId,
          },
        },
        select: { score: true },
      })
    : null;

  const avgRating = roundOneDecimal(aggregate._avg.score ?? 0);
  const totalRatings = aggregate._count.score;

  return {
    targetType,
    targetId,
    targetAuthorId,
    avgRating,
    totalRatings,
    myScore: myRating?.score ?? null,
    label: ratingLabel(totalRatings),
  };
}

export async function listPublicationComments(
  publicationId: string,
  query: ListCommentsQuery
): Promise<PaginatedCommentsResponse> {
  await assertPublicationExists(publicationId);
  return listCommentsByTarget(CommentTargetType.PUBLICATION, publicationId, query);
}

export async function createPublicationComment(
  publicationId: string,
  authorId: string,
  data: CreateCommentInput
) {
  await assertPublicationExists(publicationId);
  return createCommentByTarget(CommentTargetType.PUBLICATION, publicationId, authorId, data);
}

export async function deletePublicationComment(
  publicationId: string,
  commentId: string,
  requesterId: string
): Promise<void> {
  await assertPublicationExists(publicationId);
  await deleteCommentByTarget(
    CommentTargetType.PUBLICATION,
    publicationId,
    commentId,
    requesterId
  );
}

export async function listQuestionComments(
  questionId: string,
  query: ListCommentsQuery
): Promise<PaginatedCommentsResponse> {
  await assertQuestionExists(questionId);
  return listCommentsByTarget(CommentTargetType.QUESTION, questionId, query);
}

export async function createQuestionComment(
  questionId: string,
  authorId: string,
  data: CreateCommentInput
) {
  await assertQuestionExists(questionId);
  return createCommentByTarget(CommentTargetType.QUESTION, questionId, authorId, data);
}

export async function deleteQuestionComment(
  questionId: string,
  commentId: string,
  requesterId: string
): Promise<void> {
  await assertQuestionExists(questionId);
  await deleteCommentByTarget(CommentTargetType.QUESTION, questionId, commentId, requesterId);
}

export async function ratePublication(
  publicationId: string,
  raterId: string,
  data: RateInput
): Promise<RateResult> {
  const publication = await assertPublicationExists(publicationId);

  if (publication.authorId === raterId) {
    throw new Error("SELF_RATING_NOT_ALLOWED");
  }

  return prisma.$transaction(async (tx) => {
    await tx.rating.upsert({
      where: {
        raterId_targetType_targetId: {
          raterId,
          targetType: RatingTargetType.PUBLICATION,
          targetId: publicationId,
        },
      },
      create: {
        raterId,
        targetAuthorId: publication.authorId,
        targetType: RatingTargetType.PUBLICATION,
        targetId: publicationId,
        score: data.score,
      },
      update: {
        score: data.score,
        targetAuthorId: publication.authorId,
      },
    });

    const aggregate = await tx.rating.aggregate({
      where: {
        targetType: RatingTargetType.PUBLICATION,
        targetId: publicationId,
      },
      _avg: { score: true },
      _count: { score: true },
    });

    const userReputation = await refreshUserReputation(tx, publication.authorId);
    const avgRating = roundOneDecimal(aggregate._avg.score ?? 0);
    const totalRatings = aggregate._count.score;

    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "publications"."publications"
        SET
          "avgRating" = ${avgRating},
          "totalRatings" = ${totalRatings},
          "updatedAt" = NOW()
        WHERE "id" = ${publicationId}
      `
    );

    return {
      targetType: RatingTargetType.PUBLICATION,
      targetId: publicationId,
      targetAuthorId: publication.authorId,
      avgRating,
      totalRatings,
      myScore: data.score,
      label: ratingLabel(totalRatings),
      userReputation,
    };
  });
}

export async function rateAnswer(
  answerId: string,
  raterId: string,
  data: RateInput
): Promise<RateResult> {
  const answer = await assertAnswerExists(answerId);

  if (answer.authorId === raterId) {
    throw new Error("SELF_RATING_NOT_ALLOWED");
  }

  return prisma.$transaction(async (tx) => {
    await tx.rating.upsert({
      where: {
        raterId_targetType_targetId: {
          raterId,
          targetType: RatingTargetType.ANSWER,
          targetId: answerId,
        },
      },
      create: {
        raterId,
        targetAuthorId: answer.authorId,
        targetType: RatingTargetType.ANSWER,
        targetId: answerId,
        score: data.score,
      },
      update: {
        score: data.score,
        targetAuthorId: answer.authorId,
      },
    });

    const aggregate = await tx.rating.aggregate({
      where: {
        targetType: RatingTargetType.ANSWER,
        targetId: answerId,
      },
      _avg: { score: true },
      _count: { score: true },
    });

    const userReputation = await refreshUserReputation(tx, answer.authorId);
    const avgRating = roundOneDecimal(aggregate._avg.score ?? 0);
    const totalRatings = aggregate._count.score;

    return {
      targetType: RatingTargetType.ANSWER,
      targetId: answerId,
      targetAuthorId: answer.authorId,
      avgRating,
      totalRatings,
      myScore: data.score,
      label: ratingLabel(totalRatings),
      userReputation,
    };
  });
}

export async function getPublicationRatingSummary(
  publicationId: string,
  requesterId?: string
): Promise<RatingSummary> {
  const publication = await assertPublicationExists(publicationId);
  return buildRatingSummary(
    RatingTargetType.PUBLICATION,
    publicationId,
    publication.authorId,
    requesterId
  );
}

export async function getAnswerRatingSummary(
  answerId: string,
  requesterId?: string
): Promise<RatingSummary> {
  const answer = await assertAnswerExists(answerId);
  return buildRatingSummary(RatingTargetType.ANSWER, answerId, answer.authorId, requesterId);
}
