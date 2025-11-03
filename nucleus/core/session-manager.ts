import { db } from "../../server/db";
import { sessions, users, type Session, type User } from "../../shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { EventEmitter } from "events";

export interface SessionManagerStatus {
  active: boolean;
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
}

export interface SessionInfo {
  session: Session;
  user: User;
}

class SessionManager extends EventEmitter {
  private active: boolean = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.active) {
      console.log('🔐 Session Manager already initialized - skipping');
      return;
    }

    this.startCleanupTask();
    console.log('🔐 Session Manager initialized');
    this.active = true;
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const expired = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning();

    if (expired.length > 0) {
      console.log(`🧹 Cleaned ${expired.length} expired sessions`);
      this.emit('sessions:cleaned', { count: expired.length });
    }

    return expired.length;
  }

  async getSessionInfo(token: string): Promise<SessionInfo | null> {
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

    if (!user) {
      return null;
    }

    return { session, user };
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          gt(sessions.expiresAt, new Date())
        )
      );

    return userSessions;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId));

    console.log(`🚫 Session revoked: ${sessionId}`);
    this.emit('session:revoked', { sessionId });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const revoked = await db
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning();

    console.log(`🚫 All sessions revoked for user: ${userId} (${revoked.length})`);
    this.emit('user:sessions:revoked', { userId, count: revoked.length });
  }

  async extendSession(sessionId: string, days: number = 7): Promise<Session> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const [extended] = await db
      .update(sessions)
      .set({ expiresAt })
      .where(eq(sessions.id, sessionId))
      .returning();

    console.log(`⏰ Session extended: ${sessionId}`);
    this.emit('session:extended', { sessionId, expiresAt });
    return extended;
  }

  async getActiveSessions(): Promise<Session[]> {
    const active = await db
      .select()
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()));

    return active;
  }

  async getExpiredSessions(): Promise<Session[]> {
    const expired = await db
      .select()
      .from(sessions)
      .where(lt(sessions.expiresAt, new Date()));

    return expired;
  }

  async getStatus(): Promise<SessionManagerStatus> {
    const totalSessions = await db.select().from(sessions);
    const activeSessions = await this.getActiveSessions();
    const expiredSessions = await this.getExpiredSessions();

    return {
      active: this.active,
      totalSessions: totalSessions.length,
      activeSessions: activeSessions.length,
      expiredSessions: expiredSessions.length,
    };
  }

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('🔐 Session Manager shutting down...');
    this.active = false;
  }
}

export const sessionManager = new SessionManager();
