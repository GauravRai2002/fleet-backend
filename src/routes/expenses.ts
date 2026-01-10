import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all expenses
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, expenseType } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (tripNo) where.tripNo = Number(tripNo);
    if (expenseType) where.expenseType = { contains: expenseType as string, mode: 'insensitive' };

    const expenses = await prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: expenses });
}));

// GET single expense
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const expense = await prisma.expense.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
    });
    if (!expense) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Expense not found');
    }
    res.json({ success: true, data: expense });
}));

// POST create expense
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, date, expenseType, amount, fromAccount, refVehNo, remark1, remark2, isNonTripExp } = req.body;

    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');
    if (!expenseType) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Expense type is required', 'expenseType');
    if (amount === undefined) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Amount is required', 'amount');

    const expense = await prisma.expense.create({
        data: {
            organizationId: req.auth!.orgId!,
            tripNo: tripNo || 0,
            date: new Date(date),
            expenseType,
            amount,
            fromAccount: fromAccount || '',
            refVehNo: refVehNo || '',
            remark1: remark1 || '',
            remark2: remark2 || '',
            isNonTripExp: isNonTripExp || false,
        },
    });
    res.status(201).json({ success: true, data: expense });
}));

// PUT update expense
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, date, expenseType, amount, fromAccount, refVehNo, remark1, remark2, isNonTripExp } = req.body;

    const existing = await prisma.expense.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Expense not found');
    }

    const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
            ...(tripNo !== undefined && { tripNo }),
            ...(date !== undefined && { date: new Date(date) }),
            ...(expenseType !== undefined && { expenseType }),
            ...(amount !== undefined && { amount }),
            ...(fromAccount !== undefined && { fromAccount }),
            ...(refVehNo !== undefined && { refVehNo }),
            ...(remark1 !== undefined && { remark1 }),
            ...(remark2 !== undefined && { remark2 }),
            ...(isNonTripExp !== undefined && { isNonTripExp }),
        },
    });
    res.json({ success: true, data: expense });
}));

// DELETE expense
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.expense.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Expense not found');
    }

    await prisma.expense.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
