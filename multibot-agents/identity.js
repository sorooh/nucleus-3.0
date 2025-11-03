import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import axios from 'axios';

const IDENTITY_FILE = './bot_identity.json';

export async function getOrCreateIdentity() {
  try {
    // Try to load existing identity
    const data = await fs.readFile(IDENTITY_FILE, 'utf-8');
    const identity = JSON.parse(data);
    console.log('✅ Loaded existing identity:', identity.uuid);
    return identity;
  } catch (err) {
    // Create new identity
    console.log('🆕 Creating new bot identity...');
    
    // Get public IP
    let ip = 'unknown';
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      ip = response.data.ip;
    } catch (e) {
      console.warn('⚠️  Could not fetch IP:', e.message);
    }

    const identity = {
      uuid: randomUUID(),
      ip,
      unit: process.env.SRH_UNIT_ID,
      agentType: process.env.BOT_AGENT_TYPE || 'manager',
      name: process.env.BOT_NAME || 'Unknown Bot',
      activated: new Date().toISOString()
    };

    // Save to file
    await fs.writeFile(IDENTITY_FILE, JSON.stringify(identity, null, 2));
    console.log('✅ Identity created:', identity.uuid);
    
    return identity;
  }
}

export async function updateIdentity(updates) {
  try {
    const data = await fs.readFile(IDENTITY_FILE, 'utf-8');
    const identity = JSON.parse(data);
    const updated = { ...identity, ...updates };
    await fs.writeFile(IDENTITY_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } catch (err) {
    console.error('❌ Error updating identity:', err.message);
    throw err;
  }
}
