/**
 * Governance Endpoint - Phase 9.9
 * نقاط نهاية الحوكمة الجماعية الذكية
 * 
 * Endpoints:
 * - POST /api/federation/governance - تحليل قرار وإصدار الحكم
 * - GET /api/federation/governance/stats - إحصائيات الحوكمة
 * - GET /api/federation/governance/audit - سجل التدقيق
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { governanceAICore } from './governance_ai_core';
import { verifyFederationSecurity } from '../security-middleware';
import { db } from '../../db';
import { governanceAuditLog } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

const router = Router();

/**
 * Request validation schema
 */
const governanceRequestSchema = z.object({
  node: z.string(),
  decision: z.string(), // decisionType
  decisionId: z.string().optional(),
  payload: z.any(),
  confidence: z.number().min(0).max(1),
  impact: z.number().min(0).max(1)
});

/**
 * POST /api/federation/governance
 * تحليل قرار من خلال AI Governance
 * Protected by Triple-Layer Security
 */
router.post('/governance', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    console.log('[Governance] POST /governance - Analyzing decision...');
    
    // Validate request
    const validatedData = governanceRequestSchema.parse(req.body);
    
    // HONEST: Generate deterministic decision ID if not provided
    const decisionId = validatedData.decisionId || `auto-${Date.now()}-${validatedData.node.slice(0, 8)}`;
    
    // Analyze decision through Governance AI Core
    const verdict = await governanceAICore.analyzeDecision({
      node: validatedData.node,
      decisionId,
      decisionType: validatedData.decision,
      payload: validatedData.payload,
      confidence: validatedData.confidence,
      expectedImpact: validatedData.impact
    });
    
    console.log(`[Governance] Verdict: ${verdict.verdict}, Score: ${verdict.overall_score.toFixed(2)}`);
    
    return res.status(200).json({
      success: true,
      decisionId: verdict.decisionId,
      verdict: verdict.verdict,
      details: verdict.details,
      overall_score: verdict.overall_score,
      consensus_reached: verdict.consensus_reached,
      recommendations: verdict.recommendations,
      requires_cpe: verdict.requires_cpe,
      timestamp: verdict.timestamp
    });
    
  } catch (error: any) {
    console.error('[Governance] ❌ Analysis error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Governance analysis failed',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/governance/stats
 * إحصائيات الحوكمة
 */
router.get('/governance/stats', async (req: Request, res: Response) => {
  try {
    const stats = await governanceAICore.getStatistics();
    
    return res.status(200).json({
      success: true,
      stats
    });
    
  } catch (error: any) {
    console.error('[Governance] Error getting stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/governance/audit
 * سجل التدقيق
 */
router.get('/governance/audit', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const verdict = req.query.verdict as string;
    
    let logs;
    
    // Filter by verdict if provided
    if (verdict) {
      logs = await db
        .select()
        .from(governanceAuditLog)
        .where(eq(governanceAuditLog.finalVerdict, verdict))
        .orderBy(desc(governanceAuditLog.createdAt))
        .limit(limit);
    } else {
      logs = await db
        .select()
        .from(governanceAuditLog)
        .orderBy(desc(governanceAuditLog.createdAt))
        .limit(limit);
    }
    
    return res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
    
  } catch (error: any) {
    console.error('[Governance] Error getting audit log:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit log',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/governance/audit/:decisionId
 * الحصول على تدقيق قرار محدد
 */
router.get('/governance/audit/:decisionId', async (req: Request, res: Response) => {
  try {
    const { decisionId } = req.params;
    
    const [log] = await db
      .select()
      .from(governanceAuditLog)
      .where(eq(governanceAuditLog.decisionId, decisionId))
      .limit(1);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      log
    });
    
  } catch (error: any) {
    console.error('[Governance] Error getting audit log:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit log',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/governance/config
 * الحصول على إعدادات الحوكمة
 */
router.get('/governance/config', async (req: Request, res: Response) => {
  try {
    const config = governanceAICore.getConfig();
    
    return res.status(200).json({
      success: true,
      config
    });
    
  } catch (error: any) {
    console.error('[Governance] Error getting config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve config',
      details: error.message
    });
  }
});

export default router;

console.log('[Governance Endpoint] Routes registered');
console.log('[Governance Endpoint] AI Governance endpoints active');
