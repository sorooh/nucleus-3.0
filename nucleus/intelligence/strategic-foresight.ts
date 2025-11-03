/**
 * STRATEGIC FORESIGHT LAYER - طبقة البصيرة الاستراتيجية
 * 
 * Multi-horizon scenario planning and risk analysis:
 * - Generates future scenarios for different time horizons
 * - Analyzes risks and opportunities
 * - Provides strategic recommendations
 * - Tracks prediction accuracy over time
 * 
 * Features:
 * - Multiple Horizons: 3, 6, 12+ month forecasts
 * - Scenario Generation: Multiple possible futures
 * - Risk Budget: Acceptable risk levels
 * - Impact Assessment: Evaluate potential outcomes
 */

import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

interface ForesightConfig {
  horizons: number[];
  scenarios: number;
  riskBudget: number;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  impact: number;
  horizon: number;
  keyFactors: string[];
  opportunities: string[];
  risks: string[];
}

interface RiskAssessment {
  id: string;
  type: string;
  severity: number;
  likelihood: number;
  mitigation: string[];
  contingency: string[];
}

interface StrategicForecast {
  id: string;
  timestamp: Date;
  question: string;
  horizon: number;
  scenarios: Scenario[];
  risks: RiskAssessment[];
  recommendations: string[];
  confidence: number;
  metadata: any;
}

interface PredictionValidation {
  forecastId: string;
  scenarioId: string;
  actualOutcome: string;
  accuracy: number;
  timestamp: Date;
}

class StrategicForesightLayer extends EventEmitter {
  private active: boolean = false;
  private config: ForesightConfig = {
    horizons: [3, 6, 12],
    scenarios: 5,
    riskBudget: 0.2
  };
  private forecasts: StrategicForecast[] = [];
  private validations: PredictionValidation[] = [];
  private aiProvider: Anthropic | null = null;

  activate(params?: Partial<ForesightConfig>): void {
    if (this.active) {
      console.log('[StrategicForesight] Already active');
      return;
    }

    if (params) {
      this.config = { ...this.config, ...params };
    }

    this.initializeAI();
    this.active = true;

    console.log('🔮 [StrategicForesight] Future forecasting activated');
    console.log(`   • Horizons: ${this.config.horizons.join(', ')} months`);
    console.log(`   • Scenarios per forecast: ${this.config.scenarios}`);
    console.log(`   • Risk Budget: ${this.config.riskBudget}`);

    this.emit('activated', this.config);
  }

