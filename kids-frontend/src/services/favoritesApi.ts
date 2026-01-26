import { api } from './api';
import { Video } from './videosApi';

export interface Favorite {
    id: string;
    user_id: string;
    child_id: string;
    video_id: string;
    video?: Video;
    created_at: string;
}

export const favoritesApi = {
    getFavorites: (childId?: string) => {
        const query = childId ? `?child_id=${childId}` : '';
        return api.get<Favorite[]>(`/api/favorites${query}`);
    },

    addFavorite: (childId: string, videoId: string) =>
        api.post<Favorite>('/api/favorites', { child_id: childId, video_id: videoId }),

    removeFavorite: (id: string) => api.delete<void>(`/api/favorites/${id}`),

    removeFavoriteByVideo: (videoId: string, childId?: string) => {
        const query = childId ? `?child_id=${childId}` : '';
        return api.delete<void>(`/api/favorites/video/${videoId}${query}`);
    },

    checkFavorite: (videoId: string, childId?: string) => {
        const query = childId ? `?child_id=${childId}` : '';
        return api.get<{ isFavorite: boolean }>(`/api/favorites/check/${videoId}${query}`);
    },
};
