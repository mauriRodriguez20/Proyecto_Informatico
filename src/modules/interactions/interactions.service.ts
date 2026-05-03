import { prisma } from "@/lib/prisma";
import { fetchWithKeepAlive } from "@/lib/http-client";
import {
  CommentTargetType,
  NotificationEntityType,
  NotificationType,
  Prisma,
  RatingTargetType,
} from "@prisma/client";
import type {
  AuthorSnapshot,
  CommentItem,
  CreateCommentInput,
  ListNotificationsQuery,
  MarkAllReadResult,
  MarkReadResult,
  NotificationItem,
  PaginatedNotificationsResponse,
  ListCommentsQuery,
  PaginatedCommentsResponse,
  RateInput,
  RateResult,
  RatingSummary,
  UnreadCountResult,
  UserReputationSnapshot,
  UserStatsSnapshot,
} from "./interactions.types";

type TxClient = Prisma.TransactionClient;

interface TargetAuthorRow {
  id: string;
  authorId: string;
}

interface UserRoleRow {
  role: string | null;
}

interface ExistsRow {
  exists: boolean;
}

interface CountRow {
  count: number;
}

interface QuestionSnapshotRow {
  id: string;
  title: string;
  authorId: string;
}

interface AnswerSnapshotRow {
  id: string;
  authorId: string;
  questionId: string;
}

interface UsernameRow {
  username: string | null;
}

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
let publicationCommentsCountColumnExists: boolean | null = null;

function sanitizePlainText(value: string): string {
  return value.replace(/\u0000/g, "").trim();
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function ratingLabel(totalRatings: number): string {
  return totalRatings > 0 ? "Calificado" : "Sin calificaciones";
}

interface BatchAuthorResponse {
  users?: Array<{
    id: string;
    username: string;
    avatarUrl: string | null;
    role: string;
    avgRating?: number;
    totalRatings?: number;
  }>;
}

const AUTHOR_CACHE_TTL_MS = 60_000;
const AUTHOR_MISS_CACHE_TTL_MS = 10_000;
const authorSnapshotCache = new Map<
  string,
  { value: AuthorSnapshot | null; expiresAt: number }
>();

async function fetchAuthorsBatch(
  userIds: string[]
): Promise<Map<string, AuthorSnapshot | null>> {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  const result = new Map<string, AuthorSnapshot | null>();
  const missingIds: string[] = [];
  const now = Date.now();

  uniqueIds.forEach((id) => {
    const cached = authorSnapshotCache.get(id);
    if (cached && cached.expiresAt > now) {
      result.set(id, cached.value);
      return;
    }
    result.set(id, null);
    missingIds.push(id);
  });

  if (uniqueIds.length === 0) return result;
  if (missingIds.length === 0) return result;
  if (!process.env.MS01_URL) return result;

  try {
    const query = encodeURIComponent(missingIds.join(","));
    const response = await fetchWithKeepAlive(`${process.env.MS01_URL}/api/users/batch?ids=${query}`, {
      cache: "no-store",
    });

    if (!response.ok) return result;

    const payload = (await response.json()) as BatchAuthorResponse;
    const users = Array.isArray(payload.users) ? payload.users : [];

    const returnedIds = new Set<string>();
    users.forEach((user) => {
      const value: AuthorSnapshot = {
        id: user.id,
        username: user.username ?? "usuario",
        avatarUrl: user.avatarUrl ?? null,
        role: user.role ?? "UNKNOWN",
        avgRating:
          typeof user.avgRating === "number" ? user.avgRating : undefined,
        totalRatings:
          typeof user.totalRatings === "number" ? user.totalRatings : undefined,
      };
      result.set(user.id, value);
      returnedIds.add(user.id);
      authorSnapshotCache.set(user.id, {
        value,
        expiresAt: now + AUTHOR_CACHE_TTL_MS,
      });
    });

    missingIds.forEach((id) => {
      if (returnedIds.has(id)) return;
      authorSnapshotCache.set(id, {
        value: null,
        expiresAt: now + AUTHOR_MISS_CACHE_TTL_MS,
      });
    });

    return result;
  } catch {
    return result;
  }
}

async function attachCommentAuthors(comments: CommentItem[]): Promise<CommentItem[]> {
  if (comments.length === 0) return comments;

  const authorIds = Array.from(new Set(comments.map((comment) => comment.authorId)));
  const authorMap = await fetchAuthorsBatch(authorIds);
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
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function refreshPublicationCommentsCount(
  tx: TxClient,
  publicationId: string
): Promise<void> {
  if (publicationCommentsCountColumnExists === null) {
    try {
      const rows = await tx.$queryRaw<ExistsRow[]>(
        Prisma.sql`
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'publications'
              AND table_name = 'publications'
              AND column_name = 'commentsCount'
          ) AS "exists"
        `
      );
      publicationCommentsCountColumnExists = rows[0]?.exists ?? false;
    } catch {
      publicationCommentsCountColumnExists = false;
    }
  }

  if (!publicationCommentsCountColumnExists) return;

  const totalComments = await tx.comment.count({
    where: {
      targetType: CommentTargetType.PUBLICATION,
      targetId: publicationId,
    },
  });

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "publications"."publications"
      SET
        "commentsCount" = ${totalComments},
        "updatedAt" = NOW()
      WHERE "id" = ${publicationId}
    `
  );
}

async function countUserPublications(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM "publications"."publications"
    WHERE "authorId" = ${userId}
  `);

  return rows[0]?.count ?? 0;
}

async function countUserQuestions(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM "questions"."questions"
    WHERE "authorId" = ${userId}
  `);

  return rows[0]?.count ?? 0;
}

async function countUserAnswers(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM "questions"."answers"
    WHERE "authorId" = ${userId}
  `);

  return rows[0]?.count ?? 0;
}

