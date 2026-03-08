export interface AuthUser {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    createdAt?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
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
