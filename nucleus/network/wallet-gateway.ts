/**
 * Official Surooh Wallet Integration Gateway
 * Dedicated router for Wallet Core ↔ Central Core communication
 * Following Surooh Digital Wallet Integration Specification v1.0
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
 * POST /central/memory/wallet/export
 * Central Core receives Wallet Core exports (transactions, points, tiers, rewards)
 * 
 * Requirements:
 * - JWT Bearer token in Authorization header
 * - HMAC-SHA256 signature in X-Surooh-Signature header
 * - JSON Envelope schema: {source, direction, timestamp, dataType, payload, metadata}
 * 
 * Expected dataTypes:
 * - TRANSACTION_BATCH: Batch of financial transactions
 * - POINTS_UPDATE: Loyalty points changes
 * - TIER_CHANGE: User tier upgrades/downgrades
 * - REWARD_CLAIM: Reward redemptions
 */
router.post('/central/memory/wallet/export', async (req: Request, res: Response) => {
  try {
    // 1. Verify JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const jwtSecret = process.env.JWT_SECRET || 'nucleus-2.0-jwt-secret';
    
    const jwtPayload = verifyJWT(token, jwtSecret);
    if (!jwtPayload) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired JWT token' 
      });
    }

    // Verify platform claim matches WALLET
    if (jwtPayload.platform !== 'WALLET') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Invalid platform claim in JWT. Expected platform=WALLET' 
      });
    }

    // 2. Verify HMAC signature using raw body
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

    // Validate source matches expected value
    if (envelope.source !== 'WALLET_CORE') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid source. Expected WALLET_CORE'
      });
    }

    // 4. Transform to Knowledge Bus standard format
    const payload = transformWalletPayload(envelope.dataType, envelope.payload);
    
    const message: IntegrationMessage = {
      platform: 'WALLET',
      direction: 'INBOUND',
      timestamp: envelope.timestamp || new Date().toISOString(),
      dataType: mapToKnowledgeBusDataType(envelope.dataType),
      payload,
      metadata: {
        source: envelope.source || 'WALLET_CORE',
        priority: determinePriority(envelope.dataType),
        schemaVersion: envelope.metadata?.schemaVersion || 'v1.0.0',
        authToken: jwtPayload.platform,
        ...envelope.metadata
      }
    };
    
    const exchangeId = await knowledgeBus.receiveMessage(message);

    // 5. Generate AI insights based on wallet data
    const insights = generateWalletInsights(envelope.dataType, envelope.payload);

    // 6. Send insights back to Wallet Core (if WALLET_BASE_URL is configured)
    const walletBaseUrl = process.env.WALLET_BASE_URL;
    if (walletBaseUrl && insights) {
      const feedbackEnvelope = {
        source: 'CENTRAL_MEMORY_CORE',
        direction: 'OUTBOUND', // Correct: Central → Wallet is OUTBOUND
        timestamp: new Date().toISOString(),
        dataType: 'INSIGHT_REPORT',
        payload: insights,
        metadata: {
          source: 'CENTRAL_MEMORY_CORE',
          priority: 'MEDIUM' as const,
          schemaVersion: 'v1.0.0'
        }
      };

      const feedbackBody = JSON.stringify(feedbackEnvelope);
      const walletSecret = process.env.WALLET_HMAC_SECRET || 'wallet-hmac-secret-dev';
      const feedbackSig = signHmac(walletSecret, feedbackBody);

      try {
        await fetch(`${walletBaseUrl}/wallet/core/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Surooh-Signature': feedbackSig
          },
          body: feedbackBody
        });
      } catch (fetchError) {
        console.error('[Central→Wallet] Failed to send insights:', fetchError);
      }
    }

    res.json({ 
      success: true, 
      exchangeId,
      message: 'Wallet export received and processed',
      dataType: envelope.dataType,
      insightsSent: !!(walletBaseUrl && insights)
    });
  } catch (error: any) {
    console.error('[Central/Wallet/Export] Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
});

/**
 * POST /wallet/core/sync
 * Wallet Core receives Central Core insights and recommendations
 * 
 * Requirements:
 * - HMAC-SHA256 signature in X-Surooh-Signature header
 * - JSON Envelope schema: {source, direction, timestamp, dataType, payload}
 * 
 * This endpoint is typically called by external Wallet Core system
 * For testing/simulation, it's exposed here
 */
router.post('/wallet/core/sync', async (req: Request, res: Response) => {
  try {
    // 1. Verify HMAC signature
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

    const walletSecret = process.env.WALLET_HMAC_SECRET || 'wallet-hmac-secret-dev';
    
    if (!verifyHmac(walletSecret, rawBody, signature)) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid HMAC signature' 
      });
    }

    // 2. Validate Unified Envelope Format
    const envelope = req.body;
    
    if (!envelope.source || !envelope.direction || !envelope.dataType || !envelope.payload) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Invalid envelope: missing required fields (source, direction, dataType, payload)' 
      });
    }

    // 3. Transform and store outbound message (Central → Wallet)
    const payload = transformWalletPayload(envelope.dataType, envelope.payload);
    
    const message: IntegrationMessage = {
      platform: 'WALLET',
      direction: 'OUTBOUND', // From central to Wallet
      timestamp: envelope.timestamp || new Date().toISOString(),
      dataType: mapToKnowledgeBusDataType(envelope.dataType),
      payload,
      metadata: {
        source: envelope.source || 'CENTRAL_MEMORY_CORE',
        priority: 'MEDIUM',
        schemaVersion: envelope.metadata?.schemaVersion || 'v1.0.0',
        ...envelope.metadata
      }
    };
    
    const exchangeId = await knowledgeBus.sendMessage('WALLET', message);

    res.json({ 
      success: true, 
      exchangeId,
      message: 'Insights received and applied',
      dataType: envelope.dataType
    });
  } catch (error: any) {
    console.error('[Wallet/Sync] Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
});

/**
 * Transform Wallet envelope payload to Knowledge Bus standard format
 * Ensures all messages have required summary and details fields
 */
function transformWalletPayload(dataType: string, rawPayload: any): any {
  let summary = '';
  let details: any[] = [];

  switch (dataType) {
    case 'TRANSACTION_BATCH':
      const transactions = rawPayload.transactions || [];
      const totalAmount = transactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
      summary = `Wallet Transactions: ${transactions.length} transactions, total ${totalAmount.toFixed(2)}`;
      details = transactions;
      break;

    case 'POINTS_UPDATE':
      summary = `Loyalty Points Update: ${rawPayload.userId || 'Unknown user'}`;
      details = [rawPayload];
      break;

    case 'TIER_CHANGE':
      summary = `User Tier Change: ${rawPayload.fromTier} → ${rawPayload.toTier}`;
      details = [rawPayload];
      break;

    case 'REWARD_CLAIM':
      summary = `Reward Claimed: ${rawPayload.rewardName || 'Unknown reward'}`;
      details = [rawPayload];
      break;

    case 'INSIGHT_REPORT':
      summary = `AI Insight: ${rawPayload.recommendation?.substring(0, 80) || 'Analysis complete'}`;
      details = [rawPayload];
      break;

    default:
      summary = `Wallet Event: ${dataType}`;
      details = [rawPayload];
  }

  return {
    summary,
    details,
    ...rawPayload
  };
}

/**
 * Map Wallet data types to Knowledge Bus data types
 */
function mapToKnowledgeBusDataType(walletDataType: string): any {
  const mapping: Record<string, string> = {
    'TRANSACTION_BATCH': 'TRANSACTION',
    'POINTS_UPDATE': 'TRANSACTION',
    'TIER_CHANGE': 'ALERT',
    'REWARD_CLAIM': 'TRANSACTION',
    'INSIGHT_REPORT': 'INSIGHT'
  };
  return mapping[walletDataType] || 'REPORT';
}

/**
 * Determine message priority based on data type
 */
function determinePriority(dataType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (dataType) {
    case 'TIER_CHANGE':
      return 'HIGH';
    case 'TRANSACTION_BATCH':
    case 'REWARD_CLAIM':
      return 'MEDIUM';
    case 'POINTS_UPDATE':
    case 'INSIGHT_REPORT':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

/**
 * Generate AI insights based on wallet data
 * This is a simplified version - in production, this would use ML models
 */
function generateWalletInsights(dataType: string, payload: any): any | null {
  try {
    switch (dataType) {
      case 'TRANSACTION_BATCH':
        const transactions = payload.transactions || [];
        const totalAmount = transactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
        const avgAmount = transactions.length > 0 ? totalAmount / transactions.length : 0;
        
        // Generate recommendation based on transaction patterns
        let recommendation = '';
        if (avgAmount > 50) {
          recommendation = 'High-value transactions detected. Consider offering premium tier upgrade incentives.';
        } else if (transactions.length > 10) {
          recommendation = 'Frequent transactions detected. Consider increasing loyalty points multiplier.';
        } else {
          recommendation = 'Standard transaction pattern. Maintain current reward structure.';
        }

        return {
          recommendation,
          predictedGrowth: Math.random() * 0.2, // 0-20% growth prediction
          confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
          modelVersion: 'WalletAI_2025_10',
          metrics: {
            totalAmount,
            avgAmount,
            transactionCount: transactions.length
          }
        };

      case 'POINTS_UPDATE':
      case 'TIER_CHANGE':
      case 'REWARD_CLAIM':
        return {
          recommendation: `Analyze ${dataType} patterns to optimize loyalty program engagement.`,
          confidence: 0.75,
          modelVersion: 'WalletAI_2025_10'
        };

      default:
        return null;
    }
  } catch (error) {
    console.error('[Wallet Insights] Error generating insights:', error);
    return null;
  }
}

export default router;
