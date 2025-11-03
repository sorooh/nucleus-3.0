/**
 * Test API - Protected endpoints for testing UGW Auth & Rate Limiting
 * 
 * These endpoints require UGW authentication and are subject to rate limiting
 */

import { Router, type Request, type Response } from 'express';
import { authenticateGateway } from './auth-middleware';
import type { AuthenticatedRequest } from './auth-middleware';

const router = Router();

/**
 * Test endpoint - Echo request info
 * Requires UGW authentication
 */
router.get('/echo', authenticateGateway, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Hello from UGW!',
    platform: {
      id: req.platform?.id,
      platformId: req.platform?.platformId,
      displayName: req.platform?.displayName,
      authMode: req.platform?.authMode,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Test endpoint - Get platform info
 * Requires UGW authentication
 */
router.get('/me', authenticateGateway, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    platform: req.platform,
  });
});

/**
 * Test endpoint - Slow response (for testing timeouts)
 * Requires UGW authentication
 */
router.get('/slow', authenticateGateway, async (req: AuthenticatedRequest, res: Response) => {
  const delay = parseInt(req.query.delay as string) || 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  res.json({
    success: true,
    message: `Waited ${delay}ms`,
    platform: req.platform?.platformId,
  });
});

/**
 * Test endpoint - POST data
 * Requires UGW authentication
 */
router.post('/data', authenticateGateway, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Data received',
    platform: req.platform?.platformId,
    receivedData: req.body,
  });
});

export default router;
