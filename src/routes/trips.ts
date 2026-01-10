import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Helper: Calculate trip values
const calculateTripValues = (data: {
    stMiter?: number;
    endMiter?: number;
    ltr?: number;
    tripFare?: number;
    rtFare?: number;
    tripExpense?: number;
}) => {
    const tripKm = (data.endMiter || 0) - (data.stMiter || 0);
    const average = data.ltr && data.ltr > 0 ? tripKm / data.ltr : 0;
    const totalTripFare = (data.tripFare || 0) + (data.rtFare || 0);
    const profitStatement = totalTripFare - (data.tripExpense || 0);

    return { tripKm, average, totalTripFare, profitStatement };
};

// GET next trip number
router.get('/next-number', asyncHandler(async (req: Request, res: Response) => {
    const lastTrip = await prisma.trip.findFirst({
        where: { organizationId: req.auth!.orgId! },
        orderBy: { tripNo: 'desc' },
        select: { tripNo: true },
    });
    const nextTripNo = lastTrip ? lastTrip.tripNo + 1 : 1001;
    res.json({ success: true, data: { nextTripNo } });
}));

// GET all trips
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { fromDate, toDate, vehNo, driverName } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (fromDate || toDate) {
        where.date = {};
        if (fromDate) where.date.gte = new Date(fromDate as string);
        if (toDate) where.date.lte = new Date(toDate as string);
    }
    if (vehNo) where.vehNo = { contains: vehNo as string, mode: 'insensitive' };
    if (driverName) where.driverName = { contains: driverName as string, mode: 'insensitive' };

    const trips = await prisma.trip.findMany({
        where,
        orderBy: { tripNo: 'desc' },
    });
    res.json({ success: true, data: trips });
}));

// GET single trip
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
    });
    if (!trip) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Trip not found');
    }
    res.json({ success: true, data: trip });
}));

// POST create trip
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const {
        date, vehNo, driverName, fromLocation, toLocation,
        fuelExpAmt, tripFare, rtFare, tripExpense,
        stMiter, endMiter, dieselRate, ltr, isMarketTrip,
        exIncome, driverBal
    } = req.body;

    if (!date) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Date is required', 'date');
    if (!vehNo) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Vehicle number is required', 'vehNo');
    if (!fromLocation) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'From location is required', 'fromLocation');
    if (!toLocation) throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'To location is required', 'toLocation');

    // Get next trip number for this organization
    const lastTrip = await prisma.trip.findFirst({
        where: { organizationId: req.auth!.orgId! },
        orderBy: { tripNo: 'desc' },
        select: { tripNo: true },
    });
    const tripNo = lastTrip ? lastTrip.tripNo + 1 : 1001;

    // Calculate values
    const calculated = calculateTripValues({ stMiter, endMiter, ltr, tripFare, rtFare, tripExpense });

    const trip = await prisma.trip.create({
        data: {
            organizationId: req.auth!.orgId!,
            tripNo,
            date: new Date(date),
            vehNo,
            driverName: driverName || '',
            fromLocation,
            toLocation,
            tripKm: calculated.tripKm,
            fuelExpAmt: fuelExpAmt || 0,
            average: calculated.average,
            tripFare: tripFare || 0,
            rtFare: rtFare || 0,
            totalTripFare: calculated.totalTripFare,
            tripExpense: tripExpense || 0,
            profitStatement: calculated.profitStatement,
            stMiter: stMiter || 0,
            endMiter: endMiter || 0,
            dieselRate: dieselRate || 0,
            ltr: ltr || 0,
            isMarketTrip: isMarketTrip || false,
            exIncome: exIncome || 0,
            driverBal: driverBal || 0,
        },
    });

    // Update vehicle trip count
    await prisma.vehicle.updateMany({
        where: { vehNo },
        data: {
            totalTrip: { increment: 1 },
            netProfit: { increment: calculated.profitStatement },
        },
    });

    res.status(201).json({ success: true, data: trip });
}));

// PUT update trip
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.trip.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Trip not found');
    }

    const {
        date, vehNo, driverName, fromLocation, toLocation,
        fuelExpAmt, tripFare, rtFare, tripExpense,
        stMiter, endMiter, dieselRate, ltr, isMarketTrip,
        exIncome, driverBal, lockStatus
    } = req.body;

    // Recalculate values
    const newStMiter = stMiter !== undefined ? stMiter : existing.stMiter;
    const newEndMiter = endMiter !== undefined ? endMiter : existing.endMiter;
    const newLtr = ltr !== undefined ? ltr : Number(existing.ltr);
    const newTripFare = tripFare !== undefined ? tripFare : Number(existing.tripFare);
    const newRtFare = rtFare !== undefined ? rtFare : Number(existing.rtFare);
    const newTripExpense = tripExpense !== undefined ? tripExpense : Number(existing.tripExpense);

    const calculated = calculateTripValues({
        stMiter: newStMiter,
        endMiter: newEndMiter,
        ltr: newLtr,
        tripFare: newTripFare,
        rtFare: newRtFare,
        tripExpense: newTripExpense,
    });

    const trip = await prisma.trip.update({
        where: { id: req.params.id },
        data: {
            ...(date !== undefined && { date: new Date(date) }),
            ...(vehNo !== undefined && { vehNo }),
            ...(driverName !== undefined && { driverName }),
            ...(fromLocation !== undefined && { fromLocation }),
            ...(toLocation !== undefined && { toLocation }),
            ...(fuelExpAmt !== undefined && { fuelExpAmt }),
            ...(tripFare !== undefined && { tripFare }),
            ...(rtFare !== undefined && { rtFare }),
            ...(tripExpense !== undefined && { tripExpense }),
            ...(stMiter !== undefined && { stMiter }),
            ...(endMiter !== undefined && { endMiter }),
            ...(dieselRate !== undefined && { dieselRate }),
            ...(ltr !== undefined && { ltr }),
            ...(isMarketTrip !== undefined && { isMarketTrip }),
            ...(exIncome !== undefined && { exIncome }),
            ...(driverBal !== undefined && { driverBal }),
            ...(lockStatus !== undefined && { lockStatus }),
            tripKm: calculated.tripKm,
            average: calculated.average,
            totalTripFare: calculated.totalTripFare,
            profitStatement: calculated.profitStatement,
        },
    });
    res.json({ success: true, data: trip });
}));

// DELETE trip
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const trip = await prisma.trip.findFirst({ where: { id: req.params.id, organizationId: req.auth!.orgId! } });
    if (!trip) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Trip not found');
    }

    // Decrement vehicle stats
    await prisma.vehicle.updateMany({
        where: { vehNo: trip.vehNo, organizationId: req.auth!.orgId! },
        data: {
            totalTrip: { decrement: 1 },
            netProfit: { decrement: Number(trip.profitStatement) },
        },
    });

    await prisma.trip.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
