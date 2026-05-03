import { prisma } from "@/lib/prisma";
import { fetchWithKeepAlive } from "@/lib/http-client";
import type {
  CreatePublicationInput,
  UpdatePublicationInput,
  ListPublicationsQuery,
  PublicationWithTags,
  PublicationWithAuthor,
  AuthorSnapshot,
  PublicationResponse,
  PublicationWithAuthorResponse,
} from "./publications.types";

function mapToResponse<T extends PublicationWithTags>(pub: T): T & { content: string } {
  return {
    ...pub,
    content: pub.description,
  };
}

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

  const response = await fetchWithKeepAlive(`${ms01Url}/api/technologies`, {
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
  authorIds: string[]
): Promise<Map<string, AuthorSnapshot | null>> {
  const uniqueIds = Array.from(new Set(authorIds)).filter(Boolean);
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

  try {
    const ms01Url = process.env.MS01_URL;
    if (!ms01Url) return result;

    const query = encodeURIComponent(missingIds.join(","));
    const response = await fetchWithKeepAlive(`${ms01Url}/api/users/batch?ids=${query}`, {
      cache: "no-store",
    });

    if (!response.ok) return result;

    const payload = (await response.json()) as BatchAuthorResponse;
    const users = Array.isArray(payload.users) ? payload.users : [];

    const returnedIds = new Set<string>();
    users.forEach((user) => {
      const username = user.username ?? `User ${user.id.slice(0, 5)}`;
      const value: AuthorSnapshot = {
        id: user.id,
        username,
        name: username,
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

export async function createPublication(
  authorId: string,
  data: CreatePublicationInput,
  authToken?: string
): Promise<PublicationResponse> {
  const {
    technologyIds = [],
    technologyNames = [],
    codeBlock,
    language,
    // @ts-ignore
    content: _content,
    // @ts-ignore
    technologyId: _technologyId,
    ...fields
  } = data;

  const resolvedTechnologyIds = await resolveTechnologyIds(
    technologyIds,
    technologyNames,
    authToken
  );

  const publication = await prisma.publication.create({
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

  return mapToResponse(publication);
}

export async function getPublicationById(
  id: string
): Promise<PublicationWithAuthorResponse | null> {
  const publication = await prisma.publication.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!publication) return null;

  const authorsById = await fetchAuthorsBatch([publication.authorId]);
  const author = authorsById.get(publication.authorId) ?? null;
  return mapToResponse({ ...publication, author }) as PublicationWithAuthorResponse;
}

export async function updatePublication(
  id: string,
  data: UpdatePublicationInput,
  authToken?: string
): Promise<PublicationResponse> {
  const {
    technologyIds,
    technologyNames,
    language,
    codeBlock,
    // @ts-ignore
    content: _content,
    // @ts-ignore
    technologyId: _technologyId,
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

  const updated = await prisma.publication.update({
    where: { id },
    data: updateData,
    include: { tags: true },
  });

  return mapToResponse(updated);
}

export async function deletePublication(id: string): Promise<void> {
  await prisma.publication.delete({ where: { id } });
}

export async function listPublications(query: ListPublicationsQuery): Promise<{
  data: PublicationWithAuthorResponse[];
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

  const authorIds = Array.from(new Set(data.map((publication) => publication.authorId)));
  const authorsById = await fetchAuthorsBatch(authorIds);

  const dataWithAuthors = data.map((publication) =>
    mapToResponse({
      ...publication,
      author: authorsById.get(publication.authorId) ?? null,
    }) as PublicationWithAuthorResponse
  );

  return {
    data: dataWithAuthors,
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


