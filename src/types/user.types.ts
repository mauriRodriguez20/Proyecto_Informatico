/** Technology catalog entry (GET /api/technologies) */
export interface Technology {
    id: string;
    name: string;
    slug?: string;
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
    description?: string | null;
    avatarUrl?: string | null;
    avgRating?: number;
    totalRatings?: number;
    commentsCount?: number;
    solutionsCount?: number;
    technologies?: Technology[] | UserTechnology[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

/** Body for PATCH /api/users/:id */
export interface UpdateProfileDto {
    username?: string;
    role?: 'FRONTEND' | 'BACKEND' | string;
    description?: string | null;
    avatarUrl?: string;
    technologyIds?: string[];
}

/** Body for POST /api/users/:id/rate */
export interface RateUserDto {
    rating: number; // 1-5
}

/** Response shape from POST /api/users/login */
export interface LoginResponse {
    message?: string;
    token: string;
    user: UserProfile;
}

/** Response shape from POST /api/users/register */
export interface RegisterResponse {
    message?: string;
    token: string;
    user: UserProfile;
}

export interface UserProfileEnvelope {
    user: UserProfile;
}

export interface UpdateProfileResponse {
    message?: string;
    user: UserProfile;
}
