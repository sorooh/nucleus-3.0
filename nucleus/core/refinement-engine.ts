/**
 * Refinement Engine - Self-Learning & Rule Generation System
 * Built from absolute zero for Surooh Empire Nucleus
 * 
 * Purpose: Analyze patterns, generate rules, learn from outcomes
 */

import { EventEmitter } from 'events';

// ============= Types =============

type PatternType = 'decision' | 'action' | 'outcome' | 'error';
type RuleConfidence = 'low' | 'medium' | 'high' | 'verified';
type LearningOutcome = 'success' | 'failure' | 'neutral';

interface Pattern {
  id: string;
  type: PatternType;
  context: Record<string, any>;
  frequency: number;
  lastSeen: number;
  confidence: number;
}

interface GeneratedRule {
  id: string;
  patternKey: string;  // Added: unique pattern identifier
  name: string;
  description: string;
  condition: string;
  action: string;
  confidence: RuleConfidence;
  successRate: number;
  applications: number;
  generated: number;
  lastApplied?: number;
}

interface LearningCycle {
  id: string;
  input: Record<string, any>;
  decision: string;
  outcome: LearningOutcome;
  feedback: string;
  patternsDetected: string[];
  rulesApplied: string[];
  timestamp: number;
}

interface RefinementStatus {
  active: boolean;
  patternsDetected: number;
  rulesGenerated: number;
  learningCycles: number;
  avgConfidence: number;
}

// ============= Refinement Engine Core =============

export class RefinementEngine extends EventEmitter {
  private active: boolean = false;
  private patterns: Map<string, Pattern> = new Map();
  private generatedRules: Map<string, GeneratedRule> = new Map();
  private learningCycles: LearningCycle[] = [];
  private analysisInterval?: NodeJS.Timeout;

  constructor() {
    super();
    console.log('[RefinementEngine] Initialized (from absolute zero)');
  }

  // ============= Activation =============

  async activate(): Promise<void> {
    if (this.active) {
      console.log('[RefinementEngine] Already active');
      return;
    }

    this.active = true;
    this.startAnalysis();
    
    this.emit('activated', { timestamp: Date.now() });
    console.log('[RefinementEngine] Activated - Learning started');
  }

  async deactivate(): Promise<void> {
    if (!this.active) return;

    this.active = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.emit('deactivated', { timestamp: Date.now() });
    console.log('[RefinementEngine] Deactivated - Learning paused');
  }

  // ============= Pattern Analysis =============

  analyzePattern(
    type: PatternType,
    context: Record<string, any>
  ): Pattern | null {
    if (!this.active) return null;

    const patternKey = this.generatePatternKey(type, context);
    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = Date.now();
      existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
      
      this.emit('pattern-reinforced', { pattern: existing });

      // Auto-generate rule if pattern is now strong enough
      if (existing.frequency >= 5 && existing.confidence >= 0.5) {
        const existingRule = Array.from(this.generatedRules.values()).find(
          r => r.patternKey === patternKey
        );
        if (!existingRule) {
          this.generateRuleFromPattern(existing, patternKey);
        }
      }
      
      return existing;
    }

    const newPattern: Pattern = {
      id: `pattern-${Date.now()}-${this.randomId()}`,
      type,
      context,
      frequency: 1,
      lastSeen: Date.now(),
      confidence: 0.1
    };

    this.patterns.set(patternKey, newPattern);
    this.emit('pattern-detected', { pattern: newPattern });

    // Auto-generate rule if pattern is strong
    if (newPattern.frequency >= 5 && newPattern.confidence >= 0.5) {
      this.generateRuleFromPattern(newPattern, patternKey);
    }

