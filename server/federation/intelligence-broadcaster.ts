/**
 * Intelligence Broadcast Service - Phase 9.6
 * 
 * Automatically broadcasts intelligence data to registered SIDE nodes
 * Uses dual-layer security (JWT + HMAC) for all communications
 * Note: RSA signatures are planned for future enhancement
 */

import { db } from '../db';
import { 
  intelligenceData, 
  intelligenceAuditLog,
  federationNodes,
  federationSecretVault
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Generate security headers for outbound intelligence broadcast
 */
async function generateSecurityHeaders(
  nodeId: string,
  payload: any
): Promise<Record<string, string>> {
  // Load node information
  const nodes = await db
    .select()
    .from(federationNodes)
    .where(eq(federationNodes.nodeId, nodeId))
    .limit(1);
  
  const node = nodes[0];
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // Load active credentials from vault
  const [vault] = await db
    .select()
    .from(federationSecretVault)
    .where(
      and(
        eq(federationSecretVault.nodeId, nodeId),
        eq(federationSecretVault.status, 'active')
      )
    )
    .orderBy(desc(federationSecretVault.createdAt))
    .limit(1);
  
  if (!vault) {
    throw new Error(`No active credentials found for node: ${nodeId}`);
  }
  
  // Generate JWT token - MUST use environment secret for production
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for production federation');
  }
  
  const authToken = jwt.sign(
    {
      nodeId,
      nodeType: node.nodeType,
      issuer: 'nicholas-3.2',
      audience: 'surooh-federation',
      purpose: 'intelligence-broadcast'
    },
    secret,
    { expiresIn: '365d' }
  );
  
  return {
    nodeId,
    nodeUrl: node.nodeUrl,
    authToken,
    keyId: vault.keyId,
    hmacSecret: vault.secretValue
  };
}

/**
 * Send intelligence broadcast to a specific node
 */
async function broadcastToNode(
  nodeId: string,
  intelligenceId: string,
  intelligence: any
): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    console.log(`[Intelligence Broadcast] Sending to ${nodeId}...`);
    
    // Generate security credentials
    const { nodeUrl, authToken, keyId, hmacSecret } = await generateSecurityHeaders(nodeId, intelligence);
    
    // Prepare payload
    const payload = {
      intelligence: {
        intelligenceId: intelligence.intelligenceId,
        intelligenceType: intelligence.intelligenceType,
        category: intelligence.category,
        priority: intelligence.priority,
        title: intelligence.title,
        description: intelligence.description,
        data: intelligence.data,
        confidence: intelligence.confidence,
        checksum: intelligence.checksum,
        impact: intelligence.impact,
        suggestedActions: intelligence.suggestedActions,
        metadata: {
          ...intelligence.metadata,
          broadcastFrom: 'nicholas-3.2',
          broadcastAt: new Date().toISOString()
        }
      }
    };
    
    // Generate HMAC signature
    const timestamp = Date.now().toString();
    const fullPath = '/api/federation/intelligence/broadcast';
    const signatureData = `POST${fullPath}${timestamp}${JSON.stringify(payload)}`;
    const hmacSignature = crypto
      .createHmac('sha256', hmacSecret)
      .update(signatureData)
      .digest('hex');
    
    // Generate nonce for replay protection
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'X-Surooh-KeyId': keyId,
      'X-Surooh-Timestamp': timestamp,
      'X-Surooh-Signature': hmacSignature,
      'X-Surooh-Nonce': nonce
    };
    
    // Send broadcast
    const response = await axios.post(
      `${nodeUrl}${fullPath}`,
      payload,
      {
        headers,
        timeout: 30000 // 30 second timeout
      }
    );
    
    const processingTime = Date.now() - startTime;
    
    if (response.data.success) {
      console.log(`   ✅ Successfully broadcast to ${nodeId} (${processingTime}ms)`);
      
      // Log success in audit
      await db.insert(intelligenceAuditLog).values({
        nodeId,
        intelligenceId,
        eventType: 'broadcast_sent',
        eventStatus: 'success',
        endpoint: fullPath,
        method: 'POST',
        processingTime,
        itemsProcessed: 1,
        itemsFailed: 0,
        metadata: {
          responseStatus: response.status,
          acknowledgment: response.data.acknowledgment
        }
      });
      
      return true;
    } else {
      const errorMessage = response.data.message || 'Unknown error';
      console.log(`   ❌ Failed to broadcast to ${nodeId}: ${errorMessage}`);
      
      // Log failure in audit
      await db.insert(intelligenceAuditLog).values({
        nodeId,
        intelligenceId,
        eventType: 'broadcast_failed',
        eventStatus: 'failed',
        endpoint: fullPath,
        method: 'POST',
        processingTime,
        itemsProcessed: 0,
        itemsFailed: 1,
        errorMessage: `Application error: ${errorMessage}`,
        metadata: {
          responseStatus: response.status,
          responseData: response.data
        }
      });
      
      return false;
    }
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`   ❌ Error broadcasting to ${nodeId}:`, error.message);
    
    // Log error in audit
    await db.insert(intelligenceAuditLog).values({
      nodeId,
      intelligenceId,
      eventType: 'broadcast_error',
      eventStatus: 'failed',
      endpoint: '/api/federation/intelligence/broadcast',
      method: 'POST',
      processingTime,
      itemsProcessed: 0,
      itemsFailed: 1,
      errorMessage: error.message,
      errorCode: error.code || 'NETWORK_ERROR',
      metadata: {
        errorType: error.constructor.name,
        stack: error.stack
      }
    });
    
    return false;
  }
}

/**
 * Broadcast intelligence to all active nodes or specific target nodes
 */
