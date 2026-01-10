import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Helper: Calculate transporter closing balance
const calculateCloseBal = (openBal: number | any, billAmt: number | any, paidAmt: number | any): number => {
    return Number(openBal) + Number(billAmt) - Number(paidAmt);
};

// GET all transporters
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const transporters = await prisma.transporter.findMany({
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: transporters });
}));

// GET single transporter
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const transporter = await prisma.transporter.findUnique({
        where: { id: req.params.id },
    });
    if (!transporter) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Transporter not found');
    }
    res.json({ success: true, data: transporter });
}));

// POST create transporter
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { vehNo, name, drCr, openBal, remark } = req.body;

    if (!name) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Transporter name is required', 'name');
    }
    if (!vehNo) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Vehicle number is required', 'vehNo');
    }

    const closeBal = calculateCloseBal(openBal || 0, 0, 0);

    const transporter = await prisma.transporter.create({
        data: {
            organizationId: req.auth!.orgId!,
            vehNo,
            name,
            drCr: drCr || '',
            openBal: openBal || 0,
            remark: remark || '',
            closeBal,
        },
    });
    res.status(201).json({ success: true, data: transporter });
}));

// PUT update transporter
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { vehNo, name, drCr, openBal, remark, totalTrip, profit, billAmt, paidAmt } = req.body;

    const existing = await prisma.transporter.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Transporter not found');
    }

    const newOpenBal = openBal !== undefined ? openBal : existing.openBal;
    const newBillAmt = billAmt !== undefined ? billAmt : existing.billAmt;
    const newPaidAmt = paidAmt !== undefined ? paidAmt : existing.paidAmt;
    const closeBal = calculateCloseBal(newOpenBal, newBillAmt, newPaidAmt);

    const transporter = await prisma.transporter.update({
        where: { id: req.params.id },
        data: {
            ...(vehNo !== undefined && { vehNo }),
            ...(name !== undefined && { name }),
            ...(drCr !== undefined && { drCr }),
            ...(openBal !== undefined && { openBal }),
            ...(remark !== undefined && { remark }),
            ...(totalTrip !== undefined && { totalTrip }),
            ...(profit !== undefined && { profit }),
            ...(billAmt !== undefined && { billAmt }),
            ...(paidAmt !== undefined && { paidAmt }),
            closeBal,
        },
    });
    res.json({ success: true, data: transporter });
}));

// DELETE transporter
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await prisma.transporter.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
