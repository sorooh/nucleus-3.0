/**
 * 🔔 Platform Alert System
 * ========================
 * Smart alerting for platform monitoring
 * 
 * Alert Triggers:
 * - Platform offline (no heartbeat for 5+ minutes)
 * - SIDE not installed
 * - SIDE not active
 * - Low compliance score (<70%)
 * - Verification failures
 * 
 * @supreme Nicholas demands to know when platforms disobey
 */

import { db } from '../db';
import { nucleiAlerts, platformHealthStatus } from '@shared/schema';
import { eq, and, lt, sql, desc } from 'drizzle-orm';
import { EXTERNAL_PLATFORMS } from './external-platforms-registry';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertCategory = 'health' | 'compliance' | 'performance' | 'security';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  condition: (platform: any) => boolean;
  getMessage: (platform: any) => string;
}

/**
 * Platform Alert Manager
 */
export class PlatformAlertManager {
  private alertRules: AlertRule[] = [
    // Rule 1: Platform Offline
    {
      id: 'platform-offline',
      name: 'Platform Offline',
      description: 'Platform has not sent heartbeat for 5+ minutes',
      severity: 'critical',
      category: 'health',
      condition: (platform) => {
        if (!platform.lastHeartbeat) return false;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return new Date(platform.lastHeartbeat) < fiveMinutesAgo;
      },
      getMessage: (platform) => 
        `${platform.platformName} is offline. Last heartbeat: ${new Date(platform.lastHeartbeat).toLocaleString()}`
    },

    // Rule 2: SIDE Not Installed
    {
      id: 'side-not-installed',
      name: 'SIDE Not Installed',
      description: 'Platform does not have SIDE installed',
      severity: 'warning',
      category: 'compliance',
      condition: (platform) => platform.sideInstalled === 0,
      getMessage: (platform) => 
        `${platform.platformName} does not have SIDE installed. Platform is not following Nicholas's governance.`
    },

    // Rule 3: SIDE Not Active
    {
      id: 'side-not-active',
      name: 'SIDE Not Active',
      description: 'SIDE is installed but not active',
      severity: 'warning',
      category: 'compliance',
      condition: (platform) => platform.sideInstalled === 1 && platform.sideActive === 0,
      getMessage: (platform) => 
        `SIDE is installed on ${platform.platformName} but not active. Version: ${platform.sideVersion || 'unknown'}`
    },

    // Rule 4: Low Compliance Score
    {
      id: 'low-compliance',
      name: 'Low Compliance Score',
      description: 'Platform compliance score below 70%',
      severity: 'error',
      category: 'compliance',
      condition: (platform) => 
        platform.complianceScore !== null && platform.complianceScore < 70,
      getMessage: (platform) => 
        `${platform.platformName} has low compliance score: ${platform.complianceScore}%. Nicholas demands improvement.`
    },

    // Rule 5: Low Health Score
    {
      id: 'low-health',
      name: 'Low Health Score',
      description: 'Platform health score below 60%',
      severity: 'error',
      category: 'health',
      condition: (platform) => 
        platform.healthScore !== null && platform.healthScore < 60,
      getMessage: (platform) => 
        `${platform.platformName} has low health score: ${platform.healthScore}%. System may be unstable.`
    },

    // Rule 6: High Verification Failure Rate
    {
      id: 'high-failure-rate',
      name: 'High Verification Failure Rate',
      description: 'More than 50% verification failures',
      severity: 'warning',
      category: 'health',
      condition: (platform) => {
        if (platform.totalVerifications === 0) return false;
        const failureRate = (platform.failedVerifications / platform.totalVerifications) * 100;
        return failureRate > 50;
      },
      getMessage: (platform) => {
        const failureRate = Math.round((platform.failedVerifications / platform.totalVerifications) * 100);
        return `${platform.platformName} has high verification failure rate: ${failureRate}% (${platform.failedVerifications}/${platform.totalVerifications})`;
      }
    },

    // Rule 7: Platform Degraded
    {
      id: 'platform-degraded',
      name: 'Platform Degraded',
      description: 'Platform status is degraded',
      severity: 'warning',
      category: 'health',
      condition: (platform) => platform.currentStatus === 'degraded',
      getMessage: (platform) => 
        `${platform.platformName} is in degraded state. Performance may be affected.`
    },
  ];

  /**
   * Check all platforms for alert conditions
   */
  async checkAllPlatforms(): Promise<void> {
    console.log('[Platform Alerts] 🔍 Checking all platforms for alert conditions...');

    const platforms = await db
      .select()
      .from(platformHealthStatus);

    let totalAlerts = 0;

    for (const platform of platforms) {
      const alerts = await this.checkPlatform(platform);
      totalAlerts += alerts;
    }

    console.log(`[Platform Alerts] ✅ Check complete - ${totalAlerts} alerts generated`);
  }

