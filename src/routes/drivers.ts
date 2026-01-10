import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Helper: Calculate driver closing balance
const calculateCloseBal = (openBal: number | any, debit: number | any, credit: number | any): number => {
    return Number(openBal) + Number(debit) - Number(credit);
};

// GET all drivers
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const drivers = await prisma.driver.findMany({
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: drivers });
}));

// GET single driver
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const driver = await prisma.driver.findUnique({
        where: { id: req.params.id },
    });
    if (!driver) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Driver not found');
    }
    res.json({ success: true, data: driver });
}));

// POST create driver
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, contactNo, drCr, openBal, remark } = req.body;

    if (!name) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Driver name is required', 'name');
    }

    const closeBal = calculateCloseBal(openBal || 0, 0, 0);

    const driver = await prisma.driver.create({
        data: {
            organizationId: req.auth!.orgId!,
            name,
            contactNo: contactNo || '',
            drCr: drCr || '',
            openBal: openBal || 0,
            remark: remark || '',
            closeBal,
        },
    });
    res.status(201).json({ success: true, data: driver });
}));

// PUT update driver
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { name, contactNo, drCr, openBal, remark, debit, credit } = req.body;

    const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Driver not found');
    }

    const newOpenBal = openBal !== undefined ? openBal : existing.openBal;
    const newDebit = debit !== undefined ? debit : existing.debit;
    const newCredit = credit !== undefined ? credit : existing.credit;
    const closeBal = calculateCloseBal(newOpenBal, newDebit, newCredit);

    const driver = await prisma.driver.update({
        where: { id: req.params.id },
        data: {
            ...(name !== undefined && { name }),
            ...(contactNo !== undefined && { contactNo }),
            ...(drCr !== undefined && { drCr }),
            ...(openBal !== undefined && { openBal }),
            ...(remark !== undefined && { remark }),
            ...(debit !== undefined && { debit }),
            ...(credit !== undefined && { credit }),
            closeBal,
        },
    });
    res.json({ success: true, data: driver });
}));

// DELETE driver
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await prisma.driver.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
