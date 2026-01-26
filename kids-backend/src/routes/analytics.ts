import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics data
 */
router.get('/dashboard', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { data: screenTimeData, error: screenTimeError } = await supabase
            .from('screen_time_logs')
            .select('duration_seconds')
            .eq('user_id', userId);

        if (screenTimeError) throw screenTimeError;

        const totalScreenTime = screenTimeData?.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) || 0;

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('points')
            .eq('user_id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        const { data: videosData, error: videosError } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId);

        if (videosError) throw videosError;

        const { data: gamesData, error: gamesError } = await supabase
            .from('game_activities')
            .select('id')
            .eq('user_id', userId);

        if (gamesError) throw gamesError;

        return successResponse(res, 'Dashboard analytics retrieved', {
            totalScreenTime,
            totalPoints: profileData?.points || 0,
            videosWatched: videosData?.length || 0,
            gamesPlayed: gamesData?.length || 0,
        });
    } catch (error: unknown) {
        console.error('Analytics error:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/analytics/user/{userId}:
 *   get:
 *     summary: Get analytics for a specific user
 *     description: Admin or own profile access only
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User analytics
 *       403:
 *         description: Unauthorized
 */
router.get('/user/:userId', authenticateUser, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (req.user?.id !== userId) {
            const { data: profile } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', req.user?.id)
                .single();

            if (!profile || profile.role !== 'admin') {
                return errorResponse(res, 'Unauthorized', 403);
            }
        }

        const { data: screenTimeData } = await supabase
            .from('screen_time_logs')
            .select('*')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(30);

        const { data: favoritesData } = await supabase
            .from('favorites')
            .select('*, video:videos (*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        const { data: gameHistory } = await supabase
            .from('game_activities')
            .select('*')
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(20);

        return successResponse(res, 'User analytics retrieved', {
            screenTime: screenTimeData,
            favorites: favoritesData,
            gameHistory,
        });
    } catch (error: unknown) {
        console.error('User analytics error:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch user analytics';
        return errorResponse(res, message, 500);
    }
});

export default router;
