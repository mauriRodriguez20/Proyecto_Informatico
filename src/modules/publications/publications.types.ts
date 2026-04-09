import { PublicationType, Area } from "@prisma/client";

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

export type PublicationResponse = PublicationWithTags & { content: string };
export type PublicationWithAuthorResponse = PublicationWithAuthor & { content: string };

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
  content?: string;
  errorCode?: string;
  solution?: string;
  codeBlock?: string;
  language?: string;
  technologyIds?: string[];
  technologyId?: string;
  technologyNames?: string[];
}

export interface UpdatePublicationInput {
  area?: Area;
  title?: string;
  description?: string;
  content?: string;
  errorCode?: string | null;
  solution?: string | null;
  codeBlock?: string | null;
  language?: string | null;
  technologyIds?: string[];
  technologyId?: string;
  technologyNames?: string[];
}

export interface ListPublicationsQuery {
  type?: PublicationType;
  area?: Area;
  authorId?: string;
  technologyId?: string;
  sortBy?: "recent" | "most_voted";
  page: number;
  limit: number;
}
