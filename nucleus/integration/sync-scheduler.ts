/**
 * Sync Scheduler for Unified Knowledge Bus
 * Built from absolute zero for Surooh Empire
 * 
 * Manages periodic synchronization between platforms and Central Memory Core
 */

import { EventEmitter } from 'events';
import type { PlatformType } from './types';

interface ScheduledTask {
  platform: PlatformType;
  interval: number; // minutes
  nextRun: Date;
  lastRun: Date | null;
  enabled: boolean;
}

export class SyncScheduler extends EventEmitter {
  private tasks: Map<PlatformType, ScheduledTask> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private active: boolean = false;

  constructor() {
    super();
    console.log('[SyncScheduler] Initialized (from absolute zero)');
  }

  /**
   * Add a platform to the sync schedule
   */
  addTask(platform: PlatformType, interval: number): void {
    const now = new Date();
    const nextRun = new Date(now.getTime() + interval * 60 * 1000);

    this.tasks.set(platform, {
      platform,
      interval,
      nextRun,
      lastRun: null,
      enabled: true
    });

    console.log(`[SyncScheduler] Added ${platform} - sync every ${interval} minutes`);
  }

  /**
   * Remove a platform from the schedule
   */
  removeTask(platform: PlatformType): void {
    this.tasks.delete(platform);
    console.log(`[SyncScheduler] Removed ${platform} from schedule`);
  }

  /**
   * Enable a scheduled task
   */
  enableTask(platform: PlatformType): void {
    const task = this.tasks.get(platform);
    if (task) {
      task.enabled = true;
      console.log(`[SyncScheduler] Enabled ${platform}`);
    }
  }

  /**
   * Disable a scheduled task
   */
  disableTask(platform: PlatformType): void {
    const task = this.tasks.get(platform);
    if (task) {
      task.enabled = false;
      console.log(`[SyncScheduler] Disabled ${platform}`);
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.active) {
      console.log('[SyncScheduler] Already running');
      return;
    }

    // Default schedules for all platforms
    this.addTask('MAIL_HUB', 15);    // Every 15 minutes (as per spec)
    this.addTask('B2B', 30);          // Every 30 minutes
    this.addTask('B2C', 30);          // Every 30 minutes
    this.addTask('CE', 1440);         // Daily (24 hours)
    this.addTask('Accounting', 60);   // Hourly
    this.addTask('Shipping', 15);     // Every 15 minutes

    // Check for due tasks every minute
    this.checkInterval = setInterval(() => {
      this.checkTasks();
    }, 60000); // Check every 1 minute

    this.active = true;
    console.log('⏰ Sync Scheduler activated - Periodic sync enabled');
  }

  /**
   * Check and execute due tasks
   */
  private checkTasks(): void {
    const now = new Date();

    for (const [platform, task] of Array.from(this.tasks.entries())) {
      if (!task.enabled) continue;

      // Check if task is due
      if (now >= task.nextRun) {
        this.executeTask(task);
      }
    }
  }

  /**
   * Execute a sync task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(`[SyncScheduler] 🔄 Executing sync for ${task.platform}`);

      // Emit sync event
      this.emit('sync-required', {
        platform: task.platform,
        timestamp: new Date()
      });

      // Update task timing
      const now = new Date();
      task.lastRun = now;
      task.nextRun = new Date(now.getTime() + task.interval * 60 * 1000);

      console.log(`[SyncScheduler] ✅ ${task.platform} sync scheduled - next run: ${task.nextRun.toLocaleString()}`);

    } catch (error: any) {
      console.error(`[SyncScheduler] Failed to sync ${task.platform}:`, error.message);
    }
  }

  /**
   * Trigger immediate sync for a platform
   */
  async triggerSync(platform: PlatformType): Promise<void> {
    const task = this.tasks.get(platform);
    if (!task) {
      throw new Error(`Platform ${platform} not in schedule`);
    }

    await this.executeTask(task);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const status = {
      active: this.active,
      totalTasks: this.tasks.size,
      enabledTasks: 0,
      tasks: [] as any[]
    };

    for (const [platform, task] of Array.from(this.tasks.entries())) {
      if (task.enabled) status.enabledTasks++;

      status.tasks.push({
        platform,
        interval: task.interval,
        enabled: task.enabled,
        lastRun: task.lastRun,
        nextRun: task.nextRun,
        dueIn: task.enabled 
          ? Math.max(0, Math.floor((task.nextRun.getTime() - Date.now()) / 60000))
          : null
      });
    }

    return status;
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.active = false;
    console.log('[SyncScheduler] Stopped');
  }
}

// Singleton instance
export const syncScheduler = new SyncScheduler();
