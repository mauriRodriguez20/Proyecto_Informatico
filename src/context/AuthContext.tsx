'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthUser, LoginCredentials, RegisterData } from '@/types/auth.types';
import LoadingOverlay from '@/components/shared/LoadingOverlay/LoadingOverlay';

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
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
            // Mock de delay
            await new Promise((r) => setTimeout(r, 1500));
            setLoadingMessage('Preparing your workspace...');
            await new Promise((r) => setTimeout(r, 800));

            const mockUser: AuthUser = {
                id: '1',
                username: credentials.email.split('@')[0],
                email: credentials.email,
                role: 'FRONTEND',
                rating: 4.9
            };

            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
        } catch (err: any) {
            setError('Login failed');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        setLoading(true);
        setError(null);
        try {
            await new Promise((r) => setTimeout(r, 1200));

            const mockUser: AuthUser = {
                id: Math.random().toString(36).substr(2, 9),
                username: data.username,
                email: data.email,
                role: data.role,
                rating: 5.0
            };

            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
        } catch (err: any) {
            setError('Registration failed');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        setError(null);
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
