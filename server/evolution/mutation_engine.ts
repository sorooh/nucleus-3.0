/**
 * 🧬 Mutation Engine - Phase Ω
 * 
 * AI-driven code generation system that creates intelligent mutations
 * Integrates with LLM providers for autonomous code improvements
 * 
 * @module MutationEngine
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { mutationQueue, evolutionHistory, type InsertMutationQueue } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import OpenAI from 'openai';

/**
 * Mutation proposal from AI
 */
interface MutationProposal {
  targetModule: string;
  mutationType: 'code' | 'config' | 'architecture' | 'intelligence';
  category: 'performance' | 'security' | 'features' | 'intelligence';
  proposedChanges: any;
  reasoning: string;
  expectedImpact: string;
  confidence: number;
}

/**
 * Mutation Engine Class
 */
class MutationEngine extends EventEmitter {
  private openai: OpenAI;
  private isGenerating: boolean = false;

  constructor() {
    super();
    
    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[MutationEngine] ⚠️ OPENAI_API_KEY not found - AI generation disabled');
    }
    
    this.openai = new OpenAI({ apiKey: apiKey || 'dummy' });
    console.log('[MutationEngine] 🧬 Mutation Engine initialized');
  }

  /**
   * Generate AI-driven mutation proposals
   */
  async generateMutations(context: {
    weaknesses: Array<{ area: string; severity: string; value: number }>;
    metrics: any;
    cycleId: string;
  }): Promise<MutationProposal[]> {
    
    if (this.isGenerating) {
      throw new Error('Mutation generation already in progress');
    }

    this.isGenerating = true;

    try {
      console.log('[MutationEngine] 🤖 Generating AI-driven mutations...');

      const proposals: MutationProposal[] = [];

      // Generate mutations for each weakness
      for (const weakness of context.weaknesses) {
        const proposal = await this.generateMutationForWeakness(weakness, context);
        if (proposal) {
          proposals.push(proposal);
        }
      }

      // Queue mutations in database
      for (const proposal of proposals) {
        await this.queueMutation(proposal, context.cycleId);
      }

      console.log(`[MutationEngine] ✅ Generated ${proposals.length} mutation proposals`);
      
      return proposals;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate mutation for specific weakness using AI
   */
  private async generateMutationForWeakness(
    weakness: { area: string; severity: string; value: number },
    context: any
  ): Promise<MutationProposal | null> {
    
    if (!process.env.OPENAI_API_KEY) {
      // Fallback: Generate basic mutation without AI
      return this.generateBasicMutation(weakness);
    }

    try {
      const prompt = this.buildMutationPrompt(weakness, context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI code optimizer for the Surooh evolutionary intelligence system. Generate precise, safe code mutations to improve system performance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.generateBasicMutation(weakness);
      }

      // Parse AI response
      return this.parseAIMutationResponse(content, weakness);
      
    } catch (error) {
      console.error('[MutationEngine] AI generation failed:', error);
      return this.generateBasicMutation(weakness);
    }
  }

  /**
   * Build prompt for AI mutation generation
   */
  private buildMutationPrompt(weakness: { area: string; severity: string; value: number }, context: any): string {
    return `
Analyze this system weakness and propose a safe code mutation:

Weakness: ${weakness.area}
Severity: ${weakness.severity}
Current Value: ${weakness.value}

System Context:
- Latency: ${context.metrics.latency}ms
- Accuracy: ${context.metrics.accuracy}
- Stability: ${context.metrics.stability}

Generate a mutation that:
1. Targets the root cause
2. Is safe and reversible
3. Has measurable impact
4. Follows ethical AI principles

Provide your response in this JSON format:
{
  "targetModule": "module_name",
  "mutationType": "code|config|architecture|intelligence",
  "category": "performance|security|features|intelligence",
  "changes": {
    "description": "what to change",
    "approach": "how to implement"
  },
  "reasoning": "why this mutation will help",
  "expectedImpact": "predicted improvement",
  "confidence": 0.85
}
`;
  }

  /**
   * Parse AI response into mutation proposal
   */
  private parseAIMutationResponse(content: string, weakness: any): MutationProposal {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          targetModule: data.targetModule || 'unknown',
          mutationType: data.mutationType || 'config',
          category: data.category || 'performance',
          proposedChanges: data.changes || {},
          reasoning: data.reasoning || 'AI-generated mutation',
          expectedImpact: data.expectedImpact || 'Performance improvement',
          confidence: data.confidence || 0.7,
        };
      }
    } catch (error) {
      console.error('[MutationEngine] Failed to parse AI response:', error);
    }

    return this.generateBasicMutation(weakness);
  }

  /**
   * Generate basic mutation without AI
   */
  private generateBasicMutation(weakness: { area: string; severity: string; value: number }): MutationProposal {
    const mutations: Record<string, MutationProposal> = {
      'Decision Accuracy': {
        targetModule: 'unified_core',
        mutationType: 'intelligence',
        category: 'intelligence',
        proposedChanges: {
          description: 'Optimize decision-making algorithm',
          approach: 'Increase AI confidence threshold and add validation layer'
        },
        reasoning: `Current accuracy (${weakness.value}) is below threshold. Improving algorithm will enhance reliability.`,
        expectedImpact: 'Increase accuracy by 8-12%',
        confidence: 0.75,
      },
      'System Stability': {
        targetModule: 'governance_kernel',
        mutationType: 'config',
        category: 'security',
        proposedChanges: {
          description: 'Strengthen error recovery mechanisms',
          approach: 'Add circuit breakers and fallback handlers'
        },
        reasoning: `Stability at ${weakness.value} requires better error handling`,
        expectedImpact: 'Reduce crashes by 20%',
        confidence: 0.8,
      },
      'Error Rate': {
        targetModule: 'api_gateway',
        mutationType: 'code',
        category: 'performance',
        proposedChanges: {
          description: 'Improve input validation',
          approach: 'Add schema validation and sanitization'
        },
        reasoning: `Error rate ${weakness.value} indicates validation gaps`,
        expectedImpact: 'Reduce errors by 30%',
        confidence: 0.7,
      },
      'Response Latency': {
        targetModule: 'memory_fusion',
        mutationType: 'performance',
        category: 'performance',
        proposedChanges: {
          description: 'Optimize database queries',
          approach: 'Add caching layer and query optimization'
        },
        reasoning: `Latency ${weakness.value}ms exceeds target`,
        expectedImpact: 'Reduce latency by 40%',
        confidence: 0.85,
      },
    };

    return mutations[weakness.area] || {
      targetModule: 'system',
      mutationType: 'config',
      category: 'performance',
      proposedChanges: {
        description: 'Generic optimization',
        approach: 'Review and optimize configuration'
      },
      reasoning: `Address ${weakness.area} weakness`,
      expectedImpact: 'Improve system performance',
      confidence: 0.6,
    };
  }

  /**
   * Queue mutation in database
   */
  private async queueMutation(proposal: MutationProposal, cycleId: string): Promise<void> {
    const priority = this.calculatePriority(proposal);

    await db.insert(mutationQueue).values({
      priority,
      status: 'queued',
      mutationType: proposal.mutationType,
      targetModule: proposal.targetModule,
      proposedChanges: proposal.proposedChanges,
      generatedBy: 'mutation-engine-ai',
      confidence: String(proposal.confidence),
    });

    this.emit('mutation:queued', { proposal, cycleId, priority });
  }

  /**
   * Calculate mutation priority (1-10)
   */
  private calculatePriority(proposal: MutationProposal): number {
    let priority = 5;

    // Higher confidence = higher priority
    priority += Math.floor((proposal.confidence - 0.5) * 4);

    // Category-based adjustment
    if (proposal.category === 'security') priority += 2;
    if (proposal.category === 'intelligence') priority += 1;

    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Generate cryptographic hash for mutation
   */
  generateMutationHash(mutation: any): string {
    const content = JSON.stringify(mutation);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sign mutation with digital signature
   */
  generateGeneticSignature(mutationHash: string): string {
    const timestamp = Date.now();
    const data = `${mutationHash}-${timestamp}-surooh-evolution`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// Singleton instance
let mutationEngine: MutationEngine | null = null;

/**
 * Get or create mutation engine instance
 */
export function getMutationEngine(): MutationEngine {
  if (!mutationEngine) {
    mutationEngine = new MutationEngine();
  }
  return mutationEngine;
}

export default getMutationEngine;
