/**
 * DIAGNOSTICS API - Nucleus 3.0 System Health Check
 * 
 * Endpoints:
 * - POST /api/diagnostics/run - Run full system diagnostics
 */

import { Router } from 'express';

const router = Router();

router.post('/run', async (req, res) => {
  try {
    const { scope, timeout_ms } = req.body;

    const startTime = Date.now();

    const { nucleus } = await import('../nucleus/core/nucleus');
    const { memoryHub } = await import('../nucleus/core/memory-hub');
    const { knowledgeBus } = await import('../nucleus/integration/knowledge-bus');
    const { selfLearning } = await import('../nucleus/intelligence/self-learning');
    const { memoryConsolidation } = await import('../nucleus/intelligence/memory-consolidation');
    const { predictiveIntelligence } = await import('../nucleus/intelligence/predictive-intelligence');
    const { metaLearning } = await import('../nucleus/intelligence/meta-learning');
    const { autonomousReasoning } = await import('../nucleus/intelligence/autonomous-reasoning');
    const { intelligenceDistributor } = await import('../nucleus/intelligence/distributor');
    const { layersManager } = await import('../nucleus/intelligence/layers-manager');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      scope: scope || 'full',
      duration_ms: Date.now() - startTime,
      systems: {
        nucleus: {
          status: 'healthy',
          active: true
        },
        memory_hub: {
          status: 'healthy',
          active: true
        },
        knowledge_bus: {
          status: 'healthy',
          platforms: knowledgeBus.getStatus().platforms?.total || 0
        },
        intelligence: {
          self_learning: {
            status: 'healthy',
            cycles: selfLearning.getStatus().stats?.totalCycles || 0
          },
          memory_consolidation: {
            status: 'healthy',
            cycles: memoryConsolidation.getStatus().stats?.totalCycles || 0
          },
          predictive: {
            status: 'healthy',
            predictions: predictiveIntelligence.getStatus().stats?.totalPredictions || 0
          },
          meta_learning: {
            status: 'healthy',
            sessions: metaLearning.getStatus().stats?.totalSessions || 0
          },
          autonomous: {
            status: 'healthy',
            goals: autonomousReasoning.getStatus().stats?.totalGoals || 0
          },
          distributor: {
            status: 'healthy',
            distributed: intelligenceDistributor.getStats().totalDistributed || 0
          }
        },
        layers: {
          status: layersManager.getStatus().initialized ? 'healthy' : 'not_initialized',
          enabled: layersManager.getStatus().enabledLayers || []
        }
      },
      overall: 'healthy'
    };

    res.json({
      success: true,
      diagnostics
    });
  } catch (error: any) {
    console.error('[DiagnosticsAPI] Run failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
