/**
 * Decision Endpoint - Phase 9.7
 * REST API لإرسال القرارات واستقبال التغذية الراجعة
 * 
 * POST /api/federation/decision - إرسال قرار إلى عقدة SIDE
 * POST /api/federation/feedback - استقبال feedback من عقدة SIDE
 * GET /api/federation/decisions/:nodeId - جلب قرارات عقدة معينة
 * GET /api/federation/learning/stats - إحصائيات التعلم
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { learningEngine } from './autonomous-learning-engine';
import { actionGenerator } from './action-generator';
import { feedbackAnalyzer, type FeedbackData } from './feedback-analyzer';
import { learningReporter } from './learning-reporter';
import { learningScheduler } from './learning-scheduler';
import { governanceEngine } from '../../nucleus/core/governance-engine';
import { db } from '../db';
import { autonomousDecisions, federationNodes } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/federation/decision
 * Send autonomous decision to SIDE node
 * 
 * Body: {
 *   nodeId: string,
 *   decisionId: string (optional - if already generated),
 *   autoGenerate: boolean (optional - generate from insights)
 * }
 */
const decisionRequestSchema = z.object({
  nodeId: z.string().min(1),
  decisionId: z.string().optional(),
  autoGenerate: z.boolean().optional().default(false)
});

