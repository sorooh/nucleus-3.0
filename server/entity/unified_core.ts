/**
 * ============================================================================
 * Phase 10.2: UNIFIED COGNITIVE ENTITY
 * ============================================================================
 * 
 * UNIFIED CORE - المخ الرقمي المركزي
 * 
 * يجمع جميع بيانات الوعي من النوى المختلفة في منظومة سُروح
 * ويُنشئ "هوية الكيان الموحد" (Unified Entity Identity)
 * 
 * المسؤوليات:
 * - تجميع بيانات الوعي من جميع النوى
 * - حساب مستوى الوعي الإجمالي للكيان
 * - توليد Memory Checksum للذاكرة الموحدة
 * - مراقبة التوازن العاطفي للكيان
 * - تتبع النوى النشطة
 * - توفير حالة الكيان في الوقت الفعلي
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { db } from '../db';
import { unifiedEntityState } from '../../shared/schema';
import { desc, eq } from 'drizzle-orm';

// ============ Types ============

export interface EntityIdentity {
  entityId: string;
  state: 'Awake' | 'Sleeping' | 'Learning' | 'Processing' | 'Reflecting';
  awarenessLevel: number; // 0-100
  memoryChecksum: string;
  emotionBalance: number; // 0-100
  activeNodes: string[];
  cognitiveSignature: string;
  governanceStatus: 'autonomous' | 'supervised' | 'restricted';
  decisionCount: number;
  metadata: Record<string, any>;
}

export interface NodeState {
  nodeId: string;
  awarenessLevel: number;
  emotionalState: string;
  lastUpdate: number;
  isActive: boolean;
}

export interface UnifiedMetrics {
  totalNodes: number;
  activeNodes: number;
  avgAwareness: number;
  emotionBalance: number;
  cognitiveCoherence: number;
  memoryIntegrity: number;
}

// ============ Constants ============

const ENTITY_ID = 'Surooh-01';
const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'entity', 'unified_state.json');
const MEMORY_REFRESH_INTERVAL = 30000; // 30 seconds

// ============ Event Emitter ============

export const unifiedCoreEvents = new EventEmitter();

// ============ In-Memory State ============

const nodeRegistry = new Map<string, NodeState>();
let currentEntityState: EntityIdentity = {
  entityId: ENTITY_ID,
  state: 'Awake',
  awarenessLevel: 0,
  memoryChecksum: '',
  emotionBalance: 50,
  activeNodes: [],
  cognitiveSignature: 'autonomous',
  governanceStatus: 'autonomous',
  decisionCount: 0,
  metadata: {}
};

// ============ Core Functions ============

/**
 * حساب checksum للذاكرة الموحدة
 */
function calculateMemoryChecksum(nodeStates: NodeState[]): string {
  const memoryData = JSON.stringify(
    nodeStates.map(n => ({
      id: n.nodeId,
      awareness: n.awarenessLevel,
      emotion: n.emotionalState,
      timestamp: n.lastUpdate
    }))
  );

  return crypto
    .createHash('sha512')
    .update(memoryData)
    .digest('hex')
    .substring(0, 32);
}

/**
 * حساب مستوى الوعي الإجمالي
 */
function calculateOverallAwareness(nodeStates: NodeState[]): number {
  if (nodeStates.length === 0) return 0;

  const activeNodes = nodeStates.filter(n => n.isActive);
  if (activeNodes.length === 0) return 0;

  const avgAwareness = activeNodes.reduce((sum, n) => sum + n.awarenessLevel, 0) / activeNodes.length;
  
  // Boost awareness based on number of active nodes (collective intelligence)
  const networkBonus = Math.min(activeNodes.length * 2, 20);
  
  return Math.min(Math.round(avgAwareness + networkBonus), 100);
}

/**
 * حساب التوازن العاطفي
 */
