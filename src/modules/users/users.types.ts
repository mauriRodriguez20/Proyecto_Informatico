export interface ErrorResponse {
  error: string;
  details?: unknown;
}

export interface TechnologyDto {
  id: string;
  name: string;
  slug: string;
}

export interface UserDto {
  id: string;
  email: string;
  username: string;
  role: "FRONTEND" | "BACKEND";
  avatarUrl: string | null;
  description: string | null;
  avgRating: number;
  totalRatings: number;
  createdAt: Date;
}

export interface UserStatsDto {
  commentsCount: number;
  solutionsCount: number;
}

export interface UserWithTechnologiesDto extends UserDto, UserStatsDto {
  technologies: TechnologyDto[];
}

export interface PublicAuthorDto {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: "FRONTEND" | "BACKEND";
  avgRating: number;
  totalRatings: number;
}

export interface LoginResult {
  user: UserDto;
  accessToken: string;
}

export interface RegisterResult {
  user: UserDto;
  accessToken: string | null;
}

export interface RateUserResult {
  avgRating: number;
  totalRatings: number;
}

export interface RateUserResponse {
  message: string;
  avgRating: number;
  totalRatings: number;
}
