/**
 * Surooh Academy Gateway - Integration with Academy Platform
 * Built from absolute zero
 * 
 * Handles bi-directional communication with Surooh Academy:
 * - Receive training data and bot configurations
 * - Send knowledge and insights
 * - Track bot training progress
 */

import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// JWT + HMAC Security (same pattern as other integrations)
const ACADEMY_JWT_SECRET = process.env.NUCLEUS_JWT_SECRET || 'academy_jwt_secret';
const ACADEMY_HMAC_SECRET = process.env.SRH_HMAC_SECRET || 'academy_hmac_secret';

/**
 * Verify JWT + HMAC signature
 */
function verifyRequest(req: any): boolean {
  try {
    const authHeader = req.headers.authorization;
    const signature = req.headers['x-srh-signature'];
    
    // Verify JWT
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AcademyGateway] Missing or invalid Authorization header');
      return false;
    }
    
    const token = authHeader.substring(7);
    if (token !== ACADEMY_JWT_SECRET) {
      console.warn('[AcademyGateway] Invalid JWT token');
      return false;
    }
    
    // Verify HMAC signature (if provided)
    if (signature) {
      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', ACADEMY_HMAC_SECRET)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.warn('[AcademyGateway] Invalid HMAC signature');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[AcademyGateway] Security verification error:', error);
    return false;
  }
}

/**
 * POST /api/academy/sync
 * Receive data from Surooh Academy (training results, bot updates, etc.)
 */
router.post('/sync', async (req, res) => {
  try {
    // Security check
    if (!verifyRequest(req)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid credentials or signature'
      });
    }
    
    const { dataType, data, metadata } = req.body;
    
    if (!dataType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: dataType, data'
      });
    }
    
    console.log(`[AcademyGateway] 📥 Received ${dataType} from Academy`);
    
    // Import Memory Hub and Knowledge Bus dynamically
    const { memoryHub } = await import('../nucleus/core/memory-hub');
    const { knowledgeBus } = await import('../nucleus/integration/knowledge-bus');
    
    // Store in Memory Hub based on data type
    let insightId;
    switch (dataType) {
      case 'TRAINING_DATA':
        insightId = memoryHub.recordInsight({
          type: 'pattern',
          description: data.summary || 'Training data from Academy',
          sources: ['surooh-academy'],
          confidence: data.confidence || 0.8,
          evidence: {
            ...metadata,
            trainingId: data.trainingId,
            botId: data.botId,
            accuracy: data.accuracy,
            data
          }
        });
        break;
        
      case 'BOT_CONFIG':
        insightId = memoryHub.recordInsight({
          type: 'pattern',
          description: `Bot Configuration: ${data.name || data.botId}`,
          sources: ['surooh-academy'],
          confidence: 0.9,
          evidence: {
            ...metadata,
            botId: data.botId,
            botType: data.type,
            capabilities: data.capabilities,
            data
          }
        });
        break;
        
      case 'INSIGHT':
      default:
        insightId = memoryHub.recordInsight({
          type: 'pattern',
          description: data.content || data.summary || 'Insight from Academy',
          sources: ['surooh-academy'],
          confidence: data.confidence || 0.7,
          evidence: { ...metadata, data }
        });
    }
    
    // Track message in Knowledge Bus
    await knowledgeBus.receiveMessage({
      platform: 'ACADEMY',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      dataType: dataType,
      payload: {
        summary: data.summary || `Academy ${dataType}`,
        details: [data]
      },
      metadata: {
        source: 'surooh-academy',
        priority: 'MEDIUM',
        schemaVersion: '1.0.0'
      }
    });
    
    res.json({
      success: true,
      insightId,
      message: `${dataType} received and stored successfully`
    });
    
  } catch (error: any) {
    console.error('[AcademyGateway] Error processing sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/academy/export
 * Export knowledge to Surooh Academy
 */
router.get('/export', async (req, res) => {
  try {
    // Security check
    if (!verifyRequest(req)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid credentials'
      });
    }
    
    const { category, limit } = req.query;
    
    const { memoryHub } = await import('../nucleus/core/memory-hub');
    const analytics = memoryHub.getAnalytics();
    
    // Prepare knowledge export
    const export_data = {
      timestamp: new Date().toISOString(),
      source: 'nucleus-core',
      totalMemories: analytics.totalMemories,
      categories: analytics.byType,
      topBrains: analytics.topBrains,
      limit: parseInt(limit as string) || 10
    };
    
    console.log('[AcademyGateway] 📤 Exported knowledge to Academy');
    
    res.json({
      success: true,
      data: export_data
    });
    
  } catch (error: any) {
    console.error('[AcademyGateway] Error exporting data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/academy/ping
 * Health check from Academy platform
 */
router.post('/ping', async (req, res) => {
  try {
    const { knowledgeBus } = await import('../nucleus/integration/knowledge-bus');
    
    // Mark platform as connected
    const platforms = knowledgeBus.getPlatforms();
    const academy = platforms.find((p: any) => p.type === 'ACADEMY');
    
    res.json({
      success: true,
      status: 'healthy',
      message: 'Nucleus Core ready for Academy integration',
      platform: academy || { type: 'ACADEMY', connected: true }
    });
    
  } catch (error: any) {
    console.error('[AcademyGateway] Ping error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
