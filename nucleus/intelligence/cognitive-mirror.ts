/**
 * COGNITIVE MIRROR LAYER - طبقة المرآة المعرفية
 * 
 * Self-reflection and meta-feedback system:
 * - Reflects on past decisions and analyzes patterns
 * - Provides meta-feedback (learning from learning)
 * - Identifies cognitive biases and improvement areas
 * - Tracks decision quality over time
 * 
 * Features:
 * - Reflection Window: Analyzes last N decisions
 * - Confidence Scoring: Evaluates decision confidence levels
 * - Pattern Recognition: Identifies recurring decision patterns
 * - Meta-Feedback: Suggests improvements to thinking process
 */

import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

interface ReflectionWindow {
  size: number;
  minConfidence: number;
}

interface DecisionReflection {
  id: string;
  timestamp: Date;
  decision: string;
  confidence: number;
  outcome?: string;
  reflection: string;
  patterns: string[];
  improvements: string[];
}

interface CognitiveBias {
  type: string;
  severity: number;
  description: string;
  examples: string[];
}

interface MetaFeedback {
  timestamp: Date;
  overallQuality: number;
  identifiedBiases: CognitiveBias[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

class CognitiveMirrorLayer extends EventEmitter {
  private active: boolean = false;
  private reflectionWindow: ReflectionWindow = {
    size: 50,
    minConfidence: 0.45
  };
  private reflections: DecisionReflection[] = [];
  private metaFeedbacks: MetaFeedback[] = [];
  private aiProvider: Anthropic | null = null;

  activate(params?: Partial<ReflectionWindow>): void {
    if (this.active) {
      console.log('[CognitiveMirror] Already active');
      return;
    }

    if (params) {
      this.reflectionWindow = { ...this.reflectionWindow, ...params };
    }

    this.initializeAI();
    this.active = true;

    console.log('🪞 [CognitiveMirror] Self-reflection layer activated');
    console.log(`   • Reflection Window: ${this.reflectionWindow.size} decisions`);
    console.log(`   • Min Confidence: ${this.reflectionWindow.minConfidence}`);
    console.log('   • Meta-feedback enabled');

    this.emit('activated', {
      window: this.reflectionWindow.size,
      minConfidence: this.reflectionWindow.minConfidence
    });
  }

  private initializeAI(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.aiProvider = new Anthropic({ apiKey });
      console.log('[CognitiveMirror] ✅ AI provider initialized');
    } else {
      console.log('[CognitiveMirror] ⚠️ No AI provider (ANTHROPIC_API_KEY missing)');
    }
  }

  async reflect(decision: {
    id: string;
    content: string;
    confidence: number;
    outcome?: string;
  }): Promise<DecisionReflection | null> {
    if (!this.active) {
      throw new Error('Cognitive Mirror not active');
    }

    if (decision.confidence < this.reflectionWindow.minConfidence) {
      return null;
    }

    try {
      const reflection = await this.performReflection(decision);
      
      this.reflections.push(reflection);
      
      if (this.reflections.length > this.reflectionWindow.size) {
        this.reflections.shift();
      }

      this.emit('reflection-created', reflection);
      
      if (this.reflections.length >= 10) {
        await this.generateMetaFeedback();
      }

      return reflection;
    } catch (error: any) {
      console.error('[CognitiveMirror] Reflection failed:', error.message);
      return null;
    }
  }

  private async performReflection(decision: {
    id: string;
    content: string;
    confidence: number;
    outcome?: string;
  }): Promise<DecisionReflection> {
    
    if (!this.aiProvider) {
      return {
        id: decision.id,
        timestamp: new Date(),
        decision: decision.content,
        confidence: decision.confidence,
        outcome: decision.outcome,
        reflection: 'Basic reflection without AI analysis',
        patterns: [],
        improvements: []
      };
    }

    const recentReflections = this.reflections.slice(-10);
    const context = recentReflections.length > 0
      ? `Recent decisions:\n${recentReflections.map(r => `- ${r.decision} (confidence: ${r.confidence})`).join('\n')}`
      : 'This is one of the first decisions.';

    const prompt = `Analyze this decision and provide deep self-reflection:

Decision: ${decision.content}
Confidence: ${decision.confidence}
${decision.outcome ? `Outcome: ${decision.outcome}` : ''}

${context}

Provide:
1. Reflection on decision quality
2. Identified patterns (if any)
3. Specific improvements for future decisions

Format as JSON:
{
  "reflection": "your analysis",
  "patterns": ["pattern1", "pattern2"],
  "improvements": ["improvement1", "improvement2"]
}`;

    const response = await this.aiProvider.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';
    
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        reflection: text,
        patterns: [],
        improvements: []
      };
    } catch {
      parsed = {
        reflection: text,
        patterns: [],
        improvements: []
      };
    }

