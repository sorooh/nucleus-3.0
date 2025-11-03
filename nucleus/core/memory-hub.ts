/**
 * EVOLVING MEMORY LAYER - Built from Absolute Zero
 * 
 * ذاكرة سُروح المتطورة - Surooh's Long-term Memory
 * Mother Brain's historical learning repository
 * 
 * Purpose: Store, analyze, and retrieve evolution of decisions, models, and learning
 * Features:
 * - Model version history tracking
 * - Learning cycle analysis
 * - Evolutionary insights
 * - Historical decision retrieval
 */

import { EventEmitter } from 'events';

// ============= Types & Interfaces =============

export type SourceBrain = string; // e.g., "B2C_Brain", "B2B_Brain", "CE_Brain"
export type MemoryType = 'model' | 'decision' | 'experiment' | 'insight';

export interface ModelMemory {
  id: string;
  sourceBrain: SourceBrain;
  modelVersion: string;
  modelType: string;           // e.g., "pricing", "forecasting", "classification"
  changeReason: string;
  impact: number;              // -1 to 1 (percentage as decimal)
  artifacts?: string[];        // file paths or URLs
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface DecisionMemory {
  id: string;
  sourceBrain: SourceBrain;
  decisionType: string;        // e.g., "pricing", "credit", "inventory"
  context: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial' | 'pending';
  impact: number;
  learnedLesson?: string;
  timestamp: number;
}

export interface ExperimentMemory {
  id: string;
  sourceBrain: SourceBrain;
  hypothesis: string;
  method: string;
  result: Record<string, any>;
  conclusion: string;
  applied: boolean;
  timestamp: number;
}

export interface InsightMemory {
  id: string;
  type: 'pattern' | 'anomaly' | 'trend' | 'correlation';
  description: string;
  confidence: number;          // 0-1
  sources: string[];           // brain IDs
  evidence: Record<string, any>;
  timestamp: number;
}

export interface EvolutionSummary {
  brain: SourceBrain;
  period: { from: number; to: number };
  modelEvolution: {
    versions: number;
    improvements: number;
    avgImpact: number;
  };
  decisionQuality: {
    total: number;
    successRate: number;
    avgImpact: number;
  };
  experiments: {
    total: number;
    applied: number;
  };
  insights: number;
}

// ============= Memory Hub =============

export class MemoryHub extends EventEmitter {
  private active: boolean = false;
  private modelMemories: Map<string, ModelMemory> = new Map();
  private decisionMemories: Map<string, DecisionMemory> = new Map();
  private experimentMemories: Map<string, ExperimentMemory> = new Map();
  private insightMemories: Map<string, InsightMemory> = new Map();
  private maxHistorySize: number = 10000; // per type

  constructor() {
    super();
    console.log('[MemoryHub] Initialized (from absolute zero)');
  }

  // ============= Activation =============

  activate(): void {
    if (this.active) {
      console.log('[MemoryHub] Already active');
      return;
    }

    this.active = true;
    this.emit('activated');
    console.log('🧠 Memory Hub activated - Historical learning enabled');
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.emit('deactivated');
    console.log('[MemoryHub] Deactivated');
  }

  // ============= Model Memory =============

  recordModelUpdate(memory: Omit<ModelMemory, 'id' | 'timestamp'>): ModelMemory {
    if (!this.active) {
      throw new Error('Memory Hub is not active');
    }

    const id = `model-${Date.now()}-${this.randomId()}`;
    
    const modelMemory: ModelMemory = {
      id,
      ...memory,
      timestamp: Date.now()
    };

    this.modelMemories.set(id, modelMemory);
    this.enforceLimit(this.modelMemories);
    
    this.emit('model-recorded', { memory: modelMemory });
    console.log(`[MemoryHub] Model recorded: ${memory.sourceBrain} → ${memory.modelVersion} (${memory.impact > 0 ? '+' : ''}${(memory.impact * 100).toFixed(1)}%)`);
    
    return modelMemory;
  }

  getModelHistory(filter?: { 
    sourceBrain?: SourceBrain; 
    modelType?: string; 
    from?: number; 
    to?: number;
    limit?: number;
  }): ModelMemory[] {
    let memories = Array.from(this.modelMemories.values());

    if (filter?.sourceBrain) {
      memories = memories.filter(m => m.sourceBrain === filter.sourceBrain);
    }
    if (filter?.modelType) {
      memories = memories.filter(m => m.modelType === filter.modelType);
    }
    if (filter?.from !== undefined) {
      memories = memories.filter(m => m.timestamp >= filter.from!);
    }
    if (filter?.to !== undefined) {
      memories = memories.filter(m => m.timestamp <= filter.to!);
    }

    // Sort by timestamp descending
    memories.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      memories = memories.slice(0, filter.limit);
    }