router.post('/decision', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('[Decision Endpoint] POST /decision - New request');
    
    // 1. Validate request
    const validated = decisionRequestSchema.parse(req.body);
    
    // 2. Governance check
    const governanceCheck = governanceEngine.submitDecision(
      'nicholas-federation',
      'send_decision',
      {
        nodeId: validated.nodeId,
        autoGenerate: validated.autoGenerate
      }
    );
    
    if (governanceCheck.status === 'rejected') {
      console.log('[Decision Endpoint] ❌ Governance rejected');
      return res.status(403).json({
        success: false,
        error: 'Governance policy rejected this decision',
        reason: governanceCheck.reason
      });
    }
    
    let decision;
    
    if (validated.autoGenerate) {
      // Auto-generate decision from learning insights
      console.log('[Decision Endpoint] Auto-generating decision...');
      
      const insights = await learningEngine.runLearningCycle({
        lookbackDays: 7,
        targetNodes: [validated.nodeId]
      });
      
      if (insights.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No insights available for this node',
          message: 'Insufficient data to generate autonomous decision'
        });
      }
      
      const generatedDecisions = await actionGenerator.generateBatchDecisions(insights);
      
      if (generatedDecisions.length === 0) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate decision'
        });
      }
      
      decision = generatedDecisions[0];
      
    } else if (validated.decisionId) {
      // Load existing decision
      const existingDecision = await actionGenerator.getDecision(validated.decisionId);
      
      if (!existingDecision) {
        return res.status(404).json({
          success: false,
          error: 'Decision not found',
          decisionId: validated.decisionId
        });
      }
      
      decision = {
        decisionId: existingDecision.decisionId,
        nodeId: existingDecision.nodeId,
        decision: existingDecision,
        signature: 'pre-generated'
      };
      
    } else {
      return res.status(400).json({
        success: false,
        error: 'Must provide either decisionId or set autoGenerate=true'
      });
    }
    
    // 3. Mark decision as sent
    await actionGenerator.updateDecisionStatus(decision.decisionId, 'sent');
    
    const duration = Date.now() - startTime;
    
    console.log(`[Decision Endpoint] ✅ Decision sent: ${decision.decisionId} (${duration}ms)`);
    
    // 4. Return decision to caller (Nicholas will forward to SIDE)
    res.status(200).json({
      success: true,
      decision: {
        decisionId: decision.decision.decisionId,
        nodeId: decision.decision.nodeId,
        type: decision.decision.decisionType,
        category: decision.decision.category,
        payload: decision.decision.payload,
        reasoning: decision.decision.reasoning,
        confidence: decision.decision.confidence,
        expectedImpact: decision.decision.expectedImpact,
        metadata: decision.decision.metadata
      },
      signature: decision.signature,
      processingTime: duration
    });
    
  } catch (error: any) {
    console.error('[Decision Endpoint] ❌ Error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/federation/feedback
 * Receive feedback from SIDE node about decision execution
 * 
 * Body: {
 *   decisionId: string,
 *   result: 'success' | 'failed' | 'partial',
 *   impact: number (0.0 - 1.0),
 *   improvements?: [{metric, before, after, improvementPercent}],
 *   notes?: string,
 *   executionTime?: number,
 *   errors?: string[]
 * }
 */
const feedbackSchema = z.object({
  decisionId: z.string(),
  result: z.enum(['success', 'failed', 'partial']),
  impact: z.number().min(0).max(1),
  improvements: z.array(z.object({
    metric: z.string(),
    before: z.number(),
    after: z.number(),
    improvementPercent: z.number()
  })).optional(),
  notes: z.string().optional(),
  executionTime: z.number().optional(),
  errors: z.array(z.string()).optional()
});

router.post('/feedback', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('[Decision Endpoint] POST /feedback - New feedback received');
    
    // 1. Validate request
    const validated = feedbackSchema.parse(req.body);
    
    // 2. Governance check
    const governanceCheck = governanceEngine.submitDecision(
      'side-federation',
      'submit_feedback',
      { decisionId: validated.decisionId }
    );
    
    if (governanceCheck.status === 'rejected') {
      console.log('[Decision Endpoint] ❌ Governance rejected feedback');
      return res.status(403).json({
        success: false,
        error: 'Governance policy rejected this feedback',
        reason: governanceCheck.reason
      });
    }
    
    // 3. Process feedback
    const feedbackData: FeedbackData = {
      decisionId: validated.decisionId,
      result: validated.result,
      impact: validated.impact,
      improvements: validated.improvements,
      notes: validated.notes,
      executionTime: validated.executionTime,
      errors: validated.errors
    };
    
    const analysis = await feedbackAnalyzer.processFeedback(feedbackData);
    
    const duration = Date.now() - startTime;
    
    console.log(`[Decision Endpoint] ✅ Feedback processed: ${validated.decisionId} (${duration}ms)`);
    console.log(`[Decision Endpoint] Score: ${analysis.feedbackScore.toFixed(2)}, Impact: ${analysis.actualImpact.toFixed(2)}`);
    
    // 4. Return analysis
    res.status(200).json({
      success: true,
      analysis: {
        decisionId: analysis.decisionId,
        feedbackScore: analysis.feedbackScore,
        actualImpact: analysis.actualImpact,
        successRate: analysis.successRate,
        shouldContinue: analysis.shouldContinue,
        recommendations: analysis.recommendations
      },
      processingTime: duration
    });
    
  } catch (error: any) {
    console.error('[Decision Endpoint] ❌ Feedback error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback format',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/federation/decisions/:nodeId
 * Get all decisions for a specific node
 */
router.get('/decisions/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    console.log(`[Decision Endpoint] GET /decisions/${nodeId}`);
    
    const decisions = await db
      .select()
      .from(autonomousDecisions)
      .where(eq(autonomousDecisions.nodeId, nodeId))
      .orderBy(desc(autonomousDecisions.createdAt))
      .limit(limit);
    
    res.status(200).json({
      success: true,
      nodeId,
      count: decisions.length,
      decisions
    });
    
  } catch (error: any) {
    console.error('[Decision Endpoint] ❌ Error fetching decisions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/federation/learning/stats
 * Get learning system statistics
 */
router.get('/learning/stats', async (req: Request, res: Response) => {
  try {
    console.log('[Decision Endpoint] GET /learning/stats');
    
    // Get learning engine stats
    const learningStats = learningEngine.getStatistics();
    
    // Get system feedback stats
    const feedbackStats = await feedbackAnalyzer.getSystemFeedbackStats();
    
    // Get active nodes count
    const activeNodes = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.status, 'active'));
    
    res.status(200).json({
      success: true,
      stats: {
        learning: learningStats,
        feedback: feedbackStats,
        nodes: {
          total: activeNodes.length,
          active: activeNodes.filter((n: any) => n.health >= 80).length
        }
      }
    });
    
  } catch (error: any) {
    console.error('[Decision Endpoint] ❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/federation/learning/run
 * Manually trigger a learning cycle
 */
router.post('/learning/run', async (req: Request, res: Response) => {
  try {
    console.log('[Decision Endpoint] POST /learning/run - Manual learning cycle');
    
    const { lookbackDays = 7, targetNodes } = req.body;
    
    const insights = await learningEngine.runLearningCycle({
      lookbackDays,
      targetNodes
    });
    
    res.status(200).json({
      success: true,
      insightsGenerated: insights.length,
      insights: insights.map(i => ({
        nodeId: i.nodeId,
        category: i.category,
        confidence: i.confidence,
        recommendation: i.recommendation
      }))
    });
    
  } catch (error: any) {
    console.error('[Decision Endpoint] ❌ Learning cycle error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/federation/learning/scheduler/status
 * Get scheduler status
 */
router.get('/learning/scheduler/status', async (req: Request, res: Response) => {
  try {
    const status = learningScheduler.getStatus();
    
    res.status(200).json({
      success: true,
      status
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/federation/learning/scheduler/start
 * Start the learning scheduler
 */
router.post('/learning/scheduler/start', async (req: Request, res: Response) => {
  try {
    learningScheduler.start();
    
    res.status(200).json({
      success: true,
      message: 'Learning scheduler started'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/federation/learning/scheduler/stop
 * Stop the learning scheduler
 */
router.post('/learning/scheduler/stop', async (req: Request, res: Response) => {
  try {
    learningScheduler.stop();
    
    res.status(200).json({
      success: true,
      message: 'Learning scheduler stopped'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/federation/learning/reports/latest
 * Get latest learning report
 */
router.get('/learning/reports/latest', async (req: Request, res: Response) => {
  try {
    const report = learningReporter.getLatestReport();
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'No reports available yet'
      });
    }
    
    res.status(200).json({
      success: true,
      report
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/federation/learning/reports/list
 * List all learning reports
 */
router.get('/learning/reports/list', async (req: Request, res: Response) => {
  try {
    const reports = learningReporter.listReports();
    
    res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/federation/learning/reports/weekly
 * Generate weekly report manually
 */
router.post('/learning/reports/weekly', async (req: Request, res: Response) => {
  try {
    const report = await learningReporter.generateWeeklyReport();
    
    res.status(200).json({
      success: true,
      report
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/federation/learning/reports/monthly
 * Generate monthly report manually
 */
router.post('/learning/reports/monthly', async (req: Request, res: Response) => {
  try {
    const report = await learningReporter.generateMonthlyReport();
    
    res.status(200).json({
      success: true,
      report
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

console.log('[Decision Endpoint] Routes registered');
console.log('[Decision Endpoint] Scheduler & Reports endpoints active');
