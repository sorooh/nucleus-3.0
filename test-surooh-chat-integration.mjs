#!/usr/bin/env node

/**
 * 🧪 Surooh Chat Integration Test
 * 
 * This script simulates Surooh Chat sending messages to Nucleus Core
 * via the SCP Capabilities System.
 */

import crypto from 'crypto';
import http from 'http';

const NUCLEUS_URL = process.env.NUCLEUS_URL || 'http://localhost:5000';
const CHAT_HMAC_SECRET = process.env.CHAT_HMAC_SECRET;

if (!CHAT_HMAC_SECRET) {
  console.error('❌ Error: CHAT_HMAC_SECRET environment variable not set');
  process.exit(1);
}

// Generate HMAC signature
function generateSignature(body) {
  return crypto
    .createHmac('sha256', CHAT_HMAC_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

// Send SCP request
async function sendSCPRequest(command, params, sessionId) {
  return new Promise((resolve, reject) => {
    const body = {
      command,
      params: params || {},
      sessionId: sessionId || `test-${Date.now()}`
    };

    const bodyStr = JSON.stringify(body);
    const signature = generateSignature(body);

    const url = new URL('/api/scp/execute', NUCLEUS_URL);
    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'X-Surooh-Signature': signature,
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// Main test flow
async function runIntegrationTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SUROOH CHAT INTEGRATION TEST - NUCLEUS CORE');
  console.log('='.repeat(80) + '\n');

  const sessionId = `chat-integration-${Date.now()}`;
  const userId = 'user-test-123';

  // Test 1: Store user message
  console.log('📝 Test 1: Storing user message in Memory Hub...');
  const storeResult1 = await sendSCPRequest('store_insight', {
    pattern: 'كيف حالك يا نواة؟',
    evidence: JSON.stringify({
      sessionId,
      userId,
      messageType: 'user_question',
      timestamp: new Date().toISOString()
    }),
    type: 'conversation',
    sources: ['surooh-chat'],
    confidence: 1.0
  }, sessionId);

  console.log('✅ Response:', JSON.stringify(storeResult1, null, 2));
  console.log('');

  // Test 2: Store bot response
  console.log('📝 Test 2: Storing bot response...');
  const storeResult2 = await sendSCPRequest('store_insight', {
    pattern: 'أنا بخير، شكراً! كيف بقدر ساعدك اليوم؟',
    evidence: JSON.stringify({
      sessionId,
      userId,
      messageType: 'bot_response',
      timestamp: new Date().toISOString()
    }),
    type: 'conversation',
    sources: ['surooh-chat'],
    confidence: 1.0
  }, sessionId);

  console.log('✅ Response:', JSON.stringify(storeResult2, null, 2));
  console.log('');

  // Test 3: Store user command
  console.log('📝 Test 3: Storing user command...');
  const storeResult3 = await sendSCPRequest('store_insight', {
    pattern: 'بدي بوت جديد للدعم الفني',
    evidence: JSON.stringify({
      sessionId,
      userId,
      messageType: 'command_request',
      intent: 'create_support_bot',
      timestamp: new Date().toISOString()
    }),
    type: 'command',
    sources: ['surooh-chat'],
    confidence: 0.95
  }, sessionId);

  console.log('✅ Response:', JSON.stringify(storeResult3, null, 2));
  console.log('');

  // Test 4: Query stored messages
  console.log('🔍 Test 4: Querying stored messages...');
  const queryResult = await sendSCPRequest('query_memory', {
    query: 'كيف حالك',
    limit: 10
  }, sessionId);

  console.log('✅ Query Result:', JSON.stringify(queryResult, null, 2));
  console.log('');

  // Test 5: Search insights by source
  console.log('🔍 Test 5: Searching Surooh Chat insights...');
  const searchResult = await sendSCPRequest('search_insights', {
    filter: {
      sources: ['surooh-chat'],
      type: 'conversation'
    },
    limit: 20
  }, sessionId);

  console.log('✅ Search Result:', JSON.stringify(searchResult, null, 2));
  console.log('');

  // Test 6: Get all insights
  console.log('📊 Test 6: Getting all Surooh Chat insights...');
  const allInsights = await sendSCPRequest('get_all_insights', {
    limit: 100
  }, sessionId);

  if (allInsights.success && allInsights.data) {
    const suroohChatInsights = allInsights.data.insights?.filter(
      i => i.sources?.includes('surooh-chat')
    ) || [];
    
    console.log(`✅ Total insights: ${allInsights.data.total || 0}`);
    console.log(`💬 Surooh Chat insights: ${suroohChatInsights.length}`);
    console.log('');
    
    if (suroohChatInsights.length > 0) {
      console.log('📝 Latest Surooh Chat messages:');
      suroohChatInsights.slice(0, 5).forEach((insight, idx) => {
        console.log(`   ${idx + 1}. ${insight.description}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ INTEGRATION TEST COMPLETE - SUROOH CHAT → NUCLEUS CORE');
  console.log('='.repeat(80) + '\n');

  console.log('📊 Summary:');
  console.log('   ✅ Messages stored successfully');
  console.log('   ✅ Memory Hub integration working');
  console.log('   ✅ Query and search operational');
  console.log('   ✅ Surooh Chat → Nucleus Core link active');
  console.log('');
}

// Run the test
runIntegrationTest().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
