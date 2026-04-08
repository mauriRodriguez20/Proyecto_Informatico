export type Role = "FRONTEND" | "BACKEND";

export interface RegisterBody {
    email: string;
    password: string;
    username: string;
    role: Role;
}

export interface LoginBody {
    email: string;
    password: string;
}

export interface TechnologyItem {
    id: string;
    name: string;
    slug: string;
}

export interface UserStats {
    publications: number;
    questions: number;
    answers: number;
}

/** Perfil privado: incluye email. Usado en login/register/me */
export interface UserProfile {
    id: string;
    email: string;
    username: string;
    role: Role;
    avatarUrl: string | null;
    description: string | null;
    avgRating: number;
    totalRatings: number;
    createdAt: Date;
}

/** Perfil publico: incluye tecnologias y estadisticas */
export interface UserPublicProfile extends Omit<UserProfile, "email"> {
    email?: string;
    technologies: TechnologyItem[];
    stats: UserStats;
}

export interface AuthResponse {
    user: UserProfile;
    message: string;
}

export interface RateUserResponse {
    message: string;
    avgRating: number;
    totalRatings: number;
}

export interface ErrorResponse {
    error: string;
    details?: string;
}
