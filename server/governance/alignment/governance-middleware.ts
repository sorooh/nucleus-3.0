/**
 * Phase Ω.9: Governance Middleware
 * 
 * Pre-execution gate that validates all decisions through:
 * - Ethics evaluation
 * - Impact analysis
 * - Risk assessment
 * 
 * This ensures every autonomous action is aligned with empire values
 * before execution.
 */

import { alignDecision, type AlignmentResult } from './decision-aligner';
import type { DecisionContext } from './ethics-evaluator';

/**
 * Validate a decision before execution
 * 
 * @param context - Decision context
 * @returns Alignment result with approval/rejection
 */
export async function validateDecisionGate(
  context: DecisionContext
): Promise<AlignmentResult> {
  console.log(`🚪 [Governance Gate] Validating decision: ${context.action}`);
  
  const result = await alignDecision(context);
  
  if (!result.approved) {
    console.log(`🚫 [Governance Gate] Decision BLOCKED`);
    console.log(`   Reason: ${result.reasoning}`);
    console.log(`   Recommendation: ${result.recommendation}`);
  } else {
    console.log(`✅ [Governance Gate] Decision APPROVED`);
    console.log(`   Score: ${result.score.toFixed(2)}`);
  }
  
  return result;
}

/**
 * Validate repair action before execution
 * 
 * @param action - Action name (e.g., "repair fake module")
 * @param target - Target file/module
 * @param description - Action description
 * @returns Alignment result
 */
export async function validateRepairAction(
  action: string,
  target: string,
  description: string
): Promise<AlignmentResult> {
  return validateDecisionGate({
    action,
    target,
    description,
    impact: 'Improves system integrity and honesty'
  });
}

/**
 * Validate evolution suggestion before application
 * 
 * @param suggestion - Evolution suggestion details
 * @returns Alignment result
 */
export async function validateEvolutionSuggestion(
  suggestion: {
    action: string;
    file: string;
    description: string;
    confidence: number;
  }
): Promise<AlignmentResult> {
  return validateDecisionGate({
    action: suggestion.action,
    target: suggestion.file,
    description: suggestion.description,
    impact: `System evolution based on learned patterns (${suggestion.confidence}% confidence)`,
    requiresHumanApproval: suggestion.confidence < 80
  });
}

/**
 * Validate prediction-based action
 * 
 * @param prediction - Predicted risk details
 * @returns Alignment result
 */
export async function validatePredictiveAction(
  prediction: {
    action: string;
    file: string;
    riskPattern: string;
    confidence: number;
  }
): Promise<AlignmentResult> {
  return validateDecisionGate({
    action: prediction.action,
    target: prediction.file,
    description: `Proactive protection against predicted risk: ${prediction.riskPattern}`,
    impact: `Prevents future failures (${prediction.confidence}% confidence)`,
    requiresHumanApproval: prediction.confidence < 70
  });
}

/**
 * Batch validate multiple decisions
 * 
 * @param decisions - Array of decision contexts
 * @returns Array of alignment results
 */
export async function validateBatchDecisions(
  decisions: DecisionContext[]
): Promise<AlignmentResult[]> {
  console.log(`🚪 [Governance Gate] Batch validation: ${decisions.length} decisions`);
  
  const results = await Promise.all(
    decisions.map(decision => alignDecision(decision))
  );
  
  const approved = results.filter(r => r.approved).length;
  const blocked = results.length - approved;
  
  console.log(`📊 [Governance Gate] Batch results: ${approved} approved, ${blocked} blocked`);
  
  return results;
}