async function getQuestionSnapshot(questionId: string): Promise<QuestionSnapshotRow | null> {
  const rows = await prisma.$queryRaw<QuestionSnapshotRow[]>(Prisma.sql`
    SELECT "id", "title", "authorId"
    FROM "questions"."questions"
    WHERE "id" = ${questionId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function getAnswerSnapshot(answerId: string): Promise<AnswerSnapshotRow | null> {
  const rows = await prisma.$queryRaw<AnswerSnapshotRow[]>(Prisma.sql`
    SELECT "id", "authorId", "questionId"
    FROM "questions"."answers"
    WHERE "id" = ${answerId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function getUsername(userId: string): Promise<string> {
  const rows = await prisma.$queryRaw<UsernameRow[]>(Prisma.sql`
    SELECT "username"
    FROM "users"."users"
    WHERE "id" = ${userId}
    LIMIT 1
  `);

  return rows[0]?.username?.trim() || "usuario";
}

async function ensureUserExists(userId: string): Promise<void> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id"
    FROM "users"."users"
    WHERE "id" = ${userId}
    LIMIT 1
  `);

  if (!rows[0]) throw new Error("USER_NOT_FOUND");
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
  const [publicationsCount, questionsCount, answersCount] = await Promise.all([
    countUserPublications(userId),
    countUserQuestions(userId),
    countUserAnswers(userId),
  ]);

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
      publicationsCount,
      questionsCount,
      answersCount,
      avgRating,
      totalRatings,
    },
    update: {
      publicationsCount,
      questionsCount,
      answersCount,
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

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        authorId,
        targetType: CommentTargetType.PUBLICATION,
        targetId: publicationId,
        content: sanitizePlainText(data.content),
      },
    });

    await refreshPublicationCommentsCount(tx, publicationId);
    return comment;
  });
}

export async function deletePublicationComment(
  publicationId: string,
  commentId: string,
  requesterId: string
): Promise<void> {
  await assertPublicationExists(publicationId);

  await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findFirst({
      where: {
        id: commentId,
        targetType: CommentTargetType.PUBLICATION,
        targetId: publicationId,
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

    await tx.comment.delete({
      where: { id: comment.id },
    });

    await refreshPublicationCommentsCount(tx, publicationId);
  });
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

export async function getUserPublicStats(userId: string): Promise<UserStatsSnapshot> {
  await ensureUserExists(userId);

  return prisma.$transaction(async (tx) => {
    const [publicationsCount, questionsCount, answersCount, aggregate] = await Promise.all([
      countUserPublications(userId),
      countUserQuestions(userId),
      countUserAnswers(userId),
      tx.rating.aggregate({
        where: { targetAuthorId: userId },
        _avg: { score: true },
        _count: { score: true },
      }),
    ]);

    const avgRating = roundOneDecimal(aggregate._avg.score ?? 0);
    const totalRatings = aggregate._count.score;
    const label = ratingLabel(totalRatings);

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
        publicationsCount,
        questionsCount,
        answersCount,
        avgRating,
        totalRatings,
      },
      update: {
        publicationsCount,
        questionsCount,
        answersCount,
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

    return {
      userId,
      publicationsCount,
      questionsCount,
      answersCount,
      avgRating,
      totalRatings,
      label,
    };
  });
}

export async function createAcceptedAnswerNotification(
  questionId: string,
  answerId: string,
  acceptedByUserId: string
): Promise<NotificationItem | null> {
  const [question, answer] = await Promise.all([
    getQuestionSnapshot(questionId),
    getAnswerSnapshot(answerId),
  ]);

  if (!question) throw new Error("QUESTION_NOT_FOUND");
  if (!answer) throw new Error("ANSWER_NOT_FOUND");
  if (answer.questionId !== question.id) throw new Error("ANSWER_QUESTION_MISMATCH");
  if (question.authorId !== acceptedByUserId) throw new Error("FORBIDDEN_ACCEPT_NOTIFICATION");

  if (answer.authorId === acceptedByUserId) {
    return null;
  }

  const acceptedByUsername = await getUsername(acceptedByUserId);
  const safeQuestionTitle = question.title?.trim() || "Pregunta";
  const message = `Tu respuesta fue marcada como aceptada en "${safeQuestionTitle}" por ${acceptedByUsername}.`;

  return prisma.notification.upsert({
    where: {
      userId_type_entityType_entityId: {
        userId: answer.authorId,
        type: NotificationType.ANSWER_ACCEPTED,
        entityType: NotificationEntityType.ANSWER,
        entityId: answer.id,
      },
    },
    create: {
      userId: answer.authorId,
      type: NotificationType.ANSWER_ACCEPTED,
      entityType: NotificationEntityType.ANSWER,
      entityId: answer.id,
      questionId: question.id,
      title: "Respuesta aceptada",
      message,
      isRead: false,
      triggeredByUserId: acceptedByUserId,
      metadata: {
        questionId: question.id,
        questionTitle: safeQuestionTitle,
        answerId: answer.id,
        acceptedByUserId,
        acceptedByUsername,
      },
    },
    update: {
      questionId: question.id,
      title: "Respuesta aceptada",
      message,
      isRead: false,
      readAt: null,
      triggeredByUserId: acceptedByUserId,
      metadata: {
        questionId: question.id,
        questionTitle: safeQuestionTitle,
        answerId: answer.id,
        acceptedByUserId,
        acceptedByUsername,
      },
    },
  });
}

export async function listMyNotifications(
  userId: string,
  query: ListNotificationsQuery
): Promise<PaginatedNotificationsResponse> {
  const { page, limit, unreadOnly } = query;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [data, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    unreadCount,
    hasUnread: unreadCount > 0,
    ...(total === 0 ? { emptyMessage: "No tienes notificaciones nuevas." } : {}),
  };
}

export async function getMyUnreadNotificationsCount(userId: string): Promise<UnreadCountResult> {
  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { unreadCount };
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<MarkReadResult> {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: {
      id: true,
      isRead: true,
      readAt: true,
    },
  });

  if (!existing) throw new Error("NOTIFICATION_NOT_FOUND");

  if (existing.isRead) {
    return {
      notificationId: existing.id,
      isRead: true,
      readAt: existing.readAt,
    };
  }

  const updated = await prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
    select: {
      id: true,
      isRead: true,
      readAt: true,
    },
  });

  return {
    notificationId: updated.id,
    isRead: updated.isRead,
    readAt: updated.readAt,
  };
}

export async function markAllNotificationsAsRead(userId: string): Promise<MarkAllReadResult> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { updatedCount: result.count };
}


