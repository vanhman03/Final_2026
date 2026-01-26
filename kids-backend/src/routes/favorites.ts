import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

const favoriteSchema = z.object({
    child_id: z.string().uuid(),
    video_id: z.string().uuid(),
});

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get all favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: child_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of favorites
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id } = req.query;

        let query = supabase
            .from('favorites')
            .select(`*, video:videos (*)`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (child_id) query = query.eq('child_id', child_id as string);

        const { data: favorites, error } = await query;

        if (error) return errorResponse(res, 'Failed to fetch favorites', 500, error);
        return successResponse(res, 'Favorites retrieved', favorites);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch favorites';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Add to favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [child_id, video_id]
 *             properties:
 *               child_id:
 *                 type: string
 *                 format: uuid
 *               video_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Added to favorites
 *       409:
 *         description: Already in favorites
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id, video_id } = favoriteSchema.parse(req.body);

        const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('child_id', child_id)
            .eq('video_id', video_id)
            .single();

        if (existing) return errorResponse(res, 'Video already in favorites', 409);

        const { data: favorite, error } = await supabase
            .from('favorites')
            .insert([{ user_id: userId, child_id, video_id, created_at: new Date().toISOString() }])
            .select(`*, video:videos (*)`)
            .single();

        if (error) return errorResponse(res, 'Failed to add favorite', 500, error);
        return successResponse(res, 'Added to favorites', favorite, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to add favorite';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/favorites/{id}:
 *   delete:
 *     summary: Remove from favorites by ID
 *     tags: [Favorites]
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
 *         description: Removed from favorites
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { id } = req.params;

        const { error } = await supabase.from('favorites').delete().eq('id', id).eq('user_id', userId);
        if (error) return errorResponse(res, 'Failed to remove favorite', 500, error);
        return successResponse(res, 'Removed from favorites');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to remove favorite';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/favorites/video/{videoId}:
 *   delete:
 *     summary: Remove from favorites by video ID
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: child_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Removed from favorites
 */
router.delete('/video/:videoId', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { videoId } = req.params;
        const { child_id } = req.query;

        let query = supabase.from('favorites').delete().eq('video_id', videoId).eq('user_id', userId);
        if (child_id) query = query.eq('child_id', child_id as string);

        const { error } = await query;
        if (error) return errorResponse(res, 'Failed to remove favorite', 500, error);
        return successResponse(res, 'Removed from favorites');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to remove favorite';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/favorites/check/{videoId}:
 *   get:
 *     summary: Check if video is in favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: child_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Favorite status
 */
router.get('/check/:videoId', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { videoId } = req.params;
        const { child_id } = req.query;

        let query = supabase.from('favorites').select('id').eq('video_id', videoId).eq('user_id', userId);
        if (child_id) query = query.eq('child_id', child_id as string);

        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') return errorResponse(res, 'Failed to check favorite', 500, error);

        return successResponse(res, 'Favorite check', { isFavorite: !!data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to check favorite';
        return errorResponse(res, message, 500);
    }
});

export default router;
