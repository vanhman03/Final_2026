import { Router, Request, Response } from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { bulkVideoImportSchema } from '../utils/validators';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

// ─── USER MANAGEMENT ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all user profiles (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user profiles
 */
router.get('/users', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '20', search } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        let query = supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (search) {
            query = query.ilike('display_name', `%${search}%`);
        }

        query = query.range(offset, offset + limitNum - 1);

        const { data: profiles, error, count } = await query;

        if (error) return errorResponse(res, 'Failed to fetch users', 500, error);

        return successResponse(res, 'Users retrieved', {
            users: profiles,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limitNum),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch users';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a user profile (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/users/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateSchema = z.object({
            display_name: z.string().min(1).max(100).optional(),
            avatar_url: z.string().optional(),
            screen_time_limit: z.number().min(0).max(1440).optional(),
            points: z.number().min(0).optional(),
            badges: z.array(z.string()).optional(),
        });

        const updates = updateSchema.parse(req.body);

        const { data: profile, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update user', 500, error);

        return successResponse(res, 'User updated', profile);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update user';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user profile (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/users/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) return errorResponse(res, 'Failed to delete user', 500, error);

        return successResponse(res, 'User deleted');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete user';
        return errorResponse(res, message, 500);
    }
});

// ─── ORDER MANAGEMENT ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Admin]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 */
router.put('/orders/:id/status', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = z.object({
            status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
        }).parse(req.body);

        const { data: order, error } = await supabase
            .from('orders')
            .update({ payment_status: status })
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to update order status', 500, error);

        return successResponse(res, 'Order status updated', order);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update order status';
        return errorResponse(res, message, 400);
    }
});

// ─── BADGE MANAGEMENT ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/users/{id}/badges:
 *   post:
 *     summary: Award badge to a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post('/users/:id/badges', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { badge } = z.object({ badge: z.string().min(1) }).parse(req.body);

        const { data: profile } = await supabase.from('profiles').select('badges').eq('id', id).single();
        const currentBadges: string[] = Array.isArray(profile?.badges) ? profile.badges : [];

        if (currentBadges.includes(badge)) {
            return errorResponse(res, 'User already has this badge', 400);
        }

        const newBadges = [...currentBadges, badge];
        const { data: updated, error } = await supabase
            .from('profiles')
            .update({ badges: newBadges, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) return errorResponse(res, 'Failed to award badge', 500, error);

        return successResponse(res, 'Badge awarded', updated);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to award badge';
        return errorResponse(res, message, 400);
    }
});


/**
 * @swagger
 * /api/admin/bulk-import-videos:
 *   post:
 *     summary: Bulk import videos
 *     description: Import multiple videos at once (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [videos]
 *             properties:
 *               videos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [youtube_video_id, title, category, age_group, duration]
 *                   properties:
 *                     youtube_video_id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     thumbnail_emoji:
 *                       type: string
 *                     category:
 *                       type: string
 *                     age_group:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     language:
 *                       type: string
 *     responses:
 *       200:
 *         description: Videos imported
 *       403:
 *         description: Admin access required
 */
router.post('/bulk-import-videos', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const importData = bulkVideoImportSchema.parse(req.body);

        const { data: insertedVideos, error } = await supabase
            .from('videos')
            .insert(importData.videos.map(video => ({
                ...video,
                created_at: new Date().toISOString(),
            })))
            .select();

        if (error) {
            console.error('Error importing videos:', error);
            return errorResponse(res, 'Failed to import videos', 500, error);
        }

        return successResponse(res, 'Videos imported successfully', { count: insertedVideos?.length || 0, videos: insertedVideos });
    } catch (error: unknown) {
        console.error('Bulk import error:', error);
        const message = error instanceof Error ? error.message : 'Import failed';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/admin/data-export:
 *   post:
 *     summary: Export data from a table
 *     description: Export data from specified table (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [table]
 *             properties:
 *               table:
 *                 type: string
 *                 description: Table name to export
 *               filters:
 *                 type: object
 *                 description: Optional filters
 *     responses:
 *       200:
 *         description: Data exported
 *       403:
 *         description: Admin access required
 */
router.post('/data-export', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { table, filters } = req.body;

        if (!table) return errorResponse(res, 'Table name is required', 400);

        let query = supabase.from(table).select('*');

        if (filters && typeof filters === 'object') {
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value as string);
            });
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error exporting data:', error);
            return errorResponse(res, 'Failed to export data', 500, error);
        }

        return successResponse(res, 'Data exported successfully', { table, count: data?.length || 0, data });
    } catch (error: unknown) {
        console.error('Data export error:', error);
        const message = error instanceof Error ? error.message : 'Export failed';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get system statistics
 *     description: Get overall platform statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 *       403:
 *         description: Admin access required
 */
router.get('/stats', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const [usersResult, videosResult, ordersResult, productsResult] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('videos').select('id', { count: 'exact', head: true }),
            supabase.from('orders').select('id', { count: 'exact', head: true }),
            supabase.from('products').select('id', { count: 'exact', head: true }),
        ]);

        const { data: recentOrders } = await supabase
            .from('orders')
            .select('total_amount, payment_status, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        const { data: completedOrders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('payment_status', 'completed');

        const totalRevenue = completedOrders?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;

        return successResponse(res, 'System statistics retrieved', {
            totalUsers: usersResult.count || 0,
            totalVideos: videosResult.count || 0,
            totalOrders: ordersResult.count || 0,
            totalProducts: productsResult.count || 0,
            totalRevenue,
            recentOrders,
        });
    } catch (error: unknown) {
        console.error('Stats error:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch stats';
        return errorResponse(res, message, 500);
    }
});

export default router;
