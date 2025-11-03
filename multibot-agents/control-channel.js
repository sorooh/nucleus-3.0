import WebSocket from 'ws';
import crypto from 'crypto';

let ws = null;
let isConnected = false;
let commandHandlers = new Map();
let pendingPermissions = new Map();

const WS_URL = process.env.CENTRAL_WS_URL || 'wss://localhost:5000/ws';
const HMAC_SECRET = process.env.SRH_HMAC_SECRET;

// Validate required environment variable
if (!HMAC_SECRET) {
  console.error('❌ ERROR: SRH_HMAC_SECRET is not defined in environment');
  console.error('⚠️  Please set SRH_HMAC_SECRET in .env file or environment variables');
  process.exit(1);
}

function generateSignature(data) {
  const message = JSON.stringify(data);
  return crypto.createHmac('sha256', HMAC_SECRET).update(message).digest('hex');
}

export function initControlChannel(identity) {
  return new Promise((resolve, reject) => {
    console.log('📡 Connecting to Nucleus Control Channel...');
    
    const wsUrl = `${WS_URL}/control?unit=${identity.unit}&uuid=${identity.uuid}`;
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      isConnected = true;
      console.log('✅ Control Channel connected');
      
      // Send authentication
      const authMessage = {
        type: 'AUTH',
        unit: identity.unit,
        uuid: identity.uuid,
        agentType: identity.agentType,
        timestamp: Date.now()
      };
      authMessage.signature = generateSignature(authMessage);
      ws.send(JSON.stringify(authMessage));
      
      resolve();
    });

    ws.on('message', (data) => {
      handleCommand(JSON.parse(data.toString()), identity);
    });

    ws.on('close', () => {
      isConnected = false;
      console.log('❌ Control Channel disconnected - reconnecting...');
      setTimeout(() => initControlChannel(identity), 5000);
    });

    ws.on('error', (err) => {
      console.error('❌ Control Channel error:', err.message);
      reject(err);
    });
  });
}

function handleCommand(command, identity) {
  console.log('📨 Command received:', command.type);

  switch (command.type) {
    case 'START_BOT':
      executeStart(command, identity);
      break;
    
    case 'STOP_BOT':
      executeStop(command, identity);
      break;
    
    case 'RESTART_BOT':
      executeRestart(command, identity);
      break;
    
    case 'GET_STATUS':
      sendStatus(command, identity);
      break;
    
    case 'EXECUTE_TASK':
      executeTask(command, identity);
      break;
    
    case 'PERMISSION_RESPONSE':
      handlePermissionResponse(command);
      break;
    
    case 'EMERGENCY_SHUTDOWN':
      emergencyShutdown(command);
      break;
    
    default:
      console.warn('⚠️  Unknown command:', command.type);
  }
}

function executeStart(command, identity) {
  // Verify signature
  if (!verifySignature(command)) {
    console.error('❌ Invalid signature - command rejected');
    return;
  }

  console.log('✅ START command verified - executing...');
  
  // Execute start logic
  if (commandHandlers.has('start')) {
    commandHandlers.get('start')(command);
  }

  // Send acknowledgment
  sendAck(command, 'started', identity);
}

function executeStop(command, identity) {
  if (!verifySignature(command)) {
    console.error('❌ Invalid signature - command rejected');
    return;
  }

  console.log('⏹️  STOP command verified - executing...');
  
  if (commandHandlers.has('stop')) {
    commandHandlers.get('stop')(command);
  }

  sendAck(command, 'stopped', identity);
}

function executeRestart(command, identity) {
  if (!verifySignature(command)) {
    console.error('❌ Invalid signature - command rejected');
    return;
  }

  console.log('🔄 RESTART command verified - executing...');
  
  if (commandHandlers.has('restart')) {
    commandHandlers.get('restart')(command);
  }

  sendAck(command, 'restarted', identity);
}

function executeTask(command, identity) {
  if (!verifySignature(command)) {
    console.error('❌ Invalid signature - command rejected');
    return;
  }

  console.log('⚙️  TASK command verified - executing:', command.task);
  
  if (commandHandlers.has('task')) {
    commandHandlers.get('task')(command);
  }

  sendAck(command, 'executed', identity);
}

function sendStatus(command, identity) {
  const status = {
    type: 'STATUS_REPORT',
    unit: identity.unit,
    uuid: identity.uuid,
    agentType: identity.agentType,
    state: isConnected ? 'active' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: Date.now(),
    requestId: command.requestId
  };

  status.signature = generateSignature(status);
  ws.send(JSON.stringify(status));
  console.log('📊 Status sent to Nucleus');
}

export async function requestPermission(action, details, identity) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    
    const request = {
      type: 'PERMISSION_REQUEST',
      requestId,
      unit: identity.unit,
      uuid: identity.uuid,
      agentType: identity.agentType,
      action,
      details,
      timestamp: Date.now()
    };

    request.signature = generateSignature(request);
    
    // Store pending request
    pendingPermissions.set(requestId, { resolve, reject, timeout: null });
    
    // Set timeout (30 seconds)
    const timeout = setTimeout(() => {
      pendingPermissions.delete(requestId);
      reject(new Error('Permission request timeout'));
    }, 30000);
    
    pendingPermissions.get(requestId).timeout = timeout;
    
    // Send request
    ws.send(JSON.stringify(request));
    console.log(`🔐 Permission requested: ${action}`);
  });
}

function handlePermissionResponse(response) {
  const pending = pendingPermissions.get(response.requestId);
  
  if (!pending) {
    console.warn('⚠️  Unknown permission response:', response.requestId);
    return;
  }

  clearTimeout(pending.timeout);
  pendingPermissions.delete(response.requestId);

  if (response.approved) {
    console.log(`✅ Permission APPROVED: ${response.action}`);
    pending.resolve(response);
  } else {
    console.log(`❌ Permission DENIED: ${response.action} - ${response.reason}`);
    pending.reject(new Error(`Permission denied: ${response.reason}`));
  }
}

function emergencyShutdown(command) {
  if (!verifySignature(command)) {
    console.error('❌ Invalid signature - emergency shutdown rejected');
    return;
  }

  console.error('🚨 EMERGENCY SHUTDOWN command received from Nucleus');
  console.error('Reason:', command.reason);
  
  // Immediate shutdown
  process.exit(0);
}

function sendAck(command, status, identity) {
  const ack = {
    type: 'COMMAND_ACK',
    commandId: command.commandId,
    status,
    unit: identity.unit,
    uuid: identity.uuid,
    timestamp: Date.now()
  };

  ack.signature = generateSignature(ack);
  ws.send(JSON.stringify(ack));
}

function verifySignature(data) {
  const { signature, ...payload } = data;
  const expectedSignature = generateSignature(payload);
  return signature === expectedSignature;
}

export function registerCommandHandler(type, handler) {
  commandHandlers.set(type, handler);
  console.log(`✅ Handler registered: ${type}`);
}

export function isControlChannelConnected() {
  return isConnected;
}
