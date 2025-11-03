/**
 * AI COMMITTEE - نظام التصويت بين النماذج المتعددة
 * 
 * 🔓 OPEN-SOURCE FIRST - المصادر المفتوحة أولاً
 * 
 * Nicholas يعتمد بالكامل على نماذج مفتوحة المصدر لضمان:
 * ✅ الخصوصية الكاملة - بياناتك ما تطلع برا
 * ✅ الاستقلالية التامة - ما في اعتماد على شركات
 * ✅ التخصيص الكامل - تقدر تسوي fine-tuning
 * ✅ الملكية الكاملة - النموذج ملكك للأبد
 * 
 * 8 OPEN-SOURCE AI Models:
 * 1. Llama 3.3 70B (Meta) - النموذج الأساسي ⭐
 * 2. DeepSeek R1 (DeepSeek) - التفكير المعقد
 * 3. DeepSeek V3 (DeepSeek) - المحادثة العامة
 * 4. Qwen 3 Coder (Alibaba) - خبير البرمجة
 * 5. Mistral Small (Mistral) - سريع وفعال
 * 6. Mistral Large (Mistral) - نموذج قوي
 * 7. Hunyuan-A13B (Tencent) - MoE متقدم
 * 8. Falcon 7B (TII UAE) - نموذج عربي
 * 
 * Features:
 * - Multi-model consensus voting
 * - Weighted confidence aggregation
 * - Cross-validation and error detection
 * - Reasoning comparison and synthesis
 */

import { aiProviders, type AIResponse } from './ai-providers';

// ============================================
// Types & Interfaces
// ============================================

interface ModelResponse {
  model: string;
  decision: string;
  confidence: number;
  reasoning: string;
  data?: any;
}

interface CommitteeDecision {
  finalDecision: string;
  confidence: number;
  consensus: number; // 0-1 (agreement percentage)
  votes: ModelResponse[];
  synthesizedReasoning: string;
  dissent?: string[]; // Minority opinions
}

interface CommitteeConfig {
  models: string[]; // Which models to use
  votingStrategy: 'majority' | 'weighted' | 'unanimous';
  minConsensus: number; // Minimum agreement percentage (0-1)
  enableDebate: boolean; // Models can see each other's reasoning
}

// ============================================
// AI Committee Class
// ============================================

export class AICommittee {
  private config: CommitteeConfig;
  private active: boolean = false;

  constructor(config?: Partial<CommitteeConfig>) {
    this.config = {
      // 🔓 Open-Source First Strategy - استراتيجية المصادر المفتوحة أولاً
      // Nicholas يعتمد على نماذج مفتوحة المصدر للخصوصية والاستقلالية
      models: ['llama', 'deepseek-r1', 'deepseek', 'qwen-coder', 'mistral-small', 'mistral', 'hunyuan', 'falcon'],
      votingStrategy: 'weighted',
      minConsensus: 0.6,
      enableDebate: true,
      ...config
    };
  }

