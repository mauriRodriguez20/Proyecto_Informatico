/**
 * Shared API helpers for the microservices architecture.
 */

export const BASE_URL_MS01 = process.env.NEXT_PUBLIC_API_URL_MS01 || '';
export const BASE_URL_MS02 = process.env.NEXT_PUBLIC_API_URL_MS02 || '';

/** Read the stored JWT and build an Authorization header */
export function getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('auth_token') || localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Generic fetch wrapper — throws an Error with the server message on failure */
export async function apiRequest<T>(
    baseUrl: string,
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
            ...(options.headers as Record<string, string> | undefined),
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(body.message || `HTTP ${response.status}`);
    }

    // 204 No Content — return undefined cast as T
    if (response.status === 204) return undefined as unknown as T;

    return response.json() as Promise<T>;
}
