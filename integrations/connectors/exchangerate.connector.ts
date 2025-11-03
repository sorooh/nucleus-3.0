/**
 * Exchange Rate Connector - Real Currency Exchange Rates
 * Built from absolute zero - zero templates
 * 
 * Free API - No key required
 * Fetches real-time currency exchange rates
 */

import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, ExternalData, ConnectorKnowledge } from '../types';

export class ExchangeRateConnector extends BaseConnector {
  constructor(config?: ConnectorConfig) {
    const defaultConfig: ConnectorConfig = {
      id: 'exchangerate',
      name: 'Exchange Rates API',
      type: 'REST',
      baseUrl: 'https://open.er-api.com',
      endpoints: ['/v6/latest/USD'],
      auth: 'none',
      intervalMinutes: 360,
      parser: 'json',
      tags: ['external', 'feed', 'currency', 'finance'],
      priority: 0.7,
      enabled: true
    };

    super(config || defaultConfig);
  }

  protected async fetch(): Promise<ExternalData> {
    const endpoint = this.config.endpoints[0];
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await this.httpRequest(url);
    
    return {
      source: this.config.id,
      data: response,
      fetchedAt: new Date(),
      url
    };
  }

  protected async parse(data: ExternalData): Promise<any[]> {
    const response = data.data;
    
    if (!response.rates) {
      return [];
    }

    // Convert rates object to array of top currencies
    const topCurrencies = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SAR', 'AED', 'EGP'];
    
    return topCurrencies
      .filter(currency => response.rates[currency])
      .map(currency => ({
        currency,
        rate: response.rates[currency],
        base: response.base_code,
        lastUpdate: response.time_last_update_utc
      }));
  }

  protected async transform(items: any[]): Promise<ConnectorKnowledge[]> {
    const now = new Date().toISOString();
    
    return items.map(item => ({
      type: 'short',
      content: `💱 **${item.currency} / ${item.base}**
📊 Rate: ${item.rate.toFixed(4)}
💵 1 USD = ${item.rate.toFixed(2)} ${item.currency}
🕒 Updated: ${new Date(item.lastUpdate).toLocaleString()}`,
      importance: 70,
      tags: [...this.config.tags, item.currency.toLowerCase()],
      metadata: {
        source: this.config.id,
        fetched_at: now,
        currency: item.currency,
        baseCurrency: item.base,
        rate: item.rate,
        lastUpdate: item.lastUpdate
      }
    }));
  }
}
