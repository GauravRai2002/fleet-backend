import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Helper: Calculate trip book values
const calculateTripBookValues = (data: {
    tripAmount?: number;
    shortageAmt?: number;
    deductionAmt?: number;
    holdingAmt?: number;
    advanceAmt?: number;
    marketFreight?: number;
    marketAdvance?: number;
}) => {
    const receivedAmt = (data.tripAmount || 0) - (data.shortageAmt || 0) - (data.deductionAmt || 0) - (data.holdingAmt || 0);
    const pendingAmt = receivedAmt - (data.advanceAmt || 0);
    const marketBalance = (data.marketFreight || 0) - (data.marketAdvance || 0);
    const netProfit = receivedAmt - (data.marketFreight || 0);

    return { receivedAmt, pendingAmt, marketBalance, netProfit };
};

// GET all trip books
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (tripNo) where.tripNo = Number(tripNo);

    const tripBooks = await prisma.tripBook.findMany({
        where,
        include: {
            billingParty: { select: { id: true, name: true } },
            transporter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tripBooks });
}));

// GET single trip book
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const tripBook = await prisma.tripBook.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
        include: {
            billingParty: { select: { id: true, name: true } },
            transporter: { select: { id: true, name: true } },
        },
    });
    if (!tripBook) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Trip book not found');
    }
    res.json({ success: true, data: tripBook });
}));

// POST create trip book
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const {
        tripNo, date, lrNo, billingPartyId, billingPartyName, freightMode,
        tripAmount, advanceAmt, shortageAmt, deductionAmt, holdingAmt,
        transporterId, transporterName, marketVehNo, marketFreight, marketAdvance,
        lWeight, uWeight, remark
    } = req.body;

    if (!tripNo) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Trip number is required', 'tripNo');
    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');

    const calculated = calculateTripBookValues({
        tripAmount, shortageAmt, deductionAmt, holdingAmt, advanceAmt, marketFreight, marketAdvance
    });

    const tripBook = await prisma.tripBook.create({
        data: {
            organizationId: req.auth!.orgId!,
            tripNo,
            date: new Date(date),
            lrNo: lrNo || '',
            billingPartyId: billingPartyId || null,
            billingPartyName: billingPartyName || '',
            freightMode: freightMode || null,
            tripAmount: tripAmount || 0,
            advanceAmt: advanceAmt || 0,
            shortageAmt: shortageAmt || 0,
            deductionAmt: deductionAmt || 0,
            holdingAmt: holdingAmt || 0,
            receivedAmt: calculated.receivedAmt,
            pendingAmt: calculated.pendingAmt,
            transporterId: transporterId || null,
            transporterName: transporterName || '',
            marketVehNo: marketVehNo || '',
            marketFreight: marketFreight || 0,
            marketAdvance: marketAdvance || 0,
            marketBalance: calculated.marketBalance,
            lWeight: lWeight || 0,
            uWeight: uWeight || 0,
            remark: remark || '',
            netProfit: calculated.netProfit,
        },
    });

    // Update billing party bill amount
    if (billingPartyId) {
        await prisma.billingParty.update({
            where: { id: billingPartyId },
            data: {
                billAmtTrip: { increment: tripAmount || 0 },
            },
        });
    }

    res.status(201).json({ success: true, data: tripBook });
}));

// PUT update trip book
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.tripBook.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Trip book not found');
    }

    const {
        tripNo, date, lrNo, billingPartyId, billingPartyName, freightMode,
        tripAmount, advanceAmt, shortageAmt, deductionAmt, holdingAmt,
        transporterId, transporterName, marketVehNo, marketFreight, marketAdvance,
        lWeight, uWeight, remark
    } = req.body;

    const newTripAmount = tripAmount !== undefined ? tripAmount : Number(existing.tripAmount);
    const newShortageAmt = shortageAmt !== undefined ? shortageAmt : Number(existing.shortageAmt);
    const newDeductionAmt = deductionAmt !== undefined ? deductionAmt : Number(existing.deductionAmt);
    const newHoldingAmt = holdingAmt !== undefined ? holdingAmt : Number(existing.holdingAmt);
    const newAdvanceAmt = advanceAmt !== undefined ? advanceAmt : Number(existing.advanceAmt);
    const newMarketFreight = marketFreight !== undefined ? marketFreight : Number(existing.marketFreight);
    const newMarketAdvance = marketAdvance !== undefined ? marketAdvance : Number(existing.marketAdvance);

    const calculated = calculateTripBookValues({
        tripAmount: newTripAmount,
        shortageAmt: newShortageAmt,
        deductionAmt: newDeductionAmt,
        holdingAmt: newHoldingAmt,
        advanceAmt: newAdvanceAmt,
        marketFreight: newMarketFreight,
        marketAdvance: newMarketAdvance,
    });

    const tripBook = await prisma.tripBook.update({
        where: { id: req.params.id },
        data: {
            ...(tripNo !== undefined && { tripNo }),
            ...(date !== undefined && { date: new Date(date) }),
            ...(lrNo !== undefined && { lrNo }),
            ...(billingPartyId !== undefined && { billingPartyId }),
            ...(billingPartyName !== undefined && { billingPartyName }),
            ...(freightMode !== undefined && { freightMode }),
            ...(tripAmount !== undefined && { tripAmount }),
            ...(advanceAmt !== undefined && { advanceAmt }),
            ...(shortageAmt !== undefined && { shortageAmt }),
            ...(deductionAmt !== undefined && { deductionAmt }),
            ...(holdingAmt !== undefined && { holdingAmt }),
            ...(transporterId !== undefined && { transporterId }),
            ...(transporterName !== undefined && { transporterName }),
            ...(marketVehNo !== undefined && { marketVehNo }),
            ...(marketFreight !== undefined && { marketFreight }),
            ...(marketAdvance !== undefined && { marketAdvance }),
            ...(lWeight !== undefined && { lWeight }),
            ...(uWeight !== undefined && { uWeight }),
            ...(remark !== undefined && { remark }),
            receivedAmt: calculated.receivedAmt,
            pendingAmt: calculated.pendingAmt,
            marketBalance: calculated.marketBalance,
            netProfit: calculated.netProfit,
        },
    });
    res.json({ success: true, data: tripBook });
}));

// DELETE trip book
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.tripBook.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Trip book not found');
    }

    await prisma.tripBook.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
