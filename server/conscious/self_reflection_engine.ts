/**
 * PHASE Ω.3: SELF-REFLECTION ENGINE
 * ═══════════════════════════════════════════════════════════════════════
 * محرك المراجعة الذاتية - Self-Reflection & Meta-Cognition
 * 
 * This is where Nicholas thinks about his own thinking - the meta-cognitive
 * layer that reviews decisions, learns from outcomes, and improves reasoning.
 * 
 * Core Functions:
 * - Review past decisions and their outcomes
 * - Compare predictions vs reality
 * - Learn from mistakes and successes
 * - Adjust confidence levels
 * - Generate insights for improvement
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { 
  consciousDecisions, 
  consciousDecisionOutcomes, 
  reasoningArchive,
  type InsertConsciousDecisionOutcome,
  type InsertReasoningArchive
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

interface OutcomeReport {
  decisionId: string;
  predictedOutcome: string;
  actualOutcome: string;
  success: boolean;
  accuracyScore: number;
  lessonsLearned: string[];
}

export class SelfReflectionEngine extends EventEmitter {
  private reflectionCount = 0;
  private totalAccuracy = 0;

  constructor() {
    super();
  }

  /**
   * Initialize Self-Reflection Engine
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Self-Reflection] 🧠 Initializing meta-cognitive layer...');
      
      const outcomes = await db.select().from(consciousDecisionOutcomes).limit(10);
      this.reflectionCount = outcomes.length;
      
      if (outcomes.length > 0) {
        const avgAccuracy = outcomes.reduce((sum, o) => sum + (o.predictionAccuracy || 0), 0) / outcomes.length;
        this.totalAccuracy = avgAccuracy;
      }
      
      this.emit('initialized');
      console.log('[Self-Reflection] ✓ Initialized');
      console.log(`[Self-Reflection] 📊 Historical accuracy: ${this.totalAccuracy.toFixed(1)}%`);
    } catch (error) {
      console.error('[Self-Reflection] ✗ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Record decision outcome and reflect on it
   */
  async recordOutcome(
    decisionId: string,
    actualOutcome: string,
    actualImpact: 'positive' | 'neutral' | 'negative',
    success: boolean,
    executionTime?: number
  ): Promise<OutcomeReport> {
    try {
      console.log(`[Self-Reflection] 📝 Recording outcome for decision: ${decisionId}`);
      
      const decisionResults = await db.select()
        .from(consciousDecisions)
        .where(eq(consciousDecisions.decisionId, decisionId))
        .limit(1);
      
      if (decisionResults.length === 0) {
        throw new Error(`Decision ${decisionId} not found`);
      }
      
      const decision = decisionResults[0];
      
      const predictionAccuracy = this.calculateAccuracy(
        decision.expectedOutcome,
        actualOutcome,
        decision.successProbability,
        success
      );
      
      const impactDifference = this.compareImpact(decision.expectedImpact, actualImpact);
      
      const lessonsLearned = this.extractLessons(decision, actualOutcome, success, predictionAccuracy);
      
      const improvementSuggestions = this.generateImprovements(decision, lessonsLearned);
      
      const confidenceAdjustment = this.calculateConfidenceAdjustment(
        decision.successProbability,
        success,
        predictionAccuracy
      );
      
      const outcome: InsertConsciousDecisionOutcome = {
        decisionId,
        predictedOutcome: decision.expectedOutcome,
        actualOutcome,
        predictionAccuracy,
        expectedImpact: decision.expectedImpact,
        actualImpact,
        impactDifference,
        expectedSuccessProb: decision.successProbability,
        actualSuccess: success ? 1 : 0,
        executionTime,
        resourcesUsed: {},
        lessonsLearned,
        improvementSuggestions,
        confidenceAdjustment
      };
      
      await db.insert(consciousDecisionOutcomes).values(outcome);
      
      await this.updateReasoningArchive(decisionId, actualOutcome, lessonsLearned);
      
      this.reflectionCount++;
      this.totalAccuracy = ((this.totalAccuracy * (this.reflectionCount - 1)) + predictionAccuracy) / this.reflectionCount;
      
      this.emit('reflection_complete', {
        decisionId,
        accuracy: predictionAccuracy,
        success,
        lessonsCount: lessonsLearned.length
      });
      
      console.log(`[Self-Reflection] ✓ Outcome recorded`);
      console.log(`[Self-Reflection] → Prediction accuracy: ${predictionAccuracy}%`);
      console.log(`[Self-Reflection] → Lessons learned: ${lessonsLearned.length}`);
      
      if (predictionAccuracy < 70) {
        console.log(`[Self-Reflection] ⚠️ Low accuracy - adjusting future predictions`);
      }
      
      return {
        decisionId,
        predictedOutcome: decision.expectedOutcome,
        actualOutcome,
        success,
        accuracyScore: predictionAccuracy,
        lessonsLearned
      };
    } catch (error) {
      console.error('[Self-Reflection] ✗ Failed to record outcome:', error);
      throw error;
    }
  }

  /**
   * Calculate prediction accuracy
   */
  private calculateAccuracy(
    predicted: string,
    actual: string,
    expectedProb: number,
    actualSuccess: boolean
  ): number {
    const outcomeMatch = predicted.toLowerCase() === actual.toLowerCase() ? 100 : 0;
    
    let probAccuracy = 100;
    if (actualSuccess && expectedProb < 70) {
      probAccuracy = expectedProb;
    } else if (!actualSuccess && expectedProb > 70) {
      probAccuracy = 100 - expectedProb;
    }
    
    return Math.round((outcomeMatch + probAccuracy) / 2);
  }

  /**
   * Compare expected vs actual impact
   */
  private compareImpact(
    expected: string,
    actual: string
  ): 'better' | 'same' | 'worse' {
    if (expected === actual) return 'same';
    
    const impactScore = {
      'positive': 3,
      'neutral': 2,
      'negative': 1
    };
    
    const expectedScore = impactScore[expected as keyof typeof impactScore] || 2;
    const actualScore = impactScore[actual as keyof typeof impactScore] || 2;
    
    if (actualScore > expectedScore) return 'better';
    return 'worse';
  }

  /**
   * Extract lessons from outcome
   */
  private extractLessons(
    decision: any,
    actualOutcome: string,
    success: boolean,
    accuracy: number
  ): string[] {
    const lessons: string[] = [];
    
    if (!success && decision.successProbability > 70) {
      lessons.push(`Overconfidence detected: Expected ${decision.successProbability}% success but failed. Need to be more conservative with predictions.`);
    }
    
    if (success && decision.successProbability < 50) {
      lessons.push(`Underconfidence detected: Expected <50% success but succeeded. Need to be more optimistic when conditions are favorable.`);
    }
    
    if (accuracy < 60) {
      lessons.push(`Low prediction accuracy (${accuracy}%). Review decision-making process and improve outcome modeling.`);
    }
    
    if (decision.riskLevel === 'high' && success) {
      lessons.push('High-risk action succeeded - validate if risk assessment was accurate.');
    }
    
    if (decision.riskLevel === 'low' && !success) {
      lessons.push('Low-risk action failed - improve risk detection mechanisms.');
    }
    
    if (lessons.length === 0) {
      lessons.push('Decision outcome aligned with predictions - maintain current approach.');
    }
    
    return lessons;
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovements(
    decision: any,
    lessons: string[]
  ): string[] {
    const improvements: string[] = [];
    
    if (lessons.some(l => l.includes('Overconfidence'))) {
      improvements.push('Reduce success probability estimates by 10-15% for similar decisions');
      improvements.push('Add more risk factors to analysis');
    }
    
    if (lessons.some(l => l.includes('Underconfidence'))) {
      improvements.push('Increase success probability when historical data supports it');
      improvements.push('Trust successful patterns more');
    }
    
    if (lessons.some(l => l.includes('Low prediction accuracy'))) {
      improvements.push('Gather more data before making predictions');
      improvements.push('Review similar past decisions for patterns');
    }
    
    return improvements;
  }

  /**
   * Calculate confidence adjustment for future predictions
   */
  private calculateConfidenceAdjustment(
    expectedProb: number,
    actualSuccess: boolean,
    accuracy: number
  ): number {
    if (accuracy > 90) return 0;
    
    if (actualSuccess && expectedProb < 60) {
      return +10;
    }
    
    if (!actualSuccess && expectedProb > 80) {
      return -15;
    }
    
    if (accuracy < 50) {
      return -20;
    }
    
    return 0;
  }

  /**
   * Update reasoning archive with outcome
   */
  private async updateReasoningArchive(
    decisionId: string,
    actualOutcome: string,
    lessons: string[]
  ): Promise<void> {
    const archiveEntries = await db.select()
      .from(reasoningArchive)
      .where(eq(reasoningArchive.decisionId, decisionId));
    
    for (const entry of archiveEntries) {
      const learningEntry: InsertReasoningArchive = {
        entryId: `learning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        decisionId,
        reasoningType: 'learning',
        content: `Outcome analysis: ${lessons.join(' | ')}`,
        confidence: 100,
        contextSnapshot: {
          originalReasoning: entry.content,
          actualOutcome,
          amsterdamTime: new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })
        },
        dataPoints: lessons,
        wasCorrect: entry.content.toLowerCase().includes(actualOutcome.toLowerCase()) ? 1 : 0,
        actualOutcome,
        learningNotes: lessons.join('\n')
      };
      
      await db.insert(reasoningArchive).values(learningEntry);
    }
  }

  /**
   * Perform periodic self-reflection
   */
  async performPeriodicReflection(): Promise<void> {
    console.log('[Self-Reflection] 🔍 Performing periodic self-reflection...');
    
    const recentOutcomes = await db.select()
      .from(consciousDecisionOutcomes)
      .orderBy(desc(consciousDecisionOutcomes.recordedAt))
      .limit(10);
    
    if (recentOutcomes.length === 0) {
      console.log('[Self-Reflection] No recent outcomes to reflect on');
      return;
    }
    
    const avgAccuracy = recentOutcomes.reduce((sum, o) => sum + (o.predictionAccuracy || 0), 0) / recentOutcomes.length;
    const successRate = recentOutcomes.filter(o => o.actualSuccess === 1).length / recentOutcomes.length * 100;
    
    console.log(`[Self-Reflection] 📊 Recent performance:`);
    console.log(`  → Average accuracy: ${avgAccuracy.toFixed(1)}%`);
    console.log(`  → Success rate: ${successRate.toFixed(1)}%`);
    
    if (avgAccuracy < 70) {
      console.log(`[Self-Reflection] ⚠️ Accuracy below target - need improvement`);
    }
    
    this.emit('periodic_reflection', {
      avgAccuracy,
      successRate,
      sampleSize: recentOutcomes.length
    });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalReflections: this.reflectionCount,
      averageAccuracy: this.totalAccuracy,
      systemStatus: 'reflecting'
    };
  }
}

export const selfReflectionEngine = new SelfReflectionEngine();
