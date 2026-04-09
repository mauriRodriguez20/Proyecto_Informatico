/** Technology catalog entry (GET /api/technologies) */
export interface Technology {
    id: string;
    name: string;
    category?: string;
    description?: string;
}

/** A technology linked to a user, with optional proficiency info */
export interface UserTechnology {
    id: string;
    userId: string;
    technologyId: string;
    technology: Technology;
}

/** Rating entry another user left on this user */
export interface UserRating {
    id: string;
    raterId: string;
    ratedId: string;
    score: number; // 1-5
}

/** Full user profile returned by GET /api/users/:id */
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    role: 'FRONTEND' | 'BACKEND' | string;
    bio?: string;
    avatarUrl?: string;
    rating?: number;
    technologies?: UserTechnology[];
    createdAt?: string;
    updatedAt?: string;
}

/** Body for PATCH /api/users/:id */
export interface UpdateProfileDto {
    username?: string;
    bio?: string;
    avatarUrl?: string;
    technologyIds?: string[];
}

/** Body for POST /api/users/:id/rate */
export interface RateUserDto {
    rating: number; // 1-5
}

/** Response shape from POST /api/users/login */
export interface LoginResponse {
    token: string;
    user: UserProfile;
}

/** Response shape from POST /api/users/register */
export interface RegisterResponse {
    token: string;
    user: UserProfile;
}
