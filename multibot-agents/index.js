import 'dotenv/config';
import { startManager, stopManager } from './manager.js';
import { startSupport, stopSupport } from './support.js';
import { startMaintenance, stopMaintenance } from './maintenance.js';
import { initControlChannel } from './control-channel.js';
import { getOrCreateIdentity } from './identity.js';

console.log(`
╔══════════════════════════════════════════╗
║   Surooh MultiBot Agent v2.0             ║
║   Command & Control Protocol Enabled     ║
║   Unit: ${(process.env.SRH_UNIT_ID || 'NOT SET').padEnd(30)} ║
╚══════════════════════════════════════════╝
`);

// Validate environment
if (!process.env.CENTRAL_BASE_URL || !process.env.SRH_UNIT_ID) {
  console.error('❌ Missing required environment variables!');
  console.error('Please check your .env file');
  process.exit(1);
}

// Start all systems
async function start() {
  try {
    // Get identity first
    const identity = await getOrCreateIdentity();
    console.log(`🆔 Bot Identity: ${identity.uuid}`);
    console.log(`🌐 IP Address: ${identity.ip}`);
    console.log(`📍 Unit: ${identity.unit}\n`);
    
    // Initialize Control Channel (WebSocket connection to Nucleus)
    console.log('🔌 Initializing Command & Control Channel...');
    await initControlChannel(identity);
    console.log('✅ Control Channel active - listening for Nucleus commands\n');
    
    // Start all bots (they will now listen to Nucleus commands)
    console.log('🤖 Starting bot systems...');
    await startManager();
    await startSupport();
    await startMaintenance();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 All systems active and under Nucleus control!');
    console.log('⚡ Bots will only execute with Nucleus approval');
    console.log('🛡️  Security Protocol: HMAC-SHA256 signatures');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  stopManager();
  stopSupport();
  stopMaintenance();
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Start the system
start();
