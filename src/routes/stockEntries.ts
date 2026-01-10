import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all stock entries
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { stockItemId, entryType } = req.query;

    const where: any = {};
    if (stockItemId) where.stockItemId = stockItemId as string;
    if (entryType) where.entryType = entryType as string;

    const entries = await prisma.stockEntry.findMany({
        where,
        include: {
            stockItem: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: entries });
}));

// GET single stock entry
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const entry = await prisma.stockEntry.findUnique({
        where: { id: req.params.id },
        include: {
            stockItem: { select: { id: true, name: true } },
        },
    });
    if (!entry) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Stock entry not found');
    }
    res.json({ success: true, data: entry });
}));

// POST create stock entry
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { date, stockItemId, stockItemName, entryType, quantity, remark } = req.body;

    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');
    if (!entryType || !['IN', 'OUT'].includes(entryType)) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Entry type must be IN or OUT', 'entryType');
    }
    if (quantity === undefined) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Quantity is required', 'quantity');

    const entry = await prisma.stockEntry.create({
        data: {
            organizationId: req.auth!.orgId!,
            date: new Date(date),
            stockItemId: stockItemId || null,
            stockItemName: stockItemName || '',
            entryType,
            quantity,
            remark: remark || '',
        },
    });

    // Update stock item quantity
    if (stockItemId) {
        const stockItem = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
        if (stockItem) {
            let newStkIn = Number(stockItem.stkIn);
            let newStkOut = Number(stockItem.stkOut);

            if (entryType === 'IN') {
                newStkIn += quantity;
            } else {
                newStkOut += quantity;
            }

            const closeQty = Number(stockItem.openQty) + newStkIn - newStkOut;

            await prisma.stockItem.update({
                where: { id: stockItemId },
                data: { stkIn: newStkIn, stkOut: newStkOut, closeQty },
            });
        }
    }

    res.status(201).json({ success: true, data: entry });
}));

// PUT update stock entry
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { date, stockItemId, stockItemName, entryType, quantity, remark } = req.body;

    if (entryType && !['IN', 'OUT'].includes(entryType)) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Entry type must be IN or OUT', 'entryType');
    }

    const entry = await prisma.stockEntry.update({
        where: { id: req.params.id },
        data: {
            ...(date !== undefined && { date: new Date(date) }),
            ...(stockItemId !== undefined && { stockItemId }),
            ...(stockItemName !== undefined && { stockItemName }),
            ...(entryType !== undefined && { entryType }),
            ...(quantity !== undefined && { quantity }),
            ...(remark !== undefined && { remark }),
        },
    });
    res.json({ success: true, data: entry });
}));

// DELETE stock entry
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await prisma.stockEntry.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
