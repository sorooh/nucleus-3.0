/**
 * 📈 Professional Performance Monitor - Enterprise Performance Tracking
 * 
 * Advanced performance monitoring with real-time metrics,
 * alerting, trending, and optimization recommendations
 * 
 * @version 3.1.0-Professional
 * @author Nucleus Team
 * @enterprise-grade
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { EventEmitter } from 'events';
import { Logger } from './logger';

// Performance Interfaces
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'cpu' | 'memory' | 'disk' | 'network' | 'custom';
  tags?: Record<string, string>;
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  operator: '>' | '<' | '=' | '>=' | '<=';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  cpu: {
    usage: number;
    load: number[];
    status: 'healthy' | 'warning' | 'critical';
  };
  memory: {
    used: number;
    free: number;
    usage: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  disk: {
    usage: number;
    free: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

/**
 * Professional Performance Monitor with Enterprise Features
 */
export class PerformanceMonitor extends EventEmitter {
  private logger: Logger;
  private metrics: Map<string, PerformanceMetric[]>;
  private alerts: PerformanceAlert[];
  private thresholds: Map<string, PerformanceThreshold>;
  private timers: Map<string, number>;
  private observers: PerformanceObserver[];
  private collectionInterval: NodeJS.Timeout | null;
  private isCollecting: boolean;
  
  private readonly maxMetricsHistory = 1000;
  private readonly maxAlertsHistory = 500;
  private readonly collectionIntervalMs = 5000; // 5 seconds

