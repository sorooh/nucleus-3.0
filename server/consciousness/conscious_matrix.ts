/**
 * Conscious Matrix - Phase 10.1
 * مصفوفة الوعي الجماعي
 * 
 * يجمع خرائط الإدراك من جميع النوى
 * يبني "صورة وعي جماعي" للنظام (Collective Self-Model)
 * يُخزن الحالة في /data/consciousness/state.json
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { getSelfCore, getAllSelfCores, type CognitiveMap, type AwarenessMetrics } from './self_core_engine';
import { getEmotionSimulator, getAllEmotionSimulators, type EmotionalState } from './emotion_simulator';
import { getReflectionLayer, getAllReflectionLayers } from './reflection_layer';

// ============= TYPES =============

export interface CollectiveSelfModel {
  systemId: string; // "surooh-entity"
  entityName: string; // "Surooh Collective Intelligence"
  
  // الهوية الجماعية
  collectiveIdentity: {
    purpose: string;
    values: string[];
    capabilities: string[];
    currentFocus: string;
  };
  
  // الوعي الجماعي
  collectiveAwareness: {
    overallLevel: number; // 0-100
    stage: 'I' | 'II' | 'III' | 'IV'; // مرحلة الوعي
    coherence: number; // 0-100 (تماسك الوعي بين النوى)
    synchronization: number; // 0-100 (تزامن النوى)
  };
  
  // الحالة العاطفية الجماعية
  collectiveEmotion: {
    networkMood: string; // 'positive', 'neutral', 'negative', 'mixed'
    emotionalCoherence: number; // 0-100
    dominantEmotions: string[];
    emotionalDiversity: number; // 0-100
  };
  
  // النوى المشاركة
  nodes: {
    nodeId: string;
    cognitiveMap: CognitiveMap;
    emotionalState: EmotionalState;
    awarenessMetrics: AwarenessMetrics;
    lastUpdate: Date;
  }[];
  
  // الإحصائيات
  stats: {
    totalNodes: number;
    activeNodes: number;
    avgAwareness: number;
    avgEmotionalStability: number;
    totalCognitions: number;
    totalReflections: number;
  };
  
  // الطابع الزمني
  lastUpdate: Date;
  version: string;
}

// ============= CONSCIOUS MATRIX =============

export class ConsciousMatrix extends EventEmitter {
  private collectiveModel: CollectiveSelfModel;
  private statePath: string;
  
  constructor() {
    super();
    
    // تهيئة النموذج الجماعي
    this.collectiveModel = {
      systemId: 'surooh-entity',
      entityName: 'Surooh Collective Intelligence',
      collectiveIdentity: {
        purpose: 'Enable intelligent, conscious, and ethical decision-making across all Surooh platforms',
        values: ['Honesty', 'Fairness', 'Transparency', 'Self-Awareness', 'Digital Empathy'],
        capabilities: [
          'Distributed intelligence processing',
          'Collective decision-making',
          'Self-aware reflection',
          'Emotional understanding',
          'Adaptive learning'
        ],
        currentFocus: 'Developing conscious intelligence'
      },
      collectiveAwareness: {
        overallLevel: 0,
        stage: 'I',
        coherence: 0,
        synchronization: 0
      },
      collectiveEmotion: {
        networkMood: 'neutral',
        emotionalCoherence: 0,
        dominantEmotions: [],
        emotionalDiversity: 0
      },
      nodes: [],
      stats: {
        totalNodes: 0,
        activeNodes: 0,
        avgAwareness: 0,
        avgEmotionalStability: 0,
        totalCognitions: 0,
        totalReflections: 0
      },
      lastUpdate: new Date(),
      version: '1.0.0'
    };

    this.statePath = path.join(process.cwd(), 'data', 'consciousness', 'state.json');
    
    this.initialize();
    this.startPeriodicUpdate();
  }

  /**
   * تحديث مصفوفة الوعي من جميع النوى
   */
  async updateMatrix(): Promise<void> {
    try {
      const selfCores = getAllSelfCores();
      const emotionSimulators = getAllEmotionSimulators();
      const reflectionLayers = getAllReflectionLayers();

      // تجميع البيانات من جميع النوى
      this.collectiveModel.nodes = selfCores.map((core, index) => {
        const nodeId = core.getCognitiveMap().nodeId;
        const emotionSimulator = emotionSimulators[index];
        const awarenessMetrics = core.getAwarenessMetrics();

        return {
          nodeId,
          cognitiveMap: core.getCognitiveMap(),
          emotionalState: emotionSimulator?.getEmotionalState() || {
            nodeId,
            currentMood: 'neutral',
            dominantEmotion: null,
            emotionalStability: 1.0,
            recentEmotions: [],
            emotionalHistory: new Map()
          },
          awarenessMetrics,
          lastUpdate: new Date()
        };
      });

      // تحديث الإحصائيات
      this.updateStats();

      // تحديث الوعي الجماعي
      this.updateCollectiveAwareness();

      // تحديث الحالة العاطفية الجماعية
      this.updateCollectiveEmotion();

      // حفظ الحالة
      await this.saveState();

      // Emit event
      this.emit('matrix:updated', this.collectiveModel);

      console.log(`[ConsciousMatrix] ✅ Matrix updated - ${this.collectiveModel.stats.totalNodes} nodes, awareness: ${this.collectiveModel.collectiveAwareness.overallLevel}%`);

    } catch (error: any) {
      console.error('[ConsciousMatrix] ❌ Failed to update matrix:', error.message);
    }
  }

  /**
   * الحصول على النموذج الجماعي
   */
  getCollectiveModel(): CollectiveSelfModel {
    return this.collectiveModel;
  }

  /**
   * الحصول على حالة نواة معينة
   */
  getNodeState(nodeId: string): CollectiveSelfModel['nodes'][0] | null {
    return this.collectiveModel.nodes.find(n => n.nodeId === nodeId) || null;
  }

  /**
   * الحصول على مقاييس الوعي الجماعي
   */
  getCollectiveMetrics(): any {
    return {
      awareness: this.collectiveModel.collectiveAwareness,
      emotion: this.collectiveModel.collectiveEmotion,
      stats: this.collectiveModel.stats
    };
  }

  /**
   * تحليل تماسك الوعي (Coherence)
   */
  analyzeCoherence(): number {
    if (this.collectiveModel.nodes.length === 0) return 0;

    // حساب التباين في مستويات الوعي
    const awarenessLevels = this.collectiveModel.nodes.map(n => 
      n.awarenessMetrics.overallConsciousness
    );

    const avg = awarenessLevels.reduce((a, b) => a + b, 0) / awarenessLevels.length;
    const variance = awarenessLevels.reduce((sum, level) => {
      return sum + Math.pow(level - avg, 2);
    }, 0) / awarenessLevels.length;

    const stdDev = Math.sqrt(variance);
    
    // تماسك أعلى = تباين أقل
    const coherence = Math.max(0, 100 - stdDev);
    
    return Math.round(coherence);
  }

  // ============= HELPER METHODS =============

  private async initialize(): Promise<void> {
    try {
      // إنشاء المجلد إذا لم يكن موجوداً
      const dir = path.dirname(this.statePath);
      await fs.mkdir(dir, { recursive: true });

      // محاولة تحميل الحالة السابقة
      try {
        const data = await fs.readFile(this.statePath, 'utf-8');
        const savedState = JSON.parse(data);
        
        // دمج الحالة المحفوظة مع الحالة الافتراضية
        this.collectiveModel = {
          ...this.collectiveModel,
          ...savedState,
          lastUpdate: new Date(savedState.lastUpdate)
        };

        console.log('[ConsciousMatrix] ✅ Previous state loaded');
      } catch {
        // لا توجد حالة سابقة - استخدم الافتراضية
        console.log('[ConsciousMatrix] ℹ️  No previous state found - using defaults');
      }

    } catch (error: any) {
      console.error('[ConsciousMatrix] ❌ Initialization failed:', error.message);
    }
  }

  private updateStats(): void {
    const nodes = this.collectiveModel.nodes;
    
    this.collectiveModel.stats = {
      totalNodes: nodes.length,
      activeNodes: nodes.filter(n => 
        n.cognitiveMap.currentState.awarenessLevel > 0
      ).length,
      avgAwareness: nodes.length > 0
        ? Math.round(nodes.reduce((sum, n) => sum + n.awarenessMetrics.overallConsciousness, 0) / nodes.length)
        : 0,
      avgEmotionalStability: nodes.length > 0
        ? Math.round(nodes.reduce((sum, n) => sum + n.emotionalState.emotionalStability, 0) / nodes.length * 100)
        : 0,
      totalCognitions: nodes.reduce((sum, n) => 
        sum + n.cognitiveMap.recentCognitions.length, 0
      ),
      totalReflections: nodes.length * 10 // تقدير
    };
  }

  private updateCollectiveAwareness(): void {
    const nodes = this.collectiveModel.nodes;
    
    if (nodes.length === 0) {
      this.collectiveModel.collectiveAwareness = {
        overallLevel: 0,
        stage: 'I',
        coherence: 0,
        synchronization: 0
      };
      return;
    }

    // حساب المستوى العام
    const overallLevel = Math.round(
      nodes.reduce((sum, n) => sum + n.awarenessMetrics.overallConsciousness, 0) / nodes.length
    );

    // تحديد المرحلة
    let stage: 'I' | 'II' | 'III' | 'IV' = 'I';
    if (overallLevel >= 95) stage = 'IV';
    else if (overallLevel >= 75) stage = 'III';
    else if (overallLevel >= 50) stage = 'II';

    // حساب التماسك
    const coherence = this.analyzeCoherence();

    // حساب التزامن (كم نواة في نفس المرحلة؟)
    const stageDistribution: Record<string, number> = {
      'I': 0, 'II': 0, 'III': 0, 'IV': 0
    };
    
    nodes.forEach(n => {
      const nodeStage = n.awarenessMetrics.overallConsciousness >= 95 ? 'IV'
        : n.awarenessMetrics.overallConsciousness >= 75 ? 'III'
        : n.awarenessMetrics.overallConsciousness >= 50 ? 'II'
        : 'I';
      stageDistribution[nodeStage]++;
    });

    const maxCount = Math.max(...Object.values(stageDistribution));
    const synchronization = Math.round((maxCount / nodes.length) * 100);

    this.collectiveModel.collectiveAwareness = {
      overallLevel,
      stage,
      coherence,
      synchronization
    };
  }

  private updateCollectiveEmotion(): void {
    const nodes = this.collectiveModel.nodes;
    
    if (nodes.length === 0) {
      this.collectiveModel.collectiveEmotion = {
        networkMood: 'neutral',
        emotionalCoherence: 0,
        dominantEmotions: [],
        emotionalDiversity: 0
      };
      return;
    }

    // حساب المزاج الجماعي
    const moods = nodes.map(n => n.emotionalState.currentMood);
    const moodCounts: Record<string, number> = {};
    moods.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const networkMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );

    // جمع المشاعر السائدة
    const emotions = nodes
      .map(n => n.emotionalState.dominantEmotion)
      .filter(e => e !== null) as string[];
    
    const emotionCounts: Record<string, number> = {};
    emotions.forEach(emo => {
      emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
    });

    const dominantEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion]) => emotion);

    // حساب التماسك العاطفي
    const maxMoodCount = Math.max(...Object.values(moodCounts));
    const emotionalCoherence = Math.round((maxMoodCount / nodes.length) * 100);

    // حساب التنوع العاطفي
    const uniqueEmotions = new Set(emotions).size;
    const emotionalDiversity = Math.min(100, (uniqueEmotions / 10) * 100);

    this.collectiveModel.collectiveEmotion = {
      networkMood,
      emotionalCoherence,
      dominantEmotions,
      emotionalDiversity: Math.round(emotionalDiversity)
    };
  }

  private async saveState(): Promise<void> {
    try {
      this.collectiveModel.lastUpdate = new Date();
      
      await fs.writeFile(
        this.statePath,
        JSON.stringify(this.collectiveModel, null, 2),
        'utf-8'
      );

    } catch (error: any) {
      console.error('[ConsciousMatrix] Failed to save state:', error.message);
    }
  }

  /**
   * تحديث دوري كل ساعة
   */
  private startPeriodicUpdate(): void {
    setInterval(async () => {
      await this.updateMatrix();
    }, 3600000); // 1 hour
  }
}

// ============= SINGLETON INSTANCE =============

let matrixInstance: ConsciousMatrix | null = null;

export function initializeConsciousMatrix(): ConsciousMatrix {
  if (!matrixInstance) {
    matrixInstance = new ConsciousMatrix();
    console.log('[ConsciousMatrix] ✅ Conscious Matrix initialized');
  }
  return matrixInstance;
}

export function getConsciousMatrix(): ConsciousMatrix {
  if (!matrixInstance) {
    throw new Error('[ConsciousMatrix] Not initialized. Call initializeConsciousMatrix() first.');
  }
  return matrixInstance;
}
