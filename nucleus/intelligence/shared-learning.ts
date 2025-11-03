/**
 * SHARED LEARNING LAYER - طبقة التعلم المشترك
 * 
 * نظام مشاركة المعرفة والخبرات بين البوتات
 * Collective intelligence through shared learning
 */

import { EventEmitter } from 'events';
import { feedbackLoop } from './feedback-loop';
import { vectorMemory } from './vector-memory';
import { db } from '../../server/db';
import { sharedLearnings, agents } from '../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

// ============= Types =============

export interface LearningContribution {
  botId: string;
  botName: string;
  category: string;
  pattern: string;
  description: string;
  examples: any[];
  confidence: number;
}

export interface SharedKnowledge {
  id: string;
  category: string;
  pattern: string;
  description: string;
  confidence: number;
  usageCount: number;
  successRate: number;
  contributors: string[];
  examples: any[];
  lastUpdated: Date;
}

export interface LearningStats {
  totalSharedPatterns: number;
  topCategories: Array<{ category: string; count: number }>;
  topContributors: Array<{ bot: string; contributions: number }>;
  averageSuccessRate: number;
  recentLearnings: SharedKnowledge[];
}

// ============= Shared Learning Engine =============

export class SharedLearning extends EventEmitter {
  private active: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncIntervalMs: number = 60000; // 1 minute

  constructor() {
    super();
    console.log('[SharedLearning] Initialized');
  }

  // ============= Activation =============

  async activate(): Promise<void> {
    if (this.active) {
      console.log('[SharedLearning] Already active');
      return;
    }

    this.active = true;

    // Start periodic sync with vector memory
    this.startAutoSync();

    this.emit('activated');
    console.log('🤝 Shared Learning activated - Collective intelligence enabled');
  }

  deactivate(): void {
    if (!this.active) return;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.active = false;
    this.emit('deactivated');
    console.log('[SharedLearning] Deactivated');
  }

  // ============= Knowledge Contribution =============

  async contribute(contribution: LearningContribution): Promise<void> {
    if (!this.active) {
      throw new Error('Shared Learning is not active');
    }

    // Check if pattern already exists
    const existing = await db
      .select()
      .from(sharedLearnings)
      .where(eq(sharedLearnings.pattern, contribution.pattern))
      .limit(1);

    if (existing.length > 0) {
      // Update existing pattern
      const current = existing[0];
      const contributors = Array.isArray(current.contributorBots) 
        ? current.contributorBots as string[]
        : [];

      if (!contributors.includes(contribution.botId)) {
        contributors.push(contribution.botId);
      }

      const updatedExamples = [
        ...(Array.isArray(current.examples) ? current.examples : []),
        ...contribution.examples
      ];

      await db
        .update(sharedLearnings)
        .set({
          contributorBots: contributors,
          examples: updatedExamples,
          usageCount: current.usageCount + 1,
          confidence: Math.round((current.confidence + contribution.confidence) / 2),
          updatedAt: new Date()
        })
        .where(eq(sharedLearnings.id, current.id));

      console.log(`📝 Updated shared learning: ${contribution.pattern} by ${contribution.botName}`);
    } else {
      // Create new pattern
      await db.insert(sharedLearnings).values({
        category: contribution.category,
        pattern: contribution.pattern,
        description: contribution.description,
        confidence: contribution.confidence,
        usageCount: 1,
        successRate: contribution.confidence,
        contributorBots: [contribution.botId],
        examples: contribution.examples
      });

      console.log(`✨ New shared learning: ${contribution.pattern} by ${contribution.botName}`);
    }

    // Also store in vector memory for semantic search
    try {
      await vectorMemory.store({
        content: `${contribution.pattern}: ${contribution.description}`,
        category: contribution.category,
        source: contribution.botName,
        metadata: {
          pattern: contribution.pattern,
          confidence: contribution.confidence,
          examples: contribution.examples
        },
        importance: contribution.confidence
      });
    } catch (error) {
      // Vector memory might not be activated yet
      console.log('[SharedLearning] Vector storage skipped (not activated)');
    }

    this.emit('contribution-added', contribution);
  }

  // ============= Knowledge Retrieval =============

  async getKnowledge(category: string, minConfidence: number = 50): Promise<SharedKnowledge[]> {
    if (!this.active) {
      throw new Error('Shared Learning is not active');
    }

    const learnings = await db
      .select()
      .from(sharedLearnings)
      .where(eq(sharedLearnings.category, category))
      .orderBy(desc(sharedLearnings.successRate));

    return learnings
      .filter(l => l.confidence >= minConfidence)
      .map(l => ({
        id: l.id,
        category: l.category,
        pattern: l.pattern,
        description: l.description,
        confidence: l.confidence,
        usageCount: l.usageCount,
        successRate: l.successRate,
        contributors: Array.isArray(l.contributorBots) ? l.contributorBots as string[] : [],
        examples: Array.isArray(l.examples) ? l.examples : [],
        lastUpdated: l.updatedAt || l.createdAt || new Date()
      }));
  }

