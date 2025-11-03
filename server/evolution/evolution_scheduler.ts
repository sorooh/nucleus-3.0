/**
 * 🧬 Evolution Scheduler - Phase Ω
 * 
 * Autonomous scheduler for evolutionary cycles
 * Runs cycles automatically every 24 hours (configurable)
 * 
 * @module EvolutionScheduler
 */

import { EventEmitter } from 'events';
import { getEvolutionEngine } from './evolution_core_engine';

/**
 * Evolution Scheduler Class
 */
class EvolutionScheduler extends EventEmitter {
  private intervalMs: number = 24 * 60 * 60 * 1000; // 24 hours default
  private isActive: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private nextScheduled: Date | null = null;

  constructor(intervalHours: number = 24) {
    super();
    this.intervalMs = intervalHours * 60 * 60 * 1000;
    console.log(`[EvolutionScheduler] ⏰ Scheduler initialized (every ${intervalHours}h)`);
  }

  /**
   * Start autonomous scheduling
   */
  start() {
    if (this.isActive) {
      console.log('[EvolutionScheduler] Already running');
      return;
    }

    this.isActive = true;
    this.nextScheduled = new Date(Date.now() + this.intervalMs);

    console.log('================================================================================');
    console.log('🧬 AUTONOMOUS EVOLUTION SCHEDULER ACTIVATED');
    console.log('================================================================================');
    console.log(`⏰ Next cycle scheduled: ${this.nextScheduled.toISOString()}`);
    console.log(`🔄 Interval: Every ${this.intervalMs / (60 * 60 * 1000)} hours`);
    console.log('================================================================================\n');

    this.intervalId = setInterval(() => {
      this.runScheduledCycle();
    }, this.intervalMs);

    this.emit('scheduler:started');
  }

  /**
   * Stop scheduling
   */
  stop() {
    if (!this.isActive) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isActive = false;
    this.nextScheduled = null;

    console.log('[EvolutionScheduler] ⏸️ Scheduler stopped');
    this.emit('scheduler:stopped');
  }

  /**
   * Run scheduled evolutionary cycle
   */
  private async runScheduledCycle() {
    console.log('\n[EvolutionScheduler] ⏰ Triggering scheduled evolutionary cycle...\n');

    try {
      const engine = getEvolutionEngine();
      await engine.startCycle();

      // Schedule next cycle
      this.nextScheduled = new Date(Date.now() + this.intervalMs);
      console.log(`\n[EvolutionScheduler] ✅ Cycle complete. Next: ${this.nextScheduled.toISOString()}\n`);

      this.emit('cycle:completed');
    } catch (error) {
      console.error('[EvolutionScheduler] ❌ Scheduled cycle failed:', error);
      this.emit('cycle:failed', error);
    }
  }

  /**
   * Run cycle immediately (manual trigger)
   */
  async runNow(): Promise<void> {
    console.log('[EvolutionScheduler] 🚀 Running evolution cycle now (manual trigger)...');
    
    const engine = getEvolutionEngine();
    await engine.startCycle();
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      intervalMs: this.intervalMs,
      intervalHours: this.intervalMs / (60 * 60 * 1000),
      nextScheduled: this.nextScheduled,
    };
  }

  /**
   * Update interval (hours)
   */
  setInterval(hours: number) {
    this.intervalMs = hours * 60 * 60 * 1000;
    
    if (this.isActive) {
      // Restart with new interval
      this.stop();
      this.start();
    }

    console.log(`[EvolutionScheduler] ⏰ Interval updated to ${hours} hours`);
  }
}

// Singleton instance
let evolutionScheduler: EvolutionScheduler | null = null;

/**
 * Get or create scheduler instance
 */
export function getEvolutionScheduler(): EvolutionScheduler {
  if (!evolutionScheduler) {
    evolutionScheduler = new EvolutionScheduler(24); // 24 hours default
  }
  return evolutionScheduler;
}

/**
 * Initialize and start scheduler (called from server/index.ts)
 */
export async function initEvolutionScheduler(autoStart: boolean = false) {
  const scheduler = getEvolutionScheduler();
  
  if (autoStart) {
    scheduler.start();
    console.log('[Evolution] ✅ Evolution Scheduler STARTED - Autonomous evolution active');
  } else {
    console.log('[Evolution] ⏰ Evolution Scheduler ready (not started)');
    console.log('[Evolution] 💡 Use POST /api/evolution/scheduler/start to activate');
  }
  
  return scheduler;
}

export default getEvolutionScheduler;
