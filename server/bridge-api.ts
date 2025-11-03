/**
 * AI Bridge API - Adaptive Routing Layer
 * Connects Nucleus with Python AI Provider Bridge
 */

import { Router } from 'express';
import { bridgeClient } from '../nucleus/intelligence/bridge-client';

const router = Router();

/**
 * POST /api/bridge/complete
 * Send request to AI Bridge (adaptive routing)
 */
router.post('/complete', async (req, res) => {
  try {
    const { prompt, taskType, maxTokens, temperature, taskId } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    const result = await bridgeClient.complete(prompt, {
      taskType,
      maxTokens,
      temperature,
      taskId
    });

    return res.json(result);

  } catch (error: any) {
    console.error('[BridgeAPI] Complete error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Bridge request failed'
    });
  }
});

/**
 * POST /api/bridge/claude
 * Send request to Claude via Bridge
 */
router.post('/claude', async (req, res) => {
  try {
    const { prompt, maxTokens, temperature } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    const result = await bridgeClient.completeClaude(prompt, {
      maxTokens,
      temperature
    });

    return res.json(result);

  } catch (error: any) {
    console.error('[BridgeAPI] Claude error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Claude bridge request failed'
    });
  }
});

/**
 * GET /api/bridge/health
 * Check bridge health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await bridgeClient.healthCheck();
    
    return res.json({
      success: health.healthy,
      bridge: health
    });

  } catch (error: any) {
    console.error('[BridgeAPI] Health check error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Health check failed'
    });
  }
});

/**
 * POST /api/bridge/analyze
 * Analysis task (routed to best provider)
 */
router.post('/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: prompt'
      });
    }

    const result = await bridgeClient.complete(prompt, {
      taskType: 'analysis',
      temperature: 0.3
    });

    return res.json(result);

  } catch (error: any) {
    console.error('[BridgeAPI] Analyze error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed'
    });
  }
});

export default router;
