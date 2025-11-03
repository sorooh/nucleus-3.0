/**
 * TELEMETRY COLLECTOR
 * Collects real-time metrics from all nuclei
 * - Performance metrics (latency, throughput, errors)
 * - Resource usage (CPU, memory, requests)
 * - Operation success rates
 */

import { db } from "../db";
import { evolutionMetrics } from "@shared/schema";
import { sql } from "drizzle-orm";
import { EventEmitter } from 'events';

interface MetricData {
  nucleusId: string;
  metricType: 'latency' | 'errors' | 'throughput' | 'resources';
  metricName: string;
  value: number;
  unit: string;
  operation?: string;
  endpoint?: string;
  tags?: Record<string, any>;
}

export class TelemetryCollector extends EventEmitter {
  private runId: string | null = null;
  private collectionInterval: NodeJS.Timeout | null = null;
  private metricsBuffer: MetricData[] = [];
  private continuousMode = false;

  constructor() {
    super();
    console.log('[Telemetry Collector] 📊 Initializing...');
  }

  /**
   * Start continuous monitoring (without evolution run)
   * Collects baseline metrics for health monitoring
   */
  async startContinuousMonitoring() {
    if (this.collectionInterval) {
      console.log('[Telemetry Collector] ⚠️ Collection already running');
      return;
    }

    this.continuousMode = true;
    console.log('[Telemetry Collector] 🔄 Starting continuous monitoring...');

    // Collect baseline metrics every 60 seconds
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);

    // Immediate first collection
    await this.collectSystemMetrics();

    console.log('[Telemetry Collector] ✅ Continuous monitoring active');
  }

  /**
   * Start collecting metrics for a specific evolution run
   */
  async startCollection(runId: string) {
    this.runId = runId;
    this.continuousMode = false;
    console.log(`[Telemetry Collector] ▶️ Starting collection for run: ${runId}`);

    // Stop any existing collection
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    // Collect metrics every 30 seconds during evolution runs
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Immediate first collection
    await this.collectSystemMetrics();

    this.emit('collection:started', { runId });
  }

  /**
   * Stop collecting metrics
   */
  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    // Flush buffer
    if (this.metricsBuffer.length > 0) {
      this.flushMetrics();
    }

    console.log('[Telemetry Collector] ⏸️ Collection stopped');
    this.emit('collection:stopped');
  }

  /**
   * Collect system-wide metrics
   * HONEST VERSION: Only collects REAL metrics from actual Node.js process
   * No simulations, no Math.random(), no fake data
   */
  private async collectSystemMetrics() {
    // In continuous mode, we collect baseline metrics without storing to DB
    // In evolution mode, we need a runId to store metrics
    if (!this.continuousMode && !this.runId) return;

    const metrics: MetricData[] = [];

    // Get REAL process memory usage from Node.js
    const memUsage = process.memoryUsage();
    
    // REAL memory metrics for nicholas-core (the actual running process)
    metrics.push({
      nucleusId: 'nicholas-core',
      metricType: 'resources',
      metricName: 'memory_heap_used',
      value: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      unit: 'MB',
      tags: { component: 'nodejs-process' }
    });

    metrics.push({
      nucleusId: 'nicholas-core',
      metricType: 'resources',
      metricName: 'memory_heap_total',
      value: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      unit: 'MB',
      tags: { component: 'nodejs-process' }
    });

    metrics.push({
      nucleusId: 'nicholas-core',
      metricType: 'resources',
      metricName: 'memory_rss',
      value: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      unit: 'MB',
      tags: { component: 'nodejs-process' }
    });

    // REAL uptime from Node.js process
    metrics.push({
      nucleusId: 'nicholas-core',
      metricType: 'resources',
      metricName: 'uptime',
      value: Math.round(process.uptime()),
      unit: 'seconds',
      tags: { component: 'nodejs-process' }
    });

    // REAL database latency measurement
    const dbStart = Date.now();
    try {
      await db.execute(sql.raw('SELECT 1'));
      const dbLatency = Date.now() - dbStart;

      metrics.push({
        nucleusId: 'nicholas-core',
        metricType: 'latency',
        metricName: 'database_ping',
        value: dbLatency,
        unit: 'ms',
        operation: 'health_check',
        tags: { database: 'postgresql' }
      });
    } catch (error: any) {
      metrics.push({
        nucleusId: 'nicholas-core',
        metricType: 'errors',
        metricName: 'database_connection_error',
        value: 1,
        unit: 'count',
        tags: { error: error.message }
      });
    }

    // Store metrics
    this.metricsBuffer.push(...metrics);

    // Flush if buffer is large
    if (this.metricsBuffer.length >= 20) {
      await this.flushMetrics();
    }

    console.log(`[Telemetry Collector] 📈 Collected ${metrics.length} REAL metrics from nicholas-core`);
  }

  /**
   * Record a custom metric (called by other parts of the system)
   */
  async recordMetric(data: MetricData) {
    if (!this.continuousMode && !this.runId) return;

    this.metricsBuffer.push(data);

    // Auto-flush if buffer gets large
    if (this.metricsBuffer.length >= 50) {
      await this.flushMetrics();
    }
  }

  /**
   * Flush metrics buffer to database
   * Only flushes if we have a runId (evolution mode)
   * In continuous mode, metrics are just collected for monitoring
   */
  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;
    
    // In continuous mode, just emit metrics and clear buffer
    if (this.continuousMode) {
      this.emit('metrics:collected', { 
        metrics: this.metricsBuffer,
        count: this.metricsBuffer.length 
      });
      this.metricsBuffer = [];
      return;
    }
    
    // In evolution mode, store to database
    if (!this.runId) return;

    const toFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await db.insert(evolutionMetrics).values(
        toFlush.map(m => ({
          runId: this.runId!,
          nucleusId: m.nucleusId,
          metricType: m.metricType,
          metricName: m.metricName,
          value: m.value.toString(),
          unit: m.unit,
          operation: m.operation,
          endpoint: m.endpoint,
          tags: m.tags,
        }))
      );

      console.log(`[Telemetry Collector] 💾 Flushed ${toFlush.length} metrics to database`);
      this.emit('metrics:flushed', { count: toFlush.length });
    } catch (error: any) {
      console.error('[Telemetry Collector] ❌ Failed to flush metrics:', error.message);
      // Put back in buffer for retry
      this.metricsBuffer.unshift(...toFlush);
    }
  }

  /**
   * Get collection status
   */
  getStatus() {
    return {
      isCollecting: this.collectionInterval !== null,
      runId: this.runId,
      continuousMode: this.continuousMode,
      bufferSize: this.metricsBuffer.length,
    };
  }
}

export const telemetryCollector = new TelemetryCollector();
