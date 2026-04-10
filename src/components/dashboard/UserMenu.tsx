'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import styles from './UserMenu.module.css';

export default function UserMenu() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        try {
            await logout();
        } finally {
            router.replace('/');
            router.refresh();
            setIsLoggingOut(false);
        }
    };

    if (!user) return null;

    return (
        <div className={styles.userMenu}>
            <button className={styles.trigger}>
                <span className={styles.avatarWrapper}>
                    <div className={styles.avatar}>
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className={styles.avatarImg} />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                {(user.username?.[0] || 'U').toUpperCase()}
                            </div>
                        )}
                    </div>
                </span>
                <span className={styles.triggerInfo}>
                    <span className={styles.triggerName}>{user.username}</span>
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        width={14}
                        height={14}
                        className={styles.chevron}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </span>
            </button>

            <div className={styles.dropdown}>
                <div className={styles.profileHeader}>
                    <div className={styles.profileAvatar}>
                        <div className={styles.avatar} style={{ width: '100%', height: '100%' }}>
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.username} className={styles.avatarImg} />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={28} height={28}>
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <h3 className={styles.username}>{user.username}</h3>
                    <span className={styles.role}>{user.role}</span>
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{Number(user.rating || 5).toFixed(1)}</span>
                        <span className={styles.statLabel}>Rating</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>12</span>
                        <span className={styles.statLabel}>Comments</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>4</span>
                        <span className={styles.statLabel}>Solutions</span>
                    </div>
                </div>

                <div className={styles.menuActions}>
                    <Link href="/dashboard/profile" className={styles.actionItem}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        View Profile
                    </Link>
                    <button onClick={handleLogout} className={`${styles.actionItem} ${styles.logoutBtn}`} disabled={isLoggingOut}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            </div>
        </div>
    );
}
