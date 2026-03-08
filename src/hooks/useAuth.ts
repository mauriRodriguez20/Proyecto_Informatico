'use client';

import { useState, useCallback } from 'react';
import { AuthUser, LoginCredentials, RegisterData } from '@/types/auth.types';

interface UseAuthReturn {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        // 🚀 Dev log — runs once on first render
    }

    const login = useCallback(async (credentials: LoginCredentials) => {
        setLoading(true);
        setError(null);
        try {
            // TODO: replace with real API call / Supabase
            await new Promise<void>((resolve) => setTimeout(resolve, 1000));
            setUser({ id: '1', name: 'Developer', email: credentials.email });
            console.log('%c✅ Login successful', 'color: #34d399; font-weight: bold;');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Login failed';
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        setLoading(true);
        setError(null);
        try {
            // TODO: replace with real API call / Supabase
            await new Promise<void>((resolve) => setTimeout(resolve, 1200));
            setUser({ id: '2', name: data.name, email: data.email });
            console.log('%c🚀 Account created!', 'color: #6366f1; font-weight: bold;');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Registration failed';
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setError(null);
    }, []);

    return { user, isLoading, error, login, register, logout };
}
