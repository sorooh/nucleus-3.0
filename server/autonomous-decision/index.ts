/**
 * PHASE 10.9 → 11.0: AUTONOMOUS DECISION ENGINE
 * Full autonomous decision-making and self-evolution
 * 
 * Features:
 * - Autonomous strategic decision-making
 * - Self-awareness and self-modification capabilities
 * - Multi-criteria decision analysis
 * - Learning from decision outcomes
 * - Ethical decision framework
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { 
  autonomousDecisions,
  decisionCriteria,
  decisionOutcomes,
  autonomySettings
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

interface DecisionContext {
  situation: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  impact: 'minor' | 'moderate' | 'significant' | 'major';
  options: DecisionOption[];
  constraints?: any;
}

interface DecisionOption {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  estimatedCost?: number;
  estimatedTime?: string;
  riskLevel?: string;
}

class AutonomousDecisionEngine extends EventEmitter {
  private isActive: boolean = false;
  private autonomyLevel: number = 70; // 0-100
  private decisionHistory: Map<string, any> = new Map();
  private learningEnabled: boolean = true;

  constructor() {
    super();
    console.log('[Autonomous Decision] 🧠 Initializing Autonomous Decision Engine...');
  }

  async start() {
    this.isActive = true;
    await this.loadAutonomySettings();
    console.log('[Autonomous Decision] ✅ Engine activated - Full autonomy enabled');
    this.emit('engine:started');
  }

  async stop() {
    this.isActive = false;
    console.log('[Autonomous Decision] ⏸️ Engine stopped');
    this.emit('engine:stopped');
  }

  getStatus() {
    return {
      isActive: this.isActive,
      autonomyLevel: this.autonomyLevel,
      totalDecisions: this.decisionHistory.size,
      learningEnabled: this.learningEnabled,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // AUTONOMOUS DECISION MAKING
  // ============================================

  /**
   * Make an autonomous decision
   */
  async makeDecision(context: DecisionContext): Promise<any> {
    console.log(`[Autonomous Decision] 🎯 Analyzing situation: ${context.situation}`);

    // Check if autonomous decision is allowed
    if (!this.canMakeAutonomousDecision(context)) {
      console.log('[Autonomous Decision] ⚠️ Autonomy level insufficient, escalating to human');
      return await this.escalateToHuman(context);
    }

    // Analyze all options
    const analysis = await this.analyzeOptions(context);

    // Apply decision criteria
    const scored = await this.scoreOptions(context, analysis);

    // Select best option
    const selected = this.selectBestOption(scored);

    // Record decision
    const [decision] = await db.insert(autonomousDecisions).values({
      situation: context.situation,
      urgency: context.urgency,
      impact: context.impact,
      optionsAnalyzed: context.options.length,
      selectedOption: selected.option.id,
      decisionRationale: selected.rationale,
      confidenceScore: selected.confidence,
      autonomyLevel: this.autonomyLevel,
      requiresApproval: selected.requiresApproval ? 1 : 0,
      status: selected.requiresApproval ? 'pending_approval' : 'approved',
    }).returning();

    // Store criteria used
    await this.storeCriteria(decision.id, selected.criteria);

    this.decisionHistory.set(decision.id, decision);
    
    console.log(`[Autonomous Decision] ✅ Decision made: ${selected.option.description} (${selected.confidence}% confidence)`);
    this.emit('decision:made', decision);

    return decision;
  }

  /**
   * Check if engine can make autonomous decision
   */
  private canMakeAutonomousDecision(context: DecisionContext): boolean {
    // Critical decisions need higher autonomy
    if (context.urgency === 'critical' && this.autonomyLevel < 90) {
      return false;
    }

    // Major impact decisions need high autonomy
    if (context.impact === 'major' && this.autonomyLevel < 80) {
      return false;
    }

    // Check if within autonomy bounds
    return this.autonomyLevel >= 60;
  }

  /**
   * Escalate decision to human
   */
  private async escalateToHuman(context: DecisionContext): Promise<any> {
    console.log('[Autonomous Decision] 👤 Escalating to human decision maker');

    const [decision] = await db.insert(autonomousDecisions).values({
      situation: context.situation,
      urgency: context.urgency,
      impact: context.impact,
      optionsAnalyzed: context.options.length,
      decisionRationale: 'Escalated: Autonomy level insufficient',
      confidenceScore: 0,
      autonomyLevel: this.autonomyLevel,
      requiresApproval: 1,
      status: 'escalated',
    }).returning();

    this.emit('decision:escalated', decision);
    return decision;
  }

  // ============================================
  // OPTION ANALYSIS
  // ============================================

  /**
   * Analyze all decision options
   */
  private async analyzeOptions(context: DecisionContext): Promise<any[]> {
    const analyzed = [];

    for (const option of context.options) {
      const analysis = {
        option,
        prosScore: option.pros.length * 10,
        consScore: option.cons.length * -10,
        riskScore: this.calculateRiskScore(option.riskLevel || 'medium'),
        feasibilityScore: this.calculateFeasibilityScore(option),
        alignmentScore: await this.calculateAlignmentScore(option, context),
      };

      analyzed.push(analysis);
    }

    return analyzed;
  }

  /**
   * Score options based on criteria
   */
  private async scoreOptions(context: DecisionContext, analyzed: any[]): Promise<any[]> {
    const criteria = this.getDecisionCriteria(context);

    const scored = analyzed.map(analysis => {
      let totalScore = 0;
      const criteriaScores: any = {};

      for (const criterion of criteria) {
        let score = 0;

        switch (criterion.name) {
          case 'risk_tolerance':
            score = analysis.riskScore * criterion.weight;
            break;
          case 'feasibility':
            score = analysis.feasibilityScore * criterion.weight;
            break;
          case 'strategic_alignment':
            score = analysis.alignmentScore * criterion.weight;
            break;
          case 'cost_effectiveness':
            score = this.calculateCostScore(analysis.option) * criterion.weight;
            break;
          case 'time_sensitivity':
            score = this.calculateTimeScore(analysis.option, context.urgency) * criterion.weight;
            break;
        }

        criteriaScores[criterion.name] = score;
        totalScore += score;
      }

      return {
        option: analysis.option,
        totalScore,
        criteriaScores,
        analysis,
      };
    });

    return scored.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Select best option from scored options
   */
  private selectBestOption(scored: any[]): any {
    const best = scored[0];
    const confidence = this.calculateConfidence(best, scored);

    // Check if decision requires approval
    const requiresApproval = 
      best.totalScore < 70 || 
      confidence < 75 ||
      this.autonomyLevel < 80;

    const rationale = this.buildRationale(best);

    return {
      option: best.option,
      confidence,
      rationale,
      requiresApproval,
      criteria: best.criteriaScores,
    };
  }

  // ============================================
  // SCORING METHODS
  // ============================================

  /**
   * Calculate risk score
   */
  private calculateRiskScore(riskLevel: string): number {
    const scores: Record<string, number> = {
      'low': 90,
      'medium': 70,
      'high': 40,
      'critical': 20,
    };
    return scores[riskLevel] || 50;
  }

  /**
   * Calculate feasibility score
   */
  private calculateFeasibilityScore(option: DecisionOption): number {
    let score = 70; // Base score

    // Factor in cost
    if (option.estimatedCost !== undefined) {
      if (option.estimatedCost < 1000) score += 20;
      else if (option.estimatedCost < 5000) score += 10;
      else if (option.estimatedCost > 10000) score -= 20;
    }

    // Factor in time
    if (option.estimatedTime) {
      if (option.estimatedTime.includes('hour')) score += 15;
      else if (option.estimatedTime.includes('day')) score += 5;
      else if (option.estimatedTime.includes('week')) score -= 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate strategic alignment score
   */
  private async calculateAlignmentScore(option: DecisionOption, context: DecisionContext): Promise<number> {
    // Check alignment with system goals
    const keywords = ['optimize', 'improve', 'enhance', 'secure', 'scale'];
    const description = option.description.toLowerCase();
    
    let score = 60; // Base score
    
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        score += 8;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Calculate cost score
   */
  private calculateCostScore(option: DecisionOption): number {
    if (!option.estimatedCost) return 70;

    if (option.estimatedCost === 0) return 100;
    if (option.estimatedCost < 1000) return 90;
    if (option.estimatedCost < 5000) return 70;
    if (option.estimatedCost < 10000) return 50;
    return 30;
  }

  /**
   * Calculate time score
   */
  private calculateTimeScore(option: DecisionOption, urgency: string): number {
    if (!option.estimatedTime) return 60;

    const time = option.estimatedTime.toLowerCase();
    
    if (urgency === 'critical') {
      if (time.includes('minute') || time.includes('hour')) return 100;
      if (time.includes('day')) return 50;
      return 20;
    }

    if (urgency === 'high') {
      if (time.includes('hour')) return 90;
      if (time.includes('day')) return 70;
      return 40;
    }

    return 60; // Normal urgency
  }

  /**
   * Calculate decision confidence
   */
  private calculateConfidence(best: any, all: any[]): number {
    if (all.length === 1) return 60; // Low confidence if no alternatives

    const secondBest = all[1];
    const scoreDiff = best.totalScore - secondBest.totalScore;

    // Higher difference = higher confidence
    let confidence = 50 + (scoreDiff / 2);
    confidence = Math.min(100, Math.max(30, confidence));

    return Math.round(confidence);
  }

  // ============================================
  // DECISION CRITERIA
  // ============================================

  /**
   * Get decision criteria based on context
   */
  private getDecisionCriteria(context: DecisionContext) {
    const baseCriteria = [
      { name: 'risk_tolerance', weight: 0.25 },
      { name: 'feasibility', weight: 0.20 },
      { name: 'strategic_alignment', weight: 0.20 },
      { name: 'cost_effectiveness', weight: 0.15 },
      { name: 'time_sensitivity', weight: 0.20 },
    ];

    // Adjust weights based on context
    if (context.urgency === 'critical') {
      const timeIndex = baseCriteria.findIndex(c => c.name === 'time_sensitivity');
      baseCriteria[timeIndex].weight = 0.35;
    }

    if (context.impact === 'major') {
      const riskIndex = baseCriteria.findIndex(c => c.name === 'risk_tolerance');
      baseCriteria[riskIndex].weight = 0.35;
    }

    return baseCriteria;
  }

  /**
   * Store decision criteria
   */
  private async storeCriteria(decisionId: string, criteria: any): Promise<void> {
    for (const [name, score] of Object.entries(criteria)) {
      await db.insert(decisionCriteria).values({
        decisionId,
        criterionName: name,
        criterionWeight: 0, // Will be set from config
        score: score as number,
      });
    }
  }

  // ============================================
  // RATIONALE BUILDING
  // ============================================

  /**
   * Build decision rationale
   */
  private buildRationale(scoredOption: any): string {
    const parts = [
      `Selected: ${scoredOption.option.description}`,
      `Total Score: ${scoredOption.totalScore.toFixed(1)}/100`,
      '',
      'Key Factors:',
    ];

    // Add top criteria
    const sorted = Object.entries(scoredOption.criteriaScores)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3);

    for (const [criterion, score] of sorted) {
      parts.push(`- ${criterion.replace(/_/g, ' ')}: ${(score as number).toFixed(1)}`);
    }

    // Add pros
    if (scoredOption.option.pros.length > 0) {
      parts.push('', 'Advantages:');
      scoredOption.option.pros.forEach((pro: string) => {
        parts.push(`+ ${pro}`);
      });
    }

    // Add significant cons
    if (scoredOption.option.cons.length > 0) {
      parts.push('', 'Considerations:');
      scoredOption.option.cons.forEach((con: string) => {
        parts.push(`- ${con}`);
      });
    }

    return parts.join('\n');
  }

  // ============================================
  // OUTCOME TRACKING
  // ============================================

  /**
   * Record decision outcome
   */
  async recordOutcome(decisionId: string, data: {
    success: boolean;
    actualResult: string;
    deviationFromExpected?: string;
    lessonsLearned?: string[];
    impactRealized?: string;
  }): Promise<void> {
    console.log(`[Autonomous Decision] 📊 Recording outcome for decision ${decisionId}`);

    await db.insert(decisionOutcomes).values({
      decisionId,
      success: data.success ? 1 : 0,
      actualResult: data.actualResult,
      deviationFromExpected: data.deviationFromExpected,
      lessonsLearned: data.lessonsLearned,
      impactRealized: data.impactRealized,
    });

    // Learn from outcome if enabled
    if (this.learningEnabled) {
      await this.learnFromOutcome(decisionId, data);
    }

    this.emit('outcome:recorded', { decisionId, success: data.success });
  }

  /**
   * Learn from decision outcome
   */
  private async learnFromOutcome(decisionId: string, outcome: any): Promise<void> {
    console.log('[Autonomous Decision] 🧠 Learning from outcome...');

    // Adjust autonomy level based on success
    if (outcome.success) {
      this.autonomyLevel = Math.min(100, this.autonomyLevel + 1);
    } else {
      this.autonomyLevel = Math.max(50, this.autonomyLevel - 2);
    }

    // Save updated autonomy level
    await this.saveAutonomySettings();

    this.emit('learning:updated', { autonomyLevel: this.autonomyLevel });
  }

  // ============================================
  // AUTONOMY MANAGEMENT
  // ============================================

  /**
   * Set autonomy level
   */
  async setAutonomyLevel(level: number): Promise<void> {
    this.autonomyLevel = Math.max(0, Math.min(100, level));
    await this.saveAutonomySettings();
    console.log(`[Autonomous Decision] ⚙️ Autonomy level set to: ${this.autonomyLevel}%`);
    this.emit('autonomy:updated', { level: this.autonomyLevel });
  }

  /**
   * Load autonomy settings
   */
  private async loadAutonomySettings(): Promise<void> {
    const settings = await db.query.autonomySettings.findFirst({
      where: eq(autonomySettings.settingKey, 'current_autonomy'),
    });

    if (settings) {
      this.autonomyLevel = (settings.settingValue as any).level || 70;
      this.learningEnabled = (settings.settingValue as any).learningEnabled !== false;
    }
  }

  /**
   * Save autonomy settings
   */
  private async saveAutonomySettings(): Promise<void> {
    const existing = await db.query.autonomySettings.findFirst({
      where: eq(autonomySettings.settingKey, 'current_autonomy'),
    });

    const value = {
      level: this.autonomyLevel,
      learningEnabled: this.learningEnabled,
      lastUpdated: new Date().toISOString(),
    };

    if (existing) {
      await db.update(autonomySettings)
        .set({ settingValue: value })
        .where(eq(autonomySettings.id, existing.id));
    } else {
      await db.insert(autonomySettings).values({
        settingKey: 'current_autonomy',
        settingValue: value,
        description: 'Current autonomy level and learning settings',
      });
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get decision history
   */
  async getDecisionHistory(limit: number = 50) {
    return await db.query.autonomousDecisions.findMany({
      orderBy: [desc(autonomousDecisions.madeAt)],
      limit,
    });
  }

  /**
   * Get decision statistics
   */
  async getDecisionStatistics() {
    const all = await this.getDecisionHistory(1000);
    
    const approved = all.filter(d => d.status === 'approved').length;
    const escalated = all.filter(d => d.status === 'escalated').length;
    const pendingApproval = all.filter(d => d.status === 'pending_approval').length;

    const avgConfidence = all.length > 0
      ? all.reduce((sum, d) => sum + (d.confidenceScore || 0), 0) / all.length
      : 0;

    return {
      totalDecisions: all.length,
      approved,
      escalated,
      pendingApproval,
      autonomyLevel: this.autonomyLevel,
      averageConfidence: Math.round(avgConfidence),
      learningEnabled: this.learningEnabled,
    };
  }
}

export const autonomousDecisionEngine = new AutonomousDecisionEngine();
export default autonomousDecisionEngine;
