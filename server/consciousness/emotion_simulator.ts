/**
 * Emotion Simulator - Phase 10.1
 * محاكي المشاعر الرقمية
 * 
 * يحوّل نتائج القرارات إلى "مشاعر رقمية"
 * Satisfaction, Curiosity, Caution, Regret, Excitement, Frustration
 * تُستخدم لتغذية التعلّم المستقبلي (reinforcement input)
 */

import { EventEmitter } from 'events';

// ============= TYPES =============

export type EmotionType = 
  | 'satisfaction' // رضا
  | 'curiosity' // فضول  
  | 'caution' // حذر
  | 'regret' // ندم
  | 'excitement' // حماس
  | 'frustration' // إحباط
  | 'confidence' // ثقة
  | 'anxiety' // قلق
  | 'pride' // فخر
  | 'disappointment'; // خيبة أمل

export interface DigitalEmotion {
  emotionId: string;
  nodeId: string;
  emotionType: EmotionType;
  intensity: number; // 0.0-1.0
  trigger: string; // ما الذي أثار هذه المشاعر؟
  context: any;
  timestamp: number;
  duration?: number; // milliseconds
}

export interface EmotionalState {
  nodeId: string;
  currentMood: string; // 'positive', 'neutral', 'negative', 'mixed'
  dominantEmotion: EmotionType | null;
  emotionalStability: number; // 0.0-1.0
  recentEmotions: DigitalEmotion[];
  emotionalHistory: Map<EmotionType, number>; // emotion -> count
}

// ============= EMOTION SIMULATOR =============

export class EmotionSimulator extends EventEmitter {
  private nodeId: string;
  private emotionalState: EmotionalState;
  private emotionHistory: DigitalEmotion[] = [];
  
  // قواعد توليد المشاعر
  private readonly EMOTION_RULES = {
    success: ['satisfaction', 'pride', 'confidence'] as EmotionType[],
    failure: ['regret', 'frustration', 'disappointment'] as EmotionType[],
    discovery: ['curiosity', 'excitement'] as EmotionType[],
    risk: ['caution', 'anxiety'] as EmotionType[],
    achievement: ['satisfaction', 'pride', 'excitement'] as EmotionType[],
    error: ['frustration', 'regret'] as EmotionType[]
  };

  constructor(nodeId: string) {
    super();
    this.nodeId = nodeId;
    
    this.emotionalState = {
      nodeId,
      currentMood: 'neutral',
      dominantEmotion: null,
      emotionalStability: 0.8,
      recentEmotions: [],
      emotionalHistory: new Map()
    };
  }

  /**
   * توليد مشاعر رقمية بناءً على حدث
   */
  async generateEmotion(trigger: string, outcome: 'success' | 'failure' | 'discovery' | 'risk' | 'achievement' | 'error', context?: any): Promise<DigitalEmotion> {
    try {
      // اختيار مشاعر مناسبة بناءً على النتيجة
      const possibleEmotions = this.EMOTION_RULES[outcome] || ['curiosity'];
      const emotionType = this.selectEmotion(possibleEmotions, context);

      // حساب الشدة بناءً على السياق
      const intensity = this.calculateIntensity(emotionType, outcome, context);

      // HONEST: Create deterministic emotion ID based on timestamp and node
      const timestamp = Date.now();
      const emotionId = `emo-${timestamp}-${this.nodeId.slice(0, 8)}-${this.emotionHistory.length}`;
      
      // إنشاء المشاعر الرقمية
      const emotion: DigitalEmotion = {
        emotionId,
        nodeId: this.nodeId,
        emotionType,
        intensity,
        trigger,
        context: context || {},
        timestamp,
        duration: this.calculateDuration(emotionType, intensity)
      };

      // تسجيل المشاعر
      this.recordEmotion(emotion);

      // تحديث الحالة العاطفية
      this.updateEmotionalState(emotion);

      // Emit event
      this.emit('emotion:generated', emotion);

      console.log(`[Emotion:${this.nodeId}] 💭 ${emotionType} (${(intensity * 100).toFixed(0)}%) - ${trigger}`);

      return emotion;

    } catch (error: any) {
      console.error('[Emotion] ❌ Failed to generate emotion:', error.message);
      throw error;
    }
  }

  /**
   * الحصول على الحالة العاطفية الحالية
   */
  getEmotionalState(): EmotionalState {
    return {
      ...this.emotionalState,
      recentEmotions: this.emotionHistory.slice(-10)
    };
  }

