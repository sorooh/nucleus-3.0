/**
 * PHASE Ω.2: COGNITIVE BUS
 * ═════════════════════════════════════════════════════════════════════
 * الناقل العصبي - Neural Pathway for Thoughts and Knowledge
 * 
 * The Cognitive Bus creates a unified neural network where thoughts,
 * insights, and commands flow instantly between all Surooh nuclei.
 * Like neurons firing across a distributed brain.
 * 
 * Core Functions:
 * - Broadcast thoughts/insights to all nuclei
 * - Selective messaging to specific nuclei
 * - Priority-based message delivery
 * - Message expiration and cleanup
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { cognitiveBus, cognitiveBusMessages, nucleusRegistry } from '@shared/schema';
import { eq, sql, and, lt } from 'drizzle-orm';

interface BroadcastParams {
  senderNucleus: string;
  messageType: string;
  payload: Record<string, any>;
  recipientNuclei?: string[];
  priority?: string;
  ttlSeconds?: number;
}

interface MessageDelivery {
  messageId: string;
  status: string;
  deliveredCount: number;
  failedCount: number;
  deliveredAt?: Date;
}

export class CognitiveBusEngine extends EventEmitter {
  private busId: string | null = null;
  private isRunning = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute

  constructor() {
    super();
  }

  /**
   * Initialize Cognitive Bus
   */
  async initialize(): Promise<void> {
    try {
      // Check if global bus exists
      const existingBus = await db.query.cognitiveBus.findFirst({
        where: eq(cognitiveBus.busName, 'global_cognitive_bus'),
      });

      if (existingBus) {
        this.busId = existingBus.id;

        // Reactivate bus
        await db.update(cognitiveBus)
          .set({
            isActive: 1,
            updatedAt: new Date(),
          })
          .where(eq(cognitiveBus.id, this.busId));

        this.emit('bus_initialized', { busId: this.busId, mode: 'existing' });
      } else {
        // Create new bus
        const [newBus] = await db.insert(cognitiveBus).values({
          busName: 'global_cognitive_bus',
          busType: 'unified',
          isActive: 1,
          crossNucleusAccess: 'read_only',
          allowedOperations: ['read', 'subscribe'],
          totalMessages: 0,
          messagesPerSecond: 0.0,
          avgLatencyMs: 0.0,
          busHealth: 'healthy',
        }).returning();

        this.busId = newBus.id;
        this.emit('bus_initialized', { busId: this.busId, mode: 'created' });
      }

      // Start cleanup service
      this.startCleanupService();
      this.isRunning = true;

      console.log(`[Cognitive Bus] ✓ Initialized - Bus ID: ${this.busId}`);
    } catch (error) {
      console.error('[Cognitive Bus] ✗ Initialization failed:', error);
      this.emit('bus_error', { error, phase: 'initialization' });
      throw error;
    }
  }

  /**
   * Broadcast Message
   * Send message to all or specific nuclei
   */
  async broadcast(params: BroadcastParams): Promise<MessageDelivery> {
    if (!this.busId) {
      throw new Error('Cognitive Bus not initialized');
    }

    const messageStartTime = Date.now();

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine recipients (all nuclei if not specified)
      let recipients = params.recipientNuclei || [];
      if (recipients.length === 0) {
        // Get all active nuclei from registry
        const nuclei = await db.query.nucleusRegistry.findMany({
          where: eq(sql`status`, 'active'),
        });
        recipients = nuclei.map((n: any) => n.nucleusId);
      }

      // Calculate expiration
      const ttl = params.ttlSeconds || 300; // 5 minutes default
      const expiresAt = new Date(Date.now() + ttl * 1000);

      // Create message using raw SQL to match actual database schema (snake_case)
      await db.execute(sql`
        INSERT INTO cognitive_bus_messages (
          id, message_type, channel, source_nucleus, target_nuclei,
          payload, delivery_status, delivered_at, expires_at, priority
        ) VALUES (
          ${messageId}, ${params.messageType}, ${params.messageType}, ${params.senderNucleus},
          ${JSON.stringify(recipients)}::jsonb, ${JSON.stringify(params.payload)}::jsonb,
          'delivered', NOW(), ${expiresAt}, ${params.priority || 'normal'}
        )
      `);

      // Update bus stats
      const messageLatency = Date.now() - messageStartTime;
      await this.updateBusStats(messageLatency);

      const result: MessageDelivery = {
        messageId,
        status: 'delivered',
        deliveredCount: recipients.length,
        failedCount: 0,
        deliveredAt: new Date(),
      };

      this.emit('message_delivered', {
        messageId,
        messageType: params.messageType,
        senderNucleus: params.senderNucleus,
        recipientCount: recipients.length,
        latencyMs: messageLatency,
      });

      return result;
    } catch (error) {
      console.error('[Cognitive Bus] Broadcast failed:', error);
      this.emit('broadcast_failed', { error, params });
      throw error;
    }
  }

  /**
   * Get Messages for Nucleus
   * Retrieve all messages targeted to a specific nucleus
   */
  async getMessages(params: {
    nucleusId: string;
    messageType?: string;
    limit?: number;
    includeExpired?: boolean;
  }): Promise<any[]> {
    if (!this.busId) {
      throw new Error('Cognitive Bus not initialized');
    }

    // Use raw SQL to match actual database schema (snake_case)
    const limit = params.limit || 50;
    const query = params.includeExpired
      ? sql`
          SELECT * FROM cognitive_bus_messages 
          WHERE target_nuclei @> ${JSON.stringify([params.nucleusId])}::jsonb
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : sql`
          SELECT * FROM cognitive_bus_messages 
          WHERE target_nuclei @> ${JSON.stringify([params.nucleusId])}::jsonb
            AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    const result = await db.execute(query);
    let messages = result.rows as any[];

    // Filter by message type if specified
    if (params.messageType) {
      messages = messages.filter((msg: any) => msg.message_type === params.messageType);
    }

    return messages;
  }

  /**
   * Get Bus Status
   */
  async getStatus(): Promise<any> {
    if (!this.busId) {
      return { status: 'offline', message: 'Bus not initialized' };
    }

    const bus = await db.query.cognitiveBus.findFirst({
      where: eq(cognitiveBus.id, this.busId),
    });

    if (!bus) {
      return { status: 'error', message: 'Bus not found' };
    }

    // Count active messages (all messages, not filtered by bus since we have one global bus)
    const totalMessages = await db.execute(sql`
      SELECT COUNT(*) as count FROM cognitive_bus_messages
    `);
    
    const activeMessages = await db.execute(sql`
      SELECT COUNT(*) as count FROM cognitive_bus_messages 
      WHERE expires_at > NOW()
    `);

    return {
      status: 'online',
      busId: bus.id,
      busName: bus.busName,
      busType: bus.busType,
      isActive: bus.isActive === 1,
      busHealth: bus.busHealth,
      totalMessages: parseInt((totalMessages.rows[0] as any).count) || 0,
      activeMessages: parseInt((activeMessages.rows[0] as any).count) || 0,
      messagesPerSecond: bus.messagesPerSecond,
      avgLatencyMs: bus.avgLatencyMs,
      lastMessageAt: bus.lastMessageAt,
      uptime: this.isRunning,
    };
  }

  /**
   * Update Bus Stats
   */
  private async updateBusStats(messageLatency: number): Promise<void> {
    if (!this.busId) return;

    await db.execute(sql`
      UPDATE cognitive_bus
      SET 
        total_messages = total_messages + 1,
        avg_latency_ms = ((avg_latency_ms * total_messages) + ${messageLatency}) / (total_messages + 1),
        last_message_at = NOW(),
        updated_at = NOW()
      WHERE id = ${this.busId}
    `);
  }

  /**
   * Cleanup Service
   * Removes expired messages periodically
   */
  private startCleanupService(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredMessages();
      } catch (error) {
        console.error('[Cognitive Bus] Cleanup failed:', error);
      }
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Cleanup Expired Messages
   */
  private async cleanupExpiredMessages(): Promise<void> {
    if (!this.busId) return;

    // Use raw SQL to match actual database schema (snake_case)
    const result = await db.execute(sql`
      DELETE FROM cognitive_bus_messages
      WHERE expires_at < NOW()
    `);

    if (result.rowCount && result.rowCount > 0) {
      this.emit('messages_cleaned', { count: result.rowCount });
      console.log(`[Cognitive Bus] Cleaned ${result.rowCount} expired messages`);
    }
  }

  /**
   * Shutdown Bus
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.busId) {
      await db.update(cognitiveBus)
        .set({
          isActive: 0,
          updatedAt: new Date(),
        })
        .where(eq(cognitiveBus.id, this.busId));
    }

    this.emit('bus_shutdown', { busId: this.busId });
    console.log('[Cognitive Bus] Shutdown complete');
  }
}

// Singleton instance
export const cognitiveBusEngine = new CognitiveBusEngine();
