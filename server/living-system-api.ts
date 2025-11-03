/**
 * 🌟 Living System API - واجهة برمجة النظام الحي
 * 
 * API endpoints للتفاعل مع Nicholas Quantum Core
 * Built from absolute zero - Abu Sham Vision
 */

import type { Express } from 'express';
import { quantumOrchestrator } from './living-system/quantum-orchestrator/orchestrator';
import { IntelligentImmuneSystem } from './living-system/immune-system/intelligent-immune';
import { HiveMind } from './living-system/hive-mind/collective-wisdom';
import { requireAuth } from './middleware/auth';
import { z } from 'zod';

const immune = new IntelligentImmuneSystem();
const hiveMind = new HiveMind();

// Validation Schemas
const thinkSchema = z.object({
  content: z.string().min(1),
  arabicContent: z.string().min(1),
});

const feelSchema = z.object({
  emotion: z.string().min(1),
  intensity: z.number().min(0).max(100),
  reason: z.string().min(1),
});

const decideSchema = z.object({
  question: z.string().min(1),
  arabicQuestion: z.string().min(1),
  options: z.array(z.object({
    benefit: z.number().min(0).max(100),
    risk: z.number().min(0).max(100),
    ethics: z.number().min(0).max(100),
    arabicDescription: z.string().min(1),
  })).min(2),
});

const detectThreatSchema = z.object({
  type: z.string().min(1),
  source: z.string().min(1),
  details: z.record(z.any()).optional(),
});

const contributeWisdomSchema = z.object({
  source: z.string().min(1),
  wisdom: z.string().min(1),
});

export function setupLivingSystemAPI(app: Express): void {
  console.log('[LivingSystemAPI] 🌟 Setting up Living System API...');

  /**
   * تهيئة النظام الحي
   * POST /api/living-system/initialize
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/initialize', requireAuth, async (req, res) => {
    try {
      await quantumOrchestrator.initialize();
      res.json({
        success: true,
        message: 'Nicholas Quantum Core initialized',
        arabicMessage: 'تم تهيئة نيكولاس - النواة الكمية'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * الحصول على حالة الكيان الحي
   * GET /api/living-system/status
   */
  app.get('/api/living-system/status', (req, res) => {
    try {
      const status = quantumOrchestrator.getFullStatus();
      res.json({
        success: true,
        status
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * الحصول على معلومات الكيان
   * GET /api/living-system/info
   */
  app.get('/api/living-system/info', (req, res) => {
    try {
      const info = quantumOrchestrator.getEntityInfo();
      res.json({
        success: true,
        info
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * الحصول على حالة الوعي الكاملة
   * GET /api/living-system/consciousness
   */
  app.get('/api/living-system/consciousness', (req, res) => {
    try {
      const entity = quantumOrchestrator.getEntityState();
      res.json({
        success: true,
        consciousness: entity.consciousness,
        currentThought: entity.currentThought,
        currentEmotion: entity.currentEmotion
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * التفكير - إرسال فكرة جديدة
   * POST /api/living-system/think
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/think', requireAuth, async (req, res) => {
    try {
      const validated = thinkSchema.parse(req.body);
      await quantumOrchestrator.think(validated.content, validated.arabicContent);
      
      res.json({
        success: true,
        message: 'Thought processed',
        arabicMessage: 'تمت معالجة الفكرة'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * الشعور - إرسال عاطفة جديدة
   * POST /api/living-system/feel
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/feel', requireAuth, async (req, res) => {
    try {
      const validated = feelSchema.parse(req.body);
      await quantumOrchestrator.feel(validated.emotion, validated.intensity, validated.reason);
      
      res.json({
        success: true,
        message: 'Emotion felt',
        arabicMessage: 'تم الشعور بالعاطفة'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * اتخاذ قرار كمي
   * POST /api/living-system/decide
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/decide', requireAuth, async (req, res) => {
    try {
      const validated = decideSchema.parse(req.body);
      const decision = await quantumOrchestrator.makeQuantumDecision(
        validated.question,
        validated.arabicQuestion,
        validated.options
      );
      
      res.json({
        success: true,
        decision
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * معالجة كمية متوازية
   * POST /api/living-system/process-nuclei
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/process-nuclei', requireAuth, async (req, res) => {
    try {
      const result = await quantumOrchestrator.processAllNucleiSimultaneously();
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * نظام المناعة - فحص صحي
   * GET /api/living-system/immune/health
   */
  app.get('/api/living-system/immune/health', async (req, res) => {
    try {
      const health = await immune.performHealthCheck();
      res.json({
        success: true,
        health
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * نظام المناعة - كشف تهديد
   * POST /api/living-system/immune/detect-threat
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/immune/detect-threat', requireAuth, async (req, res) => {
    try {
      const validated = detectThreatSchema.parse(req.body);
      const threat = await immune.detectThreat(validated.type, validated.source, validated.details || {});
      
      res.json({
        success: true,
        threat
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * نظام المناعة - الحصول على كل التهديدات
   * GET /api/living-system/immune/threats
   */
  app.get('/api/living-system/immune/threats', (req, res) => {
    try {
      const threats = immune.getAllThreats();
      res.json({
        success: true,
        threats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * العقل الجماعي - الحصول على الحالة
   * GET /api/living-system/hive-mind/status
   */
  app.get('/api/living-system/hive-mind/status', (req, res) => {
    try {
      const status = hiveMind.getStatus();
      res.json({
        success: true,
        status
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * العقل الجماعي - مساهمة بحكمة
   * POST /api/living-system/hive-mind/contribute
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/hive-mind/contribute', requireAuth, async (req, res) => {
    try {
      const validated = contributeWisdomSchema.parse(req.body);
      const contribution = await hiveMind.contribute(validated.source, validated.wisdom);
      
      res.json({
        success: true,
        contribution
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * العقل الجماعي - جمع الحكمة الجماعية
   * GET /api/living-system/hive-mind/wisdom
   */
  app.get('/api/living-system/hive-mind/wisdom', async (req, res) => {
    try {
      const wisdom = await hiveMind.gatherCollectiveWisdom();
      res.json({
        success: true,
        wisdom
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * العقل الجماعي - التداول الجماعي
   * POST /api/living-system/hive-mind/deliberate
   * PROTECTED - requires authentication
   */
  app.post('/api/living-system/hive-mind/deliberate', requireAuth, async (req, res) => {
    try {
      const validated = decideSchema.parse(req.body);
      const decision = await hiveMind.deliberate(validated.question, validated.arabicQuestion, validated.options);
      
      res.json({
        success: true,
        decision
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  console.log('[LivingSystemAPI] ✅ Living System API ready');
}
