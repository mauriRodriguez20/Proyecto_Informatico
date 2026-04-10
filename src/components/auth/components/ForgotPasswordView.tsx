'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import FormInput from './FormInput';
import styles from './ForgotPasswordView.module.css';

// El resetPasswordForEmail DEBE llamarse desde el browser (no desde el servidor)
// para que el SDK almacene el code_verifier PKCE en el localStorage del usuario.
// Si se llama desde el servidor, el code_verifier se pierde y el link de email falla con 400.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ForgotPasswordViewProps {
    onBack: () => void;
}

export default function ForgotPasswordView({ onBack }: ForgotPasswordViewProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Ingresa tu correo electrónico.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Llamada directa a Supabase desde el browser para preservar el code_verifier PKCE
            await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            setSuccess(true);
        } catch {
            // Siempre mostrar éxito por seguridad (no revelar si el email existe)
            setSuccess(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <button type="button" className={styles.back} onClick={onBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back to Sign In
            </button>

            <p className={styles.heading}>Reset your password</p>
            <p className={styles.hint}>
                Enter the email associated with your account and we&apos;ll send you a reset link.
            </p>

            {error && (
                <div className={styles.alert} role="alert">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            {success ? (
                <div className={styles.success} role="status">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18} style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    If that email is registered, you&apos;ll receive a reset link shortly. Check your inbox (and spam folder).
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <FormInput
                        id="forgot-email"
                        label="Email address"
                        type="email"
                        icon="email"
                        autoComplete="email"
                        value={email}
                        onChange={setEmail}
                    />
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isLoading}
                        style={{ marginTop: 'var(--space-4)' }}
                    >
                        {isLoading ? (
                            <><span className={styles.spinner} />Sending…</>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
