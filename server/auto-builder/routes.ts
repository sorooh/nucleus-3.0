/**
 * PHASE 10.4 → 10.8: AUTO-BUILDER API ROUTES WITH VALIDATION
 */

import express from 'express';
import { autoBuilderEngine } from './index';
import { insertBuildRequestSchema, buildRequests, buildDeployments, generatedCode } from '@shared/schema';
import { z } from 'zod';
import { db } from '../db';
import { desc, eq } from 'drizzle-orm';

const router = express.Router();

// BUILD REQUESTS
router.post('/build', async (req, res) => {
  try {
    const validatedData = insertBuildRequestSchema.parse(req.body);
    
    const build = await autoBuilderEngine.submitBuildRequest({
      systemName: validatedData.systemName,
      systemType: validatedData.systemType,
      description: validatedData.description,
      requirements: (validatedData.requirements || {}) as any,
      targetNucleus: validatedData.targetNucleus,
    });
    
    res.json({ success: true, data: build });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

router.get('/builds', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    let query = db.select().from(buildRequests);
    
    if (status) {
      query = query.where(eq(buildRequests.status, status as string)) as any;
    }
    
    const builds = await query.orderBy(desc(buildRequests.createdAt)).limit(limitNum);
    
    res.json({ success: true, data: builds });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ENGINE STATUS & CONTROL
router.get('/status', async (req, res) => {
  try {
    const status = autoBuilderEngine.getStatus();
    const queue = await autoBuilderEngine.getBuildQueue();
    res.json({ success: true, data: { ...status, queue } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/start', async (req, res) => {
  try {
    await autoBuilderEngine.start();
    res.json({ success: true, message: 'Auto-Builder Engine started' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/queue', async (req, res) => {
  try {
    const queue = await autoBuilderEngine.getBuildQueue();
    res.json({ success: true, data: queue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DEPLOYMENTS
router.get('/deployments', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    let query = db.select().from(buildDeployments);
    
    if (status) {
      query = query.where(eq(buildDeployments.status, status as string)) as any;
    }
    
    const deployments = await query.orderBy(desc(buildDeployments.deployedAt)).limit(limitNum);
    
    res.json({ success: true, data: deployments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ANALYTICS
router.get('/analytics', async (req, res) => {
  try {
    const allBuilds = await db.select().from(buildRequests).limit(1000);
    const allDeployments = await db.select().from(buildDeployments).limit(1000);
    const allGenerated = await db.select().from(generatedCode).limit(1000);
    
    const completedBuilds = allBuilds.filter(b => b.status === 'completed').length;
    const successRate = allBuilds.length > 0 ? completedBuilds / allBuilds.length : 0;
    const avgBuildTime = 12.5; // Placeholder
    
    const analytics = {
      totalBuilds: allBuilds.length,
      totalDeployments: allDeployments.length,
      totalGenerated: allGenerated.length,
      successRate,
      avgBuildTime,
    };
    
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
