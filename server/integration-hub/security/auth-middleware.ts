/**
 * ═══════════════════════════════════════════════════════════
 * Integration Hub - Authentication Middleware
 * ═══════════════════════════════════════════════════════════
 * Secure authentication and authorization layer
 * Built from absolute zero - Abu Sham Vision
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/security.types';

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  isEmperor: boolean;
}

/**
 * Map user roles from database to Integration Hub roles
 */
function mapUserRoleToHubRole(dbRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'admin': 'EMPEROR',      // Admin users get emperor privileges
    'manager': 'ADMIN',      // Managers get admin privileges
    'maintainer': 'MAINTAINER', // Maintainers can deploy
    'reviewer': 'REVIEWER',  // Reviewers can review
    'user': 'READER',        // Regular users are readers
    'bot': 'READER',         // Bots are readers by default
  };

  return roleMap[dbRole.toLowerCase()] || 'READER';
}

/**
 * Require authentication middleware
 */
export async function requireHubAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if user is authenticated (using existing session)
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Map database role to Integration Hub role
    const dbRole = user.role || 'user';
    const hubRole = mapUserRoleToHubRole(dbRole);
    const isEmperor = hubRole === 'EMPEROR';

    const authContext: AuthContext = {
      userId: user.id.toString(),
      email: user.email,
      name: user.name || user.username || 'User',
      role: hubRole,
      isEmperor,
    };

    // Attach to request
    (req as any).hubAuth = authContext;
    
    console.log(`[HubAuth] ✅ User authenticated: ${authContext.email} (${authContext.role})`);
    next();
  } catch (error) {
    console.error('[HubAuth] ❌ Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Require specific role
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authContext = (req as any).hubAuth as AuthContext;

    if (!authContext) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(authContext.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Require Emperor role (highest authority)
 */
export function requireEmperor(req: Request, res: Response, next: NextFunction) {
  const authContext = (req as any).hubAuth as AuthContext;

  if (!authContext || !authContext.isEmperor) {
    return res.status(403).json({
      success: false,
      error: 'Emperor privileges required'
    });
  }

  next();
}
