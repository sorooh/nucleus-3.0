/**
 * SUPREME AUTONOMOUS AGENT - النواة المركزية الذكية
 * 
 * The central intelligent core that orchestrates all autonomous operations:
 * - AI Committee for intelligent thinking
 * - Governance Gate for ethical validation
 * - Execution Engine for autonomous actions
 * - Learning Loop for continuous improvement
 * - Vector Memory for context-aware decisions
 * 
 * Flow: Discover → Think → Decide → Execute → Learn → Evolve
 */

import { AICommittee } from '../../nucleus/intelligence/ai-committee';
import { alignDecision } from '../governance/alignment/decision-aligner';
import type { DecisionContext } from '../governance/alignment/ethics-evaluator';
import { db } from '../db';
import { autonomousGovernanceDecisions, integrityLearnings } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';
import { executionEngine, type ExecutionRequest } from './execution-engine';

// ============================================
// Types
// ============================================

interface Issue {
  id: string;
  type: 'integrity' | 'performance' | 'security' | 'evolution';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  target: string;
  context: Record<string, any>;
}

interface AutonomousDecision {
  issue: Issue;
  aiAnalysis: {
    decision: string;
    confidence: number;
    reasoning: string;
    strategy: string;
  };
  governanceValidation: {
    approved: boolean;
    ethicsScore: number;
    impactScore: number;
    riskScore: number;
    alignmentScore: number;
    reasoning: string;
  };
  execution?: {
    executed: boolean;
    result?: any;
    error?: string;
  };
  learning?: {
    recorded: boolean;
    lessonId?: string;
  };
}

interface AgentConfig {
  enableAIThinking: boolean;
  enableGovernance: boolean;
  enableExecution: boolean;
  enableLearning: boolean;
  minConfidenceForExecution: number;
  minAlignmentForExecution: number;
}

// ============================================
// Supreme Autonomous Agent
// ============================================

