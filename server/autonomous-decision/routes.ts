/**
 * PHASE 10.9 → 11.0: AUTONOMOUS DECISION API ROUTES WITH VALIDATION
 */

import express from 'express';
import { autonomousDecisionEngine } from './index';
import { decisionCriteria, decisionOutcomes, autonomySettings } from '@shared/schema';
import { z } from 'zod';
import { db } from '../db';
import { desc, eq } from 'drizzle-orm';

const router = express.Router();

// Validation schemas
const makeDecisionSchema = z.object({
  context: z.string().min(1),
  options: z.array(z.string()).min(1),
  criteria: z.record(z.number()).optional(),
});

const updateAutonomySchema = z.object({
  level: z.enum(['supervised', 'assisted', 'autonomous', 'full']),
  approvalRequired: z.boolean().optional(),
});

// DECISIONS
router.post('/decide', async (req, res) => {
  try {
    const validatedData = makeDecisionSchema.parse(req.body);
    
    const decision = await autonomousDecisionEngine.makeAutonomousDecision(
      validatedData.context,
      validatedData.options
    );
    
    res.json({ success: true, data: decision });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

router.get('/decisions', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    let query = db.select().from(decisionOutcomes);
    
    if (status) {
      query = query.where(eq(decisionOutcomes.status, status as string)) as any;
    }
    
    const decisions = await query.orderBy(desc(decisionOutcomes.decisionTime)).limit(limitNum);
    
    res.json({ success: true, data: decisions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ENGINE STATUS & CONTROL
router.get('/status', async (req, res) => {
  try {
    const status = autonomousDecisionEngine.getStatus();
    const history = await autonomousDecisionEngine.getDecisionHistory();
    res.json({ success: true, data: { ...status, ...history } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/start', async (req, res) => {
  try {
    await autonomousDecisionEngine.start();
    res.json({ success: true, message: 'Autonomous Decision Engine started' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const history = await autonomousDecisionEngine.getDecisionHistory();
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AUTONOMY SETTINGS
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.select().from(autonomySettings).limit(10);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const validatedData = updateAutonomySchema.parse(req.body);
    
    const nucleusId = 'nicholas-3.2';
    
    const [setting] = await db.insert(autonomySettings).values({
      nucleusId,
      autonomyLevel: validatedData.level,
      approvalRequired: validatedData.approvalRequired ?? false,
      domainRestrictions: {},
      safetyLimits: {},
    }).returning();
    
    res.json({ success: true, data: setting });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// CRITERIA
router.get('/criteria', async (req, res) => {
  try {
    const criteria = await db.select().from(decisionCriteria).limit(50);
    res.json({ success: true, data: criteria });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ANALYTICS
router.get('/analytics', async (req, res) => {
  try {
    const allDecisions = await db.select().from(decisionOutcomes).limit(1000);
    const allCriteria = await db.select().from(decisionCriteria).limit(1000);
    
    const successfulDecisions = allDecisions.filter(d => d.status === 'executed').length;
    const avgConfidence = allDecisions.reduce((sum, d) => sum + (d.confidence || 0), 0) / (allDecisions.length || 1);
    const autonomousRate = allDecisions.filter(d => d.approvalRequired === false).length / (allDecisions.length || 1);
    
    const analytics = {
      totalDecisions: allDecisions.length,
      totalCriteria: allCriteria.length,
      successfulDecisions,
      avgConfidence,
      autonomousRate,
    };
    
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
