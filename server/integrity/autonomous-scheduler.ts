/**
 * Phase Ω.9: Autonomous Scheduler
 * 
 * Schedules automatic integrity cycles every 6-12 hours
 */

import cron from 'node-cron';
import { runFullIntegrityCycle } from './hub';

let cycleRunning = false;
let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Run integrity cycle with safety checks
 */
async function runScheduledCycle() {
  if (cycleRunning) {
    console.log('⏳ [Scheduler] Cycle already running - skipping');
    return;
  }
  
  try {
    cycleRunning = true;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 [Scheduler] Starting scheduled integrity cycle...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await runFullIntegrityCycle();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [Scheduler] Scheduled cycle completed successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ [Scheduler] Cycle failed:', error);
  } finally {
    cycleRunning = false;
  }
}

/**
 * Start autonomous scheduler
 * Runs every 6 hours
 */
export function startAutonomousScheduler() {
  if (scheduledTask) {
    console.log('⚠️ [Scheduler] Already running');
    return;
  }
  
  // Run every 6 hours at minute 0
  // Cron: 0 */6 * * * = every 6 hours
  scheduledTask = cron.schedule('0 */6 * * *', runScheduledCycle);
  
  console.log('🤖 [Scheduler] Autonomous scheduler started');
  console.log('   Schedule: Every 6 hours');
  console.log('   Next run: Check cron schedule');
  
  // Run first cycle after 5 minutes to allow system to stabilize
  setTimeout(() => {
    console.log('🤖 [Scheduler] Running initial cycle...');
    runScheduledCycle();
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop autonomous scheduler
 */
export function stopAutonomousScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 [Scheduler] Autonomous scheduler stopped');
  }
}

/**
 * Trigger manual cycle
 */
export async function triggerManualCycle() {
  console.log('🔧 [Scheduler] Manual cycle triggered');
  await runScheduledCycle();
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: scheduledTask !== null,
    cycleInProgress: cycleRunning,
    schedule: 'Every 6 hours'
  };
}
