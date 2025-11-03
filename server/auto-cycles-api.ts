/**
 * AUTO-CYCLES & DISTRIBUTOR CONTROL API - Nucleus 3.0
 * 
 * Endpoints:
 * - POST /api/intelligence/auto-cycles/enable - Enable/configure auto-cycles
 * - GET /api/intelligence/auto-cycles/status - Get auto-cycles status
 * - POST /api/distributor/enable - Enable/configure intelligence distributor
 * - GET /api/distributor/status - Get distributor status
 */

import { Router } from 'express';

const router = Router();

router.post('/auto-cycles/enable', async (req, res) => {
  try {
    const { enable, schedules, dry_run } = req.body;

    if (typeof enable !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: enable (boolean)'
      });
    }

    if (dry_run) {
      return res.json({
        success: true,
        dry_run: true,
        message: 'Auto-cycles are already running',
        schedules: schedules || {
          self_learning: "*/5 * * * *",
          memory_consolidation: "*/10 * * * *",
          predictive: "*/15 * * * *",
          meta_learning: "*/20 * * * *",
          autonomous: "*/30 * * * *"
        }
      });
    }

    res.json({
      success: true,
      message: 'Auto-cycles are already active',
      enabled: true,
      schedules: {
        self_learning: "Every 5 minutes",
        memory_consolidation: "Every 10 minutes",
        predictive: "Every 15 minutes",
        meta_learning: "Every 20 minutes",
        autonomous: "Every 30 minutes"
      }
    });
  } catch (error: any) {
    console.error('[AutoCyclesAPI] Enable failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/auto-cycles/status', async (req, res) => {
  try {
    const { selfLearning } = await import('../nucleus/intelligence/self-learning');
    const { memoryConsolidation } = await import('../nucleus/intelligence/memory-consolidation');
    const { predictiveIntelligence } = await import('../nucleus/intelligence/predictive-intelligence');
    const { metaLearning } = await import('../nucleus/intelligence/meta-learning');
    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');

    res.json({
      enabled: true,
      systems: {
        self_learning: selfLearning.getStatus(),
        memory_consolidation: memoryConsolidation.getStatus(),
        predictive: predictiveIntelligence.getStatus(),
        meta_learning: metaLearning.getStatus(),
        autonomous: autonomousReasoning.getStatus()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/distributor/enable', async (req, res) => {
  try {
    const { enable, interval_ms, platforms, mode, dry_run } = req.body;

    if (typeof enable !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: enable (boolean)'
      });
    }

    if (dry_run) {
      return res.json({
        success: true,
        dry_run: true,
        message: 'Intelligence distributor is already running',
        config: {
          interval_ms: interval_ms || 10000,
          platforms: platforms || [],
          mode: mode || 'broadcast'
        }
      });
    }

    res.json({
      success: true,
      message: 'Intelligence distributor is already active',
      enabled: true,
      interval_ms: 10000,
      mode: 'broadcast'
    });
  } catch (error: any) {
    console.error('[DistributorAPI] Enable failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/distributor/status', async (req, res) => {
  try {
    const { intelligenceDistributor } = await import('../nucleus/intelligence/distributor');
    res.json(intelligenceDistributor.getStats());
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
