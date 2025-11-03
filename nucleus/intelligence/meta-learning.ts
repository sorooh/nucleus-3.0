/**
 * META-LEARNING - التعلم من التعلم
 * 
 * The system learns how to learn more effectively
 * 
 * Features:
 * - Learning strategy optimization
 * - Performance monitoring across learning methods
 * - Adaptive learning rate
 * - Strategy selection based on context
 */

import { HunyuanProvider } from '../../server/ai/providers/hunyuan';

// ============================================
// Types & Interfaces
// ============================================

interface LearningStrategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  successRate: number;
  avgPerformance: number;
  usageCount: number;
  bestContexts: string[];
}

interface LearningSession {
  id: string;
  strategyId: string;
  task: string;
  startTime: Date;
  endTime?: Date;
  performance: number;
  outcome: 'success' | 'failure' | 'partial';
  insights: string[];
}

interface StrategyRecommendation {
  strategyId: string;
  strategyName: string;
  confidence: number;
  reasoning: string;
  expectedPerformance: number;
}

interface MetaInsight {
  id: string;
  insight: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendation?: string;
  discoveredAt: Date;
}

// ============================================
// Meta-Learning System Class
// ============================================

export class MetaLearningSystem {
  private active: boolean = false;
  private hunyuan: HunyuanProvider | null = null;
  private strategies: Map<string, LearningStrategy> = new Map();
  private sessions: LearningSession[] = [];
  private metaInsights: Map<string, MetaInsight> = new Map();
  private currentStrategy: string | null = null;

  constructor() {
    this.initializeProvider();
    this.initializeStrategies();
  }

  private initializeProvider(): void {
    try {
      if (process.env.SILICONFLOW_API_KEY) {
        this.hunyuan = new HunyuanProvider();
        console.log('[MetaLearning] ✅ AI provider initialized');
      }
    } catch (error: any) {
      console.error('[MetaLearning] ❌ Failed to initialize:', error.message);
    }
  }

  /**
   * Initialize default learning strategies
   */
  private initializeStrategies(): void {
    const defaultStrategies: Omit<LearningStrategy, 'successRate' | 'avgPerformance' | 'usageCount' | 'bestContexts'>[] = [
      {
        id: 'fast-shallow',
        name: 'Fast & Shallow Learning',
        description: 'Quick learning from immediate feedback, shallow analysis',
        parameters: { depth: 1, speed: 'fast', memory: 10 }
      },
      {
        id: 'deep-analytical',
        name: 'Deep Analytical Learning',
        description: 'Thorough analysis, pattern extraction, slow but comprehensive',
        parameters: { depth: 5, speed: 'slow', memory: 100 }
      },
      {
        id: 'balanced-adaptive',
        name: 'Balanced Adaptive Learning',
        description: 'Adaptive approach, balances speed and depth',
        parameters: { depth: 3, speed: 'medium', memory: 50 }
      },
      {
        id: 'ensemble-voting',
        name: 'Ensemble Voting Learning',
        description: 'Learn from multiple perspectives, consensus-based',
        parameters: { depth: 3, models: 2, voting: 'weighted' }
      },
      {
        id: 'error-driven',
        name: 'Error-Driven Learning',
        description: 'Focus on mistakes, learn from failures',
        parameters: { focus: 'errors', threshold: 0.3, correction: true }
      }
    ];

    defaultStrategies.forEach(s => {
      this.strategies.set(s.id, {
        ...s,
        successRate: 0.5,
        avgPerformance: 0.5,
        usageCount: 0,
        bestContexts: []
      });
    });

    console.log(`[MetaLearning] Initialized ${this.strategies.size} learning strategies`);
  }

  /**
   * Activate Meta-Learning
   */
  activate(): void {
    if (this.active) {
      console.log('[MetaLearning] Already active');
      return;
    }

    this.active = true;
    console.log('🎓 [MetaLearning] Meta-learning activated');
    console.log(`   • ${this.strategies.size} learning strategies available`);
    console.log(`   • Optimizing how the system learns`);
    console.log(`   • Adapting strategies based on performance`);
    
    // Start periodic meta-analysis
    this.startMetaAnalysis();
  }

