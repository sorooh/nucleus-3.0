/**
 * Phase Ω.9: Governance Alignment System
 * 
 * Exports all governance functions for easy integration
 */

export { evaluateEthics, quickEthicsCheck } from './ethics-evaluator';
export { analyzeImpact, quickImpactCheck } from './impact-analyzer';
export { estimateRisk, quickRiskCheck } from './risk-estimator';
export { alignDecision, quickAlignmentCheck } from './decision-aligner';

export type { DecisionContext, EthicsEvaluation } from './ethics-evaluator';
export type { ImpactAnalysis } from './impact-analyzer';
export type { RiskEstimation } from './risk-estimator';
export type { AlignmentResult } from './decision-aligner';
