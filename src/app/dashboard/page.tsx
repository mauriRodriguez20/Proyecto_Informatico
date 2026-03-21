'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import PublicationCreate from '@/components/dashboard/PublicationCreate';
import PublicationFeed from '@/components/dashboard/PublicationFeed';

export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-surface-3)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ opacity: 0, animation: 'fadeInUp 0.6s var(--ease-bounce) forwards' }}>
                <header style={{ marginBottom: 'var(--space-8)' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
                        Welcome back, <span style={{ color: 'var(--color-primary)' }}>{user.username}</span>!
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                        Share your knowledge or find solutions from the community.
                    </p>
                </header>

                <PublicationCreate />

                <PublicationFeed />
            </div>
        </DashboardLayout>
    );
}
