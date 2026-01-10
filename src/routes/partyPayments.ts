import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all party payments
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, billingPartyId } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (tripNo) where.tripNo = Number(tripNo);
    if (billingPartyId) where.billingPartyId = billingPartyId as string;

    const payments = await prisma.partyPayment.findMany({
        where,
        include: {
            billingParty: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
}));

// GET single party payment
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const payment = await prisma.partyPayment.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
        include: {
            billingParty: { select: { id: true, name: true } },
        },
    });
    if (!payment) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Party payment not found');
    }
    res.json({ success: true, data: payment });
}));

// POST create party payment
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const {
        tripNo, date, billingPartyId, billingPartyName, mode,
        receiveAmt, shortageAmt, deductionAmt, lrNo, toBank, remark
    } = req.body;

    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');

    const payment = await prisma.partyPayment.create({
        data: {
            organizationId: req.auth!.orgId!,
            tripNo: tripNo || 0,
            date: new Date(date),
            billingPartyId: billingPartyId || null,
            billingPartyName: billingPartyName || '',
            mode: mode || '',
            receiveAmt: receiveAmt || 0,
            shortageAmt: shortageAmt || 0,
            deductionAmt: deductionAmt || 0,
            lrNo: lrNo || '',
            toBank: toBank || '',
            remark: remark || '',
        },
    });

    // Update billing party receive amount
    if (billingPartyId) {
        const party = await prisma.billingParty.findFirst({ where: { id: billingPartyId, organizationId: req.auth!.orgId! } });
        if (party) {
            const newReceiveAmt = Number(party.receiveAmt) + (receiveAmt || 0);
            const balanceAmt = Number(party.openBal) + Number(party.billAmtTrip) + Number(party.billAmtRt) - newReceiveAmt;

            await prisma.billingParty.update({
                where: { id: billingPartyId },
                data: { receiveAmt: newReceiveAmt, balanceAmt },
            });
        }
    }

    res.status(201).json({ success: true, data: payment });
}));

// PUT update party payment
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const {
        tripNo, date, billingPartyId, billingPartyName, mode,
        receiveAmt, shortageAmt, deductionAmt, lrNo, toBank, remark, runBal
    } = req.body;

    const existing = await prisma.partyPayment.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Party payment not found');
    }

    const payment = await prisma.partyPayment.update({
        where: { id: req.params.id },
        data: {
            ...(tripNo !== undefined && { tripNo }),
            ...(date !== undefined && { date: new Date(date) }),
            ...(billingPartyId !== undefined && { billingPartyId }),
            ...(billingPartyName !== undefined && { billingPartyName }),
            ...(mode !== undefined && { mode }),
            ...(receiveAmt !== undefined && { receiveAmt }),
            ...(shortageAmt !== undefined && { shortageAmt }),
            ...(deductionAmt !== undefined && { deductionAmt }),
            ...(lrNo !== undefined && { lrNo }),
            ...(toBank !== undefined && { toBank }),
            ...(remark !== undefined && { remark }),
            ...(runBal !== undefined && { runBal }),
        },
    });
    res.json({ success: true, data: payment });
}));

// DELETE party payment
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.partyPayment.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Party payment not found');
    }

    await prisma.partyPayment.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