    return newPattern;
  }

  private generatePatternKey(type: PatternType, context: Record<string, any>): string {
    const sortedKeys = Object.keys(context).sort();
    const keyParts = sortedKeys.map(k => `${k}:${context[k]}`);
    return `${type}|${keyParts.join('|')}`;
  }

  // ============= Rule Generation =============

  generateRuleFromPattern(pattern: Pattern, patternKey: string): GeneratedRule | null {
    if (!this.active) return null;

    const ruleName = this.generateRuleName(pattern);
    const ruleId = `rule-${Date.now()}-${this.randomId()}`;

    const rule: GeneratedRule = {
      id: ruleId,
      patternKey: patternKey,
      name: ruleName,
      description: `Auto-generated from ${pattern.type} pattern (freq: ${pattern.frequency})`,
      condition: this.extractCondition(pattern),
      action: this.extractAction(pattern),
      confidence: this.mapConfidence(pattern.confidence),
      successRate: 0,
      applications: 0,
      generated: Date.now()
    };

    this.generatedRules.set(ruleId, rule);
    this.emit('rule-generated', { rule });

    console.log(`[RefinementEngine] Generated rule: ${ruleName}`);
    return rule;
  }

  private generateRuleName(pattern: Pattern): string {
    const contextKeys = Object.keys(pattern.context).slice(0, 2);
    const descriptor = contextKeys.join('_') || 'unknown';
    return `auto_${pattern.type}_${descriptor}`;
  }

  private extractCondition(pattern: Pattern): string {
    const conditions = Object.entries(pattern.context)
      .map(([k, v]) => `${k} == "${v}"`)
      .join(' AND ');
    return conditions || 'always';
  }

  private extractAction(pattern: Pattern): string {
    if (pattern.type === 'decision') return 'apply_learned_decision';
    if (pattern.type === 'action') return 'execute_learned_action';
    return 'respond_with_pattern';
  }

  private mapConfidence(confidence: number): RuleConfidence {
    if (confidence >= 0.9) return 'verified';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  }

  // ============= Learning Cycles =============

  recordLearningCycle(
    input: Record<string, any>,
    decision: string,
    outcome: LearningOutcome,
    feedback: string
  ): LearningCycle {
    const detectedPatterns = this.detectPatternsInInput(input);
    const appliedRules = this.getAppliedRules(decision);

    const cycle: LearningCycle = {
      id: `cycle-${Date.now()}-${this.randomId()}`,
      input,
      decision,
      outcome,
      feedback,
      patternsDetected: detectedPatterns,
      rulesApplied: appliedRules,
      timestamp: Date.now()
    };

    this.learningCycles.push(cycle);
    this.updateRulesFromOutcome(cycle);
    this.emit('learning-cycle', { cycle });

    console.log(`[RefinementEngine] Learning cycle: ${outcome}`);
    return cycle;
  }

  private detectPatternsInInput(input: Record<string, any>): string[] {
    const detected: string[] = [];
    
    this.patterns.forEach(pattern => {
      const matches = Object.entries(pattern.context).every(
        ([k, v]) => input[k] === v
      );
      if (matches) detected.push(pattern.id);
    });

    return detected;
  }

  private getAppliedRules(decision: string): string[] {
    const applied: string[] = [];
    
    this.generatedRules.forEach(rule => {
      if (decision.includes(rule.action) || decision.includes(rule.name)) {
        applied.push(rule.id);
      }
    });

    return applied;
  }

  private updateRulesFromOutcome(cycle: LearningCycle): void {
    cycle.rulesApplied.forEach(ruleId => {
      const rule = this.generatedRules.get(ruleId);
      if (!rule) return;

      rule.applications++;
      rule.lastApplied = Date.now();

      if (cycle.outcome === 'success') {
        rule.successRate = (rule.successRate * (rule.applications - 1) + 100) / rule.applications;
        
        // Upgrade confidence
        if (rule.successRate >= 90 && rule.confidence === 'high') {
          rule.confidence = 'verified';
        } else if (rule.successRate >= 70 && rule.confidence === 'medium') {
          rule.confidence = 'high';
        }
      } else if (cycle.outcome === 'failure') {
        rule.successRate = (rule.successRate * (rule.applications - 1)) / rule.applications;
        
        // Downgrade confidence
        if (rule.successRate < 40) {
          rule.confidence = 'low';
        }
      }
    });
  }

  // ============= Background Analysis =============

  private startAnalysis(): void {
    // Run analysis every 5 minutes
    this.analysisInterval = setInterval(() => {
      this.analyzeLearnedPatterns();
    }, 5 * 60 * 1000);
  }

  private analyzeLearnedPatterns(): void {
    if (!this.active) return;

    const weakPatterns = Array.from(this.patterns.values()).filter(
      p => p.confidence < 0.3 && p.frequency < 3
    );

    // Clean up weak patterns older than 24h
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    weakPatterns.forEach(p => {
      if (p.lastSeen < oneDayAgo) {
        this.patterns.delete(this.generatePatternKey(p.type, p.context));
      }
    });

    console.log(`[RefinementEngine] Analysis complete - ${this.patterns.size} patterns`);
  }

  // ============= Query & Status =============

  getPatterns(type?: PatternType): Pattern[] {
    const patterns = Array.from(this.patterns.values());
    return type ? patterns.filter(p => p.type === type) : patterns;
  }

  getRules(minConfidence?: RuleConfidence): GeneratedRule[] {
    const rules = Array.from(this.generatedRules.values());
    
    if (!minConfidence) return rules;

    const confidenceLevels = { low: 0, medium: 1, high: 2, verified: 3 };
    const minLevel = confidenceLevels[minConfidence];

    return rules.filter(r => confidenceLevels[r.confidence] >= minLevel);
  }

  getLearningCycles(limit: number = 50): LearningCycle[] {
    return this.learningCycles.slice(-limit);
  }

  getStatus(): RefinementStatus {
    const rules = Array.from(this.generatedRules.values());
    const avgConfidence = rules.length > 0
      ? rules.reduce((sum, r) => sum + r.successRate, 0) / rules.length
      : 0;

    return {
      active: this.active,
      patternsDetected: this.patterns.size,
      rulesGenerated: this.generatedRules.size,
      learningCycles: this.learningCycles.length,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }

  getAnalytics() {
    const rules = Array.from(this.generatedRules.values());
    const patterns = Array.from(this.patterns.values());
    const cycles = this.learningCycles.slice(-100);

    const rulesByConfidence = {
      verified: rules.filter(r => r.confidence === 'verified').length,
      high: rules.filter(r => r.confidence === 'high').length,
      medium: rules.filter(r => r.confidence === 'medium').length,
      low: rules.filter(r => r.confidence === 'low').length
    };

    const patternsByType = {
      decision: patterns.filter(p => p.type === 'decision').length,
      action: patterns.filter(p => p.type === 'action').length,
      outcome: patterns.filter(p => p.type === 'outcome').length,
      error: patterns.filter(p => p.type === 'error').length
    };

    const outcomeStats = {
      success: cycles.filter(c => c.outcome === 'success').length,
      failure: cycles.filter(c => c.outcome === 'failure').length,
      neutral: cycles.filter(c => c.outcome === 'neutral').length
    };

    return {
      timeWindow: '24h',
      totalPatterns: this.patterns.size,
      totalRules: this.generatedRules.size,
      totalCycles: this.learningCycles.length,
      rulesByConfidence,
      patternsByType,
      outcomeStats,
      avgRuleSuccessRate: rules.length > 0
        ? Math.round((rules.reduce((sum, r) => sum + r.successRate, 0) / rules.length) * 100) / 100
        : 0
    };
  }

  // ============= Utilities =============

  private randomId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}

// ============= Singleton Export =============

export const refinementEngine = new RefinementEngine();
