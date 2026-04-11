import { CommentTargetType, RatingTargetType } from "@prisma/client";

export interface AuthorSnapshot {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
}

export interface CommentItem {
  id: string;
  authorId: string;
  targetType: CommentTargetType;
  targetId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author?: AuthorSnapshot | null;
}

export interface PaginatedCommentsResponse {
  data: CommentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCommentInput {
  content: string;
}

export interface ListCommentsQuery {
  page: number;
  limit: number;
}

export interface RateInput {
  score: number;
}

export interface UserReputationSnapshot {
  userId: string;
  avgRating: number;
  totalRatings: number;
}

export interface RatingSummary {
  targetType: RatingTargetType;
  targetId: string;
  targetAuthorId: string;
  avgRating: number;
  totalRatings: number;
  myScore: number | null;
  label: string;
}

export interface RateResult extends RatingSummary {
  userReputation: UserReputationSnapshot;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
