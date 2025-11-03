/**
 * Federation Gateway - Nicholas 3.2 Node Registration System
 * Built from absolute zero for Surooh SIDE Federation
 * 
 * Endpoints:
 * - POST /api/federation/register - تسجيل عقدة جديدة
 * - GET /api/federation/nodes - عرض العقد المسجلة
 * - POST /api/federation/heartbeat - تحديث حالة العقدة
 * - POST /api/federation/activate - تفعيل عقدة
 * - DELETE /api/federation/nodes/:nodeId - حذف عقدة
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import { 
  federationNodes, 
  federationSyncLogs,
  federationSyncData,
  federationAuthTokens,
  insertFederationNodeSchema,
  insertFederationSyncDataSchema,
  type FederationNode,
  type InsertFederationNode,
  type InsertFederationSyncData
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { governanceEngine } from '../nucleus/core/governance-engine';
import { secretVault } from './federation/secret-vault';
import { verifyFederationSecurity } from './federation/security-middleware';
import intelligenceRouter from './federation/intelligence-endpoint';
import decisionRouter from './federation/decision-endpoint';
import orchestrationRouter from './federation/orchestration-endpoint';
import governanceRouter from './federation/governance/governance-endpoint';
import aiRouter from './federation/ai-endpoint';

const router = Router();

// ============= UTILITIES =============

/**
 * Generate secure token for federation node
 */
function generateNodeToken(nodeId: string, nodeType: string): string {
  const secret = process.env.JWT_SECRET || 'nicholas-3.2-federation-secret';
  
  return jwt.sign(
    {
      nodeId,
      nodeType,
      issuer: 'nicholas-3.2',
      audience: 'surooh-federation',
      purpose: 'node-authentication'
    },
    secret,
    { expiresIn: '365d' } // صالح لسنة
  );
}

/**
 * Generate HMAC secret for node
 */
function generateHMACSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate Surooh DNA signature
 */
