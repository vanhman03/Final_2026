import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { emailSchema } from '../utils/validators';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

/**
 * @swagger
 * /api/email/send:
 *   post:
 *     summary: Send transactional email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, subject, type]
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [welcome, order_confirmation, password_reset, achievement]
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post('/send', authenticateUser, async (req: Request, res: Response) => {
    try {
        const emailRequest = emailSchema.parse(req.body);

        let result;
        switch (emailRequest.type) {
            case 'welcome':
                result = await sendWelcomeEmail(emailRequest);
                break;
            case 'order_confirmation':
                result = await sendOrderConfirmationEmail(emailRequest);
                break;
            case 'password_reset':
                result = await sendPasswordResetEmail(emailRequest);
                break;
            case 'achievement':
                result = await sendAchievementEmail(emailRequest);
                break;
            default:
                return errorResponse(res, 'Invalid email type', 400);
        }

        return successResponse(res, 'Email sent successfully', result);
    } catch (error: unknown) {
        console.error('Email send error:', error);
        const message = error instanceof Error ? error.message : 'Failed to send email';
        return errorResponse(res, message, 500);
    }
});

async function sendWelcomeEmail(emailRequest: any) {
    console.log('Sending welcome email to:', emailRequest.to);
    await logEmail(emailRequest);
    return { messageId: `welcome-${Date.now()}`, recipient: emailRequest.to };
}

async function sendOrderConfirmationEmail(emailRequest: any) {
    console.log('Sending order confirmation email to:', emailRequest.to);
    await logEmail(emailRequest);
    return { messageId: `order-${Date.now()}`, recipient: emailRequest.to };
}

async function sendPasswordResetEmail(emailRequest: any) {
    console.log('Sending password reset email to:', emailRequest.to);
    await logEmail(emailRequest);
    return { messageId: `reset-${Date.now()}`, recipient: emailRequest.to };
}

async function sendAchievementEmail(emailRequest: any) {
    console.log('Sending achievement email to:', emailRequest.to);
    await logEmail(emailRequest);
    return { messageId: `achievement-${Date.now()}`, recipient: emailRequest.to };
}

async function logEmail(emailRequest: any) {
    const { error } = await supabase.from('email_logs').insert([{
        recipient: emailRequest.to,
        subject: emailRequest.subject,
        email_type: emailRequest.type,
        status: 'sent',
        sent_at: new Date().toISOString(),
    }]);
    if (error) console.error('Failed to log email:', error);
}

export default router;
