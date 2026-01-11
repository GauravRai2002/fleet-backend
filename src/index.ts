import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Import routes
import authRouter from './routes/auth';
import vehiclesRouter from './routes/vehicles';
import driversRouter from './routes/drivers';
import billingPartiesRouter from './routes/billingParties';
import transportersRouter from './routes/transporters';
import expenseCategoriesRouter from './routes/expenseCategories';
import paymentModesRouter from './routes/paymentModes';
import stockItemsRouter from './routes/stockItems';
import tripsRouter from './routes/trips';
import tripBooksRouter from './routes/tripBooks';
import driverAdvancesRouter from './routes/driverAdvances';
import expensesRouter from './routes/expenses';
import returnTripsRouter from './routes/returnTrips';
import partyPaymentsRouter from './routes/partyPayments';
import marketVehPaymentsRouter from './routes/marketVehPayments';
import stockEntriesRouter from './routes/stockEntries';
import dashboardRouter from './routes/dashboard';
import reportsRouter from './routes/reports';
import importRouter from './routes/import';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
app.use(cors({
    origin: corsOrigins,
    credentials: true,
}));

// Middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for bulk imports

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);  // Auth routes (public + protected)

// Apply authentication to all other API routes
app.use('/api', authMiddleware);

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/billing-parties', billingPartiesRouter);
app.use('/api/transporters', transportersRouter);
app.use('/api/expense-categories', expenseCategoriesRouter);
app.use('/api/payment-modes', paymentModesRouter);
app.use('/api/stock-items', stockItemsRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/trip-books', tripBooksRouter);
app.use('/api/driver-advances', driverAdvancesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/return-trips', returnTripsRouter);
app.use('/api/party-payments', partyPaymentsRouter);
app.use('/api/market-veh-payments', marketVehPaymentsRouter);
app.use('/api/stock-entries', stockEntriesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/import', importRouter);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 API docs: http://localhost:${PORT}/health`);
    console.log(`🔗 CORS origins: ${corsOrigins.join(', ')}`);
});

export default app;