    return memories;
  }

  // ============= Decision Memory =============

  recordDecision(memory: Omit<DecisionMemory, 'id' | 'timestamp'>): DecisionMemory {
    if (!this.active) {
      throw new Error('Memory Hub is not active');
    }

    const id = `decision-${Date.now()}-${this.randomId()}`;
    
    const decisionMemory: DecisionMemory = {
      id,
      ...memory,
      timestamp: Date.now()
    };

    this.decisionMemories.set(id, decisionMemory);
    this.enforceLimit(this.decisionMemories);
    
    this.emit('decision-recorded', { memory: decisionMemory });
    console.log(`[MemoryHub] Decision recorded: ${memory.sourceBrain} → ${memory.decisionType} (${memory.outcome})`);
    
    return decisionMemory;
  }

  getDecisionHistory(filter?: { 
    sourceBrain?: SourceBrain; 
    decisionType?: string; 
    outcome?: string;
    from?: number; 
    to?: number;
    limit?: number;
  }): DecisionMemory[] {
    let memories = Array.from(this.decisionMemories.values());

    if (filter?.sourceBrain) {
      memories = memories.filter(m => m.sourceBrain === filter.sourceBrain);
    }
    if (filter?.decisionType) {
      memories = memories.filter(m => m.decisionType === filter.decisionType);
    }
    if (filter?.outcome) {
      memories = memories.filter(m => m.outcome === filter.outcome);
    }
    if (filter?.from !== undefined) {
      memories = memories.filter(m => m.timestamp >= filter.from!);
    }
    if (filter?.to !== undefined) {
      memories = memories.filter(m => m.timestamp <= filter.to!);
    }

    memories.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      memories = memories.slice(0, filter.limit);
    }

