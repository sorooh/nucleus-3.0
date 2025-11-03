/**
 * PHASE 8.7 → 9.6: EVOLUTION & MONITORING API ROUTES
 */

import { Router } from 'express';
import { evolutionMonitoringEngine } from './index';
import { empireFitnessCalculator } from './empire-fitness';
import { weeklyReportGenerator } from './weekly-reports';

const router = Router();

// ============================================
// ENGINE CONTROL
// ============================================

router.get('/status', async (req, res) => {
  try {
    const status = evolutionMonitoringEngine.getStatus();
    const stats = await evolutionMonitoringEngine.getStats();

    res.json({
      success: true,
      data: {
        ...status,
        stats,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/start', async (req, res) => {
  try {
    await evolutionMonitoringEngine.start();
    res.json({
      success: true,
      message: 'Evolution & Monitoring Engine started',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/stop', async (req, res) => {
  try {
    await evolutionMonitoringEngine.stop();
    res.json({
      success: true,
      message: 'Evolution & Monitoring Engine stopped',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// EVOLUTION RUNS
// ============================================

router.post('/run', async (req, res) => {
  try {
    const { runType } = req.body;
    const runId = await evolutionMonitoringEngine.runEvolutionCycle(runType || 'triggered');

    res.json({
      success: true,
      data: { runId },
      message: 'Evolution cycle started',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/runs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const runs = await evolutionMonitoringEngine.getRecentRuns(limit);

    // Convert numeric strings to numbers for API response
    const runsWithNumbers = runs.map(run => ({
      ...run,
      fitnessScoreAvg: run.fitnessScoreAvg ? parseFloat(run.fitnessScoreAvg as any) : null,
    }));

    res.json({
      success: true,
      data: runsWithNumbers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// IMPROVEMENTS
// ============================================

router.get('/improvements/pending', async (req, res) => {
  try {
    const improvements = await evolutionMonitoringEngine.getPendingImprovements();

    // Convert numeric strings to numbers for API response
    const improvementsWithNumbers = improvements.map(imp => ({
      ...imp,
      fitnessImprovement: imp.fitnessImprovement ? parseFloat(imp.fitnessImprovement as any) : null,
    }));

    res.json({
      success: true,
      data: improvementsWithNumbers,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/improvements/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await evolutionMonitoringEngine.executeSafeImprovement(id);

    res.json({
      success: true,
      data: result,
      message: 'Safe improvement executed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// STATISTICS
// ============================================

router.get('/stats', async (req, res) => {
  try {
    const stats = await evolutionMonitoringEngine.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// EMPIRE-WIDE FITNESS SCORE
// ============================================

router.get('/empire-fitness', async (req, res) => {
  try {
    const fitness = await empireFitnessCalculator.calculateEmpireFitness();

    res.json({
      success: true,
      data: fitness,
    });
  } catch (error: any) {
    console.error('[Empire Fitness API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// WEEKLY PERFORMANCE REPORTS
// ============================================

router.get('/reports/weekly', async (req, res) => {
  try {
    const report = await weeklyReportGenerator.generateWeeklyReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('[Weekly Reports API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
