export interface AuditConfig {
  target?: string;
  depth?: 'shallow' | 'deep';
  includeTests?: boolean;
  [key: string]: any;
}

export interface ValidationResult {
  passed: boolean;
  issues: string[];
  score: number;
}

export interface SystemHealth {
  isStable: boolean;
  issues: string[];
  timestamp: Date;
}

export interface AuditReport {
  timestamp: Date;
  config: AuditConfig;
  overallScore: number;
  passed: boolean;
  layers: ValidationResult[];
  issues: any[];
  recommendations: any[];
  truth?: LieDetectionReport;
  repairs?: Array<{ finding: Finding; proposal: RepairProposal }>;
  signature?: {
    algorithm: string;
    value: string;
  };
  signedAt?: Date;
}

export interface LieDetectionReport {
  timestamp: Date;
  overallVerdict: string;
  realityScore: number;
  liesDetected: number;
  detailedFindings: Finding[];
  confidence: number;
  recommendations: string[];
}

export interface Finding {
  type: string;
  isFake: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: string[];
  endpoint?: string;
  files?: string[];
  confidence: number;
}

export interface RiskAssessment {
  riskLevel: number;
  affectedComponents: string[];
  potentialSideEffects: string[];
  confidence: number;
}

export interface RepairProposal {
  autoApplicable: boolean;
  confidence: number;
  riskAssessment: RiskAssessment;
  recommendedAction: string;
  details?: any;
}

export interface AuditFinding {
  type: string;
  description: string;
  evidence: string[] | string;
  location: string[];
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
