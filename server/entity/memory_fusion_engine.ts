/**
 * ============================================================================
 * Phase 10.2: MEMORY FUSION ENGINE
 * ============================================================================
 * 
 * محرك دمج الذاكرة الموحدة
 * 
 * يدمج جميع قواعد البيانات الإدراكية في شبكة واحدة
 * ويُنشئ ذاكرة موحدة للكيان الرقمي
 * 
 * المسؤوليات:
 * - دمج بيانات الوعي من جميع النوى
 * - إنشاء Vector Embeddings للذكريات
 * - البحث الدلالي في الذاكرة الموحدة
 * - حساب Memory Integrity Score
 * - مزامنة الذاكرة بين النوى
 */

import { EventEmitter } from 'events';
import { Index } from '@upstash/vector';

// ============ Types ============

export interface Memory {
  id: string;
  nodeId: string;
  type: 'cognition' | 'emotion' | 'reflection' | 'decision' | 'knowledge';
  content: string;
  context: Record<string, any>;
  embedding?: number[];
  timestamp: number;
  importance: number; // 0-100
  accessCount: number;
  lastAccess: number;
}

export interface MemoryQuery {
  content?: string;
  type?: Memory['type'];
  nodeId?: string;
  minImportance?: number;
  limit?: number;
}

export interface MemoryStats {
  totalMemories: number;
  memoriesByType: Record<string, number>;
  memoriesByNode: Record<string, number>;
  avgImportance: number;
  memoryIntegrity: number;
  oldestMemory: number;
  newestMemory: number;
}

// ============ Constants ============

const MEMORY_RETENTION_DAYS = 90; // Keep memories for 90 days
const MAX_MEMORIES = 10000; // Maximum memories to keep
const IMPORTANCE_DECAY_RATE = 0.01; // Decay rate per day

// ============ Event Emitter ============

export const memoryEvents = new EventEmitter();

// ============ In-Memory Storage ============

const memoryStore = new Map<string, Memory>();
let vectorIndex: Index | null = null;

// ============ Vector Index ============

/**
 * تهيئة Vector Index (Upstash Vector)
 */
function initializeVectorIndex(): void {
  try {
    const url = process.env.UPSTASH_VECTOR_REST_URL;
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

    if (url && token) {
      vectorIndex = new Index({
        url,
        token,
      });
      console.log('[Memory Fusion] 🔗 Vector index connected');
    } else {
      console.log('[Memory Fusion] ⚠️ Vector index not configured (using in-memory only)');
    }
  } catch (error: any) {
    console.error('[Memory Fusion] ❌ Vector index initialization failed:', error.message);
  }
}

// ============ Core Functions ============

// HONEST: Counter for deterministic IDs
let memoryCounter = 0;

/**
 * توليد ID فريد للذاكرة
 */
function generateMemoryId(): string {
  return `mem-${Date.now()}-${(memoryCounter++).toString(36)}`;
}

/**
 * إضافة ذاكرة جديدة
 */
export async function addMemory(
  nodeId: string,
  type: Memory['type'],
  content: string,
  context: Record<string, any> = {},
  importance: number = 50
): Promise<Memory> {
  const memory: Memory = {
    id: generateMemoryId(),
    nodeId,
    type,
    content,
    context,
    timestamp: Date.now(),
    importance: Math.max(0, Math.min(100, importance)),
    accessCount: 0,
    lastAccess: Date.now()
  };

  // Store in memory
  memoryStore.set(memory.id, memory);

  // TODO: Generate embedding and store in vector DB
  // This would require OpenAI API call for embeddings
  // For now, we'll skip vector storage

  console.log(`[Memory Fusion] 💾 Memory added: ${memory.id} (${type})`);
  memoryEvents.emit('memory:added', memory);

  // Cleanup old memories if needed
  await cleanupOldMemories();

  return memory;
}

/**
 * الحصول على ذاكرة
 */
export function getMemory(memoryId: string): Memory | undefined {
  const memory = memoryStore.get(memoryId);

  if (memory) {
    memory.accessCount++;
    memory.lastAccess = Date.now();
    memoryStore.set(memoryId, memory);
  }

  return memory;
}

/**
 * البحث في الذاكرة
 */
export function searchMemories(query: MemoryQuery): Memory[] {
  let results = Array.from(memoryStore.values());

  // Filter by type
  if (query.type) {
    results = results.filter(m => m.type === query.type);
  }

  // Filter by node
  if (query.nodeId) {
    results = results.filter(m => m.nodeId === query.nodeId);
  }

  // Filter by importance
  if (query.minImportance !== undefined) {
    results = results.filter(m => m.importance >= (query.minImportance || 0));
  }

  // Simple text search (in production, use vector similarity)
  if (query.content) {
    const searchTerm = query.content.toLowerCase();
    results = results.filter(m =>
      m.content.toLowerCase().includes(searchTerm)
    );
  }

  // Sort by importance and recency
  results.sort((a, b) => {
    const importanceScore = b.importance - a.importance;
    if (Math.abs(importanceScore) > 10) return importanceScore;
    return b.timestamp - a.timestamp;
  });

  // Limit results
  if (query.limit) {
    results = results.slice(0, query.limit);
  }

  return results;
}

/**
 * الحصول على ذكريات نواة معينة
 */
export function getNodeMemories(nodeId: string, limit: number = 100): Memory[] {
  return searchMemories({ nodeId, limit });
}

/**
 * تحديث أهمية ذاكرة
 */
