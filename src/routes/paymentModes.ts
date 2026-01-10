import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all payment modes
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const modes = await prisma.paymentMode.findMany({
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: modes });
}));

// GET single payment mode
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const mode = await prisma.paymentMode.findUnique({
        where: { id: req.params.id },
    });
    if (!mode) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Payment mode not found');
    }
    res.json({ success: true, data: mode });
}));

// POST create payment mode
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Payment mode name is required', 'name');
    }

    const mode = await prisma.paymentMode.create({
        data: { organizationId: req.auth!.orgId!, name },
    });
    res.status(201).json({ success: true, data: mode });
}));

// PUT update payment mode
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;

    const mode = await prisma.paymentMode.update({
        where: { id: req.params.id },
        data: {
            ...(name !== undefined && { name }),
        },
    });
    res.json({ success: true, data: mode });
}));

// DELETE payment mode
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await prisma.paymentMode.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
