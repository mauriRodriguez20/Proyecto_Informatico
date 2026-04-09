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

export interface UserWithTechnologiesDto extends UserDto {
  technologies: TechnologyDto[];
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
