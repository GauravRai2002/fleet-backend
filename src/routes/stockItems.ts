import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Helper: Calculate stock item closing quantity
const calculateCloseQty = (openQty: number | any, stkIn: number | any, stkOut: number | any): number => {
    return Number(openQty) + Number(stkIn) - Number(stkOut);
};

// GET all stock items
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const items = await prisma.stockItem.findMany({
        where: { organizationId: req.auth!.orgId! },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: items });
}));

// GET single stock item
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const item = await prisma.stockItem.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
    });
    if (!item) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Stock item not found');
    }
    res.json({ success: true, data: item });
}));

// POST create stock item
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, openQty } = req.body;

    if (!name) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Stock item name is required', 'name');
    }

    const closeQty = calculateCloseQty(openQty || 0, 0, 0);

    const item = await prisma.stockItem.create({
        data: {
            organizationId: req.auth!.orgId!,
            name,
            openQty: openQty || 0,
            closeQty,
        },
    });
    res.status(201).json({ success: true, data: item });
}));

// PUT update stock item
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { name, openQty, stkIn, stkOut } = req.body;

    const existing = await prisma.stockItem.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Stock item not found');
    }

    const newOpenQty = openQty !== undefined ? openQty : existing.openQty;
    const newStkIn = stkIn !== undefined ? stkIn : existing.stkIn;
    const newStkOut = stkOut !== undefined ? stkOut : existing.stkOut;
    const closeQty = calculateCloseQty(newOpenQty, newStkIn, newStkOut);

    const item = await prisma.stockItem.update({
        where: { id: req.params.id },
        data: {
            ...(name !== undefined && { name }),
            ...(openQty !== undefined && { openQty }),
            ...(stkIn !== undefined && { stkIn }),
            ...(stkOut !== undefined && { stkOut }),
            closeQty,
        },
    });
    res.json({ success: true, data: item });
}));

// DELETE stock item
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.stockItem.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Stock item not found');
    }

    await prisma.stockItem.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
