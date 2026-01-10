#!/usr/bin/env ts-node

/**
 * Migration script to add organization-scoped filtering to all route files
 * This ensures multi-tenant data isolation
 */

import * as fs from 'fs';
import * as path from 'path';

const ROUTES_DIR = path.join(__dirname, '../src/routes');

// Files already completed (skip these)
const COMPLETED_FILES = ['auth.ts', 'vehicles.ts', 'drivers.ts', 'billingParties.ts'];

// Map of model names for each route file
const MODEL_MAP: Record<string, string> = {
    'transporters.ts': 'transporter',
    'expenseCategories.ts': 'expenseCategory',
    'paymentModes.ts': 'paymentMode',
    'stockItems.ts': 'stockItem',
    'trips.ts': 'trip',
    'tripBooks.ts': 'tripBook',
    'driverAdvances.ts': 'driverAdvance',
    'expenses.ts': 'expense',
    'returnTrips.ts': 'returnTrip',
    'partyPayments.ts': 'partyPayment',
    'marketVehPayments.ts': 'marketVehPayment',
    'stockEntries.ts': 'stockEntry',
    'dashboard.ts': 'various',
    'reports.ts': 'various',
};

function addOrgScope(content: string, modelName: string): string {
    let updated = content;

    // Pattern 1: GET all - findMany without where clause
    const findManyPattern = new RegExp(
        `(const \\w+ = await prisma\\.${modelName}\\.findMany\\(\\{\\s*)(orderBy:)`,
        'g'
    );
    updated = updated.replace(
        findManyPattern,
        `$1where: { organizationId: req.auth!.orgId! },\n        $2`
    );

    // Pattern 2: GET all - findMany with existing where clause
    const findManyWithWherePattern = new RegExp(
        `(const \\w+ = await prisma\\.${modelName}\\.findMany\\(\\{\\s*where: )(\\{[^}]+\\})`,
        'g'
    );
    updated = updated.replace(findManyWithWherePattern, (match, prefix, whereObj) => {
        // Add organizationId to existing where clause
        const trimmed = whereObj.trim().slice(1, -1); // Remove { }
        return `${prefix}{ organizationId: req.auth!.orgId!, ${trimmed} }`;
    });

    // Pattern 3: GET /:id - findUnique to findFirst with org filter
    const findUniquePattern = new RegExp(
        `(const \\w+ = await prisma\\.${modelName}\\.findUnique\\(\\{\\s*where: \\{ id: req\\.params\\.id \\})`,
        'g'
    );
    updated = updated.replace(
        findUniquePattern,
        `$1 = await prisma.${modelName}.findFirst({\n        where: { \n            id: req.params.id,\n            organizationId: req.auth!.orgId!\n        }`
    );

    // Pattern 4: UPDATE - add ownership check before findUnique
    const updatePattern = new RegExp(
        `(// PUT update.*?\\n.*?const existing = await prisma\\.${modelName}\\.findUnique\\(\\{ where: \\{ id: req\\.params\\.id \\} \\}\\);)`,
        'gs'
    );
    updated = updated.replace(updatePattern, (match) => {
        return match.replace(
            'findUnique({ where: { id: req.params.id } })',
            `findFirst({ \n        where: { id: req.params.id, organizationId: req.auth!.orgId! }\n    })`
        );
    });

    // Pattern 5: DELETE - add ownership check
    const deletePattern = new RegExp(
        `(// DELETE.*?\\n.*?router\\.delete\\('/:id', asyncHandler\\(async \\(req: Request, res: Response\\) => \\{\\s*)(await prisma\\.${modelName}\\.delete)`,
        'gs'
    );
    updated = updated.replace(deletePattern, (match, prefix, deleteCall) => {
        return `${prefix}// Verify ownership\n    const existing = await prisma.${modelName}.findFirst({ \n        where: { id: req.params.id, organizationId: req.auth!.orgId! }\n    });\n    if (!existing) {\n        throw new ApiError(404, ErrorCodes.NOT_FOUND, '${capitalize(modelName)} not found');\n    }\n\n    ${deleteCall}`;
    });

    // Fix parameter names - change _req to req where needed
    updated = updated.replace(/async \(_req: Request/g, 'async (req: Request');

    return updated;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1').trim();
}

function processFile(filename: string): void {
    const filepath = path.join(ROUTES_DIR, filename);
    const modelName = MODEL_MAP[filename];

    if (!modelName) {
        console.log(`⏭️  Skipping ${filename} - not in model map`);
        return;
    }

    if (modelName === 'various') {
        console.log(`⚠️  ${filename} - Requires manual update (complex queries)`);
        return;
    }

    console.log(`🔄 Processing ${filename}...`);

    let content = fs.readFileSync(filepath, 'utf-8');
    const updated = addOrgScope(content, modelName);

    if (content === updated) {
        console.log(`   ℹ️  No changes needed`);
    } else {
        fs.writeFileSync(filepath, updated, 'utf-8');
        console.log(`   ✅ Updated successfully`);
    }
}

function main() {
    console.log('🚀 Starting organization-scoping migration...\n');

    const files = fs.readdirSync(ROUTES_DIR)
        .filter(f => f.endsWith('.ts') && !COMPLETED_FILES.includes(f));

    files.forEach(processFile);

    console.log('\n✨ Migration complete!');
    console.log('\n⚠️  Manual updates required for:');
    console.log('   - dashboard.ts (aggregation queries)');
    console.log('   - reports.ts (complex report queries)');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Review changes in git diff');
    console.log('   3. Manually update dashboard.ts and reports.ts');
}

main();