  /**
   * Activate the AI Committee
   */
  activate(): void {
    if (this.active) {
      console.log('[AICommittee] Already active');
      return;
    }

    const availableProviders = aiProviders.getAvailableProviders();
    const activeModels = this.config.models.filter(m => availableProviders.includes(m));

    this.active = true;
    console.log('🏛️ [AICommittee] Multi-model committee activated');
    console.log(`   • Available Models: ${activeModels.length}/${this.config.models.length}`);
    console.log(`   • Active: ${activeModels.join(', ')}`);
    console.log(`   • Voting Strategy: ${this.config.votingStrategy}`);
    console.log(`   • Min Consensus: ${Math.round(this.config.minConsensus * 100)}%`);
    console.log(`   • Debate Mode: ${this.config.enableDebate ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Deactivate the AI Committee
   */
  deactivate(): void {
    this.active = false;
    console.log('[AICommittee] Deactivated');
  }

  /**
   * Make a committee decision with multiple AI models
   */
  async decide(prompt: string, context?: {
    systemPrompt?: string;
    previousVotes?: ModelResponse[];
    round?: number;
  }): Promise<CommitteeDecision> {
    if (!this.active) {
      throw new Error('AI Committee is not active');
    }

    console.log(`\n🏛️ [AICommittee] Starting committee decision (Round ${context?.round || 1})`);

    // Collect votes from all available models
    const votes: ModelResponse[] = [];
    const votePromises: Promise<ModelResponse | null>[] = [];

    // Get available providers
    const availableProviders = aiProviders.getAvailableProviders();
    const activeModels = this.config.models.filter(m => availableProviders.includes(m));

    if (activeModels.length === 0) {
      throw new Error('No AI models available for committee voting');
    }

    // Collect votes from all models in parallel
    for (const modelName of activeModels) {
      votePromises.push(this.getModelVote(modelName, prompt, context));
    }

    // Wait for all votes
    const results = await Promise.all(votePromises);
    votes.push(...results.filter(Boolean) as ModelResponse[]);

    if (votes.length === 0) {
      throw new Error('No models responded with valid votes');
    }

    console.log(`📊 [AICommittee] Collected ${votes.length} votes from ${activeModels.length} models`);

    // Analyze votes and calculate consensus
    const decision = this.analyzeVotes(votes);

    // If consensus is low and debate is enabled, do a second round
    if (decision.consensus < this.config.minConsensus && this.config.enableDebate && (!context?.round || context.round < 2)) {
      console.log(`⚠️ [AICommittee] Low consensus (${Math.round(decision.consensus * 100)}%) - Starting debate round`);
      
      // Second round with knowledge of other votes
      return await this.decide(prompt, {
        ...context,
        previousVotes: votes,
        round: 2
      });
    }

    console.log(`✅ [AICommittee] Final decision: ${decision.finalDecision} (consensus: ${Math.round(decision.consensus * 100)}%)\n`);

    return decision;
  }

  /**
   * Get vote from any AI model via AI Providers
   */
  private async getModelVote(modelName: string, prompt: string, context?: any): Promise<ModelResponse | null> {
    try {
      const systemPrompt = context?.systemPrompt || 
        `You are a member of an AI committee with 6 different AI models. Analyze the request and provide your decision in JSON format:
{
  "decision": "your proposed decision",
  "confidence": 0.85,
  "reasoning": "detailed reason for your decision"
}`;

      let fullPrompt = prompt;
      
      // If debate round, include previous votes
      if (context?.previousVotes && context.previousVotes.length > 0) {
        const otherVotes = context.previousVotes
          .filter((v: ModelResponse) => v.model.toLowerCase() !== modelName.toLowerCase())
          .map((v: ModelResponse) => `${v.model}: ${v.decision} (confidence: ${v.confidence}) - ${v.reasoning}`)
          .join('\n');
        
        if (otherVotes) {
          fullPrompt = `${prompt}\n\nOther committee members' opinions:\n${otherVotes}\n\nBased on this, what is your final opinion?`;
        }
      }

      // Call AI provider
      const response: AIResponse = await aiProviders.generate(modelName, fullPrompt, {
        system_prompt: systemPrompt,
        temperature: 0.4,
        max_tokens: 500
      });

      const parsed = this.parseModelResponse(response.content);
      
