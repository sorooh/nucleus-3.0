/**
 * Nucleus 3.0 - Metrics Collection System
 * 
 * نظام جمع المقاييس والإحصائيات
 * يدعم Prometheus format وتصدير real-time metrics
 */

import { EventEmitter } from 'events';

/**
 * Metric Types
 */
type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric Value Interface
 */
interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

/**
 * Histogram Configuration
 */
interface HistogramConfig {
  buckets?: number[]; // Bucket boundaries
  maxSize?: number; // Max values to keep in memory
}

/**
 * Metrics Collector
 */
export class MetricsCollector extends EventEmitter {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private summaries = new Map<string, MetricValue[]>();
  private metricTypes = new Map<string, MetricType>();
  private metricLabels = new Map<string, Record<string, string>>();

  // Histogram configuration
  private histogramConfigs = new Map<string, HistogramConfig>();
  private defaultHistogramBuckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10];

  constructor() {
    super();
    this.startPeriodicCollection();
  }

  /**
   * Start periodic metrics collection
   */
  private startPeriodicCollection(): void {
    // Collect memory metrics every 30 seconds
    setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);

    // Emit metrics event every minute
    setInterval(() => {
      this.emit('metrics-collected', this.getMetricsSnapshot());
    }, 60000);
  }

  /**
   * Increment Counter
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    this.metricTypes.set(name, 'counter');

    if (labels) {
      this.metricLabels.set(key, labels);
    }

    this.emit('counter-incremented', { name, value, labels });
  }

  /**
   * Decrement Counter
   */
  decrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.incrementCounter(name, -value, labels);
  }

  /**
   * Set Gauge Value
   */
  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
    this.metricTypes.set(name, 'gauge');

    if (labels) {
      this.metricLabels.set(key, labels);
    }

    this.emit('gauge-recorded', { name, value, labels });
  }

  /**
   * Record Histogram Value
   */
  recordHistogram(name: string, value: number, config?: HistogramConfig): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
      this.metricTypes.set(name, 'histogram');

      if (config) {
        this.histogramConfigs.set(name, config);
      }
    }

    const values = this.histograms.get(name)!;
    values.push(value);

    // Limit size
    const maxSize = config?.maxSize || 1000;
    if (values.length > maxSize) {
      values.shift(); // Remove oldest
    }

    this.emit('histogram-recorded', { name, value });
  }

  /**
   * Record Summary Value
   */
  recordSummary(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);

    if (!this.summaries.has(key)) {
      this.summaries.set(key, []);
      this.metricTypes.set(name, 'summary');
    }

    const values = this.summaries.get(key)!;
    values.push({
      value,
      timestamp: Date.now(),
      labels,
    });

    // Keep last 100 values
    if (values.length > 100) {
      values.shift();
    }

    this.emit('summary-recorded', { name, value, labels });
  }

  /**
   * Record Timing (convenience method)
   */
  recordTiming(operation: string, durationMs: number, labels?: Record<string, string>): void {
    this.recordHistogram(`${operation}.duration`, durationMs);
    this.incrementCounter(`${operation}.calls`, 1, labels);

    this.emit('timing-recorded', { operation, durationMs, labels });
  }

  /**
   * Record AI Decision
   */
  recordAIDecision(model: string, confidence: number, success: boolean, labels?: Record<string, string>): void {
    this.recordGauge(`ai.${model}.confidence`, confidence, labels);
    this.incrementCounter(`ai.${model}.${success ? 'success' : 'failure'}`, 1, labels);
    this.recordHistogram(`ai.${model}.confidence.distribution`, confidence);

    this.emit('ai-decision-recorded', { model, confidence, success, labels });
  }

  /**
   * Record API Request
   */
  recordAPIRequest(
    platformId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    durationMs: number
  ): void {
    const labels = {
      platform: platformId,
      endpoint,
      method,
      status: statusCode.toString(),
    };

    this.incrementCounter('api.requests.total', 1, labels);
    this.recordHistogram('api.request.duration', durationMs);

    if (statusCode >= 500) {
      this.incrementCounter('api.errors.5xx', 1, labels);
    } else if (statusCode >= 400) {
      this.incrementCounter('api.errors.4xx', 1, labels);
    } else if (statusCode >= 200 && statusCode < 300) {
      this.incrementCounter('api.success', 1, labels);
    }

    this.emit('api-request-recorded', { platformId, endpoint, method, statusCode, durationMs });
  }

  /**
   * Record Rate Limit Event
   */
  recordRateLimit(platformId: string, limitType: 'rpm' | 'rph' | 'rpd', exceeded: boolean): void {
    const labels = { platform: platformId, type: limitType };

    this.incrementCounter(`rate_limit.checks.total`, 1, labels);

    if (exceeded) {
      this.incrementCounter(`rate_limit.exceeded.total`, 1, labels);
    }

    this.emit('rate-limit-recorded', { platformId, limitType, exceeded });
  }

  /**
   * Record Memory Usage
   */
  recordMemoryUsage(): void {
    const usage = process.memoryUsage();

    this.recordGauge('memory.heap.used', usage.heapUsed);
    this.recordGauge('memory.heap.total', usage.heapTotal);
    this.recordGauge('memory.rss', usage.rss);
    this.recordGauge('memory.external', usage.external);
    this.recordGauge('memory.array_buffers', usage.arrayBuffers || 0);

    // Calculate percentage
    const heapPercentage = (usage.heapUsed / usage.heapTotal) * 100;
    this.recordGauge('memory.heap.percentage', heapPercentage);

    this.emit('memory-recorded', usage);
  }

  /**
   * Record Error
   */
  recordError(errorType: string, operation?: string, labels?: Record<string, string>): void {
    const errorLabels = {
      ...labels,
      type: errorType,
      ...(operation && { operation }),
    };

    this.incrementCounter('errors.total', 1, errorLabels);

    this.emit('error-recorded', { errorType, operation, labels });
  }

  /**
   * Get Histogram Statistics
   */
  private getHistogramStats(values: number[]): any {
    if (values.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const count = sorted.length;

    return {
      count,
      sum,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / count,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Calculate Percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Get Summary Statistics
   */
  private getSummaryStats(values: MetricValue[]): any {
    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, recent: 0 };
    }

    const numbers = values.map((v) => v.value);
    const sum = numbers.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      recent: values[values.length - 1].value,
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export Counters
    for (const [key, value] of Array.from(this.counters.entries())) {
      const { name, labels } = this.parseMetricKey(key);
      const labelsStr = this.formatPrometheusLabels(labels);
      lines.push(`# TYPE nucleus_${name}_total counter`);
      lines.push(`nucleus_${name}_total${labelsStr} ${value}`);
    }

    // Export Gauges
    for (const [key, value] of Array.from(this.gauges.entries())) {
      const { name, labels } = this.parseMetricKey(key);
      const labelsStr = this.formatPrometheusLabels(labels);
      lines.push(`# TYPE nucleus_${name} gauge`);
      lines.push(`nucleus_${name}${labelsStr} ${value}`);
    }

    // Export Histograms
    for (const [name, values] of Array.from(this.histograms.entries())) {
      const stats = this.getHistogramStats(values);
      const config = this.histogramConfigs.get(name);
      const buckets = config?.buckets || this.defaultHistogramBuckets;

      lines.push(`# TYPE nucleus_${name} histogram`);
      lines.push(`nucleus_${name}_count ${stats.count}`);
      lines.push(`nucleus_${name}_sum ${stats.sum}`);

      // Bucket counts
      for (const bucket of buckets) {
        const count = values.filter((v) => v <= bucket).length;
        lines.push(`nucleus_${name}_bucket{le="${bucket}"} ${count}`);
      }

      lines.push(`nucleus_${name}_bucket{le="+Inf"} ${stats.count}`);
    }

    // Export Summaries
    for (const [key, values] of Array.from(this.summaries.entries())) {
      const { name, labels } = this.parseMetricKey(key);
      const stats = this.getSummaryStats(values);
      const labelsStr = this.formatPrometheusLabels(labels);

      lines.push(`# TYPE nucleus_${name} summary`);
      lines.push(`nucleus_${name}_count${labelsStr} ${stats.count}`);
      lines.push(`nucleus_${name}_sum${labelsStr} ${stats.sum}`);
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): any {
    const metrics: any = {
      counters: {},
      gauges: {},
      histograms: {},
      summaries: {},
      timestamp: new Date().toISOString(),
    };

    // Export Counters
    for (const [key, value] of Array.from(this.counters.entries())) {
      const { name, labels } = this.parseMetricKey(key);
      if (!metrics.counters[name]) metrics.counters[name] = [];
      metrics.counters[name].push({ value, labels });
    }

    // Export Gauges
    for (const [key, value] of Array.from(this.gauges.entries())) {
      const { name, labels } = this.parseMetricKey(key);
      if (!metrics.gauges[name]) metrics.gauges[name] = [];
      metrics.gauges[name].push({ value, labels });
    }

    // Export Histograms
    for (const [name, values] of Array.from(this.histograms.entries())) {
      metrics.histograms[name] = this.getHistogramStats(values);
    }

    // Export Summaries
    for (const [key, values] of Array.from(this.summaries.entries())) {
      const { name, labels } = this.parseMetricKey(key);
      if (!metrics.summaries[name]) metrics.summaries[name] = [];
      metrics.summaries[name].push({
        ...this.getSummaryStats(values),
        labels,
      });
    }

    return metrics;
  }

  /**
   * Get metrics snapshot
   */
  getMetricsSnapshot(): any {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([name, values]) => [name, this.getHistogramStats(values)])
      ),
      summaries: Object.fromEntries(
        Array.from(this.summaries.entries()).map(([key, values]) => [key, this.getSummaryStats(values)])
      ),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get metric key with labels
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `${name}{${labelStr}}`;
  }

  /**
   * Parse metric key back to name and labels
   */
  private parseMetricKey(key: string): { name: string; labels?: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{([^}]+)\})?$/);

    if (!match) {
      return { name: key };
    }

    const name = match[1];
    const labelsStr = match[2];

    if (!labelsStr) {
      return { name };
    }

    const labels: Record<string, string> = {};
    const labelPairs = labelsStr.split(',');

    for (const pair of labelPairs) {
      const [k, v] = pair.split('=');
      labels[k] = (v as string).replace(/"/g, '');
    }

    return { name, labels };
  }

  /**
   * Format Prometheus labels
   */
  private formatPrometheusLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const formatted = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `{${formatted}}`;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
    this.metricTypes.clear();
    this.metricLabels.clear();

    this.emit('metrics-reset');
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): any {
    const type = this.metricTypes.get(name);

    if (!type) {
      return null;
    }

    switch (type) {
      case 'counter':
        return {
          type: 'counter',
          value: this.counters.get(name) || 0,
        };

      case 'gauge':
        return {
          type: 'gauge',
          value: this.gauges.get(name) || 0,
        };

      case 'histogram':
        return {
          type: 'histogram',
          stats: this.getHistogramStats(this.histograms.get(name) || []),
        };

      case 'summary':
        return {
          type: 'summary',
          stats: this.getSummaryStats(this.summaries.get(name) || []),
        };

      default:
        return null;
    }
  }
}

// Singleton instance
let metricsInstance: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}
