/**
 * Autonomous Learning Engine - Phase 9.7
 * محرك التعلّم الذاتي للنظام الفدرالي
 * 
 * يحلل البيانات من العقد المتصلة، يتعلم من النتائج،
 * ويطوّر قراراته باستمرار دون تدخل بشري
 */

import { db } from '../db';
import {
  intelligenceData,
  intelligencePatterns,
  autonomousDecisions,
  federationNodes,
  type InsertAutonomousDecision
} from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Learning Model Configuration
 */
interface LearningConfig {
  minConfidence: number;
  maxConfidence: number;
  learningRate: number;
  decayFactor: number;
  minDataPoints: number;
}

const DEFAULT_CONFIG: LearningConfig = {
  minConfidence: 0.3,
  maxConfidence: 0.95,
  learningRate: 0.1,
  decayFactor: 0.05,
  minDataPoints: 5
};

/**
 * Pattern Weight - وزن النمط بناءً على الأداء
 */
interface PatternWeight {
  patternId: string;
  weight: number;
  successCount: number;
  failCount: number;
  avgImpact: number;
  lastUpdated: number;
}

/**
 * Learning Insight - معلومة تعلّم مستخرجة
 */
interface LearningInsight {
  nodeId: string;
  category: string;
  pattern: any;
  confidence: number;
  recommendation: string;
  reasoning: string;
}

/**
 * Autonomous Learning Engine Class
 */
