/**
 * Nucleus 2.0 - Core Brain
 * Built from absolute zero - no templates, no legacy code
 * 
 * Purpose: Executive Smart Brain for Surooh Empire
 * Receives, thinks, decides, and executes
 * 
 * Enhanced with Hunyuan-A13B for advanced AI reasoning
 */

import { EventEmitter } from 'events';
import { HunyuanProvider } from '../../server/ai/providers/hunyuan';

// ============================================
// Types & Interfaces
// ============================================

interface NucleusRequest {
  id: string;
  input: string;
  user?: string;
  context?: Record<string, any>;
  timestamp: Date;
}

interface NucleusResponse {
  id: string;
  requestId: string;
  decision: 'respond' | 'execute' | 'delegate' | 'learn' | 'store';
  data: any;
  confidence: number;
  timestamp: Date;
}

interface ModuleInterface {
  name: string;
  execute: (task: any) => Promise<any>;
  status: () => { active: boolean; health: number };
}

interface NucleusStatus {
  active: boolean;
  modules: number;
  processed: number;
  uptime: number;
  performance: {
    avgResponseTime: number;
    avgConfidence: number;
    successRate: number;
  };
}

// ============================================
// Nucleus Core Class
// ============================================

export class Nucleus extends EventEmitter {
  private active: boolean = false;
  private modules: Map<string, ModuleInterface> = new Map();
  private requestQueue: NucleusRequest[] = [];
  private processedCount: number = 0;
  private startTime: Date | null = null;
  
  // Performance tracking (rolling window of last 100 requests)
  private responseTimes: number[] = [];
  private confidenceScores: number[] = [];
  private successFlags: boolean[] = [];
  
  // AI Provider for advanced reasoning
  private hunyuan: HunyuanProvider | null = null;
  private aiMode: 'basic' | 'enhanced' = 'basic'; // Switch between basic NLP and AI-powered thinking

  constructor() {
    super();
    
    // Initialize Hunyuan if API key available
    try {
      if (process.env.SILICONFLOW_API_KEY) {
        this.hunyuan = new HunyuanProvider();
        this.aiMode = 'enhanced';
        console.log('🧠 [Nucleus] Hunyuan-A13B AI brain initialized - Enhanced thinking enabled');
      } else {
        console.log('🧠 [Nucleus] Running in basic mode - Set SILICONFLOW_API_KEY for AI enhancement');
      }
    } catch (error: any) {
      console.error('❌ [Nucleus] Failed to initialize Hunyuan:', error.message);
      console.log('🧠 [Nucleus] Falling back to basic NLP mode');
    }
  }

  /**
   * Activate the nucleus
   * Idempotent - safe to call multiple times
   */
  async activate(): Promise<void> {
    if (this.active) {
      console.log('🧠 Nucleus already active - skipping activation');
      return;
    }

    this.active = true;
    this.startTime = new Date();
    this.emit('nucleus:activated', { timestamp: this.startTime });
    
    console.log('🧠 Nucleus 2.0 activated - Executive Brain ready');
  }

  /**
   * Deactivate the nucleus
   */
  async deactivate(): Promise<void> {
    if (!this.active) {
      throw new Error('Nucleus already inactive');
    }

    this.active = false;
    this.emit('nucleus:deactivated', { timestamp: new Date() });
    
    console.log('🧠 Nucleus 2.0 deactivated');
  }

  /**
   * Process a request (main thinking function) with performance tracking
   */
  async process(input: string, context?: Record<string, any>, user?: string): Promise<NucleusResponse> {
    if (!this.active) {
      throw new Error('Nucleus is not active');
    }

    const startTime = Date.now();

    const request: NucleusRequest = {
      id: this.generateId(),
      input,
      user,
      context,
      timestamp: new Date()
    };

    this.emit('request:received', request);

    try {
      // Process the request
      const response = await this.think(request);
      
      // Track performance metrics
      const responseTime = Date.now() - startTime;
      this.trackPerformance(responseTime, response.confidence, true);
      
      this.processedCount++;
      this.emit('request:processed', response);

      return response;
    } catch (error) {
      // Track failed request
      const responseTime = Date.now() - startTime;
      this.trackPerformance(responseTime, 0, false);
      throw error;
    }
  }

