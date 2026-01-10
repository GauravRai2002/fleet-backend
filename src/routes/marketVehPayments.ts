import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all market vehicle payments
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { tripNo, transporterId } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (tripNo) where.tripNo = Number(tripNo);
    if (transporterId) where.transporterId = transporterId as string;

    const payments = await prisma.marketVehPayment.findMany({
        where,
        include: {
            transporter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
}));

// GET single market vehicle payment
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const payment = await prisma.marketVehPayment.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
        include: {
            transporter: { select: { id: true, name: true } },
        },
    });
    if (!payment) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Market vehicle payment not found');
    }
    res.json({ success: true, data: payment });
}));

// POST create market vehicle payment
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const {
        tripNo, date, transporterId, transporterName, marketVehNo,
        mode, paidAmt, lrNo, fromBank, remark
    } = req.body;

    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');

    const payment = await prisma.marketVehPayment.create({
        data: {
            organizationId: req.auth!.orgId!,
            tripNo: tripNo || 0,
            date: new Date(date),
            transporterId: transporterId || null,
            transporterName: transporterName || '',
            marketVehNo: marketVehNo || '',
            mode: mode || '',
            paidAmt: paidAmt || 0,
            lrNo: lrNo || '',
            fromBank: fromBank || '',
            remark: remark || '',
        },
    });

    // Update transporter paid amount
    if (transporterId) {
        const transporter = await prisma.transporter.findFirst({ where: { id: transporterId, organizationId: req.auth!.orgId! } });
        if (transporter) {
            const newPaidAmt = Number(transporter.paidAmt) + (paidAmt || 0);
            const closeBal = Number(transporter.openBal) + Number(transporter.billAmt) - newPaidAmt;

            await prisma.transporter.update({
                where: { id: transporterId },
                data: { paidAmt: newPaidAmt, closeBal },
            });
        }
    }

    res.status(201).json({ success: true, data: payment });
}));

// PUT update market vehicle payment
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const {
        tripNo, date, transporterId, transporterName, marketVehNo,
        mode, paidAmt, lrNo, fromBank, remark, runBal
    } = req.body;

    const existing = await prisma.marketVehPayment.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Market vehicle payment not found');
    }

    const payment = await prisma.marketVehPayment.update({
        where: { id: req.params.id },
        data: {
            ...(tripNo !== undefined && { tripNo }),
            ...(date !== undefined && { date: new Date(date) }),
            ...(transporterId !== undefined && { transporterId }),
            ...(transporterName !== undefined && { transporterName }),
            ...(marketVehNo !== undefined && { marketVehNo }),
            ...(mode !== undefined && { mode }),
            ...(paidAmt !== undefined && { paidAmt }),
            ...(lrNo !== undefined && { lrNo }),
            ...(fromBank !== undefined && { fromBank }),
            ...(remark !== undefined && { remark }),
            ...(runBal !== undefined && { runBal }),
        },
    });
    res.json({ success: true, data: payment });
}));

// DELETE market vehicle payment
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.marketVehPayment.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Market vehicle payment not found');
    }

    await prisma.marketVehPayment.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
