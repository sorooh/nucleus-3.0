/**
 * ═══════════════════════════════════════════════════════════
 * Integration Hub WebSocket - Real-time Platform Updates
 * ═══════════════════════════════════════════════════════════
 * Phase 3: WebSocket للتحديثات اللحظية بدلاً من Polling
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db';
import { integrationNuclei, platformLinks } from '../shared/schema';

interface HubClient {
  ws: WebSocket;
  id: string;
  subscribedPlatforms: Set<string>; // Platform IDs to watch
  isAlive: boolean;
  lastHeartbeat: number;
}

const hubClients = new Map<string, HubClient>();
let broadcastInterval: NodeJS.Timeout | null = null;

/**
 * Setup Integration Hub WebSocket Server
 */
export function setupIntegrationHubWebSocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/integration-hub'
  });

  console.log('[IntegrationHub WS] 🔌 WebSocket server initialized on /ws/integration-hub');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const clientId = `hub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[IntegrationHub WS] 🔗 New connection: ${clientId} from ${clientIp}`);

    // Create client
    const client: HubClient = {
      ws,
      id: clientId,
      subscribedPlatforms: new Set(),
      isAlive: true,
      lastHeartbeat: Date.now()
    };

    hubClients.set(clientId, client);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to Integration Hub WebSocket',
      timestamp: Date.now()
    }));

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'ping':
            client.isAlive = true;
            client.lastHeartbeat = Date.now();
            ws.send(JSON.stringify({ 
              type: 'pong', 
              timestamp: Date.now() 
            }));
            break;

          case 'subscribe':
            // Subscribe to specific platform updates
            if (message.platformId) {
              client.subscribedPlatforms.add(message.platformId);
              console.log(`[IntegrationHub WS] ✅ ${clientId} subscribed to ${message.platformId}`);
            } else if (message.all) {
              // Subscribe to all platforms
              const platforms = await db.select().from(integrationNuclei);
              platforms.forEach(p => client.subscribedPlatforms.add(p.id));
              console.log(`[IntegrationHub WS] ✅ ${clientId} subscribed to ALL platforms`);
            }
            ws.send(JSON.stringify({
              type: 'subscribed',
              platformIds: Array.from(client.subscribedPlatforms),
              timestamp: Date.now()
            }));
            break;

          case 'unsubscribe':
            if (message.platformId) {
              client.subscribedPlatforms.delete(message.platformId);
              console.log(`[IntegrationHub WS] ❌ ${clientId} unsubscribed from ${message.platformId}`);
            }
            break;

          case 'get_status':
            // Send current status immediately
            await sendPlatformUpdates(client);
            break;

          default:
            console.log(`[IntegrationHub WS] ⚠️ Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('[IntegrationHub WS] ❌ Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`[IntegrationHub WS] 🔌 Client disconnected: ${clientId}`);
      hubClients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`[IntegrationHub WS] ❌ Client error (${clientId}):`, error);
      hubClients.delete(clientId);
    });
  });

  // Start periodic broadcast (every 5 seconds for real-time feel)
  startBroadcast();

  // Heartbeat check every 30 seconds
  const heartbeatInterval = setInterval(() => {
    hubClients.forEach((client, clientId) => {
      if (!client.isAlive || Date.now() - client.lastHeartbeat > 60000) {
        console.log(`[IntegrationHub WS] 💀 Removing dead client: ${clientId}`);
        client.ws.terminate();
        hubClients.delete(clientId);
      } else {
        client.isAlive = false;
        client.ws.ping();
      }
    });
  }, 30000);

  wss.on('close', () => {
    if (broadcastInterval) clearInterval(broadcastInterval);
    clearInterval(heartbeatInterval);
  });
}

/**
 * Start periodic broadcast of platform updates
 */
function startBroadcast() {
  if (broadcastInterval) return;

  // Broadcast every 5 seconds
  broadcastInterval = setInterval(async () => {
    if (hubClients.size === 0) return;

    // Get all platforms
    const platforms = await db.select().from(integrationNuclei).catch(() => []);
    if (platforms.length === 0) return;

    // Broadcast to all connected clients
    hubClients.forEach(async (client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        await sendPlatformUpdates(client);
      }
    });
  }, 5000);

  console.log('[IntegrationHub WS] 📡 Broadcast started (every 5s)');
}

/**
 * Send platform updates to a specific client
 */
async function sendPlatformUpdates(client: HubClient) {
  try {
    // Get platforms based on subscription
    let platforms;
    if (client.subscribedPlatforms.size === 0) {
      // Not subscribed to anything, send all
      platforms = await db.select().from(integrationNuclei);
    } else {
      // Send only subscribed platforms
      platforms = await db.select().from(integrationNuclei);
      platforms = platforms.filter(p => client.subscribedPlatforms.has(p.id));
    }

    if (platforms.length === 0) return;

    // Send update
    client.ws.send(JSON.stringify({
      type: 'platform_update',
      platforms: platforms.map(p => ({
        id: p.id,
        displayName: p.displayName,
        status: p.status,
        health: p.health,
        timestamp: Date.now()
      })),
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('[IntegrationHub WS] ❌ Error sending updates:', error);
  }
}

/**
 * Broadcast platform status change to all connected clients
 */
export function broadcastPlatformStatusChange(platformId: string, status: string) {
  hubClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      // Only send if client is subscribed to this platform or subscribed to all
      if (client.subscribedPlatforms.size === 0 || client.subscribedPlatforms.has(platformId)) {
        client.ws.send(JSON.stringify({
          type: 'status_change',
          platformId,
          status,
          timestamp: Date.now()
        }));
      }
    }
  });

  console.log(`[IntegrationHub WS] 📢 Broadcasted status change: ${platformId} → ${status}`);
}

/**
 * Broadcast new platform connection
 */
export function broadcastNewConnection(sourcePlatformId: string, targetPlatformId: string) {
  hubClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'new_connection',
        sourcePlatformId,
        targetPlatformId,
        timestamp: Date.now()
      }));
    }
  });

  console.log(`[IntegrationHub WS] 📢 Broadcasted new connection: ${sourcePlatformId} → ${targetPlatformId}`);
}
