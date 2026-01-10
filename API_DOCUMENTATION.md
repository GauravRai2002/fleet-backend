# Fleet Tracker API Documentation

## Base URL
`http://localhost:8080/api` (or your Railway deployment URL)

## Authentication
Most endpoints require:
- **Bearer Token**: Clerk JWT token in `Authorization: Bearer <token>` header
- **Organization Context**: `orgId` in JWT claims (set by Clerk)
- **Permissions**: Specific RBAC permissions based on user role

---

## Health Check
| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| `GET` | `/health` | Server health check | ❌ No |

---

## 🔐 Authentication & Authorization (`/api/auth`)

### User Management
| Method | Endpoint | Purpose | Permissions |
|--------|----------|---------|-------------|
| `GET` | `/me` | Get current user info with role & permissions | Auth only |
| `POST` | `/setup-member` | Setup org creator as admin (one-time) | Auth + Org |

### Member Management
| Method | Endpoint | Purpose | Permissions |
|--------|----------|---------|-------------|
| `GET` | `/members` | List all org members with details | `members:read` |
| `PUT` | `/members/:id/role` | Update member's role | `members:manage` |

### Role Management
| Method | Endpoint | Purpose | Permissions |
|--------|----------|---------|-------------|
| `GET` | `/roles` | List all available roles | Auth only |

### Invitations
| Method | Endpoint | Purpose | Permissions |
|--------|----------|---------|-------------|
| `POST` | `/invite` | Create invitation with role | `members:manage` |
| `GET` | `/invitations` | List pending invitations | `members:read` |
| `DELETE` | `/invite/:id` | Cancel invitation | `members:manage` |

---

## 🚗 Vehicles (`/api/vehicles`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List all vehicles |
| `GET` | `/:id` | Get single vehicle |
| `POST` | `/` | Create vehicle |
| `PUT` | `/:id` | Update vehicle |
| `DELETE` | `/:id` | Delete vehicle |

**Fields**: `vehNo`, `vehType`, `totalTrip`, `netProfit`

---

## 👤 Drivers (`/api/drivers`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List all drivers |
| `GET` | `/:id` | Get single driver |
| `POST` | `/` | Create driver |
| `PUT` | `/:id` | Update driver |
| `DELETE` | `/:id` | Delete driver |

**Fields**: `name`, `contactNo`, `drCr`, `openBal`, `debit`, `credit`, `closeBal`, `remark`  
**Auto-calculated**: `closeBal` = openBal + debit - credit

---

## 🏢 Billing Parties (`/api/billing-parties`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List all billing parties |
| `GET` | `/:id` | Get single billing party |
| `POST` | `/` | Create billing party |
| `PUT` | `/:id` | Update billing party |
| `DELETE` | `/:id` | Delete billing party |

**Fields**: `name`, `contactNo`, `drCr`, `openBal`, `billAmtTrip`, `billAmtRt`, `receiveAmt`, `balanceAmt`, `remark`  
**Auto-calculated**: `balanceAmt` = openBal + billAmtTrip + billAmtRt - receiveAmt

---

## 🚛 Transporters (`/api/transporters`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List all transporters |
| `GET` | `/:id` | Get single transporter |
| `POST` | `/` | Create transporter |
| `PUT` | `/:id` | Update transporter |
| `DELETE` | `/:id` | Delete transporter |

**Fields**: `vehNo`, `name`, `drCr`, `openBal`, `totalTrip`, `profit`, `billAmt`, `paidAmt`, `closeBal`, `remark`  
**Auto-calculated**: `closeBal` = openBal + billAmt - paidAmt

---

## 📋 Expense Categories (`/api/expense-categories`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List all expense categories |
| `GET` | `/:id` | Get single category |
| `POST` | `/` | Create category |
| `PUT` | `/:id` | Update category |
| `DELETE` | `/:id` | Delete category |

**Fields**: `name`, `mode` (General/Expenses/Fuel)

---

## 💳 Payment Modes (`/api/payment-modes`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List all payment modes |
| `GET` | `/:id` | Get single payment mode |
| `POST` | `/` | Create payment mode |
| `PUT` | `/:id` | Update payment mode |
| `DELETE` | `/:id` | Delete payment mode |

**Fields**: `name`

---

## 📦 Stock Items (`/api/stock-items`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List all stock items |
| `GET` | `/:id` | Get single stock item |
| `POST` | `/` | Create stock item |
| `PUT` | `/:id` | Update stock item |
| `DELETE` | `/:id` | Delete stock item |

**Fields**: `name`, `openQty`, `stkIn`, `stkOut`, `closeQty`  
**Auto-calculated**: `closeQty` = openQty + stkIn - stkOut

---

## 🚚 Trips (`/api/trips`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/next-number` | Get next trip number |
| `GET` | `/` | List trips (filters: fromDate, toDate, vehNo, driverName) |
| `GET` | `/:id` | Get single trip |
| `POST` | `/` | Create trip (auto-assigns trip number) |
| `PUT` | `/:id` | Update trip |
| `DELETE` | `/:id` | Delete trip (updates vehicle stats) |

**Fields**: 23+ fields including `tripNo`, `date`, `vehNo`, `driverName`, `fromLocation`, `toLocation`, `tripKm`, `fuelExpAmt`, `average`, `tripFare`, `rtFare`, `totalTripFare`, `tripExpense`, `profitStatement`, `stMiter`, `endMiter`, `dieselRate`, `ltr`, `isMarketTrip`, etc.  
**Auto-calculated**: `tripKm`, `average`, `totalTripFare`, `profitStatement`