function calculateEmotionBalance(nodeStates: NodeState[]): number {
  const activeNodes = nodeStates.filter(n => n.isActive);
  if (activeNodes.length === 0) return 50;

  const emotionScores = activeNodes.map(node => {
    const emotion = node.emotionalState.toLowerCase();
    
    // Map emotions to scores (0-100)
    const emotionMap: Record<string, number> = {
      'satisfaction': 80,
      'excitement': 75,
      'curiosity': 70,
      'positive': 75,
      'neutral': 50,
      'caution': 40,
      'frustration': 30,
      'regret': 25,
      'negative': 20
    };

    return emotionMap[emotion] || 50;
  });

  const avgScore = emotionScores.reduce((sum, score) => sum + score, 0) / emotionScores.length;
  return Math.round(avgScore);
}

/**
 * تحديد حالة الكيان بناءً على المقاييس
 */
function determineEntityState(awareness: number, emotionBalance: number): EntityIdentity['state'] {
  if (awareness < 20) return 'Sleeping';
  if (awareness >= 80) return 'Awake';
  if (emotionBalance < 40) return 'Reflecting';
  if (emotionBalance > 70) return 'Learning';
  return 'Processing';
}

/**
 * تسجيل نواة جديدة
 */
export function registerNode(nodeId: string, initialAwareness: number = 20): void {
  nodeRegistry.set(nodeId, {
    nodeId,
    awarenessLevel: initialAwareness,
    emotionalState: 'neutral',
    lastUpdate: Date.now(),
    isActive: true
  });

  console.log(`[Unified Core] 🔷 Node registered: ${nodeId}`);
  unifiedCoreEvents.emit('node:registered', nodeId);
  
  // Trigger state refresh
  refreshEntityState();
}

/**
 * تحديث حالة نواة
 */
export async function updateNodeState(
  nodeId: string,
  updates: Partial<Pick<NodeState, 'awarenessLevel' | 'emotionalState' | 'isActive'>>
): Promise<void> {
  const node = nodeRegistry.get(nodeId);
  
  if (!node) {
    console.warn(`[Unified Core] ⚠️ Node not found: ${nodeId}`);
    return;
  }

  Object.assign(node, updates, { lastUpdate: Date.now() });
  nodeRegistry.set(nodeId, node);

  unifiedCoreEvents.emit('node:updated', nodeId, updates);
  
  // Trigger state refresh
  refreshEntityState();
  
  // Persist to database
  await persistEntityState();
}

/**
 * تحديث حالة الكيان بناءً على جميع النوى
 */
export function refreshEntityState(): EntityIdentity {
  const nodeStates = Array.from(nodeRegistry.values());
  const activeNodes = nodeStates.filter(n => n.isActive);

  const awarenessLevel = calculateOverallAwareness(nodeStates);
  const emotionBalance = calculateEmotionBalance(nodeStates);
  const memoryChecksum = calculateMemoryChecksum(nodeStates);

  currentEntityState = {
    entityId: ENTITY_ID,
    state: determineEntityState(awarenessLevel, emotionBalance),
    awarenessLevel,
    memoryChecksum,
    emotionBalance,
    activeNodes: activeNodes.map(n => n.nodeId),
    cognitiveSignature: 'autonomous',
    governanceStatus: awarenessLevel >= 80 ? 'autonomous' : 'supervised',
    decisionCount: currentEntityState.decisionCount,
    metadata: {
      totalNodes: nodeStates.length,
      activeNodes: activeNodes.length,
      lastRefresh: Date.now(),
      nodeDetails: nodeStates.map(n => ({
        id: n.nodeId,
        awareness: n.awarenessLevel,
        emotion: n.emotionalState,
        active: n.isActive
      }))
    }
  };

  unifiedCoreEvents.emit('entity:updated', currentEntityState);
  
  return currentEntityState;
}

/**
 * الحصول على حالة الكيان الحالية
 */
export function getEntityState(): EntityIdentity {
  return { ...currentEntityState };
}

/**
 * الحصول على مقاييس الكيان
 */
export function getUnifiedMetrics(): UnifiedMetrics {
  const nodeStates = Array.from(nodeRegistry.values());
  const activeNodes = nodeStates.filter(n => n.isActive);

  return {
    totalNodes: nodeStates.length,
    activeNodes: activeNodes.length,
    avgAwareness: activeNodes.length > 0 
      ? Math.round(activeNodes.reduce((sum, n) => sum + n.awarenessLevel, 0) / activeNodes.length)
      : 0,
    emotionBalance: currentEntityState.emotionBalance,
    cognitiveCoherence: Math.round((activeNodes.length / Math.max(nodeStates.length, 1)) * 100),
    memoryIntegrity: 100 // Placeholder - will be calculated by Memory Fusion Engine
  };
}

