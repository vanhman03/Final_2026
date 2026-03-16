import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAnon } from '../config/supabase';
import { errorResponse } from '../utils/response';

/**
 * Extend Express Request type to include user
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                role?: string;
            };
        }
    }
}

/**
 * Middleware to authenticate user via JWT token.
 * Uses the anon-key client for getUser() so that JWT claims are validated
 * correctly (the service-role client skips standard JWT validation).
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return errorResponse(res, 'Missing authorization header', 401);
        }

        const token = authHeader.replace('Bearer ', '');

        const { data, error } = await supabaseAnon.auth.getUser(token);

        if (error || !data.user) {
            return errorResponse(res, 'Invalid or expired token', 401);
        }

        req.user = {
            id: data.user.id,
            email: data.user.email,
        };
        next();
    } catch (error) {
        return errorResponse(res, 'Authentication failed', 401, error);
    }
}

/**
 * Middleware to check if user is admin
 * Uses user_roles table to check for admin role
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) {
            return errorResponse(res, 'Authentication required', 401);
        }

        // Check if user has admin role in user_roles table
        const { data: userRole, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', req.user.id)
            .single();

        if (error || !userRole || userRole.role !== 'admin') {
            return errorResponse(res, 'Admin access required', 403);
        }

        req.user.role = userRole.role;
        next();
    } catch (error) {
        return errorResponse(res, 'Authorization failed', 403, error);
    }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next();
        }

        const token = authHeader.replace('Bearer ', '');

        const { data, error } = await supabaseAnon.auth.getUser(token);

        if (!error && data.user) {
            req.user = {
                id: data.user.id,
                email: data.user.email,
            };
        }

        next();
    } catch {
        // Ignore errors and continue without user
        next();
    }
}

