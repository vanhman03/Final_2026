import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { achievementService } from '../utils/achievementService';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const profileUpdateSchema = z.object({
    display_name: z.string().min(1).max(100).optional(),
    avatar_url: z.string().url().optional(),
    screen_time_limit: z.number().min(0).max(1440).optional(),
});

const pinSchema = z.object({
    pin: z.string().min(4).max(6).regex(/^\d+$/, 'PIN must be 4-6 digits'),
});

/**
 * @swagger
 * /api/profiles/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*, videos_watched_count')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            return errorResponse(res, 'Failed to fetch profile', 500, error);
        }

        if (!profile) {
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{
                    user_id: userId,
                    display_name: req.user?.email?.split('@')[0] || 'User',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }])
                .select()
                .single();

            if (createError) {
                return errorResponse(res, 'Failed to create profile', 500, createError);
            }

            return successResponse(res, 'Profile created', newProfile);
        }

        return successResponse(res, 'Profile retrieved', profile);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch profile';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/profiles/me:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *               screen_time_limit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.put('/me', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const updates = profileUpdateSchema.parse(req.body);

        // When the parent sets a new screen_time_limit, start a fresh 24-hour
        // window from right now and clear the accumulated watch time.
        const extraFields: Record<string, unknown> = {};
        if (updates.screen_time_limit !== undefined) {
            extraFields.total_watch_time = 0;
            extraFields.screen_time_reset_at = new Date().toISOString();
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                ...extraFields,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            return errorResponse(res, 'Failed to update profile', 500, error);
        }

        return successResponse(res, 'Profile updated', profile);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update profile';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/profiles/me/pin:
 *   post:
 *     summary: Set parental control PIN
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 pattern: '^\d{4}$'
 *                 description: 4-digit PIN
 *     responses:
 *       200:
 *         description: PIN set successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/me/pin', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { pin } = pinSchema.parse(req.body);

        const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

        const { error } = await supabase
            .from('profiles')
            .update({
                pin_hash: pinHash,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (error) {
            return errorResponse(res, 'Failed to set PIN', 500, error);
        }

        return successResponse(res, 'PIN set successfully', { hasPin: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to set PIN';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/profiles/me/verify-pin:
 *   post:
 *     summary: Verify parental control PIN
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: PIN verified
 *       401:
 *         description: Invalid PIN
 */
