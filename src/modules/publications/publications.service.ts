import { prisma } from "@/lib/prisma";
import type {
  CreatePublicationInput,
  UpdatePublicationInput,
  ListPublicationsQuery,
  PublicationWithTags,
  PublicationWithAuthor,
  AuthorSnapshot,
} from "./publications.types";

// ──────────────────────────────────────────────────────────────
//  Cross-fetch: obtiene datos del autor desde MS-01
// ──────────────────────────────────────────────────────────────

async function fetchAuthor(authorId: string): Promise<AuthorSnapshot | null> {
  try {
    const res = await fetch(
      `${process.env.MS01_URL}/api/users/${authorId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();

    // Adaptar la forma de la respuesta del MS-01
    return {
      id: data.user?.id ?? authorId,
      name: data.user?.name ?? "Autor desconocido",
      avatarUrl: data.user?.avatarUrl ?? null,
      role: data.user?.role ?? "UNKNOWN",
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
//  HU-010: Crear publicación
// ──────────────────────────────────────────────────────────────

export async function createPublication(
  authorId: string,
  data: CreatePublicationInput
): Promise<PublicationWithTags> {
  const { technologyIds = [], ...fields } = data;

  return prisma.publication.create({
    data: {
      ...fields,
      authorId,
      tags: {
        create: technologyIds.map((technologyId) => ({ technologyId })),
      },
    },
    include: { tags: true },
  });
}

// ──────────────────────────────────────────────────────────────
//  HU-011: Obtener una publicación por ID (con autor via cross-fetch)
// ──────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────
//  HU-012: Actualizar una publicación (solo el autor)
// ──────────────────────────────────────────────────────────────

export async function updatePublication(
  id: string,
  data: UpdatePublicationInput
): Promise<PublicationWithTags> {
  const { technologyIds, ...fields } = data;

  // Si se envían nuevos technologyIds, reemplazar los tags existentes
  const tagsUpdate =
    technologyIds !== undefined
      ? {
          deleteMany: {},
          create: technologyIds.map((technologyId) => ({ technologyId })),
        }
      : undefined;

  return prisma.publication.update({
    where: { id },
    data: {
      ...fields,
      ...(tagsUpdate ? { tags: tagsUpdate } : {}),
    },
    include: { tags: true },
  });
}

// ──────────────────────────────────────────────────────────────
//  HU-013: Eliminar una publicación (solo el autor)
// ──────────────────────────────────────────────────────────────

export async function deletePublication(id: string): Promise<void> {
  await prisma.publication.delete({ where: { id } });
}

// ──────────────────────────────────────────────────────────────
//  HU-014: Listar publicaciones con filtros y paginación
// ──────────────────────────────────────────────────────────────

export async function listPublications(query: ListPublicationsQuery): Promise<{
  data: PublicationWithTags[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { type, area, technologyId, sortBy, page, limit } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(type ? { type } : {}),
    ...(area ? { area } : {}),
    ...(technologyId ? { tags: { some: { technologyId } } } : {}),
  };

  const orderBy =
    sortBy === "most_voted"
      ? [{ avgRating: "desc" as const }, { totalRatings: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const [data, total] = await prisma.$transaction([
    prisma.publication.findMany({
      where,
      include: { tags: true },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.publication.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
