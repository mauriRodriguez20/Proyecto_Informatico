'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Hero from '@/components/hero/Hero';
import CommunitySection from '@/components/community/CommunitySection';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    // 🚀 Dev log once the portal is mounted
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log(
                '%c🚀 Auth system ready%c  — Developer\'s Portal v1.0',
                'background:#6366f1;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold;',
                'color:#8888aa;',
            );
        }
    }, []);

    return (
        <main>
            <Hero
                onLoginClick={() => router.push('/login')}
                onSignUpClick={() => router.push('/register')}
            />

            <CommunitySection />
        </main>
    );
}