export class SupremeAutonomousAgent {
  private aiCommittee: AICommittee;
  private config: AgentConfig;
  private active: boolean = false;
  private cycleCount: number = 0;

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      enableAIThinking: true,
      enableGovernance: true,
      enableExecution: true,
      enableLearning: true,
      minConfidenceForExecution: 0.6, // AI must be 60% confident
      minAlignmentForExecution: 0.3,  // Governance score must be >= 0.3
      ...config
    };

    this.aiCommittee = new AICommittee({
      models: ['hunyuan', 'openai', 'claude', 'llama', 'mistral', 'falcon'],
      votingStrategy: 'weighted',
      minConsensus: 0.6,
      enableDebate: true
    });
  }

  /**
   * Activate the Supreme Autonomous Agent
   */
  activate(): void {
    if (this.active) {
      console.log('[SupremeAgent] Already active');
      return;
    }

    this.active = true;
    this.aiCommittee.activate();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('👑 SUPREME AUTONOMOUS AGENT - ACTIVATED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧠 AI Thinking:        ', this.config.enableAIThinking ? '✅ Enabled' : '❌ Disabled');
    console.log('⚖️  Governance:         ', this.config.enableGovernance ? '✅ Enabled' : '❌ Disabled');
    console.log('⚡ Execution:          ', this.config.enableExecution ? '✅ Enabled' : '❌ Disabled');
    console.log('📚 Learning:           ', this.config.enableLearning ? '✅ Enabled' : '❌ Disabled');
    console.log('🎯 Min AI Confidence:  ', `${this.config.minConfidenceForExecution * 100}%`);
    console.log('🎯 Min Alignment:      ', this.config.minAlignmentForExecution.toFixed(2));
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  }

  /**
   * Deactivate the agent
   */
  deactivate(): void {
    this.active = false;
    this.aiCommittee.deactivate();
    console.log('[SupremeAgent] Deactivated');
  }

  /**
   * Process a single issue through the complete autonomous cycle
   * 
   * Flow: Think (AI) → Validate (Governance) → Execute → Learn
   */
  async processIssue(issue: Issue): Promise<AutonomousDecision> {
    if (!this.active) {
      throw new Error('Supreme Autonomous Agent is not active');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 [SupremeAgent] Processing Issue: ${issue.type} - ${issue.severity}`);
    console.log(`   Target: ${issue.target}`);
    console.log(`   Description: ${issue.description}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const decision: AutonomousDecision = {
      issue,
      aiAnalysis: { decision: '', confidence: 0, reasoning: '', strategy: '' },
      governanceValidation: {
        approved: false,
        ethicsScore: 0,
        impactScore: 0,
        riskScore: 0,
        alignmentScore: 0,
        reasoning: ''
      }
    };

    // Step 1: AI Thinking
    if (this.config.enableAIThinking) {
      decision.aiAnalysis = await this.thinkWithAI(issue);
    } else {
      // Simple fallback
      decision.aiAnalysis = {
        decision: `Auto-fix ${issue.type} issue`,
        confidence: 0.5,
        reasoning: 'AI thinking disabled, using fallback',
        strategy: 'automatic'
      };
    }

    console.log(`🧠 [AI Decision] ${decision.aiAnalysis.decision}`);
    console.log(`   Confidence: ${(decision.aiAnalysis.confidence * 100).toFixed(1)}%`);
    console.log(`   Strategy: ${decision.aiAnalysis.strategy}`);

    // Step 2: Governance Validation
    if (this.config.enableGovernance) {
      decision.governanceValidation = await this.validateWithGovernance(issue, decision.aiAnalysis);
    } else {
      decision.governanceValidation.approved = true;
      decision.governanceValidation.alignmentScore = 1.0;
    }

    console.log(`⚖️  [Governance] ${decision.governanceValidation.approved ? '✅ Approved' : '❌ Blocked'}`);
    console.log(`   Alignment: ${decision.governanceValidation.alignmentScore.toFixed(2)}`);
    console.log(`   Ethics: ${decision.governanceValidation.ethicsScore.toFixed(2)} | Impact: ${decision.governanceValidation.impactScore.toFixed(2)} | Risk: ${decision.governanceValidation.riskScore.toFixed(2)}`);

    // Step 3: Execution (if approved and confident)
    const shouldExecute = this.shouldExecute(decision);
    
    if (shouldExecute && this.config.enableExecution) {
      decision.execution = await this.executeDecision(issue, decision.aiAnalysis);
      
      if (decision.execution.executed) {
        console.log(`⚡ [Execution] ✅ Successfully executed`);
      } else {
        console.log(`⚡ [Execution] ❌ Failed: ${decision.execution.error}`);
      }
    } else {
      decision.execution = {
        executed: false,
        error: shouldExecute ? 'Execution disabled' : 'Does not meet execution criteria'
      };
      console.log(`⚡ [Execution] ⏸️  Skipped: ${decision.execution.error}`);
    }

    // Step 4: Learning (record the outcome)
    if (this.config.enableLearning) {
      decision.learning = await this.recordLearning(issue, decision);
      console.log(`📚 [Learning] ${decision.learning.recorded ? '✅ Lesson recorded' : '⏸️  Not recorded'}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    return decision;
  }

  /**
   * Run a complete autonomous cycle
   * Discovers issues, processes each through the full pipeline
   */
  async runCycle(issues: Issue[]): Promise<{
    cycleNumber: number;
    timestamp: Date;
    issuesProcessed: number;
    decisionsApproved: number;
    actionsExecuted: number;
    lessonsLearned: number;
    decisions: AutonomousDecision[];
  }> {
    this.cycleCount++;

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  🤖 AUTONOMOUS CYCLE #${this.cycleCount}                              ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`📋 Issues to process: ${issues.length}`);
    console.log('');

    const decisions: AutonomousDecision[] = [];
    let approved = 0;
    let executed = 0;
    let learned = 0;

    // Process each issue
    for (const issue of issues) {
      const decision = await this.processIssue(issue);
      decisions.push(decision);

      if (decision.governanceValidation.approved) approved++;
      if (decision.execution?.executed) executed++;
      if (decision.learning?.recorded) learned++;
    }

    const summary = {
      cycleNumber: this.cycleCount,
      timestamp: new Date(),
      issuesProcessed: issues.length,
      decisionsApproved: approved,
      actionsExecuted: executed,
      lessonsLearned: learned,
      decisions
    };

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  📊 CYCLE #${this.cycleCount} SUMMARY                              ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`📋 Issues Processed:    ${summary.issuesProcessed}`);
    console.log(`✅ Decisions Approved:  ${summary.decisionsApproved}`);
    console.log(`⚡ Actions Executed:    ${summary.actionsExecuted}`);
    console.log(`📚 Lessons Learned:     ${summary.lessonsLearned}`);
    console.log(`🎯 Success Rate:        ${summary.issuesProcessed > 0 ? ((summary.actionsExecuted / summary.issuesProcessed) * 100).toFixed(1) : 0}%`);
    console.log('');

    return summary;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Use AI Committee to think about the issue
   */
  private async thinkWithAI(issue: Issue): Promise<{
    decision: string;
    confidence: number;
    reasoning: string;
    strategy: string;
  }> {
    console.log('🧠 [AI] Analyzing issue with AI Committee...');

    const prompt = `You are Nicholas 3.2, the Supreme Autonomous Core of Surooh Empire.

**ISSUE DETECTED:**
- Type: ${issue.type}
- Severity: ${issue.severity}
- Target: ${issue.target}
- Description: ${issue.description}
- Context: ${JSON.stringify(issue.context, null, 2)}

**YOUR TASK:**
Analyze this issue and decide the best course of action. Respond in JSON format:

{
  "decision": "Clear, actionable decision (e.g., 'Repair mock data in user module', 'Optimize database query')",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of why this is the best approach",
  "strategy": "Specific strategy to implement (e.g., 'replace mock with real API', 'add database index')"
}

**IMPORTANT:**
- Be specific and actionable
- Consider impact on system stability
- Prioritize honesty and real data over simulations
- Think about potential risks`;

    try {
      const committeeDecision = await this.aiCommittee.decide(prompt, {
        systemPrompt: 'You are a strategic AI analyzing system issues for autonomous resolution.'
      });

      // Parse the AI response
      let parsed: any;
      try {
        // Try to extract JSON from the response
        const jsonMatch = committeeDecision.finalDecision.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback if no JSON found
          parsed = {
            decision: committeeDecision.finalDecision,
            confidence: committeeDecision.confidence,
            reasoning: committeeDecision.synthesizedReasoning,
            strategy: 'automatic'
          };
        }
      } catch (parseError) {
        // If parsing fails, use the raw response
        parsed = {
          decision: committeeDecision.finalDecision,
          confidence: committeeDecision.confidence,
          reasoning: committeeDecision.synthesizedReasoning,
          strategy: 'automatic'
        };
      }

      return {
        decision: parsed.decision || committeeDecision.finalDecision,
        confidence: parsed.confidence || committeeDecision.confidence,
        reasoning: parsed.reasoning || committeeDecision.synthesizedReasoning,
        strategy: parsed.strategy || 'automatic'
      };
    } catch (error) {
      console.error('❌ [AI] Failed to get AI decision:', error);
      // Fallback decision
      return {
        decision: `Auto-repair ${issue.type} issue in ${issue.target}`,
        confidence: 0.5,
        reasoning: 'AI Committee failed, using fallback strategy',
        strategy: 'fallback'
      };
    }
  }

  /**
   * Validate decision through Governance Gate
   */
  private async validateWithGovernance(
    issue: Issue,
    aiAnalysis: { decision: string; reasoning: string; strategy: string }
  ): Promise<{
    approved: boolean;
    ethicsScore: number;
    impactScore: number;
    riskScore: number;
    alignmentScore: number;
    reasoning: string;
  }> {
    console.log('⚖️  [Governance] Validating decision...');

    const context: DecisionContext = {
      action: aiAnalysis.decision,
      target: issue.target,
      description: `${issue.description}\n\nAI Strategy: ${aiAnalysis.strategy}`,
      impact: `Resolves ${issue.severity} ${issue.type} issue`
    };

    const result = await alignDecision(context);

    // Save to database
    await db.insert(autonomousGovernanceDecisions).values({
      action: context.action,
      target: context.target,
      description: context.description,
      impact: context.impact,
      ethicsScore: result.ethics,
      impactScore: result.impact,
      riskScore: result.risk,
      alignmentScore: result.score,
      approved: result.approved ? 1 : 0,
      reasoning: result.reasoning,
      recommendation: result.recommendation,
      ethicsViolations: result.details.ethicsViolations,
      impactBenefits: result.details.impactBenefits,
      riskFactors: result.details.riskFactors,
      mitigations: result.details.mitigations,
      source: 'supreme-agent',
      executed: 0
    });

    return {
      approved: result.approved,
      ethicsScore: result.ethics,
      impactScore: result.impact,
      riskScore: result.risk,
      alignmentScore: result.score,
      reasoning: result.reasoning
    };
  }

  /**
   * Should this decision be executed?
   */
  private shouldExecute(decision: AutonomousDecision): boolean {
    // Must be approved by governance
    if (!decision.governanceValidation.approved) {
      return false;
    }

    // Must meet minimum confidence
    if (decision.aiAnalysis.confidence < this.config.minConfidenceForExecution) {
      return false;
    }

    // Must meet minimum alignment score
    if (decision.governanceValidation.alignmentScore < this.config.minAlignmentForExecution) {
      return false;
    }

    return true;
  }

  /**
   * Execute the approved decision
   * This is where the actual autonomous action happens!
   */
  private async executeDecision(
    issue: Issue,
    aiAnalysis: { decision: string; strategy: string }
  ): Promise<{ executed: boolean; result?: any; error?: string }> {
    console.log('⚡ [Execution] Executing autonomous decision...');

    try {
      // Map issue type to execution type
      const executionType = this.mapIssueToExecutionType(issue.type);
      
      // Create execution request
      const request: ExecutionRequest = {
        type: executionType,
        action: aiAnalysis.decision,
        target: issue.target,
        strategy: aiAnalysis.strategy,
        context: issue.context
      };

      // Execute through Intelligent Execution Engine
      const executionResult = await executionEngine.execute(request);
      
      return {
        executed: executionResult.success,
        result: executionResult.output,
        error: executionResult.error
      };
    } catch (error) {
      console.error('❌ [Execution] Failed:', error);
      return {
        executed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map issue type to execution type
   */
  private mapIssueToExecutionType(
    issueType: 'integrity' | 'performance' | 'security' | 'evolution'
  ): ExecutionRequest['type'] {
    switch (issueType) {
      case 'integrity':
        return 'code_repair';
      case 'evolution':
        return 'code_generation';
      case 'performance':
        return 'performance';
      case 'security':
        return 'security';
      default:
        return 'code_repair';
    }
  }

  /**
   * Record the learning from this decision
   */
  private async recordLearning(
    issue: Issue,
    decision: AutonomousDecision
  ): Promise<{ recorded: boolean; lessonId?: string }> {
    console.log('📚 [Learning] Recording lesson...');

    try {
      // Record in integrity learnings
      const lesson = await db.insert(integrityLearnings).values({
        modulePath: issue.target,
        lessonLearned: `${issue.type} issue (${issue.severity}): ${decision.aiAnalysis.decision}`,
        repairType: decision.aiAnalysis.strategy,
        wasSuccessful: decision.execution?.executed ? 1 : 0,
        verificationPassed: decision.execution?.executed ? 1 : 0,
        impact: issue.severity === 'high' ? 'high' : issue.severity === 'medium' ? 'medium' : 'low',
        applicability: issue.type
      }).returning();

      return {
        recorded: true,
        lessonId: lesson[0]?.id
      };
    } catch (error) {
      console.error('❌ [Learning] Failed to record:', error);
      return {
        recorded: false
      };
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const supremeAgent = new SupremeAutonomousAgent();
