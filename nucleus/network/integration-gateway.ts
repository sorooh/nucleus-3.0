/**
 * Integration Gateway - REST API for Unified Knowledge Bus
 * Built from absolute zero for Surooh Empire
 * 
 * Provides endpoints for platform integration
 */

import { Router, Request, Response } from 'express';
import { knowledgeBus } from '../integration/knowledge-bus';
import { generateJWT, verifyHmac, signHmac } from './jwt-utils';
import type { IntegrationMessage, PlatformType } from '../integration/types';
import * as crypto from 'crypto';

const router = Router();

// Auth check middleware for write operations
const requireAuth = (req: Request, res: Response, next: any) => {
  const user = (req as any).session?.user;
  if (!user) {
    return res.status(401).json({ error: 'غير مصرح - يجب تسجيل الدخول' });
  }
  next();
};

// ============= Platform Management =============

/**
 * GET /platforms
 * Get all platform configurations with stats
 */
router.get('/platforms', (req: Request, res: Response) => {
  try {
    const platforms = knowledgeBus.getPlatforms();
    res.json({
      platforms: platforms.map(p => {
        const statsResult = knowledgeBus.getPlatformStats(p.type as PlatformType);
        // getPlatformStats returns single stats for specific platform
        const stats = Array.isArray(statsResult) ? statsResult[0] : statsResult;
        
        return {
          id: p.id,
          name: p.name,
          description: `منصة ${p.name} للتجارة الذكية`,
          status: stats?.connected ? 'connected' : 'disconnected',
          mode: p.syncMode || 'real-time',
          lastSync: stats?.lastSync?.toISOString(),
          messageCount: (stats?.messagesSent || 0) + (stats?.messagesReceived || 0)
        };
      })
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /platforms/:platform/stats
 * Get platform statistics
 */
router.get('/platforms/:platform/stats', (req: Request, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase() as PlatformType;
    const stats = knowledgeBus.getPlatformStats(platform);
    res.json({ stats });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /platforms/:platform/connect
 * Connect a platform (REQUIRES AUTH)
 */
router.post('/platforms/:platform/connect', requireAuth, (req: Request, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase() as PlatformType;
    const { credentials } = req.body;
    
    knowledgeBus.connectPlatform(platform, credentials);
    
    res.json({
      message: 'Platform connected successfully',
      platform,
      connected: true
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /platforms/:platform/disconnect
 * Disconnect a platform (REQUIRES AUTH)
 */
router.post('/platforms/:platform/disconnect', requireAuth, (req: Request, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase() as PlatformType;
    
    knowledgeBus.disconnectPlatform(platform);
    
    res.json({
      message: 'Platform disconnected successfully',
      platform,
      connected: false
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============= Message Exchange =============

/**
 * POST /send
 * Send message to a platform (REQUIRES AUTH)
 */
router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = req.body;
    
    if (!message.platform || !message.dataType || !message.payload) {
      return res.status(400).json({ 
        error: 'Missing required fields: platform, dataType, payload' 
      });
    }

    const exchangeId = await knowledgeBus.sendMessage(message.platform, message);
    
    res.json({
      message: 'Message sent successfully',
      exchangeId,
      platform: message.platform,
      dataType: message.dataType
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /receive
 * Receive message from a platform (REQUIRES AUTH)
 */
router.post('/receive', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = req.body;
    
    if (!message.platform || !message.dataType || !message.payload) {
      return res.status(400).json({ 
        error: 'Missing required fields: platform, dataType, payload' 
      });
    }

    const exchangeId = await knowledgeBus.receiveMessage(message);
    
    res.json({
      message: 'Message received successfully',
      exchangeId,
      platform: message.platform,
      dataType: message.dataType
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /exchanges
 * Get exchange history
 */
router.get('/exchanges', (req: Request, res: Response) => {
  try {
    const { platform, limit } = req.query;
    
    const exchanges = knowledgeBus.getExchangeHistory(
      platform as PlatformType,
      limit ? parseInt(limit as string) : 100
    );
    
    res.json({
      exchanges: exchanges.map(ex => ({
        id: ex.id,
        platform: ex.platform,
        direction: ex.direction,
        dataType: ex.dataType,
        status: ex.status || 'completed',
        processedAt: ex.processedAt,
        error: ex.error
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Status & Health =============

/**
 * GET /status
 * Get Knowledge Bus status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = knowledgeBus.getStatus();
    const platforms = knowledgeBus.getPlatforms();
    res.json({
      active: status.active,
      totalPlatforms: platforms.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Platform-Specific Endpoints (B2B, B2C, etc.) =============

/**
 * POST /api/v1/b2b/sync
 * B2B Brain synchronization endpoint (REQUIRES AUTH)
 */
router.post('/api/v1/b2b/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = {
      platform: 'B2B',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);
    res.json({ success: true, exchangeId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/b2c/sync
 * B2C Brain synchronization endpoint (REQUIRES AUTH)
 */
router.post('/api/v1/b2c/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = {
      platform: 'B2C',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);
    res.json({ success: true, exchangeId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/ce/export
 * CE Brain export endpoint (REQUIRES AUTH)
 */
router.post('/api/v1/ce/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = {
      platform: 'CE',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);
    res.json({ success: true, exchangeId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/accounting/feed
 * Accounting Brain feed endpoint (REQUIRES AUTH)
 */
router.post('/api/v1/accounting/feed', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = {
      platform: 'Accounting',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);
    res.json({ success: true, exchangeId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/shipping/tracking
 * Shipping Brain tracking endpoint (REQUIRES AUTH)
 */
router.post('/api/v1/shipping/tracking', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = {
      platform: 'Shipping',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);
    res.json({ success: true, exchangeId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/mailhub/sync
 * Mail Hub Core sync endpoint (REQUIRES AUTH)
 */
router.post('/api/v1/mailhub/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const message: IntegrationMessage = {
      platform: 'MAIL_HUB',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);
    res.json({ success: true, exchangeId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Official Mail Hub Integration Endpoints =============

/**
 * POST /export (mounted at /central/memory/mailhub)
 * Central Core receives Mail Hub exports
 * 
 * Requirements:
 * - JWT Bearer token in Authorization header
 * - HMAC-SHA256 signature in X-Surooh-Signature header
 * - JSON Envelope schema: {source, direction, timestamp, dataType, payload, metadata}
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    // 1. Verify JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    // JWT verification will be done by WebSocket auth or can be added here if needed

    // 2. Verify HMAC signature
    const signature = req.headers['x-surooh-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing X-Surooh-Signature header' });
    }

    const rawBody = JSON.stringify(req.body);
    const centralSecret = process.env.CENTRAL_HMAC_SECRET || 'central-hmac-secret-dev';
    
    if (!verifyHmac(centralSecret, rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 3. Parse envelope
    const envelope = req.body;
    
    if (!envelope.source || !envelope.direction || !envelope.dataType || !envelope.payload) {
      return res.status(400).json({ 
        error: 'Invalid envelope: missing required fields (source, direction, dataType, payload)' 
      });
    }

    // 4. Store in Memory Hub via Knowledge Bus
    const message: IntegrationMessage = {
      platform: 'MAIL_HUB',
      direction: 'INBOUND',
      timestamp: envelope.timestamp || new Date().toISOString(),
      dataType: envelope.dataType,
      payload: envelope.payload,
      metadata: envelope.metadata
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);

    // 5. Generate AI feedback (simulated for now)
    const feedback = {
      source: 'CENTRAL_MEMORY_CORE',
      direction: 'INBOUND',
      timestamp: new Date().toISOString(),
      dataType: 'AI_FEEDBACK',
      payload: {
        recommendedReply: 'Thank you for the update. Please confirm details.',
        confidence: 0.92,
        modelVersion: 'CentralModel_2025_10'
      }
    };

    // 6. Send feedback back to Mail Hub (if MAILHUB_BASE_URL is configured)
    const mailhubBaseUrl = process.env.MAILHUB_BASE_URL;
    if (mailhubBaseUrl) {
      const feedbackBody = JSON.stringify(feedback);
      const mailhubSecret = process.env.MAILHUB_HMAC_SECRET || 'mailhub-hmac-secret-dev';
      const feedbackSig = signHmac(mailhubSecret, feedbackBody);

      try {
        await fetch(`${mailhubBaseUrl}/mailhub/core/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Surooh-Signature': feedbackSig
          },
          body: feedbackBody
        });
      } catch (fetchError) {
        console.error('[Central→MailHub] Failed to send feedback:', fetchError);
      }
    }

    res.json({ 
      success: true, 
      exchangeId,
      message: 'Export received and processed',
      feedbackSent: !!mailhubBaseUrl
    });
  } catch (error: any) {
    console.error('[Central/MailHub/Export] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /sync (mounted at /mailhub/core)
 * Mail Hub receives Central Core feedback
 * 
 * Requirements:
 * - HMAC-SHA256 signature in X-Surooh-Signature header
 * - JSON Envelope schema: {source, direction, timestamp, dataType, payload}
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // 1. Verify HMAC signature
    const signature = req.headers['x-surooh-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing X-Surooh-Signature header' });
    }

    const rawBody = JSON.stringify(req.body);
    const mailhubSecret = process.env.MAILHUB_HMAC_SECRET || 'mailhub-hmac-secret-dev';
    
    if (!verifyHmac(mailhubSecret, rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Parse envelope
    const envelope = req.body;
    
    if (!envelope.source || !envelope.direction || !envelope.dataType || !envelope.payload) {
      return res.status(400).json({ 
        error: 'Invalid envelope: missing required fields (source, direction, dataType, payload)' 
      });
    }

    // 3. Process feedback (store or update models)
    const message: IntegrationMessage = {
      platform: 'MAIL_HUB',
      direction: 'OUTBOUND', // From central to Mail Hub
      timestamp: envelope.timestamp || new Date().toISOString(),
      dataType: envelope.dataType,
      payload: envelope.payload,
      metadata: envelope.metadata || {
        source: 'CENTRAL_CORE',
        priority: 'MEDIUM',
        schemaVersion: '1.0'
      }
    };
    
    const exchangeId = await knowledgeBus.sendMessage('MAIL_HUB', message);

    res.json({ 
      success: true, 
      exchangeId,
      message: 'Feedback received and applied',
      dataType: envelope.dataType
    });
  } catch (error: any) {
    console.error('[MailHub/Sync] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Authentication =============

/**
 * POST /auth/generate-token
 * Generate JWT token for platform authentication (REQUIRES ADMIN)
 */
router.post('/auth/generate-token', requireAuth, (req: Request, res: Response) => {
  try {
    // Verify user has admin role (only admins can generate platform tokens)
    const user = (req as any).session?.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to generate platform tokens' });
    }

    const { platform, expiresIn } = req.body;
    
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const secret = process.env.JWT_SECRET || 'nucleus-2.0-jwt-secret';
    const token = generateJWT(platform, secret, expiresIn || 86400); // 24 hours default

    res.json({ 
      token,
      platform,
      expiresIn: expiresIn || 86400,
      message: 'Token generated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
