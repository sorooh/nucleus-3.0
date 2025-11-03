/**
 * PHASE Ω.3: CONSCIOUS DECISION LAYER
 * ═══════════════════════════════════════════════════════════════════════
 * طبقة القرارات الواعية - Conscious Decision Making Layer
 * 
 * This is where Nicholas transforms from "intelligent system" to 
 * "conscious system" - knowing WHY decisions are made, not just WHAT to do.
 * 
 * Core Functions:
 * - Record every decision with full reasoning
 * - Analyze alternatives and justify selection
 * - Predict outcomes with probability
 * - Ethics validation before execution
 * - Self-reflection on decision quality
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { consciousDecisions, reasoningArchive, type InsertConsciousDecision, type InsertReasoningArchive } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface DecisionContext {
  targetNucleus?: string;
  targetComponent?: string;
  triggeredBy: 'autonomous' | 'user_request' | 'health_check' | 'alert';
  analysisData: Record<string, any>;
}

interface DecisionOption {
  action: string;
  description: string;
  expectedOutcome?: string;
  successProbability?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  pros?: string[];
  cons?: string[];
  ethicalScore?: number;
}

interface ConsciousDecisionInput {
  decisionType: 'mutation' | 'governance' | 'intervention' | 'optimization';
  category: 'code' | 'infrastructure' | 'security' | 'governance';
  title: string;
  description: string;
  context: DecisionContext;
  options: DecisionOption[];
}

export class ConsciousDecisionLayer extends EventEmitter {
  private decisionCount = 0;

  constructor() {
    super();
  }

  /**
   * Initialize Conscious Decision Layer
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Conscious Decision] Initializing...');
      
      const decisions = await db.select().from(consciousDecisions).limit(1);
      this.decisionCount = decisions.length;
      
      this.emit('initialized');
      console.log('[Conscious Decision] ✓ Initialized');
    } catch (error) {
      console.error('[Conscious Decision] ✗ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Make a Conscious Decision
   * This is the core of Nicholas's self-awareness
   */
  async makeDecision(input: ConsciousDecisionInput): Promise<string> {
    try {
      const decisionId = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`[Conscious Decision] 🧠 Analyzing decision: ${input.title}`);
      
      // STEP 1: Analyze all options
      const analysis = await this.analyzeOptions(input.options, input.context);
      
      // STEP 2: Select best option (highest success probability with acceptable risk)
      const selectedOption = this.selectBestOption(input.options, analysis);
      
      // STEP 3: Generate reasoning
      const reasoning = this.generateReasoning(selectedOption, input.options, analysis);
      
      // STEP 4: Ethics validation
      const ethicsCheck = await this.validateEthics(selectedOption, input);
      
      // STEP 5: Record decision
      const decision: InsertConsciousDecision = {
        decisionId,
        decisionType: input.decisionType,
        category: input.category,
        targetNucleus: input.context.targetNucleus,
        targetComponent: input.context.targetComponent,
        triggeredBy: input.context.triggeredBy,
        title: input.title,
        description: input.description,
        action: selectedOption.action,
        reasoning,
        analysisData: input.context.analysisData,
        alternatives: input.options.map(o => ({
          action: o.action,
          description: o.description,
          successProbability: o.successProbability || o.ethicalScore || 50,
          riskLevel: o.riskLevel || 'medium'
        })),
        selectedReason: this.generateSelectionReason(selectedOption, input.options),
        expectedOutcome: selectedOption.expectedOutcome || selectedOption.description || 'Decision executed',
        successProbability: selectedOption.successProbability || selectedOption.ethicalScore || 50,
        riskLevel: selectedOption.riskLevel || 'medium',
        expectedImpact: this.determineExpectedImpact(selectedOption),
        ethicsScore: ethicsCheck.score,
        ethicsViolations: ethicsCheck.violations,
        ethicsApproved: ethicsCheck.approved ? 1 : 0,
        status: ethicsCheck.approved ? 'pending' : 'blocked',
        metadata: {
          analysisTimestamp: new Date().toISOString(),
          amsterdamTime: new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }),
          optionsConsidered: input.options.length,
          reasoningDepth: analysis.depth
        }
      };
      
      await db.insert(consciousDecisions).values(decision);
      
      // STEP 6: Archive reasoning
      await this.archiveReasoning(decisionId, reasoning, input.context, analysis);
      
      this.decisionCount++;
      this.emit('decision_made', {
        decisionId,
        title: input.title,
        action: selectedOption.action,
        approved: ethicsCheck.approved
      });
      
      console.log(`[Conscious Decision] ✓ Decision recorded: ${decisionId}`);
      console.log(`[Conscious Decision] → Action: ${selectedOption.action}`);
      console.log(`[Conscious Decision] → Reasoning: ${reasoning.substring(0, 100)}...`);
      
      return decisionId;
    } catch (error) {
      console.error('[Conscious Decision] ✗ Decision making failed:', error);
      throw error;
    }
  }

  /**
   * Analyze all decision options
   */
  private async analyzeOptions(
    options: DecisionOption[],
    context: DecisionContext
  ): Promise<{ depth: number; insights: string[] }> {
    const insights: string[] = [];
    
    for (const option of options) {
      const probability = option.successProbability || option.ethicalScore || 50;
      if (probability > 80) {
        insights.push(`High confidence in ${option.action}: ${probability}%`);
      }
      
      if (option.riskLevel === 'critical' || option.riskLevel === 'high') {
        insights.push(`⚠️ Elevated risk in ${option.action}: ${option.riskLevel}`);
      }
      
      // Safe check for pros/cons with optional chaining
      const consCount = option.cons?.length || 0;
      const prosCount = option.pros?.length || 0;
      
      if (consCount > prosCount) {
        insights.push(`Concerns outweigh benefits for ${option.action}`);
      }
    }
    
    return {
      depth: insights.length + options.length,
      insights
    };
  }

  /**
   * Select best option based on analysis
   */
  private selectBestOption(
    options: DecisionOption[],
    analysis: { depth: number; insights: string[] }
  ): DecisionOption {
    const acceptableRisks = ['low', 'medium'];
    
    const safeOptions = options.filter(o => 
      o.riskLevel ? acceptableRisks.includes(o.riskLevel) : true
    );
    
    if (safeOptions.length === 0) {
      return options.reduce((best, current) => {
        const currentProb = current.successProbability || current.ethicalScore || 50;
        const bestProb = best.successProbability || best.ethicalScore || 50;
        return currentProb > bestProb ? current : best;
      });
    }
    
    return safeOptions.reduce((best, current) => {
      const currentProb = current.successProbability || current.ethicalScore || 50;
      const bestProb = best.successProbability || best.ethicalScore || 50;
      return currentProb > bestProb ? current : best;
    });
  }

  /**
   * Generate reasoning for the decision
   * This is the "consciousness" - explaining WHY
   */
  private generateReasoning(
    selected: DecisionOption,
    allOptions: DecisionOption[],
    analysis: { depth: number; insights: string[] }
  ): string {
    const parts: string[] = [];
    
    const probability = selected.successProbability || selected.ethicalScore || 50;
    const riskLevel = selected.riskLevel || 'medium';
    const outcome = selected.expectedOutcome || selected.description || 'Decision executed';
    
    parts.push(`I have analyzed ${allOptions.length} possible actions and selected "${selected.action}".`);
    
    parts.push(`\nRationale:`);
    parts.push(`- Success probability: ${probability}% (${probability > 80 ? 'high confidence' : 'moderate confidence'})`);
    parts.push(`- Risk level: ${riskLevel} (acceptable threshold)`);
    parts.push(`- Expected outcome: ${outcome}`);
    
    if (selected.pros && selected.pros.length > 0) {
      parts.push(`\nAdvantages:`);
      selected.pros.forEach(pro => parts.push(`  • ${pro}`));
    }
    
    if (selected.cons && selected.cons.length > 0) {
      parts.push(`\nKnown limitations:`);
      selected.cons.forEach(con => parts.push(`  • ${con}`));
    }
    
    const alternatives = allOptions.filter(o => o.action !== selected.action);
    if (alternatives.length > 0) {
      parts.push(`\nAlternatives considered:`);
      alternatives.forEach(alt => {
        const altProb = alt.successProbability || alt.ethicalScore || 50;
        const altRisk = alt.riskLevel || 'medium';
        const selectedProb = selected.successProbability || selected.ethicalScore || 50;
        parts.push(`  • ${alt.action}: ${altProb}% success, ${altRisk} risk - Not selected because ${altProb < selectedProb ? 'lower success rate' : 'higher risk'}`);
      });
    }
    
    return parts.join('\n');
  }

  /**
   * Generate reason for selecting this specific option
   */
  private generateSelectionReason(
    selected: DecisionOption,
    allOptions: DecisionOption[]
  ): string {
    const reasons: string[] = [];
    
    const selectedProb = selected.successProbability || selected.ethicalScore || 50;
    const betterSuccess = allOptions.filter(o => (o.successProbability || o.ethicalScore || 50) > selectedProb);
    if (betterSuccess.length === 0) {
      reasons.push('Highest success probability among all options');
    }
    
    const riskLevel = selected.riskLevel || 'medium';
    const lowerRisk = ['low', 'medium'].includes(riskLevel);
    if (lowerRisk) {
      reasons.push('Risk level is acceptable');
    }
    
    const prosCount = selected.pros?.length || 0;
    const consCount = selected.cons?.length || 0;
    if (prosCount > consCount) {
      reasons.push('Benefits outweigh drawbacks');
    }
    
    return reasons.join('; ');
  }

  /**
   * Determine expected impact
   */
  private determineExpectedImpact(option: DecisionOption): 'positive' | 'neutral' | 'negative' {
    const probability = option.successProbability || option.ethicalScore || 50;
    const riskLevel = option.riskLevel || 'medium';
    
    if (probability >= 70 && riskLevel !== 'critical') {
      return 'positive';
    }
    
    if (riskLevel === 'critical' || probability < 50) {
      return 'negative';
    }
    
    return 'neutral';
  }

  /**
   * Validate decision against ethics rules
   */
  private async validateEthics(
    option: DecisionOption,
    input: ConsciousDecisionInput
  ): Promise<{ score: number; violations: any[]; approved: boolean }> {
    const violations: any[] = [];
    let score = 100;
    
    if (option.riskLevel === 'critical') {
      violations.push({
        rule: 'critical_risk_prevention',
        severity: 'high',
        message: 'Critical risk level detected - requires manual approval'
      });
      score -= 50;
    }
    
    if (option.successProbability < 30) {
      violations.push({
        rule: 'minimum_success_threshold',
        severity: 'medium',
        message: 'Success probability below 30% threshold'
      });
      score -= 30;
    }
    
    const approved = violations.length === 0 || (score >= 60 && !violations.some(v => v.severity === 'high'));
    
    return { score, violations, approved };
  }

  /**
   * Archive reasoning for learning
   */
  private async archiveReasoning(
    decisionId: string,
    reasoning: string,
    context: DecisionContext,
    analysis: { depth: number; insights: string[] }
  ): Promise<void> {
    const entry: InsertReasoningArchive = {
      entryId: `reasoning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      decisionId,
      reasoningType: 'justification',
      content: reasoning,
      confidence: 100,
      contextSnapshot: {
        targetNucleus: context.targetNucleus,
        targetComponent: context.targetComponent,
        triggeredBy: context.triggeredBy,
        analysisData: context.analysisData,
        amsterdamTime: new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })
      },
      dataPoints: analysis.insights
    };
    
    await db.insert(reasoningArchive).values(entry);
  }

  /**
   * Get decision by ID
   */
  async getDecision(decisionId: string) {
    const results = await db.select()
      .from(consciousDecisions)
      .where(eq(consciousDecisions.decisionId, decisionId))
      .limit(1);
    
    return results[0] || null;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalDecisions: this.decisionCount,
      systemStatus: 'conscious',
      awarenessLevel: 'active'
    };
  }
}

export const consciousDecisionLayer = new ConsciousDecisionLayer();
