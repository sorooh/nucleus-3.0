/**
 * ═══════════════════════════════════════════════════════════
 * Integration Hub - Core Types
 * ═══════════════════════════════════════════════════════════
 * النواة الأساسية لنظام Integration Hub المركزي
 * Built from absolute zero - Abu Sham Vision
 */

/**
 * النواة الأساسية للنظام - Nucleus
 */
export interface Nucleus {
  id: string;
  name: string;
  arabicName: string;
  type: 'SIDE' | 'ACADEMY' | 'EXTERNAL';
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE';
  version: string;
  lastSeen: Date;
  connectionUrl: string;
  capabilities: NucleusCapability[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NucleusCapability {
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, any>;
}

/**
 * مهام التحليل - Analysis Jobs
 */
export interface AnalysisJob {
  id: string;
  nucleusId: string;
  repository: RepositoryInfo;
  status: JobStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: AnalysisResult;
  error?: string;
  createdBy: string;
}

export interface RepositoryInfo {
  url: string;
  branch: string;
  commitHash: string;
  path?: string;
}

export type JobStatus = 
  | 'PENDING' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

/**
 * نتائج التحليل - Analysis Results
 */
export interface AnalysisResult {
  id: string;
  jobId: string;
  summary: AnalysisSummary;
  issues: CodeIssue[];
  metrics: QualityMetrics;
  suggestions: Suggestion[];
  generatedAt: Date;
}

export interface AnalysisSummary {
  totalFiles: number;
  totalLines: number;
  issuesCount: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface CodeIssue {
  id: string;
  type: IssueType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  file: string;
  line: number;
  column: number;
  message: string;
  rule: string;
  suggestion: string;
  codeSnippet: string;
  autoFixable: boolean;
  suggestedFix?: string;
}

export type IssueType = 
  | 'SECURITY' 
  | 'PERFORMANCE' 
  | 'MAINTAINABILITY' 
  | 'BUG' 
  | 'CODE_SMELL' 
  | 'STYLE';

export interface QualityMetrics {
  complexity: {
    cyclomatic: number;
    cognitive: number;
  };
  coverage: {
    statement: number;
    branch: number;
    function: number;
  };
  duplication: {
    percentage: number;
    blocks: number;
  };
  size: {
    lines: number;
    statements: number;
    functions: number;
  };
}

export interface Suggestion {
  id: string;
  issueId: string;
  description: string;
  arabicDescription: string;
  patch: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number; // 0-100
  files: string[];
}
