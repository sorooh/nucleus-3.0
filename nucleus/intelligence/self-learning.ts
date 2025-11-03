/**
 * SELF-LEARNING LOOP - حلقة التعلم الذاتي المستمر
 * 
 * The system learns from every decision and improves itself automatically
 * 
 * Features:
 * - Continuous learning from outcomes
 * - Pattern recognition across decisions
 * - Self-optimization of strategies
 * - Performance-based adaptation
 */

import { HunyuanProvider } from '../../server/ai/providers/hunyuan';

// ============================================
// Types & Interfaces
// ============================================

interface DecisionOutcome {
  decisionId: string;
  input: string;
  decision: any;
  outcome: 'success' | 'failure' | 'partial';
  feedback?: string;
  metrics?: {
    accuracy?: number;
    speed?: number;
    satisfaction?: number;
  };
  timestamp: Date;
}

interface LearningPattern {
  id: string;
  pattern: string;
  successRate: number;
  totalOccurrences: number;
  averageMetrics: {
    accuracy: number;
    speed: number;
  };
  recommendedAction: string;
  confidence: number;
}

interface SelfImprovementAction {
  type: 'adjust_strategy' | 'add_pattern' | 'optimize_parameter' | 'update_model';
  description: string;
  expectedImprovement: number;
  priority: 'low' | 'medium' | 'high';
}

// ============================================
// Self-Learning System Class
// ============================================

