import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all expense categories
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.expenseCategory.findMany({
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: categories });
}));

// GET single expense category
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const category = await prisma.expenseCategory.findUnique({
        where: { id: req.params.id },
    });
    if (!category) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Expense category not found');
    }
    res.json({ success: true, data: category });
}));

// POST create expense category
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, mode } = req.body;

    if (!name) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Category name is required', 'name');
    }
    if (!mode || !['General', 'Expenses', 'Fuel'].includes(mode)) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Mode must be General, Expenses, or Fuel', 'mode');
    }

    const category = await prisma.expenseCategory.create({
        data: { organizationId: req.auth!.orgId!, name, mode },
    });
    res.status(201).json({ success: true, data: category });
}));

// PUT update expense category
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { name, mode } = req.body;

    if (mode && !['General', 'Expenses', 'Fuel'].includes(mode)) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Mode must be General, Expenses, or Fuel', 'mode');
    }

    const category = await prisma.expenseCategory.update({
        where: { id: req.params.id },
        data: {
            ...(name !== undefined && { name }),
            ...(mode !== undefined && { mode }),
        },
    });
    res.json({ success: true, data: category });
}));

// DELETE expense category
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    await prisma.expenseCategory.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
