import { Router } from 'express';
import { integrationService } from '../services/integration-service';
import { insertIntegrationsRegistrySchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateLinkStatusSchema = z.object({
  status: z.enum(['active', 'broken', 'pending']),
});

const updateIntegrationSchema = z.object({
  status: z.enum(['active', 'inactive', 'deprecated', 'failed']).optional(),
  healthStatus: z.enum(['healthy', 'degraded', 'down', 'unknown']).optional(),
  hasApiKey: z.boolean().optional(),
});

/**
 * GET /api/platforms
 * جلب جميع المنصّات مع روابطها والتكاملات
 */
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await integrationService.getAllPlatforms();

    res.json({
      success: true,
      platforms,
      total: platforms.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching platforms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platforms',
      message: error.message,
    });
  }
});

/**
 * GET /api/platforms/:id
 * جلب منصة واحدة مع تفاصيلها الكاملة
 */
router.get('/platforms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const platform = await integrationService.getPlatformById(id);

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found',
      });
    }

    res.json({
      success: true,
      platform,
    });
  } catch (error: any) {
    console.error('❌ Error fetching platform:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/platforms/:id/link/:linkId
 * تحديث حالة رابط معين
 */
router.patch('/platforms/:id/link/:linkId', async (req, res) => {
  try {
    const { id, linkId } = req.params;
    
    // Validate request body
    const validation = updateLinkStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }
    
    const { status } = validation.data;

    // Update link status via service
    const updated = await integrationService.updateLinkStatus(id, linkId, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Link not found',
      });
    }

    res.json({
      success: true,
      link: updated,
      message: `Link status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('❌ Error updating link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update link status',
      message: error.message,
    });
  }
});

/**
 * GET /api/integrations
 * قراءة سجل التكاملات
 */
router.get('/integrations', async (req, res) => {
  try {
    const integrations = await integrationService.getAllIntegrations();

    res.json({
      success: true,
      integrations,
      total: integrations.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching integrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrations',
      message: error.message,
    });
  }
});

/**
 * POST /api/integrations/register
 * تسجيل تكامل جديد
 */
router.post('/integrations/register', async (req, res) => {
  try {
    // Validate request body
    const validation = insertIntegrationsRegistrySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }
    
    // Register integration via service
    const result = await integrationService.registerIntegration(validation.data);

    if (result.exists) {
      return res.status(409).json({
        success: false,
        error: 'Integration already registered',
        integration: result.integration,
      });
    }

    res.status(201).json({
      success: true,
      integration: result.integration,
      message: `Integration '${validation.data.name}' registered successfully`,
    });
  } catch (error: any) {
    console.error('❌ Error registering integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register integration',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/integrations/:id
 * تحديث حالة تكامل
 */
router.patch('/integrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate request body
    const validation = updateIntegrationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }
    
    // Update integration via service
    const updated = await integrationService.updateIntegration(id, validation.data);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
      });
    }

    res.json({
      success: true,
      integration: updated,
      message: 'Integration updated successfully',
    });
  } catch (error: any) {
    console.error('❌ Error updating integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update integration',
      message: error.message,
    });
  }
});

export default router;
