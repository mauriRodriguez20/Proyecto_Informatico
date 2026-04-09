/**
 * user.service.ts
 * Service for all Backend 1 /api/users/* endpoints.
 */
import { apiRequest, BASE_URL_MS01 } from '@/lib/api';
import {
    LoginResponse,
    RegisterResponse,
    UpdateProfileDto,
    UpdateProfileResponse,
    UserProfile,
    UserProfileEnvelope,
} from '@/types/user.types';
import { LoginCredentials, RegisterData } from '@/types/auth.types';

export const userService = {
    /**
     * POST /api/users/register
     * Crea un nuevo usuario. Devuelve el token y el perfil creado.
     */
    async register(data: RegisterData): Promise<RegisterResponse> {
        // confirmPassword solo es requerido por el frontend, no se envía al backend
        const { confirmPassword, ...payload } = data;
        void confirmPassword;
        return apiRequest<RegisterResponse>(BASE_URL_MS01, '/api/users/register', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    /**
     * POST /api/users/login
     * Autentica al usuario. Devuelve el token y el perfil.
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        return apiRequest<LoginResponse>(BASE_URL_MS01, '/api/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    /**
     * POST /api/users/logout
     * Invalida la sesión en el backend (requiere token).
     */
    async logout(): Promise<void> {
        return apiRequest<void>(BASE_URL_MS01, '/api/users/logout', {
            method: 'POST',
        });
    },

    /**
     * GET /api/users/:id
     * Obtiene el perfil público de un usuario por su ID.
     */
    async getProfile(id: string): Promise<UserProfile> {
        const response = await apiRequest<UserProfileEnvelope>(BASE_URL_MS01, `/api/users/${id}`);
        return response.user;
    },

    /**
     * PATCH /api/users/:id
     * Actualiza el perfil del usuario autenticado.
     */
    async updateProfile(id: string, data: UpdateProfileDto): Promise<UserProfile> {
        const response = await apiRequest<UpdateProfileResponse>(BASE_URL_MS01, `/api/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        return response.user;
    },

    /**
     * POST /api/users/:id/rate
     * Califica a otro usuario con un score de 1 a 5.
     */
    async rateUser(id: string, rating: number): Promise<void> {
        return apiRequest<void>(BASE_URL_MS01, `/api/users/${id}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating }),
        });
    },
};
