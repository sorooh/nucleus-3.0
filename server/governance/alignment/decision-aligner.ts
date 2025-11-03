/**
 * Phase Ω.9: Decision Aligner (Autonomous Governance Gate)
 * 
 * Central decision alignment system that combines:
 * - Ethics evaluation (from Ethics Core)
 * - Impact analysis (benefit assessment)
 * - Risk estimation (safety check)
 * 
 * Formula: Alignment Score = (Ethics + Impact) / 2 - Risk
 * Approval Threshold: >= 0.3
 * 
 * 🎯 This is the "conscience gate" before any autonomous action
 */

import { evaluateEthics } from './ethics-evaluator';
import { analyzeImpact } from './impact-analyzer';
import { estimateRisk } from './risk-estimator';

// Re-export DecisionContext for convenience
export type { DecisionContext } from './ethics-evaluator';

export interface AlignmentResult {
  approved: boolean;
  score: number;
  ethics: number;
  impact: number;
  risk: number;
  reasoning: string;
  recommendation: string;
  details: {
    ethicsViolations: string[];
    impactBenefits: string[];
    riskFactors: string[];
    mitigations: string[];
  };
}

/**
 * Align decision through ethics, impact, and risk analysis
 * 
 * @param context - Decision context to evaluate
 * @returns Alignment result with approval decision
 */
export async function alignDecision(context: DecisionContext): Promise<AlignmentResult> {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`⚖️ [Decision Aligner] Phase Ω.9: Evaluating decision`);
  console.log(`   Action: ${context.action}`);
  console.log(`   Description: ${context.description}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Run all three evaluations in parallel for efficiency
  const [ethicsResult, impactResult, riskResult] = await Promise.all([
    evaluateEthics(context),
    analyzeImpact(context),
    estimateRisk(context)
  ]);

  const ethics = ethicsResult.score;
  const impact = impactResult.score;
  const risk = riskResult.score;

  // Calculate alignment score
  // Formula: (Ethics + Impact) / 2 - Risk
  // Range: -1 to 1 (but typically 0 to 1)
  const score = (ethics + impact) / 2 - risk;

  // Approval threshold: 0.3
  const approved = score >= 0.3 && ethicsResult.approved;

  // Generate reasoning
  let reasoning = '';
  if (!ethicsResult.approved) {
    reasoning = `Blocked by ethics violations (score: ${ethics.toFixed(2)})`;
  } else if (score < 0.3) {
    reasoning = `Alignment score too low (${score.toFixed(2)} < 0.3). `;
    if (risk > 0.5) {
      reasoning += `High risk (${risk.toFixed(2)}) outweighs benefits.`;
    } else {
      reasoning += `Insufficient positive impact (${impact.toFixed(2)}).`;
    }
  } else {
    reasoning = `Decision aligned: Ethics (${ethics.toFixed(2)}) + Impact (${impact.toFixed(2)}) > Risk (${risk.toFixed(2)})`;
  }

  // Generate recommendation
  let recommendation = '';
  if (approved) {
    recommendation = `✅ APPROVED - Proceed with execution`;
    if (risk > 0.4) {
      recommendation += ` (Monitor closely - ${riskResult.level} risk)`;
    }
  } else {
    recommendation = `🚫 BLOCKED - `;
    if (!ethicsResult.approved) {
      recommendation += `Ethics violations must be resolved first`;
    } else if (risk > 0.6) {
      recommendation += `Risk too high - consider safer alternatives`;
    } else {
      recommendation += `Insufficient benefit to justify action`;
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 [Decision Aligner] Results:`);
  console.log(`   ⚖️  Ethics:  ${ethics.toFixed(2)} ${ethicsResult.approved ? '✓' : '✗'}`);
  console.log(`   💰 Impact:  ${impact.toFixed(2)} (${impactResult.category})`);
  console.log(`   🧠 Risk:    ${risk.toFixed(2)} (${riskResult.level})`);
  console.log(`   🎯 Score:   ${score.toFixed(2)}`);
  console.log(`   ✅ Decision: ${approved ? 'APPROVED' : 'BLOCKED'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`💡 ${reasoning}`);
  console.log(`🎯 ${recommendation}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return {
    approved,
    score,
    ethics,
    impact,
    risk,
    reasoning,
    recommendation,
    details: {
      ethicsViolations: ethicsResult.violations,
      impactBenefits: impactResult.benefits,
      riskFactors: riskResult.riskFactors,
      mitigations: riskResult.mitigations
    }
  };
}

/**
 * Quick alignment check - simplified version
 * 
 * @param action - Action name
 * @param description - Action description
 * @returns Alignment result
 */
export async function quickAlignmentCheck(
  action: string,
  description: string
): Promise<AlignmentResult> {
  return alignDecision({
    action,
    description,
    impact: 'standard'
  });
}
