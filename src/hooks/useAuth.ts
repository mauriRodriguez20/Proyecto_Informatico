'use client';

import { useAuthContext } from '@/context/AuthContext';

/**
 * Hook de conveniencia para acceder al contexto de autenticación.
 */
export function useAuth() {
    return useAuthContext();
}
