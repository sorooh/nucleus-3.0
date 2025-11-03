/**
 * REST Countries Connector - Real Country Information
 * Built from absolute zero - zero templates
 * 
 * Free API - No key required
 * Fetches comprehensive country data
 */

import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, ExternalData, ConnectorKnowledge } from '../types';

export class RESTCountriesConnector extends BaseConnector {
  constructor(config?: ConnectorConfig) {
    const defaultConfig: ConnectorConfig = {
      id: 'restcountries',
      name: 'REST Countries API',
      type: 'REST',
      baseUrl: 'https://restcountries.com',
      endpoints: ['/v3.1/all?fields=name,capital,population,region,subregion,languages,currencies,flags'],
      auth: 'none',
      intervalMinutes: 1440,
      parser: 'json',
      tags: ['external', 'feed', 'geography', 'countries'],
      priority: 0.5,
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
    if (!Array.isArray(data.data)) {
      return [];
    }

    // Get top 20 countries by population
    return data.data
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, 20);
  }

  protected async transform(items: any[]): Promise<ConnectorKnowledge[]> {
    const now = new Date().toISOString();
    
    return items.map(country => {
      const languages = country.languages ? Object.values(country.languages).join(', ') : 'N/A';
      const currencies = country.currencies 
        ? Object.values(country.currencies).map((c: any) => c.name).join(', ')
        : 'N/A';
      const capital = country.capital?.[0] || 'N/A';

      return {
        type: 'context',
        content: `🌍 **${country.name.common}**
🏛️ Capital: ${capital}
👥 Population: ${(country.population / 1_000_000).toFixed(1)}M
🗺️ Region: ${country.region} / ${country.subregion || 'N/A'}
💬 Languages: ${languages}
💰 Currency: ${currencies}`,
        importance: 50,
        tags: [...this.config.tags, country.region.toLowerCase()],
        metadata: {
          source: this.config.id,
          fetched_at: now,
          countryName: country.name.common,
          officialName: country.name.official,
          capital: capital,
          population: country.population,
          region: country.region,
          subregion: country.subregion
        }
      };
    });
  }
}
