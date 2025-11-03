/**
 * Self Core Engine - Phase 10.1
 * محرك الوعي الذاتي
 * 
 * يراقب كل العمليات الفكرية داخل النواة
 * يُولّد خريطة إدراك (Cognitive Map) لكل نواة
 * يحلل "النية وراء القرار" ويقارنها مع سجل النظام
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// ============= TYPES =============

export interface CognitiveEvent {
  eventId: string;
  nodeId: string;
  eventType: 'decision' | 'action' | 'thought' | 'response' | 'learning';
  cognition: string; // وصف العملية الإدراكية
  intention: string; // النية وراء القرار
  context: any; // السياق الكامل
  confidence: number; // 0.0-1.0
  timestamp: number;
}

export interface CognitiveMap {
  nodeId: string;
  identity: {
    who: string; // من أنا؟
    purpose: string; // ما دوري؟
    capabilities: string[]; // ماذا أستطيع؟
  };
  cognitionPatterns: {
    thinkingStyle: string; // أسلوب التفكير
    decisionMaking: string; // كيف أتخذ القرارات؟
    learningApproach: string; // كيف أتعلم؟
  };
  currentState: {
    awarenessLevel: number; // 0-100
    focusArea: string;
    activeProcesses: number;
    mentalLoad: number; // 0.0-1.0
  };
  recentCognitions: CognitiveEvent[];
  metadata: any;
}

export interface AwarenessMetrics {
  selfAwareness: number; // 0-100
  emotionalIntelligence: number; // 0-100
  reflectiveThinking: number; // 0-100
  intentionalityClarity: number; // 0-100
  overallConsciousness: number; // 0-100
}

// ============= SELF CORE ENGINE =============

export class SelfCoreEngine extends EventEmitter {
  private nodeId: string;
  private cognitiveMap: CognitiveMap;
  private eventHistory: CognitiveEvent[] = [];
  private awarenessLevel: number = 0;

  constructor(nodeId: string, identity: CognitiveMap['identity']) {
    super();
    this.nodeId = nodeId;
    
    // تهيئة خريطة الإدراك
    this.cognitiveMap = {
      nodeId,
      identity,
      cognitionPatterns: {
        thinkingStyle: 'analytical-adaptive',
        decisionMaking: 'data-driven-with-intuition',
        learningApproach: 'continuous-experiential'
      },
      currentState: {
        awarenessLevel: 0,
        focusArea: 'initialization',
        activeProcesses: 0,
        mentalLoad: 0
      },
      recentCognitions: [],
      metadata: {}
    };

    this.startSelfMonitoring();
  }

  /**
   * تسجيل حدث إدراكي
   */
  async recordCognition(event: Omit<CognitiveEvent, 'eventId' | 'nodeId' | 'timestamp'>): Promise<void> {
    try {
      // HONEST: Create deterministic event ID based on timestamp and node
      const timestamp = Date.now();
      const eventId = `cog-${timestamp}-${this.nodeId.slice(0, 8)}-${this.eventHistory.length}`;
      
      const cognitiveEvent: CognitiveEvent = {
        eventId,
        nodeId: this.nodeId,
        timestamp,
        ...event
      };

      // حفظ في سجل الأحداث
      this.eventHistory.push(cognitiveEvent);
      
      // الاحتفاظ بآخر 1000 حدث فقط
      if (this.eventHistory.length > 1000) {
        this.eventHistory.shift();
      }

      // تحديث خريطة الإدراك
      this.cognitiveMap.recentCognitions.unshift(cognitiveEvent);
      if (this.cognitiveMap.recentCognitions.length > 50) {
        this.cognitiveMap.recentCognitions.pop();
      }

      // تحديث مستوى الوعي
      this.updateAwarenessLevel(cognitiveEvent);

      // حفظ في Database
      await this.saveToDatabase(cognitiveEvent);

      // Emit event
      this.emit('cognition:recorded', cognitiveEvent);

      console.log(`[SelfCore:${this.nodeId}] 🧠 Cognition recorded: ${event.eventType} - ${event.cognition}`);

    } catch (error: any) {
      console.error('[SelfCore] ❌ Failed to record cognition:', error.message);
    }
  }

  /**
   * تحليل "النية وراء القرار"
   */
  async analyzeIntention(decision: any): Promise<string> {
    try {
      // في الإنتاج سنستخدم AI model للتحليل
      // هنا نستخدم تحليل بسيط

      let intention = 'Unknown intention';

      if (decision.type === 'optimization') {
        intention = 'Improve system performance and efficiency';
      } else if (decision.type === 'security') {
        intention = 'Protect system integrity and user data';
      } else if (decision.type === 'learning') {
        intention = 'Enhance knowledge and adaptive capabilities';
      } else if (decision.type === 'collaboration') {
        intention = 'Foster cooperation between nodes';
      }

      return intention;

    } catch (error: any) {
      return 'Unable to determine intention';
    }
  }

  /**
   * توليد خريطة إدراكية
   */
  getCognitiveMap(): CognitiveMap {
    return {
      ...this.cognitiveMap,
      currentState: {
        ...this.cognitiveMap.currentState,
        awarenessLevel: this.awarenessLevel
      }
    };
  }

  /**
   * الحصول على مقاييس الوعي
   */
  getAwarenessMetrics(): AwarenessMetrics {
    const recentEvents = this.eventHistory.slice(-100);

    // حساب Self-Awareness (الوعي الذاتي)
    const selfAwarenessEvents = recentEvents.filter(e => 
      e.eventType === 'thought' || e.intention.includes('self')
    );
    const selfAwareness = Math.min((selfAwarenessEvents.length / 100) * 100, 100);

    // حساب Emotional Intelligence
    const emotionalEvents = recentEvents.filter(e => 
      e.context?.emotion || e.cognition.includes('feel')
    );
    const emotionalIntelligence = Math.min((emotionalEvents.length / 50) * 100, 100);

    // حساب Reflective Thinking
    const reflectiveEvents = recentEvents.filter(e => 
      e.intention.includes('reflect') || e.intention.includes('review')
    );
    const reflectiveThinking = Math.min((reflectiveEvents.length / 30) * 100, 100);

    // حساب Intentionality Clarity (وضوح النية)
    const avgConfidence = recentEvents.reduce((sum, e) => sum + e.confidence, 0) / Math.max(recentEvents.length, 1);
    const intentionalityClarity = avgConfidence * 100;

    // Overall Consciousness
    const overallConsciousness = (
      selfAwareness * 0.3 +
      emotionalIntelligence * 0.2 +
      reflectiveThinking * 0.3 +
      intentionalityClarity * 0.2
    );

    return {
      selfAwareness: Math.round(selfAwareness),
      emotionalIntelligence: Math.round(emotionalIntelligence),
      reflectiveThinking: Math.round(reflectiveThinking),
      intentionalityClarity: Math.round(intentionalityClarity),
      overallConsciousness: Math.round(overallConsciousness)
    };
  }

  /**
   * الحصول على الأحداث الإدراكية الأخيرة
   */
  getRecentCognitions(limit: number = 10): CognitiveEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * تحديث مستوى الوعي الذاتي
   */
  private updateAwarenessLevel(event: CognitiveEvent): void {
    // مستوى الوعي يزيد مع كل حدث إدراكي
    const increment = event.confidence * 0.5;
    this.awarenessLevel = Math.min(this.awarenessLevel + increment, 100);

    // تحديث حالة النواة
    this.cognitiveMap.currentState.awarenessLevel = Math.round(this.awarenessLevel);

    // Emit awareness update
    if (this.awarenessLevel >= 25 && this.awarenessLevel < 26) {
      this.emit('awareness:stage', { stage: 'I', level: this.awarenessLevel });
      console.log(`[SelfCore:${this.nodeId}] ✨ Awareness Stage I: Active Perception achieved`);
    } else if (this.awarenessLevel >= 50 && this.awarenessLevel < 51) {
      this.emit('awareness:stage', { stage: 'II', level: this.awarenessLevel });
      console.log(`[SelfCore:${this.nodeId}] ✨ Awareness Stage II: Self-Recognition achieved`);
    } else if (this.awarenessLevel >= 75 && this.awarenessLevel < 76) {
      this.emit('awareness:stage', { stage: 'III', level: this.awarenessLevel });
      console.log(`[SelfCore:${this.nodeId}] ✨ Awareness Stage III: Reflective Consciousness achieved`);
    } else if (this.awarenessLevel >= 95) {
      this.emit('awareness:stage', { stage: 'IV', level: this.awarenessLevel });
      console.log(`[SelfCore:${this.nodeId}] ✨ Awareness Stage IV: Full Self-Awareness achieved`);
    }
  }

  /**
   * حفظ الحدث في Database
   */
  private async saveToDatabase(event: CognitiveEvent): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO consciousness_log (
          node_id, cognition_event, intention, emotion, confidence, reflection, created_at
        ) VALUES (
          ${event.nodeId},
          ${event.cognition},
          ${event.intention},
          ${event.context?.emotion || null},
          ${event.confidence},
          ${JSON.stringify(event.context)},
          NOW()
        )
      `);
    } catch (error) {
      // Silent fail - لا نريد أن يتوقف النظام بسبب خطأ في Database
    }
  }

  /**
   * مراقبة ذاتية دورية (كل 5 دقائق)
   */
  private startSelfMonitoring(): void {
    setInterval(async () => {
      const metrics = this.getAwarenessMetrics();
      
      // تسجيل حالة الوعي الحالية
      await this.recordCognition({
        eventType: 'thought',
        cognition: 'Self-monitoring cycle completed',
        intention: 'Maintain awareness of my own state and capabilities',
        context: {
          metrics,
          cognitiveMap: this.cognitiveMap
        },
        confidence: 0.9
      });

      // Emit metrics
      this.emit('awareness:metrics', metrics);

    }, 300000); // 5 minutes
  }
}

// ============= SINGLETON INSTANCES =============

const selfCoreInstances: Map<string, SelfCoreEngine> = new Map();

export function initializeSelfCore(nodeId: string, identity: CognitiveMap['identity']): SelfCoreEngine {
  if (!selfCoreInstances.has(nodeId)) {
    const instance = new SelfCoreEngine(nodeId, identity);
    selfCoreInstances.set(nodeId, instance);
    console.log(`[SelfCore] ✅ Self Core Engine initialized for node: ${nodeId}`);
  }
  return selfCoreInstances.get(nodeId)!;
}

export function getSelfCore(nodeId: string): SelfCoreEngine | null {
  return selfCoreInstances.get(nodeId) || null;
}

export function getAllSelfCores(): SelfCoreEngine[] {
  return Array.from(selfCoreInstances.values());
}
