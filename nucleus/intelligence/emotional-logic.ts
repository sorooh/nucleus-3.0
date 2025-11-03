/**
 * EMOTIONAL LOGIC LAYER - طبقة المنطق العاطفي
 * 
 * Sentiment, intent, and de-escalation system:
 * - Analyzes emotional tone in messages/decisions
 * - Detects user intent and underlying needs
 * - Provides de-escalation strategies for tense situations
 * - Tracks emotional patterns over time
 * 
 * Features:
 * - Sentiment Analysis: Positive, negative, neutral detection
 * - Intent Recognition: Understanding what user wants
 * - De-escalation: Calming strategies for conflicts
 * - Emotional Intelligence: Learning emotional patterns
 */

import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

interface EmotionalConfig {
  sentiment: boolean;
  intent: boolean;
  deescalation: boolean;
}

interface SentimentAnalysis {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: string[];
  intensity: number;
}

interface IntentAnalysis {
  primary: string;
  secondary: string[];
  confidence: number;
  needsAttention: boolean;
  urgency: number;
}

interface DeescalationStrategy {
  applicable: boolean;
  severity: number;
  strategies: string[];
  suggestedResponse: string;
  preventiveMeasures: string[];
}

interface EmotionalAnalysis {
  id: string;
  timestamp: Date;
  input: string;
  sentiment: SentimentAnalysis;
  intent: IntentAnalysis;
  deescalation: DeescalationStrategy;
  metadata: any;
}

class EmotionalLogicLayer extends EventEmitter {
  private active: boolean = false;
  private config: EmotionalConfig = {
    sentiment: true,
    intent: true,
    deescalation: true
  };
  private analyses: EmotionalAnalysis[] = [];
  private aiProvider: Anthropic | null = null;
  private emotionalPatterns: Map<string, number> = new Map();

  activate(params?: Partial<EmotionalConfig>): void {
    if (this.active) {
      console.log('[EmotionalLogic] Already active');
      return;
    }

    if (params) {
      this.config = { ...this.config, ...params };
    }

    this.initializeAI();
    this.active = true;

    console.log('❤️ [EmotionalLogic] Emotional intelligence layer activated');
    console.log(`   • Sentiment Analysis: ${this.config.sentiment ? 'ON' : 'OFF'}`);
    console.log(`   • Intent Recognition: ${this.config.intent ? 'ON' : 'OFF'}`);
    console.log(`   • De-escalation: ${this.config.deescalation ? 'ON' : 'OFF'}`);

    this.emit('activated', this.config);
  }

