/**
 * PREDICTIVE INTELLIGENCE - الذكاء التنبؤي
 * 
 * Predicts future events based on historical patterns and trends
 * 
 * Features:
 * - Trend analysis and forecasting
 * - Anomaly prediction
 * - Risk assessment
 * - Opportunity identification
 */

import OpenAI from 'openai';

// ============================================
// Types & Interfaces
// ============================================

interface HistoricalData {
  timestamp: Date;
  type: string;
  value: any;
  metadata?: any;
}

interface Prediction {
  id: string;
  type: 'trend' | 'anomaly' | 'risk' | 'opportunity';
  description: string;
  probability: number; // 0-1
  timeframe: string; // e.g., "next hour", "tomorrow", "next week"
  confidence: number; // 0-1
  evidence: string[];
  recommendation?: string;
  predictedAt: Date;
}

interface Trend {
  id: string;
  name: string;
  direction: 'up' | 'down' | 'stable';
  strength: number; // 0-1
  dataPoints: number;
  startedAt: Date;
  projectedContinuation: string;
}

interface PredictionValidation {
  predictionId: string;
  actualOutcome: 'correct' | 'incorrect' | 'partial';
  accuracy: number;
  notes?: string;
}

// ============================================
// Predictive Intelligence System Class
// ============================================

