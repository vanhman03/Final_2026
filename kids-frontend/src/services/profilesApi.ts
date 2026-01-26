import { api } from './api';

export interface Profile {
    id: string;
    user_id: string;
    display_name?: string;
    avatar_url?: string;
    screen_time_limit?: number;
    total_watch_time?: number;
    points: number;
    badges: string[];
    pin_hash?: string;
    game_history?: unknown[];
    created_at: string;
    updated_at: string;
}

export interface ProfileStats {
    totalWatchTime: number;
    points: number;
    badges: string[];
    recentGames: unknown[];
}

export interface UpdateProfileRequest {
    display_name?: string;
    avatar_url?: string;
    screen_time_limit?: number;
}

export const profilesApi = {
    getProfile: () => api.get<Profile>('/api/profiles/me'),

    updateProfile: (data: UpdateProfileRequest) =>
        api.put<Profile>('/api/profiles/me', data),

    setPin: (pin: string) =>
        api.post<{ hasPin: boolean }>('/api/profiles/me/pin', { pin }),

    verifyPin: (pin: string) =>
        api.post<{ valid: boolean }>('/api/profiles/me/verify-pin', { pin }),

    getStats: () => api.get<ProfileStats>('/api/profiles/me/stats'),

    addPoints: (points: number) =>
        api.post<{ points: number }>('/api/profiles/me/add-points', { points }),
};
