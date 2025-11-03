/**
 * MEMORY GATEWAY - Built from Absolute Zero
 * 
 * REST API for Evolving Memory Layer
 * Access Surooh's historical learning data
 */

import { Router, Request, Response } from 'express';
import { memoryHub } from '../core/memory-hub';

const router = Router();

// ============= Model Memory =============

// Record model update
router.post('/record-model', (req: Request, res: Response) => {
  try {
    const { sourceBrain, modelVersion, modelType, changeReason, impact, artifacts, metadata } = req.body;

    if (!sourceBrain || !modelVersion || !modelType || !changeReason || impact === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceBrain, modelVersion, modelType, changeReason, impact' 
      });
    }

    const memory = memoryHub.recordModelUpdate({
      sourceBrain,
      modelVersion,
      modelType,
      changeReason,
      impact,
      artifacts,
      metadata
    });

    res.json({
      message: 'Model memory recorded',
      memory: {
        id: memory.id,
        sourceBrain: memory.sourceBrain,
        modelVersion: memory.modelVersion,
        impact: memory.impact,
        timestamp: memory.timestamp
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get model history
router.get('/models', (req: Request, res: Response) => {
  try {
    const { sourceBrain, modelType, from, to, limit } = req.query;

    const history = memoryHub.getModelHistory({
      sourceBrain: sourceBrain as string,
      modelType: modelType as string,
      from: from ? parseInt(from as string) : undefined,
      to: to ? parseInt(to as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      count: history.length,
      models: history.map(m => ({
        id: m.id,
        sourceBrain: m.sourceBrain,
        modelVersion: m.modelVersion,
        modelType: m.modelType,
        changeReason: m.changeReason,
        impact: m.impact,
        timestamp: m.timestamp
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Decision Memory =============

// Record decision
router.post('/record-decision', (req: Request, res: Response) => {
  try {
    const { sourceBrain, decisionType, context, outcome, impact, learnedLesson } = req.body;

    if (!sourceBrain || !decisionType || !context || !outcome || impact === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceBrain, decisionType, context, outcome, impact' 
      });
    }

    const memory = memoryHub.recordDecision({
      sourceBrain,
      decisionType,
      context,
      outcome,
      impact,
      learnedLesson
    });

    res.json({
      message: 'Decision memory recorded',
      memory: {
        id: memory.id,
        sourceBrain: memory.sourceBrain,
        decisionType: memory.decisionType,
        outcome: memory.outcome,
        impact: memory.impact,
        timestamp: memory.timestamp
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get decision history
router.get('/decisions', (req: Request, res: Response) => {
  try {
    const { sourceBrain, decisionType, outcome, from, to, limit } = req.query;

    const history = memoryHub.getDecisionHistory({
      sourceBrain: sourceBrain as string,
      decisionType: decisionType as string,
      outcome: outcome as string,
      from: from ? parseInt(from as string) : undefined,
      to: to ? parseInt(to as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      count: history.length,
      decisions: history.map(d => ({
        id: d.id,
        sourceBrain: d.sourceBrain,
        decisionType: d.decisionType,
        outcome: d.outcome,
        impact: d.impact,
        learnedLesson: d.learnedLesson,
        timestamp: d.timestamp
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Experiment Memory =============

// Record experiment
router.post('/record-experiment', (req: Request, res: Response) => {
  try {
    const { sourceBrain, hypothesis, method, result, conclusion, applied } = req.body;

    if (!sourceBrain || !hypothesis || !method || !result || !conclusion) {
      return res.status(400).json({ 
        error: 'Missing required fields: sourceBrain, hypothesis, method, result, conclusion' 
      });
    }

    const memory = memoryHub.recordExperiment({
      sourceBrain,
      hypothesis,
      method,
      result,
      conclusion,
      applied: applied || false
    });

    res.json({
      message: 'Experiment memory recorded',
      memory: {
        id: memory.id,
        sourceBrain: memory.sourceBrain,
        hypothesis: memory.hypothesis,
        conclusion: memory.conclusion,
        applied: memory.applied,
        timestamp: memory.timestamp
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Insight Memory =============

// Record insight
router.post('/record-insight', (req: Request, res: Response) => {
  try {
    const { type, description, confidence, sources, evidence } = req.body;

    if (!type || !description || confidence === undefined || !sources || !evidence) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, description, confidence, sources, evidence' 
      });
    }

    const memory = memoryHub.recordInsight({
      type,
      description,
      confidence,
      sources,
      evidence
    });

    res.json({
      message: 'Insight memory recorded',
      memory: {
        id: memory.id,
        type: memory.type,
        description: memory.description,
        confidence: memory.confidence,
        sources: memory.sources,
        timestamp: memory.timestamp
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Evolution Analysis =============

// Get evolution summary
router.get('/evolution/:brain', (req: Request, res: Response) => {
  try {
    const { brain } = req.params;
    const { periodDays } = req.query;

    const summary = memoryHub.getEvolutionSummary(
      brain,
      periodDays ? parseInt(periodDays as string) : 30
    );

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Analytics & Status =============

// Get analytics
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = memoryHub.getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get status
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = memoryHub.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Management =============

// Activate memory hub
router.post('/activate', (req: Request, res: Response) => {
  try {
    memoryHub.activate();
    res.json({ message: 'Memory Hub activated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate memory hub
router.post('/deactivate', (req: Request, res: Response) => {
  try {
    memoryHub.deactivate();
    res.json({ message: 'Memory Hub deactivated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Clear memories
router.post('/clear', (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    memoryHub.clearMemories(type);
    
    res.json({
      message: type ? `${type} memories cleared` : 'All memories cleared'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

console.log('🧠 Memory API Gateway initialized');

export default router;
