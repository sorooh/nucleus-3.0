#!/usr/bin/env node
/**
 * Surooh MultiBot - Auto Config Fetcher
 * 
 * This script fetches .env config from Nucleus Core API
 * and saves it to .env file automatically
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const NUCLEUS_URL = process.env.NUCLEUS_URL || 'https://your-nucleus.replit.app';
const PLATFORM = process.env.PLATFORM || 'B2B';  // B2B, B2C, CE, Accounting, Shipping, etc.
const BOT_TYPE = process.env.BOT_TYPE || 'manager';  // manager, support, maintenance

async function fetchConfig() {
  try {
    console.log('🤖 Surooh MultiBot - Auto Config Fetcher');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Fetching config from: ${NUCLEUS_URL}`);
    console.log(`🏢 Platform: ${PLATFORM}`);
    console.log(`🤖 Bot Type: ${BOT_TYPE}`);
    console.log('');

    // Fetch config from Nucleus Core
    const apiUrl = `${NUCLEUS_URL}/api/multibot/config/${PLATFORM}/${BOT_TYPE}`;
    console.log(`📥 Requesting: ${apiUrl}`);
    
    const response = await axios.get(apiUrl);
    const data = response.data;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch config');
    }
    
    // Save .env file
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, data.envFile);
    
    console.log('');
    console.log('✅ Config fetched successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Saved to: ${envPath}`);
    console.log(`🏷️  Bot Name: ${data.botName}`);
    console.log(`🌐 Nucleus URL: ${data.nucleusUrl}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1️⃣  npm install');
    console.log('  2️⃣  npm start');
    console.log('');
    console.log('✨ Your bot will automatically connect to Nucleus Core!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error fetching config:', error.message);
    console.error('');
    console.error('💡 Make sure:');
    console.error('  - NUCLEUS_URL is correct');
    console.error('  - Platform name is valid (B2B, B2C, CE, Accounting, Shipping, etc.)');
    console.error('  - Bot type is valid (manager, support, maintenance)');
    console.error('');
    process.exit(1);
  }
}

// Run
fetchConfig();
