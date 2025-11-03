/**
 * Awareness Layer API Routes
 * Provides endpoints for monitoring and controlling the awareness system
 */

import express from 'express';
import { awarenessLayer } from './index';
import { logProcessor } from './log-processor';
import { knowledgeGraph } from './knowledge-graph';
import { problemDiagnoser } from './problem-diagnoser';

const router = express.Router();

/**
 * Get awareness system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await awarenessLayer.getStatus();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get full awareness report
 */
router.get('/report', async (req, res) => {
  try {
    const report = await awarenessLayer.getAwarenessReport();
    res.json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Activate awareness layer
 */
router.post('/activate', async (req, res) => {
  try {
    await awarenessLayer.activate();
    res.json({ success: true, message: 'Awareness layer activated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Run awareness cycle
 */
router.post('/cycle', async (req, res) => {
  try {
    await awarenessLayer.runAwarenessCycle();
    res.json({ success: true, message: 'Awareness cycle completed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get knowledge graph data
 */
router.get('/knowledge-graph', (req, res) => {
  try {
    const graphData = knowledgeGraph.getGraphData();
    res.json({ success: true, graphData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get diagnostic report
 */
router.get('/diagnostics', (req, res) => {
  try {
    const report = problemDiagnoser.generateDiagnosticReport();
    res.json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get all detected issues
 */
router.get('/issues', (req, res) => {
  try {
    const issues = problemDiagnoser.getAllIssues();
    res.json({ success: true, issues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get proposed solutions
 */
router.get('/solutions', (req, res) => {
  try {
    const solutions = problemDiagnoser.getAllSolutions();
    res.json({ success: true, solutions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
