'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './NotificationCenter.module.css';

interface Notification {
    id: string;
    type: 'ANSWER_ACCEPTED' | 'NEW_COMMENT' | 'SYSTEM';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    questionId?: string;
    actorAvatar?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'ANSWER_ACCEPTED',
        title: 'Answer Accepted!',
        message: 'Mauri Rodriguez accepted your answer in: "How to fix CORS in Next.js?"',
        isRead: false,
        createdAt: new Date().toISOString(),
        questionId: 'q-101',
        actorAvatar: 'https://github.com/mauriRodriguez20.png'
    },
    {
        id: '2',
        type: 'NEW_COMMENT',
        title: 'New Comment',
        message: 'Someone commented on your publication: "Advanced Tailwind Tips"',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isRead: true,
    },
    {
        id: '3',
        type: 'ANSWER_ACCEPTED',
        title: 'Solution Confirmed',
        message: 'Alice accepted your solution for "Type error in useEffect hooks"',
        isRead: false,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
    }
];

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button
                className={`${styles.bellBtn} ${unreadCount > 0 ? styles.hasUnread : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
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
                            <button className={styles.markAllBtn} onClick={markAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`${styles.item} ${!notif.isRead ? styles.unread : ''}`}
                                    onClick={() => markAsRead(notif.id)}
                                >
                                    <div className={styles.itemAvatar}>
                                        {notif.actorAvatar ? (
                                            <img src={notif.actorAvatar} alt="" />
                                        ) : (
                                            <div className={styles.notifIcon}>
                                                {notif.type === 'ANSWER_ACCEPTED' ? '✅' : '💬'}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.itemContent}>
                                        <h4 className={styles.itemTitle}>{notif.title}</h4>
                                        <p className={styles.itemMessage}>{notif.message}</p>
                                        <span className={styles.itemTime}>
                                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {!notif.isRead && <div className={styles.unreadDot} />}
                                </div>
                            ))
                        ) : (
                            <div className={styles.empty}>
                                <p>No new notifications</p>
                            </div>
                        )}
                    </div>

                    <div className={styles.footer}>
                        <button className={styles.viewAllBtn}>View all notifications</button>
                    </div>
                </div>
            )}
        </div>
    );
}
