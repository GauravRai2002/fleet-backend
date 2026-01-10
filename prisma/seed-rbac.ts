import prisma from '../src/utils/prisma';

// Define all resources and actions for the system
const RESOURCES = [
    'vehicles',
    'drivers',
    'billing_parties',
    'transporters',
    'expense_categories',
    'payment_modes',
    'stock_items',
    'trips',
    'trip_books',
    'driver_advances',
    'expenses',
    'return_trips',
    'party_payments',
    'market_veh_payments',
    'stock_entries',
    'reports',
    'settings',
    'members',
] as const;

const ACTIONS = ['read', 'write', 'delete', 'manage'] as const;

// Define which roles get which permissions
const ROLE_PERMISSIONS: Record<string, { resources: readonly string[]; actions: readonly string[] }> = {
    viewer: {
        resources: [...RESOURCES],
        actions: ['read'],
    },
    editor: {
        resources: RESOURCES.filter(r => !['settings', 'members'].includes(r)),
        actions: ['read', 'write'],
    },
    admin: {
        resources: [...RESOURCES],
        actions: ['read', 'write', 'delete', 'manage'],
    },
};

async function main() {
    console.log('🌱 Seeding RBAC data...');

    // Create permissions
    console.log('Creating permissions...');
    const permissions: { id: string; resource: string; action: string }[] = [];

    for (const resource of RESOURCES) {
        for (const action of ACTIONS) {
            const permission = await prisma.permission.upsert({
                where: { resource_action: { resource, action } },
                update: {},
                create: { resource, action },
            });
            permissions.push(permission);
        }
    }
    console.log(`✓ Created ${permissions.length} permissions`);

    // Create roles
    console.log('Creating roles...');
    const roles = await Promise.all([
        prisma.role.upsert({
            where: { name: 'viewer' },
            update: { description: 'Can view all data but cannot make changes' },
            create: {
                name: 'viewer',
                description: 'Can view all data but cannot make changes',
                isDefault: false,
            },
        }),
        prisma.role.upsert({
            where: { name: 'editor' },
            update: { description: 'Can view and edit data, but cannot delete or manage settings' },
            create: {
                name: 'editor',
                description: 'Can view and edit data, but cannot delete or manage settings',
                isDefault: true,
            },
        }),
        prisma.role.upsert({
            where: { name: 'admin' },
            update: { description: 'Full access to all features including settings and member management' },
            create: {
                name: 'admin',
                description: 'Full access to all features including settings and member management',
                isDefault: false,
            },
        }),
    ]);
    console.log(`✓ Created ${roles.length} roles`);

    // Assign permissions to roles
    console.log('Assigning permissions to roles...');
    let assignmentCount = 0;

    for (const role of roles) {
        const roleConfig = ROLE_PERMISSIONS[role.name];
        if (!roleConfig) continue;

        for (const resource of roleConfig.resources) {
            for (const action of roleConfig.actions) {
                const permission = permissions.find(p => p.resource === resource && p.action === action);
                if (!permission) continue;

                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: role.id,
                            permissionId: permission.id,
                        },
                    },
                    update: {},
                    create: {
                        roleId: role.id,
                        permissionId: permission.id,
                    },
                });
                assignmentCount++;
            }
        }
    }
    console.log(`✓ Created ${assignmentCount} role-permission assignments`);

    console.log('✅ RBAC seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
