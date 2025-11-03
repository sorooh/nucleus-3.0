/**
 * Knowledge Feed API Gateway - بوابة API لتغذية المعرفة
 * Built from absolute zero - zero templates
 * 
 * REST API for uploading and processing knowledge files
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { knowledgeFeed } from '../core/knowledge-feed';
import { db } from '../../server/db';
import { knowledgeFeeds } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `feed-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.md', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مدعوم. الأنواع المقبولة: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * POST /api/knowledge/upload - رفع ملف جديد
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!knowledgeFeed.isActive()) {
      return res.status(503).json({ error: 'Knowledge Feed Engine is not active' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    }

    // User already validated by requireAdmin middleware
    const user = (req as any).user;

    const fileType = path.extname(req.file.originalname).substring(1).toLowerCase();
    
    // Generate preliminary hash from file before creating record
    const crypto = await import('crypto');
    const fileBuffer = await import('fs').then(fs => fs.promises.readFile(req.file!.path));
    const preliminaryHash = crypto.createHash('sha256')
      .update(fileBuffer)
      .digest('hex');
    
    // Check for existing file with same hash
    const [existing] = await db
      .select()
      .from(knowledgeFeeds)
      .where(eq(knowledgeFeeds.contentHash, preliminaryHash))
      .limit(1);

    if (existing) {
      // Duplicate file - cleanup uploaded file and return error
      await import('fs').then(fs => fs.promises.unlink(req.file!.path)).catch(() => {});
      return res.status(400).json({ error: 'الملف مكرر — تم تخطيه تلقائيًا' });
    }
    
    // Create feed record with actual hash
    const [feedRecord] = await db.insert(knowledgeFeeds).values({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      uploaderId: user.id,
      uploaderName: user.username,
      status: 'queued',
      contentHash: preliminaryHash
    }).returning();

    // Process file
    const processingResult = await knowledgeFeed.processFeed({
      id: feedRecord.id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType,
      fileSize: req.file.size,
      uploaderId: user.id,
      uploaderName: user.username
    });

    res.json({
      message: 'تم الرفع، جاري التحليل...',
      feedId: feedRecord.id,
      fileName: req.file.originalname,
      status: 'processing'
    });

  } catch (error: any) {
    console.error('Knowledge upload error:', error);
    res.status(500).json({ error: error.message || 'فشل رفع الملف' });
  }
});

/**
 * GET /api/knowledge/history - سجل آخر 20 عملية
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const history = await db
      .select()
      .from(knowledgeFeeds)
      .orderBy(desc(knowledgeFeeds.createdAt))
      .limit(20);

    res.json({ history });
  } catch (error: any) {
    console.error('Knowledge history error:', error);
    res.status(500).json({ error: 'فشل جلب السجل' });
  }
});

/**
 * GET /api/knowledge/feed/:id - تفاصيل عملية تغذية محددة
 */
router.get('/feed/:id', async (req: Request, res: Response) => {
  try {
    const [feed] = await db
      .select()
      .from(knowledgeFeeds)
      .where(eq(knowledgeFeeds.id, req.params.id));

    if (!feed) {
      return res.status(404).json({ error: 'لم يتم العثور على العملية' });
    }

    res.json({ feed });
  } catch (error: any) {
    console.error('Knowledge feed error:', error);
    res.status(500).json({ error: 'فشل جلب التفاصيل' });
  }
});

/**
 * GET /api/knowledge/status - حالة محرك التغذية
 */
router.get('/status', (req: Request, res: Response) => {
  const status = knowledgeFeed.getStatus();
  res.json(status);
});

/**
 * POST /api/knowledge/activate - تفعيل محرك التغذية
 */
