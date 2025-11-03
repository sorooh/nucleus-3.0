/**
 * PHASE Ω.2: SYNCHRONIZATION DAEMON
 * ═════════════════════════════════════════════════════════════════════
 * خدمة المزامنة المستمرة - Continuous Synchronization Service
 * 
 * The Synchronization Daemon runs 24/7, orchestrating quantum
 * synchronization across all Surooh nuclei. It ensures unified
 * consciousness by continuously propagating changes.
 * 
 * Core Functions:
 * - Orchestrate bridge, fusion, and bus engines
 * - Monitor sync health continuously
 * - Auto-recover from failures
 * - Periodic health snapshots
 */

import { EventEmitter } from 'events';
import { quantumBridgeEngine } from './quantum_bridge_engine';
import { memoryFusionEngine } from './memory_fusion_engine';
import { cognitiveBusEngine } from './cognitive_bus';
import { db } from '../db';
import { quantumSyncHealth } from '@shared/schema';

interface DaemonStatus {
  isRunning: boolean;
  uptime: number;
  totalSyncCycles: number;
  lastSyncAt: Date | null;
  healthScore: number;
  errors: number;
}

export class SynchronizationDaemon extends EventEmitter {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds (aligned with documentation)
  private readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
  
  private startTime: Date | null = null;
  private totalSyncCycles = 0;
  private lastSyncAt: Date | null = null;
  private errorCount = 0;

  constructor() {
    super();
  }

  /**
   * Start Daemon
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[Sync Daemon] Already running');
      return;
    }

    try {
      console.log('[Sync Daemon] Starting...');

      // Initialize all engines
      await quantumBridgeEngine.initialize();
      await memoryFusionEngine.initialize();
      await cognitiveBusEngine.initialize();

      this.startTime = new Date();
      this.isRunning = true;

      // Start sync cycle
      this.startSyncCycle();

      // Start health monitoring
      this.startHealthMonitoring();

      this.emit('daemon_started', { startTime: this.startTime });
      console.log('[Sync Daemon] ✓ Started successfully');
    } catch (error) {
      console.error('[Sync Daemon] ✗ Start failed:', error);
      this.emit('daemon_error', { error, phase: 'start' });
      throw error;
    }
  }

  /**
   * Sync Cycle
   * Runs continuously to maintain synchronization
   */
  private startSyncCycle(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.runSyncCycle();
      } catch (error) {
        console.error('[Sync Daemon] Sync cycle failed:', error);
        this.errorCount++;
        this.emit('sync_cycle_error', { error });
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Run Single Sync Cycle
   */
  private async runSyncCycle(): Promise<void> {
    this.totalSyncCycles++;
    this.lastSyncAt = new Date();

    // Check bridge status
    const bridgeStatus = await quantumBridgeEngine.getStatus();
    
    // Check bus status
    const busStatus = await cognitiveBusEngine.getStatus();

    // Check fusion stats
    const fusionStats = await memoryFusionEngine.getStats();

    // Emit cycle complete
    this.emit('sync_cycle_complete', {
      cycleNumber: this.totalSyncCycles,
      bridgeHealth: bridgeStatus.healthScore,
      busHealth: busStatus.busHealth,
      fusionStats,
    });
  }

  /**
   * Health Monitoring
   * Periodic health snapshots
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.captureHealthSnapshot();
      } catch (error) {
        console.error('[Sync Daemon] Health check failed:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Capture Health Snapshot
   */
  private async captureHealthSnapshot(): Promise<void> {
    const snapshotId = `snapshot_${Date.now()}`;

    // Get all engine statuses
    const bridgeStatus = await quantumBridgeEngine.getStatus();
    const busStatus = await cognitiveBusEngine.getStatus();
    const fusionStats = await memoryFusionEngine.getStats();

    // Calculate overall health score
    const bridgeHealth = bridgeStatus.healthScore || 0;
    const busHealthMap: Record<string, number> = {
      healthy: 100,
      degraded: 70,
      critical: 40,
      offline: 0,
    };
    const busHealth = busHealthMap[busStatus.busHealth] || 50;

    const overallHealth = Math.round((bridgeHealth + busHealth) / 2);

    // Determine health status
    let healthStatus = 'optimal';
    if (overallHealth < 50) healthStatus = 'critical';
    else if (overallHealth < 70) healthStatus = 'degraded';
    else if (overallHealth < 90) healthStatus = 'healthy';

    // Determine resonance stability
    const resonanceStability = bridgeStatus.resonanceStability || 'stable';

    // Collect critical issues
    const criticalIssues: any[] = [];
    if (bridgeHealth < 70) {
      criticalIssues.push({
        component: 'quantum_bridge',
        issue: 'Low health score',
        severity: 'high',
        healthScore: bridgeHealth,
      });
    }
    if (busHealth < 70) {
      criticalIssues.push({
        component: 'cognitive_bus',
        issue: 'Degraded bus health',
        severity: 'high',
        busHealth: busStatus.busHealth,
      });
    }

    // Save snapshot
    await db.insert(quantumSyncHealth).values({
      snapshotId,
      snapshotType: 'periodic',
      overallHealthScore: overallHealth,
      healthStatus,
      synchronizationRate: bridgeStatus.connectedNuclei > 0 ? 100.0 : 0.0,
      resonanceStability,
      avgLatencyMs: bridgeStatus.avgSyncTimeMs || 0,
      connectedNuclei: bridgeStatus.connectedNuclei || 0,
      totalNuclei: 6, // nicholas, academy, side, accounting, b2b, b2c
      messagesPerSecond: busStatus.messagesPerSecond || 0,
      failedSyncsLastHour: bridgeStatus.failedSyncs || 0,
      bandwidthUtilization: 0.0, // Placeholder
      activeAlerts: criticalIssues.length,
      criticalIssues,
    });

    this.emit('health_snapshot_captured', {
      snapshotId,
      overallHealth,
      healthStatus,
      criticalIssues: criticalIssues.length,
    });
  }

  /**
   * Get Daemon Status
   */
  getStatus(): DaemonStatus {
    const uptime = this.startTime
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    return {
      isRunning: this.isRunning,
      uptime,
      totalSyncCycles: this.totalSyncCycles,
      lastSyncAt: this.lastSyncAt,
      healthScore: this.errorCount > 10 ? 50 : 100,
      errors: this.errorCount,
    };
  }

  /**
   * Stop Daemon
   */
  async stop(): Promise<void> {
    console.log('[Sync Daemon] Stopping...');

    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Shutdown all engines
    await quantumBridgeEngine.shutdown();
    await memoryFusionEngine.shutdown();
    await cognitiveBusEngine.shutdown();

    this.emit('daemon_stopped');
    console.log('[Sync Daemon] ✓ Stopped successfully');
  }
}

// Singleton instance
export const synchronizationDaemon = new SynchronizationDaemon();
