/**
 * CHAIN OF THOUGHT REASONING - التفكير خطوة بخطوة
 * 
 * Step-by-step logical reasoning system
 * Breaks down complex problems into manageable steps
 * 
 * Features:
 * - Multi-step reasoning with intermediate conclusions
 * - Thought transparency and explainability
 * - Error detection at each step
 * - Self-verification and validation
 */

import { aiProviders } from './ai-providers';

// ============================================
// Types & Interfaces
// ============================================

interface ReasoningStep {
  step: number;
  thought: string;
  conclusion: string;
  confidence: number;
  verified: boolean;
}

interface ChainOfThoughtResult {
  steps: ReasoningStep[];
  finalConclusion: string;
  overallConfidence: number;
  reasoningPath: string;
  validationChecks: {
    logicalConsistency: boolean;
    factualAccuracy: boolean;
    completeness: boolean;
  };
}

// ============================================
// Chain of Thought Class
// ============================================

export class ChainOfThought {
  private active: boolean = false;
  private maxSteps: number = 7;
  private model: string = 'llama'; // 🔓 Llama 3.3 70B - Open-Source reasoning

  constructor() {
    // Use aiProviders for all model access
  }

  /**
   * Activate Chain of Thought reasoning
   */
  activate(): void {
    if (this.active) {
      console.log('[ChainOfThought] Already active');
      return;
    }

    this.active = true;
    console.log('🧩 [ChainOfThought] Step-by-step reasoning activated');
    console.log(`   • Model: ${this.model} (Open-Source)`);
    console.log(`   • Max Steps: ${this.maxSteps}`);
  }

  /**
   * Deactivate Chain of Thought
   */
  deactivate(): void {
    this.active = false;
    console.log('[ChainOfThought] Deactivated');
  }

  /**
   * Perform step-by-step reasoning
   */
  async reason(problem: string, context?: {
    domain?: string;
    maxSteps?: number;
  }): Promise<ChainOfThoughtResult> {
    if (!this.active) {
      throw new Error('Chain of Thought is not active');
    }

    console.log('\n🧩 [ChainOfThought] Starting step-by-step reasoning');
    console.log(`   Problem: "${problem.substring(0, 100)}..."`);

    const maxSteps = context?.maxSteps || this.maxSteps;
    const steps: ReasoningStep[] = [];

    // Generate reasoning steps
    const stepsData = await this.generateReasoningSteps(problem, context);

    // Verify each step
    for (let i = 0; i < stepsData.length && i < maxSteps; i++) {
      const step = stepsData[i];
      const verified = await this.verifyStep(step, steps);
      
      steps.push({
        ...step,
        step: i + 1,
        verified
      });

      console.log(`   ✓ Step ${i + 1}/${stepsData.length}: ${step.thought.substring(0, 60)}...`);
    }

    // Generate final conclusion
    const finalConclusion = this.synthesizeConclusion(steps);
    const overallConfidence = this.calculateOverallConfidence(steps);
    const reasoningPath = this.formatReasoningPath(steps);
    
    // Validation checks
    const validationChecks = await this.performValidationChecks(steps, finalConclusion);

    console.log(`✅ [ChainOfThought] Reasoning complete (${steps.length} steps, confidence: ${Math.round(overallConfidence * 100)}%)\n`);

    return {
      steps,
      finalConclusion,
      overallConfidence,
      reasoningPath,
      validationChecks
    };
  }

