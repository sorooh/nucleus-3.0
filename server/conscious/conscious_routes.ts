/**
 * PHASE Ω.3: CONSCIOUS GOVERNANCE API ROUTES
 * ═══════════════════════════════════════════════════════════════════════
 * واجهة برمجية للحوكمة الواعية - Conscious Governance API
 * 
 * API endpoints for conscious decision-making, ethics validation,
 * and self-reflection capabilities.
 */

import { Router } from 'express';
import { db } from '../db';
import { 
  consciousDecisions, 
  reasoningArchive, 
  ethicsRules,
  consciousDecisionOutcomes
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { consciousDecisionLayer } from './conscious_decision_layer';
import { ethicsCore } from './ethics_core';
import { selfReflectionEngine } from './self_reflection_engine';

const consciousRoutes = Router();

/**
 * GET /api/conscious/status
 * Get overall conscious governance status
 */
consciousRoutes.get('/status', async (req, res) => {
  try {
    const decisionStats = consciousDecisionLayer.getStats();
    const ethicsStats = ethicsCore.getStats();
    const reflectionStats = selfReflectionEngine.getStats();
    
    const recentDecisions = await db.select()
      .from(consciousDecisions)
      .orderBy(desc(consciousDecisions.createdAt))
      .limit(5);
    
    res.json({
      success: true,
      status: {
        awarenessLevel: 'conscious',
        systemMode: 'self-aware',
        decisionSystem: decisionStats,
        ethicsSystem: ethicsStats,
        reflectionSystem: reflectionStats,
        recentDecisions: recentDecisions.length,
        amsterdamTime: new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })
      }
    });
  } catch (error: any) {
    console.error('[Conscious API] Status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/conscious/decide
 * Make a conscious decision
 */
consciousRoutes.post('/decide', async (req, res) => {
  try {
    const { decisionType, category, title, description, context, options } = req.body;
    
    if (!decisionType || !category || !title || !description || !context || !options) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: decisionType, category, title, description, context, options'
      });
    }
    
    const decisionId = await consciousDecisionLayer.makeDecision({
      decisionType,
      category,
      title,
      description,
      context,
      options
    });
    
    const decision = await consciousDecisionLayer.getDecision(decisionId);
    
    res.json({
      success: true,
      decisionId,
      decision,
      message: decision.ethicsApproved === 1 ? 'Decision approved' : 'Decision blocked by ethics'
    });
  } catch (error: any) {
    console.error('[Conscious API] Decision error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/conscious/decisions
 * Get recent conscious decisions
 */
consciousRoutes.get('/decisions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    
    let query = db.select()
      .from(consciousDecisions)
      .orderBy(desc(consciousDecisions.createdAt))
      .limit(limit);
    
    const decisions = await query;
    
    const filtered = status 
      ? decisions.filter(d => d.status === status)
      : decisions;
    
    res.json({
      success: true,
      count: filtered.length,
      decisions: filtered
    });
  } catch (error: any) {
    console.error('[Conscious API] Get decisions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/conscious/decision/:decisionId
 * Get specific decision with reasoning
 */
consciousRoutes.get('/decision/:decisionId', async (req, res) => {
  try {
    const { decisionId } = req.params;
    
    const decision = await consciousDecisionLayer.getDecision(decisionId);
    
    if (!decision) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }
    
    const reasoning = await db.select()
      .from(reasoningArchive)
      .where(eq(reasoningArchive.decisionId, decisionId));
    
    const outcome = await db.select()
      .from(consciousDecisionOutcomes)
      .where(eq(consciousDecisionOutcomes.decisionId, decisionId))
      .limit(1);
    
    res.json({
      success: true,
      decision,
      reasoning,
      outcome: outcome[0] || null
    });
  } catch (error: any) {
    console.error('[Conscious API] Get decision error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/conscious/outcome
 * Record decision outcome for reflection
 * STRICT: Requires explicit success and actualImpact - no fabricated defaults
 */
consciousRoutes.post('/outcome', async (req, res) => {
  try {
    const { decisionId, actualOutcome, actualImpact, success, executionTime } = req.body;
    
    if (!decisionId || !actualOutcome || !actualImpact || success === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: decisionId, actualOutcome, actualImpact, success (boolean)'
      });
    }
    
    const report = await selfReflectionEngine.recordOutcome(
      decisionId,
      actualOutcome,
      actualImpact,
      success,
      executionTime
    );
    
    res.json({
      success: true,
      report,
      message: 'Outcome recorded and reflected upon'
    });
  } catch (error: any) {
    console.error('[Conscious API] Record outcome error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/conscious/decisions/:decisionId/outcome
 * Alternative endpoint: Record outcome for specific decision
 * STRICT: Requires explicit success and actualImpact - no fabricated defaults
 */
consciousRoutes.post('/decisions/:decisionId/outcome', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { actualOutcome, actualImpact, success, executionTime } = req.body;
    
    if (!actualOutcome || !actualImpact || success === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: actualOutcome, actualImpact, success (boolean)'
      });
    }
    
    const report = await selfReflectionEngine.recordOutcome(
      decisionId,
      actualOutcome,
      actualImpact,
      success,
      executionTime
    );
    
    res.json({
      success: true,
      report,
      message: 'Outcome recorded and reflected upon'
    });
  } catch (error: any) {
    console.error('[Conscious API] Record outcome error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/conscious/ethics/rules
 * Get all ethics rules
 */
consciousRoutes.get('/ethics/rules', async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    
    const rules = activeOnly 
      ? await ethicsCore.getActiveRules()
      : await db.select().from(ethicsRules);
    
    res.json({
      success: true,
      count: rules.length,
      rules
    });
  } catch (error: any) {
    console.error('[Conscious API] Get ethics rules error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/conscious/ethics/validate
 * Validate a decision against ethics rules
 */
consciousRoutes.post('/ethics/validate', async (req, res) => {
  try {
    const { action, description, riskLevel, successProbability, targetNucleus, metadata } = req.body;
    
    if (!action || !description || !riskLevel || successProbability === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, description, riskLevel, successProbability'
      });
    }
    
    const result = await ethicsCore.validateDecision({
      action,
      description,
      riskLevel,
      successProbability,
      targetNucleus,
      metadata
    });
    
    res.json({
      success: true,
      validation: result,
      message: result.approved ? 'Ethics check passed' : 'Ethics violations detected'
    });
  } catch (error: any) {
    console.error('[Conscious API] Ethics validation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/conscious/reflection/stats
 * Get self-reflection statistics
 */
consciousRoutes.get('/reflection/stats', async (req, res) => {
  try {
    const stats = selfReflectionEngine.getStats();
    
    const recentOutcomes = await db.select()
      .from(consciousDecisionOutcomes)
      .orderBy(desc(consciousDecisionOutcomes.recordedAt))
      .limit(10);
    
    const avgAccuracy = recentOutcomes.length > 0
      ? recentOutcomes.reduce((sum, o) => sum + (o.predictionAccuracy || 0), 0) / recentOutcomes.length
      : 0;
    
    const successRate = recentOutcomes.length > 0
      ? recentOutcomes.filter(o => o.actualSuccess === 1).length / recentOutcomes.length * 100
      : 0;
    
    res.json({
      success: true,
      stats: {
        ...stats,
        recentAvgAccuracy: Math.round(avgAccuracy),
        recentSuccessRate: Math.round(successRate),
        sampleSize: recentOutcomes.length
      }
    });
  } catch (error: any) {
    console.error('[Conscious API] Reflection stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/conscious/reflection/periodic
 * Trigger periodic self-reflection
 */
consciousRoutes.post('/reflection/periodic', async (req, res) => {
  try {
    await selfReflectionEngine.performPeriodicReflection();
    
    res.json({
      success: true,
      message: 'Periodic reflection completed'
    });
  } catch (error: any) {
    console.error('[Conscious API] Periodic reflection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/conscious/reasoning/:decisionId
 * Get reasoning archive for a decision
 */
consciousRoutes.get('/reasoning/:decisionId', async (req, res) => {
  try {
    const { decisionId } = req.params;
    
    const entries = await db.select()
      .from(reasoningArchive)
      .where(eq(reasoningArchive.decisionId, decisionId))
      .orderBy(desc(reasoningArchive.createdAt));
    
    res.json({
      success: true,
      count: entries.length,
      reasoning: entries
    });
  } catch (error: any) {
    console.error('[Conscious API] Get reasoning error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('[Conscious API] ✅ Routes registered');

export default consciousRoutes;