export class PredictiveIntelligenceSystem {
  private active: boolean = false;
  private openai: OpenAI | null = null;
  private predictions: Map<string, Prediction> = new Map();
  private trends: Map<string, Trend> = new Map();
  private validations: PredictionValidation[] = [];
  private accuracyScore: number = 0;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('[PredictiveIntelligence] ✅ OpenAI provider initialized');
      }
    } catch (error: any) {
      console.error('[PredictiveIntelligence] ❌ Failed to initialize:', error.message);
    }
  }

  /**
   * Activate Predictive Intelligence
   */
  activate(): void {
    if (this.active) {
      console.log('[PredictiveIntelligence] Already active');
      return;
    }

    this.active = true;
    console.log('🔮 [PredictiveIntelligence] Predictive intelligence activated');
    console.log(`   • Analyzing trends and patterns`);
    console.log(`   • Forecasting future events`);
    console.log(`   • Identifying risks and opportunities`);
    
    // Start periodic prediction cycles
    this.startPredictionCycles();
  }

  /**
   * Deactivate Predictive Intelligence
   */
  deactivate(): void {
    this.active = false;
    console.log('[PredictiveIntelligence] Deactivated');
  }

  /**
   * Analyze trends and make predictions
   */
  async predict(): Promise<Prediction[]> {
    if (!this.active || !this.openai) return [];

    console.log(`\n🔮 [PredictiveIntelligence] Analyzing data for predictions...`);

    try {
      // Get historical data from Memory Hub
      const { memoryHub } = await import('../../nucleus/core/memory-hub');
      const insights = memoryHub.getAllInsights();

      if (insights.length < 20) {
        console.log('   ⏭️ Insufficient data for predictions (need 20+ insights)');
        return [];
      }

      // Analyze recent data (last 100 insights)
      const recentData = insights.slice(-100);

      // Step 1: Identify trends
      await this.identifyTrends(recentData);

      // Step 2: Make predictions
      const predictions = await this.generatePredictions(recentData);

      console.log(`✅ [PredictiveIntelligence] Generated ${predictions.length} predictions\n`);
      return predictions;
    } catch (error: any) {
      console.error('[PredictiveIntelligence] Prediction failed:', error.message);
      return [];
    }
  }

  /**
   * Identify trends in historical data
   */
  private async identifyTrends(data: any[]): Promise<void> {
    if (!this.openai || data.length === 0) return;

    try {
      // Group by type and analyze
      const typeGroups = new Map<string, any[]>();
      data.forEach(item => {
        const type = item.type || 'unknown';
        if (!typeGroups.has(type)) {
          typeGroups.set(type, []);
        }
        typeGroups.get(type)!.push(item);
      });

      const prompt = `حلل هذه البيانات واكتشف الاتجاهات (Trends):

${Array.from(typeGroups.entries()).map(([type, items]) => `
Type: ${type}
Count: ${items.length}
Recent: ${items.slice(-5).map(i => i.description).join('; ')}
`).join('\n')}

اكتشف الاتجاهات بصيغة JSON:
{
  "trends": [
    {
      "name": "اسم الاتجاه",
      "direction": "up",
      "strength": 0.8,
      "projection": "متوقع أن يستمر لمدة أسبوع"
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.trends && Array.isArray(parsed.trends)) {
          parsed.trends.forEach((t: any) => {
            const trendId = this.generateId(t.name);
            
            this.trends.set(trendId, {
              id: trendId,
              name: t.name,
              direction: t.direction || 'stable',
              strength: t.strength || 0.5,
              dataPoints: data.length,
              startedAt: new Date(),
              projectedContinuation: t.projection || 'unknown'
            });
          });

          console.log(`   📈 Identified ${parsed.trends.length} trends`);
        }
      }
    } catch (error: any) {
      console.error('[PredictiveIntelligence] Trend identification failed:', error.message);
    }
  }

  /**
   * Generate predictions based on trends and patterns
   */
  private async generatePredictions(data: any[]): Promise<Prediction[]> {
    if (!this.openai || data.length === 0) return [];

    try {
      const trendsList = Array.from(this.trends.values());

      const prompt = `بناءً على هذه الاتجاهات والبيانات، تنبأ بالأحداث القادمة:

Trends:
${trendsList.map(t => `- ${t.name} (${t.direction}, strength: ${t.strength})`).join('\n')}

Recent Data:
${data.slice(-20).map(d => `- [${d.type}] ${d.description}`).join('\n')}

تنبأ بالأحداث بصيغة JSON:
{
  "predictions": [
    {
      "type": "trend",
      "description": "وصف التنبؤ",
      "probability": 0.75,
      "timeframe": "next hour",
      "confidence": 0.8,
      "evidence": ["دليل 1", "دليل 2"],
      "recommendation": "ماذا يجب فعله"
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.predictions && Array.isArray(parsed.predictions)) {
          const newPredictions: Prediction[] = [];

          parsed.predictions.forEach((p: any) => {
            const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const prediction: Prediction = {
              id: predictionId,
              type: p.type || 'trend',
              description: p.description,
              probability: p.probability || 0.5,
              timeframe: p.timeframe || 'near future',
              confidence: p.confidence || 0.5,
              evidence: p.evidence || [],
              recommendation: p.recommendation,
              predictedAt: new Date()
            };

            this.predictions.set(predictionId, prediction);
            newPredictions.push(prediction);

            // Store high-confidence predictions in Memory Hub
            if (prediction.confidence > 0.7) {
              this.storePredictionInMemory(prediction);
            }
          });

          console.log(`   🎯 Generated ${newPredictions.length} predictions`);
          return newPredictions;
        }
      }

      return [];
    } catch (error: any) {
      console.error('[PredictiveIntelligence] Prediction generation failed:', error.message);
      return [];
    }
  }

  /**
   * Store high-confidence prediction in Memory Hub
   */
  private async storePredictionInMemory(prediction: Prediction): Promise<void> {
    try {
      const { memoryHub } = await import('../../nucleus/core/memory-hub');
      
      memoryHub.recordInsight({
        type: 'trend',
        description: `🔮 Prediction: ${prediction.description}`,
        confidence: prediction.confidence,
        sources: ['predictive-intelligence'],
        evidence: {
          predictionType: prediction.type,
          probability: prediction.probability,
          timeframe: prediction.timeframe,
          evidence: prediction.evidence,
          recommendation: prediction.recommendation
        }
      });
    } catch (error: any) {
      console.error('[PredictiveIntelligence] Failed to store prediction:', error.message);
    }
  }

  /**
   * Validate a prediction outcome
   */
  validatePrediction(predictionId: string, outcome: 'correct' | 'incorrect' | 'partial', accuracy: number): void {
    this.validations.push({
      predictionId,
      actualOutcome: outcome,
      accuracy
    });

    // Update accuracy score
    this.updateAccuracyScore();

    console.log(`[PredictiveIntelligence] ✅ Validated prediction ${predictionId}: ${outcome} (${Math.round(accuracy * 100)}%)`);
  }

  /**
   * Update overall accuracy score
   */
  private updateAccuracyScore(): void {
    if (this.validations.length === 0) {
      this.accuracyScore = 0;
      return;
    }

    const totalAccuracy = this.validations.reduce((sum, v) => sum + v.accuracy, 0);
    this.accuracyScore = totalAccuracy / this.validations.length;
  }

  /**
   * Start periodic prediction cycles
   */
  private startPredictionCycles(): void {
    // Run first cycle immediately (after 2 minutes)
    setTimeout(async () => {
      if (this.active) await this.predict();
    }, 120000); // 2 minutes

    // Then run predictions every 15 minutes
    setInterval(async () => {
      if (!this.active) return;
      await this.predict();
    }, 15 * 60 * 1000); // 15 minutes
    
    console.log('   ⏰ Cycles: Initial (2min) → Every 15 minutes');
  }

  /**
   * Get insights
   */
  getInsights(): {
    totalPredictions: number;
    activeTrends: number;
    highConfidencePredictions: Prediction[];
    accuracyScore: number;
    recentValidations: number;
  } {
    const highConfidence = Array.from(this.predictions.values())
      .filter(p => p.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return {
      totalPredictions: this.predictions.size,
      activeTrends: this.trends.size,
      highConfidencePredictions: highConfidence,
      accuracyScore: this.accuracyScore,
      recentValidations: this.validations.length
    };
  }

  /**
   * Generate ID
   */
  private generateId(name: string): string {
    return name.toLowerCase()
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
      predictions: this.predictions.size,
      trends: this.trends.size,
      validations: this.validations.length,
      accuracyScore: Math.round(this.accuracyScore * 100),
      aiProvider: this.openai ? 'OpenAI GPT-4o-mini' : 'None'
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const predictiveIntelligence = new PredictiveIntelligenceSystem();
