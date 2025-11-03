/**
 * API Gateway Routes
 * 
 * Special endpoints for external platforms
 */

import { Router } from 'express';
import { apiGatewayMiddleware, getPlatformInfo, listPlatforms } from './api-gateway';

const router = Router();

/**
 * Health check endpoint (no auth required)
 */
router.get('/gateway/health', (req, res) => {
  res.json({
    success: true,
    service: 'Nucleus API Gateway',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

/**
 * Platform info (requires auth)
 */
router.get('/gateway/platform/info', apiGatewayMiddleware, (req, res) => {
  const platform = (req as any).platform;
  const rateLimit = (req as any).rateLimit;
  
  res.json({
    success: true,
    platform: {
      id: platform.id,
      name: platform.name,
      active: platform.active,
      allowedEndpoints: platform.allowedEndpoints,
      rateLimit: {
        limits: platform.rateLimit,
        remaining: rateLimit
      }
    }
  });
});

/**
 * Admin endpoints (for monitoring)
 * في الإنتاج، هذه يجب أن تكون محمية بـ admin authentication
 */
router.get('/gateway/admin/platforms', (req, res) => {
  // TODO: Add admin authentication
  
  const platforms = listPlatforms().map(p => ({
    id: p.id,
    name: p.name,
    active: p.active,
    createdAt: p.createdAt,
    rateLimit: p.rateLimit
  }));
  
  res.json({
    success: true,
    platforms
  });
});

export default router;