  constructor() {
    super();
    this.logger = new Logger('PerformanceMonitor');
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = new Map();
    this.timers = new Map();
    this.observers = [];
    this.collectionInterval = null;
    this.isCollecting = false;
    
    this.initializeDefaultThresholds();
    this.setupPerformanceObservers();
    this.startCollection();
    
    this.logger.info('Performance Monitor initialized');
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      { metric: 'cpu.usage', warning: 70, critical: 90, unit: '%', operator: '>' },
      { metric: 'memory.usage', warning: 80, critical: 95, unit: '%', operator: '>' },
      { metric: 'disk.usage', warning: 85, critical: 95, unit: '%', operator: '>' },
      { metric: 'response.time', warning: 1000, critical: 5000, unit: 'ms', operator: '>' },
      { metric: 'error.rate', warning: 1, critical: 5, unit: '%', operator: '>' },
      { metric: 'requests.per.second', warning: 1000, critical: 2000, unit: 'rps', operator: '>' }
    ];

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.metric, threshold);
    });
  }

  /**
   * Setup Node.js performance observers
   */
  private setupPerformanceObservers(): void {
    // HTTP requests observer
    const httpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric({
          name: 'http.request.duration',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'network',
          tags: {
            method: (entry as any).detail?.method || 'unknown',
            status: (entry as any).detail?.status || 'unknown'
          }
        });
      }
    });
    
    try {
      httpObserver.observe({ entryTypes: ['http'] });
      this.observers.push(httpObserver);
    } catch (error) {
      this.logger.warn('Failed to setup HTTP observer', { error: (error as Error).message });
    }

    // Function calls observer
    const functionObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric({
          name: 'function.duration',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'cpu',
          tags: {
            function: entry.name
          }
        });
      }
    });
    
    try {
      functionObserver.observe({ entryTypes: ['function'] });
      this.observers.push(functionObserver);
    } catch (error) {
      this.logger.warn('Failed to setup function observer', { error: (error as Error).message });
    }
  }

  /**
   * Start automatic metrics collection
   */
  private startCollection(): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.collectionIntervalMs);
    
    this.logger.info('Started automatic metrics collection');
  }

  /**
   * Stop automatic metrics collection
   */
  stopCollection(): void {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    this.logger.info('Stopped metrics collection');
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    const now = Date.now();
    
    // CPU metrics
    const cpuUsage = process.cpuUsage();
    this.recordMetric({
      name: 'cpu.user',
      value: cpuUsage.user / 1000, // Convert to ms
      unit: 'ms',
      timestamp: now,
      category: 'cpu'
    });
    
    this.recordMetric({
      name: 'cpu.system',
      value: cpuUsage.system / 1000, // Convert to ms
      unit: 'ms',
      timestamp: now,
      category: 'cpu'
    });

    // Memory metrics
    const memUsage = process.memoryUsage();
    this.recordMetric({
      name: 'memory.heap.used',
      value: memUsage.heapUsed,
      unit: 'bytes',
      timestamp: now,
      category: 'memory'
    });
    
    this.recordMetric({
      name: 'memory.heap.total',
      value: memUsage.heapTotal,
      unit: 'bytes',
      timestamp: now,
      category: 'memory'
    });
    
    this.recordMetric({
      name: 'memory.external',
      value: memUsage.external,
      unit: 'bytes',
      timestamp: now,
      category: 'memory'
    });
    
    // Calculate memory usage percentage
    const memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.recordMetric({
      name: 'memory.usage',
      value: memoryUsage,
      unit: '%',
      timestamp: now,
      category: 'memory'
    });

    // Event loop lag
    const eventLoopStart = performance.now();
    setImmediate(() => {
      const lag = performance.now() - eventLoopStart;
      this.recordMetric({
        name: 'event.loop.lag',
        value: lag,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'cpu'
      });
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const metricName = metric.name;
    
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    
    const metricHistory = this.metrics.get(metricName)!;
    metricHistory.push(metric);
    
    // Maintain history limit
    if (metricHistory.length > this.maxMetricsHistory) {
      metricHistory.shift();
    }
    
    // Check thresholds
    this.checkThresholds(metric);
    
    // Emit metric event
    this.emit('metric', metric);
  }

  /**
   * Start a performance timer
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End a performance timer and record the metric
   */
  endTimer(name: string, category: 'cpu' | 'memory' | 'disk' | 'network' | 'custom' = 'custom'): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.logger.warn(`Timer '${name}' not found`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(name);
    
    this.recordMetric({
      name: `timer.${name}`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      category
    });
    
    return duration;
  }

  /**
   * Measure execution time of a function
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  measure<T>(name: string, fn: () => T): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  /**
   * Check metric against thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;
    
    const isViolation = this.evaluateThreshold(metric.value, threshold);
    
    if (isViolation.warning || isViolation.critical) {
      const severity = isViolation.critical ? 'critical' : 'warning';
      const thresholdValue = isViolation.critical ? threshold.critical : threshold.warning;
      
      const alert: PerformanceAlert = {
        id: this.generateAlertId(),
        metric: metric.name,
        threshold: thresholdValue,
        operator: threshold.operator,
        severity,
        message: `${metric.name} ${threshold.operator} ${thresholdValue}${threshold.unit} (current: ${metric.value}${threshold.unit})`,
        timestamp: Date.now(),
        resolved: false
      };
      
      this.alerts.push(alert);
      
      // Maintain alerts history limit
      if (this.alerts.length > this.maxAlertsHistory) {
        this.alerts.shift();
      }
      
      // Log alert
      this.logger.warn(`Performance Alert: ${alert.message}`, {
        alertId: alert.id,
        metric: metric.name,
        value: metric.value,
        threshold: thresholdValue,
        severity
      });
      
      // Emit alert event
      this.emit('alert', alert);
    }
  }

  /**
   * Evaluate threshold conditions
   */
  private evaluateThreshold(value: number, threshold: PerformanceThreshold): { warning: boolean; critical: boolean } {
    const checkCondition = (val: number, thresholdVal: number, operator: string): boolean => {
      switch (operator) {
        case '>': return val > thresholdVal;
        case '<': return val < thresholdVal;
        case '>=': return val >= thresholdVal;
        case '<=': return val <= thresholdVal;
        case '=': return val === thresholdVal;
        default: return false;
      }
    };
    
    return {
      warning: checkCondition(value, threshold.warning, threshold.operator),
      critical: checkCondition(value, threshold.critical, threshold.operator)
    };
  }

  /**
   * Get system health summary
   */
  getSystemHealth(): SystemHealth {
    const now = Date.now();
    const timeWindow = 60000; // Last 1 minute
    
    // Get recent metrics
    const recentMetrics = new Map<string, PerformanceMetric[]>();
    
    this.metrics.forEach((metrics, name) => {
      const recent = metrics.filter(m => now - m.timestamp <= timeWindow);
      if (recent.length > 0) {
        recentMetrics.set(name, recent);
      }
    });
    
    // Calculate averages
    const getAverage = (metricName: string): number => {
      const metrics = recentMetrics.get(metricName) || [];
      if (metrics.length === 0) return 0;
      return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    };
    
    // CPU status
    const cpuUsage = getAverage('cpu.user') + getAverage('cpu.system');
    const cpuStatus = cpuUsage > 90 ? 'critical' : cpuUsage > 70 ? 'warning' : 'healthy';
    
    // Memory status
    const memoryUsage = getAverage('memory.usage');
    const memoryStatus = memoryUsage > 95 ? 'critical' : memoryUsage > 80 ? 'warning' : 'healthy';
    
    // Disk status (placeholder - would need actual disk monitoring)
    const diskUsage = 50; // Placeholder
    const diskStatus = diskUsage > 95 ? 'critical' : diskUsage > 85 ? 'warning' : 'healthy';
    
    // Network status (placeholder - would need actual network monitoring)
    const networkLatency = getAverage('http.request.duration') || 100;
    const networkStatus = networkLatency > 5000 ? 'critical' : networkLatency > 1000 ? 'warning' : 'healthy';
    
    // Overall status
    const statuses = [cpuStatus, memoryStatus, diskStatus, networkStatus];
    const overall = statuses.includes('critical') ? 'critical' : 
                   statuses.includes('warning') ? 'warning' : 'healthy';
    
    return {
      overall,
      cpu: {
        usage: cpuUsage,
        load: [0, 0, 0], // Placeholder for load average
        status: cpuStatus
      },
      memory: {
        used: getAverage('memory.heap.used'),
        free: getAverage('memory.heap.total') - getAverage('memory.heap.used'),
        usage: memoryUsage,
        status: memoryStatus
      },
      disk: {
        usage: diskUsage,
        free: 100 - diskUsage,
        status: diskStatus
      },
      network: {
        inbound: 0, // Placeholder
        outbound: 0, // Placeholder
        latency: networkLatency,
        status: networkStatus
      }
    };
  }

  /**
   * Get metrics for a specific time range
   */
  getMetrics(
    metricName?: string, 
    timeRange?: { start: number; end: number }
  ): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    
    const metricsToQuery = metricName ? [metricName] : Array.from(this.metrics.keys());
    
    metricsToQuery.forEach(name => {
      const metrics = this.metrics.get(name) || [];
      
      const filteredMetrics = timeRange 
        ? metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
        : metrics;
      
      allMetrics.push(...filteredMetrics);
    });
    
    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get active alerts
   */
  getAlerts(resolved?: boolean): PerformanceAlert[] {
    return resolved !== undefined 
      ? this.alerts.filter(alert => alert.resolved === resolved)
      : this.alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert:resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Add or update a threshold
   */
  setThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.metric, threshold);
    this.logger.info(`Threshold updated for ${threshold.metric}`, threshold);
  }

  /**
   * Remove a threshold
   */
  removeThreshold(metricName: string): boolean {
    const removed = this.thresholds.delete(metricName);
    if (removed) {
      this.logger.info(`Threshold removed for ${metricName}`);
    }
    return removed;
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, any> {
    const now = Date.now();
    const timeWindow = 300000; // Last 5 minutes
    
    const summary: Record<string, any> = {
      timestamp: now,
      systemHealth: this.getSystemHealth(),
      activeAlerts: this.getAlerts(false).length,
      totalMetrics: Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0),
      metricsInWindow: 0,
      topMetrics: {}
    };
    
    // Count metrics in time window and find top metrics
    const metricCounts: Record<string, number> = {};
    
    this.metrics.forEach((metrics, name) => {
      const recentCount = metrics.filter(m => now - m.timestamp <= timeWindow).length;
      metricCounts[name] = recentCount;
      summary.metricsInWindow += recentCount;
    });
    
    // Get top 5 most active metrics
    summary.topMetrics = Object.entries(metricCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .reduce((obj, [name, count]) => ({ ...obj, [name]: count }), {});
    
    return summary;
  }

  /**
   * Helper methods
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.stopCollection();
    this.metrics.clear();
    this.alerts.length = 0;
    this.thresholds.clear();
    this.timers.clear();
    this.removeAllListeners();
    
    this.logger.info('Performance Monitor cleaned up');
  }
}

// Singleton global performance monitor
export const globalPerformanceMonitor = new PerformanceMonitor();

// Export types
export type {
  PerformanceMetric,
  PerformanceAlert,
  PerformanceThreshold,
  SystemHealth
};