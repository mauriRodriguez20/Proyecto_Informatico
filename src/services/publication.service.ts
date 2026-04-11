/**
 * publication.service.ts
 * Service for all Backend 2 /api/publications/* endpoints.
 * Uses the shared apiRequest helper from @/lib/api.
 */
import { apiRequest, BASE_URL_MS02, BASE_URL_MS04 } from '@/lib/api';
import {
    Publication,
    PublicationFilters,
    CreatePublicationDto,
    UpdatePublicationDto,
    Comment,
} from '@/types/publications.types';

function toNumberOrUndefined(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

async function fetchPublicationCommentsTotal(publicationId: string): Promise<number | null> {
    try {
        const response = await apiRequest<{ total?: number } | any>(
            BASE_URL_MS04,
            `/api/publications/${publicationId}/comments?page=1&limit=1`,
            {
                cache: 'no-store',
            }
        );

        const total = Number((response as { total?: number })?.total);
        return Number.isFinite(total) ? total : 0;
    } catch {
        return null;
    }
}

function normalizePublication(raw: any): Publication {
    const authorRating =
        toNumberOrUndefined(raw?.author?.rating) ??
        toNumberOrUndefined(raw?.author?.avgRating) ??
        toNumberOrUndefined(raw?.avgRating);

    const author = raw?.author
        ? {
            id: raw.author.id ?? raw.authorId,
            username: raw.author.username ?? raw.author.name ?? `User ${(raw.authorId || '').slice(0, 5)}`,
            avatarUrl: raw.author.avatarUrl ?? undefined,
            rating: authorRating,
            role: raw.author.role ?? 'Developer',
        }
        : undefined;

    return {
        id: raw.id,
        title: raw.title,
        content: raw.content ?? raw.description ?? raw.codeBlock ?? '',
        description: raw.description ?? undefined,
        codeBlock: raw.codeBlock ?? undefined,
        language: raw.language ?? undefined,
        type: raw.type,
        area: raw.area,
        technologyId: raw.technologyId ?? raw.tags?.[0]?.technologyId ?? '',
        technologyName: raw.technologyName,
        imageUrl: raw.imageUrl,
        authorId: raw.authorId,
        author,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        commentsCount: raw.commentsCount ?? 0,
        likesCount: raw.likesCount ?? raw.totalRatings ?? 0,
        comments: raw.comments ?? [],
    };
}

export const publicationService = {
    /**
     * GET /api/publications
     * Lista y filtra publicaciones (público).
     * Parámetros: type, area, technologyId, sortBy (recent|most_voted), page
     */
    async list(filters: PublicationFilters): Promise<{ data: Publication[]; total: number }> {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.area) params.append('area', filters.area);
        if (filters.technologyId) params.append('technologyId', filters.technologyId);
        if (filters.authorId) params.append('authorId', filters.authorId);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.page) params.append('page', filters.page.toString());

        const response = await apiRequest<{ data: any[]; total: number }>(
            BASE_URL_MS02,
            `/api/publications?${params.toString()}`,
            {
                cache: 'no-store',
            }
        );

        const publications = (response.data || []).map(normalizePublication);
        const commentsTotals = await Promise.all(
            publications.map((publication) => fetchPublicationCommentsTotal(publication.id))
        );

        const data = publications.map((publication, index) => {
            const total = commentsTotals[index];
            return {
                ...publication,
                commentsCount: total === null ? publication.commentsCount : total,
            };
        });

        return {
            total: response.total,
            data,
        };
    },

    /**
     * GET /api/publications/:id
     * Retorna la publicación con datos del autor (cross-fetch con MS-01).
     */
    async getById(id: string): Promise<Publication> {
        const response = await apiRequest<{ publication?: any } | any>(
            BASE_URL_MS02,
            `/api/publications/${id}`,
            {
                cache: 'no-store',
            }
        );
        const publication = response.publication ?? response;
        const normalized = normalizePublication(publication);
        const commentsTotal = await fetchPublicationCommentsTotal(normalized.id);
        if (commentsTotal === null) return normalized;

        return {
            ...normalized,
            commentsCount: commentsTotal,
        };
    },

    /**
     * POST /api/publications
     * Crea una nueva publicación (requiere token de sesión).
     */
    async create(data: CreatePublicationDto): Promise<Publication> {
        const response = await apiRequest<{ publication?: any } | any>(BASE_URL_MS02, '/api/publications', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        const publication = response.publication ?? response;
        return normalizePublication(publication);
    },

    /**
     * PATCH /api/publications/:id
     * Edita una publicación (solo el autor).
     */
    async update(id: string, data: UpdatePublicationDto): Promise<Publication> {
        const response = await apiRequest<{ publication?: any } | any>(BASE_URL_MS02, `/api/publications/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        const publication = response.publication ?? response;
        return normalizePublication(publication);
    },

    /**
     * DELETE /api/publications/:id
     * Elimina una publicación (solo el autor).
     */
    async delete(id: string): Promise<void> {
        return apiRequest<void>(BASE_URL_MS02, `/api/publications/${id}`, {
            method: 'DELETE',
        });
    },

    /**
     * POST /api/publications/:id/comments
     * Agrega un comentario a una publicación (autenticado).
     */
    async addComment(publicationId: string, content: string): Promise<Comment> {
        return apiRequest<Comment>(BASE_URL_MS04, `/api/publications/${publicationId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    /**
     * GET /api/publications/:id/comments
     * Lista comentarios de una publicacion desde MS04.
     */
    async getComments(publicationId: string, page = 1, limit = 50): Promise<Comment[]> {
        const response = await apiRequest<{ data?: Comment[] } | Comment[]>(
            BASE_URL_MS04,
            `/api/publications/${publicationId}/comments?page=${page}&limit=${limit}`,
            {
                cache: 'no-store',
            }
        );

        if (Array.isArray(response)) return response;
        return Array.isArray(response.data) ? response.data : [];
    },

    /**
     * DELETE /api/publications/:id/comments/:commentId
     * Elimina un comentario (solo el autor o un administrador).
     */
    async deleteComment(publicationId: string, commentId: string): Promise<void> {
        return apiRequest<void>(BASE_URL_MS04, `/api/publications/${publicationId}/comments/${commentId}`, {
            method: 'DELETE',
        });
    },

    /**
     * POST /api/publications/:id/rate
     * Califica una publicación (1-5 estrellas).
     */
    async rate(id: string, rating: number): Promise<{ averageRating: number; totalRatings: number }> {
        return apiRequest<{ averageRating: number; totalRatings: number }>(BASE_URL_MS04, `/api/publications/${id}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating }),
        });
    },
};
