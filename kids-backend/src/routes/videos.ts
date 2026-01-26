import { Router, Request, Response } from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Validation schemas
const videoSchema = z.object({
    title: z.string().min(1).max(200),
    youtube_video_id: z.string().min(1),
    youtube_url: z.string().url().optional(),
    thumbnail_emoji: z.string().max(10).default('📺'),
    category: z.string().min(1),
    age_group: z.string().min(1),
    duration: z.string().min(1),
    language: z.string().default('en'),
});

const videoQuerySchema = z.object({
    category: z.string().optional(),
    age_group: z.string().optional(),
    language: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Get all videos
 *     description: Retrieve videos with optional filtering and pagination
 *     tags: [Videos]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: age_group
 *         schema:
 *           type: string
 *         description: Filter by age group
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of videos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const query = videoQuerySchema.parse(req.query);
        const offset = (query.page - 1) * query.limit;

        let dbQuery = supabase
            .from('videos')
            .select('*', { count: 'exact' });

        if (query.category) {
            dbQuery = dbQuery.eq('category', query.category);
        }
        if (query.age_group) {
            dbQuery = dbQuery.eq('age_group', query.age_group);
        }
        if (query.language) {
            dbQuery = dbQuery.eq('language', query.language);
        }
        if (query.search) {
            dbQuery = dbQuery.ilike('title', `%${query.search}%`);
        }

        dbQuery = dbQuery
            .range(offset, offset + query.limit - 1)
            .order('created_at', { ascending: false });

        const { data: videos, error, count } = await dbQuery;

        if (error) {
            return errorResponse(res, 'Failed to fetch videos', 500, error);
        }

        return successResponse(res, 'Videos retrieved', {
            videos,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / query.limit),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch videos';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/videos/categories/list:
 *   get:
 *     summary: Get all video categories
 *     tags: [Videos]
 *     security: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories/list', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('category')
            .order('category');

        if (error) {
            return errorResponse(res, 'Failed to fetch categories', 500, error);
        }

        const categories = [...new Set(data?.map(v => v.category) || [])];
        return successResponse(res, 'Categories retrieved', { categories });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch categories';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     summary: Get a video by ID
 *     tags: [Videos]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Video details
 *       404:
 *         description: Video not found
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: video, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !video) {
            return errorResponse(res, 'Video not found', 404);
        }

        return successResponse(res, 'Video retrieved', video);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch video';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/videos:
 *   post:
 *     summary: Create a new video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - youtube_video_id
 *               - category
 *               - age_group
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               youtube_video_id:
 *                 type: string
 *               youtube_url:
 *                 type: string
 *               thumbnail_emoji:
 *                 type: string
 *               category:
 *                 type: string
 *               age_group:
 *                 type: string
 *               duration:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       201:
 *         description: Video created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const videoData = videoSchema.parse(req.body);

        const { data: video, error } = await supabase
            .from('videos')
            .insert([{
                ...videoData,
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) {
            return errorResponse(res, 'Failed to create video', 500, error);
        }

        return successResponse(res, 'Video created', video, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create video';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/videos/{id}:
 *   put:
 *     summary: Update a video
 *     tags: [Videos]
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
 *             $ref: '#/components/schemas/Video'
 *     responses:
 *       200:
 *         description: Video updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const videoData = videoSchema.partial().parse(req.body);

        const { data: video, error } = await supabase
            .from('videos')
            .update(videoData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return errorResponse(res, 'Failed to update video', 500, error);
        }

        return successResponse(res, 'Video updated', video);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update video';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/videos/{id}:
 *   delete:
 *     summary: Delete a video
 *     tags: [Videos]
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
 *         description: Video deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.delete('/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) {
            return errorResponse(res, 'Failed to delete video', 500, error);
        }

        return successResponse(res, 'Video deleted');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete video';
        return errorResponse(res, message, 500);
    }
});

export default router;
