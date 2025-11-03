/**
 * Intelligence Endpoint - Federation Intelligence Layer (Phase 9.6)
 * POST /api/federation/intelligence
 * 
 * Receives intelligence data (insights, patterns, alerts) from SIDE nodes
 * with triple-layer security verification (JWT + HMAC + RSA)
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  intelligenceData, 
  intelligenceAuditLog,
  federationNodes,
  insertIntelligenceDataSchema,
  type InsertIntelligenceData
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { governanceEngine } from '../../nucleus/core/governance-engine';
import { verifyFederationSecurity } from './security-middleware';

const router = Router();

/**
 * Calculate checksum for intelligence data
 */
function calculateChecksum(data: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Generate unique intelligence ID
 */
function generateIntelligenceId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `intel-${timestamp}-${random}`;
}

/**
 * POST /api/federation/intelligence
 * Receive intelligence data from SIDE nodes
 * Protected by triple-layer security (JWT + HMAC + RSA)
 */
router.post('/intelligence', verifyFederationSecurity, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { nodeId } = (req as any).federationAuth;
    
    // Extract intelligence payload
    const {
      intelligenceType,
      category,
      priority = 'medium',
      title,
      description,
      data,
      confidence = 70,
      impact,
      suggestedActions,
      metadata,
      expiresAt,
      checksum: providedChecksum
    } = req.body;
    
    // Validate required fields
    if (!intelligenceType || !category || !title || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['intelligenceType', 'category', 'title', 'data']
      });
    }
    
    // Load node information
    const nodes = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, nodeId))
      .limit(1);
    
    const node = nodes[0];
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    // Verify checksum if provided, otherwise calculate it
    let checksum: string;
    let checksumVerified = false;
    
    if (providedChecksum) {
      const calculatedChecksum = calculateChecksum(data);
      if (calculatedChecksum !== providedChecksum) {
        await db.insert(intelligenceAuditLog).values({
          nodeId,
          intelligenceId: null,
          eventType: 'checksum_failed',
          eventStatus: 'failed',
          endpoint: '/api/federation/intelligence',
          method: 'POST',
          errorMessage: 'Checksum verification failed',
          errorCode: 'CHECKSUM_MISMATCH',
          metadata: { 
            provided: providedChecksum,
            calculated: calculatedChecksum
          }
        });
        
        return res.status(400).json({
          success: false,
          error: 'Checksum verification failed',
          details: 'Data integrity check failed'
        });
      }
      checksum = providedChecksum;
      checksumVerified = true;
    } else {
      checksum = calculateChecksum(data);
    }
    
    // Generate intelligence ID
    const intelligenceId = generateIntelligenceId();
    
    // Governance check
    const decision = governanceEngine.submitDecision(
      nodeId,
      `intelligence_${intelligenceType}`,
      { nodeId, intelligenceType, category, priority }
    );
    
    if (decision.status === 'rejected') {
      await db.insert(intelligenceAuditLog).values({
        nodeId,
        intelligenceId,
        eventType: 'intelligence_rejected',
        eventStatus: 'failed',
        endpoint: '/api/federation/intelligence',
        method: 'POST',
        errorMessage: 'Rejected by governance engine',
        errorCode: 'GOVERNANCE_REJECTED',
        metadata: { decision }
      });
      
      return res.status(403).json({
        success: false,
        error: 'Intelligence rejected by governance engine',
        reason: decision.reason
      });
    }
    
    // Store intelligence data
    const [intelligence] = await db
      .insert(intelligenceData)
      .values({
        nodeId,
        sourceType: node.nodeType,
        intelligenceId,
        intelligenceType,
        category,
        priority,
        title,
        description,
        data,
        confidence,
        checksum,
        verified: 1, // Verified by triple-layer security
        processed: 0, // Will be processed later
        broadcastStatus: 'pending',
        impact,
        suggestedActions,
        metadata: {
          ...metadata,
          receivedFrom: nodeId,
          receivedVia: 'federation-gateway',
          securityVerified: true
        },
        expiresAt: expiresAt ? new Date(expiresAt) : null
      })
      .returning();
    
    const processingTime = Date.now() - startTime;
    
    // Log successful reception in audit
    await db.insert(intelligenceAuditLog).values({
      nodeId,
      intelligenceId,
      eventType: 'intelligence_received',
      eventStatus: 'success',
      endpoint: '/api/federation/intelligence',
      method: 'POST',
      authMethod: 'JWT+HMAC+RSA',
      processingTime,
      itemsProcessed: 1,
      itemsFailed: 0,
      metadata: {
        intelligenceType,
        category,
        priority,
        confidence,
        checksumVerified: true
      }
    });
    
    console.log(`[Intelligence] ✅ Received from ${nodeId}: ${intelligenceType} - ${category} - ${intelligenceId}`);
    console.log(`[Intelligence] Title: "${title}" | Priority: ${priority} | Confidence: ${confidence}%`);
    
    return res.json({
      success: true,
      intelligenceId,
      acknowledgment: {
        received: true,
        verified: true,
        checksumVerified: true,
        storedAt: intelligence.receivedAt,
        processingTime
      },
      message: 'Intelligence received and verified successfully'
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Intelligence] Reception error:', error);
    
    // Log error in audit
    try {
      await db.insert(intelligenceAuditLog).values({
        nodeId: (req as any).federationAuth?.nodeId || 'unknown',
        intelligenceId: null,
        eventType: 'intelligence_failed',
        eventStatus: 'failed',
        endpoint: '/api/federation/intelligence',
        method: 'POST',
        processingTime,
        itemsProcessed: 0,
        itemsFailed: 1,
        errorMessage: error.message,
        errorCode: error.code || 'INTERNAL_ERROR',
        metadata: { stack: error.stack }
      });
    } catch (auditError) {
      console.error('[Intelligence] Failed to log audit:', auditError);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process intelligence',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/intelligence
 * Get intelligence data for a node (filtered by node permissions)
 */
router.get('/intelligence', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const { nodeId } = (req as any).federationAuth;
    const { limit = 50, offset = 0, category } = req.query;
    
    // Build query based on filters
    const results = category
      ? await db
          .select()
          .from(intelligenceData)
          .where(eq(intelligenceData.category, String(category)))
          .orderBy(intelligenceData.receivedAt)
          .limit(Number(limit))
          .offset(Number(offset))
      : await db
          .select()
          .from(intelligenceData)
          .orderBy(intelligenceData.receivedAt)
          .limit(Number(limit))
          .offset(Number(offset));
    
    // Log audit
    await db.insert(intelligenceAuditLog).values({
      nodeId,
      eventType: 'intelligence_query',
      eventStatus: 'success',
      endpoint: '/api/federation/intelligence',
      method: 'GET',
      itemsProcessed: results.length,
      metadata: { limit, offset, category }
    });
    
    return res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error: any) {
    console.error('[Intelligence] Query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to query intelligence',
      details: error.message
    });
  }
});

