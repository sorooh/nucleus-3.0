/**
 * Intelligence Scheduler - Phase 9.6.2
 * Automated scheduling for intelligence broadcasting and pattern mining
 * 
 * Features:
 * - Automatic broadcast every 15 minutes
 * - Pattern mining every 1 hour
 * - Report generation on completion
 * - Health monitoring and auto-recovery
 */

import { broadcastPendingIntelligence } from './intelligence-broadcaster';
import { runPatternMining } from './intelligence-pattern-miner';
import { generateIntelligenceReport } from './intelligence-reporter';
import { db } from '../db';
import { intelligenceAuditLog } from '@shared/schema';

/**
 * Scheduler Configuration
 */
export interface SchedulerConfig {
  broadcastInterval: number;    // Minutes
  patternMiningInterval: number; // Minutes
  reportingInterval: number;     // Minutes
  enabled: boolean;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  broadcastInterval: 15,        // Every 15 minutes
  patternMiningInterval: 60,    // Every 1 hour
  reportingInterval: 30,         // Every 30 minutes
  enabled: true
};

/**
 * Intelligence Scheduler Class
 */
export class IntelligenceScheduler {
  private config: SchedulerConfig;
  private broadcastTimer: NodeJS.Timeout | null = null;
  private miningTimer: NodeJS.Timeout | null = null;
  private reportingTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Start scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Intelligence Scheduler] Already running');
      return;
    }
    
    if (!this.config.enabled) {
      console.log('[Intelligence Scheduler] Disabled in configuration');
      return;
    }
    
    console.log('[Intelligence Scheduler] 🚀 Starting...');
    console.log(`   📡 Broadcast interval: ${this.config.broadcastInterval} minutes`);
    console.log(`   🔍 Pattern mining interval: ${this.config.patternMiningInterval} minutes`);
    console.log(`   📊 Reporting interval: ${this.config.reportingInterval} minutes`);
    
    this.isRunning = true;
    
    // Start broadcast scheduler
    this.scheduleBroadcast();
    
    // Start pattern mining scheduler
    this.schedulePatternMining();
    
    // Start reporting scheduler
    this.scheduleReporting();
    
    console.log('[Intelligence Scheduler] ✅ All schedulers active\n');
  }
  
  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[Intelligence Scheduler] Not running');
      return;
    }
    
    console.log('[Intelligence Scheduler] 🛑 Stopping...');
    
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    
    if (this.miningTimer) {
      clearInterval(this.miningTimer);
      this.miningTimer = null;
    }
    
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
    
    this.isRunning = false;
    console.log('[Intelligence Scheduler] ✅ Stopped\n');
  }
  
  /**
   * Schedule broadcast task
   */
  private scheduleBroadcast(): void {
    const intervalMs = this.config.broadcastInterval * 60 * 1000;
    
    // Run immediately on start
    this.runBroadcast();
    
    // Then run on interval
    this.broadcastTimer = setInterval(() => {
      this.runBroadcast();
    }, intervalMs);
  }
  
  /**
   * Run broadcast task
   */
  private async runBroadcast(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('[Scheduler - Broadcast] 📡 Starting scheduled broadcast...');
      
      const result = await broadcastPendingIntelligence();
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        console.log(`[Scheduler - Broadcast] ✅ Completed: ${result.successCount}/${result.total} broadcasts successful (${processingTime}ms)`);
      } else {
        console.log(`[Scheduler - Broadcast] ⚠️  Partial success: ${result.successCount} successful, ${result.failCount} failed (${processingTime}ms)`);
      }
      
      // Log audit
      await db.insert(intelligenceAuditLog).values({
        eventType: 'scheduled_broadcast',
        eventStatus: result.success ? 'success' : 'partial',
        endpoint: 'scheduler',
        method: 'CRON',
        processingTime,
        itemsProcessed: result.successCount,
        itemsFailed: result.failCount,
        metadata: {
          total: result.total,
          partialCount: result.partialCount,
          totalNodeFailures: result.totalNodeFailures
        }
      });
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[Scheduler - Broadcast] ❌ Error:', error.message);
      
      await db.insert(intelligenceAuditLog).values({
        eventType: 'scheduled_broadcast',
        eventStatus: 'failed',
        endpoint: 'scheduler',
        method: 'CRON',
        processingTime,
        errorMessage: error.message,
        errorCode: error.code || 'SCHEDULER_ERROR',
        metadata: { stack: error.stack }
      });
    }
  }
  
  /**
   * Schedule pattern mining task
   */
  private schedulePatternMining(): void {
    const intervalMs = this.config.patternMiningInterval * 60 * 1000;
    
    // Run after 5 minutes on start
    setTimeout(() => {
      this.runPatternMining();
    }, 5 * 60 * 1000);
    
    // Then run on interval
    this.miningTimer = setInterval(() => {
      this.runPatternMining();
    }, intervalMs);
  }
  
  /**
   * Run pattern mining task
   */
  private async runPatternMining(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('[Scheduler - Pattern Mining] 🔍 Starting pattern analysis...');
      
      const patterns = await runPatternMining();
      const processingTime = Date.now() - startTime;
      
      console.log(`[Scheduler - Pattern Mining] ✅ Completed: ${patterns.length} patterns discovered (${processingTime}ms)`);
      
      if (patterns.length > 0) {
        console.log('[Scheduler - Pattern Mining] Discovered patterns:');
        patterns.forEach(p => {
          console.log(`   - ${p.patternType}: ${p.description} (confidence: ${p.confidence}%)`);
        });
      }
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[Scheduler - Pattern Mining] ❌ Error:', error.message);
    }
  }
  
  /**
   * Schedule reporting task
   */
  private scheduleReporting(): void {
    const intervalMs = this.config.reportingInterval * 60 * 1000;
    
    // Run after 10 minutes on start
    setTimeout(() => {
      this.runReporting();
    }, 10 * 60 * 1000);
    
    // Then run on interval
    this.reportingTimer = setInterval(() => {
      this.runReporting();
    }, intervalMs);
  }
  
  /**
   * Run reporting task
   */
  private async runReporting(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('[Scheduler - Reporting] 📊 Generating intelligence report...');
      
      const report = await generateIntelligenceReport();
      const processingTime = Date.now() - startTime;
      
      console.log(`[Scheduler - Reporting] ✅ Report generated: ${report.fileName} (${processingTime}ms)`);
      console.log(`   Intelligence analyzed: ${report.summary.totalIntelligence}`);
      console.log(`   Active patterns: ${report.summary.totalPatterns}`);
      console.log(`   Broadcast success rate: ${report.summary.broadcastSuccessRate}%`);
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('[Scheduler - Reporting] ❌ Error:', error.message);
    }
  }
  
  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      timers: {
        broadcast: this.broadcastTimer !== null,
        patternMining: this.miningTimer !== null,
        reporting: this.reportingTimer !== null
      }
    };
  }
}

// Export singleton instance
export const intelligenceScheduler = new IntelligenceScheduler();

/**
 * Start intelligence scheduler
 */
export function startIntelligenceScheduler(config?: Partial<SchedulerConfig>): void {
  if (config) {
    const scheduler = new IntelligenceScheduler(config);
    scheduler.start();
  } else {
    intelligenceScheduler.start();
  }
}

/**
 * Stop intelligence scheduler
 */
export function stopIntelligenceScheduler(): void {
  intelligenceScheduler.stop();
}
