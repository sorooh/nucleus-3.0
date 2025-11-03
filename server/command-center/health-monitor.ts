/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏥 HEALTH MONITOR - Supreme Empire Health Surveillance System
 * ═══════════════════════════════════════════════════════════════════════════
 * Real-time health monitoring for all 21 nuclei across Surooh Empire
 * 
 * Features:
 * - Continuous health checks (every 30 seconds)
 * - Automated alert generation
 * - Performance metrics tracking
 * - Auto-recovery triggers
 * - Critical status escalation
 * 
 * @module HealthMonitor
 * @eternal Zero human intervention - autonomous health surveillance
 */

import { db } from "../db";
import { 
  commandCenterNuclei, 
  healthChecks, 
  nucleiAlerts,
  type SelectCommandCenterNucleus,
  type InsertHealthCheck,
  type InsertNucleiAlert
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

interface HealthCheckResult {
  nucleusId: string;
  status: 'healthy' | 'warning' | 'critical' | 'failed';
  healthScore: number;
  responseTime?: number;
  details: Record<string, any>;
  errors: string[];
  warnings: string[];
  actionTaken?: string;
}

/**
 * 🏥 Health Monitor - Continuous surveillance system
 */
export class HealthMonitor {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_FREQUENCY = 30000; // 30 seconds

  constructor() {
    console.log('[HealthMonitor] 🏥 Initializing Health Monitor...');
  }

  /**
   * Start continuous health monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[HealthMonitor] ⚠️ Already running');
      return;
    }

    this.isRunning = true;
    console.log('[HealthMonitor] 🚀 Starting health monitoring...');
    console.log(`[HealthMonitor] 📊 Check frequency: ${this.CHECK_FREQUENCY / 1000}s`);

    // Run initial check immediately
    await this.runHealthChecks();

    // Schedule continuous checks
    this.checkInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, this.CHECK_FREQUENCY);

    console.log('[HealthMonitor] ✅ Health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[HealthMonitor] 🛑 Health monitoring stopped');
  }

  /**
   * Run health checks on all nuclei
   */
  private async runHealthChecks(): Promise<void> {
    try {
      // Get all registered nuclei
      const nuclei = await db.select().from(commandCenterNuclei);
      
      console.log(`[HealthMonitor] 🔍 Checking health of ${nuclei.length} nuclei...`);

      const checkPromises = nuclei.map(nucleus => 
        this.checkNucleusHealth(nucleus)
      );

      const results = await Promise.allSettled(checkPromises);

      // Process results
      let healthy = 0;
      let warning = 0;
      let critical = 0;
      let failed = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const checkResult = result.value;
          switch (checkResult.status) {
            case 'healthy': healthy++; break;
            case 'warning': warning++; break;
            case 'critical': critical++; break;
            case 'failed': failed++; break;
          }
        } else {
          failed++;
          console.error(`[HealthMonitor] ❌ Check failed for ${nuclei[index].nucleusId}:`, result.reason);
        }
      });

      console.log(`[HealthMonitor] 📊 Health check complete: ✅ ${healthy} | ⚠️ ${warning} | 🔴 ${critical} | ❌ ${failed}`);

    } catch (error) {
      console.error('[HealthMonitor] ❌ Health check cycle failed:', error);
    }
  }

  /**
   * Check health of a single nucleus
   */
  private async checkNucleusHealth(nucleus: SelectCommandCenterNucleus): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      nucleusId: nucleus.nucleusId,
      status: 'healthy',
      healthScore: 100,
      details: {},
      errors: [],
      warnings: []
    };

    try {
      // 1. Check heartbeat age
      const heartbeatCheck = this.checkHeartbeat(nucleus);
      result.details.heartbeat = heartbeatCheck;
      if (!heartbeatCheck.healthy) {
        result.warnings.push(heartbeatCheck.message);
        result.healthScore -= 20;
      }

      // 2. Check Phase Ω status
      const phaseOmegaCheck = this.checkPhaseOmega(nucleus);
      result.details.phaseOmega = phaseOmegaCheck;
      if (!phaseOmegaCheck.compliant) {
        result.warnings.push(phaseOmegaCheck.message);
        result.healthScore -= 15;
      }

      // 3. Check SIDE integration
      const sideCheck = this.checkSideIntegration(nucleus);
      result.details.side = sideCheck;
      if (!sideCheck.compliant) {
        result.errors.push(sideCheck.message);
        result.healthScore -= 30;
      }

      // 4. Check performance metrics
      const perfCheck = this.checkPerformance(nucleus);
      result.details.performance = perfCheck;
      if (perfCheck.issues.length > 0) {
        result.warnings.push(...perfCheck.issues);
        result.healthScore -= perfCheck.penalty;
      }

      // Determine final status
      result.responseTime = Date.now() - startTime;
      
      if (result.healthScore >= 80) {
        result.status = 'healthy';
      } else if (result.healthScore >= 50) {
        result.status = 'warning';
      } else if (result.healthScore >= 20) {
        result.status = 'critical';
      } else {
        result.status = 'failed';
      }

      // Record health check
      await this.recordHealthCheck(result);

      // Generate alerts for any non-healthy status
      if (result.status !== 'healthy') {
        await this.generateAlert(nucleus, result);
      }

      // Update nucleus status
      await this.updateNucleusStatus(nucleus.id, result);

      return result;

    } catch (error) {
      console.error(`[HealthMonitor] ❌ Error checking ${nucleus.nucleusId}:`, error);
      result.status = 'failed';
      result.healthScore = 0;
      result.errors.push(`Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Check heartbeat freshness
   */
  private checkHeartbeat(nucleus: SelectCommandCenterNucleus): { healthy: boolean; message: string; age?: number } {
    if (!nucleus.lastHeartbeat) {
      return {
        healthy: false,
        message: 'No heartbeat received'
      };
    }

    const ageMs = Date.now() - nucleus.lastHeartbeat.getTime();
    const ageMinutes = Math.floor(ageMs / 60000);

    if (ageMinutes > 10) {
      return {
        healthy: false,
        message: `Heartbeat outdated (${ageMinutes} min)`,
        age: ageMinutes
      };
    }

    return {
      healthy: true,
      message: 'Heartbeat fresh',
      age: ageMinutes
    };
  }

  /**
   * Check Phase Ω evolutionary status
   */
  private checkPhaseOmega(nucleus: SelectCommandCenterNucleus): { compliant: boolean; message: string } {
    // Nicholas and SIDE should have Phase Ω active
    if (['nicholas', 'side'].includes(nucleus.nucleusId)) {
      if (!nucleus.phaseOmegaActive) {
        return {
          compliant: false,
          message: 'Phase Ω must be active for core nuclei'
        };
      }
    }

    return {
      compliant: true,
      message: nucleus.phaseOmegaActive ? 'Phase Ω active' : 'Phase Ω pending'
    };
  }

  /**
   * Check SIDE integration compliance
   */
  private checkSideIntegration(nucleus: SelectCommandCenterNucleus): { compliant: boolean; message: string } {
    if (!nucleus.sideIntegrated) {
      return {
        compliant: false,
        message: 'SIDE integration required but missing'
      };
    }

    // Check SIDE sync freshness
    if (nucleus.lastSideSync) {
      const ageMs = Date.now() - nucleus.lastSideSync.getTime();
      const ageHours = Math.floor(ageMs / 3600000);
      
      if (ageHours > 24) {
        return {
          compliant: false,
          message: `SIDE sync outdated (${ageHours}h ago)`
        };
      }
    }

    return {
      compliant: true,
      message: 'SIDE integrated and synchronized'
    };
  }

  /**
   * Check performance metrics
   */
  private checkPerformance(nucleus: SelectCommandCenterNucleus): { issues: string[]; penalty: number } {
    const issues: string[] = [];
    let penalty = 0;

    // Check error rate
    if (nucleus.errorRate && parseFloat(nucleus.errorRate) > 5) {
      issues.push(`High error rate: ${nucleus.errorRate}%`);
      penalty += 10;
    }

    // Check CPU usage
    if (nucleus.cpuUsage && parseFloat(nucleus.cpuUsage) > 90) {
      issues.push(`High CPU usage: ${nucleus.cpuUsage}%`);
      penalty += 5;
    }

    // Check memory usage
    if (nucleus.memoryUsage && parseFloat(nucleus.memoryUsage) > 85) {
      issues.push(`High memory usage: ${nucleus.memoryUsage}%`);
      penalty += 5;
    }

    return { issues, penalty };
  }

  /**
   * Record health check in database
   */
  private async recordHealthCheck(result: HealthCheckResult): Promise<void> {
    try {
      const healthCheck: InsertHealthCheck = {
        nucleusId: result.nucleusId,
        checkType: 'comprehensive',
        status: result.status,
        responseTime: result.responseTime,
        healthScore: result.healthScore,
        details: result.details,
        errors: result.errors,
        warnings: result.warnings,
        actionTaken: result.actionTaken || 'none',
        autoFixed: 0
      };

      await db.insert(healthChecks).values(healthCheck);
    } catch (error) {
      console.error(`[HealthMonitor] ❌ Failed to record health check for ${result.nucleusId}:`, error);
    }
  }

  /**
   * Generate alert for degraded nuclei (with deduplication)
   */
  private async generateAlert(nucleus: SelectCommandCenterNucleus, result: HealthCheckResult): Promise<void> {
    try {
      // Map status to severity
      const severityMap: Record<string, string> = {
        'warning': 'warning',
        'critical': 'critical',
        'failed': 'critical'
      };
      
      // Map status to alert type
      const alertTypeMap: Record<string, string> = {
        'warning': 'health_degraded',
        'critical': 'health_critical',
        'failed': 'nucleus_offline'
      };

      const severity = severityMap[result.status] || 'warning';
      const alertType = alertTypeMap[result.status] || 'health_degraded';

      // Check if there's already an active alert for this nucleus with same type
      const existingAlerts = await db
        .select()
        .from(nucleiAlerts)
        .where(
          and(
            eq(nucleiAlerts.nucleusId, nucleus.nucleusId),
            eq(nucleiAlerts.alertType, alertType),
            eq(nucleiAlerts.status, 'active')
          )
        )
        .limit(1);

      // Don't create duplicate alert if one already exists
      if (existingAlerts.length > 0) {
        return;
      }

      const alert: InsertNucleiAlert = {
        nucleusId: nucleus.nucleusId,
        severity,
        alertType,
        title: `${nucleus.nucleusName} - ${result.status.toUpperCase()}`,
        message: result.errors.join(', ') || result.warnings.join(', ') || 'Health check detected issues',
        details: {
          healthScore: result.healthScore,
          errors: result.errors,
          warnings: result.warnings,
          ...result.details
        },
        status: 'active',
        autoResponseTriggered: 0
      };

      await db.insert(nucleiAlerts).values(alert);
      
      console.log(`[HealthMonitor] 🚨 Alert generated for ${nucleus.nucleusId}: ${alert.title}`);
    } catch (error) {
      console.error(`[HealthMonitor] ❌ Failed to generate alert for ${nucleus.nucleusId}:`, error);
    }
  }

  /**
   * Update nucleus status in registry
   */
  private async updateNucleusStatus(nucleusDbId: string, result: HealthCheckResult): Promise<void> {
    try {
      await db
        .update(commandCenterNuclei)
        .set({
          status: result.status,
          health: result.healthScore,
          lastHealthCheck: new Date(),
          responseTime: result.responseTime,
          lastUpdated: new Date()
        })
        .where(eq(commandCenterNuclei.id, nucleusDbId));
    } catch (error) {
      console.error(`[HealthMonitor] ❌ Failed to update status for ${result.nucleusId}:`, error);
    }
  }

  /**
   * Get recent health checks for a nucleus
   */
  async getHealthHistory(nucleusId: string, limit = 10): Promise<any[]> {
    try {
      return await db
        .select()
        .from(healthChecks)
        .where(eq(healthChecks.nucleusId, nucleusId))
        .orderBy(desc(healthChecks.checkedAt))
        .limit(limit);
    } catch (error) {
      console.error(`[HealthMonitor] ❌ Failed to get health history for ${nucleusId}:`, error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(nucleiAlerts)
        .where(eq(nucleiAlerts.status, 'active'))
        .orderBy(desc(nucleiAlerts.createdAt));
    } catch (error) {
      console.error('[HealthMonitor] ❌ Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkFrequency: this.CHECK_FREQUENCY,
      nextCheckIn: this.checkInterval ? this.CHECK_FREQUENCY / 1000 : null
    };
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();