  /**
   * Deactivate Meta-Learning
   */
  deactivate(): void {
    this.active = false;
    console.log('[MetaLearning] Deactivated');
  }

  /**
   * Recommend best learning strategy for a task
   */
  async recommendStrategy(task: string, context?: Record<string, any>): Promise<StrategyRecommendation | null> {
    if (!this.active || !this.hunyuan) return null;

    try {
      const strategiesList = Array.from(this.strategies.values())
        .map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          successRate: s.successRate,
          avgPerformance: s.avgPerformance,
          bestContexts: s.bestContexts
        }));

      const prompt = `اختر أفضل استراتيجية تعلم لهذه المهمة:

Task: ${task}
Context: ${JSON.stringify(context || {})}

Available Strategies:
${strategiesList.map((s, i) => `
${i + 1}. ${s.name}
   - Description: ${s.description}
   - Success Rate: ${Math.round(s.successRate * 100)}%
   - Avg Performance: ${Math.round(s.avgPerformance * 100)}%
   - Best Contexts: ${s.bestContexts.join(', ') || 'Not enough data'}
`).join('\n')}

اختر الاستراتيجية الأفضل بصيغة JSON:
{
  "strategyId": "strategy-id",
  "confidence": 0.85,
  "reasoning": "سبب الاختيار",
  "expectedPerformance": 0.8
}`;

      const response = await this.hunyuan.generateResponse(prompt, {
        temperature: 0.3,
        maxTokens: 600
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        const strategy = this.strategies.get(parsed.strategyId);
        if (strategy) {
          return {
            strategyId: parsed.strategyId,
            strategyName: strategy.name,
            confidence: parsed.confidence || 0.5,
            reasoning: parsed.reasoning || '',
            expectedPerformance: parsed.expectedPerformance || 0.5
          };
        }
      }

      // Fallback to best performing strategy
      return this.getBestStrategy();
    } catch (error: any) {
      console.error('[MetaLearning] Strategy recommendation failed:', error.message);
      return this.getBestStrategy();
    }
  }

  /**
   * Get best performing strategy as fallback
   */
  private getBestStrategy(): StrategyRecommendation {
    const best = Array.from(this.strategies.values())
      .sort((a, b) => b.avgPerformance - a.avgPerformance)[0];

    return {
      strategyId: best.id,
      strategyName: best.name,
      confidence: 0.6,
      reasoning: 'Best overall performing strategy',
      expectedPerformance: best.avgPerformance
    };
  }

  /**
   * Start a learning session with a strategy
   */
  startSession(task: string, strategyId?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use provided strategy or current default
    const useStrategy = strategyId || this.currentStrategy || 'balanced-adaptive';

    this.sessions.push({
      id: sessionId,
      strategyId: useStrategy,
      task,
      startTime: new Date(),
      performance: 0,
      outcome: 'partial',
      insights: []
    });

    console.log(`[MetaLearning] 📝 Session started: ${sessionId} (strategy: ${useStrategy})`);
    return sessionId;
  }

  /**
   * End a learning session and record results
   */
  endSession(sessionId: string, performance: number, outcome: 'success' | 'failure' | 'partial', insights: string[] = []): void {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      console.error(`[MetaLearning] Session not found: ${sessionId}`);
      return;
    }

    session.endTime = new Date();
    session.performance = performance;
    session.outcome = outcome;
    session.insights = insights;

    // Update strategy statistics
    const strategy = this.strategies.get(session.strategyId);
    if (strategy) {
      strategy.usageCount++;
      
      // Update success rate
      const successWeight = outcome === 'success' ? 1 : outcome === 'partial' ? 0.5 : 0;
      strategy.successRate = (strategy.successRate * (strategy.usageCount - 1) + successWeight) / strategy.usageCount;
      
      // Update average performance
      strategy.avgPerformance = (strategy.avgPerformance * (strategy.usageCount - 1) + performance) / strategy.usageCount;
    }

    console.log(`[MetaLearning] ✅ Session ended: ${sessionId} (${outcome}, performance: ${Math.round(performance * 100)}%)`);
  }

  /**
   * Analyze learning patterns across sessions
   */
  private async analyzeMetaPatterns(): Promise<void> {
    if (!this.hunyuan || this.sessions.length < 10) return;

    try {
      const recentSessions = this.sessions.slice(-20);

      const prompt = `حلل أنماط التعلم في هذه الجلسات واستخرج meta-insights:

${recentSessions.map((s, i) => `
${i + 1}. Task: ${s.task}
   Strategy: ${s.strategyId}
   Performance: ${Math.round(s.performance * 100)}%
   Outcome: ${s.outcome}
   Duration: ${s.endTime ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 1000) : '?'}s
`).join('\n')}

استخرج meta-insights بصيغة JSON:
{
  "insights": [
    {
      "insight": "الاستنتاج",
      "impact": "high",
      "actionable": true,
      "recommendation": "التوصية"
    }
  ]
}`;

      const response = await this.hunyuan.generateResponse(prompt, {
        temperature: 0.4,
        maxTokens: 1000
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.insights && Array.isArray(parsed.insights)) {
          parsed.insights.forEach((i: any) => {
            const insightId = this.generateId(i.insight);
            
            this.metaInsights.set(insightId, {
              id: insightId,
              insight: i.insight,
              impact: i.impact || 'medium',
              actionable: i.actionable || false,
              recommendation: i.recommendation,
              discoveredAt: new Date()
            });
          });

          console.log(`   💡 Discovered ${parsed.insights.length} meta-insights`);
        }
      }
    } catch (error: any) {
      console.error('[MetaLearning] Meta-pattern analysis failed:', error.message);
    }
  }

  /**
   * Start periodic meta-analysis
   */
  private startMetaAnalysis(): void {
    // Run first analysis immediately (after 3 minutes)
    setTimeout(async () => {
      if (!this.active) return;
      console.log('\n🔍 [MetaLearning] Running meta-analysis (Initial)...');
      await this.analyzeMetaPatterns();
    }, 180000); // 3 minutes

    // Then analyze every 20 minutes
    setInterval(async () => {
      if (!this.active) return;
      
      console.log('\n🔍 [MetaLearning] Running meta-analysis...');
      await this.analyzeMetaPatterns();
    }, 20 * 60 * 1000); // 20 minutes
    
    console.log('   ⏰ Cycles: Initial (3min) → Every 20 minutes');
  }

  /**
   * Get insights
   */
  getInsights(): {
    totalStrategies: number;
    totalSessions: number;
    bestStrategy: LearningStrategy | null;
    recentSessions: LearningSession[];
    topMetaInsights: MetaInsight[];
  } {
    const best = Array.from(this.strategies.values())
      .sort((a, b) => b.avgPerformance - a.avgPerformance)[0] || null;

    const topInsights = Array.from(this.metaInsights.values())
      .filter(i => i.impact === 'high')
      .slice(0, 3);

    return {
      totalStrategies: this.strategies.size,
      totalSessions: this.sessions.length,
      bestStrategy: best,
      recentSessions: this.sessions.slice(-10),
      topMetaInsights: topInsights
    };
  }

  /**
   * Generate ID
   */
  private generateId(text: string): string {
    return text.toLowerCase()
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
      strategies: this.strategies.size,
      sessions: this.sessions.length,
      metaInsights: this.metaInsights.size,
      currentStrategy: this.currentStrategy,
      aiProvider: this.hunyuan ? 'Hunyuan-A13B' : 'None'
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const metaLearning = new MetaLearningSystem();
