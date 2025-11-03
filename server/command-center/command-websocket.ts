/**
 * 🎮 Command Center WebSocket Server
 * ===================================
 * Real-time push notifications for Command Center dashboard
 * 
 * Features:
 * - Platform status updates
 * - Alert notifications
 * - SIDE distribution events
 * - Health metric changes
 * 
 * @supreme Nicholas commands in real-time
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface CommandWSClient {
  id: string;
  socket: WebSocket;
  authenticated: boolean;
  connectedAt: Date;
  lastActivity: Date;
}

interface CommandWSMessage {
  type: 'auth' | 'heartbeat' | 'subscribe' | 'unsubscribe';
  token?: string;
  channel?: string;
  timestamp?: string;
}

interface BroadcastEvent {
  type: 'platform_status' | 'alert' | 'side_distribution' | 'health_update';
  data: any;
  timestamp: string;
}

export class CommandWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, CommandWSClient> = new Map();
  private active: boolean = false;

  initialize(server: HTTPServer): void {
    if (this.active) {
      console.log('[CommandWS] Already initialized');
      return;
    }

    this.wss = new WebSocketServer({
      server,
      path: '/ws/command',
      perMessageDeflate: false,
      verifyClient: () => true, // Accept all connections
    });

    console.log('[CommandWS] WebSocket Server created at /ws/command');

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      console.error('[CommandWS] WebSocket Server error:', error);
    });

    this.startHeartbeat();
    this.active = true;
    console.log('🎮 Command Center WebSocket Server activated');
  }

  // HONEST: Counter for deterministic client IDs
  private clientCounter = 0;
  
  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const clientId = `CMD-${Date.now()}-${(this.clientCounter++).toString(36)}`;

    const client: CommandWSClient = {
      id: clientId,
      socket,
      authenticated: true, // Auto-authenticate for now (same domain)
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);
    console.log(`[CommandWS] ✅ Client connected: ${clientId} (total: ${this.clients.size})`);

    // Send welcome message
    this.sendMessage(socket, {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString(),
    });

    // Handle incoming messages
    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as CommandWSMessage;
        await this.handleMessage(clientId, message);
      } catch (error) {
        console.error('[CommandWS] Message parse error:', error);
      }
    });

    // Handle close
    socket.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[CommandWS] Socket error for ${clientId}:`, error);
      this.handleDisconnect(clientId);
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(clientId: string, message: CommandWSMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    switch (message.type) {
      case 'heartbeat':
        this.sendMessage(client.socket, {
          type: 'heartbeat_ack',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'subscribe':
        // Future: implement channel subscriptions
        console.log(`[CommandWS] Client ${clientId} subscribed to ${message.channel}`);
        break;

      default:
        console.log(`[CommandWS] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);
    console.log(`[CommandWS] ❌ Client disconnected: ${clientId} (remaining: ${this.clients.size})`);
  }

  /**
   * Send message to specific socket
   */
  private sendMessage(socket: WebSocket, data: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: BroadcastEvent): void {
    const message = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;
    for (const client of Array.from(this.clients.values())) {
      if (client.authenticated) {
        this.sendMessage(client.socket, message);
        sentCount++;
      }
    }

    console.log(`[CommandWS] 📡 Broadcasted ${event.type} to ${sentCount} clients`);
  }

  /**
   * Broadcast platform status update
   */
  broadcastPlatformStatus(platformId: string, status: any): void {
    this.broadcast({
      type: 'platform_status',
      data: {
        platformId,
        ...status,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast new alert
   */
  broadcastAlert(alert: any): void {
    this.broadcast({
      type: 'alert',
      data: alert,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast SIDE distribution event
   */
  broadcastSIDEDistribution(event: any): void {
    this.broadcast({
      type: 'side_distribution',
      data: event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast health update
   */
  broadcastHealthUpdate(platformId: string, healthData: any): void {
    this.broadcast({
      type: 'health_update',
      data: {
        platformId,
        ...healthData,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start heartbeat monitor
   */
  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute

      for (const [clientId, client] of Array.from(this.clients.entries())) {
        const inactive = now - client.lastActivity.getTime();
        
        if (inactive > timeout) {
          console.log(`[CommandWS] ⚠️ Client ${clientId} inactive for ${Math.floor(inactive / 1000)}s - closing`);
          client.socket.close();
          this.clients.delete(clientId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Check if server is active
   */
  isActive(): boolean {
    return this.active;
  }
}

// Global singleton instance
export const commandWebSocket = new CommandWebSocketServer();
