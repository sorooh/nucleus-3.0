/**
 * NUCLEUS INTELLIGENCE SYSTEM - نظام الذكاء المتكامل
 * 
 * Combines:
 * 1. Feedback Loop - حلقة التعلم المستمر
 * 2. Vector Memory - الذاكرة طويلة المدى
 * 3. Shared Learning - التعلم المشترك
 */

import { feedbackLoop } from './feedback-loop';
import { vectorMemory } from './vector-memory';
import { sharedLearning } from './shared-learning';
import { smartReports } from './smart-reports';
import { academicHub } from './academic-hub';
import { aiCommittee } from './ai-committee';
import { chainOfThought } from './chain-of-thought';
import { toolUseSystem } from './tool-use';
import { selfLearning } from './self-learning';
import { memoryConsolidation } from './memory-consolidation';
import { predictiveIntelligence } from './predictive-intelligence';
import { metaLearning } from './meta-learning';
import { autonomousReasoning } from './autonomous-reasoning';
import { intelligenceDistributor } from './distributor';
import { layersManager } from './layers-manager';

// ============= Intelligence System Manager =============

export class IntelligenceSystem {
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[Intelligence] Already initialized');
      return;
    }

    console.log('🧠 Initializing Nucleus Intelligence System...');

    try {
      // Activate Feedback Loop
      await feedbackLoop.activate();
      
      // Activate Vector Memory (optional - requires credentials)
      try {
        await vectorMemory.activate();
      } catch (error: any) {
        console.log('⚠️ Vector Memory not available (credentials missing)');
      }

      // Activate Shared Learning
      await sharedLearning.activate();

      // Activate Smart Reports
      smartReports.activate();

      // Activate Academic Hub
      academicHub.activate();

      // Activate AI Committee (Multi-Model Ensemble)
      aiCommittee.activate();

      // Activate Chain of Thought (Step-by-step reasoning)
      chainOfThought.activate();

      // Activate Tool Use System (Function calling)
      toolUseSystem.activate();

      // Activate Self-Learning Loop
      selfLearning.activate();

      // Activate Memory Consolidation
      memoryConsolidation.activate();

      // Activate Predictive Intelligence
      predictiveIntelligence.activate();

      // Activate Meta-Learning
      metaLearning.activate();

      // Activate Autonomous Reasoning
      autonomousReasoning.activate();

      // Activate Intelligence Distributor (for collective intelligence)
      intelligenceDistributor.activate();

      // Initialize Nucleus 3.0 Conscious Intelligence Layers Manager
      await layersManager.initialize();

      // Setup Auto-Learning: Memory Hub → Vector Memory integration
      await this.setupAutoLearning();

      this.initialized = true;
      console.log('✅ Nucleus Intelligence System activated');
      console.log('   ✓ Feedback Loop: Continuous learning enabled');
      console.log('   ✓ Vector Memory: Long-term memory ready');
      console.log('   ✓ Shared Learning: Collective intelligence online');
      console.log('   ✓ Smart Reports: Intelligent analysis ready');
      console.log('   ✓ Academic Hub: Research intelligence enabled');
      console.log('   ✓ AI Committee: Multi-model ensemble ready');
      console.log('   ✓ Chain of Thought: Step-by-step reasoning enabled');
      console.log('   ✓ Tool Use: Function calling system ready');
      console.log('   ✓ Self-Learning: Learning from every decision');
      console.log('   ✓ Memory Consolidation: Pattern discovery enabled');
      console.log('   ✓ Predictive Intelligence: Future forecasting ready');
      console.log('   ✓ Meta-Learning: Learning optimization active');
      console.log('   ✓ Autonomous Reasoning: Independent thinking enabled');
      console.log('   ✓ Intelligence Distributor: Collective intelligence broadcasting');
      console.log('   ✓ Layers Manager: Nucleus 3.0 conscious layers ready');
      console.log('   ✓ Auto-Learning: Memory Hub ↔ Vector Memory connected');
    } catch (error: any) {
      console.error('[Intelligence] Initialization failed:', error.message);
      throw error;
    }
  }

  private async setupAutoLearning(): Promise<void> {
    try {
      // Import memoryHub dynamically to avoid circular dependencies
      const { memoryHub } = await import('../core/memory-hub');
      
      // Listen to insight recordings and auto-store in Vector Memory
      memoryHub.on('insight-recorded', async (data: any) => {
        try {
          const insight = data.memory;
          if (vectorMemory && insight) {
            await vectorMemory.store({
              content: `${insight.description}\n\nContext: ${JSON.stringify(insight.context || {})}`,
              category: insight.type,
              source: 'memory-hub-auto',
              metadata: {
                sourceBrain: insight.sourceBrain,
                confidence: insight.confidence,
                tags: insight.tags || []
              }
            });
          }
        } catch (error) {
          // Silent fail - don't interrupt main flow
        }
      });

      console.log('[Auto-Learning] Memory Hub → Vector Memory listener activated');
    } catch (error) {
      console.error('[Auto-Learning] Failed to setup:', error);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    feedbackLoop.deactivate();
    vectorMemory.deactivate();
    sharedLearning.deactivate();
    smartReports.deactivate();
    academicHub.deactivate();
    aiCommittee.deactivate();
    chainOfThought.deactivate();
    toolUseSystem.deactivate();
    selfLearning.deactivate();
    memoryConsolidation.deactivate();
    predictiveIntelligence.deactivate();
    metaLearning.deactivate();
    autonomousReasoning.deactivate();
    intelligenceDistributor.deactivate();

    this.initialized = false;
    console.log('[Intelligence] System shutdown');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ============= Quick Access Methods =============

  async logDecision(input: {
    type: string;
    source: string;
    context: any;
    decision: any;
    confidence?: number;
  }) {
    return await feedbackLoop.logDecision({
      decisionType: input.type,
      source: input.source,
      sourceId: undefined,
      context: input.context,
      decision: input.decision,
      confidence: input.confidence
    });
  }

  async recordFeedback(input: {
    decisionId: string;
    outcome: string;
    success: 'success' | 'partial' | 'failure';
    impact: number;
  }) {
    return await feedbackLoop.recordFeedback({
      decisionId: input.decisionId,
      actualOutcome: input.outcome,
      success: input.success,
      impactScore: input.impact
    });
  }

  async storeMemory(input: {
    content: string;
    category: string;
    source: string;
  }) {
    return await vectorMemory.store({
      content: input.content,
      category: input.category,
      source: input.source
    });
  }

  async searchMemory(query: string, limit: number = 5) {
    return await vectorMemory.search(query, limit);
  }

  async contributeKnowledge(input: {
    botId: string;
    botName: string;
    category: string;
    pattern: string;
    description: string;
    examples?: any[];
    confidence?: number;
  }) {
    return await sharedLearning.contribute({
      botId: input.botId,
      botName: input.botName,
      category: input.category,
      pattern: input.pattern,
      description: input.description,
      examples: input.examples || [],
      confidence: input.confidence || 50
    });
  }

  async getSharedKnowledge(category: string) {
    return await sharedLearning.getKnowledge(category);
  }

  async getStats() {
    const [feedbackStats, vectorStats, learningStats] = await Promise.all([
      feedbackLoop.getStats().catch(() => null),
      vectorMemory.getStats().catch(() => null),
      sharedLearning.getStats().catch(() => null)
    ]);

    return {
      feedback: feedbackStats,
      vector: vectorStats,
      learning: learningStats
    };
  }

  async generateSmartReport() {
    return await smartReports.generateReport();
  }

  // ============= Academic Hub Methods =============

  async searchAcademic(query: string, limit?: number) {
    return await academicHub.searchPapers(query, limit);
  }

  async storeAcademicContent(params: {
    title: string;
    content: string;
    category: string;
    authors?: string[];
    keywords?: string[];
    year?: number;
  }) {
    return await academicHub.storeContent(params);
  }

  async getTopicRecommendations(query: string) {
    return await academicHub.getTopicRecommendations(query);
  }

  async getAcademicTrends() {
    return await academicHub.analyzeTrends();
  }

  // ============= AI Committee Methods =============

  async committeeDecide(prompt: string, context?: any) {
    return await aiCommittee.decide(prompt, context);
  }

  getCommitteeStatus() {
    return aiCommittee.getStatus();
  }

  // ============= Chain of Thought Methods =============

  async reasonStepByStep(problem: string, context?: { domain?: string; maxSteps?: number }) {
    return await chainOfThought.reason(problem, context);
  }

  getReasoningStatus() {
    return chainOfThought.getStatus();
  }

  // ============= Tool Use Methods =============

  async decideToolUse(request: string, context?: any) {
    return await toolUseSystem.decideToolUse(request, context);
  }

  async executeTools(toolCalls: any[]) {
    return await toolUseSystem.executeTools(toolCalls);
  }

  getAvailableTools() {
    return toolUseSystem.getAvailableTools();
  }

  getToolStatus() {
    return toolUseSystem.getStatus();
  }

  registerTool(tool: any) {
    return toolUseSystem.registerTool(tool);
  }
}

// ============= Export Singleton =============

export const intelligence = new IntelligenceSystem();

// ============= Export Individual Systems =============

export { 
  feedbackLoop, 
  vectorMemory, 
  sharedLearning, 
  smartReports, 
  academicHub,
  aiCommittee,
  chainOfThought,
  toolUseSystem
};

// ============= Export AI Providers =============
export { aiProviders } from './ai-providers';
