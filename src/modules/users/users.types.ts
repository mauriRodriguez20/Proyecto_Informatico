export type Role = "FRONTEND" | "BACKEND";

// ─────────────────────────────────────────────────────────────
// Tipos de entrada para los endpoints
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Respuestas de usuario
// ─────────────────────────────────────────────────────────────

/** Perfil privado: incluye email. Usado en login/register/me */
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

/** Tecnología simplificada para respuestas */
export interface TechnologyItem {
  id:   string;
  name: string;
  slug: string;
}

/** Perfil público: incluye tecnologías, no incluye email */
export interface UserPublicProfile extends Omit<UserProfile, "email"> {
  email?:       string;   // Opcional: solo se devuelve si es el propio usuario
  technologies: TechnologyItem[];
}

// ─────────────────────────────────────────────────────────────
// Respuestas de API
// ─────────────────────────────────────────────────────────────

export interface AuthResponse {
  user:    UserProfile;
  message: string;
}

export interface RateUserResponse {
  message:     string;
  avgRating:   number;
  totalRatings: number;
}

export interface ErrorResponse {
  error:    string;
  details?: string;
}
