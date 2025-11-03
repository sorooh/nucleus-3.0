/**
 * Unified Knowledge Bus - Integration Types
 * Built from absolute zero for Surooh Empire
 * 
 * Defines standard schemas for platform integration
 */

// ============= Platform Types =============

export type PlatformType = 'B2B' | 'B2C' | 'CE' | 'Accounting' | 'Shipping' | 'MAIL_HUB' | 'WALLET' | 'SCP' | 'DOCS' | 'CUSTOMER_SERVICE' | 'ACADEMY';
export type DataDirection = 'INBOUND' | 'OUTBOUND';
export type DataType = 'INSIGHT' | 'DECISION' | 'MODEL' | 'ALERT' | 'TRANSACTION' | 'REPORT' | 'STATUS' | 'EMAIL_SUMMARY' | 'AI_FEEDBACK' | 'CONVERSATION' | 'DOCUMENT' | 'CHAT_MESSAGE' | 'TRAINING_DATA' | 'BOT_CONFIG';
export type SyncMode = 'REALTIME' | 'SCHEDULED' | 'ON_DEMAND';

// ============= Standard Integration Message =============

export interface IntegrationMessage {
  platform: PlatformType;
  direction: DataDirection;
  timestamp: string;
  dataType: DataType;
  payload: MessagePayload;
  metadata: MessageMetadata;
}

export interface MessagePayload {
  summary: string;
  details: any[];
  [key: string]: any;
}

export interface MessageMetadata {
  source: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  authToken?: string;
  schemaVersion: string;
  checksum?: string;
  retryCount?: number;
}

// ============= Platform Configuration =============

export interface PlatformConfig {
  id: string;
  name: string;
  type: PlatformType;
  endpoint: string;
  syncMode: SyncMode;
  syncInterval?: number; // minutes
  enabled: boolean;
  authentication: {
    type: 'JWT' | 'APIKEY' | 'OAUTH2';
    credentials?: string;
  };
  features: {
    websocket: boolean;
    rest: boolean;
    batch: boolean;
  };
}

// ============= Knowledge Exchange Types =============

export interface KnowledgeExchange {
  id: string;
  platform: PlatformType;
  direction: DataDirection;
  dataType: DataType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: IntegrationMessage;
  processedAt?: Date;
  error?: string;
}

export interface PlatformStats {
  platform: PlatformType;
  connected: boolean;
  lastSync: Date | null;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  latency: number; // ms
}

// ============= Events =============

export interface BusEvent {
  event: 'message-received' | 'message-sent' | 'platform-connected' | 'platform-disconnected' | 'sync-completed' | 'error';
  payload: any;
  timestamp: Date;
}
