import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';

// Generate platform-specific HMAC secret (matches server logic)
function generatePlatformSecret(platform: string): string {
  const masterSeed = process.env.SRH_HMAC_SECRET || 'test-secret-key';
  return crypto
    .createHash('sha256')
    .update(`${platform}:${masterSeed}`)
    .digest('hex');
}

function generateSignature(payload: any, platform: string): string {
  const message = JSON.stringify(payload);
  const secret = generatePlatformSecret(platform);
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

interface BotConfig {
  unit: string;
  agentType: string;
  name: string;
}

async function activateBot(config: BotConfig) {
  const uuid = crypto.randomUUID();
  const ip = '127.0.0.1';

  const payload = {
    event: 'activated',
    unit: config.unit,
    uuid,
    ip,
    agentType: config.agentType,
    name: config.name,
    source: 'Nucleus_Internal', // Internal test bots
    timestamp: Date.now()
  };

  const signature = generateSignature(payload, config.unit);
  
  // Add signature to payload (server expects it in body)
  const payloadWithSignature = { ...payload, signature };

  try {
    const response = await fetch(
      `${BASE_URL}/api/agents/notify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadWithSignature)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log(`✅ ${config.name} activated successfully`);
    console.log(`   UUID: ${uuid}`);
    
    // Start sending pings
    startPinging(uuid, config);
    
    return { success: true, uuid };
  } catch (error: any) {
    console.error(`❌ Failed to activate ${config.name}:`, error.message);
    return { success: false, error: error.message };
  }
}

function startPinging(uuid: string, config: BotConfig) {
  setInterval(async () => {
    const payload = {
      event: 'ping',
      unit: config.unit,
      uuid,
      ip: '127.0.0.1',
      agentType: config.agentType,
      timestamp: Date.now()
    };

    const signature = generateSignature(payload, config.unit);
    const payloadWithSignature = { ...payload, signature };

    try {
      const response = await fetch(
        `${BASE_URL}/api/agents/ping`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payloadWithSignature)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`💓 ${config.name} ping sent`);
    } catch (error: any) {
      console.error(`❌ Ping failed for ${config.name}:`, error.message);
    }
  }, 20000); // Ping every 20 seconds
}

export async function startSimpleTestBots() {
  console.log('\n🤖 Starting Simple Test Bots (REST API only)...\n');

  const bots: BotConfig[] = [
    {
      unit: 'Nucleus_Internal',
      agentType: 'manager',
      name: 'Test Manager Bot (REST)'
    },
    {
      unit: 'Nucleus_Internal',
      agentType: 'support',
      name: 'Test Support Bot (REST)'
    },
    {
      unit: 'Nucleus_Internal',
      agentType: 'maintenance',
      name: 'Test Maintenance Bot (REST)'
    }
  ];

  for (const bot of bots) {
    await activateBot(bot);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ All simple test bots activated!\n');
}