  /**
   * Track performance metrics (rolling window)
   */
  private trackPerformance(responseTime: number, confidence: number, success: boolean): void {
    // Keep last 100 response times
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    // Keep last 100 confidence scores
    this.confidenceScores.push(confidence);
    if (this.confidenceScores.length > 100) {
      this.confidenceScores.shift();
    }

    // Keep last 100 success flags
    this.successFlags.push(success);
    if (this.successFlags.length > 100) {
      this.successFlags.shift();
    }
  }

  /**
   * Core thinking logic (now with AI enhancement)
   */
  private async think(request: NucleusRequest): Promise<NucleusResponse> {
    // Analyze the input (with AI enhancement if available)
    const analysis = await this.analyzeInput(request.input, request.context);
    
    // Make a decision (with AI reasoning if available)
    const decision = await this.decide(analysis, request.context);
    
    // Create response
    const response: NucleusResponse = {
      id: this.generateId(),
      requestId: request.id,
      decision: decision.action,
      data: decision.data,
      confidence: decision.confidence,
      timestamp: new Date()
    };

    // Execute if needed
    if (decision.action === 'execute' && decision.moduleTarget) {
      const module = this.modules.get(decision.moduleTarget);
      if (module) {
        const result = await module.execute(decision.data);
        response.data = { ...response.data, result };
      }
    }

    return response;
  }

  /**
   * Enhanced Input Analysis with AI-powered understanding
   * Switches between basic NLP and AI reasoning based on availability
   */
  private async analyzeInput(
    input: string, 
    context?: Record<string, any>
  ): Promise<{ type: string; intent: string; entities: string[]; reasoning?: string }> {
    
    // If AI mode is enabled, use Hunyuan for advanced understanding
    if (this.aiMode === 'enhanced' && this.hunyuan) {
      try {
        const aiAnalysis = await this.aiAnalyzeInput(input, context);
        console.log(`🧠 [Nucleus] AI-powered analysis: ${aiAnalysis.type}/${aiAnalysis.intent}`);
        return aiAnalysis;
      } catch (error: any) {
        console.warn(`⚠️ [Nucleus] AI analysis failed, falling back to basic NLP:`, error.message);
        // Fall through to basic analysis
      }
    }
    
    // Basic NLP pattern matching (fallback)
    return this.basicAnalyzeInput(input);
  }

  /**
   * AI-Powered Input Analysis using Hunyuan
   */
  private async aiAnalyzeInput(
    input: string,
    context?: Record<string, any>
  ): Promise<{ type: string; intent: string; entities: string[]; reasoning: string }> {
    if (!this.hunyuan) {
      throw new Error('Hunyuan not available');
    }

    const systemPrompt = `أنت محلل ذكي لنظام Nucleus. حلل الطلب وحدد:
1. النوع (type): "command" أو "query"
2. القصد (intent): الإجراء المطلوب (مثل: send, search, analyze, create, delete, update, calculate, execute, question, status, info)
3. الكيانات (entities): أي أرقام، إيميلات، أسماء، تواريخ مذكورة
4. التفكير (reasoning): سبب تصنيفك

أجب بصيغة JSON فقط:
{
  "type": "command" أو "query",
  "intent": "الإجراء",
  "entities": ["كيان1", "كيان2"],
  "reasoning": "السبب"
}`;

    const contextStr = context ? `\nالسياق: ${JSON.stringify(context)}` : '';
    const userPrompt = `الطلب: "${input}"${contextStr}`;

    const response = await this.hunyuan.generateResponse(userPrompt, {
      systemPrompt,
      maxTokens: 500,
      temperature: 0.3, // Lower temperature for structured analysis
      thinkingBudget: 1024
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type || 'query',
        intent: parsed.intent || 'unknown',
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        reasoning: parsed.reasoning || response
      };
    } catch (parseError: any) {
      console.warn('⚠️ [Nucleus] Failed to parse AI analysis, using fallback');
      throw parseError;
    }
  }