  private initializeAI(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.aiProvider = new Anthropic({ apiKey });
      console.log('[StrategicForesight] ✅ AI provider initialized');
    } else {
      console.log('[StrategicForesight] ⚠️ No AI provider (ANTHROPIC_API_KEY missing)');
    }
  }

  async generateForecast(question: string, horizon?: number, metadata: any = {}): Promise<StrategicForecast> {
    if (!this.active) {
      throw new Error('Strategic Foresight not active');
    }

    const selectedHorizon = horizon || this.config.horizons[0];

    try {
      const forecast = await this.performForesight(question, selectedHorizon, metadata);
      
      this.forecasts.push(forecast);
      
      if (this.forecasts.length > 50) {
        this.forecasts.shift();
      }

      this.emit('forecast-generated', {
        id: forecast.id,
        horizon: forecast.horizon,
        scenarios: forecast.scenarios.length
      });

      console.log(`🔮 [StrategicForesight] Generated ${forecast.scenarios.length} scenarios for ${horizon}-month horizon`);

      return forecast;
    } catch (error: any) {
      console.error('[StrategicForesight] Forecast generation failed:', error.message);
      throw error;
    }
  }

  private async performForesight(
    question: string,
    horizon: number,
    metadata: any
  ): Promise<StrategicForecast> {
    
    if (!this.aiProvider) {
      return this.getBasicForecast(question, horizon, metadata);
    }

    const prompt = `As a strategic foresight analyst, analyze this question and generate future scenarios:

Question: ${question}
Time Horizon: ${horizon} months from now
Risk Budget: ${this.config.riskBudget} (acceptable risk level)

Generate ${this.config.scenarios} distinct scenarios for the next ${horizon} months.

For each scenario, provide:
1. Name (brief, descriptive)
2. Description (what happens in this future)
3. Probability (0-1, how likely this scenario is)
4. Impact (0-1, how significant the impact would be)
5. Key Factors (what drives this scenario)
6. Opportunities (positive aspects to leverage)
7. Risks (potential challenges)

Also provide:
- Overall risk assessment for each major risk
- Strategic recommendations

Format as JSON:
{
  "scenarios": [
    {
      "name": "Scenario Name",
      "description": "What happens...",
      "probability": 0.3,
      "impact": 0.7,
      "keyFactors": ["factor1", "factor2"],
      "opportunities": ["opp1", "opp2"],
      "risks": ["risk1", "risk2"]
    }
  ],
  "risks": [
    {
      "type": "market volatility",
      "severity": 0.7,
      "likelihood": 0.5,
      "mitigation": ["strategy1"],
      "contingency": ["plan1"]
    }
  ],
  "recommendations": ["rec1", "rec2"],
  "confidence": 0.75
}`;

    const response = await this.aiProvider.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
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
    } catch (error) {
      console.error('[StrategicForesight] Failed to parse AI response');
      parsed = null;
    }

    if (!parsed) {
      return this.getBasicForecast(question, horizon, metadata);
    }

    const forecastId = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const scenarios: Scenario[] = (parsed.scenarios || []).map((s: any, idx: number) => ({
      id: `${forecastId}_scenario_${idx}`,
      name: s.name || `Scenario ${idx + 1}`,
      description: s.description || '',
      probability: s.probability || 0.5,
      impact: s.impact || 0.5,
      horizon,
      keyFactors: s.keyFactors || [],
      opportunities: s.opportunities || [],
      risks: s.risks || []
    }));

    const risks: RiskAssessment[] = (parsed.risks || []).map((r: any, idx: number) => ({
      id: `${forecastId}_risk_${idx}`,
      type: r.type || 'unknown',
      severity: r.severity || 0.5,
      likelihood: r.likelihood || 0.5,
      mitigation: r.mitigation || [],
      contingency: r.contingency || []
    }));

    return {
      id: forecastId,
      timestamp: new Date(),
      question,
      horizon,
      scenarios,
      risks,
      recommendations: parsed.recommendations || [],
      confidence: parsed.confidence || 0.5,
      metadata
    };
  }

  private getBasicForecast(question: string, horizon: number, metadata: any): StrategicForecast {
    const forecastId = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: forecastId,
      timestamp: new Date(),
      question,
      horizon,
      scenarios: [
        {
          id: `${forecastId}_scenario_1`,
          name: 'Base Case',
          description: 'Current trends continue with minor variations',
          probability: 0.6,
          impact: 0.5,
          horizon,
          keyFactors: ['market stability', 'no major disruptions'],
          opportunities: ['steady growth'],
          risks: ['unexpected changes']
        }
      ],
      risks: [],
      recommendations: ['Monitor key indicators', 'Maintain flexibility'],
      confidence: 0.5,
      metadata
    };
  }

  async validatePrediction(
    forecastId: string,
    scenarioId: string,
    actualOutcome: string
  ): Promise<number> {
    const forecast = this.forecasts.find(f => f.id === forecastId);
    if (!forecast) {
      throw new Error('Forecast not found');
    }

    const scenario = forecast.scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    let accuracy = 0.5;

    if (this.aiProvider) {
      try {
        const prompt = `Compare the predicted scenario with the actual outcome and rate accuracy:

Predicted Scenario:
Name: ${scenario.name}
Description: ${scenario.description}
Expected Probability: ${scenario.probability}

Actual Outcome:
${actualOutcome}

Rate the accuracy of this prediction on a scale of 0 to 1, where:
- 1.0 means the prediction was highly accurate
- 0.5 means partially accurate
- 0.0 means completely inaccurate

Return only the accuracy score as a number between 0 and 1.`;

        const response = await this.aiProvider.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        const content = response.content[0];
        const text = content.type === 'text' ? content.text : '';
        const match = text.match(/([0-1](?:\.\d+)?)/);
        
        if (match) {
          accuracy = parseFloat(match[1]);
        }
      } catch (error: any) {
        console.error('[StrategicForesight] Validation failed:', error.message);
      }
    }

    const validation: PredictionValidation = {
      forecastId,
      scenarioId,
      actualOutcome: actualOutcome.substring(0, 500),
      accuracy,
      timestamp: new Date()
    };

    this.validations.push(validation);
    
    if (this.validations.length > 100) {
      this.validations.shift();
    }

    this.emit('prediction-validated', {
      forecastId,
      scenarioId,
      accuracy
    });

    console.log(`🔮 [StrategicForesight] Prediction accuracy: ${Math.round(accuracy * 100)}%`);

    return accuracy;
  }

  getStatus(): any {
    const avgAccuracy = this.validations.length > 0
      ? this.validations.reduce((sum, v) => sum + v.accuracy, 0) / this.validations.length
      : null;

    const recentForecasts = this.forecasts.slice(-10);

    return {
      active: this.active,
      config: this.config,
      totalForecasts: this.forecasts.length,
      recentForecasts: recentForecasts.map(f => ({
        id: f.id,
        question: f.question.substring(0, 100),
        horizon: f.horizon,
        scenarios: f.scenarios.length,
        confidence: f.confidence,
        timestamp: f.timestamp
      })),
      validations: {
        total: this.validations.length,
        averageAccuracy: avgAccuracy ? Math.round(avgAccuracy * 100) / 100 : null
      }
    };
  }

  getForecast(id: string): StrategicForecast | null {
    return this.forecasts.find(f => f.id === id) || null;
  }

  getRecentForecasts(limit: number = 10): StrategicForecast[] {
    return this.forecasts.slice(-limit);
  }

  getValidations(limit: number = 20): PredictionValidation[] {
    return this.validations.slice(-limit);
  }

  configure(params: Partial<ForesightConfig>): void {
    this.config = { ...this.config, ...params };
    console.log(`[StrategicForesight] Configuration updated:`, this.config);
  }
}

export const strategicForesight = new StrategicForesightLayer();
