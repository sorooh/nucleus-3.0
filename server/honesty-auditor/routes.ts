/**
 * Honesty Auditor API Routes
 */

import { Router } from 'express';
import { honestyAuditor } from './index';

const router = Router();

/**
 * GET /status - Get auditor status
 */
router.get('/status', async (req, res) => {
  try {
    const status = honestyAuditor.getStatus();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /scan - Trigger full codebase scan
 */
router.post('/scan', async (req, res) => {
  try {
    const report = await honestyAuditor.scanCodebase();
    res.json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /report - Get last scan report
 */
router.get('/report', async (req, res) => {
  try {
    const report = honestyAuditor.getLastScan();
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'No scan results available. Run a scan first.' 
      });
    }

    res.json({ success: true, report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /issues/critical - Get critical issues
 */
router.get('/issues/critical', async (req, res) => {
  try {
    const issues = honestyAuditor.getIssuesBySeverity('critical');
    res.json({ success: true, issues, count: issues.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /issues/:category - Get issues by category
 */
router.get('/issues/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const issues = honestyAuditor.getIssuesByCategory(category);
    res.json({ success: true, issues, count: issues.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
