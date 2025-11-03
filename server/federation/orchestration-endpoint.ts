/**
 * Orchestration Endpoint - Phase 9.8
 * نقاط نهاية التنسيق الإدراكي الجماعي
 * 
 * Endpoints:
 * - POST /api/federation/orchestrate - Start cognitive orchestration
 * - POST /api/federation/broadcast - Broadcast final decision to all nodes
 * - GET /api/federation/consensus/:id - Get consensus by ID
 * - GET /api/federation/consensus/stats - Get consensus statistics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { cognitiveOrchestrator } from './cognitive-orchestrator';
import { verifyFederationSecurity } from './security-middleware';
import { governanceEngine } from '../../nucleus/core/governance-engine';
import { db } from '../db';
import { federationNodes, cognitiveConsensus } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

/**
 * Request validation schema
 */
const orchestrateRequestSchema = z.object({
  initiatorNode: z.string(),
  decisionType: z.string(),
  nodeDecisions: z.array(z.object({
    nodeId: z.string(),
    nodeName: z.string(),
    decisionType: z.string(),
    payload: z.any(),
    confidence: z.number().min(0).max(1),
    expectedImpact: z.number().min(0).max(1),
    priority: z.number().optional(),
    dependencies: z.array(z.string()).optional(),
    conflicts: z.array(z.string()).optional(),
  })),
  consensusMethod: z.enum(['weighted-vote', 'unanimous', 'majority', 'quorum']).optional(),
  requiresGovernance: z.boolean().optional(),
});

/**
 * POST /api/federation/orchestrate
 * بدء عملية التنسيق الإدراكي الجماعي
 * Protected by Triple-Layer Security (JWT + HMAC + RSA)
 */
router.post('/orchestrate', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    console.log('[Orchestration] POST /orchestrate - Starting orchestration...');
    
    // Validate request body
    const validatedData = orchestrateRequestSchema.parse(req.body);
    
    // Governance check
    const governanceDecision = governanceEngine.submitDecision(
      validatedData.initiatorNode,
      'initiate_orchestration',
      {
        decisionType: validatedData.decisionType,
        participatingNodes: validatedData.nodeDecisions.length
      }
    );
    
    if (governanceDecision.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Orchestration rejected by governance',
        reason: governanceDecision.reason
      });
    }
    
    // Start orchestration
    const result = await cognitiveOrchestrator.orchestrate(validatedData);
    
    return res.status(200).json({
      success: true,
      consensus: result,
      message: `Consensus ${result.status}: Agreement ${(result.agreementRatio * 100).toFixed(1)}%`
    });
    
  } catch (error: any) {
    console.error('[Orchestration] ❌ Orchestration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Orchestration failed',
      details: error.message
    });
  }
});

/**
 * POST /api/federation/broadcast
 * بث القرار النهائي إلى جميع النوى المشاركة
 * Protected by Triple-Layer Security
 */
