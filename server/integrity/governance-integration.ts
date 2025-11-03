/**
 * Phase Ω.9: Integrity Hub Governance Integration
 * 
 * Integrates governance gate with integrity cycle for pre-execution validation
 */

import { db } from '../db';
import { autonomousGovernanceDecisions } from '@shared/schema';
import { validateRepairAction, validateEvolutionSuggestion, validatePredictiveAction } from '../governance/alignment/governance-middleware';
import type { AlignmentResult } from '../governance/alignment/decision-aligner';

/**
 * Validate and record a repair action
 */
export async function validateAndRecordRepair(
  action: string,
  target: string,
  description: string,
  cycleNumber: number
): Promise<AlignmentResult> {
  console.log(`🚪 [Governance Integration] Validating repair: ${action} → ${target}`);
  
  const result = await validateRepairAction(action, target, description);
  
  // Save to database
  await db.insert(autonomousGovernanceDecisions).values({
    action,
    target,
    description,
    impact: 'Improves system integrity and honesty',
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
    source: 'integrity-hub',
    cycleNumber
  });
  
  return result;
}

/**
 * Validate and record evolution suggestion
 */
export async function validateAndRecordEvolution(
  suggestion: {
    action: string;
    file: string;
    description: string;
    confidence: number;
  },
  cycleNumber: number
): Promise<AlignmentResult> {
  console.log(`🚪 [Governance Integration] Validating evolution: ${suggestion.action} → ${suggestion.file}`);
  
  const result = await validateEvolutionSuggestion(suggestion);
  
  // Save to database
  await db.insert(autonomousGovernanceDecisions).values({
    action: suggestion.action,
    target: suggestion.file,
    description: suggestion.description,
    impact: `System evolution (${suggestion.confidence}% confidence)`,
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
    source: 'integrity-hub',
    cycleNumber
  });
  
  return result;
}

/**
 * Validate and record predictive action
 */
export async function validateAndRecordPrediction(
  prediction: {
    action: string;
    file: string;
    riskPattern: string;
    confidence: number;
  },
  cycleNumber: number
): Promise<AlignmentResult> {
  console.log(`🚪 [Governance Integration] Validating prediction: ${prediction.action} → ${prediction.file}`);
  
  const result = await validatePredictiveAction(prediction);
  
  // Save to database
  await db.insert(autonomousGovernanceDecisions).values({
    action: prediction.action,
    target: prediction.file,
    description: `Proactive: ${prediction.riskPattern}`,
    impact: `Prevents future failures (${prediction.confidence}% confidence)`,
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
    source: 'integrity-hub',
    cycleNumber
  });
  
  return result;
}

/**
 * Auto-execute approved decisions
 * 
 * @param result - Governance alignment result
 * @param executor - Function to execute if approved
 * @returns Execution result
 */
export async function autoExecuteIfApproved<T>(
  result: AlignmentResult,
  executor: () => Promise<T>
): Promise<{ executed: boolean; result?: T; error?: string }> {
  if (!result.approved) {
    console.log(`🚫 [Auto-Execute] Decision blocked - not executing`);
    return {
      executed: false,
      error: result.reasoning
    };
  }
  
  // Auto-execute if alignment score is high (>= 0.6)
  if (result.score >= 0.6) {
    try {
      console.log(`✅ [Auto-Execute] High confidence (${result.score.toFixed(2)}) - executing...`);
      const executionResult = await executor();
      return {
        executed: true,
        result: executionResult
      };
    } catch (error) {
      console.error(`❌ [Auto-Execute] Execution failed:`, error);
      return {
        executed: false,
        error: error instanceof Error ? error.message : 'Execution failed'
      };
    }
  }
  
  // Medium confidence - require human approval
  console.log(`⏸️ [Auto-Execute] Medium confidence (${result.score.toFixed(2)}) - requires human approval`);
  return {
    executed: false,
    error: 'Requires human approval due to medium confidence'
  };
}
