import { prisma } from "@/lib/prisma";
import type {
  CreatePublicationInput,
  UpdatePublicationInput,
  ListPublicationsQuery,
  PublicationWithTags,
  PublicationWithAuthor,
  AuthorSnapshot,
} from "./publications.types";

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  java: "java",
  html: "html",
  css: "css",
  sql: "sql",
};

function detectLanguageFromCode(code: string): string {
  const source = code.toLowerCase();

  if (/^\s*<(!doctype\s+html|html[\s>])/m.test(source) || source.includes("</")) {
    return "html";
  }
  if (/select\s+.+\s+from\s+/m.test(source) || /insert\s+into\s+/m.test(source)) {
    return "sql";
  }
  if (/^\s*(def\s+\w+\(|import\s+\w+|from\s+\w+\s+import\s+)/m.test(source)) {
    return "python";
  }
  if (/^\s*(public\s+class\s+\w+|system\.out\.println|private\s+\w+)/m.test(source)) {
    return "java";
  }
  if (/^\s*(interface\s+\w+|type\s+\w+\s*=|enum\s+\w+)/m.test(source)) {
    return "typescript";
  }
  if (/^\s*\.?[\w-]+\s*\{[^}]*\}/m.test(source) || source.includes("@media")) {
    return "css";
  }

  return "javascript";
}

function normalizeLanguage(
  language: string | null | undefined,
  codeBlock: string | null | undefined
): string | null {
  if (typeof language === "string" && language.trim().length > 0) {
    const normalized = language.trim().toLowerCase();
    return LANGUAGE_ALIASES[normalized] ?? normalized;
  }

  if (typeof codeBlock === "string" && codeBlock.trim().length > 0) {
    return detectLanguageFromCode(codeBlock);
  }

  return null;
}

async function ensureTechnologyByName(
  name: string,
  authToken?: string
): Promise<string> {
  const ms01Url = process.env.MS01_URL;
  if (!ms01Url) {
    throw new Error("MS01_URL_NOT_CONFIGURED");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${ms01Url}/api/technologies`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("TECHNOLOGY_UPSERT_FAILED");
  }

  const payload = await response.json();
  const technologyId = payload?.technology?.id;

  if (typeof technologyId !== "string") {
    throw new Error("TECHNOLOGY_UPSERT_FAILED");
  }

  return technologyId;
}

async function resolveTechnologyIds(
  technologyIds: string[] = [],
  technologyNames: string[] = [],
  authToken?: string
): Promise<string[]> {
  const ids = new Set(technologyIds);

  if (technologyNames.length > 0) {
    const createdIds = await Promise.all(
      technologyNames.map((name) => ensureTechnologyByName(name, authToken))
    );

    createdIds.forEach((id) => ids.add(id));
  }

  if (ids.size > 5) {
    throw new Error("TOO_MANY_TAGS");
  }

  return Array.from(ids);
}

async function fetchAuthor(authorId: string): Promise<AuthorSnapshot | null> {
  try {
    const res = await fetch(`${process.env.MS01_URL}/api/users/${authorId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      id: data.user?.id ?? authorId,
      name: data.user?.username ?? data.user?.name ?? "Autor desconocido",
      avatarUrl: data.user?.avatarUrl ?? null,
      role: data.user?.role ?? "UNKNOWN",
    };
  } catch {
    return null;
  }
}

export async function createPublication(
  authorId: string,
  data: CreatePublicationInput,
  authToken?: string
): Promise<PublicationWithTags> {
  const {
    technologyIds = [],
    technologyNames = [],
    codeBlock,
    language,
    ...fields
  } = data;

  const resolvedTechnologyIds = await resolveTechnologyIds(
    technologyIds,
    technologyNames,
    authToken
  );

  return prisma.publication.create({
    data: {
      ...fields,
      authorId,
      codeBlock,
      language: normalizeLanguage(language, codeBlock),
      tags: {
        create: resolvedTechnologyIds.map((technologyId) => ({ technologyId })),
      },
    },
    include: { tags: true },
  });
}

export async function getPublicationById(
  id: string
): Promise<PublicationWithAuthor | null> {
  const publication = await prisma.publication.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!publication) return null;

  const author = await fetchAuthor(publication.authorId);
  return { ...publication, author };
}

export async function updatePublication(
  id: string,
  data: UpdatePublicationInput,
  authToken?: string
): Promise<PublicationWithTags> {
  const {
    technologyIds,
    technologyNames,
    language,
    codeBlock,
    ...fields
  } = data;

  let tagsUpdate:
    | {
        deleteMany: {};
        create: { technologyId: string }[];
      }
    | undefined;

  if (technologyIds !== undefined || technologyNames !== undefined) {
    const resolvedTechnologyIds = await resolveTechnologyIds(
      technologyIds ?? [],
      technologyNames ?? [],
      authToken
    );

    tagsUpdate = {
      deleteMany: {},
      create: resolvedTechnologyIds.map((technologyId) => ({ technologyId })),
    };
  }

  const updateData: Record<string, unknown> = { ...fields };

  if (codeBlock !== undefined) {
    updateData.codeBlock = codeBlock;
  }

  if (language !== undefined || codeBlock !== undefined) {
    updateData.language = normalizeLanguage(language, codeBlock);
  }

  if (tagsUpdate) {
    updateData.tags = tagsUpdate;
  }

  return prisma.publication.update({
    where: { id },
    data: updateData,
    include: { tags: true },
  });
}

export async function deletePublication(id: string): Promise<void> {
  await prisma.publication.delete({ where: { id } });
}

export async function listPublications(query: ListPublicationsQuery): Promise<{
  data: PublicationWithTags[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    avgRating: number;
    totalRatings: number;
  };
}> {
  const { type, area, authorId, technologyId, sortBy, page, limit } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(type ? { type } : {}),
    ...(area ? { area } : {}),
    ...(authorId ? { authorId } : {}),
    ...(technologyId ? { tags: { some: { technologyId } } } : {}),
  };

  const orderBy =
    sortBy === "most_voted"
      ? [{ avgRating: "desc" as const }, { totalRatings: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const [data, total, ratingRows] = await prisma.$transaction([
    prisma.publication.findMany({
      where,
      include: { tags: true },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.publication.count({ where }),
    prisma.publication.findMany({
      where,
      select: { avgRating: true, totalRatings: true },
    }),
  ]);

  const totalRatings = ratingRows.reduce((sum, row) => sum + row.totalRatings, 0);
  const weightedSum = ratingRows.reduce(
    (sum, row) => sum + row.avgRating * row.totalRatings,
    0
  );
  const avgRating =
    totalRatings > 0 ? Math.round((weightedSum / totalRatings) * 10) / 10 : 0;

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      avgRating,
      totalRatings,
    },
  };
}
