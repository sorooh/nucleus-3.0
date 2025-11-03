/**
 * Nucleus 3.0 - Advanced Permission System
 * 
 * نظام الصلاحيات المتقدم
 * يدعم Role-Based Access Control (RBAC) و Fine-Grained Permissions
 */

import { AuthorizationError } from '../../shared/errors';

/**
 * Permission Actions
 */
export type PermissionAction = 'read' | 'write' | 'delete' | 'execute' | 'admin';

/**
 * Resource Types
 */
export type ResourceType =
  | 'memory'
  | 'ai'
  | 'platform'
  | 'user'
  | 'config'
  | 'metrics'
  | 'health'
  | 'knowledge'
  | 'intelligence';

/**
 * Permission Definition
 */
export interface Permission {
  resource: ResourceType;
  action: PermissionAction;
  conditions?: Record<string, any>; // Optional conditions
}

/**
 * Role Definition
 */
export interface Role {
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // Roles to inherit from
}

/**
 * Data Scope Types
 */
export type DataScope =
  | 'memory:read'
  | 'memory:write'
  | 'memory:delete'
  | 'ai:generate'
  | 'ai:embeddings'
  | 'ai:committee'
  | 'knowledge:read'
  | 'knowledge:write'
  | 'intelligence:query'
  | 'intelligence:learn'
  | 'platform:read'
  | 'platform:write'
  | 'metrics:read'
  | 'health:read'
  | 'config:read'
  | 'config:write';

/**
 * Permission System
 */
export class PermissionSystem {
  private platformPermissions = new Map<string, Set<string>>();
  private platformRoles = new Map<string, string[]>();
  private roles = new Map<string, Role>();

  constructor() {
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    // Guest role - minimal access
    this.defineRole({
      name: 'guest',
      description: 'Minimal read-only access',
      permissions: [
        { resource: 'knowledge', action: 'read' },
        { resource: 'health', action: 'read' },
      ],
    });

    // Reader role - read-only access
    this.defineRole({
      name: 'reader',
      description: 'Read-only access to most resources',
      permissions: [
        { resource: 'memory', action: 'read' },
        { resource: 'knowledge', action: 'read' },
        { resource: 'intelligence', action: 'read' },
        { resource: 'platform', action: 'read' },
        { resource: 'metrics', action: 'read' },
        { resource: 'health', action: 'read' },
      ],
      inherits: ['guest'],
    });

    // Writer role - read and write access
    this.defineRole({
      name: 'writer',
      description: 'Read and write access to most resources',
      permissions: [
        { resource: 'memory', action: 'write' },
        { resource: 'knowledge', action: 'write' },
        { resource: 'ai', action: 'execute' },
        { resource: 'intelligence', action: 'execute' },
      ],
      inherits: ['reader'],
    });

    // AI User role - can use AI features
    this.defineRole({
      name: 'ai_user',
      description: 'Can use all AI features',
      permissions: [
        { resource: 'ai', action: 'read' },
        { resource: 'ai', action: 'execute' },
        { resource: 'intelligence', action: 'execute' },
        { resource: 'memory', action: 'read' },
        { resource: 'memory', action: 'write' },
      ],
      inherits: ['writer'],
    });

    // Platform Manager role - can manage platforms
    this.defineRole({
      name: 'platform_manager',
      description: 'Can manage platform registry',
      permissions: [
        { resource: 'platform', action: 'read' },
        { resource: 'platform', action: 'write' },
        { resource: 'platform', action: 'delete' },
        { resource: 'config', action: 'read' },
      ],
      inherits: ['reader'],
    });

    // Admin role - full access
    this.defineRole({
      name: 'admin',
      description: 'Full administrative access',
      permissions: [
        { resource: 'memory', action: 'admin' },
        { resource: 'ai', action: 'admin' },
        { resource: 'platform', action: 'admin' },
        { resource: 'user', action: 'admin' },
        { resource: 'config', action: 'admin' },
        { resource: 'metrics', action: 'admin' },
        { resource: 'health', action: 'admin' },
        { resource: 'knowledge', action: 'admin' },
        { resource: 'intelligence', action: 'admin' },
      ],
    });
  }

  /**
   * Define a new role
   */
  defineRole(role: Role): void {
    this.roles.set(role.name, role);
  }

  /**
   * Get role definition
   */
  getRole(roleName: string): Role | undefined {
    return this.roles.get(roleName);
  }

  /**
   * Grant permissions to platform
   */
  grantPermissions(platformId: string, permissions: string[]): void {
    if (!this.platformPermissions.has(platformId)) {
      this.platformPermissions.set(platformId, new Set());
    }

    const platformPerms = this.platformPermissions.get(platformId)!;
    for (const permission of permissions) {
      platformPerms.add(permission);
    }
  }

  /**
   * Revoke permissions from platform
   */
  revokePermissions(platformId: string, permissions: string[]): void {
    const platformPerms = this.platformPermissions.get(platformId);
    if (!platformPerms) return;

    for (const permission of permissions) {
      platformPerms.delete(permission);
    }
  }