  async searchKnowledge(query: string): Promise<SharedKnowledge[]> {
    if (!this.active) {
      throw new Error('Shared Learning is not active');
    }

    // Try vector search first if available
    if (vectorMemory.getMemoryCount && vectorMemory.getMemoryCount() > 0) {
      try {
        const results = await vectorMemory.search(query, 5);
        
        if (results.length > 0) {
          const patterns = results
            .map(r => r.memory.metadata?.pattern)
            .filter(p => p);

          if (patterns.length > 0) {
            const learnings = await db
              .select()
              .from(sharedLearnings)
              .where(sql`${sharedLearnings.pattern} = ANY(${patterns})`);

            return learnings.map(l => ({
              id: l.id,
              category: l.category,
              pattern: l.pattern,
              description: l.description,
              confidence: l.confidence,
              usageCount: l.usageCount,
              successRate: l.successRate,
              contributors: Array.isArray(l.contributorBots) ? l.contributorBots as string[] : [],
              examples: Array.isArray(l.examples) ? l.examples : [],
              lastUpdated: l.updatedAt || l.createdAt || new Date()
            }));
          }
        }
      } catch (error) {
        console.log('[SharedLearning] Vector search failed, using fallback');
      }
    }

    // Fallback: text search
    const learnings = await db
      .select()
      .from(sharedLearnings)
      .where(sql`${sharedLearnings.description} ILIKE ${'%' + query + '%'}`)
      .orderBy(desc(sharedLearnings.successRate))
      .limit(10);

    return learnings.map(l => ({
      id: l.id,
      category: l.category,
      pattern: l.pattern,
      description: l.description,
      confidence: l.confidence,
      usageCount: l.usageCount,
      successRate: l.successRate,
      contributors: Array.isArray(l.contributorBots) ? l.contributorBots as string[] : [],
      examples: Array.isArray(l.examples) ? l.examples : [],
      lastUpdated: l.updatedAt || l.createdAt || new Date()
    }));
  }

  // ============= Usage Tracking =============

  async recordUsage(patternId: string, success: boolean): Promise<void> {
    if (!this.active) {
      throw new Error('Shared Learning is not active');
    }

    const [pattern] = await db
      .select()
      .from(sharedLearnings)
      .where(eq(sharedLearnings.id, patternId))
      .limit(1);

    if (!pattern) return;

    const newUsageCount = pattern.usageCount + 1;
    const successCount = success 
      ? Math.round((pattern.successRate * pattern.usageCount) / 100) + 1
      : Math.round((pattern.successRate * pattern.usageCount) / 100);
    
    const newSuccessRate = Math.round((successCount / newUsageCount) * 100);

    await db
      .update(sharedLearnings)
      .set({
        usageCount: newUsageCount,
        successRate: newSuccessRate,
        updatedAt: new Date()
      })
      .where(eq(sharedLearnings.id, patternId));

    console.log(`📊 Pattern usage recorded: ${pattern.pattern} (${newSuccessRate}% success)`);
  }

  // ============= Auto Sync =============

  private startAutoSync(): void {
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithFeedbackLoop();
      } catch (error: any) {
        console.error('[SharedLearning] Auto sync failed:', error.message);
      }
    }, this.syncIntervalMs);
  }

  private async syncWithFeedbackLoop(): Promise<void> {
    // Get recent successful patterns from feedback loop
    try {
      const stats = await feedbackLoop.getStats();
      
      if (stats.topPatterns.length > 0) {
        for (const pattern of stats.topPatterns) {
          if (pattern.successRate >= 70) {
            // This is a good pattern worth sharing
            const existing = await db
              .select()
              .from(sharedLearnings)
              .where(eq(sharedLearnings.pattern, pattern.pattern))
              .limit(1);

            if (existing.length === 0) {
              await db.insert(sharedLearnings).values({
                category: 'auto-discovered',
                pattern: pattern.pattern,
                description: `Auto-discovered pattern with ${pattern.successRate}% success rate`,
                confidence: pattern.successRate,
                usageCount: pattern.frequency,
                successRate: pattern.successRate,
                contributorBots: ['nucleus-core'],
                examples: []
              });

              console.log(`🔍 Auto-synced pattern: ${pattern.pattern}`);
            }
          }
        }
      }
    } catch (error) {
      // Feedback loop might not be activated yet
    }
  }

  // ============= Statistics =============

  async getStats(): Promise<LearningStats> {
    if (!this.active) {
      throw new Error('Shared Learning is not active');
    }

    const allLearnings = await db.select().from(sharedLearnings);

    // Top categories
    const categoryMap = new Map<string, number>();
    allLearnings.forEach(l => {
      categoryMap.set(l.category, (categoryMap.get(l.category) || 0) + 1);
    });
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top contributors
    const contributorMap = new Map<string, number>();
    allLearnings.forEach(l => {
      const bots = Array.isArray(l.contributorBots) ? l.contributorBots as string[] : [];
      bots.forEach(bot => {
        contributorMap.set(bot, (contributorMap.get(bot) || 0) + 1);
      });
    });
    const topContributors = Array.from(contributorMap.entries())
      .map(([bot, contributions]) => ({ bot, contributions }))
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 5);

    // Average success rate
    const avgSuccessRate = allLearnings.length > 0
      ? Math.round(allLearnings.reduce((sum, l) => sum + l.successRate, 0) / allLearnings.length)
      : 0;

    // Recent learnings
    const recent = await db
      .select()
      .from(sharedLearnings)
      .orderBy(desc(sharedLearnings.updatedAt))
      .limit(5);

    return {
      totalSharedPatterns: allLearnings.length,
      topCategories,
      topContributors,
      averageSuccessRate: avgSuccessRate,
      recentLearnings: recent.map(l => ({
        id: l.id,
        category: l.category,
        pattern: l.pattern,
        description: l.description,
        confidence: l.confidence,
        usageCount: l.usageCount,
        successRate: l.successRate,
        contributors: Array.isArray(l.contributorBots) ? l.contributorBots as string[] : [],
        examples: Array.isArray(l.examples) ? l.examples : [],
        lastUpdated: l.updatedAt || l.createdAt || new Date()
      }))
    };
  }
}

// ============= Export Singleton =============

export const sharedLearning = new SharedLearning();
