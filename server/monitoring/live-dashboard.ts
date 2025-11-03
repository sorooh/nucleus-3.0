/**
 * Nucleus 3.0 - Live Monitoring Dashboard (WebSocket)
 * 
 * لوحة المراقبة في الوقت الحقيقي باستخدام WebSocket
 * تبث المقاييس والأحداث للعملاء المتصلين
 */

import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { getMetrics } from '../../nucleus/core/metrics';
import { getHealthCheck } from '../health/health-checks';
import { getErrorRecovery } from '../../nucleus/core/error-recovery';

/**
 * Dashboard Message Types
 */
type DashboardMessageType =
  | 'metrics_update'
  | 'health_status'
  | 'error_event'
  | 'circuit_breaker_status'
  | 'rate_limit_event'
  | 'ai_decision_event'
  | 'system_status';

/**
 * Dashboard Message Interface
 */
interface DashboardMessage {
  type: DashboardMessageType;
  data: any;
  timestamp: string;
}

/**
 * Client Connection Interface
 */
interface ClientConnection {
  id: string;
  ws: WebSocket;
  connectedAt: number;
  subscriptions: Set<DashboardMessageType>;
}

/**
 * Live Dashboard System
 */
export class LiveDashboard extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ClientConnection>();
  private metricsBuffer: any[] = [];
  private eventsBuffer: DashboardMessage[] = [];
  private maxBufferSize = 1000;

  // Metrics and health check instances
  private metrics = getMetrics();
  private healthCheck = getHealthCheck();
  private errorRecovery = getErrorRecovery();

  // Broadcast intervals
  private metricsInterval?: NodeJS.Timeout;
  private healthInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: any): void {
    if (this.wss) {
      console.warn('[LiveDashboard] Already initialized');
      return;
    }

    this.wss = new WebSocketServer({ server, path: '/api/live/dashboard' });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      this.handleConnection(clientId, ws, request);
    });

    this.startBroadcasting();

    console.log('[LiveDashboard] Initialized WebSocket server');
  }

  /**
   * Handle new client connection
   */
  private handleConnection(clientId: string, ws: WebSocket, request: any): void {
    const client: ClientConnection = {
      id: clientId,
      ws,
      connectedAt: Date.now(),
      subscriptions: new Set<DashboardMessageType>(['metrics_update', 'health_status', 'system_status']),
    };

    this.clients.set(clientId, client);

    console.log(`[LiveDashboard] Client ${clientId} connected (total: ${this.clients.size})`);

    // Send welcome message with current status
    this.sendToClient(clientId, {
      type: 'system_status',
      data: {
        connected: true,
        clientId,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    // Send current metrics
    this.sendMetricsToClient(clientId);

    // Setup message handler
    ws.on('message', (message: string) => {
      this.handleClientMessage(clientId, message);
    });

    // Setup close handler
    ws.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    // Setup error handler
    ws.on('error', (error) => {
      console.error(`[LiveDashboard] WebSocket error for client ${clientId}:`, error);
    });

    this.emit('client-connected', { clientId, address: request.socket.remoteAddress });
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[LiveDashboard] Client ${clientId} disconnected (remaining: ${this.clients.size})`);
    this.emit('client-disconnected', { clientId });
  }

  /**
   * Handle incoming client message
   */
  private handleClientMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message);

      switch (data.action) {
        case 'subscribe':
          this.subscribeClient(clientId, data.topics);
          break;

        case 'unsubscribe':
          this.unsubscribeClient(clientId, data.topics);
          break;

        case 'get_metrics':
          this.sendMetricsToClient(clientId);
          break;

        case 'get_health':
          this.sendHealthToClient(clientId);
          break;

        case 'get_circuit_status':
          this.sendCircuitStatusToClient(clientId);
          break;

        default:
          console.warn(`[LiveDashboard] Unknown action from client ${clientId}:`, data.action);
      }
    } catch (error) {
      console.error(`[LiveDashboard] Error parsing client message:`, error);
    }
  }

  /**
   * Subscribe client to topics
   */
  private subscribeClient(clientId: string, topics: DashboardMessageType[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    for (const topic of topics) {
      client.subscriptions.add(topic);
    }

    this.sendToClient(clientId, {
      type: 'system_status',
      data: {
        subscribed: Array.from(client.subscriptions),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribe client from topics
   */
  private unsubscribeClient(clientId: string, topics: DashboardMessageType[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    for (const topic of topics) {
      client.subscriptions.delete(topic);
    }

    this.sendToClient(clientId, {
      type: 'system_status',
      data: {
        subscribed: Array.from(client.subscriptions),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Setup event listeners for metrics and errors
   */
  private setupEventListeners(): void {
    // Listen to metrics events
    this.metrics.on('counter-incremented', (data) => {
      this.broadcastEvent('metrics_update', data);
    });

    this.metrics.on('api-request-recorded', (data) => {
      this.broadcastEvent('metrics_update', { type: 'api_request', ...data });
    });

    this.metrics.on('ai-decision-recorded', (data) => {
      this.broadcastEvent('ai_decision_event', data);
    });

    this.metrics.on('rate-limit-recorded', (data) => {
      this.broadcastEvent('rate_limit_event', data);
    });

    this.metrics.on('error-recorded', (data) => {
      this.broadcastEvent('error_event', data);
    });

    // Listen to error recovery events
    this.errorRecovery.on('circuit-opened', (data) => {
      this.broadcastEvent('circuit_breaker_status', { state: 'open', ...data });
    });

    this.errorRecovery.on('circuit-closed', (data) => {
      this.broadcastEvent('circuit_breaker_status', { state: 'closed', ...data });
    });

    this.errorRecovery.on('circuit-half-open', (data) => {
      this.broadcastEvent('circuit_breaker_status', { state: 'half-open', ...data });
    });

    this.errorRecovery.on('error-recorded', (data) => {
      this.broadcastEvent('error_event', data);
    });
  }

  /**
   * Start periodic broadcasting
   */
  private startBroadcasting(): void {
    // Broadcast metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.broadcastMetrics();
    }, 5000);

    // Broadcast health status every 30 seconds
    this.healthInterval = setInterval(async () => {
      await this.broadcastHealth();
    }, 30000);
  }

  /**
   * Stop periodic broadcasting
   */
  stopBroadcasting(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = undefined;
    }
  }

  /**
   * Broadcast metrics to all subscribed clients
   */
  private broadcastMetrics(): void {
    const metrics = this.metrics.getMetricsSnapshot();

    this.metricsBuffer.push({
      ...metrics,
      timestamp: Date.now(),
    });

    // Keep last N entries
    if (this.metricsBuffer.length > this.maxBufferSize) {
      this.metricsBuffer = this.metricsBuffer.slice(-this.maxBufferSize);
    }

    this.broadcastMessage({
      type: 'metrics_update',
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast health status
   */
  private async broadcastHealth(): Promise<void> {
    try {
      const health = await this.healthCheck.runComprehensiveHealthCheck();

      this.broadcastMessage({
        type: 'health_status',
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[LiveDashboard] Error broadcasting health:', error);
    }
  }

  /**
   * Broadcast event to all subscribed clients
   */
  private broadcastEvent(type: DashboardMessageType, data: any): void {
    const message: DashboardMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    // Add to events buffer
    this.eventsBuffer.push(message);
    if (this.eventsBuffer.length > this.maxBufferSize) {
      this.eventsBuffer.shift();
    }

    this.broadcastMessage(message);
  }

  /**
   * Broadcast message to all clients (filtered by subscription)
   */
  private broadcastMessage(message: DashboardMessage): void {
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      if (client.subscriptions.has(message.type)) {
        this.sendToClient(clientId, message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: DashboardMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error(`[LiveDashboard] Error sending to client ${clientId}:`, error);
    }
  }

  /**
   * Send current metrics to specific client
   */
  private async sendMetricsToClient(clientId: string): Promise<void> {
    const metrics = this.metrics.getMetricsSnapshot();

    this.sendToClient(clientId, {
      type: 'metrics_update',
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send health status to specific client
   */
  private async sendHealthToClient(clientId: string): Promise<void> {
    try {
      const health = await this.healthCheck.quickHealthCheck();

      this.sendToClient(clientId, {
        type: 'health_status',
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[LiveDashboard] Error sending health to client:', error);
    }
  }

  /**
   * Send circuit breaker status to specific client
   */
  private sendCircuitStatusToClient(clientId: string): void {
    const stats = this.errorRecovery.getCircuitStats();

    this.sendToClient(clientId, {
      type: 'circuit_breaker_status',
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }

  // HONEST: Counter for deterministic client IDs
  private clientCounter = 0;
  
  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${(this.clientCounter++).toString(36)}`;
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get system status (for HTTP endpoint)
   */
  getSystemStatus(): any {
    const systemMetrics = this.healthCheck.getSystemMetrics();
    const metricsSnapshot = this.metrics.getMetricsSnapshot();
    const circuitStats = this.errorRecovery.getCircuitStats();

    return {
      uptime: process.uptime(),
      connectedClients: this.clients.size,
      system: systemMetrics,
      metrics: metricsSnapshot,
      circuits: circuitStats,
      buffers: {
        metricsBuffer: this.metricsBuffer.length,
        eventsBuffer: this.eventsBuffer.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): DashboardMessage[] {
    return this.eventsBuffer.slice(-limit);
  }

  /**
   * Shutdown dashboard
   */
  shutdown(): void {
    this.stopBroadcasting();

    // Close all client connections
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      try {
        client.ws.close();
      } catch (error) {
        console.error(`[LiveDashboard] Error closing client ${clientId}:`, error);
      }
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('[LiveDashboard] Shut down');
  }
}

// Singleton instance
let dashboardInstance: LiveDashboard | null = null;

export function getLiveDashboard(): LiveDashboard {
  if (!dashboardInstance) {
    dashboardInstance = new LiveDashboard();
  }
  return dashboardInstance;
}