  private initializeAI(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.aiProvider = new Anthropic({ apiKey });
      console.log('[EmotionalLogic] ✅ AI provider initialized');
    } else {
      console.log('[EmotionalLogic] ⚠️ No AI provider (ANTHROPIC_API_KEY missing)');
    }
  }

  async analyze(input: string, metadata: any = {}): Promise<EmotionalAnalysis> {
    if (!this.active) {
      throw new Error('Emotional Logic not active');
    }

    try {
      const [sentiment, intent, deescalation] = await Promise.all([
        this.config.sentiment ? this.analyzeSentiment(input) : this.getDefaultSentiment(),
        this.config.intent ? this.analyzeIntent(input) : this.getDefaultIntent(),
        this.config.deescalation ? this.analyzeDeescalation(input) : this.getDefaultDeescalation()
      ]);

      const analysis: EmotionalAnalysis = {
        id: `emo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        input: input.substring(0, 500),
        sentiment,
        intent,
        deescalation,
        metadata
      };

      this.analyses.push(analysis);
      
      if (this.analyses.length > 100) {
        this.analyses.shift();
      }

      this.trackPatterns(analysis);
      this.emit('analysis-completed', analysis);

      return analysis;
    } catch (error: any) {
      console.error('[EmotionalLogic] Analysis failed:', error.message);
      throw error;
    }
  }

  private async analyzeSentiment(input: string): Promise<SentimentAnalysis> {
    if (!this.aiProvider) {
      return this.getDefaultSentiment();
    }

    try {
      const prompt = `Analyze the emotional sentiment of this text:

"${input}"

Provide detailed sentiment analysis:
1. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
2. Sentiment label (positive/negative/neutral)
3. Confidence level (0 to 1)
4. Detected emotions (joy, anger, sadness, fear, surprise, etc.)
5. Emotional intensity (0 to 1)

Format as JSON:
{
  "score": 0.7,
  "label": "positive",
  "confidence": 0.85,
  "emotions": ["joy", "excitement"],
  "intensity": 0.6
}`;

      const response = await this.aiProvider.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: parsed.score || 0,
          label: parsed.label || 'neutral',
          confidence: parsed.confidence || 0.5,
          emotions: parsed.emotions || [],
          intensity: parsed.intensity || 0
        };
      }
    } catch (error: any) {
      console.error('[EmotionalLogic] Sentiment analysis failed:', error.message);
    }

    return this.getDefaultSentiment();
  }

  private async analyzeIntent(input: string): Promise<IntentAnalysis> {
    if (!this.aiProvider) {
      return this.getDefaultIntent();
    }

    try {
      const prompt = `Analyze the user's intent behind this message:

"${input}"

Determine:
1. Primary intent (what does the user want?)
2. Secondary intents (underlying needs)
3. Confidence in intent detection (0 to 1)
4. Does this need immediate attention? (true/false)
5. Urgency level (0 to 1)

Format as JSON:
{
  "primary": "request for information",
  "secondary": ["clarification", "reassurance"],
  "confidence": 0.8,
  "needsAttention": false,
  "urgency": 0.3
}`;

      const response = await this.aiProvider.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          primary: parsed.primary || 'unknown',
          secondary: parsed.secondary || [],
          confidence: parsed.confidence || 0.5,
          needsAttention: parsed.needsAttention || false,
          urgency: parsed.urgency || 0
        };
      }
    } catch (error: any) {
      console.error('[EmotionalLogic] Intent analysis failed:', error.message);
    }

    return this.getDefaultIntent();
  }

  private async analyzeDeescalation(input: string): Promise<DeescalationStrategy> {
    if (!this.aiProvider) {
      return this.getDefaultDeescalation();
    }

    try {
      const prompt = `Analyze if this message indicates tension or conflict that needs de-escalation:

"${input}"

Provide:
1. Is de-escalation applicable? (true/false)
2. Severity of tension (0 to 1, where 0 is calm, 1 is very tense)
3. Recommended de-escalation strategies
4. Suggested calm response
5. Preventive measures for future

Format as JSON:
{
  "applicable": true,
  "severity": 0.6,
  "strategies": ["acknowledge feelings", "offer reassurance"],
  "suggestedResponse": "I understand this is frustrating...",
  "preventiveMeasures": ["clearer communication", "set expectations"]
}`;

      const response = await this.aiProvider.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          applicable: parsed.applicable || false,
          severity: parsed.severity || 0,
          strategies: parsed.strategies || [],
          suggestedResponse: parsed.suggestedResponse || '',
          preventiveMeasures: parsed.preventiveMeasures || []
        };
      }
    } catch (error: any) {
      console.error('[EmotionalLogic] De-escalation analysis failed:', error.message);
    }

    return this.getDefaultDeescalation();
  }

  private trackPatterns(analysis: EmotionalAnalysis): void {
    const key = `${analysis.sentiment.label}_${analysis.intent.primary}`;
    this.emotionalPatterns.set(key, (this.emotionalPatterns.get(key) || 0) + 1);

    if (analysis.deescalation.applicable && analysis.deescalation.severity > 0.7) {
      this.emit('high-tension-detected', {
        input: analysis.input,
        severity: analysis.deescalation.severity,
        strategies: analysis.deescalation.strategies
      });
    }
  }

  private getDefaultSentiment(): SentimentAnalysis {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0.5,
      emotions: [],
      intensity: 0
    };
  }

  private getDefaultIntent(): IntentAnalysis {
    return {
      primary: 'general',
      secondary: [],
      confidence: 0.5,
      needsAttention: false,
      urgency: 0
    };
  }

  private getDefaultDeescalation(): DeescalationStrategy {
    return {
      applicable: false,
      severity: 0,
      strategies: [],
      suggestedResponse: '',
      preventiveMeasures: []
    };
  }

  getStatus(): any {
    const recentAnalyses = this.analyses.slice(-20);
    const avgSentiment = recentAnalyses.length > 0
      ? recentAnalyses.reduce((sum, a) => sum + a.sentiment.score, 0) / recentAnalyses.length
      : 0;
    
    const tensionCount = recentAnalyses.filter(a => a.deescalation.applicable).length;

    return {
      active: this.active,
      config: this.config,
      totalAnalyses: this.analyses.length,
      recentAnalyses: recentAnalyses.slice(-5).map(a => ({
        id: a.id,
        sentiment: a.sentiment.label,
        intent: a.intent.primary,
        tension: a.deescalation.applicable,
        timestamp: a.timestamp
      })),
      stats: {
        averageSentiment: Math.round(avgSentiment * 100) / 100,
        tensionDetected: tensionCount,
        mostCommonPattern: this.getMostCommonPattern()
      }
    };
  }

  private getMostCommonPattern(): string | null {
    if (this.emotionalPatterns.size === 0) return null;
    
    let maxCount = 0;
    let mostCommon = null;
    
    for (const [pattern, count] of this.emotionalPatterns.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = pattern;
      }
    }
    
    return mostCommon;
  }

  getRecentAnalyses(limit: number = 10): EmotionalAnalysis[] {
    return this.analyses.slice(-limit);
  }

  configure(params: Partial<EmotionalConfig>): void {
    this.config = { ...this.config, ...params };
    console.log(`[EmotionalLogic] Configuration updated:`, this.config);
  }
}

export const emotionalLogic = new EmotionalLogicLayer();
