/**
 * FEEDBACK LOOP SYSTEM - حلقة التعلم المستمر
 * 
 * نظام تسجيل القرارات والتعلم من النتائج
 * Continuous learning from every decision and outcome
 */

import { EventEmitter } from 'events';
import { db } from '../../server/db';
import { 
  decisionLogs, 
  decisionFeedback, 
  learningCycles, 
  sharedLearnings,
  type InsertDecisionLog,
  type InsertDecisionFeedback,
  type InsertLearningCycle,
  type InsertSharedLearning,
  type DecisionLog,
  type DecisionFeedback
} from '../../shared/schema';
import { eq, sql, desc } from 'drizzle-orm';

// ============= Types =============

export interface DecisionInput {
  decisionType: string;
  source: string;
  sourceId?: string;
  context: Record<string, any>;
  decision: Record<string, any>;
  confidence?: number;
  reasoning?: string;
  expectedOutcome?: string;
  metadata?: Record<string, any>;
}

export interface FeedbackInput {
  decisionId: string;
  actualOutcome: string;
  success: 'success' | 'partial' | 'failure';
  impactScore: number; // -100 to +100
  lesson?: string;
  adjustmentNeeded?: string;
  metadata?: Record<string, any>;
}

export interface LearningStats {
  totalDecisions: number;
  successRate: number;
  averageConfidence: number;
  averageImpact: number;
  recentDecisions: DecisionLog[];
  topPatterns: Array<{
    pattern: string;
    frequency: number;
    successRate: number;
  }>;
}

// ============= Feedback Loop Engine =============

export class FeedbackLoop extends EventEmitter {
  private active: boolean = false;
  private currentCycle: number = 0;
  private cycleStartTime: number = 0;

  constructor() {
    super();
    console.log('[FeedbackLoop] Initialized');
  }

  // ============= Activation =============

  async activate(): Promise<void> {
    if (this.active) {
      console.log('[FeedbackLoop] Already active');
      return;
    }

    this.active = true;
    
    // Get or create current learning cycle
    const latestCycle = await db
      .select()
      .from(learningCycles)
      .where(eq(learningCycles.status, 'active'))
      .limit(1);

    if (latestCycle.length === 0) {
      // Create new cycle
      const [newCycle] = await db.insert(learningCycles).values({
        cycleNumber: 1,
        period: 'continuous',
        totalDecisions: 0,
        successfulDecisions: 0,
        averageConfidence: 0,
        averageImpact: 0,
        status: 'active'
      }).returning();
      this.currentCycle = newCycle.cycleNumber;
    } else {
      this.currentCycle = latestCycle[0].cycleNumber;
    }

    this.cycleStartTime = Date.now();
    this.emit('activated');
    console.log(`🔄 Feedback Loop activated - Cycle #${this.currentCycle} - Learning enabled`);
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.emit('deactivated');
    console.log('[FeedbackLoop] Deactivated');
  }

  // ============= Decision Logging =============

  async logDecision(input: DecisionInput): Promise<DecisionLog> {
    if (!this.active) {
      throw new Error('Feedback Loop is not active');
    }

    const decisionData: InsertDecisionLog = {
      decisionType: input.decisionType,
      source: input.source,
      sourceId: input.sourceId || null,
      context: input.context,
      decision: input.decision,
      confidence: input.confidence || 50,
      reasoning: input.reasoning || null,
      expectedOutcome: input.expectedOutcome || null,
      metadata: input.metadata || null
    };

    const [decision] = await db.insert(decisionLogs).values(decisionData).returning();

    // Update cycle stats
    await this.updateCycleStats();

    this.emit('decision-logged', decision);
    return decision;
  }

  // ============= Feedback Recording =============

  async recordFeedback(input: FeedbackInput): Promise<DecisionFeedback> {
    if (!this.active) {
      throw new Error('Feedback Loop is not active');
    }

    const feedbackData: InsertDecisionFeedback = {
      decisionId: input.decisionId,
      actualOutcome: input.actualOutcome,
      success: input.success,
      impactScore: input.impactScore,
      lesson: input.lesson || null,
      adjustmentNeeded: input.adjustmentNeeded || null,
      metadata: input.metadata || null
    };

    const [feedback] = await db.insert(decisionFeedback).values(feedbackData).returning();

    // Update cycle stats
    await this.updateCycleStats();

    // Check if we discovered a pattern
    await this.detectPattern(input.decisionId, feedback);

    this.emit('feedback-recorded', feedback);
    return feedback;
  }

  // ============= Pattern Detection =============

