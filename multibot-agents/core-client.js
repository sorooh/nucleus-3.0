import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = process.env.CENTRAL_BASE_URL;
const HMAC_SECRET = process.env.SRH_HMAC_SECRET;
const JWT_TOKEN = process.env.JWT_TOKEN;

function generateSignature(payload) {
  const message = JSON.stringify(payload);
  return crypto.createHmac('sha256', HMAC_SECRET).update(message).digest('hex');
}

export async function notifyCore(event, data = {}) {
  try {
    const payload = {
      event,
      unit: process.env.SRH_UNIT_ID,
      source: process.env.SRH_SOURCE || process.env.SRH_UNIT_ID || 'External',
      timestamp: Date.now(),
      ...data
    };

    const signature = generateSignature(payload);
    
    // Include signature in payload (server expects it in body)
    const payloadWithSignature = { ...payload, signature };

    const response = await axios.post(
      `${BASE_URL}/api/agents/notify`,
      payloadWithSignature,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Core notification failed:', error.message);
    throw error;
  }
}

export async function sendPing(identity) {
  try {
    const payload = {
      event: 'ping',
      unit: process.env.SRH_UNIT_ID,
      uuid: identity.uuid,
      ip: identity.ip,
      agentType: identity.agentType,
      timestamp: Date.now()
    };

    const signature = generateSignature(payload);
    
    // Include signature in payload (server expects it in body)
    const payloadWithSignature = { ...payload, signature };

    const response = await axios.post(
      `${BASE_URL}/api/agents/ping`,
      payloadWithSignature,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Ping failed:', error.message);
    throw error;
  }
}

export async function checkCoreStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/stats`, {
      timeout: 5000
    });
    return response.data.success;
  } catch (error) {
    return false;
  }
}
