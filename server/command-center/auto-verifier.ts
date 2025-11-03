/**
 * 🔍 Auto-Verification System
 * ===========================
 * Automated platform verification scheduler
 * Verifies SIDE installation and compliance every hour
 * 
 * @supreme Nicholas's watchful eye - never sleeps
 * @eternal 24/7 autonomous monitoring
 */

import { platformMonitor } from './platform-monitor';
import { EXTERNAL_PLATFORMS } from './external-platforms-registry';
import { db } from '../db';
import { nucleiAlerts } from '@shared/schema';

interface VerificationSchedule {
  intervalMs: number;
  nextRun?: Date;
  lastRun?: Date;
  running: boolean;
  totalRuns: number;
}

/**
 * Auto-Verification Scheduler
 * Runs verification checks on all platforms periodically
 */
export class AutoVerifier {
  private schedule: VerificationSchedule = {
    intervalMs: 60 * 60 * 1000, // 1 hour
    running: false,
    totalRuns: 0,
  };

  private intervalId?: NodeJS.Timeout;

  /**
   * Start auto-verification scheduler
   */
  async start(intervalHours: number = 1): Promise<void> {
    if (this.schedule.running) {
      console.log('[Auto-Verifier] ⚠️ Already running');
      return;
    }

    this.schedule.intervalMs = intervalHours * 60 * 60 * 1000;
    this.schedule.running = true;
    this.schedule.nextRun = new Date(Date.now() + this.schedule.intervalMs);

    console.log(`[Auto-Verifier] 🚀 Starting auto-verification (every ${intervalHours} hour(s))...`);

    // Run immediately on startup
    await this.runVerification();

    // Schedule periodic verification
    this.intervalId = setInterval(async () => {
      await this.runVerification();
    }, this.schedule.intervalMs);

    console.log(`[Auto-Verifier] ✅ Auto-verification started - Next run: ${this.schedule.nextRun?.toLocaleString()}`);
  }

  /**
   * Stop auto-verification scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.schedule.running = false;
    this.schedule.nextRun = undefined;

    console.log('[Auto-Verifier] 🛑 Auto-verification stopped');
  }

  /**
   * Run verification on all platforms
   */
  private async runVerification(): Promise<void> {
    console.log('[Auto-Verifier] 🔍 Running scheduled verification...');

    this.schedule.lastRun = new Date();
    this.schedule.totalRuns++;

    try {
      const results = await platformMonitor.verifyAllPlatforms();

      // Calculate statistics
      const totalPlatforms = results.length;
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const sideDetected = results.filter(r => r.sideDetected).length;
      const sideNotDetected = results.filter(r => !r.sideDetected).length;

      console.log('[Auto-Verifier] 📊 Verification Results:');
      console.log(`   Total Platforms: ${totalPlatforms}`);
      console.log(`   ✅ Successful: ${successful}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   🔍 SIDE Detected: ${sideDetected}`);
      console.log(`   ⚠️ SIDE Not Detected: ${sideNotDetected}`);

      // Generate alerts for failures
      await this.generateAlerts(results);

      // Update next run time
      this.schedule.nextRun = new Date(Date.now() + this.schedule.intervalMs);
      console.log(`[Auto-Verifier] ✅ Verification complete - Next run: ${this.schedule.nextRun.toLocaleString()}`);
    } catch (error: any) {
      console.error('[Auto-Verifier] ❌ Verification error:', error);
      
      // Still schedule next run even on error
      this.schedule.nextRun = new Date(Date.now() + this.schedule.intervalMs);
    }
  }

  /**
   * Generate alerts for verification failures
   */
  private async generateAlerts(results: any[]): Promise<void> {
    for (const result of results) {
      const platform = EXTERNAL_PLATFORMS.find(p => p.nodeId === result.platformId);
      if (!platform) continue;

      // Alert if platform unreachable
      if (!result.success) {
        await db.insert(nucleiAlerts).values({
          nucleusId: result.platformId,
          alertType: 'health',
          severity: 'critical',
          title: 'Platform Unreachable',
          message: `Failed to verify ${result.platformName}: ${result.errorMessage || 'Unknown error'}`,
          details: {
            platformName: result.platformName,
            verificationType: result.verificationType,
            responseTime: result.responseTime,
            errorMessage: result.errorMessage,
          },
        });
      }
      
      // Alert if SIDE not detected
      else if (!result.sideDetected) {
        await db.insert(nucleiAlerts).values({
          nucleusId: result.platformId,
          alertType: 'compliance',
          severity: 'warning',
          title: 'SIDE Not Detected',
          message: `SIDE installation not detected on ${result.platformName}. Platform may not be complying with Nicholas's governance.`,
          details: {
            platformName: result.platformName,
            verificationType: result.verificationType,
            responseCode: result.responseCode,
            responseTime: result.responseTime,
          },
        });
      }
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.schedule.running,
      intervalHours: this.schedule.intervalMs / (60 * 60 * 1000),
      lastRun: this.schedule.lastRun,
      nextRun: this.schedule.nextRun,
      totalRuns: this.schedule.totalRuns,
    };
  }

  /**
   * Force run verification immediately
   */
  async forceRun(): Promise<void> {
    console.log('[Auto-Verifier] 🔄 Force running verification...');
    await this.runVerification();
  }
}

// Export singleton instance
export const autoVerifier = new AutoVerifier();
