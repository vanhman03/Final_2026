import { z } from 'zod';

/**
 * Email notification schema
 */
export const emailSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1).max(200),
    type: z.enum(['welcome', 'order_confirmation', 'password_reset', 'achievement']),
    data: z.record(z.any()).optional(),
});

export type EmailRequest = z.infer<typeof emailSchema>;

/**
 * VNPay payment webhook schema
 */
export const vnpayWebhookSchema = z.object({
    vnp_TxnRef: z.string(),
    vnp_Amount: z.string().optional(),
    vnp_BankCode: z.string().optional(),
    vnp_CardType: z.string().optional(),
    vnp_ResponseCode: z.string(),
    vnp_TransactionNo: z.string().optional(),
    vnp_TransactionStatus: z.string().optional(),
    vnp_SecureHash: z.string(),
});

export type VNPayWebhook = z.infer<typeof vnpayWebhookSchema>;

/**
 * Analytics request schema
 */
export const analyticsRequestSchema = z.object({
    userId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    metricType: z.enum(['screen_time', 'points', 'games', 'videos']).optional(),
});

export type AnalyticsRequest = z.infer<typeof analyticsRequestSchema>;

/**
 * Bulk video import schema
 */
export const bulkVideoImportSchema = z.object({
    videos: z.array(
        z.object({
            youtube_video_id: z.string().min(1),
            title: z.string().min(1).max(200),
            thumbnail_emoji: z.string().max(10).optional(),
            category: z.string().min(1),
            age_group: z.string().min(1),
            duration: z.string().min(1),
            language: z.string().default('en'),
        })
    ).min(1).max(100),
});

export type BulkVideoImport = z.infer<typeof bulkVideoImportSchema>;
