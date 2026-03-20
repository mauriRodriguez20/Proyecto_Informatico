import { PublicationType, Area } from "@prisma/client";

// ──────────────────────────────────────────────────────────────
//  Tipos del dominio de Publicaciones
// ──────────────────────────────────────────────────────────────

export interface PublicationWithTags {
  id: string;
  authorId: string;
  type: PublicationType;
  area: Area;
  title: string;
  description: string;
  errorCode: string | null;
  solution: string | null;
  codeBlock: string | null;
  language: string | null;
  avgRating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
  tags: { technologyId: string }[];
}

export interface PublicationWithAuthor extends PublicationWithTags {
  author: AuthorSnapshot | null;
}

// Datos del autor traídos via cross-fetch desde MS-01
export interface AuthorSnapshot {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface CreatePublicationInput {
  type: PublicationType;
  area: Area;
  title: string;
  description: string;
  errorCode?: string;
  solution?: string;
  codeBlock?: string;
  language?: string;
  technologyIds?: string[];
}

export interface UpdatePublicationInput {
  area?: Area;
  title?: string;
  description?: string;
  errorCode?: string | null;
  solution?: string | null;
  codeBlock?: string | null;
  language?: string | null;
  technologyIds?: string[];
}

export interface ListPublicationsQuery {
  type?: PublicationType;
  area?: Area;
  technologyId?: string;
  sortBy?: "recent" | "most_voted";
  page: number;
  limit: number;
}