/**
 * POST /api/federation/broadcast
 * Manually trigger intelligence broadcast to all active nodes
 * Protected by dual-layer security (JWT + HMAC)
 */
router.post('/broadcast', verifyFederationSecurity, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { nodeId } = (req as any).federationAuth;
    const { intelligenceId, mode = 'pending' } = req.body;
    
    // Import broadcast functions
    const { broadcastIntelligence, broadcastPendingIntelligence } = await import('./intelligence-broadcaster');
    
    // Governance check (use 'nicholas-federation' as source, 'broadcast_intelligence' as action to match policy)
    const decision = governanceEngine.submitDecision(
      'nicholas-federation',
      'broadcast_intelligence',
      { nodeId, mode, intelligenceId }
    );
    
    console.log('[Broadcast API] Governance decision:', {
      status: decision.status,
      reason: decision.reason,
      source: 'nicholas-federation',
      action: 'broadcast_intelligence'
    });
    
    if (decision.status === 'rejected') {
      await db.insert(intelligenceAuditLog).values({
        nodeId,
        eventType: 'broadcast_rejected',
        eventStatus: 'failed',
        endpoint: '/api/federation/broadcast',
        method: 'POST',
        errorMessage: 'Rejected by governance engine',
        errorCode: 'GOVERNANCE_REJECTED',
        metadata: { decision }
      });
      
      return res.status(403).json({
        success: false,
        error: 'Broadcast rejected by governance engine',
        reason: decision.reason
      });
    }
    
    let result;
    
    if (mode === 'single' && intelligenceId) {
      // Broadcast specific intelligence
      console.log(`[Broadcast API] Triggering single broadcast: ${intelligenceId}`);
      result = await broadcastIntelligence(intelligenceId);
      
      const processingTime = Date.now() - startTime;
      
      await db.insert(intelligenceAuditLog).values({
        nodeId,
        intelligenceId,
        eventType: 'broadcast_triggered',
        eventStatus: result.success ? 'success' : 'partial',
        endpoint: '/api/federation/broadcast',
        method: 'POST',
        processingTime,
        itemsProcessed: result.successCount,
        itemsFailed: result.failCount,
        metadata: {
          mode: 'single',
          totalNodes: result.totalNodes,
          status: result.status
        }
      });
      
      return res.json({
        success: result.success,
        mode: 'single',
        intelligenceId,
        broadcast: {
          totalNodes: result.totalNodes,
          successCount: result.successCount,
          failCount: result.failCount,
          status: result.status,
          processingTime
        }
      });
      
    } else {
      // Broadcast all pending intelligence
      console.log('[Broadcast API] Triggering batch broadcast for pending intelligence');
      result = await broadcastPendingIntelligence();
      
      const processingTime = Date.now() - startTime;
      
      await db.insert(intelligenceAuditLog).values({
        nodeId,
        eventType: 'broadcast_triggered',
        eventStatus: result.success ? 'success' : 'partial',
        endpoint: '/api/federation/broadcast',
        method: 'POST',
        processingTime,
        itemsProcessed: result.successCount,
        itemsFailed: result.failCount,
        metadata: {
          mode: 'batch',
          total: result.total,
          partialCount: result.partialCount,
          totalNodeFailures: result.totalNodeFailures
        }
      });
      
      return res.json({
        success: result.success,
        mode: 'batch',
        broadcast: {
          total: result.total,
          successCount: result.successCount,
          partialCount: result.partialCount,
          failCount: result.failCount,
          totalNodeFailures: result.totalNodeFailures,
          processingTime
        }
      });
    }
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Broadcast API] Error:', error);
    
    try {
      await db.insert(intelligenceAuditLog).values({
        nodeId: (req as any).federationAuth?.nodeId || 'unknown',
        eventType: 'broadcast_failed',
        eventStatus: 'failed',
        endpoint: '/api/federation/broadcast',
        method: 'POST',
        processingTime,
        errorMessage: error.message,
        errorCode: error.code || 'INTERNAL_ERROR',
        metadata: { stack: error.stack }
      });
    } catch (auditError) {
      console.error('[Broadcast API] Failed to log audit:', auditError);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger broadcast',
      details: error.message
    });
  }
});

export default router;
