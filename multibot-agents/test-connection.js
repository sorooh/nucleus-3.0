#!/usr/bin/env node

/**
 * Quick Test Script - Nucleus Connection
 * اختبار سريع للاتصال بالنواة
 */

require('dotenv').config();
const crypto = require('crypto');

// Check environment variables
console.log('\n🔍 Checking Configuration...\n');

const required = [
  'BOT_UNIT',
  'BOT_TYPE',
  'BOT_NAME',
  'NUCLEUS_API_URL',
  'SRH_HMAC_SECRET'
];

let hasErrors = false;

required.forEach(key => {
  if (!process.env[key]) {
    console.log(`❌ Missing: ${key}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key}: ${process.env[key]}`);
  }
});

if (hasErrors) {
  console.log('\n⚠️  Please configure missing variables in .env file\n');
  process.exit(1);
}

// Test HMAC signature generation
console.log('\n🔐 Testing HMAC Signature...\n');

const testPayload = {
  event: 'test',
  unit: process.env.BOT_UNIT,
  uuid: 'test-uuid',
  timestamp: Date.now()
};

const message = JSON.stringify(testPayload);
const signature = crypto
  .createHmac('sha256', process.env.SRH_HMAC_SECRET)
  .update(message)
  .digest('hex');

console.log(`✅ Signature generated: ${signature.substring(0, 16)}...`);

// Test Nucleus API connection
console.log('\n🌐 Testing Nucleus API Connection...\n');

const axios = require('axios').default || require('axios');

axios.get(`${process.env.NUCLEUS_API_URL}/api/health`)
  .then(response => {
    console.log(`✅ Nucleus Core is reachable!`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Message: ${response.data.message}`);
    console.log('\n🎉 All tests passed! Bot is ready to connect.\n');
  })
  .catch(error => {
    console.log(`❌ Cannot reach Nucleus Core`);
    console.log(`   URL: ${process.env.NUCLEUS_API_URL}/api/health`);
    console.log(`   Error: ${error.message}`);
    console.log('\n⚠️  Check NUCLEUS_API_URL in .env file\n');
    process.exit(1);
  });
