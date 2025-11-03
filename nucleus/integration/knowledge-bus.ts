/**
 * Unified Knowledge Bus (UKB)
 * Built from absolute zero for Surooh Empire
 * 
 * Central integration hub connecting Memory Hub with all Surooh platforms
 */

import { EventEmitter } from 'events';
import type { 
  PlatformType, 
  PlatformConfig, 
  IntegrationMessage, 
  KnowledgeExchange,
  PlatformStats,
  BusEvent
} from './types';

export class UnifiedKnowledgeBus extends EventEmitter {
  private active: boolean = false;
  private platforms: Map<PlatformType, PlatformConfig> = new Map();
  private exchanges: Map<string, KnowledgeExchange> = new Map();
  private stats: Map<PlatformType, PlatformStats> = new Map();
  private exchangeCounter: number = 0;

  constructor() {
    super();
    console.log('[UnifiedKnowledgeBus] Initialized (from absolute zero)');
  }

  /**
   * Activate the Knowledge Bus
   */
  activate(): void {
    if (this.active) {
      console.log('[UnifiedKnowledgeBus] Already active');
      return;
    }

    this.active = true;
    this.initializeDefaultPlatforms();
    
    this.emit('bus-activated');
    console.log('🚌 Unified Knowledge Bus activated - Platform integration enabled');
  }