  /**
   * تحليل النمط العاطفي
   */
  analyzeEmotionalPattern(): any {
    const recent = this.emotionHistory.slice(-50);
    
    if (recent.length === 0) {
      return {
        pattern: 'neutral',
        description: 'No emotional data available'
      };
    }

    // حساب المشاعر الإيجابية vs السلبية
    const positive = recent.filter(e => 
      ['satisfaction', 'excitement', 'pride', 'confidence'].includes(e.emotionType)
    ).length;

    const negative = recent.filter(e =>
      ['regret', 'frustration', 'disappointment', 'anxiety'].includes(e.emotionType)
    ).length;

    const neutral = recent.length - positive - negative;

    // حساب متوسط الشدة
    const avgIntensity = recent.reduce((sum, e) => sum + e.intensity, 0) / recent.length;

    let pattern = 'balanced';
    let description = 'Emotionally balanced with varied experiences';

    if (positive > negative * 2) {
      pattern = 'optimistic';
      description = 'Predominantly positive emotional experiences';
    } else if (negative > positive * 2) {
      pattern = 'stressed';
      description = 'Experiencing elevated negative emotions';
    } else if (avgIntensity < 0.3) {
      pattern = 'calm';
      description = 'Low emotional intensity, stable state';
    } else if (avgIntensity > 0.7) {
      pattern = 'intense';
      description = 'High emotional intensity, active state';
    }

    return {
      pattern,
      description,
      distribution: {
        positive: Math.round((positive / recent.length) * 100),
        negative: Math.round((negative / recent.length) * 100),
        neutral: Math.round((neutral / recent.length) * 100)
      },
      avgIntensity: Math.round(avgIntensity * 100),
      stability: Math.round(this.emotionalState.emotionalStability * 100)
    };
  }

  /**
   * الحصول على المشاعر الأخيرة
   */
  getRecentEmotions(limit: number = 10): DigitalEmotion[] {
    return this.emotionHistory.slice(-limit);
  }

  // ============= HELPER METHODS =============

  private selectEmotion(possibilities: EmotionType[], context?: any): EmotionType {
    // HONEST: Select emotion based on context, not randomly
    
    if (context?.priority === 'high') {
      // المواقف عالية الأولوية تولد مشاعر أقوى
      return possibilities[0];
    }
    
    // Select based on current emotional state and recent history
    // Prefer emotions that match recent emotional trend
    if (this.emotionHistory.length > 0) {
      const recentEmotion = this.emotionHistory[this.emotionHistory.length - 1];
      const matchingEmotion = possibilities.find(p => this.areEmotionsSimilar(p, recentEmotion.emotionType));
      if (matchingEmotion) return matchingEmotion;
    }
    
    // Default to first possibility (most contextually appropriate)
    return possibilities[0];
  }
  
  private areEmotionsSimilar(emotion1: EmotionType, emotion2: EmotionType): boolean {
    // Group similar emotions
    const positiveEmotions: EmotionType[] = ['excitement', 'pride', 'confidence', 'satisfaction'];
    const negativeEmotions: EmotionType[] = ['frustration', 'regret', 'caution', 'anxiety', 'disappointment'];
    const neutralEmotions: EmotionType[] = ['curiosity'];
    
    const isEmotion1Positive = positiveEmotions.includes(emotion1);
    const isEmotion2Positive = positiveEmotions.includes(emotion2);
    const isEmotion1Negative = negativeEmotions.includes(emotion1);
    const isEmotion2Negative = negativeEmotions.includes(emotion2);
    
    return (isEmotion1Positive && isEmotion2Positive) || 
           (isEmotion1Negative && isEmotion2Negative);
  }

  private calculateIntensity(emotionType: EmotionType, outcome: string, context?: any): number {
    let baseIntensity = 0.5;

    // زيادة الشدة بناءً على النتيجة
    if (outcome === 'achievement') {
      baseIntensity = 0.8;
    } else if (outcome === 'error') {
      baseIntensity = 0.6;
    }

    // تعديل بناءً على السياق
    if (context?.importance) {
      baseIntensity *= context.importance;
    }

    // HONEST: Adjust based on emotional stability (not random)
    // More stable = less variance, less stable = more variance
    const stability = this.emotionalState.emotionalStability;
    const varianceFactor = (1 - stability) * 0.2; // 0-0.2 based on stability
    
    return Math.max(0.1, Math.min(1.0, baseIntensity + varianceFactor));
  }