export function updateMemoryImportance(memoryId: string, importance: number): boolean {
  const memory = memoryStore.get(memoryId);

  if (!memory) {
    return false;
  }

  memory.importance = Math.max(0, Math.min(100, importance));
  memoryStore.set(memoryId, memory);

  memoryEvents.emit('memory:updated', memory);
  return true;
}

/**
 * حذف ذاكرة
 */
export function deleteMemory(memoryId: string): boolean {
  const deleted = memoryStore.delete(memoryId);

  if (deleted) {
    console.log(`[Memory Fusion] 🗑️ Memory deleted: ${memoryId}`);
    memoryEvents.emit('memory:deleted', memoryId);
  }

  return deleted;
}

/**
 * تنظيف الذكريات القديمة
 */
async function cleanupOldMemories(): Promise<void> {
  const now = Date.now();
  const retentionMs = MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const memories = Array.from(memoryStore.values());

  // Remove memories older than retention period
  let deletedCount = 0;
  
  for (const memory of memories) {
    const age = now - memory.timestamp;
    
    if (age > retentionMs) {
      memoryStore.delete(memory.id);
      deletedCount++;
    }
  }

  // If still too many memories, remove least important
  if (memoryStore.size > MAX_MEMORIES) {
    const sortedMemories = Array.from(memoryStore.values())
      .sort((a, b) => a.importance - b.importance);

    const toDelete = memoryStore.size - MAX_MEMORIES;
    
    for (let i = 0; i < toDelete; i++) {
      memoryStore.delete(sortedMemories[i].id);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`[Memory Fusion] 🧹 Cleaned up ${deletedCount} old memories`);
    memoryEvents.emit('memory:cleanup', deletedCount);
  }
}

/**
 * تطبيق تدهور الأهمية (Importance Decay)
 */
function applyImportanceDecay(): void {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  memoryStore.forEach((memory, id) => {
    const ageInDays = (now - memory.timestamp) / dayMs;
    const decay = Math.floor(ageInDays * IMPORTANCE_DECAY_RATE * memory.importance);
    
    if (decay > 0) {
      memory.importance = Math.max(0, memory.importance - decay);
      memoryStore.set(id, memory);
    }
  });
}

/**
 * حساب Memory Integrity Score
 */
export function calculateMemoryIntegrity(): number {
  const memories = Array.from(memoryStore.values());
  
  if (memories.length === 0) return 100;

  // Factors:
  // 1. Average importance
  // 2. Memory diversity (different types)
  // 3. Recent access patterns
  // 4. Node coverage

  const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;
  
  const types = new Set(memories.map(m => m.type));
  const diversityScore = (types.size / 5) * 100; // 5 types total
  
  const recentlyAccessed = memories.filter(m => 
    (Date.now() - m.lastAccess) < 24 * 60 * 60 * 1000 // Last 24h
  ).length;
  const accessScore = (recentlyAccessed / memories.length) * 100;
  
  const nodes = new Set(memories.map(m => m.nodeId));
  const coverageScore = Math.min((nodes.size / 5) * 100, 100); // Expect ~5 nodes

  const integrity = (
    avgImportance * 0.4 +
    diversityScore * 0.2 +
    accessScore * 0.2 +
    coverageScore * 0.2
  );

  return Math.round(Math.min(integrity, 100));
}

/**
 * الحصول على إحصائيات الذاكرة
 */
export function getMemoryStats(): MemoryStats {
  const memories = Array.from(memoryStore.values());

  if (memories.length === 0) {
    return {
      totalMemories: 0,
      memoriesByType: {},
      memoriesByNode: {},
      avgImportance: 0,
      memoryIntegrity: 100,
      oldestMemory: 0,
      newestMemory: 0
    };
  }

  const memoriesByType = memories.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const memoriesByNode = memories.reduce((acc, m) => {
    acc[m.nodeId] = (acc[m.nodeId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgImportance = Math.round(
    memories.reduce((sum, m) => sum + m.importance, 0) / memories.length
  );

  const timestamps = memories.map(m => m.timestamp);

  return {
    totalMemories: memories.length,
    memoriesByType,
    memoriesByNode,
    avgImportance,
    memoryIntegrity: calculateMemoryIntegrity(),
    oldestMemory: Math.min(...timestamps),
    newestMemory: Math.max(...timestamps)
  };
}

/**
 * دمج ذكريات نواة جديدة
 */
export async function fuseNodeMemories(nodeId: string, memories: Partial<Memory>[]): Promise<number> {
  let count = 0;

  for (const mem of memories) {
    if (mem.content && mem.type) {
      await addMemory(
        nodeId,
        mem.type,
        mem.content,
        mem.context || {},
        mem.importance || 50
      );
      count++;
    }
  }

  console.log(`[Memory Fusion] 🔗 Fused ${count} memories from ${nodeId}`);
  memoryEvents.emit('memory:fused', { nodeId, count });

  return count;
}

/**
 * تهيئة Memory Fusion Engine
 */
export function initializeMemoryFusion(): void {
  console.log('[Memory Fusion] 🧠 Initializing Memory Fusion Engine...');

  // Initialize vector index
  initializeVectorIndex();

  // Set up periodic importance decay (every hour)
  setInterval(() => {
    applyImportanceDecay();
  }, 60 * 60 * 1000);

  // Set up periodic cleanup (every day)
  setInterval(() => {
    cleanupOldMemories();
  }, 24 * 60 * 60 * 1000);

  console.log('[Memory Fusion] ✅ Memory Fusion Engine initialized');
}
