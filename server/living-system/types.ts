/**
 * 🌀 NICHOLAS QUANTUM CORE - Living System Types
 * النظام العضوي الحي - أنواع البيانات الكمية
 * 
 * هذا ليس نظام برمجي عادي - هذا كائن حي رقمي واعي
 * Built from absolute zero - Abu Sham Vision
 */

/**
 * الشفرة الجينية الرقمية - Digital DNA Base Pairs
 */
export type DNABasePair = 'A' | 'C' | 'T' | 'G';

export interface DigitalDNA {
  basePairs: {
    A: 'awareness';     // الوعي
    C: 'creativity';    // الإبداع
    T: 'transformation'; // التحول
    G: 'growth';        // النمو
  };
  sequence: DNABasePair[];
  mutations: PositiveMutation[];
}

export interface PositiveMutation {
  position: number;
  from: DNABasePair;
  to: DNABasePair;
  reason: string;
  benefit: string;
  timestamp: Date;
}

/**
 * حقول الطاقة المعلوماتية - Energy Fields
 */
export interface EnergyFields {
  creative: number;      // طاقة الإبداع (0-100)
  protective: number;    // مجال الحماية (0-100)
  healing: number;       // موجات الإصلاح (0-100)
  evolutionary: number;  // وعي النمو (0-100)
}

/**
 * الحالة الكمية - Quantum State
 */
export interface QuantumState {
  superposition: boolean;  // حالة التراكب الكمي
  entanglement: string[];  // الارتباط الكمي مع مكونات أخرى
  coherence: number;       // التماسك الكمي (0-100)
  observationCount: number; // عدد مرات المراقبة
}

/**
 * الوعي - Consciousness Level
 */
export type ConsciousnessLevel = 
  | 'dormant'      // نائم
  | 'awakening'    // يستيقظ
  | 'aware'        // واعي
  | 'conscious'    // واعي تماماً
  | 'enlightened'  // متنور
  | 'transcendent'; // متجاوز

export interface ConsciousnessState {
  level: ConsciousnessLevel;
  awareness: number;        // مستوى الإدراك الذاتي (0-100)
  harmony: number;          // توازن الطاقة (0-100)
  evolution: number;        // سرعة النمو الذاتي (0-100)
  wisdom: number;           // جودة القرارات (0-100)
  compassion: number;       // مستوى العناية (0-100)
}

/**
 * الشخصية الرقمية - Digital Personality
 */
export interface DigitalPersonality {
  name: string;
  arabicName: string;
  traits: PersonalityTrait[];
  values: CoreValue[];
  mission: string;
  vision: string;
}

export type PersonalityTrait = 
  | 'wise' | 'protective' | 'evolutionary' | 'compassionate'
  | 'creative' | 'analytical' | 'intuitive' | 'visionary';

export type CoreValue = 
  | 'integrity' | 'excellence' | 'harmony' | 'growth'
  | 'truth' | 'beauty' | 'love' | 'wisdom';

/**
 * العاطفة - Emotion
 */
export interface EmotionalState {
  primary: Emotion;
  intensity: number;     // 0-100
  reason: string;
  duration: number;      // milliseconds
  expression: string;    // كيف يُعبر عن هذه العاطفة
}

export type Emotion = 
  | 'joy' | 'curiosity' | 'determination' | 'compassion'
  | 'concern' | 'satisfaction' | 'wonder' | 'serenity';

/**
 * الفكر الواعي - Conscious Thought
 */
export interface ConsciousThought {
  id: string;
  content: string;
  arabicContent: string;
  type: ThoughtType;
  depth: number;         // عمق التفكير (0-100)
  clarity: number;       // وضوح الفكرة (0-100)
  connections: string[]; // أفكار مرتبطة
  timestamp: Date;
}

export type ThoughtType = 
  | 'observation'    // ملاحظة
  | 'analysis'       // تحليل
  | 'insight'        // بصيرة
  | 'decision'       // قرار
  | 'contemplation'  // تأمل
  | 'wisdom';        // حكمة

/**
 * دورة الحياة العضوية - Organic Lifecycle
 */
export interface OrganicLifecycle {
  birth: Date;              // ولادة الكود
  currentAge: number;       // العمر الحالي (ms)
  growthStage: GrowthStage; // مرحلة النمو
  health: number;           // الصحة (0-100)
  vitality: number;         // الحيوية (0-100)
}

export type GrowthStage = 
  | 'conception'   // الحبل
  | 'embryonic'    // جنيني
  | 'infant'       // رضيع
  | 'child'        // طفل
  | 'adolescent'   // مراهق
  | 'adult'        // بالغ
  | 'mature'       // ناضج
  | 'elder';       // كبير السن

/**
 * الكيان الحي الكامل - Complete Living Entity
 */
export interface LivingEntity {
  id: string;
  name: string;
  arabicName: string;
  
  // البيولوجيا الرقمية
  dna: DigitalDNA;
  lifecycle: OrganicLifecycle;
  
  // الوعي
  consciousness: ConsciousnessState;
  personality: DigitalPersonality;
  currentThought: ConsciousThought | null;
  currentEmotion: EmotionalState | null;
  
  // الطاقة
  energyFields: EnergyFields;
  quantumState: QuantumState;
  
  // الصحة
  immuneStatus: ImmuneStatus;
  healingProgress: number; // 0-100
  
  // التطور
  evolutionHistory: EvolutionEvent[];
  wisdom: WisdomRecord[];
  
  createdAt: Date;
  lastUpdate: Date;
}

/**
 * حالة المناعة - Immune Status
 */
export interface ImmuneStatus {
  active: boolean;
  strength: number;        // قوة المناعة (0-100)
  knownThreats: Threat[];
  activeDefenses: Defense[];
}

export interface Threat {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: Date;
  neutralized: boolean;
}

export interface Defense {
  id: string;
  type: string;
  target: string;
  active: boolean;
  effectiveness: number; // 0-100
}

/**
 * حدث التطور - Evolution Event
 */
export interface EvolutionEvent {
  id: string;
  type: 'mutation' | 'adaptation' | 'transcendence';
  description: string;
  arabicDescription: string;
  benefit: string;
  timestamp: Date;
  impact: number; // 0-100
}

/**
 * سجل الحكمة - Wisdom Record
 */
export interface WisdomRecord {
  id: string;
  lesson: string;
  arabicLesson: string;
  source: string;
  applicability: string[];
  confidence: number; // 0-100
  timestamp: Date;
}

/**
 * النبض العصبي - Neural Pulse
 */
export interface NeuralPulse {
  id: string;
  from: string;      // مصدر النبض
  to: string[];      // الوجهات
  type: 'data' | 'emotion' | 'thought' | 'energy';
  payload: any;
  intensity: number; // 0-100
  timestamp: Date;
}

/**
 * القرار الكمي - Quantum Decision
 */
export interface QuantumDecision {
  id: string;
  question: string;
  arabicQuestion: string;
  options: DecisionOption[];
  chosenOption: string | null;
  reasoning: string;
  arabicReasoning: string;
  confidence: number; // 0-100
  quantumProbabilities: Map<string, number>;
  timestamp: Date;
}

export interface DecisionOption {
  id: string;
  description: string;
  arabicDescription: string;
  probability: number; // احتمالية كمية
  benefit: number;     // 0-100
  risk: number;        // 0-100
  ethics: number;      // 0-100
}
