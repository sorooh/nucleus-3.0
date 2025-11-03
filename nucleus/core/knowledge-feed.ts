/**
 * Knowledge Feed Engine - محرك تغذية المعرفة
 * Built from absolute zero - zero templates
 * 
 * Purpose: Process uploaded files, extract text, chunk, and store in Vector DB
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { db } from '../../server/db';
import { knowledgeFeeds } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { memoryHub } from './memory-hub';

// Types
interface FeedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploaderId: string;
  uploaderName: string;
}

interface TextChunk {
  id: string;
  feedId: string;
  content: string;
  chunkIndex: number;
  wordCount: number;
  metadata: {
    source: string;
    fileType: string;
    uploadDate: string;
    chunkOf: number; // total chunks
  };
}

interface ProcessingResult {
  feedId: string;
  status: 'completed' | 'error';
  chunksCount: number;
  summary?: string;
  errorMessage?: string;
  processingTime: number;
}

class KnowledgeFeedEngine extends EventEmitter {
  private active: boolean = false;
  private processingQueue: Map<string, FeedFile> = new Map();
  private readonly CHUNK_SIZE = 900; // words per chunk
  private readonly UPLOADS_DIR = path.join(process.cwd(), 'uploads');

  constructor() {
    super();
    console.log('[KnowledgeFeed] Initialized (from absolute zero)');
  }

  async activate() {
    this.active = true;
    this.emit('activated');
    console.log('📚 Knowledge Feed activated - Ready to learn');
    
    // Ensure uploads directory exists
    await this.ensureDirectory(this.UPLOADS_DIR);
  }

  deactivate() {
    this.active = false;
    this.emit('deactivated');
    console.log('📚 Knowledge Feed deactivated');
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Process uploaded file - main entry point
   */
  async processFeed(file: FeedFile): Promise<ProcessingResult> {
    if (!this.active) {
      throw new Error('Knowledge Feed Engine is not active');
    }

    const startTime = Date.now();
    this.processingQueue.set(file.id, file);

    try {
      // Extract text from file
      const extractedText = await this.extractText(file);
      
      // Generate content hash for duplicate detection
      const contentHash = this.generateHash(extractedText);

      // Split text into chunks
      const chunks = this.chunkText(extractedText, file);

      // Generate summary
      const summary = this.generateSummary(extractedText);

      const processingTime = Date.now() - startTime;

      this.processingQueue.delete(file.id);

      // ✅ Update database record
      await db
        .update(knowledgeFeeds)
        .set({
          status: 'completed',
          chunksCount: chunks.length,
          summary,
          processingTime,
          completedAt: new Date()
        })
        .where(eq(knowledgeFeeds.id, file.id));

      // ✅ Send chunks to Memory Hub
      for (const chunk of chunks) {
        memoryHub.recordInsight({
          type: 'pattern',
          description: `📚 ${file.originalName} - القطعة ${chunk.chunkIndex + 1}/${chunks.length}`,
          confidence: 0.9,
          sources: ['Knowledge_Feed'],
          evidence: {
            feedId: file.id,
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            wordCount: chunk.wordCount,
            source: file.originalName,
            fileType: file.fileType,
            metadata: chunk.metadata
          }
        });
      }

      // ✅ Record summary insight
      memoryHub.recordInsight({
        type: 'pattern',
        description: `📊 ملخص: تمت معالجة ${file.originalName} إلى ${chunks.length} قطع معرفية`,
        confidence: 0.95,
        sources: ['Knowledge_Feed'],
        evidence: {
          feedId: file.id,
          fileName: file.originalName,
          totalChunks: chunks.length,
          totalWords: chunks.reduce((sum: number, c: any) => sum + c.wordCount, 0),
          summary: summary?.substring(0, 300)
        }
      });

      console.log(`🧠 Sent ${chunks.length} knowledge chunks to Memory Hub`);

      this.emit('feed-processed', {
        feedId: file.id,
        chunks,
        contentHash,
        summary,
        processingTime
      });

      return {
        feedId: file.id,
        status: 'completed',
        chunksCount: chunks.length,
        summary,
        processingTime
      };

    } catch (error: any) {
      this.processingQueue.delete(file.id);
      
      const processingTime = Date.now() - startTime;
      
      this.emit('feed-error', {
        feedId: file.id,
        error: error.message
      });

      return {
        feedId: file.id,
        status: 'error',
        chunksCount: 0,
        errorMessage: error.message,
        processingTime
      };
    }
  }

  /**
   * Extract text from different file types
   */
  private async extractText(file: FeedFile): Promise<string> {
    const fileBuffer = await fs.readFile(file.filePath);

    switch (file.fileType) {
      case 'txt':
      case 'md':
        return fileBuffer.toString('utf-8');

      case 'pdf':
        // Dynamic import for pdf-parse (CommonJS module)
        const { default: pdfParse } = await import('pdf-parse');
        const pdfData = await pdfParse(fileBuffer);
        return pdfData.text;

      case 'docx':
        const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
        return docxResult.value;

      default:
        throw new Error(`Unsupported file type: ${file.fileType}`);
    }
  }

  /**
   * Split text into chunks of ~800-1000 words
   */
  private chunkText(text: string, file: FeedFile): TextChunk[] {
    // Clean and normalize text
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into words
    const words = cleanText.split(/\s+/);
    const chunks: TextChunk[] = [];
    
    let chunkIndex = 0;
    for (let i = 0; i < words.length; i += this.CHUNK_SIZE) {
      const chunkWords = words.slice(i, i + this.CHUNK_SIZE);
      const chunkContent = chunkWords.join(' ');
      
      const chunk: TextChunk = {
        id: `chunk-${file.id}-${chunkIndex}`,
        feedId: file.id,
        content: chunkContent,
        chunkIndex,
        wordCount: chunkWords.length,
        metadata: {
          source: file.originalName,
          fileType: file.fileType,
          uploadDate: new Date().toISOString(),
          chunkOf: Math.ceil(words.length / this.CHUNK_SIZE)
        }
      };

      chunks.push(chunk);
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Generate content hash for duplicate detection
   */
  private generateHash(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex');
  }

  /**
   * Generate summary from text (first 3 important points)
   */
  private generateSummary(text: string, maxLength: number = 500): string {
    // Simple summary: first paragraph or sentences
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    const summary = sentences
      .slice(0, 3)
      .join('. ');

    return summary.length > maxLength 
      ? summary.substring(0, maxLength) + '...'
      : summary + '.';
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Get processing status
   */
  getStatus() {
    return {
      active: this.active,
      queueSize: this.processingQueue.size,
      processing: Array.from(this.processingQueue.values()).map(f => ({
        id: f.id,
        fileName: f.originalName,
        fileType: f.fileType
      }))
    };
  }

  /**
   * Clean up uploaded file after processing
   */
  async cleanupFile(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup file: ${filePath}`, error);
    }
  }
}

// Singleton instance
export const knowledgeFeed = new KnowledgeFeedEngine();
