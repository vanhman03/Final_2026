import { supabase } from '@/integrations/supabase/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

interface ApiError {
    success: false;
    error: string;
    details?: unknown;
}

type ApiResult<T> = ApiResponse<T> | ApiError;

// ---------------------------------------------------------------------------
// Token cache — avoids a Supabase network round-trip on every API call.
// We refresh only when the cached token is within 60 s of expiry.
// ---------------------------------------------------------------------------
let _cachedToken: string | null = null;
let _tokenExpiresAt: number = 0; // Unix seconds
const TOKEN_REFRESH_BUFFER_S = 60; // refresh 60 s before actual expiry

/**
 * Decode the `exp` claim from a JWT without a library.
 * Returns 0 on any parse failure (forces a refresh).
 */
function jwtExpiry(token: string): number {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return typeof decoded.exp === 'number' ? decoded.exp : 0;
    } catch {
        return 0;
    }
}

/**
 * Get the current user's auth token.
 * Uses a short-lived in-memory cache; only calls Supabase when the token
 * is missing or within TOKEN_REFRESH_BUFFER_S seconds of expiry.
 */
async function getAuthToken(): Promise<string | null> {
    const nowS = Math.floor(Date.now() / 1000);

    if (_cachedToken && _tokenExpiresAt - nowS > TOKEN_REFRESH_BUFFER_S) {
        return _cachedToken;
    }

    // Token is absent or near expiry — fetch a fresh session.
    // getSession() returns the cached session and triggers a background
    // refresh automatically via Supabase's built-in token refresh mechanism.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;

    if (token) {
        _cachedToken = token;
        _tokenExpiresAt = jwtExpiry(token);
    } else {
        _cachedToken = null;
        _tokenExpiresAt = 0;
    }

    return token;
}

/**
 * Invalidate the cached token (call after logout or on 401 responses).
 */
export function invalidateAuthToken(): void {
    _cachedToken = null;
    _tokenExpiresAt = 0;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // On 401, clear the cache and retry once with a fresh token.
    if (response.status === 401) {
        invalidateAuthToken();
        const freshToken = await getAuthToken();
        if (freshToken && freshToken !== token) {
            const retryHeaders: HeadersInit = { ...headers, Authorization: `Bearer ${freshToken}` };
            const retryResponse = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: retryHeaders,
            });
            const retryResult: ApiResult<T> = await retryResponse.json();
            if (!retryResponse.ok || !('success' in retryResult) || !retryResult.success) {
                const err = retryResult as ApiError;
                throw new Error(err.error || 'API request failed');
            }
            return (retryResult as ApiResponse<T>).data;
        }
    }

    const result: ApiResult<T> = await response.json();

    if (!response.ok || !('success' in result) || !result.success) {
        const error = result as ApiError;
        throw new Error(error.error || 'API request failed');
    }

    return (result as ApiResponse<T>).data;
}

/**
 * API client for making requests to the backend
 */
export const api = {
    get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, data?: unknown) =>
        apiRequest<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T>(endpoint: string, data?: unknown) =>
        apiRequest<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export type { ApiResponse, ApiError };
