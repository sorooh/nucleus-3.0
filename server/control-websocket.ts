import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import crypto from 'crypto';
import { handlePermissionRequest } from './agents-api';
import { db } from './db';
import { agents, agentCommands } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface ControlClient {
  ws: WebSocket;
  uuid: string;
  unit: string;
  agentType: string;
  ip: string;
  isAlive: boolean;
  lastHeartbeat: number;
}

const clients = new Map<string, ControlClient>();

export function setupControlWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/control'
  });

  wss.on('connection', async (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    let clientId: string | null = null;

    console.log(`[ControlWS] 🔗 New connection from ${clientIp}`);

    // Authentication handler
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle authentication (case-insensitive)
        if (message.type && message.type.toLowerCase() === 'auth') {
          const { uuid, unit, agentType, signature } = message;

          // Verify HMAC signature
          if (!verifySignature(message, signature)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'توقيع غير صالح - فشلت المصادقة' 
            }));
            ws.close();
            return;
          }

          // Store client
          clientId = uuid;
          clients.set(uuid, {
            ws,
            uuid,
            unit,
            agentType,
            ip: clientIp,
            isAlive: true,
            lastHeartbeat: Date.now()
          });

          console.log(`[ControlWS] ✅ Authenticated: ${agentType} (${unit}) - ${uuid}`);

          // Send confirmation
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'متصل بنجاح مع نواة سُروح - جاهز للأوامر',
            serverTime: Date.now()
          }));

          // Update agent status in database
          await db.update(agents)
            .set({ 
              status: 'connected',
              lastPing: new Date()
            })
            .where(eq(agents.uuid, uuid));

          return;
        }

        // Require authentication for all other messages
        if (!clientId || !clients.has(clientId)) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'غير مصادق - أرسل رسالة المصادقة أولاً' 
          }));
          return;
        }

        const client = clients.get(clientId)!;
        
        // Normalize message type to lowercase for case-insensitive matching
        const messageType = message.type?.toLowerCase();

        // Handle permission request
        if (messageType === 'permission_request') {
          console.log(`[ControlWS] 🔐 Permission request: ${message.action} from ${client.unit}`);

          const response = await handlePermissionRequest({
            requestId: message.requestId,
            unit: client.unit,
            uuid: client.uuid,
            agentType: client.agentType,
            action: message.action,
            details: message.details
          });

          // Send response back to bot
          ws.send(JSON.stringify({
            type: 'permission_response',
            requestId: message.requestId,
            approved: response.approved,
            reason: response.reason || null,
            serverTime: Date.now()
          }));

          return;
        }

        // Handle heartbeat/ping
        if (messageType === 'heartbeat') {
          client.isAlive = true;
          client.lastHeartbeat = Date.now();

          ws.send(JSON.stringify({
            type: 'heartbeat_ack',
            serverTime: Date.now()
          }));

          return;
        }

        // Handle status update (also accept STATUS_REPORT)
        if (messageType === 'status_update' || messageType === 'status_report') {
          console.log(`[ControlWS] 📊 Status update from ${client.agentType}: ${message.status}`);

          // Update database
          await db.update(agents)
            .set({ 
              status: message.status,
              metadata: message.metadata || {}
            })
            .where(eq(agents.uuid, client.uuid));

          return;
        }

        // Handle command acknowledgment (transient state - bot received command)
        if (messageType === 'command_ack') {
          console.log(`[ControlWS] 📨 Command acknowledged: ${message.commandId}`);

          // Update to acknowledged status (transient)
          await db.update(agentCommands)
            .set({
              status: 'acknowledged'
            })
            .where(eq(agentCommands.commandId, message.commandId));

          return;
        }

        // Handle command execution result (final state)
        if (messageType === 'command_result') {
          console.log(`[ControlWS] ✅ Command result received: ${message.commandId} - ${message.success ? 'Success' : 'Failed'}`);

          // Update command status with final result
          await db.update(agentCommands)
            .set({
              status: message.success ? 'executed' : 'failed',
              result: message.result,
              executedAt: new Date()
            })
            .where(eq(agentCommands.commandId, message.commandId));

          return;
        }

        // Unknown message type
        ws.send(JSON.stringify({
          type: 'error',
          message: `نوع رسالة غير معروف: ${messageType || message.type}`
        }));

      } catch (error: any) {
        console.error('[ControlWS] Message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    // Handle disconnection
    ws.on('close', async () => {
      if (clientId && clients.has(clientId)) {
        const client = clients.get(clientId)!;
        console.log(`[ControlWS] 🔌 Disconnected: ${client.agentType} (${client.unit})`);

        // Update database
        await db.update(agents)
          .set({ 
            status: 'disconnected',
            disconnectedAt: new Date()
          })
          .where(eq(agents.uuid, clientId));

        clients.delete(clientId);

        // TODO: Notify Surooh Chat about disconnection
      }
    });

    ws.on('error', (error) => {
      console.error('[ControlWS] WebSocket error:', error);
    });
  });

  // Heartbeat check interval (every 30 seconds)
  const heartbeatInterval = setInterval(() => {
    clients.forEach((client, uuid) => {
      const now = Date.now();
      const timeSinceLastHeartbeat = now - client.lastHeartbeat;

      // If no heartbeat for 2 minutes, consider dead
      if (timeSinceLastHeartbeat > 120000) {
        console.log(`[ControlWS] ☠️ Dead connection detected: ${uuid}`);
        
        client.ws.terminate();
        clients.delete(uuid);

        // Update database
        db.update(agents)
          .set({ 
            status: 'disconnected',
            disconnectedAt: new Date()
          })
          .where(eq(agents.uuid, uuid))
          .then(() => {
            console.log(`[ControlWS] Agent ${uuid} marked as disconnected`);
          });
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('[ControlWS] ✅ Control WebSocket Server ready at /ws/control');
}

// Helper: Send permission response to agent
export async function sendPermissionResponse(uuid: string, response: any) {
  const client = clients.get(uuid);
  
  if (!client) {
    console.error(`[ControlWS] Agent ${uuid} not connected for permission response`);
    return { success: false, error: 'Agent not connected' };
  }

  if (client.ws.readyState !== WebSocket.OPEN) {
    console.error(`[ControlWS] Agent ${uuid} WebSocket not open`);
    return { success: false, error: 'WebSocket not open' };
  }

  try {
    client.ws.send(JSON.stringify({
      type: 'permission_response',
      requestId: response.requestId,
      approved: response.approved,
      reason: response.reason || null,
      action: response.action,
      serverTime: Date.now()
    }));

    console.log(`[ControlWS] 📤 Permission response sent to ${uuid}: ${response.approved ? '✅ Approved' : '❌ Denied'}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[ControlWS] Error sending permission response:`, error);
    return { success: false, error: error.message };
  }
}

// Helper: Send command to specific agent
export async function sendCommandToAgent(uuid: string, command: any) {
  const client = clients.get(uuid);
  
  if (!client) {
    console.error(`[ControlWS] Agent ${uuid} not connected`);
    return { success: false, error: 'Agent not connected' };
  }

  if (client.ws.readyState !== WebSocket.OPEN) {
    console.error(`[ControlWS] Agent ${uuid} WebSocket not open`);
    return { success: false, error: 'WebSocket not open' };
  }

  try {
    client.ws.send(JSON.stringify({
      type: 'command',
      commandId: command.commandId,
      action: command.action,
      payload: command.payload,
      serverTime: Date.now()
    }));

    console.log(`[ControlWS] 📤 Command sent to ${uuid}: ${command.action}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[ControlWS] Error sending command:`, error);
    return { success: false, error: error.message };
  }
}

// Helper: Broadcast to all agents
export function broadcastToAgents(message: any) {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'broadcast',
        ...message,
        serverTime: Date.now()
      }));
    }
  });
  console.log(`[ControlWS] 📡 Broadcast sent to ${clients.size} agents`);
}

// Helper: Get connected agents count
export function getConnectedAgents() {
  return {
    total: clients.size,
    agents: Array.from(clients.values()).map(c => ({
      uuid: c.uuid,
      unit: c.unit,
      agentType: c.agentType,
      ip: c.ip,
      isAlive: c.isAlive
    }))
  };
}

// Helper: Verify HMAC signature
function verifySignature(payload: any, signature: string): boolean {
  const secret = process.env.SRH_HMAC_SECRET || process.env.CENTRAL_HMAC_SECRET;
  if (!secret) {
    console.warn('[ControlWS] No HMAC secret configured');
    return false;
  }
  
  const { signature: _, ...data } = payload;
  const message = JSON.stringify(data);
  const expectedSignature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  
  return signature === expectedSignature;
}
