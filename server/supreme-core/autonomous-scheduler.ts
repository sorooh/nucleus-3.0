/**
 * AUTONOMOUS SCHEDULER
 * 
 * Runs the complete autonomous cycle at regular intervals:
 * Discovery → AI Thinking → Governance → Execution → Learning
 * 
 * Frequency: Every 10 minutes (configurable)
 */

import * as cron from 'node-cron';
import { supremeAgent } from './autonomous-agent';
import { issueDiscovery } from './issue-discovery';

// ============================================
// Autonomous Scheduler
// ============================================

export class AutonomousScheduler {
  private task: cron.ScheduledTask | null = null;
  private running: boolean = false;
  private cycleCount: number = 0;

  /**
   * Start the autonomous scheduler
   * 
   * @param schedule - Cron schedule (default: every 10 minutes)
   */
  start(schedule: string = '*/10 * * * *'): void {
    if (this.task) {
      console.log('[AutonomousScheduler] Already running');
      return;
    }

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  🤖 AUTONOMOUS SCHEDULER - STARTING                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`⏰ Schedule: ${schedule}`);
    console.log('🔄 Frequency: Every 10 minutes');
    console.log('🎯 Actions: Discover → Think → Decide → Execute → Learn');
    console.log('');

    // Activate Supreme Agent
    supremeAgent.activate();

    // Schedule the task
    this.task = cron.schedule(schedule, async () => {
      await this.runCycle();
    });

    // Run first cycle immediately
    setTimeout(() => {
      this.runCycle();
    }, 5000); // Wait 5 seconds after startup

    console.log('✅ [AutonomousScheduler] Started successfully');
    console.log('');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.task) {
      console.log('[AutonomousScheduler] Not running');
      return;
    }

    this.task.stop();
    this.task = null;
    supremeAgent.deactivate();
    
    console.log('[AutonomousScheduler] Stopped');
  }

  /**
   * Run a complete autonomous cycle
   */
  private async runCycle(): Promise<void> {
    if (this.running) {
      console.log('[AutonomousScheduler] Previous cycle still running, skipping...');
      return;
    }

    this.running = true;
    this.cycleCount++;

    try {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log(`║  🚀 AUTONOMOUS CYCLE #${this.cycleCount} - STARTING                   ║`);
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log(`⏰ Time: ${new Date().toISOString()}`);
      console.log('');

      // Step 1: Discover issues
      console.log('━━━ Step 1: Discovery ━━━');
      const allIssues = await issueDiscovery.discoverAll();
      
      // Step 2: Prioritize issues
      console.log('━━━ Step 2: Prioritization ━━━');
      const prioritizedIssues = issueDiscovery.prioritize(allIssues);
      
      // Take top 5 most critical issues
      const issuesToProcess = prioritizedIssues.slice(0, 5);
      
      console.log(`🎯 Processing top ${issuesToProcess.length} priority issues`);
      console.log('');

      if (issuesToProcess.length === 0) {
        console.log('✅ No issues found - system is healthy!');
        console.log('');
        return;
      }

      // Step 3: Process through Supreme Agent
      console.log('━━━ Step 3: Supreme Agent Processing ━━━');
      const summary = await supremeAgent.runCycle(issuesToProcess);

      // Step 4: Log summary
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log(`║  ✅ AUTONOMOUS CYCLE #${this.cycleCount} - COMPLETED               ║`);
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log(`📊 Issues Discovered:   ${allIssues.length}`);
      console.log(`🎯 Issues Processed:    ${summary.issuesProcessed}`);
      console.log(`✅ Decisions Approved:  ${summary.decisionsApproved}`);
      console.log(`⚡ Actions Executed:    ${summary.actionsExecuted}`);
      console.log(`📚 Lessons Learned:     ${summary.lessonsLearned}`);
      console.log(`🎯 Success Rate:        ${summary.issuesProcessed > 0 ? ((summary.actionsExecuted / summary.issuesProcessed) * 100).toFixed(1) : 0}%`);
      console.log(`⏱️  Duration:            ${Date.now() - summary.timestamp.getTime()}ms`);
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log('');

    } catch (error) {
      console.error('❌ [AutonomousScheduler] Cycle failed:', error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    running: boolean;
    cycleCount: number;
  } {
    return {
      running: this.running,
      cycleCount: this.cycleCount
    };
  }
}

// ============================================
// Singleton Instance
// ============================================

export const autonomousScheduler = new AutonomousScheduler();
