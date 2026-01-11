import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { asyncHandler, ApiError, ErrorCodes } from '../middleware/errorHandler';

const router = Router();

// Types for the bulk import request
interface ImportTrip {
    tripNo: string;  // Supports alphanumeric like "PB-2025/26-001"
    date: string;
    vehNo: string;
    fromLocation: string;
    toLocation: string;
    tripKm?: number;
    tripFare?: number;
    totalTripFare?: number;
    tripExpense?: number;
    profitStatement?: number;
    plantName?: string;
    carQty?: number;
    loadKm?: number;
    emptyKm?: number;
    isMarketTrip?: boolean;
    driverName?: string;
    fuelExpAmt?: number;
    average?: number;
    rtFare?: number;
    stMiter?: number;
    endMiter?: number;
    dieselRate?: number;
    ltr?: number;
    exIncome?: number;
    driverBal?: number;
    lockStatus?: boolean;
}

interface ImportExpense {
    tripNo: string;  // Links to trip
    date: string;
    expenseType: string;
    amount: number;
    fromAccount?: string;
    refVehNo?: string;
    remark1?: string;
    remark2?: string;
    isNonTripExp?: boolean;
}

interface ImportExpenseCategory {
    name: string;
    mode: 'Fuel' | 'Expenses' | 'General';
}

interface ImportError {
    type: 'trip' | 'expense' | 'category';
    index: number;
    tripNo?: string;
    message: string;
}

