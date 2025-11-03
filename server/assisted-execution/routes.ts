/**
 * Execution Layer APIs
 * Phase 5.1 → 7.0: Assisted Execution Layer
 * 
 * ⚠️ CRITICAL SECURITY: All endpoints require authentication
 */

import { Router, Request, Response, NextFunction } from 'express';
import { orchestrator } from './orchestrator';
import { patchGenerator } from './patch-generator';
import { validator } from './validator';
import { codeExecutor } from './code-executor';
import { buildMonitor } from './build-monitor';
import { db } from '../db';
import { executionPatches, executionAudit } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Authentication Middleware
 * يتأكد من أن المستخدم مسجّل دخول
 */
const requireAuth = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required. Please login first.' 
    });
  }
  next();
};

/**
 * Authorization Middleware - PRODUCTION SECURITY
 * يتأكد من أن المستخدم لديه صلاحيات محددة
 * 
 * ⚠️ CRITICAL: Only admin users can execute patches
 */
const requirePermission = (requiredPermission: string) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    // PRODUCTION SECURITY: Check if user is admin
    // Nicholas 3.2 uses 'role' field in user object
    if (req.user.role !== 'admin') {
      console.warn(`⚠️ [Security] Non-admin user ${req.user.id} attempted to access ${requiredPermission}`);
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions. Admin role required for execution operations.' 
      });
    }
    
    console.log(`✅ [Security] Admin user ${req.user.id} authorized for ${requiredPermission}`);
    next();
  };
};

// Apply authentication to ALL routes in this router
router.use(requireAuth);

/**
 * GET /api/execution/status
 * الحصول على حالة الـExecution Layer
 */
router.get('/status', async (req, res) => {
  try {
    const status = orchestrator.getStatus();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/execution/activate
 * تفعيل الـExecution Layer
 * ⚠️ ADMIN ONLY
 */
router.post('/activate', requirePermission('execution:activate'), async (req, res) => {
  try {
    await orchestrator.activate();
    res.json({ success: true, message: 'Execution layer activated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/execution/deactivate
 * تعطيل الـExecution Layer
 * ⚠️ ADMIN ONLY
 */
router.post('/deactivate', requirePermission('execution:deactivate'), async (req, res) => {
  try {
    await orchestrator.deactivate();
    res.json({ success: true, message: 'Execution layer deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/execution/process-issue
 * معالجة مشكلة (توليد patch + تحقق)
 * ⚠️ ADMIN ONLY
 */
router.post('/process-issue', requirePermission('execution:process'), async (req, res) => {
  try {
    const { issue } = req.body;
    
    if (!issue) {
      return res.status(400).json({ success: false, error: 'Issue data is required' });
    }

    const result = await orchestrator.processIssue(issue);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/execution/patches
 * الحصول على كل الـpatches
 */
router.get('/patches', async (req, res) => {
  try {
    const patches = await patchGenerator.getAllPatches();
    res.json({ success: true, patches });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/execution/patches/:id
 * الحصول على patch محدد
 */
router.get('/patches/:id', async (req, res) => {
  try {
    const patch = await patchGenerator.getPatch(req.params.id);
    
    if (!patch) {
      return res.status(404).json({ success: false, error: 'Patch not found' });
    }

    res.json({ success: true, patch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/execution/patches/:id/approve
 * الموافقة على patch
 * ⚠️ ADMIN ONLY - CRITICAL OPERATION
 */
router.post('/patches/:id/approve', requirePermission('execution:approve'), async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const patchId = req.params.id;
    
    const patch = await patchGenerator.getPatch(patchId);
    if (!patch) {
      return res.status(404).json({ success: false, error: 'Patch not found' });
    }

    // تنفيذ الـpatch
    const result = await orchestrator.executePatch(
      patch.id,
      patch.patchContent,
      patch.affectedFiles,
      approvedBy || 'system'
    );

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/execution/patches/:id/reject
 * رفض patch
 * ⚠️ ADMIN ONLY
 */
router.post('/patches/:id/reject', requirePermission('execution:reject'), async (req, res) => {
  try {
    const patchId = req.params.id;
    const { rejectedBy, reason } = req.body;
    
    // Update patch status to rejected in database
    await db.update(executionPatches)
      .set({ 
        status: 'rejected',
        approvedAt: new Date(),
        approvedBy: rejectedBy || 'system'
      })
      .where(eq(executionPatches.id, patchId));
    
    // Log audit trail
    await db.insert(executionAudit).values({
      patchId,
      action: 'rejected',
      actor: rejectedBy || 'system',
      details: { reason },
      signature: null
    });
    
    console.log(`❌ [Execution] Patch ${patchId} rejected by ${rejectedBy || 'system'}`);
    
    res.json({ success: true, message: 'Patch rejected' });
  } catch (error: any) {
    console.error('Failed to reject patch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/execution/patches/:id/rollback
 * التراجع عن patch منفّذ
 * ⚠️ ADMIN ONLY - CRITICAL OPERATION
 */
router.post('/patches/:id/rollback', requirePermission('execution:rollback'), async (req, res) => {
  try {
    const success = await codeExecutor.rollbackPatch(req.params.id);
    
    if (success) {
      res.json({ success: true, message: 'Patch rolled back successfully' });
    } else {
      res.json({ success: false, error: 'Rollback failed' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/execution/validations/:patchId
 * الحصول على نتيجة التحقق لـpatch
 */
router.get('/validations/:patchId', async (req, res) => {
  try {
    const result = validator.getValidationResult(req.params.patchId);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Validation result not found' });
    }

    res.json({ success: true, validationResult: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/execution/executions
 * الحصول على سجل التنفيذ
 */
router.get('/executions', async (req, res) => {
  try {
    const executions = codeExecutor.getAllExecutionResults();
    res.json({ success: true, executions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/execution/build/status
 * الحصول على حالة البناء
 */
router.get('/build/status', async (req, res) => {
  try {
    const status = await buildMonitor.getStatus();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