  private async detectPattern(decisionId: string, feedback: DecisionFeedback): Promise<void> {
    // Get the decision
    const [decision] = await db
      .select()
      .from(decisionLogs)
      .where(eq(decisionLogs.id, decisionId))
      .limit(1);

    if (!decision) return;

    // Check if this type of decision has enough data
    const similarDecisions = await db
      .select()
      .from(decisionLogs)
      .where(eq(decisionLogs.decisionType, decision.decisionType))
      .limit(10);

    if (similarDecisions.length >= 5) {
      // Get feedback for similar decisions
      const feedbackIds = similarDecisions.map(d => d.id);
      const allFeedback = feedbackIds.length > 0 ? await db
        .select()
        .from(decisionFeedback)
        .where(sql`${decisionFeedback.decisionId} = ANY(ARRAY[${sql.join(feedbackIds.map(id => sql`${id}`), sql`, `)}])`) : [];

      if (allFeedback.length >= 3) {
        const successCount = allFeedback.filter(f => f.success === 'success').length;
        const successRate = Math.round((successCount / allFeedback.length) * 100);

        // If success rate > 70%, it's a good pattern
        if (successRate >= 70) {
          const pattern = `${decision.decisionType}_pattern`;
          
          // Check if pattern already exists
          const existingPattern = await db
            .select()
            .from(sharedLearnings)
            .where(eq(sharedLearnings.pattern, pattern))
            .limit(1);

          if (existingPattern.length === 0) {
            // Create new shared learning
            await db.insert(sharedLearnings).values({
              category: decision.decisionType,
              pattern: pattern,
              description: `Successful pattern for ${decision.decisionType} decisions`,
              confidence: successRate,
              usageCount: allFeedback.length,
              successRate: successRate,
              contributorBots: [decision.source],
              examples: similarDecisions.map(d => ({
                context: d.context,
                decision: d.decision,
                outcome: 'success'
              }))
            });

            console.log(`✨ Pattern discovered: ${pattern} (${successRate}% success rate)`);
            this.emit('pattern-discovered', { pattern, successRate });
          }
        }
      }
    }
  }

  // ============= Stats & Analytics =============

  private async updateCycleStats(): Promise<void> {
    const [cycle] = await db
      .select()
      .from(learningCycles)
      .where(eq(learningCycles.cycleNumber, this.currentCycle))
      .limit(1);

    if (!cycle) return;

    // Get all decisions in this cycle
    const decisions = await db
      .select()
      .from(decisionLogs)
      .where(sql`${decisionLogs.createdAt} >= ${cycle.startedAt}`)
      .execute();

    // Get feedback for these decisions
    const decisionIds = decisions.map(d => d.id);
    const feedbacks = decisionIds.length > 0 ? await db
      .select()
      .from(decisionFeedback)
      .where(sql`${decisionFeedback.decisionId} = ANY(ARRAY[${sql.join(decisionIds.map(id => sql`${id}`), sql`, `)}])`)
      .execute() : [];

    const totalDecisions = decisions.length;
    const successfulDecisions = feedbacks.filter(f => f.success === 'success').length;
    const avgConfidence = totalDecisions > 0 
      ? Math.round(decisions.reduce((sum, d) => sum + d.confidence, 0) / totalDecisions)
      : 0;
    const avgImpact = feedbacks.length > 0
      ? Math.round(feedbacks.reduce((sum, f) => sum + f.impactScore, 0) / feedbacks.length)
      : 0;

    await db
      .update(learningCycles)
      .set({
        totalDecisions,
        successfulDecisions,
        averageConfidence: avgConfidence,
        averageImpact: avgImpact
      })
      .where(eq(learningCycles.id, cycle.id));
  }

  async getStats(): Promise<LearningStats> {
    // Get recent decisions
    const recentDecisions = await db
      .select()
      .from(decisionLogs)
      .orderBy(desc(decisionLogs.createdAt))
      .limit(10);

    // Calculate success rate
    const decisionsWithFeedback = await db
      .select()
      .from(decisionLogs)
      .innerJoin(decisionFeedback, eq(decisionLogs.id, decisionFeedback.decisionId))
      .execute();

    const totalWithFeedback = decisionsWithFeedback.length;
    const successful = decisionsWithFeedback.filter(d => 
      (d.decision_feedback as any).success === 'success'
    ).length;

    const successRate = totalWithFeedback > 0 
      ? Math.round((successful / totalWithFeedback) * 100)
      : 0;

    // Get top patterns
    const patterns = await db
      .select()
      .from(sharedLearnings)
      .orderBy(desc(sharedLearnings.successRate))
      .limit(5);

    return {
      totalDecisions: recentDecisions.length,
      successRate,
      averageConfidence: recentDecisions.length > 0
        ? Math.round(recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length)
        : 0,
      averageImpact: 0, // Would need to calculate from feedback
      recentDecisions,
      topPatterns: patterns.map(p => ({
        pattern: p.pattern,
        frequency: p.usageCount,
        successRate: p.successRate
      }))
    };
  }

  // ============= Shared Learning =============

  async getSharedLearning(category: string): Promise<any[]> {
    const learnings = await db
      .select()
      .from(sharedLearnings)
      .where(eq(sharedLearnings.category, category))
      .orderBy(desc(sharedLearnings.successRate));

    return learnings;
  }

  async contributeToSharedLearning(data: Omit<InsertSharedLearning, 'createdAt' | 'updatedAt'>): Promise<void> {
    await db.insert(sharedLearnings).values(data as InsertSharedLearning);
    console.log(`📚 Shared learning contributed: ${data.category} - ${data.pattern}`);
    this.emit('learning-shared', data);
  }
}

// ============= Export Singleton =============

export const feedbackLoop = new FeedbackLoop();
