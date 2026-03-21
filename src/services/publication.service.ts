import {
    Publication,
    PublicationFilters,
    CreatePublicationDto,
    UpdatePublicationDto,
    Comment
} from '@/types/publications.types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function handleResponse(response: Response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || 'API request failed');
    }
    return response.json();
}

function getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const publicationService = {
    async list(filters: PublicationFilters): Promise<{ data: Publication[], total: number }> {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.area) params.append('area', filters.area);
        if (filters.technologyId) params.append('technologyId', filters.technologyId);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.authorId) params.append('authorId', filters.authorId);
        if (filters.page) params.append('page', filters.page.toString());

        try {
            const response = await fetch(`${BASE_URL}/api/publications?${params.toString()}`);
            return await handleResponse(response);
        } catch (error) {
            console.warn('Backend not reachable, using mock data:', error);
            // Mock data fallback
            return {
                data: [
                    {
                        id: '1',
                        title: 'How to use React Server Components?',
                        content: 'React Server Components allow you to render components on the server...',
                        type: 'CODE_SNIPPET',
                        area: 'FRONTEND',
                        technology: 'React',
                        author: { id: 'auth1', username: 'FrontendWiz', role: 'Senior React Dev', rating: 4.8 },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        commentsCount: 12,
                        likesCount: 45
                    },
                    {
                        id: '2',
                        title: 'Fixing CORS in Express.js',
                        content: 'To fix CORS issues in Express, you can use the cors middleware...',
                        type: 'ERROR_SOLUTION',
                        area: 'BACKEND',
                        technology: 'Node.js',
                        author: { id: 'auth2', username: 'BackendGuru', role: 'Systems Architect', rating: 4.9 },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        commentsCount: 5,
                        likesCount: 28
                    }
                ],
                total: 2
            };
        }
    },

    async getById(id: string): Promise<Publication> {
        const response = await fetch(`${BASE_URL}/api/publications/${id}`);
        return handleResponse(response);
    },

    async create(data: CreatePublicationDto): Promise<Publication> {
        const response = await fetch(`${BASE_URL}/api/publications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    async update(id: string, data: UpdatePublicationDto): Promise<Publication> {
        const response = await fetch(`${BASE_URL}/api/publications/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    async delete(id: string): Promise<void> {
        const response = await fetch(`${BASE_URL}/api/publications/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to delete' }));
            throw new Error(error.message);
        }
    },

    async addComment(publicationId: string, content: string): Promise<Comment> {
        const response = await fetch(`${BASE_URL}/api/publications/${publicationId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ content })
        });
        return handleResponse(response);
    },

    async rateAuthor(authorId: string, rating: number): Promise<void> {
        const response = await fetch(`${BASE_URL}/api/users/${authorId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ rating })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to rate user' }));
            throw new Error(error.message);
        }
    }
};