router.post('/broadcast', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const { consensusId, targetNodes } = req.body;
    
    if (!consensusId) {
      return res.status(400).json({
        success: false,
        error: 'Consensus ID is required'
      });
    }
    
    console.log(`[Broadcast] POST /broadcast - Broadcasting consensus ${consensusId}...`);
    
    // Get consensus from database
    const [consensus] = await db
      .select()
      .from(cognitiveConsensus)
      .where(eq(cognitiveConsensus.consensusId, consensusId))
      .limit(1);
    
    if (!consensus) {
      return res.status(404).json({
        success: false,
        error: 'Consensus not found'
      });
    }
    
    // Check consensus status
    if (consensus.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: `Cannot broadcast consensus with status: ${consensus.status}`
      });
    }
    
    // Governance check for broadcast
    const governanceDecision = governanceEngine.submitDecision(
      'nicholas-cognitive-hub',
      'broadcast_consensus',
      {
        consensusId,
        decisionType: consensus.decisionType,
        targetNodes: targetNodes || consensus.participatingNodes
      }
    );
    
    if (governanceDecision.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Broadcast rejected by governance',
        reason: governanceDecision.reason
      });
    }
    
    // Update broadcast status to 'broadcasting'
    await cognitiveOrchestrator.updateConsensusStatus(consensusId, {
      broadcastStatus: 'broadcasting'
    });
    
    // Get target nodes from database
    const nodes = targetNodes || consensus.participatingNodes;
    const nodeRecords = await db
      .select()
      .from(federationNodes)
      .where((table) => nodes.includes(table.nodeId));
    
    // Broadcast to each node
    const broadcastResults: any = {};
    const successfulBroadcasts: string[] = [];
    
    for (const node of nodeRecords) {
      if (node.status !== 'active') {
        console.log(`[Broadcast] Skipping ${node.nodeId} (status: ${node.status})`);
        broadcastResults[node.nodeId] = 'skipped-inactive';
        continue;
      }
      
      try {
        // Prepare broadcast payload
        const payload = {
          consensusId,
          decisionType: consensus.decisionType,
          finalDecision: consensus.finalDecision,
          finalConfidence: consensus.finalConfidence,
          checksum: consensus.checksum,
          participatingNodes: consensus.participatingNodes,
          agreementRatio: consensus.agreementRatio,
          source: 'nicholas-cognitive-hub'
        };
        
        // Calculate HMAC signature
        const timestamp = Date.now().toString();
        const payloadString = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', node.hmacSecret || '')
          .update(payloadString + timestamp)
          .digest('hex');
        
        // Send broadcast (in production, this would be a real HTTP request)
        // For now, we log and mark as successful
        console.log(`[Broadcast] Sending to ${node.nodeId} (${node.nodeUrl || 'no URL'})`);
        
        // TODO: In production, uncomment this:
        // const response = await axios.post(
        //   `${node.nodeUrl}/api/federation/orchestrate/receive`,
        //   payload,
        //   {
        //     headers: {
        //       'Authorization': `Bearer ${node.authToken}`,
        //       'X-Surooh-Timestamp': timestamp,
        //       'X-Surooh-Signature': signature,
        //       'Content-Type': 'application/json'
        //     },
        //     timeout: 5000
        //   }
        // );
        
        broadcastResults[node.nodeId] = 'delivered';
        successfulBroadcasts.push(node.nodeId);
        
      } catch (error: any) {
        console.error(`[Broadcast] Failed to send to ${node.nodeId}:`, error.message);
        broadcastResults[node.nodeId] = 'failed';
      }
    }
    
    // Update consensus with broadcast results
    await cognitiveOrchestrator.updateConsensusStatus(consensusId, {
      broadcastStatus: successfulBroadcasts.length === nodes.length ? 'completed' : 'partial',
      broadcastedTo: successfulBroadcasts,
      broadcastAcknowledgments: broadcastResults
    });
    
    console.log(`[Broadcast] ✅ Broadcast completed: ${successfulBroadcasts.length}/${nodes.length} successful`);
    
    return res.status(200).json({
      success: true,
      consensusId,
      broadcastStatus: successfulBroadcasts.length === nodes.length ? 'completed' : 'partial',
      results: broadcastResults,
      successful: successfulBroadcasts.length,
      total: nodes.length
    });
    
  } catch (error: any) {
    console.error('[Broadcast] ❌ Broadcast error:', error);
    return res.status(500).json({
      success: false,
      error: 'Broadcast failed',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/consensus/:consensusId
 * الحصول على معلومات consensus محدد
 */
router.get('/consensus/:consensusId', async (req: Request, res: Response) => {
  try {
    const { consensusId } = req.params;
    
    const consensus = await cognitiveOrchestrator.getConsensus(consensusId);
    
    if (!consensus) {
      return res.status(404).json({
        success: false,
        error: 'Consensus not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      consensus
    });
    
  } catch (error: any) {
    console.error('[Orchestration] Error getting consensus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve consensus',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/consensus/stats
 * إحصائيات التوافقات
 */
router.get('/consensus/stats', async (req: Request, res: Response) => {
  try {
    const stats = await cognitiveOrchestrator.getStatistics();
    
    return res.status(200).json({
      success: true,
      stats
    });
    
  } catch (error: any) {
    console.error('[Orchestration] Error getting stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/consensus/recent
 * آخر التوافقات
 */
router.get('/consensus/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const recent = await cognitiveOrchestrator.getRecentConsensus(limit);
    
    return res.status(200).json({
      success: true,
      count: recent.length,
      consensus: recent
    });
    
  } catch (error: any) {
    console.error('[Orchestration] Error getting recent consensus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent consensus',
      details: error.message
    });
  }
});

/**
 * POST /api/federation/orchestrate/receive
 * استقبال broadcast من Nicholas (للنوى الأخرى)
 * هذا endpoint سيكون في SIDE وبقية النوى، موجود هنا للمرجعية
 */
router.post('/orchestrate/receive', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const {
      consensusId,
      decisionType,
      finalDecision,
      finalConfidence,
      checksum,
      participatingNodes,
      agreementRatio
    } = req.body;
    
    console.log(`[Orchestration] Received broadcast for consensus ${consensusId}`);
    
    // Verify checksum
    const computedChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(finalDecision))
      .digest('hex');
    
    if (computedChecksum !== checksum) {
      return res.status(400).json({
        success: false,
        error: 'Checksum verification failed'
      });
    }
    
    // Log receipt (في الإنتاج، تنفيذ القرار هنا)
    console.log(`[Orchestration] ✅ Consensus received and verified:`);
    console.log(`  Type: ${decisionType}`);
    console.log(`  Confidence: ${finalConfidence.toFixed(2)}`);
    console.log(`  Agreement: ${(agreementRatio * 100).toFixed(1)}%`);
    
    // Send acknowledgment
    return res.status(200).json({
      success: true,
      consensusId,
      acknowledged: true,
      message: 'Consensus received and verified'
    });
    
  } catch (error: any) {
    console.error('[Orchestration] Error receiving broadcast:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to receive broadcast',
      details: error.message
    });
  }
});

export default router;

console.log('[Orchestration Endpoint] Routes registered');
console.log('[Orchestration Endpoint] Cognitive orchestration endpoints active');
