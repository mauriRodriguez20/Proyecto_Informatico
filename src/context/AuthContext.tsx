'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthUser, LoginCredentials, RegisterData } from '@/types/auth.types';
import { UserProfile } from '@/types/user.types';
import { userService } from '@/services/user.service';
import LoadingOverlay from '@/components/shared/LoadingOverlay/LoadingOverlay';

/** Map a backend UserProfile to the frontend AuthUser shape */
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

    // Restaurar sesión al inicio
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
        setLoading(false); // Terminar carga inicial
    }, []);

    const login = useCallback(async (credentials: LoginCredentials) => {
        setLoadingMessage('Authenticating credentials...');
        setLoading(true);
        setError(null);
        try {
            setLoadingMessage('Validating credentials...');
            const { token, user: profile } = await userService.login(credentials);

            setLoadingMessage('Preparing your workspace...');
            const authUser = toAuthUser(profile);
            setUser(authUser);
            localStorage.setItem('auth_token', token);
            localStorage.setItem('access_token', token);
            localStorage.setItem('user', JSON.stringify(authUser));
        } catch (err: any) {
            setError(err.message || 'Login failed');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        setLoadingMessage('Creating your account...');
        setLoading(true);
        setError(null);
        try {
            let { token, user: profile } = await userService.register(data);

            // If register does not return a session token, log in immediately.
            if (!token) {
                const loginResult = await userService.login({
                    email: data.email,
                    password: data.password,
                });
                token = loginResult.token;
                profile = loginResult.user;
            }

            const authUser = toAuthUser(profile);
            setUser(authUser);
            localStorage.setItem('auth_token', token);
            localStorage.setItem('access_token', token);
            localStorage.setItem('user', JSON.stringify(authUser));
        } catch (err: any) {
            setError(err.message || 'Registration failed');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            // Notify backend to invalidate the session token
            await userService.logout();
        } catch {
            // Ignore network errors on logout — still clear local session
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
        <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, updateUser }}>
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
