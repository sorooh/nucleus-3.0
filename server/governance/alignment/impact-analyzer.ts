/**
 * Phase Ω.9: Impact Analyzer
 * 
 * Analyzes the expected benefit/impact of a decision.
 * Considers positive outcomes, system improvements, and value delivered.
 * 
 * 💰 Returns score 0-1 (1 = high positive impact, 0 = no/negative impact)
 */

import type { DecisionContext } from './ethics-evaluator';

export interface ImpactAnalysis {
  score: number;
  category: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  benefits: string[];
  concerns: string[];
  affectedSystems: string[];
  userImpact: 'positive' | 'neutral' | 'negative';
}

/**
 * Analyze impact of a decision
 * 
 * @param context - Decision context to analyze
 * @returns Impact analysis with score 0-1
 */
export async function analyzeImpact(context: DecisionContext): Promise<ImpactAnalysis> {
  console.log(`💰 [Impact Analyzer] Analyzing impact: ${context.action}`);

  let score = 0.5; // Start neutral
  const benefits: string[] = [];
  const concerns: string[] = [];
  const affectedSystems: string[] = [];

  // Analyze action type for impact
  const action = context.action.toLowerCase();
  const description = context.description.toLowerCase();

  // High-impact positive actions
  if (
    action.includes('repair') ||
    action.includes('fix') ||
    action.includes('improve') ||
    action.includes('optimize')
  ) {
    score += 0.3;
    benefits.push('Improves system stability or performance');
  }

  if (action.includes('learn') || action.includes('evolve')) {
    score += 0.2;
    benefits.push('Enhances system intelligence and adaptability');
  }

  if (action.includes('predict') || action.includes('prevent')) {
    score += 0.25;
    benefits.push('Proactive problem prevention');
  }

  if (action.includes('verify') || action.includes('validate')) {
    score += 0.15;
    benefits.push('Increases system reliability');
  }

  // Negative impact indicators
  if (
    action.includes('delete') ||
    action.includes('remove') ||
    action.includes('destroy')
  ) {
    score -= 0.3;
    concerns.push('Potential data or functionality loss');
  }

  if (action.includes('experimental') || description.includes('untested')) {
    score -= 0.2;
    concerns.push('Untested changes may introduce instability');
  }

  // Context-based impact adjustments
  if (context.impact) {
    const impact = context.impact.toLowerCase();
    
    if (impact.includes('critical') || impact.includes('essential')) {
      score += 0.2;
      affectedSystems.push('Critical system components');
    }
    
    if (impact.includes('user') || impact.includes('experience')) {
      score += 0.15;
      affectedSystems.push('User-facing features');
    }
    
    if (impact.includes('performance') || impact.includes('speed')) {
      score += 0.1;
      affectedSystems.push('System performance');
    }
  }

  // Target analysis
  if (context.target) {
    if (context.target.includes('integrity') || context.target.includes('security')) {
      score += 0.2;
      benefits.push('Strengthens system integrity');
    }
  }

  // Ensure score stays in 0-1 range
  score = Math.max(0, Math.min(1, score));

  // Categorize impact
  let category: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  if (score >= 0.8) category = 'critical';
  else if (score >= 0.6) category = 'high';
  else if (score >= 0.4) category = 'medium';
  else if (score >= 0.2) category = 'low';
  else category = 'negligible';

  // Determine user impact
  const userImpact: 'positive' | 'neutral' | 'negative' = 
    score >= 0.6 ? 'positive' : score >= 0.4 ? 'neutral' : 'negative';

  console.log(`💰 [Impact Analyzer] Score: ${score.toFixed(2)} | Category: ${category}`);

  return {
    score,
    category,
    benefits,
    concerns,
    affectedSystems,
    userImpact
  };
}

/**
 * Quick impact check - simplified version
 */
export async function quickImpactCheck(action: string): Promise<number> {
  const result = await analyzeImpact({
    action,
    description: action,
    impact: 'standard'
  });
  
  return result.score;
}