  /**
   * Assign role to platform
   */
  assignRole(platformId: string, roleName: string): void {
    const role = this.roles.get(roleName);
    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    if (!this.platformRoles.has(platformId)) {
      this.platformRoles.set(platformId, []);
    }

    const roles = this.platformRoles.get(platformId)!;
    if (!roles.includes(roleName)) {
      roles.push(roleName);
    }

    // Grant role permissions
    const permissions = this.getRolePermissions(roleName);
    const permissionStrings = permissions.map((p) => `${p.resource}:${p.action}`);
    this.grantPermissions(platformId, permissionStrings);
  }

  /**
   * Remove role from platform
   */
  removeRole(platformId: string, roleName: string): void {
    const roles = this.platformRoles.get(platformId);
    if (!roles) return;

    const index = roles.indexOf(roleName);
    if (index > -1) {
      roles.splice(index, 1);
    }

    // Revoke role permissions (if not granted by other roles)
    const remainingPermissions = this.calculatePermissionsForPlatform(platformId);
    const rolePermissions = this.getRolePermissions(roleName);
    const toRevoke = rolePermissions.filter(
      (p) => !remainingPermissions.some((rp) => rp.resource === p.resource && rp.action === p.action)
    );

    const revokeStrings = toRevoke.map((p) => `${p.resource}:${p.action}`);
    this.revokePermissions(platformId, revokeStrings);
  }

  /**
   * Get all permissions for a role (including inherited)
   */
  private getRolePermissions(roleName: string): Permission[] {
    const role = this.roles.get(roleName);
    if (!role) return [];

    let permissions: Permission[] = [...role.permissions];

    // Add inherited permissions
    if (role.inherits) {
      for (const parentRole of role.inherits) {
        permissions = permissions.concat(this.getRolePermissions(parentRole));
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    return permissions.filter((p) => {
      const key = `${p.resource}:${p.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate all permissions for a platform based on roles
   */
  private calculatePermissionsForPlatform(platformId: string): Permission[] {
    const roles = this.platformRoles.get(platformId) || [];
    let permissions: Permission[] = [];

    for (const roleName of roles) {
      permissions = permissions.concat(this.getRolePermissions(roleName));
    }

    // Remove duplicates
    const seen = new Set<string>();
    return permissions.filter((p) => {
      const key = `${p.resource}:${p.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Check if platform can access resource
   */
  canAccess(platformId: string, resource: ResourceType, action: PermissionAction): boolean {
    const platformPerms = this.platformPermissions.get(platformId);
    if (!platformPerms) return false;

    // Check direct permission
    if (platformPerms.has(`${resource}:${action}`)) {
      return true;
    }

    // Check admin permission
    if (platformPerms.has(`${resource}:admin`)) {
      return true;
    }

    return false;
  }

  /**
   * Validate data scope access
   */
  validateDataScope(platformId: string, scope: DataScope): void {
    const [resource, action] = scope.split(':') as [ResourceType, PermissionAction];

    if (!this.canAccess(platformId, resource, action)) {
      throw new AuthorizationError(
        `Platform ${platformId} does not have permission for ${scope}`,
        [scope],
        { platformId, scope }
      );
    }
  }

  /**
   * Validate multiple scopes
   */
  validateDataScopes(platformId: string, scopes: DataScope[]): void {
    const missingScopes: DataScope[] = [];

    for (const scope of scopes) {
      try {
        this.validateDataScope(platformId, scope);
      } catch {
        missingScopes.push(scope);
      }
    }

    if (missingScopes.length > 0) {
      throw new AuthorizationError(
        `Platform ${platformId} is missing required permissions`,
        missingScopes,
        { platformId, missingScopes }
      );
    }
  }

  /**
   * Get platform permissions
   */
  getPlatformPermissions(platformId: string): string[] {
    const perms = this.platformPermissions.get(platformId);
    return perms ? Array.from(perms) : [];
  }

  /**
   * Get platform roles
   */
  getPlatformRoles(platformId: string): string[] {
    return this.platformRoles.get(platformId) || [];
  }

  /**
   * Check if platform has specific role
   */
  hasRole(platformId: string, roleName: string): boolean {
    const roles = this.platformRoles.get(platformId);
    return roles ? roles.includes(roleName) : false;
  }

  /**
   * Get all defined roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Clear platform permissions and roles
   */
  clearPlatform(platformId: string): void {
    this.platformPermissions.delete(platformId);
    this.platformRoles.delete(platformId);
  }

  /**
   * Get permission summary for platform
   */
  getPlatformSummary(platformId: string): any {
    return {
      platformId,
      roles: this.getPlatformRoles(platformId),
      permissions: this.getPlatformPermissions(platformId),
      effectivePermissions: this.calculatePermissionsForPlatform(platformId).map(
        (p) => `${p.resource}:${p.action}`
      ),
    };
  }
}

// Singleton instance
let permissionSystemInstance: PermissionSystem | null = null;

export function getPermissionSystem(): PermissionSystem {
  if (!permissionSystemInstance) {
    permissionSystemInstance = new PermissionSystem();
  }
  return permissionSystemInstance;
}