      return {
        model: this.formatModelName(modelName),
        decision: parsed.decision,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        data: parsed.data
      };
    } catch (error: any) {
      console.error(`[AICommittee] ${modelName} vote failed:`, error.message);
      return null;
    }
  }

  /**
   * Format model name for display
   */
  private formatModelName(name: string): string {
    const nameMap: Record<string, string> = {
      'hunyuan': 'Hunyuan-A13B',
      'openai': 'OpenAI GPT-4o',
      'claude': 'Claude 3.5',
      'llama': 'Llama 3.3 70B',
      'llama-groq': 'Llama 3.3 (Groq)',
      'mistral': 'Mistral Large',
      'falcon': 'Falcon 180B',
      'deepseek-r1': 'DeepSeek R1',
      'deepseek': 'DeepSeek V3',
      'qwen-coder': 'Qwen 3 Coder',
      'mistral-small': 'Mistral Small'
    };
    return nameMap[name.toLowerCase()] || name;
  }

  /**
   * Parse model response and extract structured data
   */
  private parseModelResponse(response: string): {
    decision: string;
    confidence: number;
    reasoning: string;
    data?: any;
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          decision: parsed.decision || 'unknown',
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
          reasoning: parsed.reasoning || response,
          data: parsed.data
        };
      }
    } catch (e) {
      // Parsing failed, return defaults
    }

    return {
      decision: 'unknown',
      confidence: 0.5,
      reasoning: response
    };
  }

  /**
   * Analyze votes and determine final decision
   */
  private analyzeVotes(votes: ModelResponse[]): CommitteeDecision {
    if (votes.length === 0) {
      throw new Error('No votes to analyze');
    }

    // Count decision frequencies
    const decisionCounts = new Map<string, number>();
    const decisionConfidences = new Map<string, number[]>();

    votes.forEach(vote => {
      // Safety check: ensure decision exists and is a string
      if (!vote || !vote.decision || typeof vote.decision !== 'string') {
        console.warn('[AICommittee] Invalid vote structure:', vote);
        return;
      }
      
      const decision = vote.decision.toLowerCase();
      decisionCounts.set(decision, (decisionCounts.get(decision) || 0) + 1);
      
      if (!decisionConfidences.has(decision)) {
        decisionConfidences.set(decision, []);
      }
      decisionConfidences.get(decision)!.push(vote.confidence);
    });

    // Determine final decision based on voting strategy
    let finalDecision: string;
    let finalConfidence: number;

    if (this.config.votingStrategy === 'majority') {
      // Simple majority
      const maxVotes = Math.max(...Array.from(decisionCounts.values()));
      finalDecision = Array.from(decisionCounts.entries())
        .find(([_, count]) => count === maxVotes)![0];
      
      const confidences = decisionConfidences.get(finalDecision)!;
      finalConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    } else {
      // Weighted by confidence
      const weightedScores = new Map<string, number>();
      
      votes.forEach(vote => {
        // Safety check
        if (!vote || !vote.decision || typeof vote.decision !== 'string') {
          return;
        }
        
        const decision = vote.decision.toLowerCase();
        const currentScore = weightedScores.get(decision) || 0;
        weightedScores.set(decision, currentScore + vote.confidence);
      });

      const maxScore = Math.max(...Array.from(weightedScores.values()));
      finalDecision = Array.from(weightedScores.entries())
        .find(([_, score]) => score === maxScore)![0];
      
      finalConfidence = maxScore / votes.length;
    }

    // Calculate consensus (agreement percentage)
    const agreementVotes = votes.filter(v => v.decision.toLowerCase() === finalDecision).length;
    const consensus = agreementVotes / votes.length;

    // Synthesize reasoning from all votes
    const synthesizedReasoning = this.synthesizeReasoning(votes, finalDecision);

    // Collect dissenting opinions
    const dissent = votes
      .filter(v => v.decision.toLowerCase() !== finalDecision)
      .map(v => `${v.model}: ${v.reasoning}`);

    return {
      finalDecision,
      confidence: finalConfidence,
      consensus,
      votes,
      synthesizedReasoning,
      dissent: dissent.length > 0 ? dissent : undefined
    };
  }

  /**
   * Synthesize reasoning from multiple votes
   */
  private synthesizeReasoning(votes: ModelResponse[], finalDecision: string): string {
    const relevantVotes = votes.filter(v => v.decision.toLowerCase() === finalDecision);
    
    if (relevantVotes.length === 0) {
      return 'No consensus reached';
    }

    if (relevantVotes.length === 1) {
      return relevantVotes[0].reasoning;
    }

    // Combine reasoning from all agreeing models
    const reasoningPoints = relevantVotes.map(v => `• ${v.model}: ${v.reasoning}`);
    return `Committee consensus:\n${reasoningPoints.join('\n')}`;
  }

  /**
   * Get committee status
   */
  getStatus() {
    const availableProviders = aiProviders.getAvailableProviders();
    const activeModels = this.config.models
      .filter(m => availableProviders.includes(m))
      .map(m => this.formatModelName(m));

    return {
      active: this.active,
      availableModels: activeModels,
      modelCount: activeModels.length,
      config: this.config,
      allProviders: aiProviders.getAvailableProviders()
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const aiCommittee = new AICommittee();
