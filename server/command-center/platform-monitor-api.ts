/**
 * 📡 Platform Monitoring API
 * ==========================
 * REST API endpoints for platform monitoring and health tracking
 * 
 * Endpoints:
 * - POST   /api/monitor/heartbeat      - Receive heartbeat from platforms
 * - GET    /api/monitor/status         - Get all platforms status
 * - GET    /api/monitor/status/:id     - Get specific platform status
 * - POST   /api/monitor/verify/:id     - Verify specific platform
 * - POST   /api/monitor/verify-all     - Verify all platforms
 * - GET    /api/monitor/stats          - Get monitoring statistics
 * - GET    /api/monitor/heartbeats/:id - Get heartbeat history
 * 
 * @supreme Nicholas monitors all platforms
 */

import { Router } from 'express';
import { platformMonitor } from './platform-monitor';
import { EXTERNAL_PLATFORMS } from './external-platforms-registry';
import { autoVerifier } from './auto-verifier';
import { platformAlertManager } from './platform-alerts';
import { sideDistributor } from './side-distributor';

const router = Router();

/**
 * POST /api/monitor/heartbeat
 * Receive heartbeat signal from external platform
 * 
 * Body: {
 *   platformId: string,
 *   platformName?: string,
 *   sideInstalled: boolean,
 *   sideVersion?: string,
 *   sideActive: boolean,
 *   status: 'online' | 'degraded' | 'offline',
 *   cpuUsage?: number,
 *   memoryUsage?: number,
 *   responseTime?: number,
 *   complianceScore?: number,
 *   codeQualityScore?: number,
 *   securityScore?: number,
 *   metadata?: object
 * }
 */
router.post('/heartbeat', async (req, res) => {
  try {
    const {
      platformId,
      platformName,
      sideInstalled,
      sideVersion,
      sideActive,
      status,
      cpuUsage,
      memoryUsage,
      responseTime,
      complianceScore,
      codeQualityScore,
      securityScore,
      metadata,
    } = req.body;

    // Validation
    if (!platformId) {
      return res.status(400).json({
        success: false,
        error: 'platformId is required',
      });
    }

    if (typeof sideInstalled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'sideInstalled must be boolean',
      });
    }

    if (typeof sideActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'sideActive must be boolean',
      });
    }

    const validStatuses = ['online', 'degraded', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Get IP address
    const ipAddress = req.ip || req.socket.remoteAddress;

    // Process heartbeat
    await platformMonitor.processHeartbeat({
      platformId,
      platformName,
      sideInstalled,
      sideVersion,
      sideActive,
      status,
      cpuUsage,
      memoryUsage,
      responseTime,
      complianceScore,
      codeQualityScore,
      securityScore,
      metadata,
      ipAddress,
    });

    res.json({
      success: true,
      message: 'Heartbeat received',
      platformId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process heartbeat',
    });
  }
});

/**
 * GET /api/monitor/status
 * Get health status of all platforms
 */
router.get('/status', async (req, res) => {
  try {
    const healthStatuses = await platformMonitor.getAllPlatformsHealth();

    res.json({
      success: true,
      platforms: healthStatuses,
      totalPlatforms: EXTERNAL_PLATFORMS.length,
      monitoredPlatforms: healthStatuses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get platform status',
    });
  }
});

/**
 * GET /api/monitor/status/:platformId
 * Get health status of specific platform
 */
router.get('/status/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;

    const health = await platformMonitor.getPlatformHealth(platformId);

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found or not monitored yet',
      });
    }

    res.json({
      success: true,
      platform: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get platform status',
    });
  }
});

/**
 * POST /api/monitor/verify/:platformId
 * Manually verify specific platform
 */
router.post('/verify/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;

    const result = await platformMonitor.verifyPlatform(platformId);

    res.json({
      success: true,
      verification: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Verify error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify platform',
    });
  }
});

/**
 * POST /api/monitor/verify-all
 * Verify all platforms
 */
router.post('/verify-all', async (req, res) => {
  try {
    const results = await platformMonitor.verifyAllPlatforms();

    const successful = results.filter(r => r.success).length;
    const detected = results.filter(r => r.sideDetected).length;

    res.json({
      success: true,
      results,
      summary: {
        totalPlatforms: results.length,
        successful,
        failed: results.length - successful,
        sideDetected: detected,
        sideNotDetected: results.length - detected,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Verify all error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify platforms',
    });
  }
});

/**
 * GET /api/monitor/stats
 * Get monitoring statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await platformMonitor.getMonitoringStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get monitoring stats',
    });
  }
});

/**
 * GET /api/monitor/heartbeats/:platformId
 * Get recent heartbeats for platform
 */
router.get('/heartbeats/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const heartbeats = await platformMonitor.getRecentHeartbeats(platformId, limit);

    res.json({
      success: true,
      platformId,
      heartbeats,
      count: heartbeats.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get heartbeats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get heartbeats',
    });
  }
});

