/**
 * ProactiveHealthMonitor
 * المراقب الاستباقي - يتوقع المشاكل قبل حدوثها
 */

import { db } from '../storage';
import {
  integrationNuclei,
  platformLinks,
  integrationsRegistry,
  liveMonitoring,
  type InsertLiveMonitoringMetric,
} from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { EventEmitter } from 'events';

interface HealthReport {
  platformId: string;
  platformName: string;
  overallHealth: number;
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  metrics: {
    latency: number;
    successRate: number;
    throughput: number;
    uptime: number;
  };
  predictions: {
    failureRisk: number;
    timeToFailure: string | null;
    recommendations: string[];
  };
}

interface PredictedFailure {
  platformId: string;
  platformName: string;
  probability: number;
  timeframe: string;
  reason: string;
  preventiveMeasures: string[];
}

export class ProactiveHealthMonitor extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 30000; // 30 seconds

  constructor() {
    super();
  }

  /**
   * بدء المراقبة المستمرة
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      return;
    }

    console.log('🔍 [ProactiveMonitor] Starting continuous monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.runHealthCheck();
      } catch (error) {
        console.error('[ProactiveMonitor] Monitoring error:', error);
        this.emit('monitoring:error', error);
      }
    }, this.checkIntervalMs);

    this.emit('monitoring:started');
  }

  /**
   * إيقاف المراقبة
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️  [ProactiveMonitor] Monitoring stopped');
      this.emit('monitoring:stopped');
    }
  }

  /**
   * فحص صحي شامل
   */
  private async runHealthCheck() {
    const platforms = await this.monitorPlatforms();
    
    for (const platform of platforms) {
      if (platform.status === 'critical') {
        this.emit('health:critical', platform);
      } else if (platform.status === 'warning') {
        this.emit('health:warning', platform);
      }

      await this.collectMetrics(platform.platformId, {
        latency: platform.metrics.latency,
        successRate: platform.metrics.successRate,
        throughput: platform.metrics.throughput,
      });
    }

    const failures = await this.predictFailures();
    
    if (failures.length > 0) {
      this.emit('failures:predicted', failures);
    }
  }

  /**
   * مراقبة جميع المنصات
   */
  async monitorPlatforms(): Promise<HealthReport[]> {
    const nuclei = await db.select().from(integrationNuclei);
    const reports: HealthReport[] = [];

    for (const nucleus of nuclei) {
      const links = await db.select()
        .from(platformLinks)
        .where(
          sql`${platformLinks.sourcePlatformId} = ${nucleus.id} OR ${platformLinks.targetPlatformId} = ${nucleus.id}`
        );

      const issues: string[] = [];
      let overallHealth = 100;

      const avgLatency = links.length > 0 
        ? links.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / links.length
        : 0;

      const avgSuccessRate = links.length > 0
        ? links.reduce((sum, l) => sum + parseFloat(l.successRate?.toString() || '1'), 0) / links.length
        : 1;

      const totalThroughput = links.reduce((sum, l) => sum + (l.throughputRpm || 0), 0);

      if (avgLatency > 500) {
        issues.push('زمن استجابة مرتفع');
        overallHealth -= 15;
      }

      if (avgSuccessRate < 0.9) {
        issues.push('معدل نجاح منخفض');
        overallHealth -= 20;
      }

      const brokenLinks = links.filter(l => l.status === 'broken').length;
      if (brokenLinks > 0) {
        issues.push(`${brokenLinks} اتصال معطل`);
        overallHealth -= brokenLinks * 10;
      }

      if (nucleus.status === 'inactive') {
        issues.push('المنصة غير نشطة');
        overallHealth -= 30;
      }

      overallHealth = Math.max(0, overallHealth);

      const status = overallHealth >= 80 ? 'healthy' 
        : overallHealth >= 50 ? 'warning' 
        : 'critical';

      const failureRisk = (100 - overallHealth) / 100;
      const predictions: HealthReport['predictions'] = {
        failureRisk,
        timeToFailure: failureRisk > 0.5 
          ? `${Math.floor((1 - failureRisk) * 24)} ساعات`
          : null,
        recommendations: [],
      };

      if (failureRisk > 0.3) {
        predictions.recommendations.push('زيادة عدد المحاولات في retry_config');
      }

      if (avgLatency > 300) {
        predictions.recommendations.push('تفعيل connection pooling');
      }

      if (brokenLinks > 0) {
        predictions.recommendations.push('إصلاح الاتصالات المعطلة فوراً');
      }

      reports.push({
        platformId: nucleus.id,
        platformName: nucleus.displayName || nucleus.name,
        overallHealth,
        status,
        issues,
        metrics: {
          latency: Math.round(avgLatency),
          successRate: Math.round(avgSuccessRate * 100),
          throughput: totalThroughput,
          uptime: nucleus.status === 'active' ? 99.5 : 0,
        },
        predictions,
      });
    }

    return reports;
  }

  /**
   * جمع المقاييس وتخزينها
   */
  async collectMetrics(nucleusId: string, metrics: {
    latency: number;
    successRate: number;
    throughput: number;
  }) {
    const metricsToStore: InsertLiveMonitoringMetric[] = [
      {
        nucleusId,
        metricType: 'latency',
        metricValue: { value: metrics.latency, unit: 'ms' },
        metricTimestamp: new Date(),
        aggregationPeriod: 'realtime',
        tags: ['performance', 'realtime'],
      },
      {
        nucleusId,
        metricType: 'throughput',
        metricValue: { value: metrics.throughput, unit: 'rpm' },
        metricTimestamp: new Date(),
        aggregationPeriod: 'realtime',
        tags: ['performance', 'realtime'],
      },
      {
        nucleusId,
        metricType: 'error_rate',
        metricValue: { value: (1 - metrics.successRate / 100) * 100, unit: 'percent' },
        metricTimestamp: new Date(),
        aggregationPeriod: 'realtime',
        tags: ['reliability', 'realtime'],
      },
    ];

    await db.insert(liveMonitoring).values(metricsToStore);
  }

  /**
   * توقع الأعطال المستقبلية
   */
  async predictFailures(): Promise<PredictedFailure[]> {
    const reports = await this.monitorPlatforms();
    const predictions: PredictedFailure[] = [];

    for (const report of reports) {
      if (report.predictions.failureRisk > 0.4) {
        const probability = Math.round(report.predictions.failureRisk * 100);
        
        let reason = 'أداء متدهور';
        if (report.issues.includes('اتصال معطل')) {
          reason = 'اتصالات معطلة متعددة';
        } else if (report.metrics.latency > 500) {
          reason = 'زمن استجابة مرتفع جداً';
        } else if (report.metrics.successRate < 80) {
          reason = 'معدل فشل مرتفع';
        }

        predictions.push({
          platformId: report.platformId,
          platformName: report.platformName,
          probability,
          timeframe: report.predictions.timeToFailure || 'خلال 24 ساعة',
          reason,
          preventiveMeasures: report.predictions.recommendations,
        });
      }
    }

    return predictions;
  }

  /**
   * الحصول على مقاييس تاريخية
   */
  async getHistoricalMetrics(nucleusId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await db.select()
      .from(liveMonitoring)
      .where(
        and(
          eq(liveMonitoring.nucleusId, nucleusId),
          sql`${liveMonitoring.metricTimestamp} >= ${since}`
        )
      )
      .orderBy(desc(liveMonitoring.metricTimestamp))
      .limit(1000);

    const latencyData = metrics
      .filter(m => m.metricType === 'latency')
      .map(m => ({
        timestamp: m.metricTimestamp,
        value: (m.metricValue as any)?.value || 0,
      }));

    const throughputData = metrics
      .filter(m => m.metricType === 'throughput')
      .map(m => ({
        timestamp: m.metricTimestamp,
        value: (m.metricValue as any)?.value || 0,
      }));

    const errorRateData = metrics
      .filter(m => m.metricType === 'error_rate')
      .map(m => ({
        timestamp: m.metricTimestamp,
        value: (m.metricValue as any)?.value || 0,
      }));

    return {
      latency: latencyData,
      throughput: throughputData,
      errorRate: errorRateData,
      summary: {
        avgLatency: latencyData.length > 0
          ? Math.round(latencyData.reduce((sum, d) => sum + d.value, 0) / latencyData.length)
          : 0,
        avgThroughput: throughputData.length > 0
          ? Math.round(throughputData.reduce((sum, d) => sum + d.value, 0) / throughputData.length)
          : 0,
        avgErrorRate: errorRateData.length > 0
          ? Math.round((errorRateData.reduce((sum, d) => sum + d.value, 0) / errorRateData.length) * 100) / 100
          : 0,
      },
    };
  }

  /**
   * إحصائيات المراقبة الإجمالية
   */
  async getMonitoringStats() {
    const reports = await this.monitorPlatforms();

    const healthyCount = reports.filter(r => r.status === 'healthy').length;
    const warningCount = reports.filter(r => r.status === 'warning').length;
    const criticalCount = reports.filter(r => r.status === 'critical').length;

    const avgHealth = reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.overallHealth, 0) / reports.length)
      : 0;

    const predictions = await this.predictFailures();
    const highRiskPredictions = predictions.filter(p => p.probability > 60);

    return {
      platforms: {
        total: reports.length,
        healthy: healthyCount,
        warning: warningCount,
        critical: criticalCount,
      },
      averageHealth: avgHealth,
      predictions: {
        total: predictions.length,
        highRisk: highRiskPredictions.length,
      },
      lastCheck: new Date(),
    };
  }
}

export const healthMonitor = new ProactiveHealthMonitor();
