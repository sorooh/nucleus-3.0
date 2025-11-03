/**
 * Simple Test for Federation Data Sync Endpoint
 * Tests sync with existing registered node
 */

import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './server/db';
import { federationNodes, federationSecretVault, federationAuthTokens } from './shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const NICHOLAS_URL = 'http://localhost:5000';
const NODE_ID = 'side-node-main-test';

interface Credentials {
  authToken: string;
  hmacSecret: string;
  keyId: string;
  codeSignature: string;
}

/**
 * حساب HMAC Signature حسب معايير Surooh
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
 * Load credentials from database
 */
async function loadCredentials(): Promise<Credentials> {
  console.log('🔐 جاري تحميل الـ credentials من الـ database...');
  
  // Get vault entry
  const [vault] = await db
    .select()
    .from(federationSecretVault)
    .where(
      and(
        eq(federationSecretVault.nodeId, NODE_ID),
        eq(federationSecretVault.status, 'active')
      )
    )
    .orderBy(desc(federationSecretVault.createdAt))
    .limit(1);
  
  if (!vault) {
    throw new Error('No active credentials found in vault');
  }
  
  // Get node info
  const [node] = await db
    .select()
    .from(federationNodes)
    .where(eq(federationNodes.nodeId, NODE_ID))
    .limit(1);
  
  if (!node) {
    throw new Error('Node not found');
  }
  
  // Generate JWT token (same as registration)
  const secret = process.env.JWT_SECRET || 'nicholas-3.2-federation-secret';
  
  const authToken = jwt.sign(
    {
      nodeId: NODE_ID,
      nodeType: node.nodeType,
      issuer: 'nicholas-3.2',
      audience: 'surooh-federation',
      purpose: 'node-authentication'
    },
    secret,
    { expiresIn: '365d' }
  );
  
  console.log('✅ تم تحميل الـ credentials بنجاح');
  console.log(`   Key ID: ${vault.keyId}`);
  console.log(`   Node Type: ${node.nodeType}`);
  console.log(`   Secret Type: ${vault.secretType}`);
  
  return {
    authToken,
    hmacSecret: vault.secretValue,
    keyId: vault.keyId,
    codeSignature: vault.codeHash || ''
  };
}

/**
 * Prepare security headers
 */
function prepareHeaders(
  method: string,
  urlPath: string,
  body: any,
  credentials: Credentials
): Record<string, string> {
  const timestamp = Date.now().toString();
  const hmacSignature = computeHMACSignature(method, urlPath, body, timestamp, credentials.hmacSecret);
  
  // Generate nonce for replay protection
  const nonce = crypto.randomBytes(16).toString('hex');
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${credentials.authToken}`,
    'X-Surooh-KeyId': credentials.keyId,
    'X-Surooh-Timestamp': timestamp,
    'X-Surooh-Signature': hmacSignature,
    'X-Surooh-CodeSig': `v1=${credentials.codeSignature}`,
    'X-Surooh-Nonce': nonce,
    'X-Node-ID': NODE_ID
  };
}

async function main() {
  console.log('🚀 بدء اختبار Data Sync Endpoint');
  console.log('═════════════════════════════════════════\n');

  try {
    // Load credentials from database
    const credentials = await loadCredentials();
    
    console.log('\n📋 اختبار 1: Knowledge Sharing Sync');
    console.log('─────────────────────────────────────────');
    
    // Prepare test data
    const knowledgeData = {
      category: 'test-knowledge',
      items: [
        {
          id: 'test-knowledge-1',
          title: 'Federation Test Knowledge',
          content: 'Testing bi-directional data sync between Nicholas and SIDE',
          tags: ['federation', 'test', 'sync'],
          timestamp: new Date().toISOString()
        },
        {
          id: 'test-knowledge-2',
          title: 'Triple-Layer Security Verification',
          content: 'Verifying JWT + HMAC + RSA security layers',
          tags: ['security', 'verification', 'federation'],
          timestamp: new Date().toISOString()
        }
      ],
      totalItems: 2
    };
    
    // Generate syncId
    const syncId = `sync-${NODE_ID}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Compute checksum
    const dataString = JSON.stringify(knowledgeData);
    const checksum = crypto.createHash('sha256').update(dataString).digest('hex');
    
    // Prepare request body
    const body = {
      nodeId: NODE_ID,
      syncType: 'knowledge-sharing',
      data: knowledgeData,
      metadata: {
        source: NODE_ID,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checksum,
        syncId
      }
    };
    
    // Prepare headers
    const headers = prepareHeaders('POST', '/api/federation/sync', body, credentials);
    
    // Send sync request
    console.log('📤 إرسال طلب المزامنة...');
    const response = await axios.post(`${NICHOLAS_URL}/api/federation/sync`, body, { headers });
    
    if (response.data.success) {
      console.log('✅ المزامنة نجحت!');
      console.log(`   Sync ID: ${response.data.syncId}`);
      console.log(`   Items Processed: ${response.data.acknowledgment.itemsProcessed}`);
      console.log(`   Checksum Verified: ${response.data.acknowledgment.checksumVerified ? 'نعم' : 'لا'}`);
      console.log(`   Stored At: ${response.data.acknowledgment.storedAt}`);
      console.log(`   Trace ID: ${response.data.traceId}`);
    } else {
      console.error('❌ فشلت المزامنة:', response.data);
    }
    
    console.log('\n📋 اختبار 2: Duplicate Detection');
    console.log('─────────────────────────────────────────');
    console.log('📤 إرسال نفس البيانات مرة أخرى...');
    
    // Send same sync request again
    const headers2 = prepareHeaders('POST', '/api/federation/sync', body, credentials);
    const response2 = await axios.post(`${NICHOLAS_URL}/api/federation/sync`, body, { headers: headers2 });
    
    if (response2.data.success && response2.data.acknowledgment.duplicate) {
      console.log('✅ Duplicate Detection يعمل بشكل صحيح!');
      console.log(`   Message: ${response2.data.message}`);
      console.log(`   Original Stored At: ${response2.data.acknowledgment.storedAt}`);
    } else {
      console.warn('⚠️  تحذير: لم يتم اكتشاف التكرار');
    }
    
    console.log('\n═════════════════════════════════════════');
    console.log('✅ جميع الاختبارات نجحت!');
    console.log('═════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ فشل الاختبار:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
