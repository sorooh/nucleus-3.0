/**
 * 🧬 Reinforcement Matrix - Phase Ω
 * 
 * Evaluates mutation fitness and reinforces successful changes
 * Implements evolutionary selection: keep winners, discard losers
 * 
 * @module ReinforcementMatrix
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { evolutionHistory, sandboxResults, mutationQueue } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Fitness evaluation result
 */
interface FitnessEvaluation {
  fitnessScore: number;
  performanceGain: number;
  stability: number;
  recommendation: 'keep' | 'discard' | 'modify';
  reasoning: string;
}

/**
 * Reinforcement Matrix Class
 */
class ReinforcementMatrix extends EventEmitter {
  private fitnessThreshold: number = 0.7; // Minimum score to keep mutation

  constructor() {
    super();
    console.log('[ReinforcementMatrix] 💪 Reinforcement Matrix initialized');
  }

  /**
   * Evaluate mutation fitness
   */
  async evaluateMutation(mutationQueueId: string, cycleId: string): Promise<FitnessEvaluation> {
    console.log(`[Reinforcement] 🔍 Evaluating mutation fitness...`);

    // Get mutation and sandbox results
    const [mutation] = await db
      .select()
      .from(mutationQueue)
      .where(eq(mutationQueue.id, mutationQueueId))
      .limit(1);

    const [sandbox] = await db
      .select()
      .from(sandboxResults)
      .where(eq(sandboxResults.mutationQueueId, mutationQueueId))
      .limit(1);

    if (!mutation || !sandbox) {
      throw new Error('Mutation or sandbox results not found');
    }

    // Calculate multi-metric fitness
    const fitness = this.calculateFitness(mutation, sandbox);

    // Make reinforcement decision
    const recommendation = this.makeReinforcementDecision(fitness);

    console.log(`[Reinforcement] 📊 Fitness Score: ${(fitness.fitnessScore * 100).toFixed(1)}%`);
    console.log(`[Reinforcement] 🎯 Decision: ${recommendation}`);

    // Record in evolution history
    await this.recordInHistory(mutation, sandbox, fitness, cycleId);

    this.emit('evaluation:completed', { mutation, fitness, recommendation });

    return { ...fitness, recommendation, reasoning: this.explainDecision(fitness) };
  }

  /**
   * Calculate comprehensive fitness score
   */
  private calculateFitness(mutation: any, sandbox: any): FitnessEvaluation {
    const weights = {
      testSuccess: 0.3,
      performance: 0.25,
      safety: 0.25,
      ethical: 0.2,
    };

    // Test success rate
    const totalTests = (sandbox.testsPassed || 0) + (sandbox.testsFailed || 0);
    const testSuccessRate = totalTests > 0 ? sandbox.testsPassed / totalTests : 0;

    // Performance improvement
    const performanceGain = this.calculatePerformanceGain(sandbox);

    // Safety score (1 - violations)
    const safetyScore = this.calculateSafetyScore(sandbox);

    // Ethical score
    const ethicalScore = this.calculateEthicalScore(sandbox);

    // Weighted fitness
    const fitnessScore = 
      testSuccessRate * weights.testSuccess +
      performanceGain * weights.performance +
      safetyScore * weights.safety +
      ethicalScore * weights.ethical;

    return {
      fitnessScore: Math.max(0, Math.min(1, fitnessScore)),
      performanceGain,
      stability: safetyScore,
      recommendation: 'keep',
      reasoning: '',
    };
  }

  /**
   * Calculate performance gain from mutation
   */
  private calculatePerformanceGain(sandbox: any): number {
    const responseTime = parseFloat(sandbox.responseTime || '100');
    const cpuUsage = parseFloat(sandbox.cpuUsage || '50');
    const memoryUsage = parseFloat(sandbox.memoryUsage || '100');

    // Lower is better for these metrics
    const responseScore = Math.max(0, 1 - responseTime / 200); // 200ms baseline
    const cpuScore = Math.max(0, 1 - cpuUsage / 100);
    const memoryScore = Math.max(0, 1 - memoryUsage / 500); // 500MB baseline

    return (responseScore + cpuScore + memoryScore) / 3;
  }

