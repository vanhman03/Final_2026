import { api } from './api';

export interface ScreenTimeLog {
    id: string;
    user_id: string;
    child_id: string;
    activity_type: 'video' | 'game' | 'music' | 'reading' | 'other';
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
}

export interface ScreenTimeSummary {
    totalSeconds: number;
    totalMinutes: number;
    byActivity: Record<string, number>;
    period: 'today' | 'week' | 'month' | 'year';
}

export type Period = 'today' | 'week' | 'month' | 'year';
export type ActivityType = 'video' | 'game' | 'music' | 'reading' | 'other';

export const screenTimeApi = {
    getLogs: (childId?: string, startDate?: string, endDate?: string, limit = 50) => {
        const params = new URLSearchParams();
        if (childId) params.append('child_id', childId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        params.append('limit', String(limit));
        return api.get<ScreenTimeLog[]>(`/api/screen-time?${params}`);
    },

    getSummary: (childId: string, period: Period = 'today') =>
        api.get<ScreenTimeSummary>(`/api/screen-time/summary?child_id=${childId}&period=${period}`),

    startSession: (childId: string, activityType: ActivityType) =>
        api.post<ScreenTimeLog>('/api/screen-time/start', {
            child_id: childId,
            activity_type: activityType,
        }),

    endSession: (id: string) =>
        api.put<ScreenTimeLog>(`/api/screen-time/${id}/end`),

    getActiveSession: (childId: string) =>
        api.get<{ hasActiveSession: boolean; session: ScreenTimeLog | null }>(
            `/api/screen-time/active?child_id=${childId}`
        ),
};