  /**
   * Generate reasoning steps using AI
   */
  private async generateReasoningSteps(
    problem: string,
    context?: { domain?: string }
  ): Promise<Omit<ReasoningStep, 'step' | 'verified'>[]> {
    const systemPrompt = `أنت خبير في التفكير المنطقي خطوة بخطوة. حلل المشكلة وقسمها إلى خطوات واضحة.
${context?.domain ? `المجال: ${context.domain}` : ''}

أعط كل خطوة بصيغة JSON:
{
  "steps": [
    {
      "thought": "التفكير في هذه الخطوة",
      "conclusion": "الاستنتاج من هذه الخطوة",
      "confidence": 0.85
    }
  ]
}`;

    try {
      // Use aiProviders for open-source model access
      const result = await aiProviders.generate(this.model, problem, {
        system_prompt: systemPrompt,
        temperature: 0.5,
        max_tokens: 1500
      });

      const response = result.content;

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.steps || [];
      }

      return [];
    } catch (error: any) {
      console.error('[ChainOfThought] Failed to generate steps:', error.message);
      return [];
    }
  }

  /**
   * Verify a single reasoning step
   */
  private async verifyStep(
    step: Omit<ReasoningStep, 'step' | 'verified'>,
    previousSteps: ReasoningStep[]
  ): Promise<boolean> {
    // Simple verification based on confidence
    // In production, you could use another AI call to verify
    
    // Check if conclusion follows from thought
    const hasLogicalFlow = step.thought.length > 10 && step.conclusion.length > 5;
    
    // Check if confidence is reasonable
    const hasReasonableConfidence = step.confidence >= 0.3 && step.confidence <= 1.0;
    
    // Check consistency with previous steps
    let isConsistent = true;
    if (previousSteps.length > 0) {
      // Simple check: no contradictions with previous conclusions
      const previousConclusions = previousSteps.map(s => s.conclusion.toLowerCase());
      const currentConclusion = step.conclusion.toLowerCase();
      
      // This is a simplified check - in production you'd want more sophisticated logic
      isConsistent = !previousConclusions.some(prev => 
        (prev.includes('not') && !currentConclusion.includes('not') && prev.replace('not', '').includes(currentConclusion)) ||
        (!prev.includes('not') && currentConclusion.includes('not') && currentConclusion.replace('not', '').includes(prev))
      );
    }

    return hasLogicalFlow && hasReasonableConfidence && isConsistent;
  }

  /**
   * Synthesize final conclusion from all steps
   */
  private synthesizeConclusion(steps: ReasoningStep[]): string {
    if (steps.length === 0) {
      return 'No reasoning steps available';
    }

    const lastStep = steps[steps.length - 1];
    return lastStep.conclusion;
  }

  /**
   * Calculate overall confidence from all steps
   */
  private calculateOverallConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0;

    // Average confidence, weighted by verification
    const totalConfidence = steps.reduce((sum, step) => {
      const weight = step.verified ? 1.0 : 0.5;
      return sum + (step.confidence * weight);
    }, 0);

    const totalWeight = steps.reduce((sum, step) => sum + (step.verified ? 1.0 : 0.5), 0);

    return totalConfidence / totalWeight;
  }

  /**
   * Format reasoning path as readable text
   */
  private formatReasoningPath(steps: ReasoningStep[]): string {
    return steps.map(step => 
      `Step ${step.step}: ${step.thought}\n→ ${step.conclusion} (${Math.round(step.confidence * 100)}% ${step.verified ? '✓' : '?'})`
    ).join('\n\n');
  }

  /**
   * Perform validation checks on the reasoning chain
   */
  private async performValidationChecks(
    steps: ReasoningStep[],
    finalConclusion: string
  ): Promise<{
    logicalConsistency: boolean;
    factualAccuracy: boolean;
    completeness: boolean;
  }> {
    // Logical consistency: all steps verified
    const logicalConsistency = steps.every(step => step.verified);

    // Factual accuracy: high average confidence
    const avgConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
    const factualAccuracy = avgConfidence >= 0.7;

    // Completeness: has sufficient steps and final conclusion
    const completeness = steps.length >= 2 && finalConclusion.length > 10;

    return {
      logicalConsistency,
      factualAccuracy,
      completeness
    };
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      active: this.active,
      model: this.model,
      maxSteps: this.maxSteps,
      provider: this.model === 'hunyuan' ? 'Hunyuan-A13B' : 'OpenAI GPT-4o-mini'
    };
  }

  /**
   * Set maximum reasoning steps
   */
  setMaxSteps(max: number): void {
    this.maxSteps = Math.max(1, Math.min(max, 15)); // Between 1-15 steps
    console.log(`[ChainOfThought] Max steps set to ${this.maxSteps}`);
  }
}

// ============================================
// Export singleton instance
// ============================================

export const chainOfThought = new ChainOfThought();
