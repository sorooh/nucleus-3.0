import { notifyCore, sendPing, checkCoreStatus } from './core-client.js';
import { getOrCreateIdentity } from './identity.js';
import { registerCommandHandler } from './control-channel.js';

let identity = null;
let pingInterval = null;
let failedPings = 0;
let isRunning = false;
const MAX_FAILED_PINGS = 3;

export async function startManager() {
  console.log('👔 Manager Bot starting...');
  
  // Get or create identity
  identity = await getOrCreateIdentity();
  
  // Register command handlers
  registerCommandHandler('start', handleStartCommand);
  registerCommandHandler('stop', handleStopCommand);
  registerCommandHandler('restart', handleRestartCommand);
  registerCommandHandler('task', handleTaskCommand);
  
  // Notify activation (must wait for Nucleus approval)
  try {
    await notifyCore('activated', {
      uuid: identity.uuid,
      ip: identity.ip,
      agentType: 'manager',
      name: process.env.BOT_NAME
    });
    console.log('✅ Manager activated - Nucleus notified');
  } catch (err) {
    console.error('⚠️  Activation notification failed:', err.message);
  }

  // Start ping system
  startPingSystem();
  
  isRunning = true;
  console.log('👔 Manager Bot ready - awaiting Nucleus commands');
}

function handleStartCommand(command) {
  console.log('▶️  START command received from Nucleus');
  isRunning = true;
  console.log('✅ Manager operations started');
}

function handleStopCommand(command) {
  console.log('⏹️  STOP command received from Nucleus');
  isRunning = false;
  console.log('⏹️  Manager operations stopped');
}

function handleRestartCommand(command) {
  console.log('🔄 RESTART command received from Nucleus');
  console.log('🔄 Restarting Manager Bot...');
  
  stopManager();
  setTimeout(() => startManager(), 2000);
}

function handleTaskCommand(command) {
  if (!isRunning) {
    console.warn('⚠️  Task received but Manager is stopped - ignoring');
    return;
  }

  console.log('⚙️  Task command received:', command.task);
  
  // Execute task based on type
  switch (command.task) {
    case 'SYNC_DATA':
      console.log('🔄 Syncing data...');
      // Data sync logic
      break;
    
    case 'PROCESS_QUEUE':
      console.log('📋 Processing queue...');
      // Queue processing logic
      break;
    
    case 'GENERATE_REPORT':
      console.log('📊 Generating report...');
      // Report generation logic
      break;
    
    default:
      console.warn('⚠️  Unknown task:', command.task);
  }
}

function startPingSystem() {
  // Ping every 30 seconds
  pingInterval = setInterval(async () => {
    try {
      const response = await sendPing(identity);
      
      if (response.success) {
        failedPings = 0;
        console.log('💓 Ping successful');
      } else {
        failedPings++;
        console.warn('⚠️  Ping warning:', response.message);
      }
    } catch (err) {
      failedPings++;
      console.error(`❌ Ping failed (${failedPings}/${MAX_FAILED_PINGS})`);
      
      if (failedPings >= MAX_FAILED_PINGS) {
        console.error('🔴 Core connection lost - attempting recovery...');
        await attemptRecovery();
      }
    }
  }, 30000);
}

async function attemptRecovery() {
  clearInterval(pingInterval);
  
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 Recovery attempt ${attempts}/${maxAttempts}...`);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if core is back
    const isAlive = await checkCoreStatus();
    
    if (isAlive) {
      console.log('🟢 Core is back online!');
      
      // Notify reconnection
      await notifyCore('reconnected', {
        uuid: identity.uuid,
        ip: identity.ip,
        downtime: failedPings * 30,
        agentType: 'manager'
      });
      
      // Reset and restart
      failedPings = 0;
      startPingSystem();
      return;
    }
  }
  
  console.error('💥 Recovery failed - manual intervention required');
  process.exit(1);
}

export function stopManager() {
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  isRunning = false;
  console.log('👔 Manager Bot stopped');
}
