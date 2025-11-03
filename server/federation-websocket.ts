/**
 * Federation WebSocket Server - Nicholas 3.2
 * Built from absolute zero for real-time SIDE synchronization
 * 
 * Path: wss://nicholas.sorooh.ai/ws/federation
 * 
 * Features:
 * - Real-time bidirectional sync
 * - Heartbeat monitoring
 * - Broadcast capabilities
 * - Governance integration
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import type { IncomingMessage } from 'http';
import type { FederationNode } from '@shared/schema';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { federationNodes, federationSyncLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { governanceEngine } from '../nucleus/core/governance-engine';

interface FederationWSClient {
  id: string;
  nodeId: string;
  nodeType: string;
  socket: WebSocket;
  authenticated: boolean;
  connectedAt: Date;
  lastActivity: Date;
  lastHeartbeat: Date;
}

interface FederationWSMessage {
  type: 'auth' | 'sync' | 'broadcast' | 'heartbeat' | 'ack' | 'error';
  nodeId?: string;
  payload?: any;
  token?: string;
  messageId?: string;
  timestamp: string;
}

export class FederationWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, FederationWSClient> = new Map();
  private nodeConnections: Map<string, string> = new Map(); // nodeId -> clientId
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private active: boolean = false;
  private jwtSecret: string;

  constructor() {
    super();
    this.jwtSecret = process.env.JWT_SECRET || 'nicholas-3.2-federation-secret';
    console.log('[FederationWS] Initialized (from absolute zero)');
  }

  /**
   * Start Federation WebSocket Server
   */
  start(server: any): void {
    if (this.active) {
      console.log('[FederationWS] Already running');
      return;
    }

    this.wss = new WebSocketServer({
      server,
      path: '/ws/federation',
      perMessageDeflate: false,
      verifyClient: (info: { origin: string; req: IncomingMessage }) => {
        // Accept all connections - authentication happens after connection
        return true;
      }
    });

    console.log('[FederationWS] WebSocket Server created, listening on /ws/federation');

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      console.log('[FederationWS] ⚡ CONNECTION EVENT FIRED!');
      this.handleConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      console.error('[FederationWS] WebSocket Server error:', error);
    });

    // Start heartbeat monitor
    this.startHeartbeat();

    this.active = true;
    console.log('🔌 Federation WebSocket Server activated on /ws/federation');
  }

  // HONEST: Counter for deterministic client IDs
  private clientCounter = 0;
  
  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const clientId = `FED-WS-${Date.now()}-${(this.clientCounter++).toString(36)}`;

    const client: FederationWSClient = {
      id: clientId,
      nodeId: '',
      nodeType: '',
      socket,
      authenticated: false,
      connectedAt: new Date(),
      lastActivity: new Date(),
      lastHeartbeat: new Date()
    };

    this.clients.set(clientId, client);

    console.log(`[FederationWS] New connection: ${clientId} from ${request.socket.remoteAddress}`);

    // Try to authenticate from headers
    const authHeader = request.headers['authorization'];
    const nodeIdHeader = request.headers['x-node-id'] as string;
    
    if (authHeader && nodeIdHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        if (decoded.nodeId === nodeIdHeader) {
          client.authenticated = true;
          client.nodeId = nodeIdHeader;
          client.nodeType = decoded.nodeType || 'unknown';
          this.nodeConnections.set(nodeIdHeader, clientId);
          
          console.log(`[FederationWS] Auto-authenticated: ${nodeIdHeader}`);
          
          this.sendMessage(socket, {
            type: 'ack',
            payload: { 
              message: 'Authenticated successfully',
              nodeId: nodeIdHeader
            },
            timestamp: new Date().toISOString()
          });
          return;
        }
      } catch (error) {
        console.error('[FederationWS] Header auth failed:', error);
      }
    }

    // Request authentication if header auth failed
    this.sendMessage(socket, {
      type: 'auth',
      payload: { message: 'Authentication required' },
      timestamp: new Date().toISOString()
    });

    // Handle messages
    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as FederationWSMessage;
        await this.handleMessage(clientId, message);
      } catch (error) {
        console.error('[FederationWS] Message parse error:', error);
        this.sendError(socket, 'Invalid message format');
      }
    });

    // Handle close
    socket.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[FederationWS] Socket error for ${clientId}:`, error);
      this.handleDisconnect(clientId);
    });

    // Set timeout for authentication
    setTimeout(() => {
      const client = this.clients.get(clientId);
      if (client && !client.authenticated) {
        console.log(`[FederationWS] Auth timeout for ${clientId}`);
        this.sendError(client.socket, 'Authentication timeout');
        client.socket.close();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(clientId: string, message: FederationWSMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    switch (message.type) {
      case 'auth':
        await this.handleAuth(client, message);
        break;

      case 'heartbeat':
        await this.handleHeartbeat(client, message);
        break;

      case 'sync':
        await this.handleSync(client, message);
        break;

      case 'broadcast':
        await this.handleBroadcast(client, message);
        break;

      default:
        this.sendError(client.socket, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuth(client: FederationWSClient, message: FederationWSMessage): Promise<void> {
    try {
      if (!message.token) {
        this.sendError(client.socket, 'Missing authentication token');
        return;
      }

      // Verify JWT
      const decoded = jwt.verify(message.token, this.jwtSecret) as any;
      const nodeId = decoded.nodeId;

      if (!nodeId) {
        this.sendError(client.socket, 'Invalid token: missing nodeId');
        return;
      }

      // Get node from database
      const [node] = await db
        .select()
        .from(federationNodes)
        .where(eq(federationNodes.nodeId, nodeId))
        .limit(1);

      if (!node) {
        this.sendError(client.socket, 'Node not found');
        return;
      }

      if (node.status === 'suspended') {
        this.sendError(client.socket, 'Node is suspended');
        return;
      }

      // Verify token matches node
      if (node.authToken !== message.token) {
        this.sendError(client.socket, 'Invalid token');
        return;
      }

      // Governance check
      const decision = governanceEngine.submitDecision(
        nodeId,
        'ws_connect',
        { nodeId, nodeType: node.nodeType }
      );

      if (decision.status === 'rejected') {
        this.sendError(client.socket, `Connection rejected: ${decision.reason}`);
        return;
      }

      // Update client
      client.nodeId = nodeId;
      client.nodeType = node.nodeType;
      client.authenticated = true;
      this.nodeConnections.set(nodeId, client.id);

      // Update node in database
      await db
        .update(federationNodes)
        .set({
          status: 'active',
          lastHeartbeat: new Date()
        })
        .where(eq(federationNodes.nodeId, nodeId));

      console.log(`[FederationWS] Authenticated: ${nodeId} (${node.nodeType})`);

      // Send success
      this.sendMessage(client.socket, {
        type: 'ack',
        payload: {
          authenticated: true,
          nodeId,
          message: 'Connected to Nicholas 3.2 Federation Hub'
        },
        timestamp: new Date().toISOString()
      });

      this.emit('node-connected', { nodeId, nodeType: node.nodeType });
    } catch (error: any) {
      console.error('[FederationWS] Auth error:', error);
      this.sendError(client.socket, 'Authentication failed');
    }
  }

  /**
   * Handle heartbeat
   */
  private async handleHeartbeat(client: FederationWSClient, message: FederationWSMessage): Promise<void> {
    if (!client.authenticated) {
      this.sendError(client.socket, 'Not authenticated');
      return;
    }

    client.lastHeartbeat = new Date();

    // Update database
    await db
      .update(federationNodes)
      .set({
        lastHeartbeat: new Date(),
        health: message.payload?.health || 100
      })
      .where(eq(federationNodes.nodeId, client.nodeId));

    // Send ack
    this.sendMessage(client.socket, {
      type: 'ack',
      payload: { heartbeat: 'received' },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle sync request
   */
  private async handleSync(client: FederationWSClient, message: FederationWSMessage): Promise<void> {
    if (!client.authenticated) {
      this.sendError(client.socket, 'Not authenticated');
      return;
    }

    try {
      const { syncType, data } = message.payload || {};

      if (!syncType) {
        this.sendError(client.socket, 'Missing syncType');
        return;
      }

      // Governance check
      const decision = governanceEngine.submitDecision(
        client.nodeId,
        `sync_${syncType}`,
        { syncType, nodeId: client.nodeId }
      );

      if (decision.status === 'rejected') {
        this.sendError(client.socket, `Sync rejected: ${decision.reason}`);
        return;
      }

      // Log sync
      await db.insert(federationSyncLogs).values({
        nodeId: client.nodeId,
        syncType,
        direction: 'incoming',
        status: 'success',
        itemsProcessed: Array.isArray(data) ? data.length : 1,
        itemsFailed: 0,
        payload: data,
        completedAt: new Date()
      });

      // Update last sync
      await db
        .update(federationNodes)
        .set({ lastSync: new Date() })
        .where(eq(federationNodes.nodeId, client.nodeId));

      console.log(`[FederationWS] Sync completed: ${client.nodeId} - ${syncType}`);

      // Send ack
      this.sendMessage(client.socket, {
        type: 'ack',
        payload: { syncType, status: 'completed' },
        timestamp: new Date().toISOString()
      });

      this.emit('sync-completed', { nodeId: client.nodeId, syncType });
    } catch (error: any) {
      console.error('[FederationWS] Sync error:', error);
      this.sendError(client.socket, 'Sync failed');
    }
  }

  /**
   * Handle broadcast message
   */
  private async handleBroadcast(client: FederationWSClient, message: FederationWSMessage): Promise<void> {
    if (!client.authenticated) {
      this.sendError(client.socket, 'Not authenticated');
      return;
    }

    // Governance check
    const decision = governanceEngine.submitDecision(
      client.nodeId,
      'broadcast_message',
      { nodeId: client.nodeId }
    );

    if (decision.status === 'rejected') {
      this.sendError(client.socket, `Broadcast rejected: ${decision.reason}`);
      return;
    }

    // Broadcast to all authenticated clients except sender
    this.broadcastToAll(message.payload, client.nodeId);

    this.emit('broadcast', { from: client.nodeId, payload: message.payload });
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.authenticated) {
      console.log(`[FederationWS] Disconnected: ${client.nodeId}`);
      this.nodeConnections.delete(client.nodeId);

      // Update node status
      db.update(federationNodes)
        .set({ status: 'offline' })
        .where(eq(federationNodes.nodeId, client.nodeId))
        .catch(err => console.error('[FederationWS] DB update error:', err));

      this.emit('node-disconnected', { nodeId: client.nodeId });
    }

    this.clients.delete(clientId);
  }

  /**
   * Start heartbeat monitor
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 1 minute

      for (const [clientId, client] of Array.from(this.clients.entries())) {
        if (!client.authenticated) continue;

        const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > timeout) {
          console.log(`[FederationWS] Heartbeat timeout for ${client.nodeId}`);
          client.socket.close();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Send message to client
   */
  private sendMessage(socket: WebSocket, message: Partial<FederationWSMessage>): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to client
   */
  private sendError(socket: WebSocket, error: string): void {
    this.sendMessage(socket, {
      type: 'error',
      payload: { error },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast to all authenticated nodes
   */
  broadcastToAll(payload: any, excludeNodeId?: string): void {
    for (const client of Array.from(this.clients.values())) {
      if (!client.authenticated) continue;
      if (excludeNodeId && client.nodeId === excludeNodeId) continue;

      this.sendMessage(client.socket, {
        type: 'broadcast',
        payload,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send message to specific node
   */
  sendToNode(nodeId: string, payload: any): boolean {
    const clientId = this.nodeConnections.get(nodeId);
    if (!clientId) return false;

    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) return false;

    this.sendMessage(client.socket, {
      type: 'sync',
      payload,
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * Get connected nodes
   */
  getConnectedNodes(): Array<{ nodeId: string; nodeType: string; connectedAt: Date }> {
    const nodes: Array<{ nodeId: string; nodeType: string; connectedAt: Date }> = [];

    for (const client of Array.from(this.clients.values())) {
      if (client.authenticated) {
        nodes.push({
          nodeId: client.nodeId,
          nodeType: client.nodeType,
          connectedAt: client.connectedAt
        });
      }
    }

    return nodes;
  }

  /**
   * Stop server
   */
  stop(): void {
    if (!this.active) return;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const client of Array.from(this.clients.values())) {
      client.socket.close();
    }

    this.clients.clear();
    this.nodeConnections.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.active = false;
    console.log('[FederationWS] Stopped');
  }

  /**
   * Get status
   */
  getStatus(): {
    active: boolean;
    totalClients: number;
    authenticatedClients: number;
    connectedNodes: string[];
  } {
    const authenticatedClients = Array.from(this.clients.values()).filter(c => c.authenticated);

    return {
      active: this.active,
      totalClients: this.clients.size,
      authenticatedClients: authenticatedClients.length,
      connectedNodes: authenticatedClients.map(c => c.nodeId)
    };
  }
}

// Export singleton instance
export const federationWebSocket = new FederationWebSocketServer();

console.log('✅ Federation WebSocket Server initialized');
