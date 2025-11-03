/**
 * Nucleus 3.0 - Dynamic Configuration Manager
 * 
 * نظام إدارة الإعدادات الديناميكي
 * يدعم Hot Reload, Environment-based Settings, و Configuration Validation
 */

import { EventEmitter } from 'events';

/**
 * AI Provider Configuration
 */
export interface AIProviderConfig {
  timeout: number; // milliseconds
  maxRetries: number;
  priority: number; // 1-10, higher is better
  enabled: boolean;
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  threshold: number; // failures before opening
  timeout: number; // milliseconds before trying half-open
  resetTimeout: number; // milliseconds before resetting failure count
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  enabled: boolean;
  failOpen: boolean; // Allow requests when Redis fails
  defaultLimits: {
    rpm: number;
    rph: number;
    rpd: number;
  };
}

/**
 * Memory Configuration
 */
export interface MemoryConfig {
  maxSize: number; // maximum number of memories
  cleanupInterval: number; // milliseconds
  compression: boolean;
  vectorEnabled: boolean;
}

/**
 * Performance Configuration
 */
export interface PerformanceConfig {
  maxConcurrent: number; // max concurrent AI requests
  queueSize: number; // max queued requests
  monitoring: {
    enabled: boolean;
    interval: number; // milliseconds
  };
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  strictValidation: boolean;
  promptInjectionDetection: boolean;
  maxPromptLength: number;
  rateLimiting: RateLimitConfig;
}

/**
 * Complete Nucleus Configuration
 */
export interface NucleusConfig {
  ai: {
    providers: Record<string, AIProviderConfig>;
    fallbackChain: string[]; // ordered list of providers to try
    circuitBreaker: CircuitBreakerConfig;
    committee: {
      enabled: boolean;
      minVoters: number;
      consensusThreshold: number; // 0-1
    };
  };
  memory: MemoryConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  monitoring: {
    metricsEnabled: boolean;
    healthCheckInterval: number; // milliseconds
    prometheusEnabled: boolean;
  };
}

/**
 * Configuration Manager
 */
export class ConfigManager extends EventEmitter {
  private config: NucleusConfig;
  private watchers: Set<(config: NucleusConfig) => void> = new Set();
  private configHistory: Array<{ config: NucleusConfig; timestamp: number }> = [];
  private maxHistorySize = 10;

  constructor() {
    super();
    this.config = this.loadInitialConfig();
    this.recordHistory(this.config);
  }

