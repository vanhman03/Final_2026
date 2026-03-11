import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

const favoriteSchema = z.object({
    child_id: z.string().uuid().optional(),
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
        // Use child_id if provided, otherwise assume the user itself is the "child"
        const effectiveChildId = child_id || userId;

        // Fetch favorites and manually fetch joined videos to avoid PGRST200 foreign key error
        // Because children table was dropped, the FK might be missing or broken.
        // We use the service role key so RLS is bypassed.
        const { data: favorites, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('child_id', effectiveChildId)
            .order('created_at', { ascending: false });

        if (error) return errorResponse(res, 'Failed to fetch favorites', 500, error);

        if (!favorites || favorites.length === 0) {
            return successResponse(res, 'Favorites retrieved', []);
        }

        // Fetch corresponding videos manually
        const videoIds = favorites.map(f => f.video_id);
        const { data: videos } = await supabase
            .from('videos')
            .select('*')
            .in('id', videoIds);

        const mergedFavorites = favorites.map(fav => ({
            ...fav,
            video: videos?.find(v => v.id === fav.video_id)
        }));

        return successResponse(res, 'Favorites retrieved', mergedFavorites);
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
        // Use child_id if provided, otherwise fall back to userId
        const effectiveChildId = child_id || userId;

        const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('child_id', effectiveChildId)
            .eq('video_id', video_id)
            .maybeSingle();

        if (existing) return errorResponse(res, 'Video already in favorites', 409);

        // Insert using service role (bypasses RLS).
        // Cast to any to bypass strict TS type if schema generation is out of sync.
        const { data: favorite, error } = await supabase
            .from('favorites')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert([{ child_id: effectiveChildId, video_id: video_id, created_at: new Date().toISOString() }] as any)
            .select()
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

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('id', id);

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
        const effectiveChildId = child_id || userId;

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('video_id', videoId)
            .eq('child_id', effectiveChildId as string);

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
        const effectiveChildId = child_id || userId;

        const { data, error } = await supabase
            .from('favorites')
            .select('id')
            .eq('video_id', videoId)
            .eq('child_id', effectiveChildId as string)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') return errorResponse(res, 'Failed to check favorite', 500, error);

        return successResponse(res, 'Favorite check', { isFavorite: !!data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to check favorite';
        return errorResponse(res, message, 500);
    }
});

export default router;
