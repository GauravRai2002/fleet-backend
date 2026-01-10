# Fleet Tracker Backend

REST API backend for the Fleet Tracker application built with **Node.js**, **Express**, **TypeScript**, and **Prisma** with **Neon PostgreSQL**.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server runs at http://localhost:5000
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed default data |
| `npm run db:studio` | Open Prisma Studio |

## Environment Variables

Create a `.env` file (see `.env.example`):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Master Data (7 entities × 5 endpoints = 35)
- `GET/POST` `/api/vehicles`, `GET/PUT/DELETE` `/api/vehicles/:id`
- `GET/POST` `/api/drivers`, `GET/PUT/DELETE` `/api/drivers/:id`
- `GET/POST` `/api/billing-parties`, `GET/PUT/DELETE` `/api/billing-parties/:id`
- `GET/POST` `/api/transporters`, `GET/PUT/DELETE` `/api/transporters/:id`
- `GET/POST` `/api/expense-categories`, `GET/PUT/DELETE` `/api/expense-categories/:id`
- `GET/POST` `/api/payment-modes`, `GET/PUT/DELETE` `/api/payment-modes/:id`
- `GET/POST` `/api/stock-items`, `GET/PUT/DELETE` `/api/stock-items/:id`

### Transactions (8 entities × 5 endpoints = 40)
- `GET/POST` `/api/trips`, `GET/PUT/DELETE` `/api/trips/:id`
- `GET /api/trips/next-number` - Get next trip number
- `GET/POST` `/api/trip-books`, `GET/PUT/DELETE` `/api/trip-books/:id`
- `GET/POST` `/api/driver-advances`, `GET/PUT/DELETE` `/api/driver-advances/:id`
- `GET/POST` `/api/expenses`, `GET/PUT/DELETE` `/api/expenses/:id`
- `GET/POST` `/api/return-trips`, `GET/PUT/DELETE` `/api/return-trips/:id`
- `GET/POST` `/api/party-payments`, `GET/PUT/DELETE` `/api/party-payments/:id`
- `GET/POST` `/api/market-veh-payments`, `GET/PUT/DELETE` `/api/market-veh-payments/:id`
- `GET/POST` `/api/stock-entries`, `GET/PUT/DELETE` `/api/stock-entries/:id`

### Special Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/reports/trips?fromDate=&toDate=&vehicleNo=&driverName=` - Trip report
- `GET /api/reports/balance-sheet` - Balance sheet

### Health Check
- `GET /health` - Server health status

## Auto-Calculations

The backend automatically calculates:
- **Trips**: `tripKm`, `average`, `totalTripFare`, `profitStatement`
- **Trip Books**: `receivedAmt`, `pendingAmt`, `marketBalance`, `netProfit`
- **Drivers**: `closeBal` (updated on advance creation)
- **Billing Parties**: `balanceAmt` (updated on payments)
- **Stock Items**: `closeQty` (updated on stock entries)

## Deployment

### Render.com (Free)
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables

### Environment Variables for Production
```
DATABASE_URL=your_neon_connection_string
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-frontend.vercel.app
```
