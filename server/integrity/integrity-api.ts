import { Router } from 'express';
import { db } from '../db';
import { integrityReports, evolutionSuggestions, evolutionPatterns } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';
import { runFullIntegrityCycle } from './hub';
import { getEvolutionSuggestions, getEvolutionPatterns } from './evolution-adaptive';

const router = Router();

// Get latest integrity report
router.get('/latest', async (req, res) => {
  try {
    const latest = await db
      .select()
      .from(integrityReports)
      .orderBy(desc(integrityReports.createdAt))
      .limit(1);

    if (latest.length === 0) {
      return res.json({
        success: false,
        message: 'No integrity reports found yet. First cycle will run in 5 minutes.',
        data: null
      });
    }

    res.json({
      success: true,
      data: latest[0]
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error fetching latest report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integrity report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all integrity reports (with pagination)
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const reports = await db
      .select()
      .from(integrityReports)
      .orderBy(desc(integrityReports.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: reports,
      pagination: {
        limit,
        offset,
        total: reports.length
      }
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error fetching report history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integrity history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get integrity stats summary
router.get('/stats', async (req, res) => {
  try {
    const latest = await db
      .select()
      .from(integrityReports)
      .orderBy(desc(integrityReports.createdAt))
      .limit(1);

    if (latest.length === 0) {
      return res.json({
        success: false,
        message: 'No stats available yet',
        data: null
      });
    }

    const report = latest[0];

    res.json({
      success: true,
      data: {
        autonomyScore: parseFloat(report.autonomyScore),
        totalModules: report.totalModules,
        fakeModules: report.fakeModulesCount,
        criticalFailures: report.criticalFailuresCount,
        overallStatus: report.overallStatus,
        lastCycle: report.createdAt,
        cycleNumber: report.cycleNumber
      }
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integrity stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Trigger manual integrity cycle (Phase Ω.5)
router.post('/trigger', async (req, res) => {
  try {
    console.log('🔧 [IntegrityAPI] Manual integrity cycle triggered...');
    
    // Run cycle asynchronously
    runFullIntegrityCycle().catch((error) => {
      console.error('❌ [IntegrityAPI] Cycle failed:', error);
    });

    res.json({
      success: true,
      message: 'Integrity cycle started - check logs for results'
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error triggering cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger integrity cycle',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Phase Ω.7: Get evolution suggestions
router.get('/evolution/suggestions', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const suggestions = await getEvolutionSuggestions(status);

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error fetching evolution suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evolution suggestions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Phase Ω.7: Get evolution patterns
router.get('/evolution/patterns', async (req, res) => {
  try {
    const patterns = await getEvolutionPatterns();

    res.json({
      success: true,
      data: patterns,
      count: patterns.length
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error fetching evolution patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evolution patterns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Phase Ω.7: Approve evolution suggestion
router.post('/evolution/suggestions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { appliedBy } = req.body;

    await db.update(evolutionSuggestions)
      .set({ 
        status: 'approved',
        appliedBy: appliedBy || 'manual',
        updatedAt: new Date()
      })
      .where(eq(evolutionSuggestions.id, id));

    res.json({
      success: true,
      message: 'Suggestion approved successfully'
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error approving suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve suggestion',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Phase Ω.7: Reject evolution suggestion
router.post('/evolution/suggestions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db.update(evolutionSuggestions)
      .set({ 
        status: 'rejected',
        actualImpact: reason,
        updatedAt: new Date()
      })
      .where(eq(evolutionSuggestions.id, id));

    res.json({
      success: true,
      message: 'Suggestion rejected successfully'
    });
  } catch (error) {
    console.error('[IntegrityAPI] Error rejecting suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject suggestion',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
