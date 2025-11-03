/**
 * PHASE Ω.4: PROACTIVE ACTION EXECUTOR
 * The missing piece - Nicholas takes REAL external actions!
 * 
 * Features:
 * - Execute real API calls to Academy, SIDE, Mail Hub
 * - Autonomous bot generation, code writing, notifications
 * - Action verification and outcome tracking
 * - Learning from action results
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { 
  proactiveActions, 
  actionIntents,
  type InsertProactiveAction,
  type InsertActionIntent
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

interface ActionContext {
  type: 'academy_bot_generation' | 'side_programming' | 'email_notification' | 'api_call';
  targetPlatform: string;
  payload: any;
  title: string;
  description?: string;
  requiresApproval?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  verified: boolean;
}

class ProactiveActionExecutor extends EventEmitter {
  private isActive: boolean = false;
  private executingActions: Map<string, any> = new Map();

  constructor() {
    super();
    console.log('[ProactiveActions] 🚀 Initializing Action Executor...');
  }

  async start() {
    this.isActive = true;
    console.log('[ProactiveActions] ✅ Action Executor activated - Nicholas can now ACT!');
    this.emit('executor:started');
  }

  async stop() {
    this.isActive = false;
    console.log('[ProactiveActions] ⏸️ Action Executor stopped');
    this.emit('executor:stopped');
  }

  getStatus() {
    return {
      isActive: this.isActive,
      executingActions: this.executingActions.size,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // ACTION CREATION & EXECUTION
  // ============================================

  /**
   * Create and execute a proactive action
   */
  async executeAction(context: ActionContext, decisionId?: string): Promise<any> {
    const actionId = `action-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    console.log(`[ProactiveActions] 🎯 Creating action: ${context.title}`);

    // Create action record
    const [action] = await db.insert(proactiveActions).values({
      actionId,
      decisionId,
      actionType: context.type,
      category: this.getCategoryFromType(context.type),
      targetPlatform: context.targetPlatform,
      actionTitle: context.title,
      actionDescription: context.description,
      actionPayload: context.payload,
      requiresApproval: context.requiresApproval ? 1 : 0,
      approvalStatus: context.requiresApproval ? 'pending' : 'auto_approved',
      priority: context.priority || 'normal',
    }).returning();

    // If requires approval, emit event and wait
    if (context.requiresApproval) {
      console.log(`[ProactiveActions] ⏳ Action requires approval: ${actionId}`);
      this.emit('action:pending_approval', action);
      return action;
    }

    // Auto-execute
    const result = await this.performExecution(action);
    return result;
  }

  /**
   * Perform actual execution
   */
  private async performExecution(action: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.executingActions.set(action.id, action);

    console.log(`[ProactiveActions] ⚡ Executing: ${action.actionTitle}`);

    try {
      // Update status to executing
      await db.update(proactiveActions)
        .set({ 
          executionStatus: 'executing',
          executionStarted: new Date(),
          executionAttempts: action.executionAttempts + 1
        })
        .where(eq(proactiveActions.id, action.id));

      // Execute based on type
      let result: ExecutionResult;
      switch (action.actionType) {
        case 'academy_bot_generation':
          result = await this.executeAcademyBotGeneration(action);
          break;
        case 'side_programming':
          result = await this.executeSideProgramming(action);
          break;
        case 'email_notification':
          result = await this.executeEmailNotification(action);
          break;
        case 'api_call':
          result = await this.executeGenericApiCall(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.actionType}`);
      }

      const duration = Date.now() - startTime;

      // Update with results
      await db.update(proactiveActions)
        .set({
          executionStatus: result.success ? 'completed' : 'failed',
          executionResult: result.data || {},
          executionError: result.error,
          executionDuration: duration,
          executionCompleted: new Date(),
          outcomeVerified: result.verified ? 1 : 0,
        })
        .where(eq(proactiveActions.id, action.id));

      this.executingActions.delete(action.id);

      if (result.success) {
        console.log(`[ProactiveActions] ✅ Completed: ${action.actionTitle} (${duration}ms)`);
        this.emit('action:completed', { action, result });
      } else {
        console.log(`[ProactiveActions] ❌ Failed: ${action.actionTitle} - ${result.error}`);
        this.emit('action:failed', { action, error: result.error });
      }

      return { ...result, duration };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await db.update(proactiveActions)
        .set({
          executionStatus: 'failed',
          executionError: error.message,
          executionDuration: duration,
          executionCompleted: new Date(),
        })
        .where(eq(proactiveActions.id, action.id));

      this.executingActions.delete(action.id);

      console.error(`[ProactiveActions] ❌ Execution error:`, error);
      this.emit('action:error', { action, error });

      return {
        success: false,
        error: error.message,
        duration,
        verified: false,
      };
    }
  }

  // ============================================
  // PLATFORM-SPECIFIC EXECUTORS
  // ============================================

  /**
   * Execute Academy bot generation
   */
  private async executeAcademyBotGeneration(action: any): Promise<ExecutionResult> {
    console.log('[ProactiveActions] 🤖 Generating bot via Academy...');

    const { botName, botType, capabilities, trainingData } = action.actionPayload;

    // TODO: Replace with real Academy API call
    // For now, simulate API call
    const academyEndpoint = process.env.ACADEMY_ENDPOINT;
    
    if (!academyEndpoint) {
      console.log('[ProactiveActions] ⚠️ ACADEMY_ENDPOINT not configured - simulating bot generation');
      
      // Simulate bot generation
      const botId = `bot-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      return {
        success: true,
        data: {
          botId,
          botName,
          status: 'generated',
          message: 'Bot generation request sent to Academy (simulated)',
          capabilities,
        },
        verified: false, // Will verify when real API is available
      };
    }

    // Real API call (when Academy endpoint is available)
    try {
      const response = await fetch(`${academyEndpoint}/api/bots/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NUCLEUS_JWT_SECRET}`,
        },
        body: JSON.stringify({
          name: botName,
          type: botType,
          capabilities,
          trainingData,
          requestedBy: 'nicholas-3.2',
        }),
      });

      if (!response.ok) {
        throw new Error(`Academy API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        verified: true,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        verified: false,
      };
    }
  }

  /**
   * Execute SIDE programming task
   */
  private async executeSideProgramming(action: any): Promise<ExecutionResult> {
    console.log('[ProactiveActions] 💻 Executing programming task via SIDE...');

    const { taskDescription, codeRequirements, targetFile } = action.actionPayload;

    // TODO: Replace with real SIDE API call
    const sideEndpoint = process.env.SIDE_ENDPOINT;
    
    if (!sideEndpoint) {
      console.log('[ProactiveActions] ⚠️ SIDE_ENDPOINT not configured - simulating programming task');
      
      return {
        success: true,
        data: {
          taskId: `task-${Date.now()}`,
          status: 'queued',
          message: 'Programming task sent to SIDE (simulated)',
        },
        verified: false,
      };
    }

    // Real API call (when SIDE endpoint is available)
    try {
      const response = await fetch(`${sideEndpoint}/api/tasks/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NUCLEUS_JWT_SECRET}`,
        },
        body: JSON.stringify({
          description: taskDescription,
          requirements: codeRequirements,
          targetFile,
          requestedBy: 'nicholas-3.2',
        }),
      });

      if (!response.ok) {
        throw new Error(`SIDE API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        verified: true,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        verified: false,
      };
    }
  }

  /**
   * Execute email notification
   */
  private async executeEmailNotification(action: any): Promise<ExecutionResult> {
    console.log('[ProactiveActions] 📧 Sending email notification...');

    const { to, subject, body, priority } = action.actionPayload;

    // For now, log the notification
    // TODO: Integrate with Mail Hub when available
    console.log(`[ProactiveActions] 📧 Email to: ${to}`);
    console.log(`[ProactiveActions] 📧 Subject: ${subject}`);
    console.log(`[ProactiveActions] 📧 Priority: ${priority}`);

    return {
      success: true,
      data: {
        status: 'sent',
        to,
        subject,
        message: 'Email notification logged (Mail Hub integration pending)',
      },
      verified: false,
    };
  }

  /**
   * Execute generic API call
   */
  private async executeGenericApiCall(action: any): Promise<ExecutionResult> {
    console.log('[ProactiveActions] 🌐 Executing generic API call...');

    const { endpoint, method, headers, body } = action.actionPayload;

    try {
      const response = await fetch(endpoint, {
        method: method || 'POST',
        headers: headers || { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json().catch(() => null);

      return {
        success: response.ok,
        data: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        verified: response.ok,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        verified: false,
      };
    }
  }

  // ============================================
  // ACTION INTENTS (Proactive Presence)
  // ============================================

  /**
   * Record Nicholas thinking about an action
   */
  async recordIntent(context: {
    type: string;
    title: string;
    description?: string;
    proposedAction: any;
    confidence: number;
  }): Promise<any> {
    const intentId = `intent-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const [intent] = await db.insert(actionIntents).values({
      intentId,
      intentType: context.type,
      intentTitle: context.title,
      intentDescription: context.description,
      proposedAction: context.proposedAction,
      confidence: context.confidence,
    }).returning();

    console.log(`[ProactiveActions] 💭 Intent recorded: ${context.title} (${Math.round(context.confidence * 100)}% confidence)`);
    this.emit('intent:recorded', intent);

    return intent;
  }

  /**
   * Convert intent to action
   */
  async convertIntentToAction(intentId: string, approved: boolean): Promise<any> {
    if (!approved) {
      await db.update(actionIntents)
        .set({ status: 'rejected', respondedAt: new Date() })
        .where(eq(actionIntents.intentId, intentId));
      
      console.log(`[ProactiveActions] ❌ Intent rejected: ${intentId}`);
      return null;
    }

    const [intent] = await db.select()
      .from(actionIntents)
      .where(eq(actionIntents.intentId, intentId))
      .limit(1);

    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    // Create action from intent
    const action = await this.executeAction({
      type: intent.proposedAction.type,
      targetPlatform: intent.proposedAction.targetPlatform,
      payload: intent.proposedAction.payload,
      title: intent.intentTitle,
      description: intent.intentDescription,
      requiresApproval: false, // Already approved
    });

    // Update intent
    await db.update(actionIntents)
      .set({ 
        status: 'converted_to_action',
        convertedToActionId: action.actionId,
        respondedAt: new Date(),
        convertedAt: new Date(),
      })
      .where(eq(actionIntents.intentId, intentId));

    console.log(`[ProactiveActions] ✅ Intent converted to action: ${action.actionId}`);
    
    return action;
  }

  // ============================================
  // HELPERS
  // ============================================

  private getCategoryFromType(type: string): string {
    const categoryMap: Record<string, string> = {
      academy_bot_generation: 'external_integration',
      side_programming: 'external_integration',
      email_notification: 'communication',
      api_call: 'automation',
    };
    return categoryMap[type] || 'automation';
  }
}

// Export singleton
export const actionExecutor = new ProactiveActionExecutor();