/**
 * GET /api/monitor/verifications/:platformId
 * Get verification history for platform
 */
router.get('/verifications/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const verifications = await platformMonitor.getVerificationHistory(platformId, limit);

    res.json({
      success: true,
      platformId,
      verifications,
      count: verifications.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get verifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get verifications',
    });
  }
});

/**
 * GET /api/monitor/platforms
 * Get list of all registered platforms
 */
router.get('/platforms', async (req, res) => {
  try {
    res.json({
      success: true,
      platforms: EXTERNAL_PLATFORMS.map(p => ({
        nodeId: p.nodeId,
        nodeName: p.nodeName,
        arabicName: p.arabicName,
        nodeType: p.nodeType,
        nodeUrl: p.nodeUrl,
        priority: p.priority,
        nucleusLevel: p.nucleusLevel,
      })),
      totalPlatforms: EXTERNAL_PLATFORMS.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get platforms error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get platforms',
    });
  }
});

/**
 * GET /api/monitor/auto-verifier/status
 * Get auto-verifier status
 */
router.get('/auto-verifier/status', async (req, res) => {
  try {
    const status = autoVerifier.getStatus();

    res.json({
      success: true,
      autoVerifier: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get auto-verifier status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get auto-verifier status',
    });
  }
});

/**
 * POST /api/monitor/auto-verifier/force-run
 * Force run verification immediately
 */
router.post('/auto-verifier/force-run', async (req, res) => {
  try {
    await autoVerifier.forceRun();

    res.json({
      success: true,
      message: 'Verification started',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Force run error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to force run verification',
    });
  }
});

/**
 * GET /api/monitor/alerts
 * Get all active alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const alerts = await platformAlertManager.getAlerts({
      status,
      limit,
    });

    res.json({
      success: true,
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get alerts',
    });
  }
});

/**
 * GET /api/monitor/alerts/stats
 * Get alert statistics
 */
router.get('/alerts/stats', async (req, res) => {
  try {
    const stats = await platformAlertManager.getAlertStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get alert stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get alert stats',
    });
  }
});

/**
 * POST /api/monitor/alerts/check
 * Check all platforms for alert conditions
 */
router.post('/alerts/check', async (req, res) => {
  try {
    await platformAlertManager.checkAllPlatforms();

    res.json({
      success: true,
      message: 'Alert check complete',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Alert check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check alerts',
    });
  }
});

/**
 * DELETE /api/monitor/alerts/clear-old
 * Clear old alerts (older than 24 hours)
 */
router.delete('/alerts/clear-old', async (req, res) => {
  try {
    const count = await platformAlertManager.clearOldAlerts();

    res.json({
      success: true,
      message: 'Old alerts cleared',
      clearedCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Clear old alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear old alerts',
    });
  }
});

/**
 * GET /api/monitor/distribution/status
 * Get SIDE distribution status for all platforms
 */
router.get('/distribution/status', async (req, res) => {
  try {
    const status = await sideDistributor.getAllDistributionStatus();

    res.json({
      success: true,
      distributions: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get distribution status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get distribution status',
    });
  }
});

/**
 * GET /api/monitor/distribution/status/:platformId
 * Get SIDE distribution status for specific platform
 */
router.get('/distribution/status/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const status = await sideDistributor.getDistributionStatus(platformId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Distribution status not found',
      });
    }

    res.json({
      success: true,
      distribution: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get platform distribution status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get platform distribution status',
    });
  }
});

/**
 * GET /api/monitor/distribution/stats
 * Get SIDE distribution statistics
 */
router.get('/distribution/stats', async (req, res) => {
  try {
    const stats = await sideDistributor.getDistributionStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Get distribution stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get distribution stats',
    });
  }
});

/**
 * POST /api/monitor/distribution/deploy/:platformId
 * Deploy SIDE to specific platform
 */
router.post('/distribution/deploy/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    const result = await sideDistributor.distributeToPlatform(platformId);

    res.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Deploy SIDE error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deploy SIDE',
    });
  }
});

/**
 * POST /api/monitor/distribution/deploy-all
 * Deploy SIDE to all platforms
 */
router.post('/distribution/deploy-all', async (req, res) => {
  try {
    const results = await sideDistributor.distributeToAllPlatforms();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Deployed to ${successful} platforms, ${failed} failed`,
      results,
      stats: {
        total: results.length,
        successful,
        failed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Deploy all SIDE error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deploy SIDE to all platforms',
    });
  }
});

/**
 * POST /api/monitor/distribution/rollback/:platformId
 * Rollback SIDE from specific platform
 */
router.post('/distribution/rollback/:platformId', async (req, res) => {
  try {
    const { platformId } = req.params;
    await sideDistributor.rollback(platformId);

    res.json({
      success: true,
      message: `SIDE rolled back from ${platformId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Platform Monitor API] Rollback SIDE error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rollback SIDE',
    });
  }
});

export default router;
