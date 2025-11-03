/**
 * Nucleus V2 Integration Gateway
 * Compatible with Surooh Mail Hub V2 Integration
 * 
 * Features:
 * - JWT + HMAC dual authentication
 * - Unified Envelope Format
 * - V2 endpoint paths (/api/v2/...)
 * - Backward compatible with V1
 * 
 * Built from absolute zero for Nucleus 2.0
 */

import { Router, Request, Response } from 'express';
import { knowledgeBus } from '../integration/knowledge-bus';
import { verifyHmac, signHmac, verifyJWT } from './jwt-utils';
import type { IntegrationMessage } from '../integration/types';

const router = Router();

/**
 * POST /api/v2/mailhub/export
 * Central Core receives Mail Hub V2 exports
 * 
 * Security: JWT Bearer Token + HMAC-SHA256 Signature
 * Format: Unified Envelope (source, direction, timestamp, dataType, payload, metadata)
 */
router.post('/api/v2/mailhub/export', async (req: Request, res: Response) => {
  try {
    // 1. Verify JWT Bearer Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header' 
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'nucleus-2.0-jwt-secret';
    
    const jwtPayload = verifyJWT(token, jwtSecret);
    if (!jwtPayload) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired JWT token' 
      });
    }

    // Verify platform claim
    if (jwtPayload.platform !== 'MAIL_HUB') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Invalid platform claim in JWT' 
      });
    }

    // 2. Verify HMAC-SHA256 Signature
    const signature = req.headers['x-surooh-signature'] as string;
    if (!signature) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing X-Surooh-Signature header' 
      });
    }

    // Use raw body captured by express.json() verify callback
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Raw body not available for HMAC verification'
      });
    }

    const centralSecret = process.env.CENTRAL_HMAC_SECRET || 'central-hmac-secret-dev';
    
    if (!verifyHmac(centralSecret, rawBody, signature)) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid HMAC signature' 
      });
    }

    // 3. Validate Unified Envelope Format
    const envelope = req.body;
    
    if (!envelope.source || !envelope.direction || !envelope.dataType || !envelope.payload) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Invalid envelope: missing required fields (source, direction, dataType, payload)' 
      });
    }

    // 4. Store in Memory Hub via Knowledge Bus
    const message: IntegrationMessage = {
      platform: 'MAIL_HUB',
      direction: 'INBOUND',
      timestamp: envelope.timestamp || new Date().toISOString(),
      dataType: envelope.dataType,
      payload: envelope.payload,
      metadata: {
        ...envelope.metadata,
        v2Integration: true,
        jwtIssuer: jwtPayload.iss,
        jwtAudience: jwtPayload.aud
      }
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);

    // 5. Generate AI Feedback (enhanced for V2)
    const feedback = {
      source: 'CENTRAL_MEMORY_CORE',
      direction: 'OUTBOUND',
      timestamp: new Date().toISOString(),
      dataType: 'AI_FEEDBACK',
      payload: {
        recommendedReply: 'V2 integration successful. Data processed and stored.',
        confidence: 0.95,
        modelVersion: 'Nucleus_2.0_V2',
        insights: {
          totalInsights: await getTotalInsights(),
          processingTime: Date.now()
        }
      },
      metadata: {
        v2Response: true,
        exchangeId
      }
    };

    // 6. Send feedback to Mail Hub V2 endpoint
    const mailhubBaseUrl = process.env.MAILHUB_BASE_URL;
    let feedbackSent = false;

    if (mailhubBaseUrl) {
      const feedbackBody = JSON.stringify(feedback);
      const mailhubSecret = process.env.MAILHUB_HMAC_SECRET || 'mailhub-hmac-secret-dev';
      const feedbackSig = signHmac(mailhubSecret, feedbackBody);

      try {
        const response = await fetch(`${mailhubBaseUrl}/api/v2/mailhub/core/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Surooh-Signature': feedbackSig
          },
          body: feedbackBody
        });

        if (response.ok) {
          feedbackSent = true;
          console.log('[Nucleus→MailHub V2] Feedback sent successfully');
        } else {
          console.error('[Nucleus→MailHub V2] Feedback failed:', response.status);
        }
      } catch (fetchError) {
        console.error('[Nucleus→MailHub V2] Fetch error:', fetchError);
      }
    }

    // 7. Return V2 success response
    res.json({ 
      success: true,
      version: 'v2',
      exchangeId,
      message: 'Export received and processed via V2 integration',
      feedbackSent,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[V2/MailHub/Export] Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      version: 'v2'
    });
  }
});

/**
 * GET /api/v2/status
 * V2 Integration status and health check
 * 
 * Security: Public endpoint (no auth required)
 * Returns: Integration status, feature flags, environment info
 */
router.get('/api/v2/status', async (req: Request, res: Response) => {
  try {
    const { memoryHub } = await import('../core/memory-hub');
    const { nucleus } = await import('../core/nucleus');
    const { redisCache } = await import('../core/redis-cache');

    const memoryAnalytics = memoryHub.getAnalytics();
    const nucleusStatus = nucleus.getStatus();
    const cacheStats = redisCache.getStats();

    res.json({
      version: 'v2',
      status: 'operational',
      timestamp: new Date().toISOString(),
      
      integration: {
        centralCore: true,
        jwtAuth: true,
        hmacSignatures: true,
        unifiedEnvelope: true
      },

      features: {
        mailHubV2: true,
        aiModels: true,
        scheduledSync: true,
        redisCache: cacheStats.enabled
      },

      environment: {
        mode: process.env.NODE_ENV || 'development',
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasCentralSecret: !!process.env.CENTRAL_HMAC_SECRET,
        hasMailhubUrl: !!process.env.MAILHUB_BASE_URL
      },

      stats: {
        brainActive: nucleusStatus.active,
        totalInsights: memoryAnalytics.totalMemories,
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        uptime: nucleusStatus.uptime || 0
      }
    });

  } catch (error: any) {
    res.status(500).json({
      version: 'v2',
      status: 'error',
      error: error.message
    });
  }
});

/**
 * Helper: Get total insights from Memory Hub
 */
async function getTotalInsights(): Promise<number> {
  try {
    const { memoryHub } = await import('../core/memory-hub');
    const analytics = memoryHub.getAnalytics();
    return analytics.totalMemories || 0;
  } catch {
    return 0;
  }
}

export default router;
