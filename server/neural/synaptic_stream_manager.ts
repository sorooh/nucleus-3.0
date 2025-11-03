/**
 * Synaptic Stream Manager (SSM) - Phase 10.0
 * مدير قنوات التواصل العصبي
 * 
 * ينشئ قنوات تواصل لحظية بين النوى (WebSocket + EventStream)
 * يوزّع البيانات حسب نوعها (Knowledge, Action, Insight, Feedback)
 * يضمن معدل نبض ثابت (Pulse Rate)
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import crypto from 'crypto';
import { db } from '../db';
import { synapticStreams, neuralNodes } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// ============= TYPES =============

export type StreamType = 'knowledge' | 'action' | 'insight' | 'feedback' | 'command';
export type DataFlow = 'bidirectional' | 'outbound' | 'inbound';
export type StreamStatus = 'active' | 'inactive' | 'suspended' | 'error';

export interface SynapticStreamConfig {
  streamId: string;
  streamName: string;
  sourceNode: string;
  targetNode: string;
  streamType: StreamType;
  dataFlow: DataFlow;
  bandwidth?: number; // kbps
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
}

export interface StreamMessage {
  messageId: string;
  streamId: string;
  timestamp: number;
  type: StreamType;
  payload: any;
  compressed?: boolean;
  encrypted?: boolean;
}

export interface StreamMetrics {
  throughput: number; // messages per second
  latency: number; // milliseconds
  packetLoss: number; // 0.0-1.0
  reliability: number; // 0.0-1.0
  stability: number; // 0.0-1.0
}

// ============= SYNAPTIC STREAM MANAGER =============

export class SynapticStreamManager extends EventEmitter {
  private activeStreams: Map<string, any> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private metricsCollector: Map<string, any[]> = new Map();
  
  constructor() {
    super();
    this.startMetricsCollector();
  }

  /**
   * إنشاء Stream جديد بين نواتين
   */
  async createStream(config: SynapticStreamConfig): Promise<any> {
    try {
      // 1. التحقق من وجود النوى
      const [sourceExists, targetExists] = await Promise.all([
        this.checkNodeExists(config.sourceNode),
        this.checkNodeExists(config.targetNode)
      ]);

      if (!sourceExists || !targetExists) {
        throw new Error('Source or target node does not exist');
      }

      // 2. إنشاء Stream في Database
      const generatedStreamId = config.streamId || this.generateStreamId(config.sourceNode, config.targetNode);
      
      const stream = await db.insert(synapticStreams).values({
        streamId: generatedStreamId,
        streamName: config.streamName,
        sourceNode: config.sourceNode,
        targetNode: config.targetNode,
        streamType: config.streamType,
        dataFlow: config.dataFlow,
        bandwidth: config.bandwidth || 1000,
        compressionEnabled: config.compressionEnabled !== false ? 1 : 0,
        encryptionEnabled: config.encryptionEnabled !== false ? 1 : 0,
        status: 'inactive'
      }).returning();

      // 3. حفظ Stream في الذاكرة
      this.activeStreams.set(generatedStreamId, {
        ...stream[0],
        messageQueue: [],
        metrics: {
          messagesTransmitted: 0,
          bytesTransmitted: 0,
          lastMessageAt: null
        }
      });

      // 4. Initialize metrics collector
      this.metricsCollector.set(generatedStreamId, []);

      console.log(`[SSM] ✅ Stream created: ${generatedStreamId} (${config.sourceNode} → ${config.targetNode})`);
      
      const { streamId: _, ...configWithoutId } = config;
      this.emit('stream:created', { streamId: generatedStreamId, ...configWithoutId });
      
      return stream[0];
      
    } catch (error: any) {
      console.error('[SSM] ❌ Failed to create stream:', error.message);
      throw error;
    }
  }

  /**
   * تفعيل Stream
   */
  async activateStream(streamId: string): Promise<boolean> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream) {
        throw new Error(`Stream ${streamId} not found`);
      }

      // Update database
      await db.update(synapticStreams)
        .set({
          status: 'active',
          activatedAt: new Date()
        })
        .where(eq(synapticStreams.streamId, streamId));

      // Update memory
      stream.status = 'active';
      stream.activatedAt = new Date();

      console.log(`[SSM] ✅ Stream activated: ${streamId}`);
      this.emit('stream:activated', { streamId });

      return true;
    } catch (error: any) {
      console.error('[SSM] ❌ Failed to activate stream:', error.message);
      return false;
    }
  }

  /**
   * إرسال رسالة عبر Stream
   */
  async sendMessage(streamId: string, type: StreamType, payload: any): Promise<StreamMessage> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream) {
        throw new Error(`Stream ${streamId} not found`);
      }

      if (stream.status !== 'active') {
        throw new Error(`Stream ${streamId} is not active`);
      }

      // إنشاء رسالة
      const message: StreamMessage = {
        messageId: crypto.randomBytes(16).toString('hex'),
        streamId,
        timestamp: Date.now(),
        type,
        payload,
        compressed: stream.compressionEnabled === 1,
        encrypted: stream.encryptionEnabled === 1
      };

      // Compression (simplified)
      if (message.compressed) {
        // في الإنتاج سنستخدم zlib
        message.payload = JSON.stringify(payload);
      }

      // Encryption (simplified)
      if (message.encrypted) {
        // في الإنتاج سنستخدم AES-256
        message.payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      }

      // حساب حجم الرسالة
      const messageSize = JSON.stringify(message).length;

      // تحديث إحصائيات Stream
      stream.metrics.messagesTransmitted++;
      stream.metrics.bytesTransmitted += messageSize;
      stream.metrics.lastMessageAt = new Date();

      // Update database
      await db.update(synapticStreams)
        .set({
          messagesTransmitted: stream.metrics.messagesTransmitted,
          bytesTransmitted: stream.metrics.bytesTransmitted,
          lastMessageAt: stream.metrics.lastMessageAt
        })
        .where(eq(synapticStreams.streamId, streamId));

      // تسجيل metric
      this.recordMetric(streamId, {
        timestamp: Date.now(),
        messageSize,
        latency: 0 // سيتم تحديثها عند الاستقبال
      });

      // Emit event
      this.emit('message:sent', { streamId, message });

      // إرسال عبر WebSocket إذا كان متصلاً
      const ws = this.wsConnections.get(stream.targetNode);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }

      return message;

    } catch (error: any) {
      console.error('[SSM] ❌ Failed to send message:', error.message);
      throw error;
    }
  }

  /**
   * استقبال رسالة من Stream
   */
  async receiveMessage(streamId: string, message: StreamMessage): Promise<void> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream) {
        throw new Error(`Stream ${streamId} not found`);
      }

      // Decryption
      if (message.encrypted) {
        message.payload = JSON.parse(Buffer.from(message.payload, 'base64').toString());
      }

      // Decompression
      if (message.compressed) {
        message.payload = JSON.parse(message.payload);
      }

      // حساب latency
      const latency = Date.now() - message.timestamp;

      // Update metrics
      this.recordMetric(streamId, {
        timestamp: Date.now(),
        messageSize: JSON.stringify(message).length,
        latency
      });

      // Emit event
      this.emit('message:received', { streamId, message, latency });

      console.log(`[SSM] 📨 Message received on stream ${streamId} (latency: ${latency}ms)`);

    } catch (error: any) {
      console.error('[SSM] ❌ Failed to receive message:', error.message);
    }
  }

  /**
   * إيقاف Stream
   */
  async deactivateStream(streamId: string): Promise<boolean> {
    try {
      const stream = this.activeStreams.get(streamId);
      if (!stream) return false;

      // Update database
      await db.update(synapticStreams)
        .set({
          status: 'inactive',
          deactivatedAt: new Date()
        })
        .where(eq(synapticStreams.streamId, streamId));

      // Update memory
      stream.status = 'inactive';
      stream.deactivatedAt = new Date();

      console.log(`[SSM] ⏸️  Stream deactivated: ${streamId}`);
      this.emit('stream:deactivated', { streamId });

      return true;
    } catch (error: any) {
      console.error('[SSM] ❌ Failed to deactivate stream:', error.message);
      return false;
    }
  }

  /**
   * حذف Stream
   */
  async deleteStream(streamId: string): Promise<boolean> {
    try {
      // حذف من Database
      await db.delete(synapticStreams)
        .where(eq(synapticStreams.streamId, streamId));

      // حذف من الذاكرة
      this.activeStreams.delete(streamId);
      this.metricsCollector.delete(streamId);

      console.log(`[SSM] 🗑️  Stream deleted: ${streamId}`);
      this.emit('stream:deleted', { streamId });

      return true;
    } catch (error: any) {
      console.error('[SSM] ❌ Failed to delete stream:', error.message);
      return false;
    }
  }

  /**
   * الحصول على Stream metrics
   */
  async getStreamMetrics(streamId: string): Promise<StreamMetrics | null> {
    const metrics = this.metricsCollector.get(streamId);
    if (!metrics || metrics.length === 0) return null;

    // حساب المتوسطات
    const recentMetrics = metrics.slice(-100); // آخر 100 رسالة

    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length;
    const avgSize = recentMetrics.reduce((sum, m) => sum + m.messageSize, 0) / recentMetrics.length;
    
    // حساب throughput (messages per second)
    const timeWindow = 60000; // 1 minute
    const recentMessages = metrics.filter((m: any) => Date.now() - m.timestamp < timeWindow);
    const throughput = (recentMessages.length / (timeWindow / 1000));

    return {
      throughput: Math.round(throughput * 100) / 100,
      latency: Math.round(avgLatency),
      packetLoss: 0, // سيتم حسابها لاحقاً
      reliability: 1.0, // سيتم حسابها لاحقاً
      stability: 1.0 // سيتم حسابها لاحقاً
    };
  }

  /**
   * الحصول على جميع Streams النشطة
   */
  getActiveStreams(): any[] {
    return Array.from(this.activeStreams.values()).filter(s => s.status === 'active');
  }

  /**
   * ربط WebSocket connection
   */
  attachWebSocket(nodeName: string, ws: WebSocket): void {
    this.wsConnections.set(nodeName, ws);
    console.log(`[SSM] 🔌 WebSocket attached for node: ${nodeName}`);

    ws.on('message', async (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.streamId) {
          await this.receiveMessage(message.streamId, message);
        }
      } catch (error) {
        console.error('[SSM] Failed to process WS message:', error);
      }
    });

    ws.on('close', () => {
      this.wsConnections.delete(nodeName);
      console.log(`[SSM] 🔌 WebSocket closed for node: ${nodeName}`);
    });
  }

  // ============= HELPER METHODS =============

  private generateStreamId(source: string, target: string): string {
    const timestamp = Date.now();
    return `stream-${source}-${target}-${timestamp}`;
  }

  private async checkNodeExists(nodeName: string): Promise<boolean> {
    try {
      const result = await db.select()
        .from(neuralNodes)
        .where(eq(neuralNodes.nodeName, nodeName))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      return false;
    }
  }

  private recordMetric(streamId: string, metric: any): void {
    const metrics = this.metricsCollector.get(streamId) || [];
    metrics.push(metric);
    
    // الاحتفاظ بآخر 1000 metric فقط
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    this.metricsCollector.set(streamId, metrics);
  }

  /**
   * جمع وتحديث Metrics كل 30 ثانية
   */
  private startMetricsCollector(): void {
    setInterval(async () => {
      const entries = Array.from(this.activeStreams.entries());
      for (const [streamId, stream] of entries) {
        if (stream.status !== 'active') continue;

        const metrics = await this.getStreamMetrics(streamId);
        if (!metrics) continue;

        // Update database
        await db.update(synapticStreams)
          .set({
            throughput: Math.round(metrics.throughput),
            latency: metrics.latency,
            packetLoss: metrics.packetLoss,
            reliability: metrics.reliability,
            stability: metrics.stability
          })
          .where(eq(synapticStreams.streamId, streamId));
      }
    }, 30000); // 30 seconds
  }
}

// ============= SINGLETON INSTANCE =============

let ssmInstance: SynapticStreamManager | null = null;

export function initializeSSM(): SynapticStreamManager {
  if (!ssmInstance) {
    ssmInstance = new SynapticStreamManager();
    console.log('[SSM] ✅ Synaptic Stream Manager initialized');
  }
  return ssmInstance;
}

export function getSSM(): SynapticStreamManager {
  if (!ssmInstance) {
    throw new Error('[SSM] Not initialized. Call initializeSSM() first.');
  }
  return ssmInstance;
}
