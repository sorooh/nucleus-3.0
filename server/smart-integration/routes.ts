// Phase 12.0 - Smart Integration API Routes
// Endpoints for smart integration and app generation system
// Zero-Mock Policy: All data from real database and runtime analysis

import express from 'express';
import { Pool } from '@neondatabase/serverless';
import { RealTimeIntegrationOrchestrator } from './RealTimeIntegrationOrchestrator';
import { SmartAppGenerator } from '../app-generator/SmartAppGenerator';

const router = express.Router();
router.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Start Smart Integration System
router.post('/smart/start', async (_req, res) => {
  try {
    console.log('[Smart Integration API] 🚀 Starting smart integration system...');
    const orchestrator = new RealTimeIntegrationOrchestrator(pool);
    const result = await orchestrator.startSmartIntegrationSystem();
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Smart Integration API] ❌ Error:', error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

// Generate Missing Applications
router.post('/smart/generate-apps', async (_req, res) => {
  try {
    console.log('[Smart Integration API] 🏗️ Auto-generating missing applications...');
    const generator = new SmartAppGenerator(pool);
    const result = await generator.autoGenerateMissingApplications();
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[Smart Integration API] ❌ Error:', error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

// Get Integration Plans
router.get('/smart/plans', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM integration_plans 
      ORDER BY estimated_impact DESC, created_at DESC
      LIMIT 50
    `);
    return res.json({ success: true, plans: result.rows });
  } catch (error: any) {
    console.error('[Smart Integration API] ❌ Error:', error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

// Get Integration Results
router.get('/smart/results', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM integration_results 
      ORDER BY created_at DESC
      LIMIT 50
    `);
    return res.json({ success: true, results: result.rows });
  } catch (error: any) {
    console.error('[Smart Integration API] ❌ Error:', error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

// Get Generated Applications
router.get('/smart/generated-apps', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM generated_apps 
      ORDER BY created_at DESC
      LIMIT 50
    `);
    return res.json({ success: true, apps: result.rows });
  } catch (error: any) {
    console.error('[Smart Integration API] ❌ Error:', error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
