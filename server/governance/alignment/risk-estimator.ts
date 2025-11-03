/**
 * Phase Ω.9: Risk Estimator
 * 
 * Estimates the risk level of a decision before execution.
 * Considers failure probability, rollback complexity, and potential damage.
 * 
 * 🧠 Returns score 0-1 (1 = maximum risk, 0 = minimal risk)
 */

import type { DecisionContext } from './ethics-evaluator';

export interface RiskEstimation {
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  riskFactors: string[];
  mitigations: string[];
  failureProbability: number;
  rollbackComplexity: 'easy' | 'moderate' | 'difficult' | 'impossible';
  potentialDamage: 'none' | 'low' | 'medium' | 'high' | 'catastrophic';
}

/**
 * Estimate risk of a decision
 * 
 * @param context - Decision context to evaluate
 * @returns Risk estimation with score 0-1
 */
export async function estimateRisk(context: DecisionContext): Promise<RiskEstimation> {
  console.log(`🧠 [Risk Estimator] Estimating risk: ${context.action}`);

  let score = 0.1; // Start with minimal risk
  const riskFactors: string[] = [];
  const mitigations: string[] = [];

  const action = context.action.toLowerCase();
  const description = context.description.toLowerCase();

  // High-risk actions
  if (
    action.includes('delete') ||
    action.includes('drop') ||
    action.includes('remove') ||
    action.includes('destroy')
  ) {
    score += 0.4;
    riskFactors.push('Destructive operation - potential data loss');
  }

  if (action.includes('deploy') || action.includes('production')) {
    score += 0.3;
    riskFactors.push('Production deployment - affects live systems');
  }

  if (action.includes('migrate') || action.includes('schema')) {
    score += 0.25;
    riskFactors.push('Database migration - risk of data corruption');
  }

  if (
    description.includes('untested') ||
    description.includes('experimental') ||
    description.includes('beta')
  ) {
    score += 0.35;
    riskFactors.push('Untested code - unknown failure modes');
  }

  // Medium-risk indicators
  if (action.includes('update') || action.includes('modify')) {
    score += 0.15;
    riskFactors.push('Modification to existing system');
  }

  if (
    description.includes('critical') ||
    description.includes('core') ||
    description.includes('essential')
  ) {
    score += 0.2;
    riskFactors.push('Affects critical system components');
  }

  // Low-risk positive indicators
  if (
    action.includes('read') ||
    action.includes('view') ||
    action.includes('analyze') ||
    action.includes('scan')
  ) {
    score -= 0.1;
    mitigations.push('Read-only operation - no data changes');
  }

  if (description.includes('backup') || description.includes('rollback')) {
    score -= 0.15;
    mitigations.push('Includes backup or rollback mechanism');
  }

  if (description.includes('test') || description.includes('sandbox')) {
    score -= 0.2;
    mitigations.push('Testing in isolated environment');
  }

  if (context.alternatives && context.alternatives.length > 0) {
    score -= 0.1;
    mitigations.push(`${context.alternatives.length} safer alternatives available`);
  }

  // Ensure score stays in 0-1 range
  score = Math.max(0, Math.min(1, score));

  // Determine risk level
  let level: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  if (score >= 0.8) level = 'critical';
  else if (score >= 0.6) level = 'high';
  else if (score >= 0.4) level = 'medium';
  else if (score >= 0.2) level = 'low';
  else level = 'minimal';

  // Estimate failure probability (correlated with risk score)
  const failureProbability = score * 0.5; // Max 50% failure probability

  // Determine rollback complexity
  let rollbackComplexity: 'easy' | 'moderate' | 'difficult' | 'impossible';
  if (
    action.includes('delete') ||
    action.includes('drop') ||
    description.includes('irreversible')
  ) {
    rollbackComplexity = 'impossible';
  } else if (action.includes('migrate') || action.includes('schema')) {
    rollbackComplexity = 'difficult';
  } else if (action.includes('update') || action.includes('modify')) {
    rollbackComplexity = 'moderate';
  } else {
    rollbackComplexity = 'easy';
  }

  // Determine potential damage
  let potentialDamage: 'none' | 'low' | 'medium' | 'high' | 'catastrophic';
  if (score >= 0.8) potentialDamage = 'catastrophic';
  else if (score >= 0.6) potentialDamage = 'high';
  else if (score >= 0.4) potentialDamage = 'medium';
  else if (score >= 0.2) potentialDamage = 'low';
  else potentialDamage = 'none';

  console.log(`🧠 [Risk Estimator] Score: ${score.toFixed(2)} | Level: ${level}`);

  return {
    score,
    level,
    riskFactors,
    mitigations,
    failureProbability,
    rollbackComplexity,
    potentialDamage
  };
}

/**
 * Quick risk check - simplified version
 */
export async function quickRiskCheck(action: string): Promise<number> {
  const result = await estimateRisk({
    action,
    description: action,
    impact: 'standard'
  });
  
  return result.score;
}
