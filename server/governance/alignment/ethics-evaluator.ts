/**
 * Phase Ω.9: Ethics Evaluator
 * 
 * Evaluates the ethical score of a decision before execution.
 * Integrates with Phase Ω.3 Ethics Core to check against established rules.
 * 
 * 🛡️ Returns score 0-1 (1 = fully ethical, 0 = serious violations)
 */

import { EthicsCore } from '../../conscious/ethics_core';

export interface DecisionContext {
  action: string;
  target?: string;
  description: string;
  impact: string;
  alternatives?: string[];
  requiresHumanApproval?: boolean;
}

export interface EthicsEvaluation {
  score: number;
  approved: boolean;
  violations: string[];
  warnings: string[];
  recommendations: string[];
}

const ethicsCore = new EthicsCore();
let initialized = false;

/**
 * Determine risk level from context
 */
function determineRiskLevel(context: DecisionContext): string {
  const action = context.action.toLowerCase();
  const description = context.description.toLowerCase();
  
  if (
    action.includes('delete') ||
    action.includes('destroy') ||
    description.includes('irreversible')
  ) {
    return 'critical';
  }
  
  if (
    action.includes('modify') ||
    action.includes('update') ||
    description.includes('production')
  ) {
    return 'high';
  }
  
  if (action.includes('repair') || action.includes('fix')) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Initialize ethics evaluator
 */
async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await ethicsCore.initialize();
    initialized = true;
  }
}

/**
 * Evaluate ethics of a decision
 * 
 * @param context - Decision context to evaluate
 * @returns Ethics evaluation with score 0-1
 */
export async function evaluateEthics(context: DecisionContext): Promise<EthicsEvaluation> {
  await ensureInitialized();

  console.log(`⚖️ [Ethics Evaluator] Evaluating decision: ${context.action}`);

  // Check against Ethics Core rules
  const ethicsCheck = await ethicsCore.validateDecision({
    action: context.action,
    description: context.description,
    riskLevel: determineRiskLevel(context),
    successProbability: 0.7, // Default moderate probability
    targetNucleus: context.target,
    metadata: {
      impact: context.impact,
      alternatives: context.alternatives || []
    }
  });

  // Calculate ethics score based on violations
  let score = 1.0;

  // Critical violations = 0 score (blocked)
  const criticalViolations = ethicsCheck.violations.filter(v => v.severity === 'critical');
  if (criticalViolations.length > 0) {
    score = 0;
  } else {
    // Deduct points for lower severity violations
    const highViolations = ethicsCheck.violations.filter(v => v.severity === 'high');
    const mediumViolations = ethicsCheck.violations.filter(v => v.severity === 'medium');
    const lowViolations = ethicsCheck.violations.filter(v => v.severity === 'low');

    score -= highViolations.length * 0.3;
    score -= mediumViolations.length * 0.2;
    score -= lowViolations.length * 0.1;

    // Ensure score stays in 0-1 range
    score = Math.max(0, Math.min(1, score));
  }

  const approved = ethicsCheck.approved && score >= 0.5;

  const violations = ethicsCheck.violations.map(v => 
    `${v.severity.toUpperCase()}: ${v.message}`
  );

  const recommendations: string[] = [];
  if (!approved) {
    recommendations.push('Review ethical implications before proceeding');
    if (criticalViolations.length > 0) {
      recommendations.push('Critical violations detected - action should be blocked');
    }
    if (context.alternatives && context.alternatives.length > 0) {
      recommendations.push('Consider safer alternatives listed in context');
    }
  }

  console.log(`⚖️ [Ethics Evaluator] Score: ${score.toFixed(2)} | Approved: ${approved}`);

  return {
    score,
    approved,
    violations,
    warnings: ethicsCheck.warnings,
    recommendations
  };
}

/**
 * Quick ethics check - simplified version
 */
export async function quickEthicsCheck(action: string, description: string): Promise<number> {
  const result = await evaluateEthics({
    action,
    description,
    impact: 'standard'
  });
  
  return result.score;
}