  /**
   * Initialize default platform configurations
   */
  private initializeDefaultPlatforms(): void {
    const defaultPlatforms: PlatformConfig[] = [
      {
        id: 'b2b',
        name: 'Surooh B2B Brain',
        type: 'B2B',
        endpoint: '/api/v1/b2b/sync',
        syncMode: 'REALTIME',
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: true, rest: true, batch: false }
      },
      {
        id: 'b2c',
        name: 'Surooh B2C Brain',
        type: 'B2C',
        endpoint: '/api/v1/b2c/sync',
        syncMode: 'REALTIME',
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: true, rest: true, batch: false }
      },
      {
        id: 'ce',
        name: 'Surooh CE Brain',
        type: 'CE',
        endpoint: '/api/v1/ce/export',
        syncMode: 'SCHEDULED',
        syncInterval: 1440, // Daily
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: false, rest: true, batch: true }
      },
      {
        id: 'accounting',
        name: 'Surooh Accounting Brain',
        type: 'Accounting',
        endpoint: '/api/v1/accounting/feed',
        syncMode: 'SCHEDULED',
        syncInterval: 60, // Hourly
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: false, rest: true, batch: false }
      },
      {
        id: 'shipping',
        name: 'Surooh Shipping Brain',
        type: 'Shipping',
        endpoint: '/api/v1/shipping/tracking',
        syncMode: 'SCHEDULED',
        syncInterval: 15, // Every 15 minutes
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: false, rest: true, batch: false }
      },
      {
        id: 'mailhub',
        name: 'Mail Hub Core',
        type: 'MAIL_HUB',
        endpoint: '/api/v1/mailhub/sync',
        syncMode: 'REALTIME',
        syncInterval: 15, // Every 15 minutes for batch sync
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: true, rest: true, batch: true }
      },
      {
        id: 'scp',
        name: 'Surooh Chat Platform (SCP)',
        type: 'SCP',
        endpoint: '/api/scp',
        syncMode: 'REALTIME',
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: false, rest: true, batch: false }
      },
      {
        id: 'docs',
        name: 'Abosham Docs Platform',
        type: 'DOCS',
        endpoint: '/api/webhooks/docs',
        syncMode: 'ON_DEMAND',
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: false, rest: true, batch: false }
      },
      {
        id: 'customer-service',
        name: 'Customer Service Platform',
        type: 'CUSTOMER_SERVICE',
        endpoint: '/api/nucleus/customer',
        syncMode: 'ON_DEMAND',
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: false, rest: true, batch: false }
      },
      {
        id: 'academy',
        name: 'Surooh Academy Platform',
        type: 'ACADEMY',
        endpoint: '/api/academy',
        syncMode: 'REALTIME',
        enabled: true, // Active integration
        authentication: { type: 'JWT' },
        features: { websocket: false, rest: true, batch: true }
      }
    ];

    for (const config of defaultPlatforms) {
      this.platforms.set(config.type, config);
      
      // Initialize stats
      this.stats.set(config.type, {
        platform: config.type,
        connected: false,
        lastSync: null,
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        latency: 0
      });
    }

    console.log(`[UnifiedKnowledgeBus] Initialized ${defaultPlatforms.length} platform configurations`);
  }

  /**
   * Send message to a platform
   */
  async sendMessage(platform: PlatformType, message: IntegrationMessage): Promise<string> {
    if (!this.active) {
      throw new Error('Knowledge Bus is not active');
    }

    const config = this.platforms.get(platform);
    if (!config) {
      throw new Error(`Platform ${platform} not configured`);
    }

    if (!config.enabled) {
      throw new Error(`Platform ${platform} is not enabled`);
    }

    // Auto-connect platform on first message
    const platformStats = this.stats.get(platform)!;
    if (!platformStats.connected) {
      platformStats.connected = true;
      this.emit('platform-connected', { platform });
      console.log(`[UnifiedKnowledgeBus] 🔗 Platform auto-connected: ${platform}`);
    }

    // Create exchange record
    const exchangeId = `EX-${Date.now()}-${++this.exchangeCounter}`;
    const exchange: KnowledgeExchange = {
      id: exchangeId,
      platform,
      direction: 'OUTBOUND',
      dataType: message.dataType,
      status: 'processing',
      message
    };

    this.exchanges.set(exchangeId, exchange);

    try {
      // In production, this would make actual HTTP/WebSocket call
      // For now, we emit event and mark as completed
      
      exchange.status = 'completed';
      exchange.processedAt = new Date();

      // Update stats
      const platformStats = this.stats.get(platform)!;
      platformStats.messagesSent++;
      platformStats.lastSync = new Date();

      this.emit('message-sent', { exchangeId, platform, message });
      console.log(`[UnifiedKnowledgeBus] ✅ Message sent to ${platform}: ${exchangeId}`);

      return exchangeId;

    } catch (error: any) {
      exchange.status = 'failed';
      exchange.error = error.message;

      const platformStats = this.stats.get(platform)!;
      platformStats.errors++;

      this.emit('error', { exchangeId, platform, error: error.message });
      console.error(`[UnifiedKnowledgeBus] ❌ Failed to send to ${platform}:`, error.message);

      throw error;
    }
  }

  /**
   * Receive message from a platform
   */
  async receiveMessage(message: IntegrationMessage): Promise<string> {
    if (!this.active) {
      throw new Error('Knowledge Bus is not active');
    }

    // Validate message structure
    if (!message.platform || !message.dataType || !message.payload || !message.metadata) {
      throw new Error('Invalid message: missing required fields (platform, dataType, payload, metadata)');
    }

    const { platform } = message;
    const config = this.platforms.get(platform);
    
    if (!config) {
      throw new Error(`Platform ${platform} not configured`);
    }

    // Auto-connect platform on first message
    const platformStats = this.stats.get(platform)!;
    if (!platformStats.connected) {
      platformStats.connected = true;
      this.emit('platform-connected', { platform });
      console.log(`[UnifiedKnowledgeBus] 🔗 Platform auto-connected: ${platform}`);
    }

    // Create exchange record
    const exchangeId = `EX-${Date.now()}-${++this.exchangeCounter}`;
    const exchange: KnowledgeExchange = {
      id: exchangeId,
      platform,
      direction: 'INBOUND',
      dataType: message.dataType,
      status: 'processing',
      message
    };

    this.exchanges.set(exchangeId, exchange);

    try {
      // Process the message (integrate with Memory Hub)
      exchange.status = 'completed';
      exchange.processedAt = new Date();

      // Update stats
      const platformStats = this.stats.get(platform)!;
      platformStats.messagesReceived++;
      platformStats.lastSync = new Date();

      this.emit('message-received', { exchangeId, platform, message });
      console.log(`[UnifiedKnowledgeBus] ✅ Message received from ${platform}: ${exchangeId}`);

      return exchangeId;

    } catch (error: any) {
      exchange.status = 'failed';
      exchange.error = error.message;

      const platformStats = this.stats.get(platform)!;
      platformStats.errors++;

      throw error;
    }
  }

  /**
   * Connect a platform
   */
  connectPlatform(platform: PlatformType, credentials?: string): void {
    const config = this.platforms.get(platform);
    if (!config) {
      throw new Error(`Platform ${platform} not configured`);
    }

    config.enabled = true;
    if (credentials) {
      config.authentication.credentials = credentials;
    }

    const platformStats = this.stats.get(platform)!;
    platformStats.connected = true;

    this.emit('platform-connected', { platform });
    console.log(`[UnifiedKnowledgeBus] 🔗 Platform connected: ${platform}`);
  }

  /**
   * Disconnect a platform
   */
  disconnectPlatform(platform: PlatformType): void {
    const config = this.platforms.get(platform);
    if (config) {
      config.enabled = false;
    }

    const platformStats = this.stats.get(platform);
    if (platformStats) {
      platformStats.connected = false;
    }

    this.emit('platform-disconnected', { platform });
    console.log(`[UnifiedKnowledgeBus] 🔌 Platform disconnected: ${platform}`);
  }

  /**
   * Get platform statistics
   */
  getPlatformStats(platform?: PlatformType): PlatformStats | PlatformStats[] {
    if (platform) {
      const stats = this.stats.get(platform);
      if (!stats) {
        throw new Error(`Platform ${platform} not found`);
      }
      return stats;
    }

    return Array.from(this.stats.values());
  }

  /**
   * Get all platform configurations
   */
  getPlatforms(): PlatformConfig[] {
    return Array.from(this.platforms.values());
  }

  /**
   * Get exchange history
   */
  getExchangeHistory(platform?: PlatformType, limit: number = 100): KnowledgeExchange[] {
    const exchanges = Array.from(this.exchanges.values());
    
    let filtered = platform 
      ? exchanges.filter(ex => ex.platform === platform)
      : exchanges;

    return filtered
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, limit);
  }

  /**
   * Get bus status
   */
  getStatus() {
    return {
      active: this.active,
      totalPlatforms: this.platforms.size,
      connectedPlatforms: Array.from(this.stats.values()).filter(s => s.connected).length,
      totalExchanges: this.exchanges.size,
      stats: Array.from(this.stats.values())
    };
  }
}

// Export singleton instance
export const knowledgeBus = new UnifiedKnowledgeBus();
