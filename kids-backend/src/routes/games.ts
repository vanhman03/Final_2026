import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

const gameActivitySchema = z.object({
    child_id: z.string().uuid(),
    game_type: z.string().min(1).max(100),
    level: z.string().optional(),
    score: z.number().min(0).default(0),
    time_spent: z.number().min(0).default(0),
});

const gameQuerySchema = z.object({
    child_id: z.string().uuid().optional(),
    game_type: z.string().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: Get game activities
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: child_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: game_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of game activities
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const query = gameQuerySchema.parse(req.query);
        const offset = (query.page - 1) * query.limit;

        let dbQuery = supabase
            .from('game_activities')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('played_at', { ascending: false });

        if (query.child_id) dbQuery = dbQuery.eq('child_id', query.child_id);
        if (query.game_type) dbQuery = dbQuery.eq('game_type', query.game_type);
        if (query.start_date) dbQuery = dbQuery.gte('played_at', query.start_date);
        if (query.end_date) dbQuery = dbQuery.lte('played_at', query.end_date);

        dbQuery = dbQuery.range(offset, offset + query.limit - 1);

        const { data: activities, error, count } = await dbQuery;

        if (error) return errorResponse(res, 'Failed to fetch game activities', 500, error);

        return successResponse(res, 'Game activities retrieved', {
            activities,
            pagination: { page: query.page, limit: query.limit, total: count || 0, totalPages: Math.ceil((count || 0) / query.limit) },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch game activities';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/games:
 *   post:
 *     summary: Log a game activity
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [child_id, game_type]
 *             properties:
 *               child_id:
 *                 type: string
 *                 format: uuid
 *               game_type:
 *                 type: string
 *               level:
 *                 type: string
 *               score:
 *                 type: integer
 *               time_spent:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Game activity logged
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const gameData = gameActivitySchema.parse(req.body);

        const { data: activity, error } = await supabase
            .from('game_activities')
            .insert([{ ...gameData, user_id: userId, played_at: new Date().toISOString() }])
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to log game activity', 500, error);

        if (gameData.score > 0) {
            await updateGameHistory(userId, gameData.child_id, {
                game_type: gameData.game_type,
                level: gameData.level,
                score: gameData.score,
                played_at: new Date().toISOString(),
            });
        }

        return successResponse(res, 'Game activity logged', activity, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to log game activity';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/games/stats:
 *   get:
 *     summary: Get game statistics for a child
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: child_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Game statistics
 */
router.get('/stats', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id } = req.query;
        if (!child_id) return errorResponse(res, 'child_id is required', 400);

        const { data: activities, error } = await supabase
            .from('game_activities')
            .select('game_type, score, time_spent')
            .eq('user_id', userId)
            .eq('child_id', child_id as string);

        if (error) return errorResponse(res, 'Failed to fetch stats', 500, error);

        const stats: Record<string, { totalGames: number; totalScore: number; averageScore: number; totalTime: number; highScore: number }> = {};

        activities?.forEach(activity => {
            if (!stats[activity.game_type]) {
                stats[activity.game_type] = { totalGames: 0, totalScore: 0, averageScore: 0, totalTime: 0, highScore: 0 };
            }
            const gameStat = stats[activity.game_type];
            gameStat.totalGames++;
            gameStat.totalScore += activity.score || 0;
            gameStat.totalTime += activity.time_spent || 0;
            gameStat.highScore = Math.max(gameStat.highScore, activity.score || 0);
        });

        Object.values(stats).forEach(stat => {
            stat.averageScore = stat.totalGames > 0 ? Math.round(stat.totalScore / stat.totalGames) : 0;
        });

        return successResponse(res, 'Game stats retrieved', {
            totalGames: activities?.length || 0,
            totalTimeSpent: activities?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0,
            byGameType: stats,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch stats';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/games/leaderboard:
 *   get:
 *     summary: Get game leaderboard
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: game_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
router.get('/leaderboard', authenticateUser, async (req: Request, res: Response) => {
    try {
        const { game_type, limit = '10' } = req.query;

        let query = supabase
            .from('game_activities')
            .select('score, game_type, level, played_at, child_id')
            .order('score', { ascending: false })
            .limit(parseInt(limit as string, 10));

        if (game_type) query = query.eq('game_type', game_type as string);

        const { data: leaderboard, error } = await query;
        if (error) return errorResponse(res, 'Failed to fetch leaderboard', 500, error);
        return successResponse(res, 'Leaderboard retrieved', leaderboard);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch leaderboard';
        return errorResponse(res, message, 500);
    }
});

async function updateGameHistory(userId: string, childId: string, gameEntry: object): Promise<void> {
    try {
        const { data: profile } = await supabase.from('profiles').select('game_history').eq('user_id', userId).single();
        const currentHistory = Array.isArray(profile?.game_history) ? profile.game_history : [];
        const newHistory = [gameEntry, ...currentHistory].slice(0, 20);
        await supabase.from('profiles').update({ game_history: newHistory, updated_at: new Date().toISOString() }).eq('user_id', userId);
    } catch (error) {
        console.error('Failed to update game history:', error);
    }
}

export default router;
