import { prisma } from "@/lib/prisma";
import { fetchWithKeepAlive } from "@/lib/http-client";
import { Prisma } from "@prisma/client";
import type {
  AuthorSnapshot,
  CreateAnswerInput,
  CreateQuestionInput,
  DeleteAnswerResult,
  ListQuestionsQuery,
  PaginatedQuestionsResponse,
  QuestionItem,
  QuestionListItem,
  UpdateAnswerInput,
  VoteValue,
} from "./questions.types";

function sanitizePlainText(value: string): string {
  return value.replace(/\u0000/g, "").trim();
}

function sanitizeCodeBlock(value: string): string {
  return value.replace(/\u0000/g, "").replace(/\r\n/g, "\n");
}

function sanitizeOptionalCodeBlock(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const sanitized = sanitizeCodeBlock(value);
  return sanitized.length > 0 ? sanitized : null;
}

function resolveUserVote(
  votes: Array<{ voterId: string; value: number }> | undefined,
  viewerId?: string | null
): VoteValue | 0 {
  if (!viewerId || !votes?.length) return 0;
  const vote = votes.find((item) => item.voterId === viewerId);
  if (vote?.value === 1) return 1;
  if (vote?.value === -1) return -1;
  return 0;
}

interface BatchAuthorResponse {
  users?: Array<{
    id: string;
    username: string;
    avatarUrl: string | null;
    role: string;
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

async function assertTechnologyIdsExist(technologyIds: string[]): Promise<void> {
  if (technologyIds.length === 0) return;

  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT "id"
      FROM "users"."technologies"
      WHERE "id" IN (${Prisma.join(technologyIds)})
    `
  );

  if (rows.length !== technologyIds.length) {
    throw new Error("INVALID_TECHNOLOGY_IDS");
  }
}

async function attachAuthors(
  question: QuestionItem,
  viewerId?: string | null
): Promise<QuestionItem> {
  const authorIds = new Set<string>([question.authorId]);

  question.answers?.forEach((answer) => {
    authorIds.add(answer.authorId);
  });

  const authorsMap = await fetchAuthorsBatch(Array.from(authorIds));

  return {
    ...question,
    author: authorsMap.get(question.authorId) ?? null,
    answers: question.answers?.map((answer) => ({
      ...answer,
      userVote: resolveUserVote(
        answer.votes?.map((vote) => ({ voterId: vote.voterId, value: vote.value })),
        viewerId
      ),
      author: authorsMap.get(answer.authorId) ?? null,
    })),
  };
}

async function attachListAuthors(
  questions: QuestionListItem[]
): Promise<QuestionListItem[]> {
  if (questions.length === 0) return questions;

  const authorIds = Array.from(new Set(questions.map((question) => question.authorId)));
  const authorsMap = await fetchAuthorsBatch(authorIds);

  return questions.map((question) => ({
    ...question,
    author: authorsMap.get(question.authorId) ?? null,
  }));
}

export async function createQuestion(
  authorId: string,
  data: CreateQuestionInput
): Promise<QuestionItem> {
  await assertTechnologyIdsExist(data.technologyIds);

  const sanitizedCodeBlock = sanitizeOptionalCodeBlock(data.codeBlock);

  const created = await prisma.question.create({
    data: {
      authorId,
      area: data.area,
      title: sanitizePlainText(data.title),
      description: sanitizePlainText(data.description),
      codeBlock: sanitizedCodeBlock ?? undefined,
      language:
        sanitizedCodeBlock && data.language
          ? sanitizePlainText(data.language)
          : undefined,
      tags: {
        create: data.technologyIds.map((technologyId) => ({ technologyId })),
      },
    },
    include: {
      tags: true,
    },
  });

  return created;
}

export async function listQuestions(
  query: ListQuestionsQuery
): Promise<PaginatedQuestionsResponse> {
  const { page, limit, unanswered, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.QuestionWhereInput = unanswered
    ? { answers: { none: {} } }
    : {};

  // sortOrder solo aplica cuando se filtra por unanswered=true (HU-018 CA3).
  // En el listado general se mantiene el comportamiento historico (desc).
  const createdAtOrder: Prisma.SortOrder = unanswered ? sortOrder : "desc";

  const [questions, total] = await prisma.$transaction([
    prisma.question.findMany({
      where,
      include: {
        tags: true,
        _count: {
          select: {
            answers: true,
          },
        },
        answers: {
          where: { isAccepted: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: {
        createdAt: createdAtOrder,
      },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  const dataBase: QuestionListItem[] = questions.map((question) => ({
    id: question.id,
    authorId: question.authorId,
    area: question.area,
    title: question.title,
    description: question.description,
    codeBlock: question.codeBlock,
    language: question.language,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    tags: question.tags,
    answerCount: question._count.answers,
    acceptedAnswerId: question.answers[0]?.id ?? null,
  }));

  const data = await attachListAuthors(dataBase);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getQuestionById(
  id: string,
  viewerId?: string | null
): Promise<QuestionItem | null> {
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      tags: true,
      answers: {
        include: {
          votes: true,
        },
        orderBy: [{ isAccepted: "desc" }, { voteScore: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!question) return null;

  return attachAuthors(question, viewerId);
}

export async function createAnswer(
  questionId: string,
  authorId: string,
  data: CreateAnswerInput
) {
  const questionExists = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!questionExists) {
    throw new Error("QUESTION_NOT_FOUND");
  }

  const sanitizedCodeBlock = sanitizeOptionalCodeBlock(data.codeBlock);

  return prisma.answer.create({
    data: {
      questionId,
      authorId,
      content: sanitizePlainText(data.content),
      codeBlock: sanitizedCodeBlock ?? undefined,
      language:
        sanitizedCodeBlock && data.language
          ? sanitizePlainText(data.language)
          : undefined,
    },
  });
}

export async function updateAnswer(
  questionId: string,
  answerId: string,
  editorId: string,
  data: UpdateAnswerInput
) {
  const existing = await prisma.answer.findFirst({
    where: {
      id: answerId,
      questionId,
    },
  });

  if (!existing) {
    throw new Error("ANSWER_NOT_FOUND");
  }

  if (existing.authorId !== editorId) {
    throw new Error("FORBIDDEN_ANSWER_EDIT");
  }

  const updateData: Prisma.AnswerUpdateInput = {};

  if (data.content !== undefined) {
    updateData.content = sanitizePlainText(data.content);
  }

  if (data.codeBlock !== undefined) {
    const sanitizedCodeBlock = sanitizeOptionalCodeBlock(data.codeBlock);
    updateData.codeBlock = sanitizedCodeBlock;

    if (sanitizedCodeBlock === null && data.language === undefined) {
      updateData.language = null;
    }

    if (sanitizedCodeBlock !== null && data.language === undefined) {
      throw new Error("INVALID_LANGUAGE_WITHOUT_CODE");
    }
  }

  if (data.language !== undefined) {
    if (data.language === null) {
      updateData.language = null;
    } else {
      if (data.codeBlock === undefined && existing.codeBlock === null) {
        throw new Error("INVALID_LANGUAGE_WITHOUT_CODE");
      }

      updateData.language = sanitizePlainText(data.language);
    }
  }

  return prisma.answer.update({
    where: { id: answerId },
    data: updateData,
  });
}

export async function deleteAnswer(
  questionId: string,
  answerId: string,
  requesterId: string
): Promise<DeleteAnswerResult> {
  const existing = await prisma.answer.findFirst({
    where: {
      id: answerId,
      questionId,
    },
    select: {
      id: true,
      authorId: true,
      isAccepted: true,
    },
  });

  if (!existing) {
    throw new Error("ANSWER_NOT_FOUND");
  }

  if (existing.authorId !== requesterId) {
    throw new Error("FORBIDDEN_ANSWER_DELETE");
  }

  await prisma.answer.delete({
    where: { id: answerId },
  });

  return {
    deletedAnswerId: existing.id,
    wasAccepted: existing.isAccepted,
  };
}

export async function acceptAnswer(
  questionId: string,
  answerId: string,
  questionAuthorId: string
) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, authorId: true },
  });

  if (!question) throw new Error("QUESTION_NOT_FOUND");
  if (question.authorId !== questionAuthorId) throw new Error("FORBIDDEN_ACCEPT_ANSWER");

  const answer = await prisma.answer.findFirst({
    where: { id: answerId, questionId },
    select: { id: true },
  });

  if (!answer) throw new Error("ANSWER_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const current = await tx.answer.findUnique({
      where: { id: answerId },
      select: { isAccepted: true },
    });

    if (current?.isAccepted) {
      const answer = await tx.answer.update({
        where: { id: answerId },
        data: { isAccepted: false },
      });

      return { answer, action: "unaccepted" as const };
    }

    await tx.answer.updateMany({
      where: {
        questionId,
        isAccepted: true,
      },
      data: {
        isAccepted: false,
      },
    });

    const answer = await tx.answer.update({
      where: { id: answerId },
      data: { isAccepted: true },
    });

    return { answer, action: "accepted" as const };
  });
}

export async function voteAnswer(
  questionId: string,
  answerId: string,
  voterId: string,
  value: VoteValue
): Promise<{ voteScore: number; userVote: VoteValue | 0 }> {
  const answer = await prisma.answer.findFirst({
    where: {
      id: answerId,
      questionId,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!answer) throw new Error("ANSWER_NOT_FOUND");
  if (answer.authorId === voterId) throw new Error("SELF_VOTE_NOT_ALLOWED");

  return prisma.$transaction(async (tx) => {
    const existingVote = await tx.answerVote.findUnique({
      where: {
        answerId_voterId: {
          answerId,
          voterId,
        },
      },
      select: {
        value: true,
      },
    });

    let userVote: VoteValue | 0 = value;

    if (!existingVote) {
      await tx.answerVote.create({
        data: {
          answerId,
          voterId,
          value,
        },
      });
    } else if (existingVote.value === value) {
      // Toggle same vote off (state goes back to 0 for that user)
      await tx.answerVote.delete({
        where: {
          answerId_voterId: {
            answerId,
            voterId,
          },
        },
      });
      userVote = 0;
    } else {
      await tx.answerVote.update({
        where: {
          answerId_voterId: {
            answerId,
            voterId,
          },
        },
        data: {
          value,
        },
      });
      userVote = value;
    }

    const aggregate = await tx.answerVote.aggregate({
      where: { answerId },
      _sum: { value: true },
    });

    const voteScore = aggregate._sum.value ?? 0;

    await tx.answer.update({
      where: { id: answerId },
      data: { voteScore },
    });

    return { voteScore, userVote };
  });
}
