/**
 * ═══════════════════════════════════════════════════════════
 * In-Memory Message Queue
 * ═══════════════════════════════════════════════════════════
 * نظام طابور رسائل بسيط قائم على Events
 * Event-driven lightweight queue for Integration Hub
 * Built from absolute zero - Abu Sham Vision
 */

import { EventEmitter } from 'events';

interface QueueMessage {
  id: string;
  topic: string;
  data: any;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
}

interface QueueOptions {
  maxAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

type MessageProcessor = (data: any) => Promise<void>;

export class MessageQueue extends EventEmitter {
  private queues: Map<string, QueueMessage[]> = new Map();
  private processors: Map<string, MessageProcessor> = new Map();
  private processing: Set<string> = new Set();
  private isRunning: boolean = false;

  constructor() {
    super();
  }

  /**
   * تهيئة النظام
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('[MessageQueue] ⚠️  Already initialized');
      return;
    }

    const queueNames = [
      'analysis.job.created',
      'analysis.job.completed',
      'deployment.requested',
      'deployment.completed',
      'health.check',
      'nucleus.registered'
    ];

    for (const name of queueNames) {
      this.queues.set(name, []);
    }

    this.isRunning = true;
    console.log('[MessageQueue] ✅ Message Queue initialized');
    this.emit('initialized');
  }

  /**
   * نشر رسالة في طابور
   */
  async publish(topic: string, data: any, options: QueueOptions = {}): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Message Queue is not initialized');
    }

    const message: QueueMessage = {
      id: this.generateId(),
      topic,
      data,
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3
    };

    let queue = this.queues.get(topic);
    if (!queue) {
      queue = [];
      this.queues.set(topic, queue);
    }

    queue.push(message);
    this.emit('message.published', { topic, messageId: message.id });

    // معالجة فورية إذا كان هناك معالج
    setImmediate(() => this.processQueue(topic));

    return message.id;
  }

  /**
   * الاشتراك في طابور
   */
  async subscribe(topic: string, processor: MessageProcessor): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Message Queue is not initialized');
    }

    this.processors.set(topic, processor);
    console.log(`[MessageQueue] 📥 Subscribed to: ${topic}`);

    // معالجة الرسائل المعلقة
    setImmediate(() => this.processQueue(topic));
  }

  /**
   * معالجة طابور محدد
   */
  private async processQueue(topic: string): Promise<void> {
    const processingKey = `processing:${topic}`;
    
    if (this.processing.has(processingKey)) {
      return;
    }

    this.processing.add(processingKey);

    try {
      const queue = this.queues.get(topic);
      const processor = this.processors.get(topic);

      if (!queue || !processor || queue.length === 0) {
        return;
      }

      while (queue.length > 0) {
        const message = queue.shift();
        if (!message) continue;

        try {
          await processor(message.data);
          this.emit('message.processed', { topic, messageId: message.id });
        } catch (error: any) {
          message.attempts++;
          
          if (message.attempts < message.maxAttempts) {
            queue.push(message);
            console.error(`[MessageQueue] ❌ Failed processing ${message.id}, retry ${message.attempts}/${message.maxAttempts}`);
          } else {
            console.error(`[MessageQueue] ❌ Failed processing ${message.id} after ${message.maxAttempts} attempts:`, error);
            this.emit('message.failed', { topic, messageId: message.id, error });
          }
        }
      }
    } finally {
      this.processing.delete(processingKey);
    }
  }

  /**
   * الحصول على إحصائيات
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [topic, queue] of Array.from(this.queues.entries())) {
      stats[topic] = {
        pending: queue.length,
        hasProcessor: this.processors.has(topic)
      };
    }

    return stats;
  }

  /**
   * إيقاف النظام
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.queues.clear();
    this.processors.clear();
    this.processing.clear();
    console.log('[MessageQueue] ✅ Message Queue shutdown');
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
