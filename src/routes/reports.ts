import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET trip report with filters
router.get('/trips', asyncHandler(async (req: Request, res: Response) => {
    const { fromDate, toDate, vehicleNo, driverName } = req.query;

    const where: any = { organizationId: req.auth!.orgId! };
    if (fromDate || toDate) {
        where.date = {};
        if (fromDate) where.date.gte = new Date(fromDate as string);
        if (toDate) where.date.lte = new Date(toDate as string);
    }
    if (vehicleNo) where.vehNo = { contains: vehicleNo as string, mode: 'insensitive' };
    if (driverName) where.driverName = { contains: driverName as string, mode: 'insensitive' };

    const trips = await prisma.trip.findMany({
        where,
        orderBy: { tripNo: 'desc' },
    });

    // Calculate summary
    const summary = trips.reduce(
        (acc: any, trip: any) => ({
            totalTrips: acc.totalTrips + 1,
            totalFare: acc.totalFare + Number(trip.totalTripFare),
            totalExpense: acc.totalExpense + Number(trip.tripExpense),
            totalProfit: acc.totalProfit + Number(trip.profitStatement),
            totalKm: acc.totalKm + trip.tripKm,
        }),
        { totalTrips: 0, totalFare: 0, totalExpense: 0, totalProfit: 0, totalKm: 0 }
    );

    res.json({ success: true, data: { trips, summary } });
}));

// GET balance sheet
router.get('/balance-sheet', asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.auth!.orgId!;

    // Party summary
    const parties = await prisma.billingParty.findMany({
        where: { organizationId: orgId },
        select: {
            id: true,
            name: true,
            openBal: true,
            billAmtTrip: true,
            billAmtRt: true,
            receiveAmt: true,
            balanceAmt: true,
        },
    });

    const partySummary = {
        totalBillAmount: parties.reduce((sum: any, p: any) => sum + Number(p.billAmtTrip) + Number(p.billAmtRt), 0),
        totalReceived: parties.reduce((sum: any, p: any) => sum + Number(p.receiveAmt), 0),
        totalBalance: parties.reduce((sum: any, p: any) => sum + Number(p.balanceAmt), 0),
        parties,
    };

    // Driver summary
    const drivers = await prisma.driver.findMany({
        where: { organizationId: orgId },
        select: {
            id: true,
            name: true,
            openBal: true,
            debit: true,
            credit: true,
            closeBal: true,
        },
    });

    const driverSummary = {
        totalDebit: drivers.reduce((sum: any, d: any) => sum + Number(d.debit), 0),
        totalCredit: drivers.reduce((sum: any, d: any) => sum + Number(d.credit), 0),
        totalBalance: drivers.reduce((sum: any, d: any) => sum + Number(d.closeBal), 0),
        drivers,
    };

    // Transporter summary
    const transporters = await prisma.transporter.findMany({
        where: { organizationId: orgId },
        select: {
            id: true,
            name: true,
            vehNo: true,
            openBal: true,
            billAmt: true,
            paidAmt: true,
            closeBal: true,
        },
    });

    const transporterSummary = {
        totalBillAmount: transporters.reduce((sum: any, t: any) => sum + Number(t.billAmt), 0),
        totalPaid: transporters.reduce((sum: any, t: any) => sum + Number(t.paidAmt), 0),
        totalBalance: transporters.reduce((sum: any, t: any) => sum + Number(t.closeBal), 0),
        transporters,
    };

    res.json({
        success: true,
        data: {
            partySummary,
            driverSummary,
            transporterSummary,
        },
    });
}));

export default router;
