/**
 * Connector Manager - External Intelligence Feed System
 * Built from absolute zero - zero templates
 * 
 * Manages all external connectors, scheduling, and integration with Nucleus
 */

import { EventEmitter } from 'events';
import { BaseConnector } from './base-connector';
import { NewsAPIConnector } from './connectors/newsapi.connector';
import { OpenMeteoConnector } from './connectors/openmeteo.connector';
import { CoinGeckoConnector } from './connectors/coingecko.connector';
import { ExchangeRateConnector } from './connectors/exchangerate.connector';
import { RESTCountriesConnector } from './connectors/restcountries.connector';
import { memoryHub } from '../nucleus/core/memory-hub';
import { nucleus } from '../nucleus/core/nucleus';
import type { ConnectorConfig, ConnectorResult, ConnectorStats, ConnectorKnowledge } from './types';

export class ConnectorManager extends EventEmitter {
  private connectors: Map<string, BaseConnector> = new Map();
  private results: Map<string, ConnectorResult> = new Map();
  private stats: Map<string, ConnectorStats> = new Map();
  private isActive: boolean = false;

  constructor() {
    super();
    console.log('[ConnectorManager] Initialized (from absolute zero)');
  }

  /**
   * Load and initialize all connectors from config
   */
  async loadConnectors(configs: ConnectorConfig[]): Promise<void> {
    console.log(`[ConnectorManager] Loading ${configs.length} connectors...`);

    for (const config of configs) {
      try {
        const connector = this.createConnector(config);
        
        if (!connector) {
          console.warn(`[ConnectorManager] Unknown connector type: ${config.type}`);
          continue;
        }

        // Listen to connector events
        connector.on('execution-success', (result: ConnectorResult) => {
          this.handleExecutionSuccess(result);
        });

        connector.on('execution-error', (result: ConnectorResult) => {
          this.handleExecutionError(result);
        });

        connector.on('knowledge-ready', async ({ source, knowledge }) => {
          await this.storeKnowledge(source, knowledge);
        });

        connector.on('external-memory-sync', (event) => {
          this.notifyNucleus(event);
        });

        this.connectors.set(config.id, connector);

        // Initialize stats
        this.stats.set(config.id, {
          id: config.id,
          name: config.name,
          lastSync: null,
          itemsAdded: 0,
          status: 'active',
          duration: 0,
          lastError: null
        });

        console.log(`[ConnectorManager] ✅ Loaded: ${config.name}`);

      } catch (error: any) {
        console.error(`[ConnectorManager] Failed to load ${config.id}:`, error.message);
      }
    }

    console.log(`[ConnectorManager] Successfully loaded ${this.connectors.size} connectors`);
  }

  /**
   * Create connector instance based on type
   */
  private createConnector(config: ConnectorConfig): BaseConnector | null {
    // Add API key from environment if needed
    const configWithKey = { 
      ...config, 
      apiKey: config.auth === 'apiKey' ? (process.env.NEWSAPI_KEY || config.apiKey) : config.apiKey 
    };

    switch (config.id) {
      case 'newsapi':
        return new NewsAPIConnector(configWithKey);
      case 'openmeteo':
        return new OpenMeteoConnector(configWithKey);
      case 'coingecko':
        return new CoinGeckoConnector(configWithKey);
      case 'exchangerate':
        return new ExchangeRateConnector(configWithKey);
      case 'restcountries':
        return new RESTCountriesConnector(configWithKey);
      default:
        return null;
    }
  }

  /**
   * Start all enabled connectors
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.log('[ConnectorManager] Already active');
      return;
    }

    console.log('[ConnectorManager] Starting all connectors...');
    this.isActive = true;

    for (const [id, connector] of Array.from(this.connectors.entries())) {
      try {
        await connector.start();
      } catch (error: any) {
        console.error(`[ConnectorManager] Failed to start ${id}:`, error.message);
      }
    }

    console.log('[ConnectorManager] ✅ All connectors started');
    this.emit('manager-started');
  }

  /**
   * Stop all connectors
   */
  stop(): void {
    console.log('[ConnectorManager] Stopping all connectors...');
    
    for (const connector of Array.from(this.connectors.values())) {
      connector.stop();
    }

    this.isActive = false;
    console.log('[ConnectorManager] All connectors stopped');
    this.emit('manager-stopped');
  }

