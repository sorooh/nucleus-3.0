/**
 * WebSocket Server for Nucleus 2.0
 * Built from absolute zero for real-time bidirectional communication
 * 
 * Enables instant connection between:
 * - Mail Hub Core ↔ Central Memory Core
 * - All Surooh Platforms ↔ Nucleus
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import type { IncomingMessage } from 'http';
import type { IntegrationMessage, PlatformType } from '../integration/types';
import { verifyJWT } from './jwt-utils';

interface WSClient {
  id: string;
  platform: PlatformType;
  socket: WebSocket;
  authenticated: boolean;
  connectedAt: Date;
  lastActivity: Date;
}

interface WSMessage {
  type: 'auth' | 'data' | 'ping' | 'pong' | 'ack' | 'error';
  platform?: PlatformType;
  payload?: any;
  token?: string;
  messageId?: string;
  timestamp: string;
}

export class NucleusWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private clientCounter: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private active: boolean = false;
  private jwtSecret: string;

  constructor() {
    super();
    this.jwtSecret = process.env.JWT_SECRET || 'nucleus-2.0-jwt-secret';
    console.log('[WebSocketServer] Initialized (from absolute zero)');
  }

  /**
   * Start WebSocket Server
   */
  start(server: any): void {
    if (this.active) {
      console.log('[WebSocketServer] Already running');
      return;
    }

    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/nucleus',
      perMessageDeflate: false, // Disable compression to fix RSV1 frame errors
      verifyClient: (info: { origin: string; req: IncomingMessage }) => {
        // In production, verify origin and authentication
        return true;
      }
    });

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });

    // Start heartbeat monitor
    this.startHeartbeat();

    this.active = true;
    console.log('🔌 WebSocket Server activated on /ws/nucleus');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const clientId = `WS-${Date.now()}-${++this.clientCounter}`;
    
    const client: WSClient = {
      id: clientId,
      platform: 'B2B', // Default, will be updated on auth
      socket,
      authenticated: false,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.clients.set(clientId, client);
    console.log(`[WebSocket] Client connected: ${clientId} (total: ${this.clients.size})`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'ack',
      payload: { 
        message: 'Connected to Nucleus WebSocket Server',
        clientId,
        requiresAuth: true
      },
      timestamp: new Date().toISOString()
    });

    // Handle messages
    socket.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    // Handle close
    socket.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(`[WebSocket] Error on client ${clientId}:`, error.message);
      this.handleDisconnect(clientId);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WSMessage = JSON.parse(data.toString());
      client.lastActivity = new Date();

      switch (message.type) {
        case 'auth':
          this.handleAuth(clientId, message);
          break;

        case 'data':
          if (!client.authenticated) {
            this.sendError(clientId, 'Authentication required');
            return;
          }
          this.handleData(clientId, message);
          break;

        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;

        default:
          this.sendError(clientId, `Unknown message type: ${message.type}`);
      }
    } catch (error: any) {
      console.error(`[WebSocket] Failed to parse message from ${clientId}:`, error.message);
      this.sendError(clientId, 'Invalid message format');
    }
  }

  /**
   * Handle authentication
   */
  private handleAuth(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!message.token) {
      this.sendError(clientId, 'Missing authentication token');
      client.socket.close();
      this.handleDisconnect(clientId);
      return;
    }

    // Verify JWT token
    const payload = verifyJWT(message.token, this.jwtSecret);
    
    if (!payload) {
      this.sendError(clientId, 'Invalid or expired token');
      client.socket.close();
      this.handleDisconnect(clientId);
      return;
    }

    // Verify platform matches
    if (message.platform && payload.platform !== message.platform) {
      this.sendError(clientId, 'Platform mismatch');
      client.socket.close();
      this.handleDisconnect(clientId);
      return;
    }

    // Authentication successful
    client.authenticated = true;
    client.platform = payload.platform as PlatformType;

    this.sendToClient(clientId, {
      type: 'ack',
      payload: { 
        message: 'Authentication successful',
        platform: client.platform
      },
      timestamp: new Date().toISOString()
    });

    this.emit('client-authenticated', {
      clientId,
      platform: client.platform
    });

    console.log(`[WebSocket] Client ${clientId} authenticated as ${client.platform}`);
  }

  /**
   * Handle data message
   */
  private handleData(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Emit to Knowledge Bus for processing
    this.emit('message-received', {
      clientId,
      platform: client.platform,
      message: message.payload
    });

    // Send acknowledgment
    this.sendToClient(clientId, {
      type: 'ack',
      messageId: message.messageId,
      payload: { status: 'received' },
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] Data received from ${client.platform} (${clientId})`);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to client
   */
  private sendError(clientId: string, error: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      payload: { error },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all authenticated clients of a platform
   */
  broadcastToPlatform(platform: PlatformType, message: IntegrationMessage): void {
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      if (client.authenticated && client.platform === platform) {
        this.sendToClient(clientId, {
          type: 'data',
          platform,
          payload: message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Broadcast to all authenticated clients
   */
  broadcastToAll(message: any): void {
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      if (client.authenticated) {
        this.sendToClient(clientId, {
          type: 'data',
          payload: message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);
    
    this.emit('client-disconnected', {
      clientId,
      platform: client.platform
    });

    console.log(`[WebSocket] Client disconnected: ${clientId} (${client.platform}) - remaining: ${this.clients.size}`);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of Array.from(this.clients.entries())) {
        const inactiveTime = now - client.lastActivity.getTime();
        
        // Disconnect if inactive for 2 minutes
        if (inactiveTime > 120000) {
          console.log(`[WebSocket] Client ${clientId} timeout - disconnecting`);
          client.socket.close();
          this.handleDisconnect(clientId);
        }
        // Send ping if inactive for 30 seconds
        else if (inactiveTime > 30000 && client.authenticated) {
          this.sendToClient(clientId, {
            type: 'ping',
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 30000); // Check every 30 seconds

    console.log('[WebSocket] Heartbeat monitor started');
  }

  /**
   * Get connected clients stats
   */
  getStats() {
    const stats = {
      total: this.clients.size,
      authenticated: 0,
      byPlatform: {} as Record<string, number>
    };

    for (const client of Array.from(this.clients.values())) {
      if (client.authenticated) {
        stats.authenticated++;
        stats.byPlatform[client.platform] = (stats.byPlatform[client.platform] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      client.socket.close();
    }

    if (this.wss) {
      this.wss.close();
    }

    this.active = false;
    this.clients.clear();
    console.log('[WebSocket] Server shut down');
  }
}

// Singleton instance
export const websocketServer = new NucleusWebSocketServer();
