/**
 * 🌐 SIDE Distribution API
 * ======================
 * REST API for managing SIDE distribution across external platforms
 * 
 * Endpoints:
 * - POST /api/side/distribute-all - Distribute SIDE to all platforms
 * - POST /api/side/distribute/:platformId - Distribute to specific platform
 * - GET /api/side/distribution/status - Get distribution status for all
 * - GET /api/side/distribution/:platformId - Get status for specific platform
 * - GET /api/side/distribution/stats - Get distribution statistics
 * - POST /api/side/rollback/:platformId - Rollback SIDE from platform
 * - GET /api/side/package/:platformId - Generate SIDE package
 */

import { Router } from "express";
import { sideDistributor } from "./side-distributor";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

/**
 * POST /api/side/supreme-distribute
 * Supreme Sovereign Command: Distribute SIDE to all platforms
 * No auth required - Supreme command
 */
router.post('/supreme-distribute', async (req, res) => {
  try {
    console.log('[SIDE API] 👑 Supreme Sovereign Command: Starting distribution to all platforms...');
    
    const results = await sideDistributor.distributeToAllPlatforms();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: 'Supreme distribution complete',
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error: any) {
    console.error('[SIDE API] ❌ Distribution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Distribution failed',
    });
  }
});

/**
 * POST /api/side/distribute-all
 * Distribute SIDE to all external platforms
 * Protected - Admin only
 */
router.post('/distribute-all', requireAdmin, async (req, res) => {
  try {
    console.log('[SIDE API] 🚀 Starting distribution to all platforms...');
    
    const results = await sideDistributor.distributeToAllPlatforms();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: 'Distribution complete',
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error: any) {
    console.error('[SIDE API] ❌ Distribution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Distribution failed',
    });
  }
});

/**
 * POST /api/side/distribute/:platformId
 * Distribute SIDE to a specific platform
 * Protected - Admin only
 */
router.post('/distribute/:platformId', requireAdmin, async (req, res) => {
  try {
    const { platformId } = req.params;
    
    console.log(`[SIDE API] 🚀 Distributing SIDE to ${platformId}...`);
    
    const result = await sideDistributor.distributeToPlatform(platformId);
    
    if (result.success) {
      res.json({
        success: true,
        message: `SIDE successfully distributed to ${platformId}`,
        result,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        result,
      });
    }
  } catch (error: any) {
    console.error('[SIDE API] ❌ Distribution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Distribution failed',
    });
  }
});

/**
 * GET /api/side/distribution/status
 * Get distribution status for all platforms
 * Public
 */
router.get('/distribution/status', async (req, res) => {
  try {
    const status = await sideDistributor.getAllDistributionStatus();
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('[SIDE API] ❌ Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get distribution status',
    });
  }
});

/**
 * GET /api/side/distribution/stats
 * Get distribution statistics
 * Public
 */
router.get('/distribution/stats', async (req, res) => {
  try {
    const stats = await sideDistributor.getDistributionStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[SIDE API] ❌ Failed to get stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get distribution statistics',
    });
  }
});

/**
 * GET /api/side/distribution/:platformId
 * Get distribution status for a specific platform
 * Public
 */
router.get('/distribution/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    
    const status = await sideDistributor.getDistributionStatus(platformId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: `No distribution record found for ${platformId}`,
      });
    }
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('[SIDE API] ❌ Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get distribution status',
    });
  }
});

/**
 * POST /api/side/rollback/:platformId
 * Rollback SIDE from a platform
 * Protected - Admin only
 */
router.post('/rollback/:platformId', requireAdmin, async (req, res) => {
  try {
    const { platformId } = req.params;
    
    console.log(`[SIDE API] ⏮️ Rolling back SIDE from ${platformId}...`);
    
    await sideDistributor.rollback(platformId);
    
    res.json({
      success: true,
      message: `SIDE removed from ${platformId}`,
    });
  } catch (error: any) {
    console.error('[SIDE API] ❌ Rollback failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Rollback failed',
    });
  }
});

/**
 * GET /api/side/package/:platformId
 * Generate SIDE package for a platform
 * Protected - Admin only
 */
router.get('/package/:platformId', requireAdmin, async (req, res) => {
  try {
    const { platformId } = req.params;
    
    console.log(`[SIDE API] 📦 Generating SIDE package for ${platformId}...`);
    
    const pkg = await sideDistributor.generatePackage(platformId);
    
    res.json({
      success: true,
      package: pkg,
    });
  } catch (error: any) {
    console.error('[SIDE API] ❌ Package generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Package generation failed',
    });
  }
});

export default router;