// POST /api/import/bulk - Bulk import trips with expenses using batch inserts
router.post('/bulk', asyncHandler(async (req: Request, res: Response) => {
    const { trips, expenses, expenseCategories } = req.body as {
        trips: ImportTrip[];
        expenses: ImportExpense[];
        expenseCategories?: ImportExpenseCategory[];
    };

    const organizationId = req.auth!.orgId!;

    // Validation
    if (!trips || !Array.isArray(trips) || trips.length === 0) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Trips array is required and must not be empty');
    }
    if (!expenses || !Array.isArray(expenses)) {
        throw new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Expenses array is required');
    }

    const errors: ImportError[] = [];
    let categoriesCreated = 0;

    // Step 1: Upsert expense categories BEFORE transaction (they're independent)
    if (expenseCategories && Array.isArray(expenseCategories)) {
        for (let i = 0; i < expenseCategories.length; i++) {
            const cat = expenseCategories[i];
            try {
                if (!cat.name || !cat.mode) {
                    errors.push({
                        type: 'category',
                        index: i,
                        message: `Category at index ${i}: name and mode are required`,
                    });
                    continue;
                }

                // Check if category already exists for this organization
                const existing = await prisma.expenseCategory.findFirst({
                    where: { organizationId, name: cat.name },
                });

                if (!existing) {
                    await prisma.expenseCategory.create({
                        data: {
                            organizationId,
                            name: cat.name,
                            mode: cat.mode,
                        },
                    });
                    categoriesCreated++;
                }
            } catch (error: any) {
                errors.push({
                    type: 'category',
                    index: i,
                    message: `Failed to create category "${cat.name}": ${error.message}`,
                });
            }
        }
    }

    // Step 2: Get existing trip numbers to filter duplicates
    const existingTrips = await prisma.trip.findMany({
        where: { organizationId },
        select: { tripNo: true },
    });
    const existingTripNos = new Set(existingTrips.map(t => t.tripNo));

    // Step 3: Validate and prepare trips for bulk insert
    const validTrips: any[] = [];
    let tripsFailed = 0;

    for (let i = 0; i < trips.length; i++) {
        const trip = trips[i];

        // Validate required fields
        if (!trip.tripNo) {
            errors.push({ type: 'trip', index: i, tripNo: trip.tripNo, message: 'tripNo is required' });
            tripsFailed++;
            continue;
        }
        if (!trip.date) {
            errors.push({ type: 'trip', index: i, tripNo: trip.tripNo, message: 'date is required' });
            tripsFailed++;
            continue;
        }
        if (!trip.vehNo) {
            errors.push({ type: 'trip', index: i, tripNo: trip.tripNo, message: 'vehNo is required' });
            tripsFailed++;
            continue;
        }
        if (!trip.fromLocation) {
            errors.push({ type: 'trip', index: i, tripNo: trip.tripNo, message: 'fromLocation is required' });
            tripsFailed++;
            continue;
        }
        if (!trip.toLocation) {
            errors.push({ type: 'trip', index: i, tripNo: trip.tripNo, message: 'toLocation is required' });
            tripsFailed++;
            continue;
        }

        // Check for duplicate tripNo
        if (existingTripNos.has(trip.tripNo)) {
            errors.push({
                type: 'trip',
                index: i,
                tripNo: trip.tripNo,
                message: `Trip with tripNo ${trip.tripNo} already exists`,
            });
            tripsFailed++;
            continue;
        }

        // Add to valid trips for bulk insert
        validTrips.push({
            organizationId,
            tripNo: trip.tripNo,
            date: new Date(trip.date),
            vehNo: trip.vehNo,
            fromLocation: trip.fromLocation,
            toLocation: trip.toLocation,
            driverName: trip.driverName || '',
            tripKm: trip.tripKm || 0,
            fuelExpAmt: trip.fuelExpAmt || 0,
            average: trip.average || 0,
            tripFare: trip.tripFare || 0,
            rtFare: trip.rtFare || 0,
            totalTripFare: trip.totalTripFare || 0,
            tripExpense: trip.tripExpense || 0,
            profitStatement: trip.profitStatement || 0,
            stMiter: trip.stMiter || 0,
            endMiter: trip.endMiter || 0,
            dieselRate: trip.dieselRate || 0,
            ltr: trip.ltr || 0,
            isMarketTrip: trip.isMarketTrip || false,
            exIncome: trip.exIncome || 0,
            driverBal: trip.driverBal || 0,
            lockStatus: trip.lockStatus || false,
            plantName: trip.plantName || '',
            carQty: trip.carQty || 0,
            loadKm: trip.loadKm || 0,
            emptyKm: trip.emptyKm || 0,
        });

        // Track this tripNo as existing to prevent duplicates within the same import
        existingTripNos.add(trip.tripNo);
    }

    // Step 4: Validate and prepare expenses for bulk insert
    const validExpenses: any[] = [];
    let expensesFailed = 0;

    for (let i = 0; i < expenses.length; i++) {
        const expense = expenses[i];

        if (!expense.tripNo) {
            errors.push({ type: 'expense', index: i, tripNo: expense.tripNo, message: 'tripNo is required' });
            expensesFailed++;
            continue;
        }
        if (!expense.date) {
            errors.push({ type: 'expense', index: i, tripNo: expense.tripNo, message: 'date is required' });
            expensesFailed++;
            continue;
        }
        if (!expense.expenseType) {
            errors.push({ type: 'expense', index: i, tripNo: expense.tripNo, message: 'expenseType is required' });
            expensesFailed++;
            continue;
        }
        if (expense.amount === undefined || expense.amount <= 0) {
            errors.push({ type: 'expense', index: i, tripNo: expense.tripNo, message: 'amount must be greater than 0' });
            expensesFailed++;
            continue;
        }

        validExpenses.push({
            organizationId,
            tripNo: expense.tripNo,
            date: new Date(expense.date),
            expenseType: expense.expenseType,
            amount: expense.amount,
            fromAccount: expense.fromAccount || '',
            refVehNo: expense.refVehNo || '',
            remark1: expense.remark1 || '',
            remark2: expense.remark2 || '',
            isNonTripExp: expense.isNonTripExp || false,
        });
    }

    // Step 5: Bulk insert trips and expenses in a single transaction
    let tripsCreated = 0;
    let expensesCreated = 0;

    if (validTrips.length > 0 || validExpenses.length > 0) {
        await prisma.$transaction(async (tx) => {
            // Bulk insert trips
            if (validTrips.length > 0) {
                const result = await tx.trip.createMany({
                    data: validTrips,
                    skipDuplicates: true,
                });
                tripsCreated = result.count;
            }

            // Bulk insert expenses
            if (validExpenses.length > 0) {
                const result = await tx.expense.createMany({
                    data: validExpenses,
                    skipDuplicates: true,
                });
                expensesCreated = result.count;
            }
        }, {
            timeout: 30000, // 30 seconds should be enough for bulk inserts
        });

        // Update vehicle stats after transaction (aggregate by vehNo)
        const vehicleStats = new Map<string, { tripCount: number; profitSum: number }>();
        for (const trip of validTrips) {
            const existing = vehicleStats.get(trip.vehNo) || { tripCount: 0, profitSum: 0 };
            vehicleStats.set(trip.vehNo, {
                tripCount: existing.tripCount + 1,
                profitSum: existing.profitSum + (trip.profitStatement || 0),
            });
        }

        // Batch update vehicles
        for (const [vehNo, stats] of vehicleStats) {
            await prisma.vehicle.updateMany({
                where: { organizationId, vehNo },
                data: {
                    totalTrip: { increment: stats.tripCount },
                    netProfit: { increment: stats.profitSum },
                },
            });
        }
    }

    res.json({
        success: true,
        data: {
            tripsCreated,
            tripsFailed,
            expensesCreated,
            expensesFailed,
            categoriesCreated,
            errors,
        },
    });
}));

export default router;