router.post('/me/verify-pin', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { pin } = pinSchema.parse(req.body);

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('pin_hash')
            .eq('user_id', userId)
            .single();

        if (error || !profile) {
            return errorResponse(res, 'Profile not found', 404);
        }

        if (!profile.pin_hash) {
            return errorResponse(res, 'PIN not set', 400);
        }

        const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
        const isValid = pinHash === profile.pin_hash;

        if (!isValid) {
            return errorResponse(res, 'Invalid PIN', 401);
        }

        return successResponse(res, 'PIN verified', { valid: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to verify PIN';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/profiles/me/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 */
router.get('/me/stats', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('total_watch_time, points, badges, game_history, videos_watched_count')
            .eq('user_id', userId)
            .single();

        if (error) {
            return errorResponse(res, 'Failed to fetch stats', 500, error);
        }

        return successResponse(res, 'Stats retrieved', {
            totalWatchTime: profile?.total_watch_time || 0,
            videosWatchedCount: profile?.videos_watched_count || 0,
            points: profile?.points || 0,
            badges: profile?.badges || [],
            recentGames: profile?.game_history || [],
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch stats';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/profiles/me/add-points:
 *   post:
 *     summary: Add points to user profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Points added
 */
router.post('/me/add-points', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { points } = z.object({ points: z.number().min(1) }).parse(req.body);

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('points')
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            return errorResponse(res, 'Failed to fetch profile', 500, fetchError);
        }

        const newPoints = (profile?.points || 0) + points;

        const { data: updated, error } = await supabase
            .from('profiles')
            .update({
                points: newPoints,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select('points')
            .single();

        if (error) {
            return errorResponse(res, 'Failed to add points', 500, error);
        }

        return successResponse(res, 'Points added', { points: updated?.points });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to add points';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/profiles/me/screen-time-status:
 *   get:
 *     summary: Get current screen time status, applying daily reset if needed
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Screen time status
 */
router.get('/me/screen-time-status', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('total_watch_time, screen_time_limit, screen_time_reset_at')
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            return errorResponse(res, 'Failed to fetch profile', 500, fetchError);
        }

        const now = new Date();
        const resetAt: Date | null = profile?.screen_time_reset_at
            ? new Date(profile.screen_time_reset_at)
            : null;

        // A reset is due when the 24-hour window has elapsed, or when no
        // window has ever been started (resetAt is null).
        const windowExpired = !resetAt || now >= new Date(resetAt.getTime() + 24 * 60 * 60 * 1000);

        let totalWatchTime = profile?.total_watch_time || 0;
        let newResetAt: string = resetAt?.toISOString() ?? now.toISOString();

        if (windowExpired) {
            const freshResetAt = now.toISOString();
            const { data: updated, error: resetError } = await supabase
                .from('profiles')
                .update({
                    total_watch_time: 0,
                    screen_time_reset_at: freshResetAt,
                    updated_at: freshResetAt,
                })
                .eq('user_id', userId)
                .select('total_watch_time, screen_time_limit')
                .single();

            if (resetError) {
                return errorResponse(res, 'Failed to reset watch time', 500, resetError);
            }

            totalWatchTime = updated?.total_watch_time || 0;
            newResetAt = freshResetAt;
        }

        const screenTimeLimit = profile?.screen_time_limit || 60;
        const remainingMinutes = Math.max(0, screenTimeLimit - totalWatchTime);
        const nextResetAt = new Date(new Date(newResetAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

        return successResponse(res, 'Screen time status retrieved', {
            total_watch_time: totalWatchTime,
            screen_time_limit: screenTimeLimit,
            screen_time_reset_at: newResetAt,
            next_reset_at: nextResetAt,
            remaining_minutes: remainingMinutes,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get screen time status';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/profiles/me/increment-watch-time:
 *   post:
 *     summary: Increment total watch time by one minute (atomic, with daily reset)
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watch time incremented
 */
router.post('/me/increment-watch-time', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        // Fetch the current window anchor and limit
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('screen_time_reset_at, screen_time_limit')
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            return errorResponse(res, 'Failed to fetch profile', 500, fetchError);
        }

        const now = new Date();
        const resetAt: Date | null = profile?.screen_time_reset_at
            ? new Date(profile.screen_time_reset_at)
            : null;

        const windowExpired = !resetAt || now >= new Date(resetAt.getTime() + 24 * 60 * 60 * 1000);

        if (windowExpired) {
            // New window: reset counter to 1 (this minute counts) and anchor to now
            const freshResetAt = now.toISOString();
            const { data: updated, error } = await supabase
                .from('profiles')
                .update({
                    total_watch_time: 1,
                    screen_time_reset_at: freshResetAt,
                    updated_at: freshResetAt,
                })
                .eq('user_id', userId)
                .select('total_watch_time, screen_time_limit, screen_time_reset_at')
                .single();

            if (error) return errorResponse(res, 'Failed to reset and increment watch time', 500, error);

            return successResponse(res, 'Watch time incremented', {
                total_watch_time: updated?.total_watch_time ?? 1,
                screen_time_limit: updated?.screen_time_limit ?? profile?.screen_time_limit ?? 60,
                screen_time_reset_at: updated?.screen_time_reset_at ?? freshResetAt,
            });
        }

        // Same window: atomic increment via Postgres RPC
        const { data: rows, error: rpcError } = await supabase
            .rpc('increment_watch_time', { p_user_id: userId });

        if (rpcError) {
            return errorResponse(res, 'Failed to increment watch time', 500, rpcError);
        }

        const updated = Array.isArray(rows) ? rows[0] : rows;

        return successResponse(res, 'Watch time incremented', {
            total_watch_time: updated?.total_watch_time ?? 0,
            screen_time_limit: updated?.screen_time_limit ?? profile?.screen_time_limit ?? 60,
            screen_time_reset_at: updated?.screen_time_reset_at ?? resetAt?.toISOString(),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to increment watch time';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/profiles/me/increment-video-count:
 *   post:
 *     summary: Increment watched video count
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Count incremented
 */
router.post('/me/increment-video-count', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('videos_watched_count')
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            return errorResponse(res, 'Failed to fetch profile', 500, fetchError);
        }

        const newCount = (profile?.videos_watched_count || 0) + 1;

        const { data: updated, error } = await supabase
            .from('profiles')
            .update({
                videos_watched_count: newCount,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select('videos_watched_count')
            .single();

        if (error) {
            return errorResponse(res, 'Failed to increment count', 500, error);
        }

        // Check for Bookworm badge (and Rainbow Achiever) after incrementing
        const newBadges = await achievementService.checkAchievements(userId!, {});

        return successResponse(res, 'Count incremented', {
            videos_watched_count: updated?.videos_watched_count,
            newBadges: newBadges.map(b => ({ id: b.id, label: b.label, emoji: b.emoji })),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to increment count';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/profiles/me/reset-watch-time:
 *   post:
 *     summary: Manually reset the watch time counter and start a new 24-hour window
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watch time reset
 */
router.post('/me/reset-watch-time', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const freshResetAt = new Date().toISOString();

        const { data: updated, error } = await supabase
            .from('profiles')
            .update({
                total_watch_time: 0,
                screen_time_reset_at: freshResetAt,
                updated_at: freshResetAt,
            })
            .eq('user_id', userId)
            .select('total_watch_time, screen_time_limit, screen_time_reset_at')
            .single();

        if (error) {
            return errorResponse(res, 'Failed to reset watch time', 500, error);
        }

        const screenTimeLimit = updated?.screen_time_limit || 60;
        const nextResetAt = new Date(new Date(freshResetAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

        return successResponse(res, 'Watch time reset', {
            total_watch_time: updated?.total_watch_time ?? 0,
            screen_time_limit: screenTimeLimit,
            screen_time_reset_at: freshResetAt,
            next_reset_at: nextResetAt,
            remaining_minutes: screenTimeLimit,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to reset watch time';
        return errorResponse(res, message, 500);
    }
});

export default router;
