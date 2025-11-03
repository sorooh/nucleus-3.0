import { db } from "../../server/db";
import { users, sessions, type User, type InsertUser, type Session } from "../../shared/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

export interface UserCredentials {
  username: string;
  password: string;
  email: string;
  role?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserManagerStatus {
  active: boolean;
  totalUsers: number;
  activeSessions: number;
}

class UserManager {
  private active: boolean = false;

  async initialize(): Promise<void> {
    if (this.active) {
      console.log('👤 User Manager already initialized - skipping');
      return;
    }

    console.log('👤 User Manager initialized');
    this.active = true;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(credentials: UserCredentials): Promise<User> {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, credentials.username))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('Username already exists');
    }

    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, credentials.email))
      .limit(1);

    if (existingEmail.length > 0) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await this.hashPassword(credentials.password);

    const [newUser] = await db
      .insert(users)
      .values({
        username: credentials.username,
        password: hashedPassword,
        email: credentials.email,
        role: credentials.role || 'user',
        isActive: 1,
      })
      .returning();

    console.log(`✅ User registered: ${newUser.username} (${newUser.role})`);
    return newUser;
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, credentials.username))
      .limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isActive !== 1) {
      throw new Error('User account is disabled');
    }

    if (!(await this.verifyPassword(credentials.password, user.password))) {
      throw new Error('Invalid credentials');
    }

    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(sessions).values({
      userId: user.id,
      token: token,
      expiresAt: expiresAt,
    });

    console.log(`✅ User logged in: ${user.username}`);
    return { user, token };
  }

  async validateSession(token: string): Promise<User | null> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      return null;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || user.isActive !== 1) {
      return null;
    }

    return user;
  }

  async logout(token: string): Promise<void> {
    await db
      .delete(sessions)
      .where(eq(sessions.token, token));

    console.log('✅ User logged out');
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return user || null;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    if (updates.password) {
      updates.password = await this.hashPassword(updates.password);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    console.log(`✅ User updated: ${updated.username}`);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));

    console.log(`✅ User deleted: ${id}`);
  }

  async listUsers(): Promise<User[]> {
    const allUsers = await db
      .select()
      .from(users);

    return allUsers;
  }

  async getStatus(): Promise<UserManagerStatus> {
    const totalUsers = await db.select().from(users);
    const activeSessions = await db
      .select()
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()));

    return {
      active: this.active,
      totalUsers: totalUsers.length,
      activeSessions: activeSessions.length,
    };
  }

  async shutdown(): Promise<void> {
    console.log('👤 User Manager shutting down...');
    this.active = false;
  }
}

export const userManager = new UserManager();
