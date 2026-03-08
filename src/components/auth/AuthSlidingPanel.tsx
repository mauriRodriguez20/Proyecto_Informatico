'use client';

import { useState, useEffect } from 'react';
import styles from './AuthSlidingPanel.module.css';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import SocialAuth from './components/SocialAuth';
import { AuthMode } from '@/types/auth.types';

interface AuthSlidingPanelProps {
    initialMode: AuthMode;
    onClose: () => void;
}

/**
 * AuthSlidingPanel — slides in from right with cubic-bezier(0.16, 1, 0.3, 1).
 * Handles mode switching between login and register with smooth transitions.
 */
export default function AuthSlidingPanel({ initialMode, onClose }: AuthSlidingPanelProps) {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [transitioning, setTransitioning] = useState(false);
    const [exitDir, setExitDir] = useState<'up' | 'down'>('up');

    // Sync when parent changes initialMode
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    const switchMode = (next: AuthMode) => {
        if (next === mode || transitioning) return;
        setExitDir(next === 'register' ? 'up' : 'down');
        setTransitioning(true);
        setTimeout(() => {
            setMode(next);
            setTransitioning(false);
        }, 280);
    };

    const title = mode === 'login' ? 'Welcome Back' : 'Join Us';
    const subtitle =
        mode === 'login'
            ? 'Sign in to your account to continue'
            : 'Create an account and start building';

    return (
        <aside className={styles.panel}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>⬡</span>
                        <span className={styles.logoText}>DevPortal</span>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Cerrar panel de autenticación"
                    >
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                            <path
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                d="M18 6 6 18M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>{title}</h2>
                    <p className={styles.subtitle}>{subtitle}</p>
                </div>

                {/* Mode tabs */}
                <div className={styles.tabs} role="tablist">
                    <button
                        role="tab"
                        aria-selected={mode === 'login'}
                        className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
                        onClick={() => switchMode('login')}
                    >
                        Sign In
                    </button>
                    <button
                        role="tab"
                        aria-selected={mode === 'register'}
                        className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
                        onClick={() => switchMode('register')}
                    >
                        Register
                    </button>
                    <span
                        className={styles.tabIndicator}
                        style={{ transform: `translateX(${mode === 'register' ? '100%' : '0%'})` }}
                    />
                </div>
            </div>

            {/* Scrollable form area */}
            <div className={styles.body}>
                <div
                    className={`${styles.formSlide} ${transitioning
                            ? exitDir === 'up'
                                ? styles.exitUp
                                : styles.exitDown
                            : styles.enterActive
                        }`}
                >
                    {mode === 'login' ? (
                        <LoginForm onSuccess={onClose} />
                    ) : (
                        <RegisterForm onSuccess={onClose} />
                    )}
                </div>

                <SocialAuth />

                <p className={styles.switchText}>
                    {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                    {' '}
                    <button
                        className={styles.switchLink}
                        onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                    >
                        {mode === 'login' ? 'Register' : 'Sign in'}
                    </button>
                </p>
            </div>
        </aside>
    );
}
