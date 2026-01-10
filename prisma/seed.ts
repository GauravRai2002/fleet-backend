import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Seed default payment modes
    const paymentModes = ['CASH', 'ONLINE', 'CHEQUE', 'UPI'];

    for (const name of paymentModes) {
        await prisma.paymentMode.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log('✓ Payment modes seeded');

    // Seed default expense categories
    const expenseCategories = [
        { name: 'Diesel', mode: 'Fuel' },
        { name: 'Toll', mode: 'Expenses' },
        { name: 'Driver Salary', mode: 'General' },
        { name: 'Maintenance', mode: 'General' },
        { name: 'Parking', mode: 'Expenses' },
        { name: 'Loading/Unloading', mode: 'Expenses' },
    ];

    for (const category of expenseCategories) {
        const existing = await prisma.expenseCategory.findFirst({
            where: { name: category.name },
        });

        if (!existing) {
            await prisma.expenseCategory.create({
                data: category,
            });
        }
    }

    console.log('✓ Expense categories seeded');
    console.log('Database seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