  /**
   * Basic NLP pattern matching (original method)
   */
  private basicAnalyzeInput(input: string): { type: string; intent: string; entities: string[] } {
    const lower = input.toLowerCase();
    const entities: string[] = [];
    
    // Command patterns (Arabic & English)
    const commandPatterns = {
      send: /أرسل|send|ابعث|وجه/,
      calculate: /احسب|calculate|عد|حساب/,
      create: /انشئ|create|أضف|add|اعمل/,
      delete: /احذف|delete|امسح|remove/,
      update: /حدث|update|عدل|modify/,
      search: /ابحث|search|دور|find/,
      analyze: /حلل|analyze|فحص|check/,
      execute: /نفذ|execute|شغل|run/,
    };

    // Query patterns
    const queryPatterns = {
      question: /ما|what|كيف|how|متى|when|أين|where|لماذا|why|\?/,
      status: /حالة|status|وضع|state/,
      info: /معلومات|information|تفاصيل|details/,
    };

    // Entity extraction (numbers, dates, emails, etc.)
    const numberMatch = input.match(/\d+/g);
    if (numberMatch) entities.push(...numberMatch);

    const emailMatch = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) entities.push(emailMatch[0]);

    // Determine type and intent
    let type = 'query';
    let intent = 'unknown';

    // Check command patterns
    for (const [key, pattern] of Object.entries(commandPatterns)) {
      if (pattern.test(lower)) {
        type = 'command';
        intent = key;
        break;
      }
    }

    // If not a command, check query patterns
    if (type === 'query') {
      for (const [key, pattern] of Object.entries(queryPatterns)) {
        if (pattern.test(lower)) {
          intent = key;
          break;
        }
      }
    }

