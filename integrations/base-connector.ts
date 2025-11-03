/**
 * Base Connector Class - External Intelligence Feed System
 * Built from absolute zero - zero templates
 * 
 * All external connectors extend this base class
 */

import { EventEmitter } from 'events';
import type { 
  ConnectorConfig, 
  ExternalData, 
  ConnectorKnowledge, 
  ConnectorResult 
} from './types';

export abstract class BaseConnector extends EventEmitter {
  protected config: ConnectorConfig;
  protected isRunning: boolean = false;
  protected lastRun: Date | null = null;
  protected scheduler: NodeJS.Timeout | null = null;

  constructor(config: ConnectorConfig) {
    super();
    this.config = config;
    console.log(`[${this.config.id}] Connector initialized`);
  }

  /**
   * Start the connector with automatic scheduling
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[${this.config.id}] Connector is disabled - skipping`);
      return;
    }

    console.log(`[${this.config.id}] Starting connector - interval: ${this.config.intervalMinutes}min`);
    
    // Run immediately on start
    await this.execute();

    // Schedule recurring execution
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    this.scheduler = setInterval(() => {
      this.execute().catch(err => {
        console.error(`[${this.config.id}] Scheduled execution error:`, err);
      });
    }, intervalMs);
  }

  /**
   * Stop the connector
   */
  stop(): void {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    console.log(`[${this.config.id}] Connector stopped`);
  }

  /**
   * Execute one sync cycle
   */
  async execute(): Promise<ConnectorResult> {
    const startTime = Date.now();
    this.isRunning = true;

    try {
      console.log(`[${this.config.id}] Executing connector...`);

      // Step 1: Fetch data from external source
      const externalData = await this.fetch();

      // Step 2: Parse the raw data
      const parsedData = await this.parse(externalData);

      // Step 3: Transform to knowledge format
      const knowledge = await this.transform(parsedData);

      // Step 4: Store in memory
      const stored = await this.store(knowledge);

      // Step 5: Notify nucleus brain
      this.notify(knowledge.length);

      const duration = Date.now() - startTime;
      this.lastRun = new Date();

      const result: ConnectorResult = {
        connectorId: this.config.id,
        success: true,
        itemsProcessed: knowledge.length,
        duration,
        timestamp: new Date()
      };

      this.emit('execution-success', result);
      console.log(`[${this.config.id}] ✅ Success: ${knowledge.length} items in ${duration}ms`);

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: ConnectorResult = {
        connectorId: this.config.id,
        success: false,
        itemsProcessed: 0,
        duration,
        error: error.message,
        timestamp: new Date()
      };

      this.emit('execution-error', result);
      console.error(`[${this.config.id}] ❌ Error:`, error.message);

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch data from external source (must be implemented by subclass)
   */
  protected abstract fetch(): Promise<ExternalData>;

  /**
   * Parse raw data (must be implemented by subclass)
   */
  protected abstract parse(data: ExternalData): Promise<any[]>;

  /**
   * Transform parsed data to knowledge format (must be implemented by subclass)
   */
  protected abstract transform(items: any[]): Promise<ConnectorKnowledge[]>;

  /**
   * Store knowledge in memory system
   */
  protected async store(knowledge: ConnectorKnowledge[]): Promise<boolean> {
    // Will be implemented to send to Memory Hub
    this.emit('knowledge-ready', { source: this.config.id, knowledge });
    return true;
  }

  /**
   * Notify nucleus brain of new learning
   */
  protected notify(itemCount: number): void {
    this.emit('external-memory-sync', {
      event: 'ExternalMemorySync',
      payload: {
        source: this.config.id,
        added: itemCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Helper: Make HTTP request with timeout
   */
  protected async httpRequest(url: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>
      };

      // Add API key if configured
      if (this.config.auth === 'apiKey' && this.config.apiKey) {
        headers['X-Api-Key'] = this.config.apiKey;
      } else if (this.config.auth === 'bearer' && this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout (15s exceeded)');
      }
      throw error;
    }
  }

  /**
   * Get connector status
   */
  getStatus() {
    return {
      id: this.config.id,
      name: this.config.name,
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      interval: this.config.intervalMinutes
    };
  }
}