  /**
   * Load initial configuration
   */
  private loadInitialConfig(): NucleusConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    return {
      ai: {
        providers: {
          hunyuan: {
            timeout: 30000,
            maxRetries: 2,
            priority: 8,
            enabled: !!process.env.SILICONFLOW_API_KEY,
          },
          openai: {
            timeout: 25000,
            maxRetries: 2,
            priority: 9,
            enabled: !!process.env.OPENAI_API_KEY,
          },
          claude: {
            timeout: 35000,
            maxRetries: 2,
            priority: 9,
            enabled: !!process.env.ANTHROPIC_API_KEY,
          },
          llama: {
            timeout: 40000,
            maxRetries: 2,
            priority: 7,
            enabled: !!process.env.GROQ_API_KEY,
          },
          mistral: {
            timeout: 30000,
            maxRetries: 2,
            priority: 7,
            enabled: !!process.env.MISTRAL_API_KEY,
          },
          falcon: {
            timeout: 45000,
            maxRetries: 1,
            priority: 6,
            enabled: !!process.env.HF_TOKEN,
          },
        },
        fallbackChain: ['openai', 'claude', 'hunyuan', 'llama', 'mistral'],
        circuitBreaker: {
          threshold: isProduction ? 3 : 5,
          timeout: 60000, // 1 minute
          resetTimeout: 300000, // 5 minutes
        },
        committee: {
          enabled: true,
          minVoters: 3,
          consensusThreshold: 0.7,
        },
      },
      memory: {
        maxSize: isProduction ? 50000 : 10000,
        cleanupInterval: 3600000, // 1 hour
        compression: isProduction,
        vectorEnabled: !!process.env.UPSTASH_VECTOR_REST_URL,
      },
      performance: {
        maxConcurrent: isProduction ? 20 : 10,
        queueSize: isProduction ? 200 : 100,
        monitoring: {
          enabled: true,
          interval: isProduction ? 60000 : 30000,
        },
      },
      security: {
        strictValidation: isProduction,
        promptInjectionDetection: true,
        maxPromptLength: 10000,
        rateLimiting: {
          enabled: true,
          failOpen: !isProduction, // Fail open in dev, fail closed in production
          defaultLimits: {
            rpm: 100,
            rph: 5000,
            rpd: 100000,
          },
        },
      },
      monitoring: {
        metricsEnabled: true,
        healthCheckInterval: 30000, // 30 seconds
        prometheusEnabled: isProduction,
      },
    };
  }

  /**
   * Get complete configuration
   */
  getConfig(): NucleusConfig {
    return JSON.parse(JSON.stringify(this.config)); // Deep clone
  }

  /**
   * Get specific config value
   */
  get<T = any>(path: string): T | undefined {
    return this.getNestedValue(this.config, path);
  }

  /**
   * Update configuration (partial update)
   */
  updateConfig(path: string, value: any): void {
    const oldConfig = JSON.parse(JSON.stringify(this.config));

    try {
      // Validate before applying
      this.validateConfigChange(path, value);

      // Apply change
      this.setNestedValue(this.config, path, value);

      // Record in history
      this.recordHistory(this.config);

      // Notify watchers
      this.notifyWatchers();

      // Emit event
      this.emit('config-updated', {
        path,
        oldValue: this.getNestedValue(oldConfig, path),
        newValue: value,
        timestamp: Date.now(),
      });

      console.log(`[ConfigManager] Updated: ${path} = ${JSON.stringify(value)}`);
    } catch (error: any) {
      // Rollback on error
      this.config = oldConfig;
      throw new Error(`Failed to update config: ${error.message}`);
    }
  }

  /**
   * Batch update configuration
   */
  batchUpdate(updates: Record<string, any>): void {
    const oldConfig = JSON.parse(JSON.stringify(this.config));

    try {
      for (const [path, value] of Object.entries(updates)) {
        this.validateConfigChange(path, value);
        this.setNestedValue(this.config, path, value);
      }

      this.recordHistory(this.config);
      this.notifyWatchers();

      this.emit('config-batch-updated', {
        updates,
        timestamp: Date.now(),
      });

      console.log(`[ConfigManager] Batch updated ${Object.keys(updates).length} values`);
    } catch (error: any) {
      // Rollback all changes on error
      this.config = oldConfig;
      throw new Error(`Failed to batch update config: ${error.message}`);
    }
  }

  /**
   * Validate configuration change
   */
  private validateConfigChange(path: string, value: any): void {
    // Validate AI provider timeouts
    if (path.includes('timeout') && typeof value === 'number') {
      if (value < 1000 || value > 120000) {
        throw new Error('Timeout must be between 1000ms and 120000ms');
      }
    }

    // Validate maxConcurrent
    if (path === 'performance.maxConcurrent' && typeof value === 'number') {
      if (value < 1 || value > 100) {
        throw new Error('maxConcurrent must be between 1 and 100');
      }
    }

    // Validate consensus threshold
    if (path === 'ai.committee.consensusThreshold' && typeof value === 'number') {
      if (value < 0 || value > 1) {
        throw new Error('consensusThreshold must be between 0 and 1');
      }
    }

    // Validate rate limits
    if (path.includes('rateLimiting.defaultLimits')) {
      const limitType = path.split('.').pop();
      if (limitType === 'rpm' && (value < 0 || value > 10000)) {
        throw new Error('RPM must be between 0 and 10000');
      }
      if (limitType === 'rph' && (value < 0 || value > 100000)) {
        throw new Error('RPH must be between 0 and 100000');
      }
      if (limitType === 'rpd' && (value < 0 || value > 1000000)) {
        throw new Error('RPD must be between 0 and 1000000');
      }
    }
  }

  /**
   * Watch for configuration changes
   */
  onConfigChange(callback: (config: NucleusConfig) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  /**
   * Notify all watchers
   */
  private notifyWatchers(): void {
    const config = this.getConfig();
    for (const watcher of Array.from(this.watchers)) {
      try {
        watcher(config);
      } catch (error) {
        console.error('[ConfigManager] Error in watcher:', error);
      }
    }
  }

  /**
   * Record configuration in history
   */
  private recordHistory(config: NucleusConfig): void {
    this.configHistory.push({
      config: JSON.parse(JSON.stringify(config)),
      timestamp: Date.now(),
    });

    // Keep only last N entries
    if (this.configHistory.length > this.maxHistorySize) {
      this.configHistory.shift();
    }
  }

  /**
   * Get configuration history
   */
  getHistory(): Array<{ config: NucleusConfig; timestamp: number }> {
    return JSON.parse(JSON.stringify(this.configHistory));
  }

  /**
   * Rollback to previous configuration
   */
  rollback(steps: number = 1): void {
    if (this.configHistory.length < steps + 1) {
      throw new Error('Not enough history to rollback');
    }

    const targetIndex = this.configHistory.length - steps - 1;
    const targetConfig = this.configHistory[targetIndex].config;

    this.config = JSON.parse(JSON.stringify(targetConfig));
    this.notifyWatchers();

    this.emit('config-rollback', {
      steps,
      timestamp: Date.now(),
    });

    console.log(`[ConfigManager] Rolled back ${steps} step(s)`);
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = this.loadInitialConfig();
    this.configHistory = [];
    this.recordHistory(this.config);
    this.notifyWatchers();

    this.emit('config-reset', { timestamp: Date.now() });

    console.log('[ConfigManager] Configuration reset to defaults');
  }

  /**
   * Export configuration as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importJSON(json: string): void {
    try {
      const imported = JSON.parse(json);

      // Validate structure (basic check)
      if (!imported.ai || !imported.memory || !imported.performance) {
        throw new Error('Invalid configuration structure');
      }

      this.config = imported;
      this.recordHistory(this.config);
      this.notifyWatchers();

      this.emit('config-imported', { timestamp: Date.now() });

      console.log('[ConfigManager] Configuration imported successfully');
    } catch (error: any) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }
}

// Singleton instance
let configInstance: ConfigManager | null = null;

export function getConfig(): ConfigManager {
  if (!configInstance) {
    configInstance = new ConfigManager();
  }
  return configInstance;
}
