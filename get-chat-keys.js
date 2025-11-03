#!/usr/bin/env node

/**
 * 🔑 Nucleus Secrets Extractor
 * 
 * هذا السكريبت يطبع المفاتيح المطلوبة لربط سروح الدردشة
 * شغله في Nucleus Core project:
 * 
 * node get-chat-keys.js
 */

console.log('═══════════════════════════════════════════════════════');
console.log('🔐 Nucleus 2.0 - API Keys for Surooh Chat');
console.log('═══════════════════════════════════════════════════════\n');

// Required secrets for Chat integration
const secrets = [
  'CHAT_HMAC_SECRET',
  'SRH_ROOT_SIGNATURE', 
  'JWT_SECRET',
  'CENTRAL_HMAC_SECRET',
  'SRH_HMAC_SECRET'
];

console.log('📋 Required Secrets:\n');

let allPresent = true;

secrets.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}`);
    console.log(`   ${value}\n`);
  } else {
    console.log(`❌ ${key} - NOT FOUND\n`);
    allPresent = false;
  }
});

console.log('═══════════════════════════════════════════════════════');

// Nucleus URL
const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
const replSlug = process.env.REPL_SLUG;
const replOwner = process.env.REPL_OWNER;

console.log('\n🌐 Nucleus API URL:\n');

let nucleusUrl = null;

if (replitDomain) {
  nucleusUrl = `https://${replitDomain}`;
  console.log(`✅ NUCLEUS_API_URL`);
  console.log(`   ${nucleusUrl}`);
} else if (replSlug && replOwner) {
  nucleusUrl = `https://${replSlug}.${replOwner}.repl.co`;
  console.log(`✅ NUCLEUS_API_URL`);
  console.log(`   ${nucleusUrl}`);
} else {
  console.log('❌ NUCLEUS_API_URL - NOT FOUND');
  console.log('   ⚠️  Run this in Replit to get production URL');
  console.log('   Development: http://localhost:5000');
  allPresent = false;
}

console.log('\n═══════════════════════════════════════════════════════\n');

if (allPresent) {
  console.log('✅ كل المفاتيح موجودة وجاهزة للاستخدام!\n');
  console.log('📝 الخطوات التالية:');
  console.log('   1. انسخ المفاتيح أعلاه');
  console.log('   2. احفظها في Replit Secrets لمشروع سروح الدردشة');
  console.log('   3. شغّل test-connection.js للتأكد من الربط\n');
} else {
  console.log('⚠️  بعض المفاتيح مفقودة!');
  console.log('   راجع Replit Secrets وتأكد من وجود كل المفاتيح\n');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════\n');
