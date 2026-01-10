import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../utils/prisma';

// Extend Request type to include auth info
declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                orgId: string | null;
                sessionId: string;
            };
            member?: {
                id: string;
                roleId: string;
                roleName: string;
                permissions: string[];
            };
        }
    }
}

/**
 * Middleware to verify Clerk JWT and extract user info
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const payload = await clerkClient.verifyToken(token);

            req.auth = {
                userId: payload.sub,
                orgId: (payload as { org_id?: string }).org_id || null,
                sessionId: payload.sid || '',
            };

            next();
        } catch {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    } catch (error) {
        console.error('Auth verification error:', error);
        return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
    }
};

/**
 * Middleware to ensure user has selected an organization
 */
export const requireOrg = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.orgId) {
        return res.status(403).json({ error: 'Forbidden: No organization selected' });
    }
    next();
};

/**
 * Middleware to load member permissions from database
 */
export const loadMemberPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.auth?.userId || !req.auth?.orgId) {
            return next();
        }

        const member = await prisma.organizationMember.findUnique({
            where: {
                clerkUserId_clerkOrgId: {
                    clerkUserId: req.auth.userId,
                    clerkOrgId: req.auth.orgId,
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

        if (!member) {
            return res.status(403).json({ error: 'Forbidden: Not a member of this organization' });
        }

        const permissions = member.role.permissions.map(
            (rp: { permission: { resource: string; action: string } }) =>
                `${rp.permission.resource}:${rp.permission.action}`
        );

        req.member = {
            id: member.id,
            roleId: member.roleId,
            roleName: member.role.name,
            permissions,
        };

        next();
    } catch (error) {
        console.error('Load permissions error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Factory function to create permission-checking middleware
 */
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.member) {
            return res.status(403).json({ error: 'Forbidden: No permissions loaded' });
        }

        const [resource] = permission.split(':');
        const hasPermission =
            req.member.permissions.includes(permission) ||
            req.member.permissions.includes(`${resource}:manage`);

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Forbidden: Insufficient permissions',
                required: permission,
            });
        }

        next();
    };
};

export const authMiddleware = [requireAuth, requireOrg, loadMemberPermissions];

export { clerkClient };