    return { type, intent, entities };
  }

  /**
   * Enhanced Decision Making with AI-powered reasoning
   * Uses Hunyuan for complex decision-making when available
   */
  private async decide(
    analysis: { type: string; intent: string; entities: string[]; reasoning?: string },
    context?: Record<string, any>
  ): Promise<{ action: NucleusResponse['decision']; confidence: number; data: any; moduleTarget?: string }> {
    
    // For complex or ambiguous requests, use AI-powered decision making
    if (this.aiMode === 'enhanced' && this.hunyuan && (analysis.intent === 'unknown' || analysis.reasoning)) {
      try {
        const aiDecision = await this.aiDecide(analysis, context);
        console.log(`🧠 [Nucleus] AI-powered decision: ${aiDecision.action} (confidence: ${Math.round(aiDecision.confidence * 100)}%)`);
        return aiDecision;
      } catch (error: any) {
        console.warn(`⚠️ [Nucleus] AI decision failed, using basic logic:`, error.message);
        // Fall through to basic decision
      }
    }

    // Basic decision logic (original)
    return this.basicDecide(analysis, context);
  }

  /**
   * AI-Powered Decision Making using Hunyuan
   */
  private async aiDecide(
    analysis: { type: string; intent: string; entities: string[]; reasoning?: string },
    context?: Record<string, any>
  ): Promise<{ action: NucleusResponse['decision']; confidence: number; data: any; moduleTarget?: string }> {
    if (!this.hunyuan) {
      throw new Error('Hunyuan not available');
    }

    const systemPrompt = `أنت محرك قرارات ذكي لنظام Nucleus. بناءً على التحليل، قرر:
1. الإجراء (action): "respond" (رد)، "execute" (تنفيذ)، "delegate" (تفويض)، "learn" (تعلم)، "store" (حفظ)
2. الثقة (confidence): 0.0 إلى 1.0
3. البيانات (data): معلومات إضافية للإجراء
4. الوحدة المستهدفة (moduleTarget): إذا كان الإجراء "execute" (مثل: mail-module)

أجب بصيغة JSON فقط:
{
  "action": "الإجراء",
  "confidence": 0.85,
  "data": { "key": "value" },
  "moduleTarget": "اسم الوحدة أو null"
}`;

    const analysisStr = JSON.stringify(analysis, null, 2);
    const contextStr = context ? JSON.stringify(context, null, 2) : 'لا يوجد';
    const userPrompt = `التحليل:\n${analysisStr}\n\nالسياق:\n${contextStr}`;

    const response = await this.hunyuan.generateResponse(userPrompt, {
      systemPrompt,
      maxTokens: 500,
      temperature: 0.4,
      thinkingBudget: 2048 // More thinking for decisions
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate action
      const validActions = ['respond', 'execute', 'delegate', 'learn', 'store'];
      const action = validActions.includes(parsed.action) ? parsed.action : 'respond';
      
      return {
        action: action as NucleusResponse['decision'],
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        data: parsed.data || { aiReasoning: response },
        moduleTarget: parsed.moduleTarget || undefined
      };
    } catch (parseError: any) {
      console.warn('⚠️ [Nucleus] Failed to parse AI decision');
      throw parseError;
    }
  }

  /**
   * Basic rule-based decision making (original method)
   */
  private basicDecide(
    analysis: { type: string; intent: string; entities: string[] },
    context?: Record<string, any>
  ): { action: NucleusResponse['decision']; confidence: number; data: any; moduleTarget?: string } {
    
    // Calculate base confidence based on intent clarity
    const baseConfidence = this.calculateConfidence(analysis, context);

    // Command decision logic
    if (analysis.type === 'command') {
      const commandActions: Record<string, { target?: string; confidence: number }> = {
        send: { target: 'mail-module', confidence: 0.9 },
        calculate: { confidence: 0.85 },
        create: { confidence: 0.8 },
        delete: { confidence: 0.9 },
        update: { confidence: 0.85 },
        search: { confidence: 0.8 },
        analyze: { confidence: 0.85 },
        execute: { confidence: 0.75 },
      };

      const action = commandActions[analysis.intent];
      if (action) {
        return {
          action: 'execute',
          confidence: Math.min(baseConfidence * action.confidence, 0.95),
          data: { task: analysis.intent, entities: analysis.entities, context },
          moduleTarget: action.target
        };
      }
    }

    // Query decision logic
    if (analysis.type === 'query') {
      const queryConfidence = analysis.intent !== 'unknown' ? 0.85 : 0.6;
      return {
        action: 'respond',
        confidence: Math.min(baseConfidence * queryConfidence, 0.9),
        data: { 
          queryType: analysis.intent, 
          entities: analysis.entities,
          context 
        }
      };
    }

    // Default: learn from unknown patterns
    return {
      action: 'learn',
      confidence: 0.4,
      data: { input: analysis, context }
    };
  }

  /**
   * Calculate confidence based on analysis quality and context
   */
  private calculateConfidence(
    analysis: { type: string; intent: string; entities: string[] },
    context?: Record<string, any>
  ): number {
    let confidence = 0.5; // base

    // Boost for known intent
    if (analysis.intent !== 'unknown') confidence += 0.3;

    // Boost for extracted entities
    if (analysis.entities.length > 0) confidence += 0.1;

    // Boost for context availability
    if (context && Object.keys(context).length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Register a module
   */
  registerModule(name: string, module: ModuleInterface): void {
    if (this.modules.has(name)) {
      throw new Error(`Module ${name} already registered`);
    }

    this.modules.set(name, module);
    this.emit('module:registered', { name, timestamp: new Date() });
    
    console.log(`✅ Module registered: ${name}`);
  }

  /**
   * Toggle AI Mode (basic NLP vs AI-enhanced thinking)
   */
  setAIMode(mode: 'basic' | 'enhanced'): void {
    if (mode === 'enhanced' && !this.hunyuan) {
      console.warn('⚠️ [Nucleus] Cannot enable enhanced mode - Hunyuan not available');
      return;
    }
    this.aiMode = mode;
    console.log(`🧠 [Nucleus] AI mode set to: ${mode}`);
  }

  /**
   * Get current AI mode
   */
  getAIMode(): 'basic' | 'enhanced' {
    return this.aiMode;
  }

  /**
   * Get nucleus status with performance metrics
   */
  getStatus(): NucleusStatus & { aiMode: 'basic' | 'enhanced'; aiProvider: string } {
    const uptime = this.startTime 
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    // Calculate performance metrics
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    const avgConfidence = this.confidenceScores.length > 0
      ? this.confidenceScores.reduce((a, b) => a + b, 0) / this.confidenceScores.length
      : 0;

    const successRate = this.successFlags.length > 0
      ? (this.successFlags.filter(f => f).length / this.successFlags.length) * 100
      : 0;

    return {
      active: this.active,
      modules: this.modules.size,
      processed: this.processedCount,
      uptime,
      aiMode: this.aiMode,
      aiProvider: this.hunyuan ? 'Hunyuan-A13B' : 'None',
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        avgConfidence: Math.round(avgConfidence * 100),
        successRate: Math.round(successRate)
      }
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `nucleus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================
// Export singleton instance
// ============================================

export const nucleus = new Nucleus();