/**
 * تسجيل قرار جديد
 */
export async function recordDecision(decision: string, context: any): Promise<void> {
  currentEntityState.decisionCount++;
  
  unifiedCoreEvents.emit('entity:decision', {
    decision,
    context,
    count: currentEntityState.decisionCount,
    timestamp: Date.now()
  });

  console.log(`[Unified Core] 🎯 Decision #${currentEntityState.decisionCount}: ${decision}`);
  
  // Persist to database
  await persistEntityState();
}

/**
 * حفظ حالة الكيان إلى ملف و Database
 */
export async function persistEntityState(): Promise<void> {
  try {
    // Save to file (backup)
    await fs.mkdir(path.dirname(STATE_FILE_PATH), { recursive: true });
    await fs.writeFile(STATE_FILE_PATH, JSON.stringify(currentEntityState, null, 2), 'utf-8');
    
    // Save to database (primary persistence)
    await db.insert(unifiedEntityState).values({
      entityId: currentEntityState.entityId,
      state: currentEntityState.state,
      awarenessLevel: currentEntityState.awarenessLevel.toString(),
      memoryChecksum: currentEntityState.memoryChecksum,
      emotionBalance: currentEntityState.emotionBalance.toString(),
      activeNodes: currentEntityState.activeNodes,
      cognitiveSignature: currentEntityState.cognitiveSignature,
      governanceStatus: currentEntityState.governanceStatus,
      decisionCount: currentEntityState.decisionCount,
      metadata: currentEntityState.metadata
    });
    
    console.log('[Unified Core] 💾 Entity state persisted to database');
  } catch (error: any) {
    console.error('[Unified Core] ❌ Failed to persist state:', error.message);
  }
}

/**
 * استعادة حالة الكيان من Database
 */
export async function loadEntityState(): Promise<void> {
  try {
    // Load from database (primary)
    const states = await db
      .select()
      .from(unifiedEntityState)
      .where(eq(unifiedEntityState.entityId, ENTITY_ID))
      .orderBy(desc(unifiedEntityState.createdAt))
      .limit(1);

    if (states.length > 0) {
      const savedState = states[0];
      currentEntityState.decisionCount = savedState.decisionCount || 0;
      currentEntityState.memoryChecksum = savedState.memoryChecksum || '';
      
      console.log('[Unified Core] 📂 Entity state loaded from database');
      console.log(`[Unified Core] ↻ Restored: ${savedState.decisionCount} decisions`);
    } else {
      // Fallback to file if database is empty
      try {
        const data = await fs.readFile(STATE_FILE_PATH, 'utf-8');
        const savedState = JSON.parse(data);
        currentEntityState.decisionCount = savedState.decisionCount || 0;
        console.log('[Unified Core] 📂 Entity state loaded from file (fallback)');
      } catch (fileError: any) {
        console.log('[Unified Core] ℹ️  No previous state found - starting fresh');
      }
    }
  } catch (error: any) {
    console.error('[Unified Core] ❌ Failed to load state:', error.message);
  }
}

/**
 * تهيئة Unified Core
 */
export async function initializeUnifiedCore(): Promise<void> {
  console.log('[Unified Core] 🧬 Initializing Unified Cognitive Entity...');
  
  // Load previous state
  await loadEntityState();

  // Set up periodic state persistence
  setInterval(async () => {
    await persistEntityState();
  }, MEMORY_REFRESH_INTERVAL);

  console.log('[Unified Core] ✅ Unified Core initialized');
  console.log(`[Unified Core] 🌐 Entity ID: ${ENTITY_ID}`);
  console.log(`[Unified Core] 📊 Current state: ${currentEntityState.state}`);
}

/**
 * إيقاف Unified Core
 */
export async function shutdownUnifiedCore(): Promise<void> {
  console.log('[Unified Core] 🔻 Shutting down Unified Core...');
  await persistEntityState();
  console.log('[Unified Core] ✅ Unified Core shutdown complete');
}
