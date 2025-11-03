/**
 * PHASE Ω.4: DECISION → ACTION BRIDGE
 * Connects Autonomous Decision Engine to Proactive Action Executor
 * 
 * When Nicholas makes a decision, automatically convert it to an action and execute it.
 */

import { EventEmitter } from 'events';
import { actionExecutor } from './action-executor';
import { autonomousDecisionEngine } from '../autonomous-decision';

interface DecisionToActionMapping {
  decisionType: string;
  actionType: 'academy_bot_generation' | 'side_programming' | 'email_notification' | 'api_call';
  targetPlatform: string;
  payloadMapper: (decision: any) => any;
}

// Define how decisions map to actions
const DECISION_ACTION_MAPPINGS: DecisionToActionMapping[] = [
  {
    decisionType: 'generate_bot',
    actionType: 'academy_bot_generation',
    targetPlatform: 'academy',
    payloadMapper: (decision) => ({
      botName: decision.metadata?.botName || `Bot-${Date.now()}`,
      botType: decision.metadata?.botType || 'general',
      capabilities: decision.metadata?.capabilities || [],
      trainingData: decision.metadata?.trainingData || {},
    }),
  },
  {
    decisionType: 'write_code',
    actionType: 'side_programming',
    targetPlatform: 'side',
    payloadMapper: (decision) => ({
      taskDescription: decision.situation || 'Programming task',
      codeRequirements: decision.metadata?.requirements || [],
      targetFile: decision.metadata?.targetFile || null,
    }),
  },
  {
    decisionType: 'send_notification',
    actionType: 'email_notification',
    targetPlatform: 'mail-hub',
    payloadMapper: (decision) => ({
      to: decision.metadata?.recipient || 'admin@surooh.com',
      subject: decision.metadata?.subject || 'Nicholas Notification',
      body: decision.metadata?.body || decision.situation,
      priority: decision.urgency || 'normal',
    }),
  },
];

class DecisionToActionBridge extends EventEmitter {
  private isActive: boolean = false;
  private executedActions: number = 0;

  constructor() {
    super();
    console.log('[Decision→Action Bridge] 🔗 Initializing bridge...');
  }

  async start() {
    this.isActive = true;

    // Listen to decision engine events
    autonomousDecisionEngine.on('decision:made', this.handleDecision.bind(this));

    console.log('[Decision→Action Bridge] ✅ Bridge activated - Decisions will auto-execute as actions');
    this.emit('bridge:started');
  }

  async stop() {
    this.isActive = false;
    autonomousDecisionEngine.off('decision:made', this.handleDecision.bind(this));
    console.log('[Decision→Action Bridge] ⏸️ Bridge stopped');
    this.emit('bridge:stopped');
  }

  getStatus() {
    return {
      isActive: this.isActive,
      executedActions: this.executedActions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle decision made by autonomous engine
   */
  private async handleDecision(decision: any) {
    if (!this.isActive) return;

    console.log(`[Decision→Action Bridge] 🎯 Decision received: ${decision.situation}`);

    // Skip if decision requires approval
    if (decision.requiresApproval === 1 || decision.status !== 'approved') {
      console.log('[Decision→Action Bridge] ⏳ Decision requires approval, skipping auto-execution');
      return;
    }

    // Find matching action mapping
    const mapping = this.findActionMapping(decision);

    if (!mapping) {
      console.log('[Decision→Action Bridge] ⚠️ No action mapping found for this decision');
      return;
    }

    // Convert decision to action
    try {
      const action = await this.convertToAction(decision, mapping);
      
      console.log(`[Decision→Action Bridge] ⚡ Executing action: ${action.title}`);
      
      const result = await actionExecutor.executeAction({
        type: mapping.actionType,
        targetPlatform: mapping.targetPlatform,
        payload: action.payload,
        title: action.title,
        description: action.description,
        requiresApproval: false, // Already approved by decision engine
        priority: this.mapUrgencyToPriority(decision.urgency),
      }, decision.id);

      this.executedActions++;
      
      console.log(`[Decision→Action Bridge] ✅ Action executed successfully`);
      this.emit('action:executed', { decision, action, result });

    } catch (error: any) {
      console.error(`[Decision→Action Bridge] ❌ Failed to execute action:`, error);
      this.emit('action:failed', { decision, error });
    }
  }

  /**
   * Find action mapping for decision
   */
  private findActionMapping(decision: any): DecisionToActionMapping | null {
    // Try to match by decision metadata type
    const decisionType = decision.metadata?.type || decision.selectedOption;
    
    return DECISION_ACTION_MAPPINGS.find(mapping => 
      decisionType?.includes(mapping.decisionType) ||
      decision.situation?.toLowerCase().includes(mapping.decisionType)
    ) || null;
  }

  /**
   * Convert decision to action
   */
  private async convertToAction(decision: any, mapping: DecisionToActionMapping) {
    const payload = mapping.payloadMapper(decision);

    return {
      title: `Nicholas Decision: ${decision.situation}`,
      description: decision.decisionRationale || 'Autonomous decision converted to action',
      payload,
      type: mapping.actionType,
      targetPlatform: mapping.targetPlatform,
    };
  }

  /**
   * Map decision urgency to action priority
   */
  private mapUrgencyToPriority(urgency?: string): 'low' | 'normal' | 'high' | 'critical' {
    switch (urgency) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'normal';
      default:
        return 'low';
    }
  }

  /**
   * Manually trigger action from decision ID
   */
  async executeDecisionAction(decisionId: string) {
    console.log(`[Decision→Action Bridge] 🎯 Manual execution requested for decision: ${decisionId}`);

    // TODO: Load decision from database and execute
    // This can be called from API if needed
  }
}

export const decisionToActionBridge = new DecisionToActionBridge();
