'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PasswordStrength from '@/components/auth/components/PasswordStrength';
import Link from 'next/link';
import styles from './ResetPassword.module.css';

// Supabase browser client — solo para intercambiar el code PKCE por sesión.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [exchangeError, setExchangeError] = useState<string | null>(null);
    const [isExchanging, setIsExchanging] = useState(true);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Intercambiar el token de recuperación por una sesión Supabase.
    // Supabase puede enviar el token de dos formas según la configuración del proyecto:
    //   - PKCE:     ?code=xxx  (query param)
    //   - Implicit: #access_token=xxx&type=recovery  (hash fragment)
    useEffect(() => {
        async function exchangeToken() {
            // Caso 1: PKCE — token en query param
            const code = searchParams.get('code');
            if (code) {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error || !data.session?.access_token) {
                    setExchangeError('El enlace de recuperación ha expirado. Solicita uno nuevo.');
                } else {
                    setAccessToken(data.session.access_token);
                }
                setIsExchanging(false);
                return;
            }

            // Caso 2: Implicit flow — token en hash fragment
            const hash = window.location.hash.substring(1);
            if (hash) {
                const params = new URLSearchParams(hash);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const type = params.get('type');
                const errorParam = params.get('error');

                if (errorParam) {
                    setExchangeError('El enlace de recuperación ha expirado. Solicita uno nuevo.');
                    setIsExchanging(false);
                    return;
                }

                if (type === 'recovery' && accessToken && refreshToken) {
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    if (error || !data.session?.access_token) {
                        setExchangeError('El enlace de recuperación ha expirado. Solicita uno nuevo.');
                    } else {
                        setAccessToken(data.session.access_token);
                    }
                    setIsExchanging(false);
                    return;
                }
            }

            // Sin code ni hash válido
            setExchangeError('El enlace de recuperación es inválido o ha expirado.');
            setIsExchanging(false);
        }

        exchangeToken();
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (!accessToken) {
            setError('Sesión inválida. Solicita un nuevo enlace de recuperación.');
            return;
        }

        setIsLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (updateError) throw new Error(updateError.message);

            setSuccess(true);
            localStorage.removeItem('auth_token');
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'No se pudo actualizar la contraseña. Intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isExchanging) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>
                Verificando enlace…
            </div>
        );
    }

    if (exchangeError) {
        return (
            <div>
                <div className={styles.alert} role="alert">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {exchangeError}
                </div>
                <p className={styles.loginLink}>
                    <Link href="/login">← Volver al inicio de sesión</Link>
                </p>
            </div>
        );
    }

    if (success) {
        return (
            <div className={styles.success}>
                <div className={styles.successIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={48} height={48}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                </div>
                <h3>¡Contraseña actualizada!</h3>
                <p>Tu contraseña fue cambiada exitosamente. Serás redirigido al inicio de sesión en unos segundos.</p>
            </div>
        );
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error && (
                <div className={styles.alert} role="alert">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            <div className={styles.field}>
                <label htmlFor="new-password" className={styles.label}>Nueva contraseña</label>
                <input
                    id="new-password"
                    type="password"
                    className={styles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                />
                <PasswordStrength password={newPassword} />
            </div>

            <div className={styles.field}>
                <label htmlFor="confirm-password" className={styles.label}>Confirmar contraseña</label>
                <input
                    id="confirm-password"
                    type="password"
                    className={styles.input}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                {isLoading ? (
                    <><span className={styles.spinner} />Actualizando…</>
                ) : (
                    'Establecer nueva contraseña'
                )}
            </button>

            <p className={styles.loginLink}>
                <Link href="/login">← Volver al inicio de sesión</Link>
            </p>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.logo}>DevPortal</div>
                <h1 className={styles.heading}>Nueva contraseña</h1>
                <p className={styles.hint}>Escoge una contraseña segura para tu cuenta.</p>
                <Suspense fallback={<div style={{ textAlign: 'center' }}>Cargando…</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