  /**
   * Check single platform for alert conditions
   */
  async checkPlatform(platform: any): Promise<number> {
    let alertCount = 0;

    for (const rule of this.alertRules) {
      try {
        if (rule.condition(platform)) {
          await this.createAlert(platform, rule);
          alertCount++;
        }
      } catch (error: any) {
        console.error(`[Platform Alerts] Error checking rule ${rule.id}:`, error);
      }
    }

    // Update platform alert status
    if (alertCount > 0) {
      await db
        .update(platformHealthStatus)
        .set({
          hasAlerts: 1,
          alertCount,
          alertLevel: this.getHighestSeverity(platform),
          updatedAt: new Date(),
        })
        .where(eq(platformHealthStatus.platformId, platform.platformId));
    }

    return alertCount;
  }

  /**
   * Create alert in database
   */
  private async createAlert(platform: any, rule: AlertRule): Promise<void> {
    // Check if similar alert already exists (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const existingAlerts = await db
      .select()
      .from(nucleiAlerts)
      .where(
        and(
          eq(nucleiAlerts.nucleusId, platform.platformId),
          eq(nucleiAlerts.title, rule.name),
          sql`${nucleiAlerts.createdAt} > ${oneHourAgo}`
        )
      );

    // Don't create duplicate alerts within the same hour
    if (existingAlerts.length > 0) {
      return;
    }

    const alertData = {
      nucleusId: platform.platformId,
      alertType: rule.category,
      severity: rule.severity,
      title: rule.name,
      message: rule.getMessage(platform),
      details: {
        platformName: platform.platformName,
        ruleId: rule.id,
        platformUrl: platform.platformUrl,
        platformType: platform.platformType,
        currentStatus: platform.currentStatus,
        sideInstalled: platform.sideInstalled,
        sideVersion: platform.sideVersion,
        healthScore: platform.healthScore,
        complianceScore: platform.complianceScore,
      },
    };

    await db.insert(nucleiAlerts).values(alertData);

    // Broadcast alert via WebSocket
    try {
      const { commandWebSocket } = await import('./command-websocket');
      commandWebSocket.broadcastAlert({
        ...alertData,
        platformId: platform.platformId,
        platformName: platform.platformName,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      // WebSocket not critical - continue without it
      console.warn(`[Platform Alerts] WebSocket broadcast failed:`, error);
    }

    console.log(`[Platform Alerts] 🔔 Alert created: ${rule.name} for ${platform.platformName}`);
  }

  /**
   * Get highest severity level from current alerts
   */
  private getHighestSeverity(platform: any): AlertSeverity {
    for (const rule of this.alertRules) {
      if (rule.condition(platform)) {
        if (rule.severity === 'critical') return 'critical';
      }
    }

    for (const rule of this.alertRules) {
      if (rule.condition(platform)) {
        if (rule.severity === 'error') return 'error';
      }
    }

    for (const rule of this.alertRules) {
      if (rule.condition(platform)) {
        if (rule.severity === 'warning') return 'warning';
      }
    }

    return 'info';
  }

  /**
   * Get alerts with optional filtering
   */
  async getAlerts(options: {
    status?: string;
    platformId?: string;
    severity?: string;
    limit?: number;
  } = {}) {
    const { status, platformId, severity, limit = 50 } = options;

    let query = db
      .select()
      .from(nucleiAlerts)
      .where(
        sql`${nucleiAlerts.nucleusId} IN (SELECT platform_id FROM ${platformHealthStatus})`
      )
      .limit(limit)
      .orderBy(desc(nucleiAlerts.createdAt));

    const alerts = await query;

    // Filter by status
    let filtered = alerts;
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }

    // Filter by platformId
    if (platformId) {
      filtered = filtered.filter(a => a.nucleusId === platformId);
    }

    // Filter by severity
    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }

    return filtered;
  }

  /**
   * Get alert statistics
   */
  async getAlertStats() {
    const platforms = await db
      .select()
      .from(platformHealthStatus);

    const totalPlatforms = platforms.length;
    const platformsWithAlerts = platforms.filter(p => p.hasAlerts === 1).length;
    
    const criticalAlerts = platforms.filter(p => p.alertLevel === 'critical').length;
    const errorAlerts = platforms.filter(p => p.alertLevel === 'error').length;
    const warningAlerts = platforms.filter(p => p.alertLevel === 'warning').length;

    return {
      totalPlatforms,
      platformsWithAlerts,
      platformsHealthy: totalPlatforms - platformsWithAlerts,
      alertBreakdown: {
        critical: criticalAlerts,
        error: errorAlerts,
        warning: warningAlerts,
      },
    };
  }

  /**
   * Clear old alerts (older than 24 hours)
   */
  async clearOldAlerts(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db
      .delete(nucleiAlerts)
      .where(
        and(
          lt(nucleiAlerts.createdAt, twentyFourHoursAgo),
          sql`${nucleiAlerts.nucleusId} IN (SELECT platform_id FROM ${platformHealthStatus})`
        )
      );

    console.log(`[Platform Alerts] 🗑️ Cleared old alerts`);
    return 0; // Drizzle doesn't return count for delete
  }
}

// Export singleton instance
export const platformAlertManager = new PlatformAlertManager();
