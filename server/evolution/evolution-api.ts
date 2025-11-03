/**
 * 🧬 Evolution API - Phase Ω
 * 
 * RESTful API endpoints for Evolution Intelligence system
 * Provides monitoring, control, and ledger access
 * 
 * @module EvolutionAPI
 */

import { Router } from 'express';
import { db } from '../db';
import { evolutionCycles, evolutionHistory, mutationQueue, sandboxResults } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { getEvolutionEngine } from './evolution_core_engine';
import { getMutationEngine } from './mutation_engine';
import { getSandboxExecutor } from './sandbox_executor';
import { getReinforcementMatrix } from './reinforcement_matrix';
import getScheduler from './evolution_scheduler';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// ========== GET /api/evolution/status ==========
// Public - Get current evolution system status
router.get('/status', async (req, res) => {
  try {
    const engine = getEvolutionEngine();
    const status = engine.getCycleStatus();

    const [latestCycle] = await db
      .select()
      .from(evolutionCycles)
      .orderBy(desc(evolutionCycles.cycleNumber))
      .limit(1);

    res.json({
      success: true,
      status: {
        isRunning: status.isRunning,
        currentCycle: status.currentCycle,
        latestCycleNumber: status.cycleNumber,
        latestCycle,
      },
    });
  } catch (error: any) {
    console.error('[Evolution API] Error in GET /status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/evolution/cycle/start ==========
// Protected - Start new evolutionary cycle (admin only)
router.post('/cycle/start', requireAdmin, async (req, res) => {
  try {
    const engine = getEvolutionEngine();
    
    console.log('[Evolution API] 🚀 Starting new evolutionary cycle...');
    const cycle = await engine.startCycle();

    res.json({
      success: true,
      cycle: {
        id: cycle.id,
        cycleId: cycle.cycleId,
        cycleNumber: cycle.cycleNumber,
        phase: cycle.phase,
        status: cycle.status,
        startedAt: cycle.startedAt,
      },
    });
  } catch (error: any) {
    console.error('[Evolution API] Error starting cycle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/evolution/cycles ==========
// Public - Get evolution cycles history
router.get('/cycles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const cycles = await db
      .select()
      .from(evolutionCycles)
      .orderBy(desc(evolutionCycles.cycleNumber))
      .limit(limit);

    res.json({
      success: true,
      cycles: cycles.map(c => ({
        id: c.id,
        cycleId: c.cycleId,
        cycleNumber: c.cycleNumber,
        phase: c.phase,
        status: c.status,
        systemHealthBefore: c.systemHealthBefore,
        systemHealthAfter: c.systemHealthAfter,
        awarenessLevelBefore: c.awarenessLevelBefore,
        awarenessLevelAfter: c.awarenessLevelAfter,
        mutationsProposed: c.mutationsProposed,
        mutationsAccepted: c.mutationsAccepted,
        mutationsRejected: c.mutationsRejected,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        duration: c.duration,
        improvements: c.improvements,
        learnings: c.learnings,
      })),
    });
  } catch (error: any) {
    console.error('[Evolution API] Error in GET /cycles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/evolution/history ==========
// Public - Get evolution history (ledger)
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    let query = db.select().from(evolutionHistory);

    if (status) {
      query = query.where(eq(evolutionHistory.status, status)) as any;
    }

    const history = await (query as any)
      .orderBy(desc(evolutionHistory.createdAt))
      .limit(limit);

    res.json({
      success: true,
      history: history.map((h: any) => ({
        id: h.id,
        cycleId: h.cycleId,
        mutationType: h.mutationType,
        mutationCategory: h.mutationCategory,
        affectedModule: h.affectedModule,
        status: h.status,
        fitnessScore: h.fitnessScore,
        ethicalVerdict: h.ethicalVerdict,
        ethicalScore: h.ethicalScore,
        proposedBy: h.proposedBy,
        reasoning: h.reasoning,
        expectedImpact: h.expectedImpact,
        createdAt: h.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Evolution API] Error in GET /history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/evolution/mutations ==========
// Public - Get mutation queue
router.get('/mutations', async (req, res) => {
  try {
    const status = req.query.status as string;

    let query = db.select().from(mutationQueue);

    if (status) {
      query = query.where(eq(mutationQueue.status, status)) as any;
    }

    const mutations = await (query as any)
      .orderBy(desc(mutationQueue.priority), desc(mutationQueue.createdAt))
      .limit(50);

    res.json({
      success: true,
      mutations: mutations.map((m: any) => ({
        id: m.id,
        priority: m.priority,
        status: m.status,
        mutationType: m.mutationType,
        targetModule: m.targetModule,
        generatedBy: m.generatedBy,
        confidence: m.confidence,
        createdAt: m.createdAt,
        startedAt: m.startedAt,
        completedAt: m.completedAt,
      })),
    });
  } catch (error: any) {
    console.error('[Evolution API] Error in GET /mutations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/evolution/sandbox ==========
// Protected - Get sandbox results
router.get('/sandbox', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const results = await db
      .select()
      .from(sandboxResults)
      .orderBy(desc(sandboxResults.createdAt))
      .limit(limit);

    res.json({
      success: true,
      results: results.map(r => ({
        id: r.id,
        sandboxId: r.sandboxId,
        testsPassed: r.testsPassed,
        testsFailed: r.testsFailed,
        testDuration: r.testDuration,
        verdict: r.verdict,
        recommendation: r.recommendation,
        safetyViolations: r.safetyViolations,
        ethicalIssues: r.ethicalIssues,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Evolution API] Error in GET /sandbox:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/evolution/statistics ==========
// Public - Get evolution statistics
router.get('/statistics', async (req, res) => {
  try {
    // Count statistics - fetch all records and count them
    const allCycles = await db.select().from(evolutionCycles);
    const allMutations = await db.select().from(evolutionHistory);
    const approvedMutationsRecords = await db
      .select()
      .from(evolutionHistory)
      .where(eq(evolutionHistory.status, 'approved'));

    const totalCycles = allCycles.length;
    const totalMutations = allMutations.length;
    const approvedMutations = approvedMutationsRecords.length;

    const successRate = totalMutations > 0 ? 
      (approvedMutations / totalMutations) * 100 : 0;

    res.json({
      success: true,
      statistics: {
        totalCycles,
        totalMutations,
        approvedMutations,
        successRate: successRate.toFixed(1),
        systemStatus: 'operational',
      },
    });
  } catch (error: any) {
    console.error('[Evolution API] Error in GET /statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/evolution/scheduler/start ==========
// Autonomous - Start evolution scheduler (no auth required for autonomous operation)
router.post('/scheduler/start', async (req, res) => {
  try {
    const scheduler = getScheduler();
    
    console.log('[Evolution API] 🚀 Starting evolution scheduler...');
    await scheduler.start();

    res.json({
      success: true,
      message: 'Evolution scheduler started - autonomous cycles will run every 24 hours',
      scheduler: {
        isRunning: scheduler.isRunning(),
        intervalHours: 24,
      },
    });
  } catch (error: any) {
    console.error('[Evolution API] Error starting scheduler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/evolution/scheduler/stop ==========
// Autonomous - Stop evolution scheduler (no auth required for autonomous operation)
router.post('/scheduler/stop', async (req, res) => {
  try {
    const scheduler = getScheduler();
    
    console.log('[Evolution API] ⏸️  Stopping evolution scheduler...');
    await scheduler.stop();

    res.json({
      success: true,
      message: 'Evolution scheduler stopped',
      scheduler: {
        isRunning: scheduler.isRunning(),
      },
    });
  } catch (error: any) {
    console.error('[Evolution API] Error stopping scheduler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
