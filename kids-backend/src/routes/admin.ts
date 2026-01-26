import { Router, Request, Response } from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { bulkVideoImportSchema } from '../utils/validators';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

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