export class AutonomousLearningEngine {
  private config: LearningConfig;
  private patternWeights: Map<string, PatternWeight> = new Map();
  private learningCycle: number = 1;

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[Learning Engine] ✅ Initialized with config:', this.config);
  }

  /**
   * Run complete learning cycle
   * دورة تعلّم كاملة: تحليل → استخلاص → تقييم
   */
  async runLearningCycle(options: {
    lookbackDays?: number;
    targetNodes?: string[];
  } = {}): Promise<LearningInsight[]> {
    const { lookbackDays = 7, targetNodes } = options;
    
    console.log(`[Learning Engine] 🧠 Starting learning cycle #${this.learningCycle}`);
    console.log(`[Learning Engine] Lookback: ${lookbackDays} days`);
    
    const startTime = Date.now();
    
    try {
      // 1. Gather intelligence data
      const intelligenceItems = await this.gatherIntelligence(lookbackDays, targetNodes);
      console.log(`[Learning Engine] Gathered ${intelligenceItems.length} intelligence items`);
      
      // 2. Analyze patterns
      const patterns = await this.analyzePatterns(lookbackDays);
      console.log(`[Learning Engine] Found ${patterns.length} patterns`);
      
      // 3. Load past decisions and their outcomes
      await this.loadPatternWeights();
      
      // 4. Generate insights
      const insights = await this.generateInsights(intelligenceItems, patterns);
      console.log(`[Learning Engine] Generated ${insights.length} insights`);
      
      // 5. Update learning model
      await this.updateLearningModel();
      
      const duration = Date.now() - startTime;
      console.log(`[Learning Engine] ✅ Cycle #${this.learningCycle} completed in ${duration}ms`);
      
      this.learningCycle++;
      
      return insights;
      
    } catch (error: any) {
      console.error('[Learning Engine] ❌ Cycle failed:', error);
      throw error;
    }
  }

  /**
   * Gather intelligence data from specified period
   */
  private async gatherIntelligence(
    lookbackDays: number,
    targetNodes?: string[]
  ): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    
    let query = db
      .select()
      .from(intelligenceData)
      .where(gte(intelligenceData.receivedAt, cutoffDate))
      .orderBy(desc(intelligenceData.receivedAt));
    
    const items = await query;
    
    // Filter by target nodes if specified
    if (targetNodes && targetNodes.length > 0) {
      return items.filter(item => targetNodes.includes(item.sourceNode || ''));
    }
    
    return items;
  }

  /**
   * Analyze patterns from intelligence data
   */
  private async analyzePatterns(lookbackDays: number): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    
    const patterns = await db
      .select()
      .from(intelligencePatterns)
      .where(
        and(
          gte(intelligencePatterns.firstDetectedAt, cutoffDate),
          eq(intelligencePatterns.status, 'active')
        )
      )
      .orderBy(desc(intelligencePatterns.frequency));
    
    return patterns;
  }

  /**
   * Load pattern weights from past decisions
   */
  private async loadPatternWeights(): Promise<void> {
    const pastDecisions = await db
      .select()
      .from(autonomousDecisions)
      .where(eq(autonomousDecisions.feedbackReceived, 1))
      .orderBy(desc(autonomousDecisions.createdAt))
      .limit(100);
    
    this.patternWeights.clear();
    
    for (const decision of pastDecisions) {
      if (!decision.sourcePattern) continue;
      
      const existing = this.patternWeights.get(decision.sourcePattern) || {
        patternId: decision.sourcePattern,
        weight: 0.5,
        successCount: 0,
        failCount: 0,
        avgImpact: 0,
        lastUpdated: Date.now()
      };
      
      // Update based on feedback
      if (decision.feedbackScore > 0) {
        existing.successCount++;
        existing.avgImpact = (existing.avgImpact + (decision.actualImpact || 0)) / 2;
      } else {
        existing.failCount++;
      }
      
      // Calculate new weight
      const totalCount = existing.successCount + existing.failCount;
      if (totalCount > 0) {
        existing.weight = existing.successCount / totalCount;
        existing.weight = Math.max(this.config.minConfidence, Math.min(this.config.maxConfidence, existing.weight));
      }
      
      this.patternWeights.set(decision.sourcePattern, existing);
    }
    
    console.log(`[Learning Engine] Loaded ${this.patternWeights.size} pattern weights`);
  }

  /**
   * Generate insights from intelligence and patterns
   */
  private async generateInsights(
    intelligenceItems: any[],
    patterns: any[]
  ): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    
    // Group intelligence by node
    const byNode = new Map<string, any[]>();
    for (const item of intelligenceItems) {
      const nodeId = item.sourceNode || 'unknown';
      if (!byNode.has(nodeId)) {
        byNode.set(nodeId, []);
      }
      byNode.get(nodeId)!.push(item);
    }
    
    // Generate insights for each node
    for (const [nodeId, items] of byNode) {
      if (items.length < this.config.minDataPoints) continue;
      
      // Analyze node's data
      const categories = new Map<string, number>();
      for (const item of items) {
        const category = item.category || 'unknown';
        categories.set(category, (categories.get(category) || 0) + 1);
      }
      
      // Find dominant category
      let maxCategory = 'operational';
      let maxCount = 0;
      for (const [cat, count] of categories) {
        if (count > maxCount) {
          maxCount = count;
          maxCategory = cat;
        }
      }
      
      // Find relevant patterns
      const relevantPatterns = patterns.filter(p => 
        p.affectedNodes && 
        Array.isArray(p.affectedNodes) && 
        p.affectedNodes.includes(nodeId)
      );
      
      if (relevantPatterns.length > 0) {
        const topPattern = relevantPatterns[0];
        const patternWeight = this.patternWeights.get(topPattern.patternId);
        
        insights.push({
          nodeId,
          category: maxCategory,
          pattern: topPattern,
          confidence: patternWeight?.weight || this.config.minConfidence,
          recommendation: this.generateRecommendation(topPattern, items),
          reasoning: `Detected ${topPattern.frequency} occurrences of pattern '${topPattern.name}' affecting this node`
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate recommendation based on pattern and data
   */
  private generateRecommendation(pattern: any, items: any[]): string {
    const patternType = pattern.patternType || 'unknown';
    
    switch (patternType) {
      case 'recurring-issue':
        return `Automate resolution for recurring issue: ${pattern.name}`;
      
      case 'optimization-opportunity':
        return `Optimize ${pattern.category} process based on detected pattern`;
      
      case 'security-risk':
        return `Apply security patch for detected vulnerability`;
      
      default:
        return `Review and adjust ${pattern.category} configuration`;
    }
  }

  /**
   * Update learning model weights
   */
  private async updateLearningModel(): Promise<void> {
    // Apply learning rate to adjust weights
    for (const [patternId, weight] of this.patternWeights) {
      // Decay old weights slightly
      weight.weight = weight.weight * (1 - this.config.decayFactor);
      weight.lastUpdated = Date.now();
    }
    
    console.log('[Learning Engine] Model weights updated');
  }

  /**
   * Get pattern weight for confidence calculation
   */
  getPatternWeight(patternId: string): number {
    return this.patternWeights.get(patternId)?.weight || this.config.minConfidence;
  }

  /**
   * Get learning statistics
   */
  getStatistics() {
    const weights = Array.from(this.patternWeights.values());
    
    return {
      learningCycle: this.learningCycle,
      totalPatterns: weights.length,
      avgConfidence: weights.reduce((sum, w) => sum + w.weight, 0) / (weights.length || 1),
      successRate: weights.reduce((sum, w) => sum + w.successCount, 0) / 
                   (weights.reduce((sum, w) => sum + w.successCount + w.failCount, 0) || 1),
      config: this.config
    };
  }
}

// Export singleton instance
export const learningEngine = new AutonomousLearningEngine();

console.log('[Learning Engine] Module loaded');
