/**
 * Phase 9.6.2 Complete Test Suite
 * Tests all new components: Broadcast endpoint, Pattern Miner, Scheduler, Reporter
 */

import { db } from './server/db';
import { federationNodes, intelligenceData } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import crypto from 'crypto';

const NICHOLAS_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'http://localhost:5000';

const NODE_ID = 'side-node-main-test';

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  duration: number;
  details?: any;
}

const testResults: TestResult[] = [];

/**
 * Load credentials from database
 */
async function loadCredentials() {
  const [node] = await db
    .select()
    .from(federationNodes)
    .where(eq(federationNodes.nodeId, NODE_ID))
    .limit(1);

  if (!node || !node.authToken || !node.hmacSecret) {
    throw new Error('Node credentials not found');
  }

  return {
    jwt: node.authToken,
    hmacSecret: node.hmacSecret,
    keyId: node.keyId || 'default-key'
  };
}

/**
 * Prepare security headers matching security-middleware.ts format:
 * method + "\n" + url_path + "\n" + body_sha256_hex + "\n" + timestamp
 */
function prepareHeaders(method: string, endpoint: string, body: any, credentials: any) {
  const timestamp = Date.now().toString();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Calculate body SHA256 (matching security-middleware.ts)
  const bodyStr = JSON.stringify(body);
  const bodySha256 = crypto.createHash('sha256').update(bodyStr).digest('hex');
  
  // Build signature payload (matching security-middleware.ts buildSignaturePayload)
  const signaturePayload = `${method}\n${path}\n${bodySha256}\n${timestamp}`;
  
  const signature = crypto
    .createHmac('sha256', credentials.hmacSecret)
    .update(signaturePayload)
    .digest('hex');

  // Generate dummy code signature (RSA signature would be done by SIDE)
  const codeSig = crypto.createHash('sha256').update(`${credentials.jwt}-${timestamp}`).digest('hex');

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${credentials.jwt}`,
    'X-Surooh-KeyId': credentials.keyId,
    'X-Surooh-Timestamp': timestamp,
    'X-Surooh-Signature': signature,
    'X-Surooh-CodeSig': codeSig
  };
}

/**
 * Test 1: POST /api/federation/broadcast endpoint
 */
async function testBroadcastEndpoint(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🧪 Test 1: Broadcast Endpoint');
    console.log('─────────────────────────────────────────');
    
    const credentials = await loadCredentials();
    
    const requestBody = {
      mode: 'pending'
    };
    
    const headers = prepareHeaders('POST', '/api/federation/broadcast', requestBody, credentials);
    
    console.log('📤 Triggering broadcast...');
    const response = await axios.post(
      `${NICHOLAS_URL}/api/federation/broadcast`,
      requestBody,
      { headers }
    );
    
    const duration = Date.now() - startTime;
    
    if (response.data.success !== undefined && response.data.mode === 'batch') {
      console.log('✅ Test PASSED');
      console.log(`   Mode: ${response.data.mode}`);
      console.log(`   Total broadcasts: ${response.data.broadcast?.total || 0}`);
      console.log(`   Duration: ${duration}ms`);
      
      return {
        name: 'Broadcast Endpoint Test',
        status: 'pass',
        duration,
        details: response.data
      };
    } else {
      throw new Error('Invalid broadcast response');
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log('❌ Test FAILED:', error.response?.data?.error || error.message);
    
    return {
      name: 'Broadcast Endpoint Test',
      status: 'fail',
      duration,
      details: { error: error.message }
    };
  }
}

/**
 * Test 2: Pattern Miner functionality
 */
async function testPatternMiner(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🧪 Test 2: Pattern Miner');
    console.log('─────────────────────────────────────────');
    
    console.log('🔍 Running pattern mining...');
    const { runPatternMining } = await import('./server/federation/intelligence-pattern-miner');
    
    const patterns = await runPatternMining({
      minConfidence: 60,
      minFrequency: 1,
      lookbackDays: 30
    });
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Test PASSED');
    console.log(`   Patterns discovered: ${patterns.length}`);
    console.log(`   Duration: ${duration}ms`);
    
    if (patterns.length > 0) {
      console.log('   Top patterns:');
      patterns.slice(0, 3).forEach(p => {
        console.log(`      - ${p.patternType}: ${p.description.substring(0, 50)}...`);
      });
    }
    
    return {
      name: 'Pattern Miner Test',
      status: 'pass',
      duration,
      details: {
        patternsFound: patterns.length,
        patternTypes: [...new Set(patterns.map(p => p.patternType))]
      }
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log('❌ Test FAILED:', error.message);
    
    return {
      name: 'Pattern Miner Test',
      status: 'fail',
      duration,
      details: { error: error.message }
    };
  }
}

/**
 * Test 3: Intelligence Reporter
 */
async function testReporter(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🧪 Test 3: Intelligence Reporter');
    console.log('─────────────────────────────────────────');
    
    console.log('📊 Generating report...');
    const { generateIntelligenceReport } = await import('./server/federation/intelligence-reporter');
    
    const report = await generateIntelligenceReport(7);
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Test PASSED');
    console.log(`   Report file: ${report.fileName}`);
    console.log(`   Total intelligence: ${report.summary.totalIntelligence}`);
    console.log(`   Total patterns: ${report.summary.totalPatterns}`);
    console.log(`   Active nodes: ${report.summary.activeNodes}`);
    console.log(`   Success rate: ${report.summary.broadcastSuccessRate}%`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      name: 'Intelligence Reporter Test',
      status: 'pass',
      duration,
      details: {
        fileName: report.fileName,
        summary: report.summary
      }
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log('❌ Test FAILED:', error.message);
    
    return {
      name: 'Intelligence Reporter Test',
      status: 'fail',
      duration,
      details: { error: error.message }
    };
  }
}

/**
 * Test 4: Scheduler status check
 */
async function testScheduler(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🧪 Test 4: Intelligence Scheduler');
    console.log('─────────────────────────────────────────');
    
    console.log('⏰ Checking scheduler status...');
    const { intelligenceScheduler } = await import('./server/federation/intelligence-scheduler');
    
    const status = intelligenceScheduler.getStatus();
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Test PASSED');
    console.log(`   Scheduler running: ${status.isRunning ? 'Yes' : 'No'}`);
    console.log(`   Broadcast interval: ${status.config.broadcastInterval} min`);
    console.log(`   Pattern mining interval: ${status.config.patternMiningInterval} min`);
    console.log(`   Reporting interval: ${status.config.reportingInterval} min`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      name: 'Scheduler Status Test',
      status: 'pass',
      duration,
      details: status
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log('❌ Test FAILED:', error.message);
    
    return {
      name: 'Scheduler Status Test',
      status: 'fail',
      duration,
      details: { error: error.message }
    };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Phase 9.6.2 - Complete System Test');
  console.log('═════════════════════════════════════════════════════════\n');
  
  try {
    // Run all tests
    testResults.push(await testBroadcastEndpoint());
    testResults.push(await testPatternMiner());
    testResults.push(await testReporter());
    testResults.push(await testScheduler());
    
    // Print summary
    console.log('\n═════════════════════════════════════════════════════════');
    console.log('📈 PHASE 9.6.2 - TEST SUMMARY');
    console.log('═════════════════════════════════════════════════════════\n');
    
    const passedTests = testResults.filter(t => t.status === 'pass').length;
    const failedTests = testResults.filter(t => t.status === 'fail').length;
    const successRate = (passedTests / testResults.length) * 100;
    const avgDuration = testResults.reduce((sum, t) => sum + t.duration, 0) / testResults.length;
    
    console.log(`✅ Tests Passed: ${passedTests}/${testResults.length}`);
    console.log(`❌ Tests Failed: ${failedTests}/${testResults.length}`);
    console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`⏱️  Average Response Time: ${Math.round(avgDuration)}ms`);
    
    console.log('\n🎯 COMPONENT STATUS:');
    console.log(`   ✅ Broadcast Endpoint: ${testResults[0].status === 'pass' ? 'Working' : 'Failed'}`);
    console.log(`   ✅ Pattern Miner: ${testResults[1].status === 'pass' ? 'Working' : 'Failed'}`);
    console.log(`   ✅ Intelligence Reporter: ${testResults[2].status === 'pass' ? 'Working' : 'Failed'}`);
    console.log(`   ✅ Scheduler: ${testResults[3].status === 'pass' ? 'Working' : 'Failed'}`);
    
    console.log('\n═════════════════════════════════════════════════════════');
    
    if (passedTests === testResults.length) {
      console.log('🎉 PHASE 9.6.2 COMPLETE - All Tests Passed!');
    } else {
      console.log('⚠️  PHASE 9.6.2 INCOMPLETE - Some Tests Failed');
    }
    
    console.log('═════════════════════════════════════════════════════════\n');
    
    process.exit(passedTests === testResults.length ? 0 : 1);
    
  } catch (error: any) {
    console.error('\n❌ Test Suite Failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main().catch(console.error);
