/**
 * VECTOR MEMORY SYSTEM - الذاكرة التجميعية طويلة المدى
 * 
 * نظام تخزين واسترجاع الذكريات باستخدام Vector Database
 * Long-term memory with semantic search capabilities
 */

import { EventEmitter } from 'events';
import { Index } from '@upstash/vector';
import OpenAI from 'openai';

// ============= Types =============

export interface MemoryInput {
  content: string;
  category: string;
  source: string;
  metadata?: Record<string, any>;
  importance?: number; // 0-100
}

export interface Memory {
  id: string;
  content: string;
  category: string;
  source: string;
  metadata: Record<string, any>;
  importance: number;
  timestamp: number;
  [key: string]: any; // Index signature for Upstash Vector compatibility
}

export interface SearchResult {
  memory: Memory;
  score: number;
}

// ============= Vector Memory Engine =============

export class VectorMemory extends EventEmitter {
  private active: boolean = false;
  private index: Index<Memory> | null = null;
  private openai: OpenAI | null = null;
  private memoryCount: number = 0;

  constructor() {
    super();
    console.log('[VectorMemory] Initialized');
  }

  // ============= Activation =============

  async activate(): Promise<void> {
    if (this.active) {
      console.log('[VectorMemory] Already active');
      return;
    }

    try {
      const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
      const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (!vectorUrl || !vectorToken) {
        throw new Error('Upstash Vector credentials not found');
      }

      if (!openaiKey) {
        throw new Error('OpenAI API key not found');
      }

      // Initialize Upstash Vector
      this.index = new Index<Memory>({
        url: vectorUrl,
        token: vectorToken,
      });

      // Initialize OpenAI for embeddings
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });

      // Test connection
      const info = await this.index.info();
      this.memoryCount = info.vectorCount;

      this.active = true;
      this.emit('activated');
      console.log(`🧠 Vector Memory activated - ${this.memoryCount} memories stored`);
    } catch (error: any) {
      console.error('[VectorMemory] Activation failed:', error.message);
      throw error;
    }
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.index = null;
    this.openai = null;
    this.emit('deactivated');
    console.log('[VectorMemory] Deactivated');
  }

  // ============= Memory Storage =============

  async store(input: MemoryInput): Promise<string> {
    if (!this.active || !this.index || !this.openai) {
      throw new Error('Vector Memory is not active');
    }

    try {
      // Generate embedding using OpenAI
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: input.content,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Create memory object
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const memory: Memory = {
        id: memoryId,
        content: input.content,
        category: input.category,
        source: input.source,
        metadata: input.metadata || {},
        importance: input.importance || 50,
        timestamp: Date.now(),
      };

      // Store in Upstash Vector
      await this.index.upsert({
        id: memoryId,
        vector: embedding,
        metadata: memory,
      });

      this.memoryCount++;
      this.emit('memory-stored', memory);
      
      console.log(`💾 Memory stored: ${input.category} from ${input.source}`);
      return memoryId;
    } catch (error: any) {
      console.error('[VectorMemory] Store failed:', error.message);
      throw error;
    }
  }

  // ============= Memory Retrieval =============

  async search(query: string, limit: number = 5, category?: string): Promise<SearchResult[]> {
    if (!this.active || !this.index || !this.openai) {
      throw new Error('Vector Memory is not active');
    }

    try {
      // Generate query embedding
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Search in vector database
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
        filter: category ? `category = '${category}'` : undefined,
      });

      const searchResults: SearchResult[] = results.map((result) => ({
        memory: result.metadata as Memory,
        score: result.score,
      }));

      this.emit('memory-searched', { query, resultsCount: searchResults.length });
      return searchResults;
    } catch (error: any) {
      console.error('[VectorMemory] Search failed:', error.message);
      throw error;
    }
  }

  // ============= Memory Recall =============

  async recall(memoryId: string): Promise<Memory | null> {
    if (!this.active || !this.index) {
      throw new Error('Vector Memory is not active');
    }

    try {
      const result = await this.index.fetch([memoryId], { includeMetadata: true });
      
      if (result.length === 0 || !result[0]?.metadata) {
        return null;
      }

      return result[0].metadata as unknown as Memory;
    } catch (error: any) {
      console.error('[VectorMemory] Recall failed:', error.message);
      throw error;
    }
  }

  // ============= Bulk Operations =============

  async storeMany(inputs: MemoryInput[]): Promise<string[]> {
    const ids: string[] = [];

    for (const input of inputs) {
      const id = await this.store(input);
      ids.push(id);
    }

    console.log(`📦 Bulk stored ${ids.length} memories`);
    return ids;
  }

  async searchMultiple(queries: string[], limit: number = 5): Promise<Map<string, SearchResult[]>> {
    const results = new Map<string, SearchResult[]>();

    for (const query of queries) {
      const searchResults = await this.search(query, limit);
      results.set(query, searchResults);
    }

    return results;
  }

  // ============= Memory Management =============

  async deleteMemory(memoryId: string): Promise<void> {
    if (!this.active || !this.index) {
      throw new Error('Vector Memory is not active');
    }

    try {
      await this.index.delete(memoryId);
      this.memoryCount--;
      console.log(`🗑️ Memory deleted: ${memoryId}`);
      this.emit('memory-deleted', memoryId);
    } catch (error: any) {
      console.error('[VectorMemory] Delete failed:', error.message);
      throw error;
    }
  }

  async clearCategory(category: string): Promise<void> {
    if (!this.active || !this.index) {
      throw new Error('Vector Memory is not active');
    }

    try {
      // Note: Upstash Vector doesn't support deleteMany yet
      // Would need to fetch all IDs and delete individually
      console.log(`⚠️ Clear category not fully implemented yet: ${category}`);
      this.emit('category-cleared', category);
    } catch (error: any) {
      console.error('[VectorMemory] Clear category failed:', error.message);
      throw error;
    }
  }

  // ============= Stats =============

  async getStats(): Promise<{
    totalMemories: number;
    categoryCounts: Record<string, number>;
  }> {
    if (!this.active || !this.index) {
      throw new Error('Vector Memory is not active');
    }

    const info = await this.index.info();
    
    return {
      totalMemories: info.vectorCount,
      categoryCounts: {}, // Would need to scan all memories to count by category
    };
  }

  getMemoryCount(): number {
    return this.memoryCount;
  }
}

// ============= Export Singleton =============

export const vectorMemory = new VectorMemory();
