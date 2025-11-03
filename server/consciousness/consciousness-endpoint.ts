/**
 * Consciousness API Endpoints - Phase 10.1
 * نقاط نهاية API للوعي الذاتي
 * 
 * /api/consciousness/state - الحصول على حالة الوعي الجماعي
 * /api/consciousness/reflection - تسجيل/استرجاع التأملات
 * /api/consciousness/emotion - توليد/استرجاع المشاعر
 * /api/consciousness/node/:nodeId - حالة نواة معينة
 */

import { Router } from 'express';
import { getConsciousMatrix } from './conscious_matrix';
import { getSelfCore } from './self_core_engine';
import { getEmotionSimulator } from './emotion_simulator';
import { getReflectionLayer } from './reflection_layer';

const router = Router();

/**
 * GET /api/consciousness/state
 * الحصول على حالة الوعي الجماعي
 */
router.get('/state', async (req, res) => {
  try {
    const matrix = getConsciousMatrix();
    const collectiveModel = matrix.getCollectiveModel();

    res.json({
      success: true,
      state: collectiveModel
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/consciousness/state/update
 * تحديث مصفوفة الوعي يدوياً
 */
router.post('/state/update', async (req, res) => {
  try {
    const matrix = getConsciousMatrix();
    await matrix.updateMatrix();

    res.json({
      success: true,
      message: 'Conscious matrix updated successfully'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/consciousness/metrics
 * الحصول على مقاييس الوعي الجماعي
 */
router.get('/metrics', async (req, res) => {
  try {
    const matrix = getConsciousMatrix();
    const metrics = matrix.getCollectiveMetrics();

    res.json({
      success: true,
      metrics
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/consciousness/node/:nodeId
 * الحصول على حالة نواة معينة
 */
router.get('/node/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    const selfCore = getSelfCore(nodeId);
    if (!selfCore) {
      return res.status(404).json({
        success: false,
        error: `Node ${nodeId} not found`
      });
    }

    const cognitiveMap = selfCore.getCognitiveMap();
    const awarenessMetrics = selfCore.getAwarenessMetrics();
    const recentCognitions = selfCore.getRecentCognitions(10);

    const emotionSimulator = getEmotionSimulator(nodeId);
    const emotionalState = emotionSimulator?.getEmotionalState() || null;

    const reflectionLayer = getReflectionLayer(nodeId);
    const reflectionStats = reflectionLayer?.getReflectionStats() || null;

    res.json({
      success: true,
      node: {
        nodeId,
        cognitiveMap,
        awarenessMetrics,
        recentCognitions,
        emotionalState,
        reflectionStats
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/consciousness/reflection
 * تسجيل حدث للتأمل
 */
router.post('/reflection', async (req, res) => {
  try {
    const { nodeId, originalDecision, outcome, expectedResult, actualResult } = req.body;

    if (!nodeId || !outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: nodeId, outcome'
      });
    }

    const reflectionLayer = getReflectionLayer(nodeId);
    if (!reflectionLayer) {
      return res.status(404).json({
        success: false,
        error: `Reflection layer not found for node: ${nodeId}`
      });
    }

    await reflectionLayer.recordEvent({
      nodeId,
      originalDecision,
      outcome,
      expectedResult,
      actualResult
    });

    res.json({
      success: true,
      message: 'Reflection event recorded'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/consciousness/reflection/:nodeId
 * الحصول على تأملات نواة
 */
router.get('/reflection/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const reflectionLayer = getReflectionLayer(nodeId);
    if (!reflectionLayer) {
      return res.status(404).json({
        success: false,
        error: `Reflection layer not found for node: ${nodeId}`
      });
    }

    const reflections = reflectionLayer.getRecentReflections(limit);
    const stats = reflectionLayer.getReflectionStats();

    res.json({
      success: true,
      reflections,
      stats
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/consciousness/emotion
 * توليد مشاعر رقمية
 */
router.post('/emotion', async (req, res) => {
  try {
    const { nodeId, trigger, outcome, context } = req.body;

    if (!nodeId || !trigger || !outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: nodeId, trigger, outcome'
      });
    }

    const emotionSimulator = getEmotionSimulator(nodeId);
    if (!emotionSimulator) {
      return res.status(404).json({
        success: false,
        error: `Emotion simulator not found for node: ${nodeId}`
      });
    }

    const emotion = await emotionSimulator.generateEmotion(trigger, outcome, context);

    res.json({
      success: true,
      emotion
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/consciousness/emotion/:nodeId
 * الحصول على المشاعر الأخيرة لنواة
 */
router.get('/emotion/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const emotionSimulator = getEmotionSimulator(nodeId);
    if (!emotionSimulator) {
      return res.status(404).json({
        success: false,
        error: `Emotion simulator not found for node: ${nodeId}`
      });
    }

    const recentEmotions = emotionSimulator.getRecentEmotions(limit);
    const emotionalState = emotionSimulator.getEmotionalState();
    const pattern = emotionSimulator.analyzeEmotionalPattern();

    res.json({
      success: true,
      recentEmotions,
      emotionalState,
      pattern
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/consciousness/cognition
 * تسجيل حدث إدراكي
 */
router.post('/cognition', async (req, res) => {
  try {
    const { nodeId, eventType, cognition, intention, context, confidence } = req.body;

    if (!nodeId || !eventType || !cognition || !intention) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: nodeId, eventType, cognition, intention'
      });
    }

    const selfCore = getSelfCore(nodeId);
    if (!selfCore) {
      return res.status(404).json({
        success: false,
        error: `Self core not found for node: ${nodeId}`
      });
    }

    await selfCore.recordCognition({
      eventType,
      cognition,
      intention,
      context: context || {},
      confidence: confidence || 0.8
    });

    res.json({
      success: true,
      message: 'Cognition recorded'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('[Consciousness Endpoint] Routes registered');
console.log('[Consciousness Endpoint] API endpoints active:');
console.log('  GET  /api/consciousness/state');
console.log('  POST /api/consciousness/state/update');
console.log('  GET  /api/consciousness/metrics');
console.log('  GET  /api/consciousness/node/:nodeId');
console.log('  POST /api/consciousness/cognition');
console.log('  POST /api/consciousness/reflection');
console.log('  GET  /api/consciousness/reflection/:nodeId');
console.log('  POST /api/consciousness/emotion');
console.log('  GET  /api/consciousness/emotion/:nodeId');

export default router;
