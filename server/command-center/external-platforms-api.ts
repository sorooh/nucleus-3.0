/**
 * 🌐 External Platforms API
 * 
 * REST API endpoints for managing external Replit platforms
 */

import { Router, Request, Response } from 'express';
import {
  registerAllExternalPlatforms,
  getAllExternalPlatforms,
  getExternalPlatform,
  updateExternalPlatformHealth,
  EXTERNAL_PLATFORMS,
} from './external-platforms-registry';

const router = Router();

/**
 * POST /api/command-center/external-platforms/register-all
 * Register all external platforms at once
 */
router.post('/register-all', async (req: Request, res: Response) => {
  try {
    console.log('[External Platforms API] 🚀 Registering all external platforms...');
    
    const result = await registerAllExternalPlatforms();
    
    return res.status(200).json({
      success: true,
      message: 'External platforms registration complete',
      ...result,
    });
  } catch (error: any) {
    console.error('[External Platforms API] ❌ Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register external platforms',
      details: error.message,
    });
  }
});

/**
 * GET /api/command-center/external-platforms
 * Get all registered external platforms
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const platforms = await getAllExternalPlatforms();
    
    return res.status(200).json({
      success: true,
      count: platforms.length,
      platforms,
    });
  } catch (error: any) {
    console.error('[External Platforms API] ❌ Fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch external platforms',
      details: error.message,
    });
  }
});

/**
 * GET /api/command-center/external-platforms/:nodeId
 * Get specific external platform by ID
 */
router.get('/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const platform = await getExternalPlatform(nodeId);
    
    if (!platform) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found',
      });
    }
    
    return res.status(200).json({
      success: true,
      platform,
    });
  } catch (error: any) {
    console.error('[External Platforms API] ❌ Fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch platform',
      details: error.message,
    });
  }
});

/**
 * POST /api/command-center/external-platforms/:nodeId/health
 * Update platform health status
 */
router.post('/:nodeId/health', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { health, status } = req.body;
    
    if (typeof health !== 'number' || !status) {
      return res.status(400).json({
        success: false,
        error: 'Invalid health or status',
      });
    }
    
    await updateExternalPlatformHealth(nodeId, health, status);
    
    return res.status(200).json({
      success: true,
      message: 'Health updated successfully',
    });
  } catch (error: any) {
    console.error('[External Platforms API] ❌ Health update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update health',
      details: error.message,
    });
  }
});

/**
 * GET /api/command-center/external-platforms/list/metadata
 * Get list of all platform metadata (without credentials)
 */
router.get('/list/metadata', async (req: Request, res: Response) => {
  try {
    const metadata = EXTERNAL_PLATFORMS.map(platform => ({
      nodeId: platform.nodeId,
      nodeName: platform.nodeName,
      arabicName: platform.arabicName,
      nodeType: platform.nodeType,
      priority: platform.priority,
    }));
    
    return res.status(200).json({
      success: true,
      count: metadata.length,
      platforms: metadata,
    });
  } catch (error: any) {
    console.error('[External Platforms API] ❌ Metadata fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch metadata',
      details: error.message,
    });
  }
});

export default router;

console.log('[External Platforms API] ✅ Routes registered');
