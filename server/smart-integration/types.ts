// Phase 12.0 - Smart Integration & Auto-Generation System Types
// Zero-Mock Policy: All data from real database and runtime analysis

export type IntegrationPoint = {
  from: string;
  to: string;
  type: string;
  frequency: 'realtime' | 'hourly' | 'daily';
  data: string[];
  security?: 'low' | 'medium' | 'high';
};

export type IntegrationPlan = {
  id: string;
  name: string;
  description: string;
  applications: string[];
  integrationPoints: IntegrationPoint[];
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number;
  autoImplement: boolean;
};

export type IntegrationStep = {
  type: 'api_creation' | 'data_mapping' | 'security_setup' | 'testing';
  description: string;
  action: () => Promise<any>;
};

export type IntegrationResult = {
  planId: string;
  success: boolean;
  integrationsCreated: number;
  totalIntegrations: number;
  details: any;
};

export type AppRequirements = {
  name: string;
  type: string;
  domain: string;
  capabilities: string[];
  integrations: string[];
  priority?: 'auto' | 'manual';
};

export type AppGenerationResult = {
  appId: string;
  name: string;
  status: 'generated' | 'deployed' | 'failed';
  url?: string;
  integrations?: any[];
  generatedAt: Date;
};