export class SelfLearningSystem {
  private active: boolean = false;
  private hunyuan: HunyuanProvider | null = null;
  private outcomeHistory: DecisionOutcome[] = [];
  private learnedPatterns: Map<string, LearningPattern> = new Map();
  private improvementActions: SelfImprovementAction[] = [];
  private maxHistorySize: number = 1000;
  private learningCycles: number = 0;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      if (process.env.SILICONFLOW_API_KEY) {
        this.hunyuan = new HunyuanProvider();
        console.log('[SelfLearning] ✅ AI provider initialized');
      }
    } catch (error: any) {
      console.error('[SelfLearning] ❌ Failed to initialize:', error.message);
    }
  }

  /**
   * Activate Self-Learning System
   */
  activate(): void {
    if (this.active) {
      console.log('[SelfLearning] Already active');
      return;
    }

    this.active = true;
    console.log('🔄 [SelfLearning] Self-learning loop activated');
    console.log(`   • Learning from every decision`);
    console.log(`   • Continuous self-improvement enabled`);
    
    // Start periodic learning cycles
    this.startLearningCycles();
  }

  /**
   * Deactivate Self-Learning System
   */
  deactivate(): void {
    this.active = false;
    console.log('[SelfLearning] Deactivated');
  }

  /**
   * Record a decision outcome for learning
   */
  recordOutcome(outcome: Omit<DecisionOutcome, 'timestamp'>): void {
    const record: DecisionOutcome = {
      ...outcome,
      timestamp: new Date()
    };

    this.outcomeHistory.push(record);

    // Maintain max history size
    if (this.outcomeHistory.length > this.maxHistorySize) {
      this.outcomeHistory = this.outcomeHistory.slice(-this.maxHistorySize);
    }

    console.log(`[SelfLearning] 📝 Recorded outcome: ${outcome.outcome} (${this.outcomeHistory.length} total)`);

    // Trigger immediate learning if significant event
    if (outcome.outcome === 'failure' || (outcome.metrics?.accuracy && outcome.metrics.accuracy < 0.5)) {
      this.learnFromRecent(10);
    }
  }

  /**
   * Learn from recent outcomes
   */
  async learnFromRecent(count: number = 20): Promise<void> {
    if (!this.active) return;
    if (this.outcomeHistory.length < 5) return; // Need minimum data

    const recentOutcomes = this.outcomeHistory.slice(-count);
    
    console.log(`\n🧠 [SelfLearning] Analyzing ${recentOutcomes.length} recent outcomes...`);

    // Extract patterns
    await this.extractPatterns(recentOutcomes);

    // Generate improvement actions
    await this.generateImprovementActions();

    console.log(`✅ [SelfLearning] Learning cycle complete`);
  }

  /**
   * Extract patterns from outcomes using AI
   */
  private async extractPatterns(outcomes: DecisionOutcome[]): Promise<void> {
    if (!this.hunyuan || outcomes.length === 0) return;

    try {
      const prompt = `حلل هذه القرارات واستخرج الأنماط المتكررة:

${outcomes.map((o, i) => `
${i + 1}. Input: ${o.input}
   Decision: ${JSON.stringify(o.decision)}
   Outcome: ${o.outcome}
   ${o.feedback ? `Feedback: ${o.feedback}` : ''}
`).join('\n')}

استخرج الأنماط بصيغة JSON:
{
  "patterns": [
    {
      "pattern": "وصف النمط",
      "successRate": 0.85,
      "occurrences": 5,
      "recommendedAction": "ماذا يجب فعله"
    }
  ]
}`;

      const response = await this.hunyuan.generateResponse(prompt, {
        temperature: 0.3,
        maxTokens: 1000
      });

      // Parse patterns
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.patterns && Array.isArray(parsed.patterns)) {
          parsed.patterns.forEach((p: any) => {
            const patternId = this.generatePatternId(p.pattern);
            
            // Update or create pattern
            const existing = this.learnedPatterns.get(patternId);
            if (existing) {
              // Update with new data
              existing.totalOccurrences += p.occurrences || 1;
              existing.successRate = (existing.successRate + (p.successRate || 0.5)) / 2;
            } else {
              // Create new pattern
              this.learnedPatterns.set(patternId, {
                id: patternId,
                pattern: p.pattern,
                successRate: p.successRate || 0.5,
                totalOccurrences: p.occurrences || 1,
                averageMetrics: {
                  accuracy: p.successRate || 0.5,
                  speed: 1.0
                },
                recommendedAction: p.recommendedAction || '',
                confidence: p.successRate || 0.5
              });
            }
          });

          console.log(`   📊 Extracted ${parsed.patterns.length} patterns`);
        }
      }
    } catch (error: any) {
      console.error('[SelfLearning] Pattern extraction failed:', error.message);
    }
  }

  /**
   * Generate improvement actions based on learned patterns
   */
  private async generateImprovementActions(): Promise<void> {
    if (!this.hunyuan) return;

    const patterns = Array.from(this.learnedPatterns.values());
    if (patterns.length === 0) return;

    // Find weak patterns (low success rate)
    const weakPatterns = patterns.filter(p => p.successRate < 0.7);
    
    if (weakPatterns.length === 0) {
      console.log('   ✅ All patterns performing well');
      return;
    }

    try {
      const prompt = `حدد إجراءات التحسين لهذه الأنماط الضعيفة:

${weakPatterns.map((p, i) => `
${i + 1}. Pattern: ${p.pattern}
   Success Rate: ${Math.round(p.successRate * 100)}%
   Occurrences: ${p.totalOccurrences}
`).join('\n')}

اقترح إجراءات التحسين بصيغة JSON:
{
  "actions": [
    {
      "type": "adjust_strategy",
      "description": "وصف الإجراء",
      "expectedImprovement": 0.15,
      "priority": "high"
    }
  ]
}`;

      const response = await this.hunyuan.generateResponse(prompt, {
        temperature: 0.4,
        maxTokens: 800
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.actions && Array.isArray(parsed.actions)) {
          this.improvementActions = parsed.actions.map((a: any) => ({
            type: a.type || 'adjust_strategy',
            description: a.description || '',
            expectedImprovement: a.expectedImprovement || 0.1,
            priority: a.priority || 'medium'
          }));

          console.log(`   🎯 Generated ${this.improvementActions.length} improvement actions`);
        }
      }
    } catch (error: any) {
      console.error('[SelfLearning] Action generation failed:', error.message);
    }
  }

  /**
   * Start periodic learning cycles
   */
  private startLearningCycles(): void {
    // Run first cycle immediately (after 30 seconds)
    setTimeout(async () => {
      if (!this.active) return;
      this.learningCycles++;
      console.log(`\n🔄 [SelfLearning] Learning Cycle #${this.learningCycles} (Initial)`);
      await this.learnFromRecent(30);
    }, 30000); // 30 seconds

    // Then run learning cycle every 5 minutes
    setInterval(async () => {
      if (!this.active) return;
      
      this.learningCycles++;
      console.log(`\n🔄 [SelfLearning] Learning Cycle #${this.learningCycles}`);
      
      await this.learnFromRecent(30);
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('   ⏰ Cycles: Initial (30s) → Every 5 minutes');
  }

  /**
   * Get performance insights
   */
  getInsights(): {
    totalOutcomes: number;
    successRate: number;
    patterns: number;
    topPatterns: LearningPattern[];
    improvementActions: SelfImprovementAction[];
  } {
    const successCount = this.outcomeHistory.filter(o => o.outcome === 'success').length;
    const successRate = this.outcomeHistory.length > 0 
      ? successCount / this.outcomeHistory.length 
      : 0;

    const topPatterns = Array.from(this.learnedPatterns.values())
      .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
      .slice(0, 5);

    return {
      totalOutcomes: this.outcomeHistory.length,
      successRate,
      patterns: this.learnedPatterns.size,
      topPatterns,
      improvementActions: this.improvementActions
    };
  }

  /**
   * Generate pattern ID from description
   */
  private generatePatternId(pattern: string): string {
    return pattern.toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      active: this.active,
      learningCycles: this.learningCycles,
      totalOutcomes: this.outcomeHistory.length,
      learnedPatterns: this.learnedPatterns.size,
      improvementActions: this.improvementActions.length,
      aiProvider: this.hunyuan ? 'Hunyuan-A13B' : 'None'
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const selfLearning = new SelfLearningSystem();
