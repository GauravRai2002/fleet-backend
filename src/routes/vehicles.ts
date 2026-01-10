import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// GET all vehicles
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const vehicles = await prisma.vehicle.findMany({
        where: { organizationId: req.auth!.orgId! },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: vehicles });
}));

// GET single vehicle by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const vehicle = await prisma.vehicle.findFirst({
        where: {
            id: req.params.id,
            organizationId: req.auth!.orgId!
        },
    });
    if (!vehicle) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Vehicle not found');
    }
    res.json({ success: true, data: vehicle });
}));

// POST create vehicle
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { vehNo, vehType } = req.body;

    if (!vehNo) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Vehicle number is required', 'vehNo');
    }

    const vehicle = await prisma.vehicle.create({
        data: {
            organizationId: req.auth!.orgId!,
            vehNo,
            vehType: vehType || '',
        },
    });
    res.status(201).json({ success: true, data: vehicle });
}));

// PUT update vehicle
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { vehNo, vehType, totalTrip, netProfit } = req.body;

    // Verify ownership
    const existing = await prisma.vehicle.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
    });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Vehicle not found');
    }

    const vehicle = await prisma.vehicle.update({
        where: { id: req.params.id },
        data: {
            ...(vehNo !== undefined && { vehNo }),
            ...(vehType !== undefined && { vehType }),
            ...(totalTrip !== undefined && { totalTrip }),
            ...(netProfit !== undefined && { netProfit }),
        },
    });
    res.json({ success: true, data: vehicle });
}));

// DELETE vehicle
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    // Verify ownership
    const existing = await prisma.vehicle.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.orgId! },
    });
    if (!existing) {
        throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Vehicle not found');
    }

    await prisma.vehicle.delete({
        where: { id: req.params.id },
    });
    res.status(204).send();
}));

export default router;
