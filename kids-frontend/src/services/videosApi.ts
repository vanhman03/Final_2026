import { api } from './api';

export interface Video {
    id: string;
    title: string;
    youtube_video_id: string;
    youtube_url?: string;
    thumbnail_emoji: string;
    category: string;
    age_group: string;
    duration: string;
    language: string;
    created_at: string;
}

export interface VideosResponse {
    videos: Video[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface VideoFilters {
    category?: string;
    age_group?: string;
    language?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface VideoPayload {
    title: string;
    youtube_video_id: string;
    youtube_url?: string;
    thumbnail_emoji?: string;
    category: string;
    age_group: string;
    duration: string;
    language?: string;
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
    const filtered = Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

export const videosApi = {
    getVideos: (filters: VideoFilters = {}) => {
        const query = buildQueryString(filters);
        return api.get<VideosResponse>(`/api/videos${query}`);
    },

    getVideo: (id: string) => api.get<Video>(`/api/videos/${id}`),

    getCategories: () => api.get<{ categories: string[] }>('/api/videos/categories/list'),

    createVideo: (payload: VideoPayload) =>
        api.post<Video>('/api/videos', payload),

    updateVideo: (id: string, payload: Partial<VideoPayload>) =>
        api.put<Video>(`/api/videos/${id}`, payload),

    deleteVideo: (id: string) =>
        api.delete<void>(`/api/videos/${id}`),
};
