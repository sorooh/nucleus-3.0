/**
 * LAYERS API - Nucleus 3.0 Conscious Intelligence Layers
 * 
 * Endpoints:
 * - POST /api/nucleus/layers/enable - Enable layers
 * - GET /api/nucleus/layers/status - Get layers status
 */

import { Router } from 'express';
import { layersManager } from '../nucleus/intelligence/layers-manager';

const router = Router();

router.post('/enable', async (req, res) => {
  try {
    const { enable, layers, dry_run } = req.body;

    if (typeof enable !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: enable (boolean)'
      });
    }

    if (!Array.isArray(layers)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: layers (array)'
      });
    }

    const result = await layersManager.enableLayers({
      enable,
      layers,
      dry_run: dry_run || false
    });

    res.json(result);
  } catch (error: any) {
    console.error('[LayersAPI] Enable layers failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = layersManager.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error('[LayersAPI] Get status failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/cognitive-mirror/reflect', async (req, res) => {
  try {
    const { decision } = req.body;
    const result = await layersManager.reflectOnDecision(decision);
    res.json({ success: true, reflection: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/emotional-logic/analyze', async (req, res) => {
  try {
    const { input, metadata } = req.body;
    const result = await layersManager.analyzeEmotion(input, metadata);
    res.json({ success: true, analysis: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/swarm-intelligence/propose', async (req, res) => {
  try {
    const { question, metadata } = req.body;
    const decisionId = await layersManager.proposeSwarmDecision(question, metadata);
    res.json({ success: true, decisionId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/swarm-intelligence/vote', async (req, res) => {
  try {
    const { decisionId, vote } = req.body;
    const result = await layersManager.castSwarmVote(decisionId, vote);
    res.json({ success: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/strategic-foresight/forecast', async (req, res) => {
  try {
    const { question, horizon, metadata } = req.body;
    const forecast = await layersManager.generateForecast(question, horizon, metadata);
    res.json({ success: true, forecast });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
