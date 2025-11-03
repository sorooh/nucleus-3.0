/**
 * NewsAPI Connector - External Intelligence Feed System
 * Built from absolute zero - zero templates
 * 
 * Fetches global news articles from NewsAPI.org
 */

import { BaseConnector } from '../base-connector';
import type { ConnectorConfig, ExternalData, ConnectorKnowledge } from '../types';

export class NewsAPIConnector extends BaseConnector {
  constructor(config: ConnectorConfig) {
    super(config);
  }

  /**
   * Fetch news from NewsAPI
   */
  protected async fetch(): Promise<ExternalData> {
    const endpoint = '/v2/top-headlines';
    const params = new URLSearchParams({
      country: 'us',
      pageSize: '20',
      apiKey: this.config.apiKey || ''
    });

    const url = `${this.config.baseUrl}${endpoint}?${params}`;
    const data = await this.httpRequest(url);

    return {
      source: this.config.id,
      data,
      fetchedAt: new Date(),
      url
    };
  }

  /**
   * Parse NewsAPI response
   */
  protected async parse(externalData: ExternalData): Promise<any[]> {
    const { articles = [] } = externalData.data;
    
    if (!Array.isArray(articles)) {
      console.warn(`[${this.config.id}] Invalid articles format`);
      return [];
    }

    return articles.filter((article: any) => {
      return article.title && article.description && article.url;
    });
  }

  /**
   * Transform news articles to knowledge format
   */
  protected async transform(articles: any[]): Promise<ConnectorKnowledge[]> {
    return articles.map(article => {
      const content = `
📰 **${article.title}**

${article.description || ''}

${article.content ? article.content.substring(0, 500) : ''}

Source: ${article.source?.name || 'Unknown'}
Published: ${article.publishedAt || 'Unknown'}
      `.trim();

      // Calculate importance based on source and engagement signals
      let importance = 70; // base importance
      if (article.source?.name?.toLowerCase().includes('bbc')) importance += 10;
      if (article.source?.name?.toLowerCase().includes('cnn')) importance += 10;
      if (article.title?.length > 50) importance += 5; // detailed titles

      return {
        type: 'long',
        content,
        importance: Math.min(importance, 100),
        tags: [
          'source:external',
          'origin:newsapi',
          'type:news',
          'language:en',
          ...(article.source?.name ? [`publisher:${article.source.name.toLowerCase()}`] : [])
        ],
        metadata: {
          url: article.url,
          source: 'NewsAPI',
          fetched_at: new Date().toISOString(),
          title: article.title,
          author: article.author || 'Unknown',
          published_at: article.publishedAt,
          image_url: article.urlToImage
        }
      };
    });
  }
}
