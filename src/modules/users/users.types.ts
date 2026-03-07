export type Role = "FRONTEND" | "BACKEND";
export interface RegisterBody {
  email:    string;
  password: string;
  username: string;
  role:     Role;
}

export interface LoginBody {
  email:    string;
  password: string;
}


export interface UserProfile {
  id:           string;
  email:        string;
  username:     string;
  role:         Role;
  avatarUrl:    string | null;
  description:  string | null;
  avgRating:    number;
  totalRatings: number;
  createdAt:    Date;
}

export interface AuthResponse {
  user:    UserProfile;
  message: string;
}

export interface ErrorResponse {
  error:    string;
  details?: string;
}