export async function broadcastIntelligence(intelligenceId: string): Promise<{
  success: boolean;
  totalNodes: number;
  successCount: number;
  failCount: number;
}> {
  try {
    console.log(`\n[Intelligence Broadcast] Starting broadcast for: ${intelligenceId}`);
    
    // Load intelligence data
    const intelligenceRecords = await db
      .select()
      .from(intelligenceData)
      .where(eq(intelligenceData.intelligenceId, intelligenceId))
      .limit(1);
    
    const intelligence = intelligenceRecords[0];
    if (!intelligence) {
      throw new Error(`Intelligence not found: ${intelligenceId}`);
    }
    
    // Get target nodes (either specific targets or all active nodes)
    let targetNodes: string[] = [];
    
    if (intelligence.broadcastTo && Array.isArray(intelligence.broadcastTo) && intelligence.broadcastTo.length > 0) {
      // Broadcast to specific nodes
      targetNodes = intelligence.broadcastTo as string[];
    } else {
      // Broadcast to all active nodes
      const activeNodes = await db
        .select()
        .from(federationNodes)
        .where(eq(federationNodes.status, 'active'));
      
      targetNodes = activeNodes.map(n => n.nodeId);
    }
    
    if (targetNodes.length === 0) {
      console.log(`[Intelligence Broadcast] No target nodes found`);
      return { success: true, totalNodes: 0, successCount: 0, failCount: 0 };
    }
    
    console.log(`[Intelligence Broadcast] Broadcasting to ${targetNodes.length} node(s)...`);
    
    // Update broadcast status to 'broadcasting'
    await db
      .update(intelligenceData)
      .set({ broadcastStatus: 'broadcasting' })
      .where(eq(intelligenceData.intelligenceId, intelligenceId));
    
    // Broadcast to all target nodes
    const results = await Promise.all(
      targetNodes.map(nodeId => broadcastToNode(nodeId, intelligenceId, intelligence))
    );
    
    const successCount = results.filter(r => r).length;
    const failCount = results.length - successCount;
    
    // Determine overall success (partial failures count as failure)
    const allSucceeded = failCount === 0;
    
    // Update final broadcast status
    await db
      .update(intelligenceData)
      .set({
        broadcastStatus: allSucceeded ? 'completed' : 'partial',
        broadcastedAt: new Date()
      })
      .where(eq(intelligenceData.intelligenceId, intelligenceId));
    
    if (allSucceeded) {
      console.log(`\n[Intelligence Broadcast] ✅ Completed: ${successCount}/${targetNodes.length} successful`);
    } else {
      console.log(`\n[Intelligence Broadcast] ⚠️  Partial success: ${successCount}/${targetNodes.length} successful, ${failCount} failed`);
    }
    
    return {
      success: allSucceeded,
      totalNodes: targetNodes.length,
      successCount,
      failCount
    };
  } catch (error: any) {
    console.error('[Intelligence Broadcast] Error:', error);
    
    // Update status to pending on error
    await db
      .update(intelligenceData)
      .set({ broadcastStatus: 'pending' })
      .where(eq(intelligenceData.intelligenceId, intelligenceId));
    
    return {
      success: false,
      totalNodes: 0,
      successCount: 0,
      failCount: 1
    };
  }
}

/**
 * Broadcast all pending intelligence with resilient error handling
 */
export async function broadcastPendingIntelligence(): Promise<{
  success: boolean;
  totalIntelligence: number;
  successCount: number;
  failCount: number;
}> {
  try {
    console.log('\n🧠 [Intelligence Broadcast] Checking for pending intelligence...');
    
    // Get all pending intelligence
    const pending = await db
      .select()
      .from(intelligenceData)
      .where(eq(intelligenceData.broadcastStatus, 'pending'));
    
    if (pending.length === 0) {
      console.log('[Intelligence Broadcast] No pending intelligence found');
      return { success: true, totalIntelligence: 0, successCount: 0, failCount: 0 };
    }
    
    console.log(`[Intelligence Broadcast] Found ${pending.length} pending intelligence item(s)`);
    
    // Broadcast each intelligence with individual error handling
    const results = await Promise.allSettled(
      pending.map(intel => broadcastIntelligence(intel.intelligenceId))
    );
    
    let successCount = 0;
    let failCount = 0;
    let totalNodeFailures = 0;
    
    results.forEach((result, index) => {
      const intelligenceId = pending[index].intelligenceId;
      
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          // Complete success - all nodes received intelligence
          successCount++;
        } else {
          // Partial failure - some nodes failed
          failCount++;
          totalNodeFailures += result.value.failCount;
          console.error(`   ⚠️  Partial broadcast failure for ${intelligenceId}: ${result.value.failCount}/${result.value.totalNodes} nodes failed`);
        }
      } else {
        // Promise rejected - critical error
        failCount++;
        console.error(`   ❌ Critical broadcast error for ${intelligenceId}:`, result.reason);
      }
    });
    
    const allSucceeded = failCount === 0;
    
    if (allSucceeded) {
      console.log(`\n✅ [Intelligence Broadcast] Complete: All ${successCount} broadcasts fully successful`);
    } else {
      console.log(`\n⚠️  [Intelligence Broadcast] Partial success: ${successCount}/${pending.length} fully successful, ${failCount} partial/failed (${totalNodeFailures} total node failures)`);
    }
    
    return {
      success: allSucceeded,
      totalIntelligence: pending.length,
      successCount,
      failCount
    };
  } catch (error: any) {
    console.error('[Intelligence Broadcast] Critical error:', error);
    return {
      success: false,
      totalIntelligence: 0,
      successCount: 0,
      failCount: 1
    };
  }
}
