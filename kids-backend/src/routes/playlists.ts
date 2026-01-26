import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Validation schemas
const playlistSchema = z.object({
    name: z.string().min(1).max(100),
    child_id: z.string().uuid(),
    is_locked: z.boolean().default(false),
});

const addVideoSchema = z.object({
    video_id: z.string().uuid(),
    position: z.number().min(0).optional(),
});

/**
 * @swagger
 * /api/playlists:
 *   get:
 *     summary: Get all playlists
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: child_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by child ID
 *     responses:
 *       200:
 *         description: List of playlists
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { child_id } = req.query;

        let query = supabase
            .from('playlists')
            .select(`*, playlist_videos (id, position, video:videos (*))`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (child_id) {
            query = query.eq('child_id', child_id);
        }

        const { data: playlists, error } = await query;

        if (error) return errorResponse(res, 'Failed to fetch playlists', 500, error);
        return successResponse(res, 'Playlists retrieved', playlists);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch playlists';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/playlists/{id}:
 *   get:
 *     summary: Get a playlist by ID
 *     tags: [Playlists]
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
 *         description: Playlist details
 *       404:
 *         description: Playlist not found
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { id } = req.params;

        const { data: playlist, error } = await supabase
            .from('playlists')
            .select(`*, playlist_videos (id, position, video:videos (*))`)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !playlist) return errorResponse(res, 'Playlist not found', 404);

        if (playlist.playlist_videos) {
            playlist.playlist_videos.sort((a: any, b: any) => a.position - b.position);
        }

        return successResponse(res, 'Playlist retrieved', playlist);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch playlist';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/playlists:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, child_id]
 *             properties:
 *               name:
 *                 type: string
 *               child_id:
 *                 type: string
 *                 format: uuid
 *               is_locked:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Playlist created
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const playlistData = playlistSchema.parse(req.body);

        const { data: playlist, error } = await supabase
            .from('playlists')
            .insert([{ ...playlistData, user_id: userId, created_at: new Date().toISOString() }])
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to create playlist', 500, error);
        return successResponse(res, 'Playlist created', playlist, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create playlist';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/playlists/{id}:
 *   put:
 *     summary: Update a playlist
 *     tags: [Playlists]
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
 *         description: Playlist updated
 */
router.put('/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { id } = req.params;
        const updates = playlistSchema.partial().parse(req.body);

        const { data: playlist, error } = await supabase
            .from('playlists')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update playlist', 500, error);
        return successResponse(res, 'Playlist updated', playlist);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update playlist';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/playlists/{id}:
 *   delete:
 *     summary: Delete a playlist
 *     tags: [Playlists]
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
 *         description: Playlist deleted
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { id } = req.params;

        await supabase.from('playlist_videos').delete().eq('playlist_id', id);
        const { error } = await supabase.from('playlists').delete().eq('id', id).eq('user_id', userId);

        if (error) return errorResponse(res, 'Failed to delete playlist', 500, error);
        return successResponse(res, 'Playlist deleted');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete playlist';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/playlists/{id}/videos:
 *   post:
 *     summary: Add a video to playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [video_id]
 *             properties:
 *               video_id:
 *                 type: string
 *                 format: uuid
 *               position:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Video added
 */
router.post('/:id/videos', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { id } = req.params;
        const { video_id, position } = addVideoSchema.parse(req.body);

        const { data: playlist } = await supabase
            .from('playlists')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!playlist) return errorResponse(res, 'Playlist not found', 404);

        let videoPosition = position;
        if (videoPosition === undefined) {
            const { data: maxPos } = await supabase
                .from('playlist_videos')
                .select('position')
                .eq('playlist_id', id)
                .order('position', { ascending: false })
                .limit(1)
                .single();
            videoPosition = (maxPos?.position || 0) + 1;
        }

        const { data: playlistVideo, error } = await supabase
            .from('playlist_videos')
            .insert([{ playlist_id: id, video_id, position: videoPosition }])
            .select(`*, video:videos (*)`)
            .single();

        if (error) return errorResponse(res, 'Failed to add video', 500, error);
        return successResponse(res, 'Video added to playlist', playlistVideo, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to add video';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/playlists/{id}/videos/{videoId}:
 *   delete:
 *     summary: Remove a video from playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Video removed
 */
router.delete('/:id/videos/:videoId', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return errorResponse(res, 'User ID not found', 401);

        const { id, videoId } = req.params;

        const { data: playlist } = await supabase
            .from('playlists')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!playlist) return errorResponse(res, 'Playlist not found', 404);

        const { error } = await supabase
            .from('playlist_videos')
            .delete()
            .eq('playlist_id', id)
            .eq('video_id', videoId);

        if (error) return errorResponse(res, 'Failed to remove video', 500, error);
        return successResponse(res, 'Video removed from playlist');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to remove video';
        return errorResponse(res, message, 500);
    }
});

export default router;
