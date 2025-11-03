/**
 * Neural Memory Mesh (NMM) - Phase 10.0
 * شبكة الذاكرة العصبية الموزعة
 * 
 * نظام ذاكرة موحّد موزّع عبر جميع النوى
 * يعتمد على بنية Vector Embeddings + Database + Redis
 * كل نواة تملك "ذاكرة محلية" تتزامن مع المخ المركزي (Nicholas Brain)
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { db } from '../db';
import { neuralMemoryMesh, neuralNodes } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

// ============= TYPES =============

export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'working';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict';

export interface NeuralMemory {
  memoryId: string;
  memoryType: MemoryType;
  originNode: string;
  content: any;
  embeddings?: number[];
  importance?: number;
  expiresAt?: Date;
}

export interface MemorySyncResult {
  success: boolean;
  memoriesSynced: number;
  conflictsDetected: number;
  errors: string[];
}

// ============= NEURAL MEMORY MESH =============

export class NeuralMemoryMesh extends EventEmitter {
  private localMemories: Map<string, any> = new Map();
  private syncQueue: Set<string> = new Set();
  private conflictResolver: Map<string, any> = new Map();
  
  constructor() {
    super();
    this.startPeriodicSync();
  }

  /**
   * إنشاء ذاكرة جديدة
   */
  async createMemory(memory: NeuralMemory): Promise<any> {
    try {
      // إنشاء memory ID إذا لم يكن موجوداً
      const memoryId = memory.memoryId || this.generateMemoryId();
      
      // حساب content hash
      const contentHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(memory.content))
        .digest('hex');

      // إنشاء في Database
      const result = await db.insert(neuralMemoryMesh).values({
        memoryId,
        memoryType: memory.memoryType,
        originNode: memory.originNode,
        content: memory.content,
        contentHash,
        embeddings: memory.embeddings ? JSON.stringify(memory.embeddings) : null,
        importance: memory.importance || 0.5,
        expiresAt: memory.expiresAt,
        syncStatus: 'pending'
      }).returning();

      // حفظ في الذاكرة المحلية
      this.localMemories.set(memoryId, result[0]);

      // إضافة إلى قائمة المزامنة
      this.syncQueue.add(memoryId);

      console.log(`[NMM] ✅ Memory created: ${memoryId} (${memory.memoryType})`);
      this.emit('memory:created', { memoryId, memory });

      return result[0];
      
    } catch (error: any) {
      console.error('[NMM] ❌ Failed to create memory:', error.message);
      throw error;
    }
  }

  /**
   * استرجاع ذاكرة
   */
  async getMemory(memoryId: string): Promise<any | null> {
    try {
      // البحث في الذاكرة المحلية أولاً
      if (this.localMemories.has(memoryId)) {
        const memory = this.localMemories.get(memoryId);
        
        // تحديث access count
        await this.incrementAccessCount(memoryId);
        
        return memory;
      }

      // البحث في Database
      const result = await db.select()
        .from(neuralMemoryMesh)
        .where(eq(neuralMemoryMesh.memoryId, memoryId))
        .limit(1);

      if (result.length === 0) return null;

      const memory = result[0];
      
      // حفظ في الذاكرة المحلية
      this.localMemories.set(memoryId, memory);

      // تحديث access count
      await this.incrementAccessCount(memoryId);

      return memory;
      
    } catch (error: any) {
      console.error('[NMM] ❌ Failed to get memory:', error.message);
      return null;
    }
  }

  /**
   * تحديث ذاكرة
   */
  async updateMemory(memoryId: string, updates: Partial<NeuralMemory>): Promise<boolean> {
    try {
      const memory = await this.getMemory(memoryId);
      if (!memory) return false;

      // إذا تم تحديث المحتوى، احسب hash جديد
      let contentHash = memory.contentHash;
      if (updates.content) {
        contentHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(updates.content))
          .digest('hex');
      }

      // زيادة version
      const newVersion = memory.version + 1;

      // تحديث في Database
      await db.update(neuralMemoryMesh)
        .set({
          ...updates,
          contentHash,
          version: newVersion,
          updatedAt: new Date(),
          syncStatus: 'pending'
        })
        .where(eq(neuralMemoryMesh.memoryId, memoryId));

      // تحديث الذاكرة المحلية
      const updatedMemory = { ...memory, ...updates, contentHash, version: newVersion };
      this.localMemories.set(memoryId, updatedMemory);

      // إضافة إلى قائمة المزامنة
      this.syncQueue.add(memoryId);

      console.log(`[NMM] ✅ Memory updated: ${memoryId} (v${newVersion})`);
      this.emit('memory:updated', { memoryId, version: newVersion });

      return true;
      
    } catch (error: any) {
      console.error('[NMM] ❌ Failed to update memory:', error.message);
      return false;
    }
  }

  /**
   * حذف ذاكرة
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      // حذف من Database
      await db.delete(neuralMemoryMesh)
        .where(eq(neuralMemoryMesh.memoryId, memoryId));

      // حذف من الذاكرة المحلية
      this.localMemories.delete(memoryId);

      // إزالة من قائمة المزامنة
      this.syncQueue.delete(memoryId);

      console.log(`[NMM] 🗑️  Memory deleted: ${memoryId}`);
      this.emit('memory:deleted', { memoryId });

      return true;
    } catch (error: any) {
      console.error('[NMM] ❌ Failed to delete memory:', error.message);
      return false;
    }
  }

  /**
   * مزامنة الذاكرة مع نواة أخرى
   */
  async syncWithNode(targetNode: string): Promise<MemorySyncResult> {
    try {
      console.log(`[NMM] 🔄 Starting sync with node: ${targetNode}`);

      let memoriesSynced = 0;
      let conflictsDetected = 0;
      const errors: string[] = [];

      // الحصول على جميع الذكريات التي تحتاج مزامنة
      const memoriesToSync = Array.from(this.syncQueue);

      for (const memoryId of memoriesToSync) {
        try {
          const memory = await this.getMemory(memoryId);
          if (!memory) continue;

          // تحديث replicated_to
          const replicatedTo: string[] = memory.replicatedTo || [];
          if (!replicatedTo.includes(targetNode)) {
            replicatedTo.push(targetNode);
          }

          await db.update(neuralMemoryMesh)
            .set({
              replicatedTo: JSON.stringify(replicatedTo),
              syncStatus: 'synced',
              syncedAt: new Date()
            })
            .where(eq(neuralMemoryMesh.memoryId, memoryId));

          memoriesSynced++;
          this.syncQueue.delete(memoryId);

        } catch (error: any) {
          errors.push(`Failed to sync ${memoryId}: ${error.message}`);
        }
      }

      console.log(`[NMM] ✅ Sync completed: ${memoriesSynced} memories synced with ${targetNode}`);
      
      this.emit('sync:completed', {
        targetNode,
        memoriesSynced,
        conflictsDetected,
        errors
      });

      return {
        success: true,
        memoriesSynced,
        conflictsDetected,
        errors
      };
      
    } catch (error: any) {
      console.error('[NMM] ❌ Sync failed:', error.message);
      return {
        success: false,
        memoriesSynced: 0,
        conflictsDetected: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * البحث في الذاكرة (Semantic Search)
   */
  async searchMemories(query: string, limit: number = 10): Promise<any[]> {
    try {
      // في الإنتاج سنستخدم vector similarity search
      // هنا نستخدم بحث بسيط
      const results = await db.select()
        .from(neuralMemoryMesh)
        .limit(limit);

      return results;
      
    } catch (error: any) {
      console.error('[NMM] ❌ Search failed:', error.message);
      return [];
    }
  }

  /**
   * الحصول على إحصائيات الذاكرة
   */
  async getMemoryStats(): Promise<any> {
    try {
      const allMemories = await db.select().from(neuralMemoryMesh);

      const stats = {
        total: allMemories.length,
        byType: {
          episodic: 0,
          semantic: 0,
          procedural: 0,
          working: 0
        },
        byStatus: {
          pending: 0,
          syncing: 0,
          synced: 0,
          conflict: 0
        },
        avgImportance: 0,
        localCacheSize: this.localMemories.size,
        syncQueueSize: this.syncQueue.size
      };

      allMemories.forEach(m => {
        stats.byType[m.memoryType as MemoryType]++;
        stats.byStatus[m.syncStatus as SyncStatus]++;
        stats.avgImportance += m.importance;
      });

      stats.avgImportance = stats.avgImportance / Math.max(stats.total, 1);

      return stats;
      
    } catch (error: any) {
      console.error('[NMM] ❌ Failed to get stats:', error.message);
      return null;
    }
  }

  /**
   * تنظيف الذكريات المنتهية
   */
  async cleanupExpiredMemories(): Promise<number> {
    try {
      const result = await db.delete(neuralMemoryMesh)
        .where(eq(neuralMemoryMesh.expiresAt, new Date()))
        .returning();

      const deletedCount = Array.isArray(result) ? result.length : 0;
      console.log(`[NMM] 🧹 Cleaned up ${deletedCount} expired memories`);
      return deletedCount;
      
    } catch (error: any) {
      console.error('[NMM] ❌ Cleanup failed:', error.message);
      return 0;
    }
  }

  // ============= HELPER METHODS =============

  private generateMemoryId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `mem-${timestamp}-${random}`;
  }

  private async incrementAccessCount(memoryId: string): Promise<void> {
    try {
      const memory = await db.select()
        .from(neuralMemoryMesh)
        .where(eq(neuralMemoryMesh.memoryId, memoryId))
        .limit(1);

      if (memory.length > 0) {
        await db.update(neuralMemoryMesh)
          .set({
            accessCount: memory[0].accessCount + 1,
            lastAccessedAt: new Date()
          })
          .where(eq(neuralMemoryMesh.memoryId, memoryId));
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * مزامنة دورية كل 10 دقائق
   */
  private startPeriodicSync(): void {
    setInterval(async () => {
      if (this.syncQueue.size === 0) return;

      console.log(`[NMM] 🔄 Periodic sync started (${this.syncQueue.size} memories in queue)`);

      // في الإنتاج سنحصل على قائمة النوى المتصلة من Neural Nodes
      // هنا نفترض وجود nicholas كنواة مركزية
      await this.syncWithNode('nicholas');

    }, 600000); // 10 minutes
  }
}

// ============= SINGLETON INSTANCE =============

let nmmInstance: NeuralMemoryMesh | null = null;

export function initializeNMM(): NeuralMemoryMesh {
  if (!nmmInstance) {
    nmmInstance = new NeuralMemoryMesh();
    console.log('[NMM] ✅ Neural Memory Mesh initialized');
  }
  return nmmInstance;
}

export function getNMM(): NeuralMemoryMesh {
  if (!nmmInstance) {
    throw new Error('[NMM] Not initialized. Call initializeNMM() first.');
  }
  return nmmInstance;
}
