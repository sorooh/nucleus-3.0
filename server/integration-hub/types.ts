/**
 * 🌐 Integration Hub - Type Definitions
 * 
 * Central type system for connecting Nicholas with SIDE nodes and Academy
 * Built from absolute zero - Abu Sham Vision
 */

/**
 * Platform Types
 */
export type PlatformType = 'SIDE' | 'ACADEMY' | 'NICHOLAS';

export type PlatformStatus = 'online' | 'offline' | 'degraded' | 'maintenance';

export type PlatformPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Platform Connection Info
 */
export interface PlatformConnection {
  platformId: string;
  platformName: string;
  arabicName: string;
  platformType: PlatformType;
  nodeUrl: string;
  status: PlatformStatus;
  priority: PlatformPriority;
  health: number; // 0-100
  lastSync: Date | null;
  lastHeartbeat: Date | null;
  capabilities: string[];
  metadata?: Record<string, any>;
}

/**
 * Code Analysis Result
 */
export interface CodeAnalysisResult {
  platformId: string;
  timestamp: Date;
  summary: {
    totalFiles: number;
    totalLines: number;
    languages: Record<string, number>;
    frameworks: string[];
  };
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  architecture: {
    type: string;
    patterns: string[];
    dependencies: string[];
  };
  healthScore: number; // 0-100
  aiInsights: string[];
}

/**
 * Code Issue
 */
export interface CodeIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'bug' | 'security' | 'performance' | 'style' | 'architecture';
  file: string;
  line?: number;
  description: string;
  suggestion?: string;
  autoFixable: boolean;
}

/**
 * Code Suggestion
 */
export interface CodeSuggestion {
  priority: 'critical' | 'high' | 'normal' | 'low';
  category: 'optimization' | 'refactor' | 'feature' | 'security' | 'ui';
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  aiReasoning: string;
}

/**
 * Code Modification Request
 */
export interface CodeModificationRequest {
  platformId: string;
  file: string;
  changes: CodeChange[];
  reason: string;
  autoApprove: boolean;
  testBefore: boolean;
}

/**
 * Code Change
 */
export interface CodeChange {
  type: 'insert' | 'update' | 'delete';
  lineStart: number;
  lineEnd?: number;
  oldCode?: string;
  newCode: string;
  description: string;
}

/**
 * Integration Task
 */
export interface IntegrationTask {
  id: string;
  platformId: string;
  taskType: 'analyze' | 'review' | 'modify' | 'sync' | 'deploy';
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: PlatformPriority;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  aiAgent: string; // Which AI model is handling this
}

/**
 * Cross-Platform Intelligence
 */
export interface CrossPlatformIntelligence {
  id: string;
  insight: string;
  arabicInsight: string;
  affectedPlatforms: string[];
  category: 'optimization' | 'integration' | 'security' | 'data' | 'architecture';
  confidence: number; // 0-1
  priority: PlatformPriority;
  actionable: boolean;
  suggestedActions?: string[];
  aiReasoning: string;
  createdAt: Date;
}

/**
 * Platform Sync Status
 */
export interface PlatformSyncStatus {
  platformId: string;
  lastSync: Date;
  nextSync: Date;
  syncInterval: number; // milliseconds
  totalSyncs: number;
  failedSyncs: number;
  dataShared: {
    toNicholas: number; // bytes
    fromNicholas: number; // bytes
  };
  knowledgeExchanged: number; // insights count
}

/**
 * Integration Hub Stats
 */
export interface IntegrationHubStats {
  totalPlatforms: number;
  onlinePlatforms: number;
  offlinePlatforms: number;
  averageHealth: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalIssuesFound: number;
  issuesFixed: number;
  intelligenceShared: number;
  lastUpdate: Date;
}
