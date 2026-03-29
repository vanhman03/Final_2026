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

        // Fetch paginated profiles
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

        // Enrich profiles with auth status (email_confirmed_at, banned_until)
        const enrichedProfiles = await Promise.all(
            (profiles || []).map(async (profile) => {
                let authData = { email_confirmed_at: null, banned_until: null, email: '' };
                if (profile.user_id) {
                    const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
                    if (user) {
                        authData.email_confirmed_at = (user as any).email_confirmed_at || null;
                        authData.banned_until = (user as any).banned_until || null;
                        authData.email = user.email || '';
                    }
                }
                return { ...profile, ...authData };
            })
        );

        return successResponse(res, 'Users retrieved', {
            users: enrichedProfiles,
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
router.put('/users/:id/status', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // this is the profiles.id
        const { status } = z.object({
            status: z.enum(['active', 'inactive']),
        }).parse(req.body);

        // Fetch the profile to get the auth user_id
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', id)
            .single();

        if (profileErr || !profile?.user_id) {
            return errorResponse(res, 'User profile not found', 404);
        }

        const userId = profile.user_id;
        
        // Update Supabase Auth user
        if (status === 'active') {
            // Confirm email and unban
            const { error } = await supabase.auth.admin.updateUserById(userId, {
                email_confirm: true,
                ban_duration: 'none'
            });
            if (error) return errorResponse(res, 'Failed to activate user', 500, error);
        } else {
            // Ban user for a long time (100 years = 876000h)
            const { error } = await supabase.auth.admin.updateUserById(userId, {
                ban_duration: '876000h'
            });
            if (error) return errorResponse(res, 'Failed to deactivate user', 500, error);
        }

        return successResponse(res, `User marked as ${status}`);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update user status';
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

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   delete:
 *     summary: Delete an order (Admin only)
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
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order not found
 */
router.delete('/orders/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // First delete associated order items (if not already handled by cascade)
        const { error: itemError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', id);

        if (itemError) return errorResponse(res, 'Failed to delete order items', 500, itemError);

        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);

        if (error) return errorResponse(res, 'Failed to delete order', 500, error);

        return successResponse(res, 'Order deleted successfully');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete order';
        return errorResponse(res, message, 500);
    }
});

// ─── BADGE MANAGEMENT ────────────────────────────────────────────────────────
// Note: Manual badge awarding has been removed. Badges are now earned through gameplay.


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
