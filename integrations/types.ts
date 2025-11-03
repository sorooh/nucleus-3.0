/**
 * Connector Types - External Intelligence Feed System
 * Built from absolute zero - zero templates
 */

export type ConnectorType = 'REST' | 'Webhook' | 'Feed' | 'GraphQL';
export type AuthType = 'none' | 'apiKey' | 'oauth2' | 'bearer';
export type ParserType = 'json' | 'xml' | 'rss' | 'custom';
export type ConnectorStatus = 'active' | 'paused' | 'error' | 'disabled';

/**
 * Connector Configuration
 */
export interface ConnectorConfig {
  id: string;
  name: string;
  type: ConnectorType;
  baseUrl: string;
  endpoints: string[];
  auth: AuthType;
  apiKey?: string;
  intervalMinutes: number;
  parser: ParserType;
  tags: string[];
  priority: number; // 0.0 to 1.0
  enabled: boolean;
}

/**
 * Fetched Data from External Source
 */
export interface ExternalData {
  source: string;
  data: any;
  fetchedAt: Date;
  url: string;
}

/**
 * Transformed Knowledge Ready for Memory
 */
export interface ConnectorKnowledge {
  type: 'short' | 'long' | 'context';
  content: string;
  importance: number; // 0-100
  tags: string[];
  metadata: {
    url?: string;
    source: string;
    fetched_at: string;
    [key: string]: any;
  };
}

/**
 * Connector Execution Result
 */
export interface ConnectorResult {
  connectorId: string;
  success: boolean;
  itemsProcessed: number;
  duration: number; // milliseconds
  error?: string;
  timestamp: Date;
}

/**
 * Connector Stats for Dashboard
 */
export interface ConnectorStats {
  id: string;
  name: string;
  lastSync: Date | null;
  itemsAdded: number;
  status: ConnectorStatus;
  duration: number;
  lastError: string | null;
}
