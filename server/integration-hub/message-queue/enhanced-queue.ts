/**
 * ═══════════════════════════════════════════════════════════
 * Enhanced Message Queue - نظام طابور متطور
 * ═══════════════════════════════════════════════════════════
 * Database-backed persistent message queue with retry logic
 * Professional implementation - Abu Sham Vision
 */

import { EventEmitter } from 'events';
import { db } from '../../db';
import { integrationQueueJobs } from '@shared/schema';
import { eq, and, lte, or, sql, inArray } from 'drizzle-orm';

export interface QueueMessage {
  id: string;
  topic: string;
  data: any;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maxAttempts?: number;
}

export interface QueueOptions {
  maxAttempts?: number;
  retryDelay?: number;
  batchSize?: number;
  pollingInterval?: number;
}

type MessageProcessor = (data: any) => Promise<void>;

/**
 * Enhanced MessageQueue with Database Persistence
 * - يحفظ الرسائل في Database
 * - Retry mechanism with exponential backoff
 * - Priority queue support
 * - Graceful shutdown
 */
export class EnhancedMessageQueue extends EventEmitter {
  private processors: Map<string, MessageProcessor> = new Map();
  private isRunning: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private activeProcessing: Set<string> = new Set();
  
  private readonly options: Required<QueueOptions>;

  constructor(options: QueueOptions = {}) {
    super();
    
    this.options = {
      maxAttempts: options.maxAttempts || 3,
      retryDelay: options.retryDelay || 1000, // 1 second base
      batchSize: options.batchSize || 10,
      pollingInterval: options.pollingInterval || 2000, // 2 seconds
    };
  }

