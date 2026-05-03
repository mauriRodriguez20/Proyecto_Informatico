import {
  CommentTargetType,
  NotificationEntityType,
  NotificationType,
  Prisma,
  RatingTargetType,
} from "@prisma/client";

export interface AuthorSnapshot {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  avgRating?: number;
  totalRatings?: number;
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

export interface UserStatsSnapshot {
  userId: string;
  publicationsCount: number;
  questionsCount: number;
  answersCount: number;
  avgRating: number;
  totalRatings: number;
  label: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  questionId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  triggeredByUserId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListNotificationsQuery {
  page: number;
  limit: number;
  unreadOnly: boolean;
}

export interface PaginatedNotificationsResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
  hasUnread: boolean;
  emptyMessage?: string;
}

export interface MarkReadResult {
  notificationId: string;
  isRead: boolean;
  readAt: Date | null;
}

export interface MarkAllReadResult {
  updatedCount: number;
}

export interface UnreadCountResult {
  unreadCount: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
