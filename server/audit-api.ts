/**
 * Auto-Audit Chain API Routes
 * النظام الصادق 100% - لا توجد بيانات وهمية
 * 
 * Provides endpoints for audit failures, commits, integrity checks, and alerts
 * All data comes from real database - zero mock data
 */

import express from 'express';
import { db } from './db';
import { auditFailures, auditCommits, auditIntegrity, auditAlerts } from '../shared/schema';
import { eq, desc, sql, and, or } from 'drizzle-orm';
import { SmartRepairSystem } from './system/audit-engine/repair/smart-repair';
import { Nicholas } from './boot/nicholas-core';

const router = express.Router();
const repairSystem = new SmartRepairSystem();

/**
 * GET /api/audit/failures
 * Get all audit failures with optional filters
 */
router.get('/failures', async (req, res) => {
  try {
    const { limit = '100', status, severity, nucleusName } = req.query;
    
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(auditFailures.status, status as string));
    }
    if (severity && severity !== 'all') {
      conditions.push(eq(auditFailures.severity, severity as string));
    }
    if (nucleusName && nucleusName !== 'all') {
      conditions.push(eq(auditFailures.nucleusName, nucleusName as string));
    }

    const failures = await db
      .select()
      .from(auditFailures)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditFailures.detectedAt))
      .limit(parseInt(limit as string));

    res.json({ 
      success: true, 
      data: failures,
      count: failures.length
    });
  } catch (error: any) {
    console.error('[Audit API] Error fetching failures:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/audit/failures/stats
 * Get statistics about audit failures (100% real data)
 */
router.get('/failures/stats', async (req, res) => {
  try {
    // Get all failures from database
    const allFailures = await db
      .select()
      .from(auditFailures);

    // Calculate REAL statistics from actual data
    const total = allFailures.length;
    const openIssues = allFailures.filter(f => 
      f.status === 'detected' || f.status === 'acknowledged' || f.status === 'fixing'
    ).length;
    const resolvedIssues = allFailures.filter(f => f.status === 'fixed').length;
    const criticalIssues = allFailures.filter(f => f.severity === 'critical').length;

    // Count by status (real counts)
    const byStatus: Record<string, number> = {};
    allFailures.forEach(f => {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
    });

    // Count by severity (real counts)
    const bySeverity: Record<string, number> = {};
    allFailures.forEach(f => {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    });

    // Count by nucleus (real counts)
    const byNucleus: Record<string, number> = {};
    allFailures.forEach(f => {
      if (f.nucleusName) {
        byNucleus[f.nucleusName] = (byNucleus[f.nucleusName] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        total,
        openIssues,
        resolvedIssues,
        criticalIssues,
        byStatus,
        bySeverity,
        byNucleus
      }
    });
  } catch (error: any) {
    console.error('[Audit API] Error calculating stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * PATCH /api/audit/failures/:id
 * Update audit failure status (mark as fixed, acknowledged, etc.)
 */
router.patch('/failures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolvedBy, resolutionNotes } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (status) updateData.status = status;
    if (resolvedBy) updateData.resolvedBy = resolvedBy;
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (status === 'fixed') updateData.fixedAt = new Date();

    const updated = await db
      .update(auditFailures)
      .set(updateData)
      .where(eq(auditFailures.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Failure not found' 
      });
    }

    res.json({ 
      success: true, 
      data: updated[0],
      message: 'تم تحديث حالة المشكلة بنجاح'
    });
  } catch (error: any) {
    console.error('[Audit API] Error updating failure:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/audit/commits/stats
 * Get commit audit statistics (100% real data)
 */
router.get('/commits/stats', async (req, res) => {
  try {
    const allCommits = await db.select().from(auditCommits);
    
    const total = allCommits.length;
    const passed = allCommits.filter(c => c.auditStatus === 'passed').length;
    const failed = allCommits.filter(c => c.auditStatus === 'failed').length;
    const warning = allCommits.filter(c => c.auditStatus === 'warning').length;
    
    const qualityScore = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    
    res.json({
      success: true,
      data: {
        total,
        passed,
        failed,
        warning,
        qualityScore: parseFloat(qualityScore)
      }
    });
  } catch (error: any) {
    console.error('[Audit API] Error calculating commit stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/audit/commits
 * Get audit commit analysis (from real git commits)
 */
router.get('/commits', async (req, res) => {
  try {
    const { limit = '50', status } = req.query;
    
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(auditCommits.auditStatus, status as string));
    }

    const commits = await db
      .select()
      .from(auditCommits)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditCommits.commitDate))
      .limit(parseInt(limit as string));

    res.json({ 
      success: true, 
      data: commits,
      count: commits.length
    });
  } catch (error: any) {
    console.error('[Audit API] Error fetching commits:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/audit/integrity
 * Get data integrity check results
 */
router.get('/integrity', async (req, res) => {
  try {
    const { limit = '50' } = req.query;

    const checks = await db
      .select()
      .from(auditIntegrity)
      .orderBy(desc(auditIntegrity.verifiedAt))
      .limit(parseInt(limit as string));

    res.json({ 
      success: true, 
      data: checks,
      count: checks.length
    });
  } catch (error: any) {
    console.error('[Audit API] Error fetching integrity checks:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/audit/alerts
 * Get active audit alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { status = 'active', limit = '20' } = req.query;

    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(auditAlerts.status, status as string));
    }

    const alerts = await db
      .select()
      .from(auditAlerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditAlerts.triggeredAt))
      .limit(parseInt(limit as string));

    res.json({ 
      success: true, 
      data: alerts,
      count: alerts.length
    });
  } catch (error: any) {
    console.error('[Audit API] Error fetching alerts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/audit/summary
 * Get overall audit summary (100% real data from all tables)
 */
router.get('/summary', async (req, res) => {
  try {
    // Get counts from all audit tables (REAL DATA ONLY)
    const [failuresCount, commitsCount, integrityCount, alertsCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(auditFailures),
      db.select({ count: sql<number>`count(*)` }).from(auditCommits),
      db.select({ count: sql<number>`count(*)` }).from(auditIntegrity),
      db.select({ count: sql<number>`count(*)` }).from(auditAlerts).where(eq(auditAlerts.status, 'active'))
    ]);

    res.json({
      success: true,
      data: {
        totalFailures: Number(failuresCount[0]?.count || 0),
        totalCommits: Number(commitsCount[0]?.count || 0),
        totalIntegrityChecks: Number(integrityCount[0]?.count || 0),
        activeAlerts: Number(alertsCount[0]?.count || 0)
      }
    });
  } catch (error: any) {
    console.error('[Audit API] Error generating summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/audit/run
 * Run full audit across all systems - delegates to Nicholas
 */
router.post('/run', async (req, res) => {
  try {
    console.log('[Audit API] Running full system audit...');
    
    const report = await Nicholas.runFullAudit(req.body || {});
    
    res.json({ 
      success: true, 
      report,
      message: 'تم تشغيل الفحص الشامل بنجاح'
    });
  } catch (error: any) {
    console.error('[Audit API] Error running audit:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/audit/repair/:id
 * Trigger auto-repair for a specific failure using SmartRepairSystem
 */
router.post('/repair/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the failure details from database
    const failure = await db
      .select()
      .from(auditFailures)
      .where(eq(auditFailures.id, id))
      .limit(1);
    
    if (failure.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Failure not found' 
      });
    }
    
    const failureData = failure[0];
    
    // Update status to "fixing"
    await db
      .update(auditFailures)
      .set({ status: 'fixing' })
      .where(eq(auditFailures.id, id));
    
    console.log(`[Audit API] Initiating repair for failure: ${id}`);
    
    // Convert failure to problem format for SmartRepairSystem
    const problem = {
      id: failureData.id,
      nucleus: failureData.nucleusName || undefined,
      type: failureData.failureType,
      description: failureData.failureReason,
      evidence: failureData.stackTrace ? [failureData.stackTrace] : [],
      affectedFiles: failureData.fileName ? [failureData.fileName] : [],
      severity: (failureData.severity?.toUpperCase() || 'MEDIUM') as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      riskLevel: failureData.severity === 'critical' ? 0.9 : 
                 failureData.severity === 'high' ? 0.7 :
                 failureData.severity === 'medium' ? 0.5 : 0.3
    };
    
    // Trigger SmartRepairSystem
    const repairResult = await repairSystem.safeAutoRepair(problem);
    
    // Update database based on repair result
    if (repairResult.success) {
      await db
        .update(auditFailures)
        .set({ 
          status: 'fixed',
          fixedAt: new Date(),
          resolvedBy: 'SmartRepairSystem',
          resolutionNotes: `Auto-repaired: ${repairResult.action}`
        })
        .where(eq(auditFailures.id, id));
    } else {
      await db
        .update(auditFailures)
        .set({ 
          status: 'detected',
          resolutionNotes: `Repair failed: ${repairResult.reason || 'Unknown error'}`
        })
        .where(eq(auditFailures.id, id));
    }
    
    res.json({ 
      success: repairResult.success, 
      result: repairResult,
      message: repairResult.success ? 
        'تم الإصلاح التلقائي بنجاح' : 
        'فشل الإصلاح التلقائي - يتطلب مراجعة يدوية'
    });
  } catch (error: any) {
    console.error('[Audit API] Error repairing failure:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
