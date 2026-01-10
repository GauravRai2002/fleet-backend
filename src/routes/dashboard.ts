import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET dashboard statistics
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
    // Get counts
    const [vehicleCount, driverCount, partyCount, transporterCount, tripCount] = await Promise.all([
        prisma.vehicle.count(),
        prisma.driver.count(),
        prisma.billingParty.count(),
        prisma.transporter.count(),
        prisma.trip.count(),
    ]);

    // Get financial summary from trips
    const tripStats = await prisma.trip.aggregate({
        _sum: {
            totalTripFare: true,
            tripExpense: true,
            profitStatement: true,
        },
    });

    // Get recent trips
    const recentTrips = await prisma.trip.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            tripNo: true,
            date: true,
            vehNo: true,
            fromLocation: true,
            toLocation: true,
            totalTripFare: true,
            profitStatement: true,
        },
    });

    res.json({
        success: true,
        data: {
            vehicleCount,
            driverCount,
            partyCount,
            transporterCount,
            tripCount,
            totalRevenue: Number(tripStats._sum.totalTripFare || 0),
            totalExpense: Number(tripStats._sum.tripExpense || 0),
            totalProfit: Number(tripStats._sum.profitStatement || 0),
            recentTrips,
        },
    });
}));

export default router;