router.post('/activate', async (req: Request, res: Response) => {
  try {
    await knowledgeFeed.activate();
    res.json({ message: 'تم تفعيل محرك تغذية المعرفة' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge/deactivate - إيقاف محرك التغذية
 */
router.post('/deactivate', (req: Request, res: Response) => {
  knowledgeFeed.deactivate();
  res.json({ message: 'تم إيقاف محرك تغذية المعرفة' });
});

/**
 * GET /api/knowledge/analytics - إحصائيات التغذية
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const totalFeeds = await db.select().from(knowledgeFeeds);
    const completed = totalFeeds.filter(f => f.status === 'completed');
    const errors = totalFeeds.filter(f => f.status === 'error');
    const totalChunks = completed.reduce((sum, f) => sum + (f.chunksCount || 0), 0);
    
    res.json({
      totalFeeds: totalFeeds.length,
      completed: completed.length,
      errors: errors.length,
      processing: totalFeeds.filter(f => f.status === 'processing').length,
      totalChunks,
      avgChunksPerFeed: completed.length > 0 ? Math.round(totalChunks / completed.length) : 0
    });
  } catch (error: any) {
    console.error('Knowledge analytics error:', error);
    res.status(500).json({ error: 'فشل جلب الإحصائيات' });
  }
});

// Import Meta Layers for integration
import { memoryHub } from '../core/memory-hub';
import { governanceEngine } from '../core/governance-engine';
import { pulseMonitor } from '../core/pulse-monitor';

// Event listeners for processing results
knowledgeFeed.on('feed-processed', async (data) => {
  try {
    const { feedId, chunks, contentHash, summary, processingTime } = data;

    // Update feed record with processing results
    await db
      .update(knowledgeFeeds)
      .set({
        status: 'completed',
        chunksCount: chunks.length,
        summary,
        processingTime,
        completedAt: new Date()
      })
      .where(eq(knowledgeFeeds.id, feedId));

    console.log(`✅ Feed processed: ${feedId} - ${chunks.length} chunks`);

    // === Integration with Meta Layers ===
    
    // 1. Memory Hub: Record each chunk as a knowledge insight
    const [feed] = await db.select().from(knowledgeFeeds).where(eq(knowledgeFeeds.id, feedId));
    if (feed && chunks.length > 0) {
      // Send each chunk to Memory Hub for actual knowledge storage
      for (const chunk of chunks) {
        memoryHub.recordInsight({
          type: 'pattern',
          description: `📚 ${feed.originalName} - القطعة ${chunk.chunkIndex + 1}/${chunks.length}`,
          confidence: 0.9,
          sources: ['Knowledge_Feed'],
          evidence: {
            feedId,
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content, // ✅ المحتوى الكامل
            wordCount: chunk.wordCount,
            source: feed.originalName,
            fileType: feed.fileType,
            metadata: chunk.metadata
          }
        });
      }

      // Also record a summary insight
      memoryHub.recordInsight({
        type: 'pattern',
        description: `📊 ملخص: تمت معالجة ${feed.originalName} إلى ${chunks.length} قطع معرفية`,
        confidence: 0.95,
        sources: ['Knowledge_Feed'],
        evidence: {
          feedId,
          fileName: feed.originalName,
          totalChunks: chunks.length,
          totalWords: chunks.reduce((sum: number, c: any) => sum + c.wordCount, 0),
          summary: summary?.substring(0, 300)
        }
      });

      console.log(`🧠 Sent ${chunks.length} knowledge chunks to Memory Hub`);
    }

    // 2. Governance: Submit decision (for audit trail)
    governanceEngine.submitDecision(
      'Knowledge_Feed',
      'knowledge_ingestion',
      {
        feedId,
        chunks: chunks.length,
        fileName: feed?.originalName
      }
    );

  } catch (error) {
    console.error('Error storing chunks:', error);
  }
});

knowledgeFeed.on('feed-error', async (data) => {
  try {
    const { feedId, error } = data;

    // Get feed record to cleanup file
    const [feed] = await db
      .select()
      .from(knowledgeFeeds)
      .where(eq(knowledgeFeeds.id, feedId))
      .limit(1);

    await db
      .update(knowledgeFeeds)
      .set({
        status: 'error',
        errorMessage: error,
        completedAt: new Date()
      })
      .where(eq(knowledgeFeeds.id, feedId));

    // Cleanup uploaded file on error
    if (feed?.fileName) {
      const filePath = path.join(process.cwd(), 'uploads', feed.fileName);
      await import('fs').then(fs => fs.promises.unlink(filePath)).catch(() => {
        console.warn(`Failed to cleanup file: ${filePath}`);
      });
    }

    console.error(`❌ Feed error: ${feedId} - ${error}`);
  } catch (err) {
    console.error('Error updating feed error:', err);
  }
});

console.log('📚 Knowledge Feed API Gateway initialized');

export default router;
