'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InteractionNotification, interactionsService } from '@/services/interactions.service';
import styles from './NotificationCenter.module.css';

const POLLING_INTERVAL_MS = 15000;
const PAGE_SIZE = 20;

function formatNotificationTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function NotificationCenter() {
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<InteractionNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadUnreadCount = useCallback(async () => {
        try {
            const count = await interactionsService.getUnreadNotificationsCount();
            setUnreadCount(count);
        } catch {
            // Keep existing value when poll fails.
        }
    }, []);

    const loadNotifications = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            const response = await interactionsService.getNotifications(1, PAGE_SIZE, false);
            setNotifications(response.data);
            setUnreadCount(response.unreadCount);
            setErrorMessage(null);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Could not load notifications.';
            setErrorMessage(message);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (notification: InteractionNotification) => {
        if (notification.isRead) return;

        try {
            await interactionsService.markNotificationAsRead(notification.id);
            setNotifications(prev =>
                prev.map(item => (item.id === notification.id ? { ...item, isRead: true } : item))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Could not mark notification as read.';
            setErrorMessage(message);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        void loadUnreadCount();

        const intervalId = window.setInterval(() => {
            void loadUnreadCount();
        }, POLLING_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [loadUnreadCount]);

    useEffect(() => {
        if (!isOpen) return;

        void loadNotifications(false);

        const intervalId = window.setInterval(() => {
            void loadNotifications(true);
        }, POLLING_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [isOpen, loadNotifications]);

    const handleMarkAllAsRead = async () => {
        if (isMarkingAll || unreadCount === 0) return;

        setIsMarkingAll(true);
        try {
            await interactionsService.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
            setUnreadCount(0);
            setErrorMessage(null);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Could not mark all notifications as read.';
            setErrorMessage(message);
        } finally {
            setIsMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notification: InteractionNotification) => {
        await markAsRead(notification);

        if (notification.questionId) {
            setIsOpen(false);
            router.push(`/dashboard/questions/${notification.questionId}`);
        }
    };

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button
                className={`${styles.bellBtn} ${unreadCount > 0 ? styles.hasUnread : ''}`}
                onClick={() => setIsOpen(prev => !prev)}
                aria-label="Notifications"
                type="button"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={24} height={24}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                className={styles.markAllBtn}
                                onClick={handleMarkAllAsRead}
                                disabled={isMarkingAll}
                                type="button"
                            >
                                {isMarkingAll ? 'Updating...' : 'Mark all as read'}
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {isLoading ? (
                            <div className={styles.stateMessage}>Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                            <div className={styles.empty}>
                                <p>No notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                                    onClick={() => void handleNotificationClick(notification)}
                                >
                                    <div className={styles.itemAvatar}>
                                        <div className={styles.notifIcon}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className={styles.itemContent}>
                                        <h4 className={styles.itemTitle}>{notification.title}</h4>
                                        <p className={styles.itemMessage}>{notification.message}</p>
                                        <span className={styles.itemTime}>{formatNotificationTime(notification.createdAt)}</span>
                                    </div>
                                    {!notification.isRead && <div className={styles.unreadDot} />}
                                </button>
                            ))
                        )}
                    </div>

                    <div className={styles.footer}>
                        {errorMessage ? (
                            <span className={styles.errorText}>{errorMessage}</span>
                        ) : (
                            <button className={styles.viewAllBtn} type="button">
                                Keep coding, you are up to date.
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
