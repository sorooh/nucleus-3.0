/**
 * Initialize External Intelligence Feed System
 * Built from absolute zero - zero templates
 */

import { connectorManager } from './connector-manager';
import connectorConfigs from './connector-config.json';
import type { ConnectorConfig } from './types';

/**
 * Initialize and start all connectors
 */
export async function initializeConnectors(): Promise<void> {
  try {
    console.log('[Integrations] Initializing External Intelligence Feed System...');

    // Load API keys from environment
    const configs = connectorConfigs.map((config: any) => {
      const configWithKey: ConnectorConfig = { ...config };
      
      // Add API key from environment if needed
      if (config.auth === 'apiKey' || config.auth === 'bearer') {
        // Special handling for NEWSAPI (env var is NEWSAPI_KEY not NEWSAPI_API_KEY)
        const envKeyName = config.id === 'newsapi' ? 'NEWSAPI_KEY' : `${config.id.toUpperCase()}_API_KEY`;
        const apiKey = process.env[envKeyName];
        
        if (apiKey) {
          configWithKey.apiKey = apiKey;
        } else if (config.enabled) {
          console.warn(`[Integrations] ${config.name}: API key ${envKeyName} not found - connector disabled`);
          configWithKey.enabled = false;
        }
      }

      return configWithKey;
    });

    // Load connectors
    await connectorManager.loadConnectors(configs);

    // Start connectors
    await connectorManager.start();

    console.log('[Integrations] ✅ External Intelligence Feed System initialized');

  } catch (error: any) {
    console.error('[Integrations] Failed to initialize:', error.message);
  }
}

export { connectorManager } from './connector-manager';
export * from './types';
