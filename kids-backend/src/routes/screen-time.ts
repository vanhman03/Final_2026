import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

const screenTimeLogSchema = z.object({
    child_id: z.string().uuid(),
    activity_type: z.enum(['video', 'game', 'music', 'reading', 'other']),
    started_at: z.string().datetime().optional(),
});

/**
 * @swagger
 * /api/screen-time:
 *   get:
 *     summary: Get screen time logs
 *     tags: [Screen Time]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: child_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Screen time logs
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id, start_date, end_date, limit } = req.query;

        let query = supabase
            .from('screen_time_logs')
            .select('*')
            .eq('user_id', userId)
            .order('started_at', { ascending: false });

        if (child_id) query = query.eq('child_id', child_id as string);
        if (start_date) query = query.gte('started_at', start_date as string);
        if (end_date) query = query.lte('started_at', end_date as string);
        if (limit) query = query.limit(parseInt(limit as string, 10));

        const { data: logs, error } = await query;
        if (error) return errorResponse(res, 'Failed to fetch screen time logs', 500, error);
        return successResponse(res, 'Screen time logs retrieved', logs);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch screen time logs';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/screen-time/summary:
 *   get:
 *     summary: Get screen time summary
 *     tags: [Screen Time]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: child_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *     responses:
 *       200:
 *         description: Screen time summary
 */
router.get('/summary', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id, period } = req.query;
        if (!child_id) return errorResponse(res, 'child_id is required', 400);

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'week': startDate = new Date(now.setDate(now.getDate() - 7)); break;
            case 'month': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
            case 'year': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
            default: startDate = new Date(now.setHours(0, 0, 0, 0));
        }

        const { data: logs, error } = await supabase
            .from('screen_time_logs')
            .select('activity_type, duration_seconds')
            .eq('user_id', userId)
            .eq('child_id', child_id as string)
            .gte('started_at', startDate.toISOString())
            .not('duration_seconds', 'is', null);

        if (error) return errorResponse(res, 'Failed to fetch summary', 500, error);

        const summary: Record<string, number> = {};
        let totalSeconds = 0;

        logs?.forEach(log => {
            const duration = log.duration_seconds || 0;
            summary[log.activity_type] = (summary[log.activity_type] || 0) + duration;
            totalSeconds += duration;
        });

        return successResponse(res, 'Screen time summary retrieved', {
            totalSeconds,
            totalMinutes: Math.round(totalSeconds / 60),
            byActivity: summary,
            period: period || 'today',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch summary';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/screen-time/start:
 *   post:
 *     summary: Start a screen time session
 *     tags: [Screen Time]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [child_id, activity_type]
 *             properties:
 *               child_id:
 *                 type: string
 *                 format: uuid
 *               activity_type:
 *                 type: string
 *                 enum: [video, game, music, reading, other]
 *     responses:
 *       201:
 *         description: Session started
 */
router.post('/start', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id, activity_type, started_at } = screenTimeLogSchema.parse(req.body);

        await supabase
            .from('screen_time_logs')
            .update({ ended_at: new Date().toISOString(), duration_seconds: 0 })
            .eq('user_id', userId)
            .eq('child_id', child_id)
            .is('ended_at', null);

        const { data: session, error } = await supabase
            .from('screen_time_logs')
            .insert([{ user_id: userId, child_id, activity_type, started_at: started_at || new Date().toISOString() }])
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to start session', 500, error);
        return successResponse(res, 'Session started', session, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to start session';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/screen-time/{id}/end:
 *   put:
 *     summary: End a screen time session
 *     tags: [Screen Time]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Session ended
 */
router.put('/:id/end', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { id } = req.params;
        const { ended_at } = req.body;

        const { data: session, error: fetchError } = await supabase
            .from('screen_time_logs')
            .select('started_at')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !session) return errorResponse(res, 'Session not found', 404);

        const endTime = ended_at ? new Date(ended_at) : new Date();
        const startTime = new Date(session.started_at);
        const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

        const { data: updated, error } = await supabase
            .from('screen_time_logs')
            .update({ ended_at: endTime.toISOString(), duration_seconds: durationSeconds })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to end session', 500, error);
        return successResponse(res, 'Session ended', updated);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to end session';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/screen-time/active:
 *   get:
 *     summary: Get active session for a child
 *     tags: [Screen Time]
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
 *         description: Active session status
 */
router.get('/active', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id } = req.query;
        if (!child_id) return errorResponse(res, 'child_id is required', 400);

        const { data: session, error } = await supabase
            .from('screen_time_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('child_id', child_id as string)
            .is('ended_at', null)
            .single();

        if (error && error.code !== 'PGRST116') return errorResponse(res, 'Failed to fetch active session', 500, error);

        return successResponse(res, 'Active session check', { hasActiveSession: !!session, session: session || null });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch active session';
        return errorResponse(res, message, 500);
    }
});

export default router;
