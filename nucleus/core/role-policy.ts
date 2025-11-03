import { db } from "../../server/db";
import { rolePermissions, type RolePermission } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { EventEmitter } from "events";

export interface Permission {
  nucleus: boolean;
  bots: boolean;
  platforms: boolean;
  users: boolean;
  analytics: boolean;
  settings: boolean;
  logs: boolean;
}

export interface RolePolicyStatus {
  active: boolean;
  totalRoles: number;
  defaultRoles: string[];
}

const DEFAULT_ROLES: { role: string; permissions: Permission }[] = [
  {
    role: 'admin',
    permissions: {
      nucleus: true,
      bots: true,
      platforms: true,
      users: true,
      analytics: true,
      settings: true,
      logs: true,
    },
  },
  {
    role: 'manager',
    permissions: {
      nucleus: true,
      bots: true,
      platforms: true,
      users: false,
      analytics: true,
      settings: false,
      logs: true,
    },
  },
  {
    role: 'user',
    permissions: {
      nucleus: false,
      bots: false,
      platforms: false,
      users: false,
      analytics: false,
      settings: false,
      logs: false,
    },
  },
  {
    role: 'bot',
    permissions: {
      nucleus: true,
      bots: false,
      platforms: true,
      users: false,
      analytics: false,
      settings: false,
      logs: false,
    },
  },
];

class RolePolicy extends EventEmitter {
  private active: boolean = false;

  async initialize(): Promise<void> {
    if (this.active) {
      console.log('🛡️ Role Policy already initialized - skipping');
      return;
    }

    await this.setupDefaultRoles();
    console.log('🛡️ Role Policy initialized');
    this.active = true;
  }

  private async setupDefaultRoles(): Promise<void> {
    for (const { role, permissions } of DEFAULT_ROLES) {
      const existing = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.role, role))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(rolePermissions).values({
          role,
          permissions: permissions as any,
        });
        console.log(`✅ Default role created: ${role}`);
      }
    }
  }

  async getPermissions(role: string): Promise<Permission | null> {
    const [roleData] = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role))
      .limit(1);

    if (!roleData) {
      return null;
    }

    return roleData.permissions as Permission;
  }

  async hasPermission(role: string, resource: keyof Permission): Promise<boolean> {
    const permissions = await this.getPermissions(role);
    
    if (!permissions) {
      return false;
    }

    return permissions[resource] === true;
  }

  async createRole(role: string, permissions: Permission): Promise<RolePermission> {
    const existing = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Role ${role} already exists`);
    }

    const [newRole] = await db
      .insert(rolePermissions)
      .values({
        role,
        permissions: permissions as any,
      })
      .returning();

    console.log(`✅ Role created: ${role}`);
    this.emit('role:created', { role });
    return newRole;
  }

  async updateRole(role: string, permissions: Partial<Permission>): Promise<RolePermission> {
    const current = await this.getPermissions(role);
    
    if (!current) {
      throw new Error(`Role ${role} not found`);
    }

    const updated = { ...current, ...permissions };

    const [updatedRole] = await db
      .update(rolePermissions)
      .set({ permissions: updated as any })
      .where(eq(rolePermissions.role, role))
      .returning();

    console.log(`✅ Role updated: ${role}`);
    this.emit('role:updated', { role });
    return updatedRole;
  }

  async deleteRole(role: string): Promise<void> {
    if (DEFAULT_ROLES.some((r) => r.role === role)) {
      throw new Error(`Cannot delete default role: ${role}`);
    }

    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.role, role));

    console.log(`✅ Role deleted: ${role}`);
    this.emit('role:deleted', { role });
  }

  async listRoles(): Promise<RolePermission[]> {
    const roles = await db.select().from(rolePermissions);
    return roles;
  }

  async checkAccess(role: string, requiredPermissions: (keyof Permission)[]): Promise<boolean> {
    const permissions = await this.getPermissions(role);
    
    if (!permissions) {
      return false;
    }

    for (const required of requiredPermissions) {
      if (!permissions[required]) {
        return false;
      }
    }

    return true;
  }

  async getStatus(): Promise<RolePolicyStatus> {
    const roles = await this.listRoles();
    
    return {
      active: this.active,
      totalRoles: roles.length,
      defaultRoles: DEFAULT_ROLES.map((r) => r.role),
    };
  }

  async shutdown(): Promise<void> {
    console.log('🛡️ Role Policy shutting down...');
    this.active = false;
  }
}

export const rolePolicy = new RolePolicy();
