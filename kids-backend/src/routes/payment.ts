import { Router, Request, Response } from 'express';
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

async function verifyVNPaySignature(data: Record<string, string>): Promise<boolean> {
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    if (!hashSecret) {
        console.error('VNPAY_HASH_SECRET not configured');
        return false;
    }

    const receivedSignature = data.vnp_SecureHash;
    const dataToVerify = { ...data };
    delete dataToVerify.vnp_SecureHash;

    const sortedKeys = Object.keys(dataToVerify).sort();
    const signData = sortedKeys.map(key => `${key}=${dataToVerify[key]}`).join('&');

    const hmac = crypto.createHmac('sha512', hashSecret);
    hmac.update(signData);
    const signatureHex = hmac.digest('hex');

    return signatureHex.toLowerCase() === receivedSignature.toLowerCase();
}

export default router;
