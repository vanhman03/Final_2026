import { Router, Request, Response } from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Validation schemas
const productSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    price: z.number().min(0),
    image_url: z.string().url().optional(),
    category: z.string().optional(),
    age_group: z.string().optional(),
    in_stock: z.boolean().default(true),
});

const productQuerySchema = z.object({
    category: z.string().optional(),
    age_group: z.string().optional(),
    in_stock: z.coerce.boolean().optional(),
    min_price: z.coerce.number().optional(),
    max_price: z.coerce.number().optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve products with filtering and pagination
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: age_group
 *         schema:
 *           type: string
 *       - in: query
 *         name: in_stock
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: List of products
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const query = productQuerySchema.parse(req.query);
        const offset = (query.page - 1) * query.limit;

        let dbQuery = supabase
            .from('products')
            .select('*', { count: 'exact' });

        if (query.category) {
            dbQuery = dbQuery.eq('category', query.category);
        }
        if (query.age_group) {
            dbQuery = dbQuery.eq('age_group', query.age_group);
        }
        if (query.in_stock !== undefined) {
            dbQuery = dbQuery.eq('in_stock', query.in_stock);
        }
        if (query.min_price !== undefined) {
            dbQuery = dbQuery.gte('price', query.min_price);
        }
        if (query.max_price !== undefined) {
            dbQuery = dbQuery.lte('price', query.max_price);
        }
        if (query.search) {
            dbQuery = dbQuery.ilike('name', `%${query.search}%`);
        }

        dbQuery = dbQuery
            .range(offset, offset + query.limit - 1)
            .order('created_at', { ascending: false });

        const { data: products, error, count } = await dbQuery;

        if (error) {
            return errorResponse(res, 'Failed to fetch products', 500, error);
        }

        return successResponse(res, 'Products retrieved', {
            products,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / query.limit),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch products';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/products/categories/list:
 *   get:
 *     summary: Get all product categories
 *     tags: [Products]
 *     security: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories/list', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('category')
            .order('category');

        if (error) {
            return errorResponse(res, 'Failed to fetch categories', 500, error);
        }

        const categories = [...new Set(data?.map(p => p.category).filter(Boolean) || [])];
        return successResponse(res, 'Categories retrieved', { categories });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch categories';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
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
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !product) {
            return errorResponse(res, 'Product not found', 404);
        }

        return successResponse(res, 'Product retrieved', product);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch product';
        return errorResponse(res, message, 500);
    }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created
 *       403:
 *         description: Admin access required
 */
router.post('/', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const productData = productSchema.parse(req.body);

        const { data: product, error } = await supabase
            .from('products')
            .insert([{
                ...productData,
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) {
            return errorResponse(res, 'Failed to create product', 500, error);
        }

        return successResponse(res, 'Product created', product, 201);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create product';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (Admin only)
 *     tags: [Products]
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
 *         description: Product updated
 */
router.put('/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const productData = productSchema.partial().parse(req.body);

        const { data: product, error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return errorResponse(res, 'Failed to update product', 500, error);
        }

        return successResponse(res, 'Product updated', product);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update product';
        return errorResponse(res, message, 400);
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
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
 *         description: Product deleted
 */
router.delete('/:id', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            return errorResponse(res, 'Failed to delete product', 500, error);
        }

        return successResponse(res, 'Product deleted');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete product';
        return errorResponse(res, message, 500);
    }
});

export default router;
