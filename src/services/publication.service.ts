/**
 * publication.service.ts
 * Service for all Backend 2 /api/publications/* endpoints.
 * Uses the shared apiRequest helper from @/lib/api.
 */
import { apiRequest, BASE_URL_MS02 } from '@/lib/api';
import {
    Publication,
    PublicationFilters,
    CreatePublicationDto,
    UpdatePublicationDto,
    Comment,
} from '@/types/publications.types';

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

        return apiRequest<{ data: Publication[]; total: number }>(
            BASE_URL_MS02,
            `/api/publications?${params.toString()}`
        );
    },

    /**
     * GET /api/publications/:id
     * Retorna la publicación con datos del autor (cross-fetch con MS-01).
     */
    async getById(id: string): Promise<Publication> {
        return apiRequest<Publication>(BASE_URL_MS02, `/api/publications/${id}`);
    },

    /**
     * POST /api/publications
     * Crea una nueva publicación (requiere token de sesión).
     */
    async create(data: CreatePublicationDto): Promise<Publication> {
        return apiRequest<Publication>(BASE_URL_MS02, '/api/publications', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * PATCH /api/publications/:id
     * Edita una publicación (solo el autor).
     */
    async update(id: string, data: UpdatePublicationDto): Promise<Publication> {
        return apiRequest<Publication>(BASE_URL_MS02, `/api/publications/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
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
        return apiRequest<Comment>(BASE_URL_MS02, `/api/publications/${publicationId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },
};