    return memories;
  }

  // ============= Experiment Memory =============

  recordExperiment(memory: Omit<ExperimentMemory, 'id' | 'timestamp'>): ExperimentMemory {
    if (!this.active) {
      throw new Error('Memory Hub is not active');
    }

    const id = `experiment-${Date.now()}-${this.randomId()}`;
    
    const experimentMemory: ExperimentMemory = {
      id,
      ...memory,
      timestamp: Date.now()
    };

    this.experimentMemories.set(id, experimentMemory);
    this.enforceLimit(this.experimentMemories);
    
    this.emit('experiment-recorded', { memory: experimentMemory });
    console.log(`[MemoryHub] Experiment recorded: ${memory.sourceBrain} → ${memory.hypothesis.substring(0, 50)}...`);
    
    return experimentMemory;
  }

  // ============= Insight Memory =============

  recordInsight(memory: Omit<InsightMemory, 'id' | 'timestamp'>): InsightMemory {
    if (!this.active) {
      throw new Error('Memory Hub is not active');
    }

    const id = `insight-${Date.now()}-${this.randomId()}`;
    
    const insightMemory: InsightMemory = {
      id,
      ...memory,
      timestamp: Date.now()
    };

    this.insightMemories.set(id, insightMemory);
    this.enforceLimit(this.insightMemories);
    
    this.emit('insight-recorded', { memory: insightMemory });
    console.log(`[MemoryHub] Insight recorded: ${memory.type} → ${memory.description.substring(0, 60)}...`);
    
    return insightMemory;
  }

  getInsightHistory(filter?: { 
    type?: InsightMemory['type']; 
    sources?: string[];
    from?: number; 
    to?: number;
    limit?: number;
  }): InsightMemory[] {
    let memories = Array.from(this.insightMemories.values());

    if (filter?.type) {
      memories = memories.filter(m => m.type === filter.type);
    }
    if (filter?.sources) {
      memories = memories.filter(m => 
        m.sources.some(s => filter.sources!.includes(s))
      );
    }
    if (filter?.from !== undefined) {
      memories = memories.filter(m => m.timestamp >= filter.from!);
    }
    if (filter?.to !== undefined) {
      memories = memories.filter(m => m.timestamp <= filter.to!);
    }

    memories.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      memories = memories.slice(0, filter.limit);
    }

    return memories;
  }

  getAllInsights(): InsightMemory[] {
    return Array.from(this.insightMemories.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // ============= Evolution Analysis =============

  getEvolutionSummary(brain: SourceBrain, periodDays: number = 30): EvolutionSummary {
    const now = Date.now();
    const from = now - (periodDays * 24 * 60 * 60 * 1000);

    const models = this.getModelHistory({ sourceBrain: brain, from });
    const decisions = this.getDecisionHistory({ sourceBrain: brain, from });
    const experiments = Array.from(this.experimentMemories.values())
      .filter(e => e.sourceBrain === brain && e.timestamp >= from);
    const insights = Array.from(this.insightMemories.values())
      .filter(i => i.sources.includes(brain) && i.timestamp >= from);

    const successfulDecisions = decisions.filter(d => d.outcome === 'success');
    const improvements = models.filter(m => m.impact > 0);

    return {
      brain,
      period: { from, to: now },
      modelEvolution: {
        versions: models.length,
        improvements: improvements.length,
        avgImpact: models.length > 0 
          ? models.reduce((sum, m) => sum + m.impact, 0) / models.length 
          : 0
      },
      decisionQuality: {
        total: decisions.length,
        successRate: decisions.length > 0 ? successfulDecisions.length / decisions.length : 0,
        avgImpact: decisions.length > 0
          ? decisions.reduce((sum, d) => sum + d.impact, 0) / decisions.length
          : 0
      },
      experiments: {
        total: experiments.length,
        applied: experiments.filter(e => e.applied).length
      },
      insights: insights.length
    };
  }

  // ============= Analytics =============

  getAnalytics(): {
    totalMemories: number;
    byType: {
      models: number;
      decisions: number;
      experiments: number;
      insights: number;
    };
    topBrains: { brain: SourceBrain; memories: number }[];
    recentActivity: number; // last 24h
  } {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);

    // Count by brain
    const brainCounts: Map<SourceBrain, number> = new Map();
    
    for (const m of Array.from(this.modelMemories.values())) {
      brainCounts.set(m.sourceBrain, (brainCounts.get(m.sourceBrain) || 0) + 1);
    }
    for (const d of Array.from(this.decisionMemories.values())) {
      brainCounts.set(d.sourceBrain, (brainCounts.get(d.sourceBrain) || 0) + 1);
    }
    for (const e of Array.from(this.experimentMemories.values())) {
      brainCounts.set(e.sourceBrain, (brainCounts.get(e.sourceBrain) || 0) + 1);
    }

    const topBrains = Array.from(brainCounts.entries())
      .map(([brain, memories]) => ({ brain, memories }))
      .sort((a, b) => b.memories - a.memories)
      .slice(0, 5);

    const recentActivity = 
      Array.from(this.modelMemories.values()).filter(m => m.timestamp > last24h).length +
      Array.from(this.decisionMemories.values()).filter(d => d.timestamp > last24h).length +
      Array.from(this.experimentMemories.values()).filter(e => e.timestamp > last24h).length +
      Array.from(this.insightMemories.values()).filter(i => i.timestamp > last24h).length;

    return {
      totalMemories: this.modelMemories.size + this.decisionMemories.size + 
                     this.experimentMemories.size + this.insightMemories.size,
      byType: {
        models: this.modelMemories.size,
        decisions: this.decisionMemories.size,
        experiments: this.experimentMemories.size,
        insights: this.insightMemories.size
      },
      topBrains,
      recentActivity
    };
  }

  // ============= Queries =============

  getStatus(): { 
    active: boolean; 
    totalMemories: number; 
    brains: SourceBrain[];
  } {
    const brains = new Set<SourceBrain>();
    
    for (const m of Array.from(this.modelMemories.values())) brains.add(m.sourceBrain);
    for (const d of Array.from(this.decisionMemories.values())) brains.add(d.sourceBrain);
    for (const e of Array.from(this.experimentMemories.values())) brains.add(e.sourceBrain);

    return {
      active: this.active,
      totalMemories: this.modelMemories.size + this.decisionMemories.size + 
                     this.experimentMemories.size + this.insightMemories.size,
      brains: Array.from(brains)
    };
  }

  // ============= Utilities =============

  private enforceLimit<T>(map: Map<string, T>): void {
    if (map.size > this.maxHistorySize) {
      // Remove oldest entries
      const entries = Array.from(map.entries());
      const toRemove = entries.length - this.maxHistorySize;
      
      for (let i = 0; i < toRemove; i++) {
        map.delete(entries[i][0]);
      }
    }
  }

  private randomId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  clearMemories(type?: MemoryType): void {
    if (!type) {
      this.modelMemories.clear();
      this.decisionMemories.clear();
      this.experimentMemories.clear();
      this.insightMemories.clear();
      this.emit('all-memories-cleared');
      console.log('[MemoryHub] All memories cleared');
    } else {
      switch (type) {
        case 'model':
          this.modelMemories.clear();
          break;
        case 'decision':
          this.decisionMemories.clear();
          break;
        case 'experiment':
          this.experimentMemories.clear();
          break;
        case 'insight':
          this.insightMemories.clear();
          break;
      }
      this.emit('memories-cleared', { type });
      console.log(`[MemoryHub] ${type} memories cleared`);
    }
  }
}

// Export singleton instance
export const memoryHub = new MemoryHub();
