import { api } from './api';

export interface GameActivity {
    id: string;
    user_id: string;
    child_id: string;
    game_type: string;
    level?: string;
    score: number;
    time_spent: number;
    played_at: string;
    newBadges?: string[];
}

export interface GameActivitiesResponse {
    activities: GameActivity[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface GameStats {
    totalGames: number;
    totalTimeSpent: number;
    byGameType: Record<string, {
        totalGames: number;
        totalScore: number;
        averageScore: number;
        totalTime: number;
        highScore: number;
    }>;
}

export interface LeaderboardEntry {
    score: number;
    game_type: string;
    level?: string;
    played_at: string;
    child_id: string;
}

export interface LogGameActivityRequest {
    child_id: string;
    game_type: string;
    level?: string;
    score?: number;
    streak?: number;
    time_spent?: number;
}

export const gamesApi = {
    getActivities: (childId?: string, gameType?: string, page = 1, limit = 20) => {
        const params = new URLSearchParams();
        if (childId) params.append('child_id', childId);
        if (gameType) params.append('game_type', gameType);
        params.append('page', String(page));
        params.append('limit', String(limit));
        return api.get<GameActivitiesResponse>(`/api/games?${params}`);
    },

    logActivity: (gameType: string, data: Omit<LogGameActivityRequest, 'game_type'>) =>
        api.post<GameActivity>(`/api/games/${gameType}/activity`, data),

    getStats: (childId: string) =>
        api.get<GameStats>(`/api/games/stats?child_id=${childId}`),

    getLeaderboard: (gameType?: string, limit = 10) => {
        const params = new URLSearchParams();
        if (gameType) params.append('game_type', gameType);
        params.append('limit', String(limit));
        return api.get<LeaderboardEntry[]>(`/api/games/leaderboard?${params}`);
    },
};
