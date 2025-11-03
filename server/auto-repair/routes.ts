/**
 * PHASE 9.7 → 10.3: AUTO-REPAIR API ROUTES WITH VALIDATION
 * PHASE 10.9: Data Purity & Truth Validation
 * 
 * ZERO TOLERANCE POLICY:
 * - No Math.random() data generation
 * - No hardcoded mock values
 * - No fake responses
 * - All data from PostgreSQL database ONLY
 */

import express from 'express';
import { autoRepairEngine } from './index';
import { insertAnomalyDetectionSchema, insertHealthChecksSchema, anomalyDetections, healthChecks, repairAgents, repairActions } from '@shared/schema';
import { z } from 'zod';
import { db } from '../db';
import { desc, eq, sql } from 'drizzle-orm';

const router = express.Router();

// PHASE 10.9: Anti-Mock Middleware
router.use((req, res, next) => {
  // Ensure database connection exists (no mock fallback)
  if (!db) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available - cannot serve mock data',
      phase: '10.9 - Data Purity Enforcement'
    });
  }
  next();
});

// Validation schemas
const deployAgentSchema = z.object({
  nucleusId: z.string().min(1),
  issueType: z.string().min(1),
});

// HEALTH CHECKS
router.post('/health-checks', async (req, res) => {
  try {
    const validatedData = insertHealthChecksSchema.parse(req.body);
    
    const check = await autoRepairEngine.performHealthCheck({
      nucleusId: validatedData.nucleusId,
      component: validatedData.checkType,
      status: validatedData.status as 'healthy' | 'degraded' | 'critical' | 'offline',
      metrics: validatedData.details || {},
      responseTime: validatedData.responseTime ?? undefined
    });
    
    res.json({ success: true, data: check });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

router.get('/health-checks', async (req, res) => {
  try {
    const { nucleusId, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    if (nucleusId) {
      // For single nucleus, return all checks
      const checks = await db.select()
        .from(healthChecks)
        .where(eq(healthChecks.nucleusId, nucleusId as string))
        .orderBy(desc(healthChecks.checkedAt))
        .limit(limitNum);
      
      return res.json({ success: true, data: { checks, total: checks.length } });
    }
    
    // For all nuclei, return LATEST check per nucleus (not all checks!)
    const latestChecks = await db.execute<any>(sql`
      SELECT DISTINCT ON (nucleus_id) *
      FROM health_checks
      ORDER BY nucleus_id, checked_at DESC
      LIMIT ${limitNum}
    `);
    
    const checks = latestChecks.rows || [];
    
    res.json({ success: true, data: { checks, total: checks.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ANOMALIES
router.post('/anomalies', async (req, res) => {
  try {
    const validatedData = insertAnomalyDetectionSchema.parse(req.body);
    
    const anomaly = await autoRepairEngine.detectAnomaly({
      nucleusId: validatedData.nucleusId,
      component: validatedData.component,
      anomalyType: validatedData.anomalyType,
      severity: validatedData.severity as 'low' | 'medium' | 'high' | 'critical',
      description: validatedData.description,
      metrics: validatedData.detectedMetrics || {}
    });
    
    res.json({ success: true, data: anomaly });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    let query = db.select().from(anomalyDetections);
    
    if (status) {
      query = query.where(eq(anomalyDetections.status, status as string)) as any;
    }
    
    const anomalies = await query.orderBy(desc(anomalyDetections.detectedAt)).limit(limitNum);
    
    res.json({ success: true, data: { anomalies, total: anomalies.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ENGINE STATUS & CONTROL
router.get('/status', async (req, res) => {
  try {
    const status = autoRepairEngine.getStatus();
    const history = await autoRepairEngine.getRepairHistory();
    res.json({ success: true, data: { ...status, history } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/start', async (req, res) => {
  try {
    await autoRepairEngine.start();
    res.json({ success: true, message: 'Auto-Repair Engine started' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REPAIR AGENTS
router.post('/deploy-agent', async (req, res) => {
  try {
    // Note: This endpoint expects anomalyId, not nucleusId + issueType
    const { anomalyId } = req.body;
    
    if (!anomalyId) {
      return res.status(400).json({ success: false, error: 'anomalyId is required' });
    }
    
    const agent = await autoRepairEngine.deployRepairAgent(anomalyId);
    
    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/agents', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    let query = db.select().from(repairAgents);
    
    if (status) {
      query = query.where(eq(repairAgents.status, status as string)) as any;
    }
    
    const agents = await query.orderBy(desc(repairAgents.deployedAt)).limit(limitNum);
    
    res.json({ success: true, data: { agents, total: agents.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const history = await autoRepairEngine.getRepairHistory();
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// REPAIR ACTIONS
router.get('/actions', async (req, res) => {
  try {
    const { agentId, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    let actionsQuery = db.select().from(repairActions);
    
    if (agentId) {
      actionsQuery = actionsQuery.where(eq(repairActions.agentId, agentId as string)) as any;
    }
    
    const actions = await actionsQuery.orderBy(desc(repairActions.executedAt)).limit(limitNum);
    
    res.json({ success: true, data: { actions, total: actions.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ANALYTICS
router.get('/analytics', async (req, res) => {
  try {
    const allAnomalies = await db.select().from(anomalyDetections).limit(1000);
    const allAgents = await db.select().from(repairAgents).limit(1000);
    const allActions = await db.select().from(repairActions).limit(1000);
    
    const repairedAnomalies = allAnomalies.filter(a => a.status === 'repaired').length;
    const successRate = allAnomalies.length > 0 ? repairedAnomalies / allAnomalies.length : 0;
    const autoRepairEligible = allAnomalies.filter(a => a.autoRepairEligible).length;
    const autoRepairRate = allAnomalies.length > 0 ? autoRepairEligible / allAnomalies.length : 0;
    
    const analytics = {
      totalAnomalies: allAnomalies.length,
      totalAgents: allAgents.length,
      totalActions: allActions.length,
      successRate,
      autoRepairRate,
    };
    
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