function generateCodeSignature(nodeId: string, nodeType: string): string {
  const timestamp = Date.now();
  const data = `SUROOH-DNA-${nodeId}-${nodeType}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify HMAC signature from incoming requests
 */
function verifyHMACSignature(
  hmacSecret: string,
  payload: any,
  timestamp: string,
  signature: string
): boolean {
  try {
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - requestTime > fiveMinutes) {
      console.warn(`[Federation] Request too old: ${now - requestTime}ms`);
      return false;
    }
    
    const data = JSON.stringify(payload) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', hmacSecret)
      .update(data)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Federation] HMAC verification error:', error);
    return false;
  }
}

// ============= MIDDLEWARE =============

/**
 * Federation authentication middleware
 */
async function federationAuth(req: Request, res: Response, next: Function): Promise<any> {
  const nodeId = req.header('X-Node-ID');
  const authToken = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!nodeId || !authToken) {
    return res.status(401).json({
      success: false,
      error: 'Missing authentication headers'
    });
  }
  
  try {
    // Verify JWT token
    const secret = process.env.JWT_SECRET || 'nicholas-3.2-federation-secret';
    const decoded = jwt.verify(authToken, secret) as any;
    
    if (decoded.nodeId !== nodeId) {
      return res.status(401).json({
        success: false,
        error: 'Token nodeId mismatch'
      });
    }
    
    // Get node from database
    const [node] = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, nodeId))
      .limit(1);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    if (node.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Node is suspended'
      });
    }
    
    // Attach node to request
    (req as any).federationNode = node;
    next();
  } catch (error) {
    console.error('[Federation] Auth error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
}

// ============= ENDPOINTS =============

/**
 * POST /api/federation/register
 * تسجيل عقدة فيدرالية جديدة
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const traceId = crypto.randomBytes(8).toString('hex');
    console.log(`[Federation] Registration request - TraceID: ${traceId}`);
    
    // Parse and validate request
    const requestData = insertFederationNodeSchema.parse(req.body);
    
    // Governance check (allow registration for Surooh nodes)
    const decision = governanceEngine.submitDecision(
      'nicholas-federation',
      'register_node',
      {
        nodeId: requestData.nodeId,
        nodeType: requestData.nodeType,
        organizationId: requestData.organizationId,
        approved: requestData.organizationId === 'surooh-holding' // Auto-approve Surooh nodes
      }
    );
    
    // Auto-approve Surooh nodes, require review for others
    if (decision.status === 'rejected' || (decision.status === 'pending' && requestData.organizationId !== 'surooh-holding')) {
      return res.status(403).json({
        success: false,
        error: 'Registration requires approval',
        reason: decision.reason,
        traceId,
        note: 'Contact system administrator for authorization'
      });
    }
    
    // Check if node already exists
    const [existingNode] = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, requestData.nodeId))
      .limit(1);
    
    if (existingNode) {
      return res.status(409).json({
        success: false,
        error: 'Node already registered',
        traceId
      });
    }
    
    // Generate credentials
    const authToken = generateNodeToken(requestData.nodeId, requestData.nodeType);
    const hmacSecret = generateHMACSecret();
    const codeSignature = generateCodeSignature(requestData.nodeId, requestData.nodeType);
    
    // Generate Key ID (kid) for Secret Vault
    const keyId = `kid-${requestData.nodeId}-${Date.now()}`;
    
    // Store HMAC secret in Secret Vault
    await secretVault.storeSecret({
      keyId,
      nodeId: requestData.nodeId,
      organizationId: requestData.organizationId || 'surooh-holding',
      secretType: 'hmac',
      secretValue: hmacSecret,
      algorithm: 'HMAC-SHA256',
      codeHash: codeSignature,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    });
    
    // Create node
    const [newNode] = await db
      .insert(federationNodes)
      .values({
        ...requestData,
        authToken,
        hmacSecret,
        codeSignature,
        status: 'pending',
        health: 100,
      })
      .returning();
    
    console.log(`[Federation] Node registered: ${newNode.nodeId} - KeyID: ${keyId} - TraceID: ${traceId}`);
    
    // Return credentials (only once!)
    return res.status(201).json({
      success: true,
      message: 'Node registered successfully',
      node: {
        id: newNode.id,
        nodeId: newNode.nodeId,
        nodeName: newNode.nodeName,
        nodeType: newNode.nodeType,
        status: newNode.status,
        registeredAt: newNode.registeredAt
      },
      credentials: {
        keyId, // Key ID للاستخدام في X-Surooh-KeyId header
        authToken,
        hmacSecret,
        codeSignature,
        note: 'CRITICAL: Store these securely. They will not be shown again.'
      },
      traceId
    });
  } catch (error: any) {
    console.error('[Federation] Registration error:', error);
    return res.status(400).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/nodes
 * عرض جميع العقد المسجلة
 */
router.get('/nodes', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const nodeType = req.query.nodeType as string | undefined;
    
    let query = db.select().from(federationNodes);
    
    const conditions: any[] = [];
    if (status) {
      conditions.push(eq(federationNodes.status, status));
    }
    if (nodeType) {
      conditions.push(eq(federationNodes.nodeType, nodeType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const nodes = await query;
    
    // Remove sensitive data
    const sanitizedNodes = nodes.map(node => ({
      id: node.id,
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      arabicName: node.arabicName,
      nodeType: node.nodeType,
      organizationId: node.organizationId,
      nodeUrl: node.nodeUrl,
      wsUrl: node.wsUrl,
      status: node.status,
      health: node.health,
      lastHeartbeat: node.lastHeartbeat,
      lastSync: node.lastSync,
      sideVersion: node.sideVersion,
      syncProtocol: node.syncProtocol,
      registeredAt: node.registeredAt,
      activatedAt: node.activatedAt
    }));
    
    return res.json({
      success: true,
      nodes: sanitizedNodes,
      total: sanitizedNodes.length
    });
  } catch (error: any) {
    console.error('[Federation] Get nodes error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve nodes'
    });
  }
});

/**
 * POST /api/federation/heartbeat
 * تحديث حالة العقدة (heartbeat)
 * Protected by HMAC + Code Signature verification
 */
router.post('/heartbeat', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const node = (req as any).federationNode as FederationNode;
    const { health, sideVersion, capabilities } = req.body;
    
    // Update node
    const [updatedNode] = await db
      .update(federationNodes)
      .set({
        health: health || node.health,
        sideVersion: sideVersion || node.sideVersion,
        capabilities: capabilities || node.capabilities,
        lastHeartbeat: new Date(),
        status: health > 0 ? 'active' : 'offline'
      })
      .where(eq(federationNodes.nodeId, node.nodeId))
      .returning();
    
    return res.json({
      success: true,
      message: 'Heartbeat received',
      node: {
        nodeId: updatedNode.nodeId,
        status: updatedNode.status,
        health: updatedNode.health,
        lastHeartbeat: updatedNode.lastHeartbeat
      }
    });
  } catch (error: any) {
    console.error('[Federation] Heartbeat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Heartbeat failed'
    });
  }
});

/**
 * POST /api/federation/activate
 * تفعيل عقدة بعد التسجيل
 * Protected by HMAC + Code Signature verification
 */
router.post('/activate', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const node = (req as any).federationNode as FederationNode;
    
    if (node.status === 'active') {
      return res.json({
        success: true,
        message: 'Node already active'
      });
    }
    
    // Governance check
    const decision = governanceEngine.submitDecision(
      'nicholas-federation',
      'activate_node',
      { nodeId: node.nodeId }
    );
    
    if (decision.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Activation rejected by governance engine',
        reason: decision.reason
      });
    }
    
    // Activate node
    const [activatedNode] = await db
      .update(federationNodes)
      .set({
        status: 'active',
        activatedAt: new Date()
      })
      .where(eq(federationNodes.nodeId, node.nodeId))
      .returning();
    
    console.log(`[Federation] Node activated: ${activatedNode.nodeId}`);
    
    return res.json({
      success: true,
      message: 'Node activated successfully',
      node: {
        nodeId: activatedNode.nodeId,
        status: activatedNode.status,
        activatedAt: activatedNode.activatedAt
      }
    });
  } catch (error: any) {
    console.error('[Federation] Activation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Activation failed'
    });
  }
});

/**
 * GET /api/federation/sync/logs
 * عرض سجلات المزامنة
 */
router.get('/sync/logs', federationAuth, async (req: Request, res: Response) => {
  try {
    const node = (req as any).federationNode as FederationNode;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const logs = await db
      .select()
      .from(federationSyncLogs)
      .where(eq(federationSyncLogs.nodeId, node.nodeId))
      .orderBy(desc(federationSyncLogs.startedAt))
      .limit(limit);
    
    return res.json({
      success: true,
      logs,
      total: logs.length
    });
  } catch (error: any) {
    console.error('[Federation] Get sync logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync logs'
    });
  }
});

/**
 * POST /api/federation/sync
 * استقبال طلب مزامنة من عقدة مع checksum verification
 * Protected by Triple-Layer Security (JWT + HMAC + RSA)
 */
router.post('/sync', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const node = (req as any).federationNode as FederationNode;
    const { nodeId, syncType, data, metadata } = req.body;
    
    // Validate request body
    if (!nodeId || !syncType || !data || !metadata) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: nodeId, syncType, data, metadata'
      });
    }
    
    // Verify nodeId matches authenticated node
    if (nodeId !== node.nodeId) {
      return res.status(403).json({
        success: false,
        error: 'NodeId mismatch'
      });
    }
    
    // Extract metadata
    const { source, timestamp, version, checksum, syncId } = metadata;
    
    if (!checksum || !syncId) {
      return res.status(400).json({
        success: false,
        error: 'Missing checksum or syncId in metadata'
      });
    }
    
    // Verify checksum
    const dataString = JSON.stringify(data);
    const computedChecksum = crypto.createHash('sha256').update(dataString).digest('hex');
    
    if (computedChecksum !== checksum) {
      console.warn(`[Federation] Checksum mismatch for ${nodeId} - Expected: ${checksum}, Got: ${computedChecksum}`);
      return res.status(400).json({
        success: false,
        error: 'Checksum verification failed'
      });
    }
    
    // Check for duplicate syncId
    const existing = await db
      .select()
      .from(federationSyncData)
      .where(eq(federationSyncData.syncId, syncId))
      .limit(1);
    
    if (existing.length > 0) {
      console.log(`[Federation] Duplicate sync detected: ${syncId}`);
      return res.json({
        success: true,
        message: 'Data already synced (duplicate)',
        syncId,
        acknowledgment: {
          received: true,
          itemsProcessed: data.items?.length || 0,
          checksumVerified: true,
          storedAt: existing[0].receivedAt,
          duplicate: true
        }
      });
    }
    
    // Governance check
    const decision = governanceEngine.submitDecision(
      'nicholas-federation',
      `sync_${syncType}`,
      { nodeId: node.nodeId, syncType }
    );
    
    if (decision.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Sync rejected by governance engine',
        reason: decision.reason
      });
    }
    
    // Store sync data
    const [syncData] = await db
      .insert(federationSyncData)
      .values({
        nodeId,
        syncId,
        syncType,
        data,
        metadata,
        checksum,
        status: 'verified',
        processed: 1
      })
      .returning();
    
    // Update node last sync
    await db
      .update(federationNodes)
      .set({ lastSync: new Date() })
      .where(eq(federationNodes.nodeId, node.nodeId));
    
    // Log sync in audit
    const traceId = crypto.randomBytes(8).toString('hex');
    
    console.log(`[Federation] ✅ Sync completed: ${node.nodeId} - ${syncType} - ${syncId} - TraceID: ${traceId}`);
    console.log(`[Federation] Items processed: ${data.items?.length || 0}, Checksum verified: ✓`);
    
    return res.json({
      success: true,
      syncId,
      acknowledgment: {
        received: true,
        itemsProcessed: data.items?.length || data.totalItems || 0,
        checksumVerified: true,
        storedAt: syncData.receivedAt
      },
      traceId
    });
  } catch (error: any) {
    console.error('[Federation] Sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Sync failed',
      details: error.message
    });
  }
});

/**
 * POST /api/federation/keys/rotate
 * تدوير مفاتيح HMAC للعقدة (Key Rotation)
 * Protected by governance + current valid credentials
 */
router.post('/keys/rotate', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const { nodeId, keyId } = (req as any).federationAuth;
    
    // Governance check
    const decision = governanceEngine.submitDecision(
      nodeId,
      'rotate_keys',
      { nodeId, keyId }
    );
    
    if (decision.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Key rotation rejected by governance',
        reason: decision.reason
      });
    }
    
    // Generate new HMAC secret
    const newHmacSecret = generateHMACSecret();
    const newKeyId = `kid-${nodeId}-${Date.now()}`;
    
    // Rotate secret in vault
    await secretVault.rotateSecret(keyId, newHmacSecret);
    
    // Store new secret in vault
    const node = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, nodeId))
      .limit(1);
    
    if (!node[0]) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    await secretVault.storeSecret({
      keyId: newKeyId,
      nodeId,
      organizationId: node[0].organizationId,
      secretType: 'hmac',
      secretValue: newHmacSecret,
      algorithm: 'HMAC-SHA256',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    });
    
    // Update node's hmacSecret
    await db
      .update(federationNodes)
      .set({ hmacSecret: newHmacSecret })
      .where(eq(federationNodes.nodeId, nodeId));
    
    console.log(`[Federation] Keys rotated for node: ${nodeId} - New KeyID: ${newKeyId}`);
    
    // Log audit
    await secretVault.logAudit({
      nodeId,
      keyId: newKeyId,
      eventType: 'key_rotation_success',
      endpoint: '/api/federation/keys/rotate',
      method: 'POST',
      metadata: { oldKeyId: keyId, newKeyId }
    });
    
    return res.json({
      success: true,
      message: 'Keys rotated successfully',
      newCredentials: {
        keyId: newKeyId,
        hmacSecret: newHmacSecret,
        note: 'CRITICAL: Update your client with the new credentials immediately.'
      }
    });
  } catch (error: any) {
    console.error('[Federation] Key rotation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Key rotation failed',
      details: error.message
    });
  }
});

/**
 * DELETE /api/federation/nodes/:nodeId
 * حذف عقدة (Admin only)
 */
router.delete('/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    
    // Governance check
    const decision = governanceEngine.submitDecision(
      'admin',
      'delete_node',
      { nodeId }
    );
    
    if (decision.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Deletion requires governance approval',
        reason: decision.reason
      });
    }
    
    const [deletedNode] = await db
      .delete(federationNodes)
      .where(eq(federationNodes.nodeId, nodeId))
      .returning();
    
    if (!deletedNode) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    console.log(`[Federation] Node deleted: ${nodeId}`);
    
    return res.json({
      success: true,
      message: 'Node deleted successfully',
      nodeId
    });
  } catch (error: any) {
    console.error('[Federation] Delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Deletion failed'
    });
  }
});

// ============= INTELLIGENCE LAYER - PHASE 9.6 =============
router.use('/', intelligenceRouter);

// ============= AUTONOMOUS LEARNING - PHASE 9.7 =============
router.use('/', decisionRouter);

// ============= COGNITIVE ORCHESTRATION - PHASE 9.8 =============
router.use('/', orchestrationRouter);

// ============= COLLECTIVE GOVERNANCE INTELLIGENCE - PHASE 9.9 =============
router.use('/', governanceRouter);

// ============= AI DISTRIBUTION - LLAMA 3.3 70B SHARING =============
router.use('/', aiRouter);

console.log('✅ Federation Gateway initialized');
console.log('✅ Intelligence Layer activated (Phase 9.6)');
console.log('✅ Autonomous Learning Cycle activated (Phase 9.7)');
console.log('✅ Cognitive Orchestration Layer activated (Phase 9.8)');
console.log('✅ Collective Governance Intelligence activated (Phase 9.9)');
console.log('✅ AI Distribution Layer activated - Llama 3.3 70B available to all platforms');

export default router;
