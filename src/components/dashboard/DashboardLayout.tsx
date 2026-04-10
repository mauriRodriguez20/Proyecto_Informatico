'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from './UserMenu';
import NotificationCenter from './NotificationCenter';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/');
        }
    }, [isLoading, user, router]);

    if (isLoading || !user) return null;

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
        { href: '/dashboard/publications', label: 'My Publications', icon: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
        { href: '/dashboard/questions', label: 'Questions & Answers', icon: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
        { href: '/dashboard/profile', label: 'User Profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 0 1 0 8 4 4 0 0 1 0-8z' },
    ];

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <Link href="/dashboard" className={styles.logo}>
                        <div className={styles.logoDot} />
                        DevPortal
                    </Link>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navLink} ${pathname === item.href ? styles.activeNavLink : ''}`}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                width={20}
                                height={20}
                            >
                                <path d={item.icon} />
                            </svg>
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            <div className={styles.content}>
                <header className={styles.header}>
                    <div className={styles.headerActions}>
                        {/* <NotificationCenter /> */}
                        <UserMenu />
                    </div>
                </header>

                <main className={styles.main}>
                    {children}
                </main>
            </div>
        </div>
    );
}
