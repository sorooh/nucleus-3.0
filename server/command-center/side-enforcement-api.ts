/**
 * SIDE Enforcement API
 * ===================
 * REST API endpoints for SIDE compliance management
 */

import { Router, Request, Response } from 'express';
import { sideEnforcementEngine } from './side-enforcement';

const router = Router();

/**
 * GET /api/command-center/enforcement/status
 * Get overall enforcement status and statistics
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const stats = await sideEnforcementEngine.getEnforcementStats();
    
    res.json({
      success: true,
      enforcement: stats,
    });
  } catch (error: any) {
    console.error('[SIDE Enforcement API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get enforcement status'
    });
  }
});

/**
 * GET /api/command-center/enforcement/compliance
 * Get all compliance records
 */
router.get('/compliance', async (req: Request, res: Response) => {
  try {
    const records = await sideEnforcementEngine.getAllComplianceRecords();
    
    res.json({
      success: true,
      data: records,  // Frontend expects 'data' key
      compliance: records, // Keep for backward compatibility
    });
  } catch (error: any) {
    console.error('[SIDE Enforcement API] Error getting compliance records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get compliance records'
    });
  }
});

/**
 * GET /api/command-center/enforcement/compliance/:nucleusId
 * Get compliance status for a specific nucleus
 */
router.get('/compliance/:nucleusId', async (req: Request, res: Response) => {
  try {
    const { nucleusId } = req.params;
    const status = await sideEnforcementEngine.getComplianceStatus(nucleusId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Compliance record not found'
      });
    }
    
    res.json({
      success: true,
      compliance: status,
    });
  } catch (error: any) {
    console.error('[SIDE Enforcement API] Error getting compliance status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get compliance status'
    });
  }
});

/**
 * POST /api/command-center/enforcement/check/:nucleusId
 * Force compliance check for a specific nucleus
 */
router.post('/check/:nucleusId', async (req: Request, res: Response) => {
  try {
    const { nucleusId } = req.params;
    const result = await sideEnforcementEngine.forceComplianceCheck(nucleusId);
    
    res.json({
      success: true,
      check: result,
    });
  } catch (error: any) {
    console.error('[SIDE Enforcement API] Error forcing compliance check:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to force compliance check'
    });
  }
});

/**
 * POST /api/command-center/enforcement/release/:nucleusId
 * Release nucleus from quarantine
 */
router.post('/release/:nucleusId', async (req: Request, res: Response) => {
  try {
    const { nucleusId } = req.params;
    await sideEnforcementEngine.releaseFromQuarantine(nucleusId);
    
    res.json({
      success: true,
      message: `Nucleus ${nucleusId} released from quarantine`,
    });
  } catch (error: any) {
    console.error('[SIDE Enforcement API] Error releasing from quarantine:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to release from quarantine'
    });
  }
});

/**
 * POST /api/command-center/enforcement/audit
 * Trigger immediate compliance audit for all nuclei
 */
router.post('/audit', async (req: Request, res: Response) => {
  try {
    // Run audit asynchronously
    sideEnforcementEngine.runComplianceAudit().catch(error => {
      console.error('[SIDE Enforcement API] Audit error:', error);
    });
    
    res.json({
      success: true,
      message: 'Compliance audit triggered',
    });
  } catch (error: any) {
    console.error('[SIDE Enforcement API] Error triggering audit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger audit'
    });
  }
});

export { router as sideEnforcementApi };
