import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { requireAuth, requireOrg, loadMemberPermissions, requirePermission, clerkClient } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/auth/me
 * Get current user info with role and permissions
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const { userId, orgId } = req.auth!;

        // Get user info from Clerk
        const user = await clerkClient.users.getUser(userId);

        // If org is selected, get member info
        let memberInfo = null;
        if (orgId) {
            const member = await prisma.organizationMember.findUnique({
                where: {
                    clerkUserId_clerkOrgId: {
                        clerkUserId: userId,
                        clerkOrgId: orgId,
                    },
                },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });

            if (member) {
                memberInfo = {
                    id: member.id,
                    role: {
                        id: member.role.id,
                        name: member.role.name,
                        description: member.role.description,
                    },
                    permissions: member.role.permissions.map(
                        (rp: any) => `${rp.permission.resource}:${rp.permission.action}`
                    ),
                    joinedAt: member.joinedAt,
                };
            }
        }

        res.json({
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            currentOrgId: orgId,
            member: memberInfo,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

/**
 * POST /api/auth/setup-member
 * Called after organization creation to set up the creator as admin
 */
router.post('/setup-member', requireAuth, requireOrg, async (req: Request, res: Response) => {
    try {
        const { userId, orgId } = req.auth!;

        // Check if member already exists
        const existingMember = await prisma.organizationMember.findUnique({
            where: {
                clerkUserId_clerkOrgId: {
                    clerkUserId: userId,
                    clerkOrgId: orgId!,
                },
            },
        });

        if (existingMember) {
            return res.json({ message: 'Member already exists', member: existingMember });
        }

        // Get admin role
        const adminRole = await prisma.role.findUnique({
            where: { name: 'admin' },
        });

        if (!adminRole) {
            return res.status(500).json({ error: 'Admin role not found. Please run seed-rbac first.' });
        }

        // Create member as admin
        const member = await prisma.organizationMember.create({
            data: {
                clerkUserId: userId,
                clerkOrgId: orgId!,
                roleId: adminRole.id,
            },
            include: {
                role: true,
            },
        });

        res.status(201).json({ message: 'Member created', member });
    } catch (error) {
        console.error('Setup member error:', error);
        res.status(500).json({ error: 'Failed to setup member' });
    }
});

/**
 * GET /api/auth/members
 * Get all members of the current organization
 */
router.get('/members', requireAuth, requireOrg, loadMemberPermissions, requirePermission('members:read'), async (req: Request, res: Response) => {
    try {
        const { orgId } = req.auth!;

        const members = await prisma.organizationMember.findMany({
            where: { clerkOrgId: orgId! },
            include: {
                role: true,
            },
            orderBy: { joinedAt: 'asc' },
        });

        // Fetch user details from Clerk for each member
        const membersWithDetails = await Promise.all(
            members.map(async (member: any) => {
                try {
                    const user = await clerkClient.users.getUser(member.clerkUserId);
                    return {
                        id: member.id,
                        userId: member.clerkUserId,
                        email: user.emailAddresses[0]?.emailAddress,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl,
                        role: member.role,
                        joinedAt: member.joinedAt,
                        invitedBy: member.invitedBy,
                    };
                } catch {
                    return {
                        id: member.id,
                        userId: member.clerkUserId,
                        email: 'Unknown',
                        role: member.role,
                        joinedAt: member.joinedAt,
                    };
                }
            })
        );

        res.json(membersWithDetails);
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get members' });
    }
});

/**
 * GET /api/auth/roles
 * Get all available roles
 */
router.get('/roles', requireAuth, async (req: Request, res: Response) => {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(roles);
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Failed to get roles' });
    }
});

/**
 * PUT /api/auth/members/:id/role
 * Update a member's role
 */
router.put('/members/:id/role', requireAuth, requireOrg, loadMemberPermissions, requirePermission('members:manage'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body;
        const { orgId } = req.auth!;

        // Verify member belongs to org
        const member = await prisma.organizationMember.findFirst({
            where: { id, clerkOrgId: orgId! },
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const updated = await prisma.organizationMember.update({
            where: { id },
            data: { roleId },
            include: { role: true },
        });

        res.json(updated);
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ error: 'Failed to update member role' });
    }
});

/**
 * POST /api/auth/invite
 * Create invitation for new member
 */
router.post('/invite', requireAuth, requireOrg, loadMemberPermissions, requirePermission('members:manage'), async (req: Request, res: Response) => {
    try {
        const { email, roleId } = req.body;
        const { userId, orgId } = req.auth!;

        if (!email || !roleId) {
            return res.status(400).json({ error: 'Email and roleId are required' });
        }

        // Check if role exists
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invitation = await prisma.invitation.create({
            data: {
                email,
                clerkOrgId: orgId!,
                roleId,
                token,
                invitedBy: userId,
                expiresAt,
            },
        });

        // TODO: Send invitation email with link containing token
        // For now, return the token for testing
        res.status(201).json({
            message: 'Invitation created',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                token: invitation.token,
                expiresAt: invitation.expiresAt,
            },
        });
    } catch (error) {
        console.error('Create invitation error:', error);
        res.status(500).json({ error: 'Failed to create invitation' });
    }
});

/**
 * GET /api/auth/invitations
 * Get pending invitations for current org
 */
router.get('/invitations', requireAuth, requireOrg, loadMemberPermissions, requirePermission('members:read'), async (req: Request, res: Response) => {
    try {
        const { orgId } = req.auth!;

        const invitations = await prisma.invitation.findMany({
            where: {
                clerkOrgId: orgId!,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(invitations);
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({ error: 'Failed to get invitations' });
    }
});

/**
 * DELETE /api/auth/invite/:id
 * Cancel an invitation
 */
router.delete('/invite/:id', requireAuth, requireOrg, loadMemberPermissions, requirePermission('members:manage'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { orgId } = req.auth!;

        const invitation = await prisma.invitation.findFirst({
            where: { id, clerkOrgId: orgId! },
        });

        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        await prisma.invitation.delete({ where: { id } });
        res.json({ message: 'Invitation cancelled' });
    } catch (error) {
        console.error('Cancel invitation error:', error);
        res.status(500).json({ error: 'Failed to cancel invitation' });
    }
});

export default router;
