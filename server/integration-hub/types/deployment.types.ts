/**
 * ═══════════════════════════════════════════════════════════
 * Integration Hub - Deployment Types
 * ═══════════════════════════════════════════════════════════
 * أنواع النشر والتطبيق الآمن
 * Built from absolute zero - Abu Sham Vision
 */

/**
 * إستراتيجيات النشر - Deployment Strategies
 */
export interface DeploymentStrategy {
  type: 'DRY_RUN' | 'CREATE_PR' | 'AUTO_APPLY' | 'SCHEDULED';
  approvalRequired: boolean;
  reviewers?: string[];
  schedule?: DeploymentSchedule;
  rollbackConfig?: RollbackConfig;
}

export interface DeploymentSchedule {
  type: 'IMMEDIATE' | 'SPECIFIC_TIME' | 'MAINTENANCE_WINDOW';
  executeAt?: Date;
  timezone?: string;
}

export interface RollbackConfig {
  enabled: boolean;
  automatic: boolean;
  timeout: number; // دقائق
  conditions: RollbackCondition[];
}

export interface RollbackCondition {
  metric: string;
  operator: 'GT' | 'LT' | 'EQ';
  value: number;
  duration: number; // ثواني
}

/**
 * نتائج النشر - Deployment Results
 */
export interface DeploymentResult {
  id: string;
  jobId: string;
  strategy: DeploymentStrategy['type'];
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  patch: Patch;
  branchName?: string;
  prUrl?: string;
  commitHash?: string;
  deployedAt?: Date;
  rollbackReason?: string;
  metrics: DeploymentMetrics;
}

export interface Patch {
  id: string;
  jobId: string;
  description: string;
  arabicDescription: string;
  changes: FileChange[];
  riskAssessment: RiskAssessment;
  createdBy: string;
  createdAt: Date;
}

export interface FileChange {
  file: string;
  originalContent: string;
  newContent: string;
  changeType: 'ADD' | 'MODIFY' | 'DELETE';
  diff: string;
}

export interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  breakingChanges: boolean;
  affectedFiles: number;
  testCoverage: number;
  securityImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DeploymentMetrics {
  deploymentTime: number;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  testsPassed: number;
  testsFailed: number;
}
