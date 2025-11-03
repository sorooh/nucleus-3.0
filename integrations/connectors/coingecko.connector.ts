/**
 * CoinGecko Connector - Real Cryptocurrency Prices
 * Built from absolute zero - zero templates
 * 
 * Free API - No key required
 * Fetches real-time crypto prices from CoinGecko
 */

import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, ExternalData, ConnectorKnowledge } from '../types';

export class CoinGeckoConnector extends BaseConnector {
  constructor(config?: ConnectorConfig) {
    const defaultConfig: ConnectorConfig = {
      id: 'coingecko',
      name: 'CoinGecko Crypto Prices',
      type: 'REST',
      baseUrl: 'https://api.coingecko.com',
      endpoints: ['/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,ripple&vs_currencies=usd&include_24hr_change=true&include_market_cap=true'],
      auth: 'none',
      intervalMinutes: 30,
      parser: 'json',
      tags: ['external', 'feed', 'crypto', 'finance'],
      priority: 0.8,
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
    const prices = data.data;
    
    if (typeof prices !== 'object') {
      return [];
    }

    // Convert object to array
    return Object.entries(prices).map(([id, data]: [string, any]) => ({
      id,
      price: data.usd,
      marketCap: data.usd_market_cap,
      change24h: data.usd_24h_change
    }));
  }

  protected async transform(items: any[]): Promise<ConnectorKnowledge[]> {
    const now = new Date().toISOString();
    
    return items.map(coin => ({
      type: 'short',
      content: `💰 **${coin.id.charAt(0).toUpperCase() + coin.id.slice(1)}**
💵 Price: $${coin.price.toLocaleString()}
📊 Market Cap: $${(coin.marketCap / 1_000_000_000).toFixed(2)}B
📈 24h Change: ${coin.change24h?.toFixed(2)}%`,
      importance: 80,
      tags: [...this.config.tags, coin.id],
      metadata: {
        source: this.config.id,
        fetched_at: now,
        coinId: coin.id,
        price: coin.price,
        marketCap: coin.marketCap,
        change24h: coin.change24h
      }
    }));
  }
}
