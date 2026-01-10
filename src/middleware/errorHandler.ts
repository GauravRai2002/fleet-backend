import { Request, Response, NextFunction } from 'express';

// Standard API response format
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        field?: string;
    };
}

// Error codes
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// Custom API Error class
export class ApiError extends Error {
    statusCode: number;
    code: string;
    field?: string;

    constructor(statusCode: number, code: string, message: string, field?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.field = field;
    }
}

// Error handling middleware
export const errorHandler = (
    err: Error | ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error('Error:', err);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                field: err.field,
            },
        });
    }

    // Handle Prisma errors
    if ((err as any).code === 'P2002') {
        return res.status(409).json({
            success: false,
            error: {
                code: ErrorCodes.DUPLICATE_ENTRY,
                message: 'A record with this value already exists',
            },
        });
    }

    if ((err as any).code === 'P2025') {
        return res.status(404).json({
            success: false,
            error: {
                code: ErrorCodes.NOT_FOUND,
                message: 'Record not found',
            },
        });
    }

    return res.status(500).json({
        success: false,
        error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'Internal server error',
        },
    });
};

// Async handler wrapper
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
