/**
 * PHASE Ω.4: PROACTIVE ACTIONS API
 * RESTful endpoints for Nicholas proactive actions
 */

import { Router } from 'express';
import { actionExecutor } from './action-executor';
import { db } from '../db';
import { proactiveActions, actionIntents } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/proactive-actions/status
 * Get executor status
 */
router.get('/status', async (req, res) => {
  try {
    const status = actionExecutor.getStatus();
    
    res.json({
      success: true,
      status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/proactive-actions/actions
 * Get all proactive actions
 */
router.get('/actions', async (req, res) => {
  try {
    const { status, platform, limit = '50' } = req.query;

    let query = db.select().from(proactiveActions);

    // Apply filters
    if (status) {
      query = query.where(eq(proactiveActions.executionStatus, status as string)) as any;
    }
    if (platform) {
      query = query.where(eq(proactiveActions.targetPlatform, platform as string)) as any;
    }

    const actions = await query
      .orderBy(desc(proactiveActions.createdAt))
      .limit(parseInt(limit as string));

    // Get stats
    const totalActions = actions.length;
    const completed = actions.filter(a => a.executionStatus === 'completed').length;
    const failed = actions.filter(a => a.executionStatus === 'failed').length;
    const pending = actions.filter(a => a.executionStatus === 'pending').length;

    res.json({
      success: true,
      actions,
      stats: {
        total: totalActions,
        completed,
        failed,
        pending,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/proactive-actions/actions/:id
 * Get specific action by ID
 */
router.get('/actions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [action] = await db.select()
      .from(proactiveActions)
      .where(eq(proactiveActions.id, id))
      .limit(1);

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    res.json({
      success: true,
      action,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/proactive-actions/execute
 * Execute a new proactive action
 */
router.post('/execute', async (req, res) => {
  try {
    const { type, targetPlatform, payload, title, description, requiresApproval, priority } = req.body;

    if (!type || !targetPlatform || !payload || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, targetPlatform, payload, title',
      });
    }

    const action = await actionExecutor.executeAction({
      type,
      targetPlatform,
      payload,
      title,
      description,
      requiresApproval,
      priority,
    });

    res.json({
      success: true,
      action,
      message: requiresApproval ? 'Action created and pending approval' : 'Action executed',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/proactive-actions/intents
 * Get all action intents
 */
router.get('/intents', async (req, res) => {
  try {
    const { status, limit = '50' } = req.query;

    let query = db.select().from(actionIntents);

    if (status) {
      query = query.where(eq(actionIntents.status, status as string)) as any;
    }

    const intents = await query
      .orderBy(desc(actionIntents.createdAt))
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      intents,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/proactive-actions/intents
 * Record a new intent
 */
router.post('/intents', async (req, res) => {
  try {
    const { type, title, description, proposedAction, confidence } = req.body;

    if (!type || !title || !proposedAction) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, title, proposedAction',
      });
    }

    const intent = await actionExecutor.recordIntent({
      type,
      title,
      description,
      proposedAction,
      confidence: confidence || 0.5,
    });

    res.json({
      success: true,
      intent,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/proactive-actions/intents/:intentId/approve
 * Approve or reject an intent
 */
router.post('/intents/:intentId/approve', async (req, res) => {
  try {
    const { intentId } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: approved (boolean)',
      });
    }

    const result = await actionExecutor.convertIntentToAction(intentId, approved);

    res.json({
      success: true,
      action: result,
      message: approved ? 'Intent approved and converted to action' : 'Intent rejected',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/proactive-actions/recent
 * Get recent actions (last 24 hours)
 */
router.get('/recent', async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentActions = await db.select()
      .from(proactiveActions)
      .orderBy(desc(proactiveActions.createdAt))
      .limit(20);

    const completed = recentActions.filter(a => a.executionStatus === 'completed');
    const failed = recentActions.filter(a => a.executionStatus === 'failed');

    res.json({
      success: true,
      actions: recentActions,
      stats: {
        total: recentActions.length,
        completed: completed.length,
        failed: failed.length,
        successRate: recentActions.length > 0 
          ? Math.round((completed.length / recentActions.length) * 100) 
          : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