    return {
      id: decision.id,
      timestamp: new Date(),
      decision: decision.content,
      confidence: decision.confidence,
      outcome: decision.outcome,
      reflection: parsed.reflection || 'No reflection generated',
      patterns: parsed.patterns || [],
      improvements: parsed.improvements || []
    };
  }

  private async generateMetaFeedback(): Promise<void> {
    if (this.reflections.length < 10 || !this.aiProvider) {
      return;
    }

    try {
      const recentReflections = this.reflections.slice(-30);
      
      const prompt = `Analyze these ${recentReflections.length} recent decisions and provide meta-feedback:

${recentReflections.map((r, i) => `
${i + 1}. ${r.decision}
   Confidence: ${r.confidence}
   Patterns: ${r.patterns.join(', ') || 'none'}
   ${r.outcome ? `Outcome: ${r.outcome}` : ''}
`).join('\n')}

Provide meta-level analysis:
1. Overall decision quality (0-100)
2. Identified cognitive biases
3. Strengths in decision-making
4. Weaknesses to address
5. Recommendations for improvement

Format as JSON:
{
  "overallQuality": 75,
  "biases": [{"type": "confirmation bias", "severity": 0.6, "description": "...", "examples": []}],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["rec1", "rec2"]
}`;

      const response = await this.aiProvider.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';
      
      let parsed;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (parsed) {
        const feedback: MetaFeedback = {
          timestamp: new Date(),
          overallQuality: parsed.overallQuality || 50,
          identifiedBiases: parsed.biases || [],
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          recommendations: parsed.recommendations || []
        };

        this.metaFeedbacks.push(feedback);
        
        if (this.metaFeedbacks.length > 10) {
          this.metaFeedbacks.shift();
        }

        this.emit('meta-feedback-generated', feedback);
        
        console.log(`🪞 [CognitiveMirror] Meta-feedback generated - Quality: ${feedback.overallQuality}%`);
      }
    } catch (error: any) {
      console.error('[CognitiveMirror] Meta-feedback generation failed:', error.message);
    }
  }

  getStatus(): any {
    return {
      active: this.active,
      window: this.reflectionWindow,
      totalReflections: this.reflections.length,
      recentReflections: this.reflections.slice(-5).map(r => ({
        id: r.id,
        decision: r.decision.substring(0, 100),
        confidence: r.confidence,
        timestamp: r.timestamp
      })),
      metaFeedbacks: this.metaFeedbacks.length,
      latestFeedback: this.metaFeedbacks.length > 0 ? {
        quality: this.metaFeedbacks[this.metaFeedbacks.length - 1].overallQuality,
        biasesFound: this.metaFeedbacks[this.metaFeedbacks.length - 1].identifiedBiases.length,
        timestamp: this.metaFeedbacks[this.metaFeedbacks.length - 1].timestamp
      } : null
    };
  }

  getReflections(limit: number = 10): DecisionReflection[] {
    return this.reflections.slice(-limit);
  }

  getMetaFeedbacks(limit: number = 5): MetaFeedback[] {
    return this.metaFeedbacks.slice(-limit);
  }

  configure(params: Partial<ReflectionWindow>): void {
    this.reflectionWindow = { ...this.reflectionWindow, ...params };
    console.log(`[CognitiveMirror] Configuration updated:`, this.reflectionWindow);
  }
}

export const cognitiveMirror = new CognitiveMirrorLayer();