  /**
   * تهيئة النظام
   * Initialize queue system
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('[EnhancedQueue] ⚠️  Already initialized');
      return;
    }

    console.log('[EnhancedQueue] 🚀 Initializing Enhanced Message Queue...');

    try {
      // تنظيف الرسائل المعلقة القديمة (أكثر من 24 ساعة)
      await this.cleanupStaleJobs();
      
      // بدء Polling Loop
      this.startPolling();
      
      this.isRunning = true;
      console.log('[EnhancedQueue] ✅ Enhanced Message Queue initialized');
      this.emit('initialized');
    } catch (error: any) {
      console.error('[EnhancedQueue] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * نشر رسالة في الطابور
   * Publish message to queue
   */
  async publish(topic: string, data: any, options: Partial<QueueMessage> = {}): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Queue is not initialized');
    }

    try {
      const [job] = await db.insert(integrationQueueJobs).values({
        topic,
        data,
        priority: options.priority || 'MEDIUM',
        maxAttempts: options.maxAttempts || this.options.maxAttempts,
        status: 'PENDING',
        attempts: 0,
      }).returning();

      console.log(`[EnhancedQueue] 📥 Published: ${topic} (${job.id})`);
      this.emit('message.published', { topic, messageId: job.id });

      // Trigger immediate processing
      setImmediate(() => this.processMessages());

      return job.id;
    } catch (error: any) {
      console.error(`[EnhancedQueue] ❌ Failed to publish ${topic}:`, error);
      throw error;
    }
  }

  /**
   * الاشتراك في طابور
   * Subscribe to topic
   */
  async subscribe(topic: string, processor: MessageProcessor): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Queue is not initialized');
    }

    this.processors.set(topic, processor);
    console.log(`[EnhancedQueue] 📥 Subscribed to: ${topic}`);

    // Process pending messages immediately
    setImmediate(() => this.processMessages(topic));
  }

  /**
   * إلغاء الاشتراك من طابور
   * Unsubscribe from topic
   */
  unsubscribe(topic: string): void {
    this.processors.delete(topic);
    console.log(`[EnhancedQueue] 📤 Unsubscribed from: ${topic}`);
  }

  /**
   * معالجة الرسائل من قاعدة البيانات - WITH ROW-LEVEL LOCKING
   * Process messages from database (NO DUPLICATE PROCESSING!)
   */
  private async processMessages(specificTopic?: string): Promise<void> {
    if (!this.isRunning) return;

    try {
      // جلب الرسائل المعلقة مع EXCLUSIVE LOCK
      // Uses SELECT FOR UPDATE SKIP LOCKED to prevent duplicate processing
      const pendingJobs = await db.transaction(async (tx) => {
        // Use raw SQL for SELECT FOR UPDATE SKIP LOCKED
        // Priority ordering: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1
        const jobs = await tx.execute(sql`
          SELECT * FROM ${integrationQueueJobs}
          WHERE (
            status = 'PENDING'
            OR (
              status = 'FAILED' 
              AND next_retry_at <= NOW()
            )
          )
          ${specificTopic ? sql`AND topic = ${specificTopic}` : sql``}
          ORDER BY 
            CASE priority
              WHEN 'CRITICAL' THEN 4
              WHEN 'HIGH' THEN 3
              WHEN 'MEDIUM' THEN 2
              WHEN 'LOW' THEN 1
              ELSE 0
            END DESC,
            created_at ASC
          LIMIT ${this.options.batchSize}
          FOR UPDATE SKIP LOCKED
        `);

        // Normalize snake_case to camelCase
        const normalizedJobs = jobs.rows.map((row: any) => ({
          ...row,
          maxAttempts: row.max_attempts,
          nextRetryAt: row.next_retry_at,
          createdAt: row.created_at,
          startedAt: row.started_at,
          completedAt: row.completed_at,
        }));

        // Mark as PROCESSING immediately within transaction
        if (normalizedJobs.length > 0) {
          const jobIds = normalizedJobs.map((row: any) => row.id);
          
          await tx.update(integrationQueueJobs)
            .set({
              status: 'PROCESSING',
              startedAt: new Date(),
            })
            .where(
              inArray(integrationQueueJobs.id, jobIds)
            );
        }

        return normalizedJobs;
      });

      if (pendingJobs.length === 0) {
        return;
      }

      console.log(`[EnhancedQueue] 🔄 Processing ${pendingJobs.length} locked jobs (row-level locking active)`);

      // معالجة كل رسالة (already locked and marked as PROCESSING)
      await Promise.allSettled(
        pendingJobs.map(job => this.processJob(job))
      );

    } catch (error: any) {
      console.error('[EnhancedQueue] ❌ Error processing messages:', error);
    }
  }

  /**
   * معالجة رسالة واحدة
   * Process single job (already locked and marked as PROCESSING)
   */
  private async processJob(job: any): Promise<void> {
    const processingKey = `${job.id}`;
    
    // تجنب المعالجة المكررة
    if (this.activeProcessing.has(processingKey)) {
      return;
    }

    this.activeProcessing.add(processingKey);

    try {
      const processor = this.processors.get(job.topic);
      
      if (!processor) {
        console.warn(`[EnhancedQueue] ⚠️  No processor for topic: ${job.topic}`);
        
        // Revert to PENDING if no processor registered
        await db.update(integrationQueueJobs)
          .set({
            status: 'PENDING',
            error: `No processor registered for topic: ${job.topic}`,
          })
          .where(eq(integrationQueueJobs.id, job.id));
        
        return;
      }

      // Update attempts count (status is already PROCESSING from transaction)
      await db.update(integrationQueueJobs)
        .set({
          attempts: job.attempts + 1,
        })
        .where(eq(integrationQueueJobs.id, job.id));

      console.log(`[EnhancedQueue] ▶️  Processing ${job.topic} (attempt ${job.attempts + 1}/${job.maxAttempts})`);

      // تنفيذ المعالج
      await processor(job.data);

      // تحديث الحالة إلى COMPLETED
      await db.update(integrationQueueJobs)
        .set({
          status: 'COMPLETED',
          completedAt: new Date(),
        })
        .where(eq(integrationQueueJobs.id, job.id));

      console.log(`[EnhancedQueue] ✅ Completed ${job.topic} (${job.id})`);
      this.emit('message.processed', { topic: job.topic, messageId: job.id });

    } catch (error: any) {
      console.error(`[EnhancedQueue] ❌ Failed processing ${job.topic}:`, error);

      const newAttempts = job.attempts + 1;
      
      if (newAttempts >= job.maxAttempts) {
        // فشل نهائي
        await db.update(integrationQueueJobs)
          .set({
            status: 'FAILED',
            error: error.message,
            completedAt: new Date(),
          })
          .where(eq(integrationQueueJobs.id, job.id));

        console.error(`[EnhancedQueue] 💥 Job failed permanently: ${job.id}`);
        this.emit('message.failed', { 
          topic: job.topic, 
          messageId: job.id, 
          error: error.message 
        });
      } else {
        // إعادة المحاولة مع Exponential Backoff
        const retryDelay = this.options.retryDelay * Math.pow(2, newAttempts - 1);
        const nextRetryAt = new Date(Date.now() + retryDelay);

        await db.update(integrationQueueJobs)
          .set({
            status: 'FAILED', // Will be retried
            error: error.message,
            nextRetryAt,
            attempts: newAttempts,
          })
          .where(eq(integrationQueueJobs.id, job.id));

        console.log(`[EnhancedQueue] 🔄 Retry scheduled for ${job.id} in ${retryDelay}ms`);
      }
    } finally {
      this.activeProcessing.delete(processingKey);
    }
  }

  /**
   * بدء حلقة Polling
   * Start polling loop
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(() => {
      this.processMessages();
    }, this.options.pollingInterval);

    console.log(`[EnhancedQueue] 🔄 Polling started (interval: ${this.options.pollingInterval}ms)`);
  }

  /**
   * إيقاف حلقة Polling
   * Stop polling loop
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[EnhancedQueue] ⏸️  Polling stopped');
    }
  }

  /**
   * تنظيف الرسائل المعلقة القديمة
   * Clean up stale jobs (older than 24 hours)
   */
  private async cleanupStaleJobs(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await db.delete(integrationQueueJobs)
        .where(
          and(
            eq(integrationQueueJobs.status, 'PROCESSING'),
            lte(integrationQueueJobs.startedAt, oneDayAgo)
          )
        );

      console.log(`[EnhancedQueue] 🧹 Cleaned up stale jobs`);
    } catch (error: any) {
      console.error('[EnhancedQueue] ❌ Cleanup failed:', error);
    }
  }

  /**
   * الحصول على إحصائيات الطابور
   * Get queue statistics
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const stats = await db.select({
        topic: integrationQueueJobs.topic,
        status: integrationQueueJobs.status,
      })
      .from(integrationQueueJobs);

      const grouped = stats.reduce((acc, row) => {
        if (!acc[row.topic]) {
          acc[row.topic] = { pending: 0, processing: 0, completed: 0, failed: 0 };
        }
        const status = (row.status || 'pending').toLowerCase();
        if (status in acc[row.topic]) {
          acc[row.topic][status]++;
        }
        return acc;
      }, {} as Record<string, any>);

      return {
        topics: Object.keys(this.processors),
        ...grouped,
      };
    } catch (error: any) {
      console.error('[EnhancedQueue] ❌ Failed to get stats:', error);
      return {};
    }
  }

  /**
   * إيقاف النظام بأمان
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[EnhancedQueue] 🛑 Shutting down...');
    
    this.isRunning = false;
    this.stopPolling();

    // انتظار إكمال المعالجات النشطة
    const maxWait = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (this.activeProcessing.size > 0 && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeProcessing.size > 0) {
      console.warn(`[EnhancedQueue] ⚠️  ${this.activeProcessing.size} jobs still processing`);
    }

    console.log('[EnhancedQueue] ✅ Shutdown complete');
    this.emit('shutdown');
  }
}
