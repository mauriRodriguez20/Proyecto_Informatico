import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  AuthorSnapshot,
  CreateAnswerInput,
  CreateQuestionInput,
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

async function attachAuthors(question: QuestionItem): Promise<QuestionItem> {
  const authorIds = new Set<string>([question.authorId]);

  question.answers?.forEach((answer) => {
    authorIds.add(answer.authorId);
  });

  const authorEntries = await Promise.all(
    Array.from(authorIds).map(async (authorId) => {
      const author = await fetchAuthor(authorId);
      return [authorId, author] as const;
    })
  );

  const authorsMap = new Map(authorEntries);

  return {
    ...question,
    author: authorsMap.get(question.authorId) ?? null,
    answers: question.answers?.map((answer) => ({
      ...answer,
      author: authorsMap.get(answer.authorId) ?? null,
    })),
  };
}

async function attachListAuthors(
  questions: QuestionListItem[]
): Promise<QuestionListItem[]> {
  if (questions.length === 0) return questions;

  const authorIds = Array.from(new Set(questions.map((question) => question.authorId)));
  const authorEntries = await Promise.all(
    authorIds.map(async (authorId) => {
      const author = await fetchAuthor(authorId);
      return [authorId, author] as const;
    })
  );

  const authorsMap = new Map(authorEntries);

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

export async function getQuestionById(id: string): Promise<QuestionItem | null> {
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

  return attachAuthors(question);
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
): Promise<void> {
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

  if (existing.isAccepted) {
    throw new Error("ANSWER_IS_ACCEPTED");
  }

  await prisma.answer.delete({
    where: { id: answerId },
  });
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
    await tx.answer.updateMany({
      where: {
        questionId,
        isAccepted: true,
      },
      data: {
        isAccepted: false,
      },
    });

    return tx.answer.update({
      where: { id: answerId },
      data: { isAccepted: true },
    });
  });
}

export async function voteAnswer(
  questionId: string,
  answerId: string,
  voterId: string,
  value: VoteValue
): Promise<{ voteScore: number }> {
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

    return { voteScore };
  });
}
