/**
 * Refinement Gateway - REST API for Learning System
 * Built from absolute zero for Surooh Empire Nucleus
 */

import { Router, Request, Response } from 'express';
import { refinementEngine } from '../core/refinement-engine';

const router = Router();

// ============= Status & Info =============

router.get('/status', (req: Request, res: Response) => {
  try {
    const status = refinementEngine.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to get refinement status',
      details: error.message 
    });
  }
});

router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = refinementEngine.getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to get analytics',
      details: error.message 
    });
  }
});

// ============= Patterns =============

router.get('/patterns', (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const patterns = refinementEngine.getPatterns(
      type as any
    );

    res.json({
      count: patterns.length,
      patterns: patterns.map(p => ({
        id: p.id,
        type: p.type,
        frequency: p.frequency,
        confidence: p.confidence,
        lastSeen: p.lastSeen
      }))
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to get patterns',
      details: error.message 
    });
  }
});

router.post('/analyze-pattern', (req: Request, res: Response) => {
  try {
    const { type, context } = req.body;

    if (!type || !context) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, context' 
      });
    }

    const pattern = refinementEngine.analyzePattern(type, context);

    if (!pattern) {
      return res.status(400).json({ 
        error: 'Refinement engine not active' 
      });
    }

    res.json({
      message: 'Pattern analyzed',
      pattern
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to analyze pattern',
      details: error.message 
    });
  }
});

// ============= Rules =============

router.get('/rules', (req: Request, res: Response) => {
  try {
    const { minConfidence } = req.query;
    const rules = refinementEngine.getRules(
      minConfidence as any
    );

    res.json({
      count: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        confidence: r.confidence,
        successRate: r.successRate,
        applications: r.applications,
        generated: r.generated
      }))
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to get rules',
      details: error.message 
    });
  }
});

// ============= Learning Cycles =============

router.get('/cycles', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cycles = refinementEngine.getLearningCycles(limit);

    res.json({
      count: cycles.length,
      cycles: cycles.map(c => ({
        id: c.id,
        decision: c.decision,
        outcome: c.outcome,
        feedback: c.feedback,
        patternsDetected: c.patternsDetected.length,
        rulesApplied: c.rulesApplied.length,
        timestamp: c.timestamp
      }))
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to get learning cycles',
      details: error.message 
    });
  }
});

router.post('/record-cycle', (req: Request, res: Response) => {
  try {
    const { input, decision, outcome, feedback } = req.body;

    if (!input || !decision || !outcome) {
      return res.status(400).json({ 
        error: 'Missing required fields: input, decision, outcome' 
      });
    }

    const cycle = refinementEngine.recordLearningCycle(
      input,
      decision,
      outcome,
      feedback || ''
    );

    res.json({
      message: 'Learning cycle recorded',
      cycle
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to record learning cycle',
      details: error.message 
    });
  }
});

// ============= Control =============

router.post('/activate', async (req: Request, res: Response) => {
  try {
    await refinementEngine.activate();
    res.json({ 
      message: 'Refinement engine activated',
      status: refinementEngine.getStatus()
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to activate refinement engine',
      details: error.message 
    });
  }
});

router.post('/deactivate', async (req: Request, res: Response) => {
  try {
    await refinementEngine.deactivate();
    res.json({ 
      message: 'Refinement engine deactivated',
      status: refinementEngine.getStatus()
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to deactivate refinement engine',
      details: error.message 
    });
  }
});

export default router;
