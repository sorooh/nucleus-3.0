/**
 * Action Generator - Phase 9.7
 * مولّد القرارات الذكية
 * 
 * يُنتج قرارات ذكية بناءً على التحليل من Learning Engine
 * ويرسلها إلى العقد الفرعية موقّعة رقمياً
 */

import { db } from '../db';
import {
  autonomousDecisions,
  federationNodes,
  type InsertAutonomousDecision,
  type AutonomousDecision
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { learningEngine } from './autonomous-learning-engine';

/**
 * Decision Template
 */
interface DecisionTemplate {
  type: string;
  category: string;
  payload: any;
  expectedImpact: string;
}

/**
 * Generated Decision
 */
interface GeneratedDecision {
  decisionId: string;
  nodeId: string;
  decision: AutonomousDecision;
  signature: string;
}

/**
 * Action Generator Class
 */
export class ActionGenerator {
  
  /**
   * Generate decision from learning insight
   */
  async generateDecision(insight: {
    nodeId: string;
    category: string;
    pattern: any;
    confidence: number;
    recommendation: string;
    reasoning: string;
  }): Promise<GeneratedDecision> {
    
    console.log(`[Action Generator] 🎯 Generating decision for node: ${insight.nodeId}`);
    
    // Verify node exists and is active
    const node = await this.verifyNode(insight.nodeId);
    if (!node) {
      throw new Error(`Node ${insight.nodeId} not found or inactive`);
    }
    
    // Determine decision type based on pattern
    const decisionType = this.determineDecisionType(insight.pattern);
    
    // Build decision payload
    const payload = this.buildDecisionPayload(insight, decisionType);
    
    // Generate unique decision ID
    const decisionId = this.generateDecisionId(insight.nodeId);
    
    // Calculate confidence (from learning engine)
    const confidence = Math.min(insight.confidence, 0.95);
    
    // Create decision record
    const decisionData: InsertAutonomousDecision = {
      decisionId,
      nodeId: insight.nodeId,
      decisionType,
      category: insight.category,
      payload,
      reasoning: insight.reasoning,
      confidence,
      feedbackScore: 0,
      successRate: 0.5,
      expectedImpact: insight.recommendation,
      status: 'pending',
      feedbackReceived: 0,
      sourcePattern: insight.pattern.patternId,
      learningCycle: 1,
      modelVersion: 'v1.0',
      tags: [decisionType, insight.category, 'autonomous'],
      metadata: {
        generatedAt: new Date().toISOString(),
        nodeInfo: {
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          nodeType: node.nodeType
        },
        patternInfo: {
          patternId: insight.pattern.patternId,
          patternName: insight.pattern.name,
          frequency: insight.pattern.frequency
        }
      }
    };
    
    // Insert into database
    const [decision] = await db
      .insert(autonomousDecisions)
      .values(decisionData)
      .returning();
    
    console.log(`[Action Generator] ✅ Decision created: ${decisionId}`);
    
    // Generate digital signature
    const signature = this.signDecision(decision);
    
    return {
      decisionId,
      nodeId: insight.nodeId,
      decision,
      signature
    };
  }

  /**
   * Generate multiple decisions from insights
   */
  async generateBatchDecisions(insights: any[]): Promise<GeneratedDecision[]> {
    console.log(`[Action Generator] Generating ${insights.length} decisions`);
    
    const decisions: GeneratedDecision[] = [];
    
    for (const insight of insights) {
      try {
        const decision = await this.generateDecision(insight);
        decisions.push(decision);
      } catch (error: any) {
        console.error(`[Action Generator] Failed to generate decision for ${insight.nodeId}:`, error.message);
      }
    }
    
    console.log(`[Action Generator] ✅ Generated ${decisions.length} decisions`);
    return decisions;
  }

  /**
   * Verify node exists and is active
   */
  private async verifyNode(nodeId: string): Promise<any | null> {
    const [node] = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, nodeId))
      .limit(1);
    
    if (!node || node.status !== 'active') {
      return null;
    }
    
    return node;
  }

  /**
   * Determine decision type from pattern
   */
  private determineDecisionType(pattern: any): string {
    const patternType = pattern.patternType || 'unknown';
    
    switch (patternType) {
      case 'recurring-issue':
        return 'automate';
      
      case 'optimization-opportunity':
        return 'optimize';
      
      case 'security-risk':
        return 'alert';
      
      case 'configuration-drift':
        return 'adjust';
      
      default:
        return 'optimize';
    }
  }

  /**
   * Build decision payload based on insight
   */
  private buildDecisionPayload(insight: any, decisionType: string): any {
    const basePayload = {
      action: decisionType,
      target: insight.pattern.name,
      priority: this.calculatePriority(insight),
      recommendation: insight.recommendation,
      evidence: {
        patternId: insight.pattern.patternId,
        frequency: insight.pattern.frequency,
        confidence: insight.confidence
      }
    };
    
    // Add type-specific details
    switch (decisionType) {
      case 'automate':
        return {
          ...basePayload,
          automation: {
            script: `automate_${insight.pattern.name.toLowerCase().replace(/\s+/g, '_')}`,
            schedule: 'on-detection',
            parameters: insight.pattern.metadata || {}
          }
        };
      
      case 'optimize':
        return {
          ...basePayload,
          optimization: {
            metric: insight.category,
            targetImprovement: '15%',
            approach: 'adaptive'
          }
        };
      
      case 'alert':
        return {
          ...basePayload,
          alert: {
            severity: 'high',
            requiresAction: true,
            escalationPath: ['node-admin', 'nicholas-core']
          }
        };
      
      case 'adjust':
        return {
          ...basePayload,
          adjustment: {
            configPath: insight.pattern.metadata?.configPath || 'unknown',
            newValue: insight.pattern.metadata?.suggestedValue,
            rollbackPlan: true
          }
        };
      
      default:
        return basePayload;
    }
  }

  /**
   * Calculate priority (1-10)
   */
  private calculatePriority(insight: any): number {
    const frequency = insight.pattern.frequency || 1;
    const confidence = insight.confidence || 0.5;
    
    // Higher frequency + higher confidence = higher priority
    const priority = Math.min(10, Math.ceil((frequency / 10) * confidence * 10));
    
    return Math.max(1, priority);
  }

  /**
   * Generate unique decision ID
   * HONEST: Use deterministic hash without random component
   */
  private generateDecisionId(nodeId: string): string {
    const timestamp = Date.now();
    const hash = crypto
      .createHash('sha256')
      .update(`${nodeId}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    return `auto-${timestamp}-${hash}`;
  }

  /**
   * Sign decision with HMAC-SHA256
   */
  private signDecision(decision: AutonomousDecision): string {
    const payload = JSON.stringify({
      decisionId: decision.decisionId,
      nodeId: decision.nodeId,
      type: decision.decisionType,
      payload: decision.payload,
      timestamp: decision.createdAt
    });
    
    const secret = process.env.CHAT_HMAC_SECRET || 'fallback-secret';
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature;
  }

  /**
   * Get decision by ID
   */
  async getDecision(decisionId: string): Promise<AutonomousDecision | null> {
    const [decision] = await db
      .select()
      .from(autonomousDecisions)
      .where(eq(autonomousDecisions.decisionId, decisionId))
      .limit(1);
    
    return decision || null;
  }

  /**
   * Update decision status
   */
  async updateDecisionStatus(
    decisionId: string,
    status: 'sent' | 'executed' | 'failed',
    metadata?: any
  ): Promise<void> {
    const updates: any = { status };
    
    if (status === 'sent') {
      updates.sentAt = new Date();
    } else if (status === 'executed') {
      updates.executedAt = new Date();
      if (metadata?.executedBy) {
        updates.executedBy = metadata.executedBy;
      }
      if (metadata?.executionTime) {
        updates.executionTime = metadata.executionTime;
      }
    }
    
    await db
      .update(autonomousDecisions)
      .set(updates)
      .where(eq(autonomousDecisions.decisionId, decisionId));
    
    console.log(`[Action Generator] Decision ${decisionId} status updated to: ${status}`);
  }
}

// Export singleton instance
export const actionGenerator = new ActionGenerator();

console.log('[Action Generator] Module loaded');
