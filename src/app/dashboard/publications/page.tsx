'use client';

import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PublicationFeed from '@/components/dashboard/PublicationFeed';
import styles from './publications.module.css';

export default function MyPublicationsPage() {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (!user) return <div className={styles.container}>Please login to see your publications.</div>;

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>My Publications</h1>
                    <p className={styles.subtitle}>Manage and track all your shared snippets and solutions.</p>
                </header>

                <PublicationFeed authorId={user.id} />
            </div>
        </DashboardLayout>
    );
}
