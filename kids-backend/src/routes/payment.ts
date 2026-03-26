import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { vnpayWebhookSchema } from '../utils/validators';
import { successResponse, errorResponse } from '../utils/response';
import crypto from 'crypto';

const router = Router();

/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: VNPay payment webhook
 *     description: Handle payment confirmations from VNPay gateway
 *     tags: [Payment]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vnp_TxnRef, vnp_ResponseCode, vnp_SecureHash]
 *             properties:
 *               vnp_TxnRef:
 *                 type: string
 *               vnp_Amount:
 *                 type: string
 *               vnp_BankCode:
 *                 type: string
 *               vnp_ResponseCode:
 *                 type: string
 *               vnp_TransactionNo:
 *                 type: string
 *               vnp_SecureHash:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed
 *       401:
 *         description: Invalid signature
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const webhookData = vnpayWebhookSchema.parse(req.body);

        const isValid = await verifyVNPaySignature(req.body);
        if (!isValid) {
            console.error('Invalid VNPay signature');
            return errorResponse(res, 'Invalid signature', 401);
        }

        const orderRef = webhookData.vnp_TxnRef;
        const responseCode = webhookData.vnp_ResponseCode;
        const transactionNo = webhookData.vnp_TransactionNo;
        const paymentStatus = responseCode === '00' ? 'completed' : 'failed';

        const { data: order, error } = await supabase
            .from('orders')
            .update({
                payment_status: paymentStatus,
                vnp_txn_ref: orderRef,
                updated_at: new Date().toISOString(),
            })
            .eq('vnp_txn_ref', orderRef)
            .select('*, user_id')
            .single();

        if (error) {
            console.error('Error updating order:', error);
            return errorResponse(res, 'Failed to update order', 500, error);
        }

        if (!order) return errorResponse(res, 'Order not found', 404);

        console.log(`Payment ${paymentStatus} for order ${orderRef}`, { transactionNo, amount: webhookData.vnp_Amount });

        return successResponse(res, `Payment ${paymentStatus}`, { orderId: order.id, status: paymentStatus, transactionNo });
    } catch (error: unknown) {
        console.error('Webhook error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/payment/vnpay/create:
 *   post:
 *     summary: Create a VNPay payment URL for an order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id]
 *             properties:
 *               order_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: VNPay payment URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 */
router.post('/vnpay/create', authenticateUser, async (req: Request, res: Response) => {
    try {
        const { order_id } = req.body as { order_id?: string };
        if (!order_id) return errorResponse(res, 'order_id is required', 400);

        const userId = req.user?.id;

        // Fetch the order to verify ownership and amount
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('id, total_amount, payment_status, user_id')
            .eq('id', order_id)
            .single();

        if (fetchError || !order) return errorResponse(res, 'Order not found', 404);
        if (order.user_id !== userId) return errorResponse(res, 'Forbidden', 403);
        if (order.payment_status !== 'pending') {
            return errorResponse(res, `Order is already ${order.payment_status}`, 400);
        }

        const vnpTmnCode = process.env.VNPAY_TMN_CODE;
        const vnpHashSecret = process.env.VNPAY_HASH_SECRET;
        const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = process.env.VNPAY_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`;

        if (!vnpTmnCode || !vnpHashSecret) {
            console.error('VNPay credentials not configured (VNPAY_TMN_CODE, VNPAY_HASH_SECRET)');
            return errorResponse(res, 'Payment gateway not configured', 503);
        }

        // VNPay requires amount in VND * 100 (no decimal)
        const amount = Math.round(order.total_amount * 100);
        const txnRef = order.id.replace(/-/g, '').slice(0, 20); // max 20 chars, no hyphens
        const createDate = new Date()
            .toISOString()
            .replace(/[-:T]/g, '')
            .slice(0, 14); // YYYYMMDDHHmmss

        // Store the txn ref on the order so the webhook can look it up
        await supabase
            .from('orders')
            .update({ vnp_txn_ref: txnRef, updated_at: new Date().toISOString() })
            .eq('id', order_id);

        const params: Record<string, string> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: vnpTmnCode,
            vnp_Amount: String(amount),
            vnp_CreateDate: createDate,
            vnp_CurrCode: 'VND',
            vnp_IpAddr: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
            vnp_Locale: 'vn',
            vnp_OrderInfo: `Thanh toan don hang ${txnRef}`,
            vnp_OrderType: 'other',
            vnp_ReturnUrl: returnUrl,
            vnp_TxnRef: txnRef,
        };

        const sortedKeys = Object.keys(params).sort();
        const signData = sortedKeys
            .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
            .join('&');
        
        const hmac = crypto.createHmac('sha512', vnpHashSecret);
        hmac.update(Buffer.from(signData, 'utf-8'));
        const secureHash = hmac.digest('hex');

        const urlParams = new URLSearchParams();
        for (const k of sortedKeys) {
            urlParams.append(k, params[k]);
        }
        urlParams.append('vnp_SecureHash', secureHash);
        
        const paymentUrl = `${vnpUrl}?${urlParams.toString()}`;

        return successResponse(res, 'Payment URL created', { paymentUrl });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/payment/vnpay/callback:
 *   get:
 *     summary: VNPay browser redirect callback
 *     tags: [Payment]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to frontend with payment result
 */
router.get('/vnpay/callback', async (req: Request, res: Response) => {
    try {
        const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const frontendUrl = rawFrontendUrl.split(',')[0].trim();
        const query = req.query as Record<string, string>;

        const isValid = await verifyVNPaySignature(query);
        if (!isValid) {
            return res.redirect(`${frontendUrl}/payment/result?status=error&message=invalid_signature`);
        }

        const txnRef = query.vnp_TxnRef;
        const responseCode = query.vnp_ResponseCode;
        // Status '00' is success in VNPay
        const paymentStatus = responseCode === '00' ? 'completed' : 'failed';

        const { data: order, error } = await supabase
            .from('orders')
            .update({
                payment_status: paymentStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('vnp_txn_ref', txnRef)
            .select('id')
            .single();

        if (error || !order) {
            console.error('Order not found during VNPay callback:', txnRef);
            return res.redirect(`${frontendUrl}/payment/result?status=error&message=order_not_found`);
        }

        return res.redirect(
            `${frontendUrl}/payment/result?status=${paymentStatus}&order_id=${order.id}`
        );
    } catch (error: unknown) {
        console.error('Callback error:', error);
        const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const frontendUrl = rawFrontendUrl.split(',')[0].trim();
        return res.redirect(`${frontendUrl}/payment/result?status=error`);
    }
});

async function verifyVNPaySignature(data: Record<string, string>): Promise<boolean> {
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    if (!hashSecret) {
        console.error('VNPAY_HASH_SECRET not configured');
        return false;
    }

    const receivedSignature = data.vnp_SecureHash;
    if (!receivedSignature) return false;

    const dataToVerify = { ...data };
    delete dataToVerify.vnp_SecureHash;
    delete dataToVerify.vnp_SecureHashType; // Also remove hash type if present

    const sortedKeys = Object.keys(dataToVerify)
        .filter(key => key.startsWith('vnp_') && dataToVerify[key] !== '') // Only hash vnp_ params that are not empty
        .sort();
    
    const signData = sortedKeys.map(key => `${key}=${encodeURIComponent(dataToVerify[key]).replace(/%20/g, '+')}`).join('&');

    const hmac = crypto.createHmac('sha512', hashSecret);
    hmac.update(Buffer.from(signData, 'utf-8'));
    const signatureHex = hmac.digest('hex');

    return signatureHex.toLowerCase() === receivedSignature.toLowerCase();
}

export default router;
