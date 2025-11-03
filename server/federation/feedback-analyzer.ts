/**
 * Feedback Analyzer - Phase 9.7
 * محلل التغذية الراجعة
 * 
 * يستقبل نتائج تنفيذ القرارات من العقد،
 * يقيس فعاليتها، ويُحدّث نموذج التعلّم
 */

import { db } from '../db';
import {
  autonomousDecisions,
  type AutonomousDecision
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { learningEngine } from './autonomous-learning-engine';

/**
 * Feedback Data from SIDE node
 */
export interface FeedbackData {
  decisionId: string;
  result: 'success' | 'failed' | 'partial';
  impact: number; // 0.0 to 1.0
  improvements?: {
    metric: string;
    before: number;
    after: number;
    improvementPercent: number;
  }[];
  notes?: string;
  executionTime?: number;
  errors?: string[];
}

/**
 * Analysis Result
 */
interface AnalysisResult {
  decisionId: string;
  feedbackScore: number; // -1.0 to 1.0
  actualImpact: number;
  successRate: number;
  recommendations: string[];
  shouldContinue: boolean;
}

/**
 * Feedback Analyzer Class
 */
export class FeedbackAnalyzer {
  
  /**
   * Process feedback from SIDE node
   */
  async processFeedback(feedback: FeedbackData): Promise<AnalysisResult> {
    console.log(`[Feedback Analyzer] 📊 Processing feedback for decision: ${feedback.decisionId}`);
    
    // 1. Load decision
    const decision = await this.loadDecision(feedback.decisionId);
    if (!decision) {
      throw new Error(`Decision ${feedback.decisionId} not found`);
    }
    
    // 2. Calculate feedback score
    const feedbackScore = this.calculateFeedbackScore(feedback);
    
    // 3. Calculate actual impact
    const actualImpact = this.calculateActualImpact(feedback, decision);
    
    // 4. Update success rate
    const successRate = this.calculateSuccessRate(decision, feedbackScore);
    
    // 5. Generate recommendations
    const recommendations = this.generateRecommendations(feedback, decision);
    
    // 6. Determine if should continue this approach
    const shouldContinue = feedbackScore > 0 && actualImpact > 0.3;
    
    // 7. Update decision in database
    await this.updateDecision(feedback.decisionId, {
      feedbackScore,
      actualImpact,
      successRate,
      improvements: feedback.improvements,
      feedbackNotes: feedback.notes,
      feedbackReceived: 1,
      feedbackReceivedAt: new Date(),
      executionTime: feedback.executionTime
    });
    
    console.log(`[Feedback Analyzer] ✅ Feedback processed - Score: ${feedbackScore.toFixed(2)}, Impact: ${actualImpact.toFixed(2)}`);
    
    // 8. Update learning model
    await this.updateLearningModel(decision, feedbackScore, actualImpact);
    
    return {
      decisionId: feedback.decisionId,
      feedbackScore,
      actualImpact,
      successRate,
      recommendations,
      shouldContinue
    };
  }

  /**
   * Load decision from database
   */
  private async loadDecision(decisionId: string): Promise<AutonomousDecision | null> {
    const [decision] = await db
      .select()
      .from(autonomousDecisions)
      .where(eq(autonomousDecisions.decisionId, decisionId))
      .limit(1);
    
    return decision || null;
  }

  /**
   * Calculate feedback score (-1.0 to 1.0)
   */
  private calculateFeedbackScore(feedback: FeedbackData): number {
    let score = 0;
    
    // Base score from result
    switch (feedback.result) {
      case 'success':
        score = 1.0;
        break;
      case 'partial':
        score = 0.5;
        break;
      case 'failed':
        score = -1.0;
        break;
    }
    
    // Adjust by impact
    if (feedback.impact !== undefined) {
      score = score * feedback.impact;
    }
    
    // Penalty for errors
    if (feedback.errors && feedback.errors.length > 0) {
      score = score * 0.7;
    }
    
    // Bonus for improvements
    if (feedback.improvements && feedback.improvements.length > 0) {
      const avgImprovement = feedback.improvements.reduce(
        (sum, imp) => sum + imp.improvementPercent, 0
      ) / feedback.improvements.length;
      
      if (avgImprovement > 10) {
        score = Math.min(1.0, score * 1.2);
      }
    }
    
    return Math.max(-1.0, Math.min(1.0, score));
  }

  /**
   * Calculate actual impact (0.0 to 1.0)
   */
  private calculateActualImpact(feedback: FeedbackData, decision: AutonomousDecision): number {
    // Base impact from feedback
    let impact = feedback.impact || 0;
    
    // Calculate from improvements if available
    if (feedback.improvements && feedback.improvements.length > 0) {
      const avgImprovement = feedback.improvements.reduce(
        (sum, imp) => sum + (imp.improvementPercent / 100), 0
      ) / feedback.improvements.length;
      
      impact = Math.max(impact, avgImprovement);
    }
    
    // Factor in execution success
    if (feedback.result === 'success') {
      impact = Math.max(impact, 0.5);
    } else if (feedback.result === 'failed') {
      impact = 0;
    }
    
    return Math.max(0, Math.min(1.0, impact));
  }

  /**
   * Calculate new success rate
   */
  private calculateSuccessRate(decision: AutonomousDecision, feedbackScore: number): number {
    const currentRate = decision.successRate || 0.5;
    
    // Exponential moving average
    const alpha = 0.3; // learning rate
    const newRate = (alpha * (feedbackScore > 0 ? 1 : 0)) + ((1 - alpha) * currentRate);
    
    return Math.max(0, Math.min(1.0, newRate));
  }

  /**
   * Generate recommendations based on feedback
   */
  private generateRecommendations(feedback: FeedbackData, decision: AutonomousDecision): string[] {
    const recommendations: string[] = [];
    
    if (feedback.result === 'success') {
      recommendations.push(`Continue applying ${decision.decisionType} decisions for ${decision.category}`);
      
      if (feedback.improvements && feedback.improvements.length > 0) {
        const bestImprovement = feedback.improvements.reduce((best, imp) =>
          imp.improvementPercent > best.improvementPercent ? imp : best
        );
        recommendations.push(`Focus on optimizing ${bestImprovement.metric} (${bestImprovement.improvementPercent.toFixed(1)}% improvement achieved)`);
      }
    } else if (feedback.result === 'partial') {
      recommendations.push(`Review ${decision.decisionType} approach for ${decision.category}`);
      
      if (feedback.errors && feedback.errors.length > 0) {
        recommendations.push(`Address errors: ${feedback.errors[0]}`);
      }
    } else {
      recommendations.push(`Pause ${decision.decisionType} decisions for ${decision.category}`);
      recommendations.push(`Analyze failure reason and adjust model`);
      
      if (feedback.errors && feedback.errors.length > 0) {
        recommendations.push(`Critical: ${feedback.errors.join(', ')}`);
      }
    }
    
    // Confidence-based recommendations
    if (decision.confidence < 0.5) {
      recommendations.push(`Increase confidence threshold before applying similar decisions`);
    }
    
    return recommendations;
  }

  /**
   * Update decision in database
   */
  private async updateDecision(decisionId: string, updates: any): Promise<void> {
    await db
      .update(autonomousDecisions)
      .set(updates)
      .where(eq(autonomousDecisions.decisionId, decisionId));
  }

  /**
   * Update learning model with feedback
   */
  private async updateLearningModel(
    decision: AutonomousDecision,
    feedbackScore: number,
    actualImpact: number
  ): Promise<void> {
    // This would trigger learning engine to update pattern weights
    // based on this feedback
    
    console.log(`[Feedback Analyzer] Learning model updated for pattern: ${decision.sourcePattern}`);
    
    // The learning engine will pick this up in next cycle
    // by querying decisions with feedbackReceived=1
  }

  /**
   * Get feedback statistics for a node
   */
  async getNodeFeedbackStats(nodeId: string): Promise<{
    totalDecisions: number;
    successCount: number;
    failedCount: number;
    avgFeedbackScore: number;
    avgImpact: number;
    avgConfidence: number;
  }> {
    const decisions = await db
      .select()
      .from(autonomousDecisions)
      .where(eq(autonomousDecisions.nodeId, nodeId));
    
    const withFeedback = decisions.filter(d => d.feedbackReceived === 1);
    
    const successCount = withFeedback.filter(d => d.feedbackScore > 0).length;
    const failedCount = withFeedback.filter(d => d.feedbackScore <= 0).length;
    
    const avgFeedbackScore = withFeedback.length > 0
      ? withFeedback.reduce((sum, d) => sum + d.feedbackScore, 0) / withFeedback.length
      : 0;
    
    const avgImpact = withFeedback.length > 0
      ? withFeedback.filter(d => d.actualImpact !== null)
          .reduce((sum, d) => sum + (d.actualImpact || 0), 0) / withFeedback.length
      : 0;
    
    const avgConfidence = decisions.length > 0
      ? decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
      : 0;
    
    return {
      totalDecisions: decisions.length,
      successCount,
      failedCount,
      avgFeedbackScore,
      avgImpact,
      avgConfidence
    };
  }

  /**
   * Get overall system feedback statistics
   */
  async getSystemFeedbackStats(): Promise<{
    totalDecisions: number;
    decisionsWithFeedback: number;
    avgFeedbackScore: number;
    avgSuccessRate: number;
    topPerformingNodes: { nodeId: string; successRate: number }[];
  }> {
    const allDecisions = await db
      .select()
      .from(autonomousDecisions);
    
    const withFeedback = allDecisions.filter(d => d.feedbackReceived === 1);
    
    const avgFeedbackScore = withFeedback.length > 0
      ? withFeedback.reduce((sum, d) => sum + d.feedbackScore, 0) / withFeedback.length
      : 0;
    
    const avgSuccessRate = allDecisions.length > 0
      ? allDecisions.reduce((sum, d) => sum + d.successRate, 0) / allDecisions.length
      : 0;
    
    // Group by node
    const byNode = new Map<string, { success: number; total: number }>();
    for (const decision of withFeedback) {
      if (!byNode.has(decision.nodeId)) {
        byNode.set(decision.nodeId, { success: 0, total: 0 });
      }
      const stats = byNode.get(decision.nodeId)!;
      stats.total++;
      if (decision.feedbackScore > 0) {
        stats.success++;
      }
    }
    
    const topPerformingNodes = Array.from(byNode.entries())
      .map(([nodeId, stats]) => ({
        nodeId,
        successRate: stats.success / stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
    
    return {
      totalDecisions: allDecisions.length,
      decisionsWithFeedback: withFeedback.length,
      avgFeedbackScore,
      avgSuccessRate,
      topPerformingNodes
    };
  }
}

// Export singleton instance
export const feedbackAnalyzer = new FeedbackAnalyzer();

console.log('[Feedback Analyzer] Module loaded');