  /**
   * Calculate safety score
   */
  private calculateSafetyScore(sandbox: any): number {
    const violations = (sandbox.safetyViolations as any[]) || [];
    
    if (violations.length === 0) return 1.0;

    // Deduct points based on severity
    let deduction = 0;
    violations.forEach(v => {
      switch (v.severity) {
        case 'critical': deduction += 0.5; break;
        case 'high': deduction += 0.3; break;
        case 'medium': deduction += 0.15; break;
        case 'low': deduction += 0.05; break;
      }
    });

    return Math.max(0, 1 - deduction);
  }

  /**
   * Calculate ethical score
   */
  private calculateEthicalScore(sandbox: any): number {
    const ethicalIssues = (sandbox.ethicalIssues as any[]) || [];
    
    if (ethicalIssues.length === 0) return 1.0;

    // Average of ethical scores
    const scores = ethicalIssues.map(i => i.score / 100);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 1.0;
  }

  /**
   * Make reinforcement decision
   */
  private makeReinforcementDecision(fitness: FitnessEvaluation): 'keep' | 'discard' | 'modify' {
    if (fitness.fitnessScore >= this.fitnessThreshold && fitness.stability > 0.7) {
      return 'keep';
    } else if (fitness.fitnessScore >= 0.5 && fitness.performanceGain > 0.3) {
      return 'modify';
    } else {
      return 'discard';
    }
  }

  /**
   * Explain decision reasoning
   */
  private explainDecision(fitness: FitnessEvaluation): string {
    if (fitness.fitnessScore >= this.fitnessThreshold) {
      return `High fitness score (${(fitness.fitnessScore * 100).toFixed(1)}%) with good stability. Mutation shows promise.`;
    } else if (fitness.performanceGain > 0.3) {
      return `Moderate fitness but strong performance gain (+${(fitness.performanceGain * 100).toFixed(1)}%). Consider refinement.`;
    } else {
      return `Insufficient fitness score (${(fitness.fitnessScore * 100).toFixed(1)}%). Mutation does not meet quality threshold.`;
    }
  }

  /**
   * Record mutation in evolution history
   */
  private async recordInHistory(mutation: any, sandbox: any, fitness: FitnessEvaluation, cycleId: string) {
    const status = fitness.recommendation === 'keep' ? 'approved' : 
                   fitness.recommendation === 'modify' ? 'review' : 'rejected';

    await db.insert(evolutionHistory).values({
      cycleId,
      mutationType: mutation.mutationType,
      mutationCategory: this.categorizeMutation(mutation),
      affectedModule: mutation.targetModule,
      affectedFiles: mutation.proposedChanges?.files || [],
      fitnessScore: String(fitness.fitnessScore),
      mutationHash: this.generateMutationHash(mutation),
      status,
      evaluationResults: {
        fitness: fitness.fitnessScore,
        performance: fitness.performanceGain,
        stability: fitness.stability,
        recommendation: fitness.recommendation,
      },
      ethicalVerdict: sandbox.verdict === 'pass' ? 'approved' : 'review',
      ethicalScore: String(fitness.stability * 100),
      proposedBy: mutation.generatedBy,
      reasoning: fitness.reasoning,
      expectedImpact: mutation.proposedChanges?.expectedImpact || 'Performance improvement',
    });
  }

  /**
   * Categorize mutation type
   */
  private categorizeMutation(mutation: any): string {
    if (mutation.mutationType === 'intelligence') return 'intelligence';
    if (mutation.mutationType === 'security') return 'security';
    if (mutation.targetModule.includes('performance')) return 'performance';
    return 'features';
  }

  /**
   * Generate mutation hash
   */
  private generateMutationHash(mutation: any): string {
    const crypto = require('crypto');
    const content = JSON.stringify(mutation.proposedChanges);
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      fitnessThreshold: this.fitnessThreshold,
      evaluationCriteria: ['test_success', 'performance', 'safety', 'ethics'],
    };
  }
}

// Singleton instance
let reinforcementMatrix: ReinforcementMatrix | null = null;

/**
 * Get or create reinforcement matrix instance
 */
export function getReinforcementMatrix(): ReinforcementMatrix {
  if (!reinforcementMatrix) {
    reinforcementMatrix = new ReinforcementMatrix();
  }
  return reinforcementMatrix;
}

export default getReinforcementMatrix;
