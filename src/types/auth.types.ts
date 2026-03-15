export interface AuthUser {
    id: string;
    username: string;
    email: string;
    role: string;
    rating: number;
    avatarUrl?: string;
    createdAt?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
}

export type AuthMode = 'login' | 'register';

export interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
}
