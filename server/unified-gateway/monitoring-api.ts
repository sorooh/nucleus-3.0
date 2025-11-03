/**
 * Monitoring API for Unified Gateway
 * 
 * Admin dashboard endpoints for monitoring rate limits, platform status, etc.
 * 
 * البيان الهندسي السيادي - منظومة سُروح
 */

import { Router, Request, Response } from 'express';
import { getRateLimiter } from './redis-rate-limiter';
import { db } from '../db';
import { platformRegistry } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/ugw/monitoring/rate-limits
 * Get rate limit stats for all platforms
 */
router.get('/rate-limits', async (req: Request, res: Response) => {
  try {
    const limiter = getRateLimiter();
    const stats = await limiter.getAllStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      platforms: stats,
    });
  } catch (error: any) {
    console.error('[Monitoring] Error getting rate limits:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/ugw/monitoring/rate-limits/:platformId
 * Get rate limit stats for specific platform
 */
router.get('/rate-limits/:platformId', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;
    const limiter = getRateLimiter();
    
    const stats = await limiter.getStats(platformId);

    // Get platform config
    const [platform] = await db
      .select({
        platformId: platformRegistry.platformId,
        displayName: platformRegistry.displayName,
        rateLimitRPM: platformRegistry.rateLimitRPM,
        rateLimitRPH: platformRegistry.rateLimitRPH,
        rateLimitRPD: platformRegistry.rateLimitRPD,
      })
      .from(platformRegistry)
      .where(eq(platformRegistry.platformId, platformId))
      .limit(1);

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found',
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      platform: {
        platformId: platform.platformId,
        displayName: platform.displayName,
        current: stats,
        limits: {
          minute: platform.rateLimitRPM,
          hour: platform.rateLimitRPH,
          day: platform.rateLimitRPD || 10000,
        },
        remaining: {
          minute: Math.max(0, platform.rateLimitRPM - stats.minute),
          hour: Math.max(0, platform.rateLimitRPH - stats.hour),
          day: Math.max(0, (platform.rateLimitRPD || 10000) - stats.day),
        },
        usage: {
          minute: platform.rateLimitRPM > 0 
            ? ((stats.minute / platform.rateLimitRPM) * 100).toFixed(2) + '%'
            : '0%',
          hour: platform.rateLimitRPH > 0
            ? ((stats.hour / platform.rateLimitRPH) * 100).toFixed(2) + '%'
            : '0%',
          day: (platform.rateLimitRPD || 10000) > 0
            ? ((stats.day / (platform.rateLimitRPD || 10000)) * 100).toFixed(2) + '%'
            : '0%',
        },
      },
    });
  } catch (error: any) {
    console.error('[Monitoring] Error getting platform stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform stats',
      message: error.message,
    });
  }
});

/**
 * POST /api/ugw/monitoring/rate-limits/:platformId/reset
 * Reset rate limits for a platform (admin only)
 */
router.post('/rate-limits/:platformId/reset', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;
    const limiter = getRateLimiter();
    
    await limiter.resetLimit(platformId);

    res.json({
      success: true,
      message: 'Rate limits reset successfully',
      platformId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Monitoring] Error resetting rate limits:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to reset rate limits',
      message: error.message,
    });
  }
});

/**
 * GET /api/ugw/monitoring/health
 * Health check for Redis and overall UGW status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const limiter = getRateLimiter();
    const redisHealthy = await limiter.healthCheck();

    // Count active platforms
    const platforms = await db
      .select({
        total: platformRegistry.id,
      })
      .from(platformRegistry)
      .where(eq(platformRegistry.isActive, 1));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: redisHealthy ? 'healthy' : 'degraded',
      components: {
        redis: {
          healthy: redisHealthy,
          status: redisHealthy ? 'connected' : 'disconnected',
        },
        database: {
          healthy: true,
          status: 'connected',
        },
        platformRegistry: {
          healthy: true,
          activePlatforms: platforms.length,
        },
      },
    });
  } catch (error: any) {
    console.error('[Monitoring] Health check error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/ugw/monitoring/platforms
 * Get overview of all platforms with their activity
 */
router.get('/platforms', async (req: Request, res: Response) => {
  try {
    const platforms = await db
      .select({
        platformId: platformRegistry.platformId,
        displayName: platformRegistry.displayName,
        authMode: platformRegistry.authMode,
        isActive: platformRegistry.isActive,
        status: platformRegistry.status,
        rateLimitRPM: platformRegistry.rateLimitRPM,
        rateLimitRPH: platformRegistry.rateLimitRPH,
        rateLimitRPD: platformRegistry.rateLimitRPD,
        lastActive: platformRegistry.lastActive,
      })
      .from(platformRegistry)
      .orderBy(desc(platformRegistry.lastActive));

    const limiter = getRateLimiter();
    const allStats = await limiter.getAllStats();

    // Enrich with rate limit stats
    const enrichedPlatforms = platforms.map(platform => ({
      ...platform,
      currentRequests: allStats[platform.platformId] || {
        minute: 0,
        hour: 0,
        day: 0,
      },
      usage: {
        minute: platform.rateLimitRPM > 0
          ? ((allStats[platform.platformId]?.minute || 0) / platform.rateLimitRPM * 100).toFixed(2) + '%'
          : '0%',
        hour: platform.rateLimitRPH > 0
          ? ((allStats[platform.platformId]?.hour || 0) / platform.rateLimitRPH * 100).toFixed(2) + '%'
          : '0%',
        day: (platform.rateLimitRPD || 10000) > 0
          ? ((allStats[platform.platformId]?.day || 0) / (platform.rateLimitRPD || 10000) * 100).toFixed(2) + '%'
          : '0%',
      },
    }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: enrichedPlatforms.length,
      platforms: enrichedPlatforms,
    });
  } catch (error: any) {
    console.error('[Monitoring] Error getting platforms:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get platforms',
      message: error.message,
    });
  }
});

export default router;
