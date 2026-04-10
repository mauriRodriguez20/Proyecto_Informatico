/**
 * technology.service.ts
 * Service for all Backend 1 /api/technologies/* endpoints.
 */
import { apiRequest, BASE_URL_MS01 } from '@/lib/api';
import { Technology } from '@/types/user.types';

export const technologyService = {
    /**
     * GET /api/technologies
     * Devuelve el catálogo completo de tecnologías disponibles.
     */
    async list(): Promise<Technology[]> {
        const response = await apiRequest<{ data: Technology[]; total: number; limit: number }>(
            BASE_URL_MS01,
            '/api/technologies?limit=50'
        );
        return response.data;
    },

    /**
     * GET /api/technologies/:id
     * Devuelve una tecnología específica por su ID.
     */
    async getById(id: string): Promise<Technology> {
        return apiRequest<Technology>(BASE_URL_MS01, `/api/technologies/${id}`);
    },
};