---

## 📖 Trip Books (`/api/trip-books`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List trip books (filter: tripNo) |
| `GET` | `/:id` | Get single trip book |
| `POST` | `/` | Create trip book |
| `PUT` | `/:id` | Update trip book |
| `DELETE` | `/:id` | Delete trip book |

**Fields**: `tripNo`, `date`, `lrNo`, `billingPartyId`, `billingPartyName`, `freightMode`, `tripAmount`, `advanceAmt`, `shortageAmt`, `deductionAmt`, `holdingAmt`, `receivedAmt`, `pendingAmt`, `transporterId`, `transporterName`, `marketVehNo`, `marketFreight`, `marketAdvance`, `marketBalance`, `lWeight`, `uWeight`, `remark`, `netProfit`  
**Auto-calculated**: `receivedAmt`, `pendingAmt`, `marketBalance`, `netProfit`

---

## 💰 Driver Advances (`/api/driver-advances`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List advances (filters: tripNo, driverName) |
| `GET` | `/:id` | Get single advance |
| `POST` | `/` | Create advance (updates driver balance) |
| `PUT` | `/:id` | Update advance |
| `DELETE` | `/:id` | Delete advance |

**Fields**: `tripNo`, `date`, `driverName`, `mode`, `fromAccount`, `debit`, `credit`, `fuelLtr`, `remark`, `runBal`

---

## 💵 Expenses (`/api/expenses`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List expenses (filters: tripNo, expenseType) |
| `GET` | `/:id` | Get single expense |
| `POST` | `/` | Create expense |
| `PUT` | `/:id` | Update expense |
| `DELETE` | `/:id` | Delete expense |

**Fields**: `tripNo`, `date`, `expenseType`, `amount`, `fromAccount`, `refVehNo`, `remark1`, `remark2`, `isNonTripExp`

---

## 🔄 Return Trips (`/api/return-trips`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List return trips (filter: tripNo) |
| `GET` | `/:id` | Get single return trip |
| `POST` | `/` | Create return trip (updates billing party) |
| `PUT` | `/:id` | Update return trip |
| `DELETE` | `/:id` | Delete return trip |

**Fields**: `tripNo`, `date`, `billingPartyId`, `billingPartyName`, `lrNo`, `rtFreight`, `advanceAmt`, `shortageAmt`, `deductionAmt`, `holdingAmt`, `receivedAmt`, `pendingAmt`, `mode`, `toBank`, `remark`  
**Auto-calculated**: `receivedAmt`, `pendingAmt`

---

## 💸 Party Payments (`/api/party-payments`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List payments (filters: tripNo, billingPartyId) |
| `GET` | `/:id` | Get single payment |
| `POST` | `/` | Create payment (updates billing party) |
| `PUT` | `/:id` | Update payment |
| `DELETE` | `/:id` | Delete payment |

**Fields**: `tripNo`, `date`, `billingPartyId`, `billingPartyName`, `mode`, `receiveAmt`, `shortageAmt`, `deductionAmt`, `lrNo`, `toBank`, `remark`, `runBal`

---

## 🚛💳 Market Vehicle Payments (`/api/market-veh-payments`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List payments (filters: tripNo, transporterId) |
| `GET` | `/:id` | Get single payment |
| `POST` | `/` | Create payment (updates transporter) |
| `PUT` | `/:id` | Update payment |
| `DELETE` | `/:id` | Delete payment |

**Fields**: `tripNo`, `date`, `transporterId`, `transporterName`, `marketVehNo`, `mode`, `paidAmt`, `lrNo`, `fromBank`, `remark`, `runBal`

---

## 📦📝 Stock Entries (`/api/stock-entries`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | List entries (filters: stockItemId, entryType) |
| `GET` | `/:id` | Get single entry |
| `POST` | `/` | Create entry (updates stock item qty) |
| `PUT` | `/:id` | Update entry |
| `DELETE` | `/:id` | Delete entry |

**Fields**: `date`, `stockItemId`, `stockItemName`, `entryType` (IN/OUT), `quantity`, `remark`

---

## 📊 Dashboard (`/api/dashboard`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/stats` | Get dashboard statistics & recent trips |

**Returns**:
- Counts: vehicles, drivers, parties, transporters, trips
- Financials: totalRevenue, totalExpense, totalProfit
- Recent 5 trips

---

## 📈 Reports (`/api/reports`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/trip-summary` | Trip summary report (filters: fromDate, toDate) |
| `GET` | `/party-ledger` | Billing party ledger report |
| `GET` | `/driver-ledger` | Driver ledger report |
| `GET` | `/transporter-ledger` | Transporter ledger report |

**Trip Summary Returns**: Total trips, fare, expense, profit + aggregated trip data  
**Ledger Reports Return**: Total amounts + detailed records for each party/driver/transporter

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "field": "fieldName" // optional
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400): Invalid request data
- `NOT_FOUND` (404): Resource not found
- `UNAUTHORIZED` (401): Missing/invalid auth token
- `FORBIDDEN` (403): Insufficient permissions

---

## Notes
- All timestamps are in ISO 8601 format
- All monetary amounts are Decimal types
- `organizationId` is automatically set from authenticated user's org context
- RBAC is implemented via `requirePermission()` middleware
- Most routes require authentication via `authMiddleware`
