/**
 * Test Rate Limiting under High Concurrency
 * 
 * Tests that the sliding window rate limiter correctly enforces
 * limits even with many concurrent requests
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';

// Create a test platform with low limits for easy testing
const PLATFORM_ID = 'codemaster';
const JWT_SECRET = 'codemaster-jwt-secret-2024';
const HMAC_SECRET = 'codemaster-hmac-secret-2024';

// Platform has 100 RPM limit

function generateJWT(): string {
  return jwt.sign(
    {
      platformId: PLATFORM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET
  );
}

function generateHMAC(payload: any, timestamp: string): string {
  const data = JSON.stringify(payload) + timestamp;
  return crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');
}

async function makeRequest(): Promise<{ status: number; headers: any }> {
  const token = generateJWT();
  const timestamp = Date.now().toString();
  const payload = { platformId: PLATFORM_ID };
  const signature = generateHMAC(payload, timestamp);

  try {
    // Use protected endpoint that requires UGW auth
    const response = await axios.get(`${BASE_URL}/api/ugw/test/echo`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-HMAC-Signature': signature,
        'X-HMAC-Timestamp': timestamp,
        'Content-Type': 'application/json',
      },
    });

    return {
      status: response.status,
      headers: {
        remainingMinute: response.headers['x-ratelimit-remaining-minute'],
        remainingHour: response.headers['x-ratelimit-remaining-hour'],
        remainingDay: response.headers['x-ratelimit-remaining-day'],
      },
    };
  } catch (error: any) {
    if (error.response) {
      return {
        status: error.response.status,
        headers: {
          remainingMinute: error.response.headers['x-ratelimit-remaining-minute'],
          remainingHour: error.response.headers['x-ratelimit-remaining-hour'],
          remainingDay: error.response.headers['x-ratelimit-remaining-day'],
        },
      };
    }
    throw error;
  }
}

async function testConcurrency() {
  console.log('🔥 Testing Rate Limiting under High Concurrency\n');

  // Reset rate limits first
  console.log('🔄 Resetting rate limits...');
  try {
    await axios.post(`${BASE_URL}/api/ugw/monitoring/rate-limits/${PLATFORM_ID}/reset`);
    console.log('✅ Rate limits reset\n');
  } catch (error) {
    console.log('⚠️  Could not reset (endpoint may need auth)\n');
  }

  console.log('📊 Test 1: Sequential Requests (baseline)');
  console.log('─'.repeat(50));
  
  for (let i = 1; i <= 5; i++) {
    const result = await makeRequest();
    console.log(`Request ${i}: ${result.status} - Remaining: ${result.headers.remainingMinute || 'N/A'} RPM`);
  }
  console.log('');

  console.log('📊 Test 2: Concurrent Burst (20 requests in parallel)');
  console.log('─'.repeat(50));
  
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(makeRequest());
  }
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.status === 200).length;
  const rateLimited = results.filter(r => r.status === 429).length;
  const lastResult = results[results.length - 1];
  
  console.log(`Total: ${results.length} requests`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Rate Limited: ${rateLimited}`);
  console.log(`Remaining: ${lastResult.headers.remainingMinute || 'N/A'} RPM`);
  console.log('');

  console.log('📊 Test 3: Check Stats via Monitoring API');
  console.log('─'.repeat(50));
  
  try {
    const statsResponse = await axios.get(`${BASE_URL}/api/ugw/monitoring/rate-limits/${PLATFORM_ID}`);
    const stats = statsResponse.data.platform;
    
    console.log(`Platform: ${stats.displayName}`);
    console.log(`Current: ${stats.current.minute}/${stats.limits.minute} (M), ${stats.current.hour}/${stats.limits.hour} (H), ${stats.current.day}/${stats.limits.day} (D)`);
    console.log(`Usage: ${stats.usage.minute} (M), ${stats.usage.hour} (H), ${stats.usage.day} (D)`);
  } catch (error: any) {
    console.log(`⚠️  Error fetching stats: ${error.message}`);
  }
  console.log('');

  console.log('📊 Test 4: Verify Rate Limit Enforcement (send 105 requests to 100 RPM limit)');
  console.log('─'.repeat(50));
  
  // Reset first
  try {
    await axios.post(`${BASE_URL}/api/ugw/monitoring/rate-limits/${PLATFORM_ID}/reset`);
    console.log('✅ Rate limits reset');
  } catch (error) {
    console.log('⚠️  Could not reset');
  }

  const enforcementPromises = [];
  for (let i = 0; i < 105; i++) {
    enforcementPromises.push(makeRequest());
  }
  
  const enforcementResults = await Promise.all(enforcementPromises);
  const successCount = enforcementResults.filter(r => r.status === 200).length;
  const limitedCount = enforcementResults.filter(r => r.status === 429).length;
  
  console.log(`Total: ${enforcementResults.length} requests`);
  console.log(`✅ Allowed: ${successCount} (expected ≤ 100)`);
  console.log(`❌ Blocked: ${limitedCount} (expected ≥ 5)`);
  
  if (successCount <= 100) {
    console.log('✅ Rate limiting working correctly!');
  } else {
    console.log('⚠️  WARNING: Rate limiter allowed too many requests!');
  }
  console.log('');

  console.log('✅ Concurrency Tests Complete!');
}

// Run tests
testConcurrency().catch(console.error);
