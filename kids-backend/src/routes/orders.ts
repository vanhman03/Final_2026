import { Router, Request, Response } from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Validation schemas
const orderItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().min(1).default(1),
});

const createOrderSchema = z.object({
    items: z.array(orderItemSchema).min(1),
});

const orderQuerySchema = z.object({
    status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return errorResponse(res, 'User ID not found', 401);
        }

        const query = orderQuerySchema.parse(req.query);
        const offset = (query.page - 1) * query.limit;

        let dbQuery = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    quantity,
                    price_at_purchase,
                    product:products (*)
                )
            `, { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (query.status) {
            dbQuery = dbQuery.eq('payment_status', query.status);
        }

        dbQuery = dbQuery.range(offset, offset + query.limit - 1);

        const { data: orders, error, count } = await dbQuery;

        if (error) {
            return errorResponse(res, 'Failed to fetch orders', 500, error);
        }

        return successResponse(res, 'Orders retrieved', {
            orders,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / query.limit),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch orders';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
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
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return errorResponse(res, 'User ID not found', 401);
        }

        const { id } = req.params;

        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    quantity,
                    price_at_purchase,
                    product:products (*)
                )
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !order) {
            return errorResponse(res, 'Order not found', 404);
        }

        return successResponse(res, 'Order retrieved', order);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch order';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return errorResponse(res, 'User ID not found', 401);
        }

        const { items } = createOrderSchema.parse(req.body);

        // Fetch products
        const productIds = items.map(item => item.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, price, in_stock, name')
            .in('id', productIds);

        if (productsError) {
            return errorResponse(res, 'Failed to fetch products', 500, productsError);
        }

        const productMap = new Map(products?.map(p => [p.id, p]) || []);
        for (const item of items) {
            const product = productMap.get(item.product_id);
            if (!product) {
                return errorResponse(res, `Product ${item.product_id} not found`, 404);
            }
            if (!product.in_stock) {
                return errorResponse(res, `Product "${product.name}" is out of stock`, 400);
            }
        }

        const totalAmount = items.reduce((sum, item) => {
            const product = productMap.get(item.product_id)!;
            return sum + (product.price * item.quantity);
        }, 0);

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: userId,
                total_amount: totalAmount,
                payment_status: 'pending',
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (orderError) {
            return errorResponse(res, 'Failed to create order', 500, orderError);
        }

        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_purchase: productMap.get(item.product_id)!.price,
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            await supabase.from('orders').delete().eq('id', order.id);
            return errorResponse(res, 'Failed to create order items', 500, itemsError);
        }

        const { data: completeOrder } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    quantity,
                    price_at_purchase,
                    product:products (*)
                )
            `)
            .eq('id', order.id)
            .single();

        return successResponse(res, 'Order created', completeOrder, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create order';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancel an order
 *     tags: [Orders]
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
 *         description: Order cancelled
 *       400:
 *         description: Order cannot be cancelled
 */
router.put('/:id/cancel', authenticateUser, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return errorResponse(res, 'User ID not found', 401);
        }

        const { id } = req.params;

        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('payment_status')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !order) {
            return errorResponse(res, 'Order not found', 404);
        }

        if (order.payment_status !== 'pending') {
            return errorResponse(res, 'Only pending orders can be cancelled', 400);
        }

        const { data: updated, error } = await supabase
            .from('orders')
            .update({ payment_status: 'cancelled' })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            return errorResponse(res, 'Failed to cancel order', 500, error);
        }

        return successResponse(res, 'Order cancelled', updated);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to cancel order';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/orders/admin/all:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 *       403:
 *         description: Admin access required
 */
router.get('/admin/all', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const query = orderQuerySchema.parse(req.query);
        const offset = (query.page - 1) * query.limit;

        let dbQuery = supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    quantity,
                    price_at_purchase,
                    product:products (*)
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (query.status) {
            dbQuery = dbQuery.eq('payment_status', query.status);
        }

        dbQuery = dbQuery.range(offset, offset + query.limit - 1);

        const { data: orders, error, count } = await dbQuery;

        if (error) {
            return errorResponse(res, 'Failed to fetch orders', 500, error);
        }

        return successResponse(res, 'All orders retrieved', {
            orders,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / query.limit),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch orders';
        return errorResponse(res, message, 500);
    }
});

export default router;
