import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Helper: Calculate billing party balance
const calculateBalance = (openBal: number | any, billAmtTrip: number | any, billAmtRt: number | any, receiveAmt: number | any): number => {
    return Number(openBal) + Number(billAmtTrip) + Number(billAmtRt) - Number(receiveAmt);
};

// GET all billing parties
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const parties = await prisma.billingParty.findMany({
        where: { organizationId: req.auth!.orgId! },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: parties });
}));

// GET single billing party
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const party = await prisma.billingParty.findFirst({
        where: {
            id: req.params.id,
            organizationId: req.auth!.orgId!
        },
    });
    if (!party) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Billing party not found');
    }
    res.json({ success: true, data: party });
}));

// POST create billing party
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, contactNo, drCr, openBal, remark } = req.body;

    if (!name) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Billing party name is required', 'name');
    }

    const balanceAmt = calculateBalance(openBal || 0, 0, 0, 0);

    const party = await prisma.billingParty.create({
        data: {
            organizationId: req.auth!.orgId!,
            name,
            contactNo: contactNo || '',
            drCr: drCr || '',
            openBal: openBal || 0,
            remark: remark || '',
            balanceAmt,
        },
    });
    res.status(201).json({ success: true, data: party });
}));

// PUT update billing party
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { name, contactNo, drCr, openBal, remark, billAmtTrip, billAmtRt, receiveAmt } = req.body;

    const existing = await prisma.billingParty.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! }
    });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Billing party not found');
    }

    const newOpenBal = openBal !== undefined ? openBal : existing.openBal;
    const newBillTrip = billAmtTrip !== undefined ? billAmtTrip : existing.billAmtTrip;
    const newBillRt = billAmtRt !== undefined ? billAmtRt : existing.billAmtRt;
    const newReceive = receiveAmt !== undefined ? receiveAmt : existing.receiveAmt;
    const balanceAmt = calculateBalance(newOpenBal, newBillTrip, newBillRt, newReceive);

    const party = await prisma.billingParty.update({
        where: { id: req.params.id },
        data: {
            ...(name !== undefined && { name }),
            ...(contactNo !== undefined && { contactNo }),
            ...(drCr !== undefined && { drCr }),
            ...(openBal !== undefined && { openBal }),
            ...(remark !== undefined && { remark }),
            ...(billAmtTrip !== undefined && { billAmtTrip }),
            ...(billAmtRt !== undefined && { billAmtRt }),
            ...(receiveAmt !== undefined && { receiveAmt }),
            balanceAmt,
        },
    });
    res.json({ success: true, data: party });
}));

// DELETE billing party
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.billingParty.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! }
    });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Billing party not found');
    }

    await prisma.billingParty.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