  /**
   * Run a specific connector manually
   */
  async runConnector(connectorId: string): Promise<ConnectorResult | null> {
    const connector = this.connectors.get(connectorId);
    
    if (!connector) {
      console.error(`[ConnectorManager] Connector not found: ${connectorId}`);
      return null;
    }

    console.log(`[ConnectorManager] Running ${connectorId} manually...`);
    return await connector.execute();
  }

  /**
   * Handle successful execution
   */
  private handleExecutionSuccess(result: ConnectorResult): void {
    this.results.set(result.connectorId, result);
    
    const stats = this.stats.get(result.connectorId);
    if (stats) {
      stats.lastSync = result.timestamp;
      stats.itemsAdded = result.itemsProcessed;
      stats.status = 'active';
      stats.duration = result.duration;
      stats.lastError = null;
    }

    this.emit('connector-success', result);
    
    console.log(`[ConnectorManager] ✅ ${result.connectorId}: ${result.itemsProcessed} items in ${result.duration}ms`);
  }

  /**
   * Handle execution error
   */
  private handleExecutionError(result: ConnectorResult): void {
    this.results.set(result.connectorId, result);
    
    const stats = this.stats.get(result.connectorId);
    if (stats) {
      stats.lastSync = result.timestamp;
      stats.status = 'error';
      stats.duration = result.duration;
      stats.lastError = result.error || 'Unknown error';
    }

    this.emit('connector-error', result);
    
    console.error(`[ConnectorManager] ❌ ${result.connectorId}: ${result.error}`);
  }

  /**
   * Store knowledge in Memory Hub
   */
  private async storeKnowledge(source: string, knowledge: ConnectorKnowledge[]): Promise<void> {
    try {
      for (const item of knowledge) {
        // Store in Memory Hub as insight
        memoryHub.recordInsight({
          type: 'pattern', // External knowledge as patterns
          description: item.content.substring(0, 200) + '...',
          confidence: item.importance / 100, // Normalize to 0-1
          sources: [source], // External connector as source
          evidence: {
            full_content: item.content,
            tags: item.tags,
            metadata: item.metadata
          }
        });
      }

      console.log(`[ConnectorManager] 💾 Stored ${knowledge.length} items from ${source} in Memory Hub`);

    } catch (error: any) {
      console.error(`[ConnectorManager] Failed to store knowledge from ${source}:`, error.message);
    }
  }

  /**
   * Notify Nucleus Brain of external learning
   */
  private notifyNucleus(event: any): void {
    try {
      // Emit event for Nucleus to process
      nucleus.emit('external-learning', {
        source: 'external_feed',
        type: 'learning_event',
        data: event.payload
      });

      console.log(`[ConnectorManager] 🧠 Notified Nucleus: ${event.payload.source} (+${event.payload.added})`);

    } catch (error: any) {
      console.error(`[ConnectorManager] Failed to notify Nucleus:`, error.message);
    }
  }

  /**
   * Get all connector stats
   */
  getAllStats(): ConnectorStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get specific connector stats
   */
  getConnectorStats(connectorId: string): ConnectorStats | null {
    return this.stats.get(connectorId) || null;
  }

  /**
   * Get connector status
   */
  getStatus() {
    return {
      active: this.isActive,
      totalConnectors: this.connectors.size,
      enabledConnectors: Array.from(this.connectors.values())
        .filter(c => c.getStatus().enabled).length,
      stats: this.getAllStats()
    };
  }

  /**
   * Check if manager is active
   */
  isManagerActive(): boolean {
    return this.isActive;
  }
}

// Singleton instance
export const connectorManager = new ConnectorManager();
