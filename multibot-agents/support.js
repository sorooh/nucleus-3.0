import { notifyCore } from './core-client.js';
import { getOrCreateIdentity } from './identity.js';
import { registerCommandHandler } from './control-channel.js';

let identity = null;
let isRunning = false;

export async function startSupport() {
  console.log('💬 Support Bot starting...');
  
  identity = await getOrCreateIdentity();
  
  // Register command handlers
  registerCommandHandler('start', handleStartCommand);
  registerCommandHandler('stop', handleStopCommand);
  registerCommandHandler('task', handleSupportTask);
  
  // Notify activation
  try {
    await notifyCore('activated', {
      uuid: identity.uuid,
      ip: identity.ip,
      agentType: 'support',
      name: process.env.BOT_NAME
    });
    console.log('✅ Support Bot activated - Nucleus notified');
  } catch (err) {
    console.error('⚠️  Activation notification failed:', err.message);
  }
  
  isRunning = true;
  console.log('💬 Support Bot ready - awaiting Nucleus commands');
}

function handleStartCommand(command) {
  console.log('▶️  START command received from Nucleus');
  isRunning = true;
  console.log('✅ Support operations started');
}

function handleStopCommand(command) {
  console.log('⏹️  STOP command received from Nucleus');
  isRunning = false;
  console.log('⏹️  Support operations stopped');
}

function handleSupportTask(command) {
  if (!isRunning) {
    console.warn('⚠️  Task received but Support is stopped - ignoring');
    return;
  }

  console.log('⚙️  Support task received:', command.task);
  
  switch (command.task) {
    case 'ANSWER_QUERY':
      console.log('❓ Answering user query...');
      // Query handling logic
      break;
    
    case 'ESCALATE_TICKET':
      console.log('🚨 Escalating ticket...');
      // Escalation logic
      break;
    
    case 'SEND_NOTIFICATION':
      console.log('📢 Sending notification...');
      // Notification logic
      break;
    
    default:
      console.warn('⚠️  Unknown support task:', command.task);
  }
}

export function stopSupport() {
  isRunning = false;
  console.log('💬 Support Bot stopped');
}
