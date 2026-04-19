'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthUser, LoginCredentials, OAuthProvider, RegisterData } from '@/types/auth.types';
import { UserProfile } from '@/types/user.types';
import { userService } from '@/services/user.service';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import LoadingOverlay from '@/components/shared/LoadingOverlay/LoadingOverlay';

function toAuthUser(profile: UserProfile): AuthUser {
    return {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: profile.role,
        rating: profile.avgRating ?? 0,
        avatarUrl: profile.avatarUrl ?? undefined,
        createdAt:
            typeof profile.createdAt === 'string'
                ? profile.createdAt
                : profile.createdAt?.toISOString(),
    };
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
    completeOAuthLogin: () => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Initializing portal...');
    const [error, setError] = useState<string | null>(null);

    const persistSession = useCallback((token: string, profile: UserProfile) => {
        const authUser = toAuthUser(profile);
        setUser(authUser);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(authUser));
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse stored user', e);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (credentials: LoginCredentials) => {
        setLoadingMessage('Authenticating credentials...');
        setLoading(true);
        setError(null);
        try {
            const { token, user: profile } = await userService.login(credentials);
            persistSession(token, profile);
        } catch (err: any) {
            setError(err.message || 'Login failed');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [persistSession]);

    const loginWithOAuth = useCallback(async (provider: OAuthProvider) => {
        setLoadingMessage(`Redirecting to ${provider}...`);
        setLoading(true);
        setError(null);

        try {
            const supabase = getSupabaseBrowserClient();
            const redirectTo = `${window.location.origin}/auth/callback`;

            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo },
            });

            if (oauthError) throw oauthError;
            if (!data.url) throw new Error('No OAuth redirect URL was returned by Supabase.');

            window.location.assign(data.url);
        } catch (err: any) {
            const message = err.message || `Could not start ${provider} login.`;
            setError(message);
            setLoading(false);
            throw new Error(message);
        }
    }, []);

    const completeOAuthLogin = useCallback(async () => {
        setLoadingMessage('Completing OAuth session...');
        setLoading(true);
        setError(null);

        try {
            const supabase = getSupabaseBrowserClient();
            const currentUrl = new URL(window.location.href);
            const code = currentUrl.searchParams.get('code');

            if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) throw exchangeError;
            }

            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            const accessToken = sessionData.session?.access_token;
            if (!accessToken) throw new Error('OAuth session token was not found.');

            const { token, user: profile } = await userService.syncOAuthSession(accessToken);
            persistSession(token, profile);
        } catch (err: any) {
            const message = err.message || 'Could not complete OAuth login.';
            setError(message);

            localStorage.removeItem('auth_token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setUser(null);

            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, [persistSession]);

    const register = useCallback(async (data: RegisterData) => {
        setLoadingMessage('Creating your account...');
        setLoading(true);
        setError(null);
        try {
            let { token, user: profile } = await userService.register(data);

            if (!token) {
                const loginResult = await userService.login({
                    email: data.email,
                    password: data.password,
                });
                token = loginResult.token;
                profile = loginResult.user;
            }

            persistSession(token, profile);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [persistSession]);

    const logout = useCallback(async () => {
        try {
            const supabase = getSupabaseBrowserClient();
            await supabase.auth.signOut();
            await userService.logout();
        } catch {
            // Ignore logout network errors, still clear local session.
        } finally {
            setUser(null);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setError(null);
        }
    }, []);

    const updateUser = useCallback((newData: Partial<AuthUser>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...newData };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                error,
                login,
                loginWithOAuth,
                completeOAuthLogin,
                register,
                logout,
                updateUser,
            }}
        >
            <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
