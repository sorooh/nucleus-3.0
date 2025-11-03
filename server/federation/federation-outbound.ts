/**
 * Federation Outbound Dispatcher
 * Sends pending outbound sync records to SIDE nodes
 * 
 * مرسل البيانات الصادرة - يرسل السجلات المعلقة إلى عُقد SIDE
 */

import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { federationNodes, federationSyncData, federationSecretVault, federationAuditLog } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface OutboundSyncRecord {
  id: string;
  nodeId: string;
  syncId: string;
  syncType: string;
  data: any;
  metadata: any;
  checksum: string;
}

interface NodeCredentials {
  nodeId: string;
  nodeUrl: string;
  authToken: string;
  hmacSecret: string;
  codeSignature: string;
  keyId: string;
}

/**
 * Load node credentials from vault
 */
async function loadNodeCredentials(nodeId: string): Promise<NodeCredentials> {
  // Get node details
  const [node] = await db
    .select()
    .from(federationNodes)
    .where(eq(federationNodes.nodeId, nodeId))
    .limit(1);
  
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  
  // Get active credentials from vault
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
      purpose: 'outbound-sync'
    },
    secret,
    { expiresIn: '365d' }
  );
  
  return {
    nodeId,
    nodeUrl: node.nodeUrl,
    authToken,
    hmacSecret: vault.secretValue,
    codeSignature: vault.codeHash || '',
    keyId: vault.keyId
  };
}

/**
 * Compute HMAC signature
 */
function computeHMACSignature(
  method: string,
  urlPath: string,
  body: any,
  timestamp: string,
  hmacSecret: string
): string {
  const bodyStr = JSON.stringify(body);
  const bodySha256 = crypto.createHash('sha256').update(bodyStr).digest('hex');
  
  const payload = `${method}\n${urlPath}\n${bodySha256}\n${timestamp}`;
  
  const signature = crypto
    .createHmac('sha256', hmacSecret)
    .update(payload)
    .digest('hex');
  
  return `v1=${signature}`;
}

/**
 * Prepare security headers for outbound request
 */
function prepareSecurityHeaders(
  body: any,
  credentials: NodeCredentials
): Record<string, string> {
  const timestamp = Date.now().toString();
  const urlPath = '/api/federation/sync';
  const hmacSignature = computeHMACSignature('POST', urlPath, body, timestamp, credentials.hmacSecret);
  const nonce = crypto.randomBytes(16).toString('hex');
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${credentials.authToken}`,
    'X-Surooh-KeyId': credentials.keyId,
    'X-Surooh-Timestamp': timestamp,
    'X-Surooh-Signature': hmacSignature,
    'X-Surooh-CodeSig': `v1=${credentials.codeSignature}`,
    'X-Surooh-Nonce': nonce,
    'X-Node-ID': 'nicholas-3.2',
    'X-Direction': 'outbound'
  };
}

/**
 * Send single outbound sync to SIDE node
 */
async function sendSyncToNode(
  record: OutboundSyncRecord,
  credentials: NodeCredentials
): Promise<boolean> {
  const body = {
    nodeId: 'nicholas-3.2',
    syncType: record.syncType,
    data: record.data,
    metadata: {
      ...record.metadata,
      syncId: record.syncId,
      checksum: record.checksum,
      source: 'nicholas-3.2',
      destination: record.nodeId,
      direction: 'outbound',
      timestamp: new Date().toISOString()
    }
  };
  
  const headers = prepareSecurityHeaders(body, credentials);
  const endpoint = `${credentials.nodeUrl}/api/federation/sync`;
  
  try {
    console.log(`📤 Sending sync to ${credentials.nodeId}...`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Sync ID: ${record.syncId}`);
    console.log(`   Type: ${record.syncType}`);
    
    const response = await axios.post(endpoint, body, { 
      headers,
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data.success) {
      console.log(`   ✅ Successfully sent (${response.status})`);
      
      // Log audit entry
      await db.insert(federationAuditLog).values({
        nodeId: record.nodeId,
        eventType: 'sync_outbound_success',
        endpoint: '/api/federation/sync',
        method: 'POST',
        metadata: {
          syncId: record.syncId,
          syncType: record.syncType,
          responseStatus: response.status,
          checksumVerified: response.data.acknowledgment?.checksumVerified
        }
      });
      
      return true;
    } else {
      const errorMessage = response.data.message || 'Unknown error';
      console.log(`   ❌ Failed: ${errorMessage}`);
      
      // Log logical failure in audit log
      await db.insert(federationAuditLog).values({
        nodeId: record.nodeId,
        eventType: 'sync_outbound_failed',
        endpoint: '/api/federation/sync',
        method: 'POST',
        failureReason: `Application error: ${errorMessage}`,
        metadata: {
          syncId: record.syncId,
          syncType: record.syncType,
          responseStatus: response.status,
          responseData: response.data
        }
      });
      
      return false;
    }
  } catch (error: any) {
    console.error(`   ❌ Error sending sync:`, error.message);
    
    // Log failure in audit log
    await db.insert(federationAuditLog).values({
      nodeId: record.nodeId,
      eventType: 'sync_outbound_failed',
      endpoint: '/api/federation/sync',
      method: 'POST',
      failureReason: error.message,
      metadata: {
        syncId: record.syncId,
        syncType: record.syncType,
        error: error.message
      }
    });
    
    return false;
  }
}

