import { Response } from 'express';

/**
 * Send a success response
 */
export function successResponse(res: Response, message: string, data?: any, statusCode: number = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}

/**
 * Send an error response
 */
export function errorResponse(res: Response, message: string, statusCode: number = 400, error?: any) {
    return res.status(statusCode).json({
        success: false,
        error: message,
        details: error,
    });
}
