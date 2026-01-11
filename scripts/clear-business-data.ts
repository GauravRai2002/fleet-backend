import prisma from '../src/utils/prisma';

/**
 * Clear all business data from the database.
 * Preserves: Role, Permission, RolePermission, OrganizationMember, Invitation
 */
async function clearBusinessData() {
    console.log('🧹 Clearing business data from database...\n');

    // Order matters due to foreign key constraints
    // Delete child records first, then parent records

    // Transaction tables (no foreign key dependencies on each other)
    const stockEntries = await prisma.stockEntry.deleteMany({});
    console.log(`✓ StockEntry: ${stockEntries.count} rows deleted`);

    const marketVehPayments = await prisma.marketVehPayment.deleteMany({});
    console.log(`✓ MarketVehPayment: ${marketVehPayments.count} rows deleted`);

    const partyPayments = await prisma.partyPayment.deleteMany({});
    console.log(`✓ PartyPayment: ${partyPayments.count} rows deleted`);

    const returnTrips = await prisma.returnTrip.deleteMany({});
    console.log(`✓ ReturnTrip: ${returnTrips.count} rows deleted`);

    const expenses = await prisma.expense.deleteMany({});
    console.log(`✓ Expense: ${expenses.count} rows deleted`);

    const driverAdvances = await prisma.driverAdvance.deleteMany({});
    console.log(`✓ DriverAdvance: ${driverAdvances.count} rows deleted`);

    const tripBooks = await prisma.tripBook.deleteMany({});
    console.log(`✓ TripBook: ${tripBooks.count} rows deleted`);

    const trips = await prisma.trip.deleteMany({});
    console.log(`✓ Trip: ${trips.count} rows deleted`);

    // Master data tables
    const stockItems = await prisma.stockItem.deleteMany({});
    console.log(`✓ StockItem: ${stockItems.count} rows deleted`);

    const paymentModes = await prisma.paymentMode.deleteMany({});
    console.log(`✓ PaymentMode: ${paymentModes.count} rows deleted`);

    const expenseCategories = await prisma.expenseCategory.deleteMany({});
    console.log(`✓ ExpenseCategory: ${expenseCategories.count} rows deleted`);

    const transporters = await prisma.transporter.deleteMany({});
    console.log(`✓ Transporter: ${transporters.count} rows deleted`);

    const billingParties = await prisma.billingParty.deleteMany({});
    console.log(`✓ BillingParty: ${billingParties.count} rows deleted`);

    const drivers = await prisma.driver.deleteMany({});
    console.log(`✓ Driver: ${drivers.count} rows deleted`);

    const vehicles = await prisma.vehicle.deleteMany({});
    console.log(`✓ Vehicle: ${vehicles.count} rows deleted`);

    console.log('\n✅ All business data cleared!');
    console.log('Preserved: Role, Permission, RolePermission, OrganizationMember, Invitation');
}

clearBusinessData()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
