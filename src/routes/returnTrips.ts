import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Helper: Calculate return trip values
const calculateReturnTripValues = (data: {
    rtFreight?: number;
    shortageAmt?: number;
    deductionAmt?: number;
    holdingAmt?: number;
    advanceAmt?: number;
}) => {
    const receivedAmt = (data.rtFreight || 0) - (data.shortageAmt || 0) - (data.deductionAmt || 0) - (data.holdingAmt || 0);
    const pendingAmt = receivedAmt - (data.advanceAmt || 0);
    return { receivedAmt, pendingAmt };
};

// GET all return trips
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (tripNo) where.tripNo = Number(tripNo);

    const returnTrips = await prisma.returnTrip.findMany({
        where,
        include: {
            billingParty: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: returnTrips });
}));

// GET single return trip
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const returnTrip = await prisma.returnTrip.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
        include: {
            billingParty: { select: { id: true, name: true } },
        },
    });
    if (!returnTrip) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Return trip not found');
    }
    res.json({ success: true, data: returnTrip });
}));

// POST create return trip
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const {
        tripNo, date, billingPartyId, billingPartyName, lrNo,
        rtFreight, advanceAmt, shortageAmt, deductionAmt, holdingAmt,
        mode, toBank, remark
    } = req.body;

    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');

    const calculated = calculateReturnTripValues({
        rtFreight, shortageAmt, deductionAmt, holdingAmt, advanceAmt
    });

    const returnTrip = await prisma.returnTrip.create({
        data: {
            organizationId: req.auth!.orgId!,
            tripNo: tripNo || 0,
            date: new Date(date),
            billingPartyId: billingPartyId || null,
            billingPartyName: billingPartyName || '',
            lrNo: lrNo || '',
            rtFreight: rtFreight || 0,
            advanceAmt: advanceAmt || 0,
            shortageAmt: shortageAmt || 0,
            deductionAmt: deductionAmt || 0,
            holdingAmt: holdingAmt || 0,
            receivedAmt: calculated.receivedAmt,
            pendingAmt: calculated.pendingAmt,
            mode: mode || '',
            toBank: toBank || '',
            remark: remark || '',
        },
    });

    // Update billing party RT bill amount
    if (billingPartyId) {
        await prisma.billingParty.update({
            where: { id: billingPartyId },
            data: {
                billAmtRt: { increment: rtFreight || 0 },
            },
        });
    }

    res.status(201).json({ success: true, data: returnTrip });
}));

// PUT update return trip
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.returnTrip.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Return trip not found');
    }

    const {
        tripNo, date, billingPartyId, billingPartyName, lrNo,
        rtFreight, advanceAmt, shortageAmt, deductionAmt, holdingAmt,
        mode, toBank, remark
    } = req.body;

    const newRtFreight = rtFreight !== undefined ? rtFreight : Number(existing.rtFreight);
    const newShortageAmt = shortageAmt !== undefined ? shortageAmt : Number(existing.shortageAmt);
    const newDeductionAmt = deductionAmt !== undefined ? deductionAmt : Number(existing.deductionAmt);
    const newHoldingAmt = holdingAmt !== undefined ? holdingAmt : Number(existing.holdingAmt);
    const newAdvanceAmt = advanceAmt !== undefined ? advanceAmt : Number(existing.advanceAmt);

    const calculated = calculateReturnTripValues({
        rtFreight: newRtFreight,
        shortageAmt: newShortageAmt,
        deductionAmt: newDeductionAmt,
        holdingAmt: newHoldingAmt,
        advanceAmt: newAdvanceAmt,
    });

    const returnTrip = await prisma.returnTrip.update({
        where: { id: req.params.id },
        data: {
            ...(tripNo !== undefined && { tripNo }),
            ...(date !== undefined && { date: new Date(date) }),
            ...(billingPartyId !== undefined && { billingPartyId }),
            ...(billingPartyName !== undefined && { billingPartyName }),
            ...(lrNo !== undefined && { lrNo }),
            ...(rtFreight !== undefined && { rtFreight }),
            ...(advanceAmt !== undefined && { advanceAmt }),
            ...(shortageAmt !== undefined && { shortageAmt }),
            ...(deductionAmt !== undefined && { deductionAmt }),
            ...(holdingAmt !== undefined && { holdingAmt }),
            ...(mode !== undefined && { mode }),
            ...(toBank !== undefined && { toBank }),
            ...(remark !== undefined && { remark }),
            receivedAmt: calculated.receivedAmt,
            pendingAmt: calculated.pendingAmt,
        },
    });
    res.json({ success: true, data: returnTrip });
}));

// DELETE return trip
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.returnTrip.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Return trip not found');
    }

    await prisma.returnTrip.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
