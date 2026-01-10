import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all driver advances
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, driverName } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (tripNo) where.tripNo = Number(tripNo);
    if (driverName) where.driverName = { contains: driverName as string, mode: 'insensitive' };

    const advances = await prisma.driverAdvance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: advances });
}));

// GET single driver advance
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const advance = await prisma.driverAdvance.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
    });
    if (!advance) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Driver advance not found');
    }
    res.json({ success: true, data: advance });
}));

// POST create driver advance
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, date, driverName, mode, fromAccount, debit, credit, fuelLtr, remark } = req.body;

    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');
    if (!driverName) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Driver name is required', 'driverName');

    const advance = await prisma.driverAdvance.create({
        data: {
            organizationId: req.auth!.orgId!,
            tripNo: tripNo || 0,
            date: new Date(date),
            driverName,
            mode: mode || '',
            fromAccount: fromAccount || '',
            debit: debit || 0,
            credit: credit || 0,
            fuelLtr: fuelLtr || 0,
            remark: remark || '',
        },
    });

    // Update driver balance
    const driver = await prisma.driver.findFirst({ where: { name: driverName, organizationId: req.auth!.orgId! } });
    if (driver) {
        const newDebit = Number(driver.debit) + (debit || 0);
        const newCredit = Number(driver.credit) + (credit || 0);
        const closeBal = Number(driver.openBal) + newDebit - newCredit;

        await prisma.driver.update({
            where: { id: driver.id },
            data: { debit: newDebit, credit: newCredit, closeBal },
        });
    }

    res.status(201).json({ success: true, data: advance });
}));

// PUT update driver advance
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, date, driverName, mode, fromAccount, debit, credit, fuelLtr, remark, runBal } = req.body;

    const existing = await prisma.driverAdvance.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Driver advance not found');
    }

    const advance = await prisma.driverAdvance.update({
        where: { id: req.params.id },
        data: {
            ...(tripNo !== undefined && { tripNo }),
            ...(date !== undefined && { date: new Date(date) }),
            ...(driverName !== undefined && { driverName }),
            ...(mode !== undefined && { mode }),
            ...(fromAccount !== undefined && { fromAccount }),
            ...(debit !== undefined && { debit }),
            ...(credit !== undefined && { credit }),
            ...(fuelLtr !== undefined && { fuelLtr }),
            ...(remark !== undefined && { remark }),
            ...(runBal !== undefined && { runBal }),
        },
    });
    res.json({ success: true, data: advance });
}));

// DELETE driver advance
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.driverAdvance.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Driver advance not found');
    }

    await prisma.driverAdvance.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
