'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './Callback.module.css';

export default function OAuthCallbackPage() {
    const router = useRouter();
    const { completeOAuthLogin } = useAuth();
    const startedRef = useRef(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        const run = async () => {
            try {
                await completeOAuthLogin();
                router.replace('/dashboard');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Could not complete social login.';
                setErrorMessage(message);
            }
        };

        void run();
    }, [completeOAuthLogin, router]);

    return (
        <main className={styles.page}>
            <section className={styles.card}>
                <h1>Finalizing login</h1>
                {!errorMessage && <p>We are connecting your account. Please wait...</p>}
                {errorMessage && (
                    <>
                        <p className={styles.error}>{errorMessage}</p>
                        <button type="button" className={styles.button} onClick={() => router.replace('/login')}>
                            Back to Login
                        </button>
                    </>
                )}
            </section>
        </main>
    );
}