/**
 * Get pending outbound sync records
 */
async function getPendingOutboundSyncs(): Promise<OutboundSyncRecord[]> {
  const records = await db
    .select()
    .from(federationSyncData)
    .where(
      and(
        eq(federationSyncData.direction, 'outbound'),
        eq(federationSyncData.status, 'pending')
      )
    )
    .orderBy(federationSyncData.receivedAt);
  
  return records as OutboundSyncRecord[];
}

/**
 * Update sync record status
 */
async function updateSyncStatus(syncId: string, status: 'sent' | 'failed', error?: string) {
  // Get existing record to preserve metadata
  const [existingRecord] = await db
    .select()
    .from(federationSyncData)
    .where(eq(federationSyncData.syncId, syncId))
    .limit(1);
  
  const updateData: any = {
    status,
    processed: 1
  };
  
  // Preserve original metadata and merge error details
  if (error && existingRecord) {
    const originalMetadata = existingRecord.metadata || {};
    updateData.metadata = {
      ...originalMetadata,
      lastError: error,
      lastFailedAt: new Date().toISOString(),
      retryCount: (originalMetadata as any).retryCount ? (originalMetadata as any).retryCount + 1 : 1
    };
  }
  
  await db
    .update(federationSyncData)
    .set(updateData)
    .where(eq(federationSyncData.syncId, syncId));
}

/**
 * Main function: Send all pending outbound syncs
 */
export async function sendOutboundSync(): Promise<void> {
  console.log('\n🚀 Federation Outbound Dispatcher');
  console.log('═══════════════════════════════════════\n');
  
  try {
    // Get pending records
    console.log('📋 Fetching pending outbound syncs...');
    const pendingRecords = await getPendingOutboundSyncs();
    
    if (pendingRecords.length === 0) {
      console.log('✅ No pending outbound syncs found.\n');
      return;
    }
    
    console.log(`📊 Found ${pendingRecords.length} pending sync(s)\n`);
    
    // Group by nodeId
    const recordsByNode = pendingRecords.reduce((acc, record) => {
      if (!acc[record.nodeId]) {
        acc[record.nodeId] = [];
      }
      acc[record.nodeId].push(record);
      return acc;
    }, {} as Record<string, OutboundSyncRecord[]>);
    
    let totalSent = 0;
    let totalFailed = 0;
    
    // Process each node
    for (const [nodeId, records] of Object.entries(recordsByNode)) {
      console.log(`\n📡 Processing node: ${nodeId}`);
      console.log(`   Records to send: ${records.length}`);
      
      try {
        // Load credentials
        const credentials = await loadNodeCredentials(nodeId);
        
        // Send each record
        for (const record of records) {
          const success = await sendSyncToNode(record, credentials);
          
          if (success) {
            await updateSyncStatus(record.syncId, 'sent');
            totalSent++;
          } else {
            await updateSyncStatus(record.syncId, 'failed', 'Send failed');
            totalFailed++;
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        console.error(`   ❌ Error processing node ${nodeId}:`, error.message);
        
        // Mark all records for this node as failed
        for (const record of records) {
          await updateSyncStatus(record.syncId, 'failed', error.message);
          totalFailed++;
        }
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('📊 OUTBOUND DISPATCH SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Successfully sent: ${totalSent}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📈 Total processed: ${pendingRecords.length}\n`);
    
    if (totalSent > 0) {
      console.log('✅ FederationSync: Outbound dispatch complete\n');
    }
    
  } catch (error: any) {
    console.error('\n❌ Fatal error in outbound dispatcher:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sendOutboundSync()
    .then(() => {
      console.log('✅ Outbound dispatcher completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Outbound dispatcher failed:', error);
      process.exit(1);
    });
}
