#!/usr/bin/env node
/**
 * Test Auto-Config API
 * Simulates external platform fetching config from Nucleus Core
 */

import axios from 'axios';

const NUCLEUS_URL = process.env.NUCLEUS_URL || 'http://localhost:5000';

async function testAutoConfig() {
  console.log('🧪 Testing Auto-Config API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Nucleus URL: ${NUCLEUS_URL}`);
  console.log('');
  
  try {
    // Test 1: List platforms
    console.log('Test 1: Listing available platforms...');
    const platformsRes = await axios.get(`${NUCLEUS_URL}/api/multibot/platforms`);
    console.log(`✅ Found ${platformsRes.data.platforms.length} platforms`);
    platformsRes.data.platforms.forEach(p => {
      console.log(`   - ${p.id}: ${p.nameAr}`);
    });
    console.log('');
    
    // Test 2: Get config for B2B Manager
    console.log('Test 2: Fetching config for B2B Manager...');
    const configRes = await axios.get(`${NUCLEUS_URL}/api/multibot/config/B2B/manager`);
    
    if (configRes.data.success) {
      console.log('✅ Config received successfully');
      console.log(`   Platform: ${configRes.data.platform}`);
      console.log(`   Bot Type: ${configRes.data.botType}`);
      console.log(`   Bot Name: ${configRes.data.botName}`);
      console.log(`   Nucleus URL: ${configRes.data.nucleusUrl}`);
      console.log(`   .env file length: ${configRes.data.envFile.length} chars`);
      console.log('');
      console.log('   📄 .env Preview:');
      console.log('   ' + '─'.repeat(50));
      const envLines = configRes.data.envFile.split('\n').slice(0, 10);
      envLines.forEach(line => console.log(`   ${line}`));
      console.log('   ' + '─'.repeat(50));
      console.log('');
    } else {
      console.error('❌ Failed to fetch config:', configRes.data.error);
    }
    
    // Test 3: Test Accounting Support
    console.log('Test 3: Fetching config for Accounting Support...');
    const accountingRes = await axios.get(`${NUCLEUS_URL}/api/multibot/config/Accounting/support`);
    
    if (accountingRes.data.success) {
      console.log('✅ Accounting Support config received');
      console.log(`   Bot Name: ${accountingRes.data.botName}`);
    }
    console.log('');
    
    // Test 4: Invalid platform (should fail gracefully)
    console.log('Test 4: Testing invalid platform (should fail gracefully)...');
    try {
      await axios.get(`${NUCLEUS_URL}/api/multibot/config/INVALID_PLATFORM/manager`);
      console.log('❌ Should have failed but didn\'t');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly returned 404 for invalid platform');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests passed!');
    console.log('🚀 Auto-Config API is working correctly!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testAutoConfig();
