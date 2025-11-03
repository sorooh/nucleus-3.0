/**
 * Official Mail Hub Integration Gateway
 * Dedicated router for Mail Hub ↔ Central Core communication
 * Following Surooh Technical Specification v1.0
 * 
 * Security: This router is public (not behind requireAuth)
 * Authentication via JWT Bearer + HMAC-SHA256 signatures
 */

import { Router, Request, Response } from 'express';
import { knowledgeBus } from '../integration/knowledge-bus';
import { verifyHmac, signHmac, verifyJWT } from './jwt-utils';
import type { IntegrationMessage } from '../integration/types';

const router = Router();

/**
 * POST /central/memory/mailhub/export
 * Central Core receives Mail Hub exports
 * 
 * Requirements:
 * - JWT Bearer token in Authorization header
 * - HMAC-SHA256 signature in X-Surooh-Signature header
 * - JSON Envelope schema: {source, direction, timestamp, dataType, payload, metadata}
 */
router.post('/central/memory/mailhub/export', async (req: Request, res: Response) => {
  try {
    // 1. Verify JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const jwtSecret = process.env.JWT_SECRET || 'nucleus-2.0-jwt-secret';
    
    const jwtPayload = verifyJWT(token, jwtSecret);
    if (!jwtPayload) {
      return res.status(401).json({ error: 'Invalid or expired JWT token' });
    }

    // Verify platform claim matches MAIL_HUB
    if (jwtPayload.platform !== 'MAIL_HUB') {
      return res.status(403).json({ error: 'Invalid platform claim in JWT' });
    }

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
 * POST /mailhub/core/sync
 * Mail Hub receives Central Core feedback
 * 
 * Requirements:
 * - HMAC-SHA256 signature in X-Surooh-Signature header
 * - JSON Envelope schema: {source, direction, timestamp, dataType, payload}
 */
router.post('/mailhub/core/sync', async (req: Request, res: Response) => {
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
      metadata: envelope.metadata || {}
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

export default router;