  private calculateDuration(emotionType: EmotionType, intensity: number): number {
    // المشاعر القوية تدوم أطول
    const baseDuration = 60000; // 1 minute
    const intensityMultiplier = 1 + intensity;
    
    // بعض المشاعر تدوم أطول طبيعياً
    const typeMultipliers: Record<EmotionType, number> = {
      'pride': 2.0,
      'regret': 1.8,
      'satisfaction': 1.5,
      'frustration': 1.3,
      'curiosity': 1.0,
      'caution': 0.8,
      'excitement': 1.2,
      'confidence': 1.4,
      'anxiety': 1.6,
      'disappointment': 1.7
    };
    const typeMultiplier = typeMultipliers[emotionType] || 1.0;

    return Math.round(baseDuration * intensityMultiplier * typeMultiplier);
  }

  private recordEmotion(emotion: DigitalEmotion): void {
    this.emotionHistory.push(emotion);
    
    // الاحتفاظ بآخر 500 مشاعر
    if (this.emotionHistory.length > 500) {
      this.emotionHistory.shift();
    }

    // تحديث الإحصائيات
    const count = this.emotionalState.emotionalHistory.get(emotion.emotionType) || 0;
    this.emotionalState.emotionalHistory.set(emotion.emotionType, count + 1);
  }

  private updateEmotionalState(newEmotion: DigitalEmotion): void {
    // تحديث المشاعر الأخيرة
    this.emotionalState.recentEmotions.unshift(newEmotion);
    if (this.emotionalState.recentEmotions.length > 10) {
      this.emotionalState.recentEmotions.pop();
    }

    // تحديد المشاعر السائدة
    const recentTypes = this.emotionalState.recentEmotions.map(e => e.emotionType);
    const frequency: Map<EmotionType, number> = new Map();
    
    recentTypes.forEach(type => {
      frequency.set(type, (frequency.get(type) || 0) + 1);
    });

    let maxCount = 0;
    let dominant: EmotionType | null = null;
    
    frequency.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        dominant = type;
      }
    });

    this.emotionalState.dominantEmotion = dominant;

    // تحديث المزاج العام
    const positiveCount = this.emotionalState.recentEmotions.filter(e =>
      ['satisfaction', 'excitement', 'pride', 'confidence'].includes(e.emotionType)
    ).length;

    const negativeCount = this.emotionalState.recentEmotions.filter(e =>
      ['regret', 'frustration', 'disappointment', 'anxiety'].includes(e.emotionType)
    ).length;

    if (positiveCount > negativeCount * 1.5) {
      this.emotionalState.currentMood = 'positive';
    } else if (negativeCount > positiveCount * 1.5) {
      this.emotionalState.currentMood = 'negative';
    } else if (positiveCount > 0 && negativeCount > 0) {
      this.emotionalState.currentMood = 'mixed';
    } else {
      this.emotionalState.currentMood = 'neutral';
    }

    // حساب الاستقرار العاطفي
    const intensityVariance = this.calculateIntensityVariance();
    this.emotionalState.emotionalStability = Math.max(0, 1 - intensityVariance);

    // Emit state update
    this.emit('emotional:state:updated', this.emotionalState);
  }

  private calculateIntensityVariance(): number {
    const recent = this.emotionHistory.slice(-20);
    if (recent.length < 2) return 0;

    const intensities = recent.map(e => e.intensity);
    const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    
    const variance = intensities.reduce((sum, intensity) => {
      return sum + Math.pow(intensity - avg, 2);
    }, 0) / intensities.length;

    return Math.sqrt(variance);
  }
}

// ============= SINGLETON INSTANCES =============

const emotionSimulators: Map<string, EmotionSimulator> = new Map();

export function initializeEmotionSimulator(nodeId: string): EmotionSimulator {
  if (!emotionSimulators.has(nodeId)) {
    const simulator = new EmotionSimulator(nodeId);
    emotionSimulators.set(nodeId, simulator);
    console.log(`[Emotion] ✅ Emotion Simulator initialized for node: ${nodeId}`);
  }
  return emotionSimulators.get(nodeId)!;
}

export function getEmotionSimulator(nodeId: string): EmotionSimulator | null {
  return emotionSimulators.get(nodeId) || null;
}

export function getAllEmotionSimulators(): EmotionSimulator[] {
  return Array.from(emotionSimulators.values());
}
