import { apiRequest, BASE_URL_MS04 } from '@/lib/api';

export type NotificationType = 'ANSWER_ACCEPTED';
export type NotificationEntityType = 'QUESTION' | 'ANSWER';

export interface UserPublicStats {
    userId: string;
    publicationsCount: number;
    questionsCount: number;
    answersCount: number;
    avgRating: number;
    totalRatings: number;
    label: string;
}

export interface UserPublicStatsEnvelope {
    stats: UserPublicStats;
}

export interface InteractionNotification {
    id: string;
    userId: string;
    type: NotificationType;
    entityType: NotificationEntityType;
    entityId: string;
    questionId: string | null;
    title: string;
    message: string;
    isRead: boolean;
    readAt: string | null;
    triggeredByUserId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
}

export interface ListNotificationsResponse {
    data: InteractionNotification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
    hasUnread: boolean;
    emptyMessage?: string;
}

export interface UnreadCountResponse {
    unreadCount: number;
}

export interface MarkNotificationReadResponse {
    message: string;
    notification: {
        notificationId: string;
        isRead: boolean;
        readAt: string | null;
    };
}

export interface MarkAllNotificationsReadResponse {
    message: string;
    updatedCount: number;
}

export const interactionsService = {
    async getUserPublicStats(userId: string): Promise<UserPublicStats> {
        const response = await apiRequest<UserPublicStatsEnvelope>(
            BASE_URL_MS04,
            `/api/users/${userId}/stats`,
            {
                cache: 'no-store',
            }
        );

        return response.stats;
    },

    async getNotifications(page = 1, limit = 20, unreadOnly = false): Promise<ListNotificationsResponse> {
        const safeLimit = Math.max(1, Math.min(limit, 50));
        const params = new URLSearchParams({
            page: String(page),
            limit: String(safeLimit),
            unreadOnly: unreadOnly ? 'true' : 'false',
        });

        return apiRequest<ListNotificationsResponse>(
            BASE_URL_MS04,
            `/api/notifications?${params.toString()}`,
            {
                cache: 'no-store',
            }
        );
    },

    async getUnreadNotificationsCount(): Promise<number> {
        const response = await apiRequest<UnreadCountResponse>(
            BASE_URL_MS04,
            '/api/notifications/unread-count',
            {
                cache: 'no-store',
            }
        );

        return Number(response.unreadCount ?? 0);
    },

    async markNotificationAsRead(notificationId: string): Promise<MarkNotificationReadResponse> {
        return apiRequest<MarkNotificationReadResponse>(
            BASE_URL_MS04,
            `/api/notifications/${notificationId}/read`,
            {
                method: 'PATCH',
            }
        );
    },

    async markAllNotificationsAsRead(): Promise<MarkAllNotificationsReadResponse> {
        return apiRequest<MarkAllNotificationsReadResponse>(
            BASE_URL_MS04,
            '/api/notifications/read-all',
            {
                method: 'PATCH',
            }
        );
    },
};
