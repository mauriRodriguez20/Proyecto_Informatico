'use client';

import { useState, useEffect } from 'react';
import Hero from '@/components/hero/Hero';
import CommunitySection from '@/components/community/CommunitySection';
import AuthOverlay from '@/components/auth/AuthOverlay';
import { AuthMode } from '@/types/auth.types';

export default function Home() {
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('login');

    const openAuth = (mode: AuthMode) => {
        setAuthMode(mode);
        setIsAuthOpen(true);
    };

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
                onLoginClick={() => openAuth('login')}
                onSignUpClick={() => openAuth('register')}
            />

            <CommunitySection />

            <AuthOverlay
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                initialMode={authMode}
            />
        </main>
    );
}
