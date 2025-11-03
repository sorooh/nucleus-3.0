// Phase 12.0 - Need Analysis Engine
// Analyzes integration needs across applications using REAL DATA ONLY
// Zero-Mock Policy ENFORCED: All analysis from database queries

import { Pool } from '@neondatabase/serverless';
import { IntegrationPlan } from './types';

export type WorkflowAnalysis = {
  workflows: any[];
  missingConnections: any[];
  optimizationOpportunities: any[];
};

export class NeedAnalysisEngine {
  constructor(private pool: Pool) {}

  async analyzeIntegrationNeeds(): Promise<IntegrationPlan[]> {
    console.log('[NeedAnalysis] 🔍 تحليل احتياجات الربط الذكي - من قاعدة البيانات الحقيقية...');

    // Get all active applications from database
    const appsResult = await this.pool.query(`
      SELECT id, title, domain, status 
      FROM applications_catalog 
      WHERE status = 'active'
    `);
    
    if (appsResult.rows.length === 0) {
      console.log('[NeedAnalysis] ⚠️  No active applications found in database');
      return [];
    }

    console.log(`[NeedAnalysis] 📊 Found ${appsResult.rows.length} active applications`);

    // Analyze real business workflows based on application types
    const commerceApps = appsResult.rows.filter(app => 
      ['B2C', 'B2B', 'COMMERCE'].includes(app.domain)
    );
    const supportApps = appsResult.rows.filter(app => 
      ['CUSTOMER_SERVICE', 'DOCS', 'SCP'].includes(app.domain)
    );
    const operationsApps = appsResult.rows.filter(app => 
      ['SHIPPING', 'WAREHOUSE', 'BILLING'].includes(app.domain)
    );
    const marketingApps = appsResult.rows.filter(app => 
      ['MARKETING', 'EMAIL', 'LOYALTY'].includes(app.domain)
    );

    const plans: IntegrationPlan[] = [];

    // Commerce Integration Plan (if we have commerce + support/ops apps)
    if (commerceApps.length > 0 && (supportApps.length > 0 || operationsApps.length > 0)) {
      const commercePlan = await this.createCommerceIntegrationPlan(
        commerceApps, 
        supportApps, 
        operationsApps
      );
      if (commercePlan) plans.push(commercePlan);
    }

    // Customer Support Integration Plan
    if (supportApps.length >= 2) {
      const supportPlan = await this.createSupportIntegrationPlan(supportApps);
      if (supportPlan) plans.push(supportPlan);
    }

    // Marketing Integration Plan
    if (marketingApps.length > 0 && commerceApps.length > 0) {
      const marketingPlan = await this.createMarketingIntegrationPlan(
        marketingApps,
        commerceApps
      );
      if (marketingPlan) plans.push(marketingPlan);
    }

    console.log(`[NeedAnalysis] ✅ Generated ${plans.length} integration plans from real data`);
    return this.prioritizeIntegrationPlans(plans);
  }

  private async createCommerceIntegrationPlan(
    commerceApps: any[],
    supportApps: any[],
    operationsApps: any[]
  ): Promise<IntegrationPlan | null> {
    const apps = [...commerceApps, ...supportApps, ...operationsApps].map(a => a.id);
    if (apps.length < 2) return null;

    const integrationPoints = [];
    
    // Real integration points based on actual apps
    for (const commerce of commerceApps) {
      for (const support of supportApps) {
        integrationPoints.push({
          from: commerce.id,
          to: support.id,
          type: 'order_support',
          frequency: 'realtime',
          data: ['order_details', 'customer_info']
        });
      }
      
      for (const ops of operationsApps) {
        integrationPoints.push({
          from: commerce.id,
          to: ops.id,
          type: 'order_fulfillment',
          frequency: 'realtime',
          data: ['order_data', 'shipping_info']
        });
      }
    }

    // Store plan in database
    await this.pool.query(`
      INSERT INTO integration_plans (id, name, description, applications, priority, estimated_impact, auto_implement)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        applications = EXCLUDED.applications,
        estimated_impact = EXCLUDED.estimated_impact
    `, [
      'integration-commerce-' + Date.now(),
      'تكامل التجارة الإلكترونية',
      `ربط ${commerceApps.length} منصة تجارية مع ${supportApps.length + operationsApps.length} منصة دعم وعمليات`,
      apps,
      'high',
      Math.min(95, 70 + (apps.length * 5)),
      true
    ]);

    return {
      id: 'integration-commerce-' + Date.now(),
      name: 'تكامل التجارة الإلكترونية',
      description: `ربط ${commerceApps.length} منصة تجارية مع ${supportApps.length + operationsApps.length} منصة دعم وعمليات`,
      applications: apps,
      integrationPoints,
      priority: 'high',
      estimatedImpact: Math.min(95, 70 + (apps.length * 5)),
      autoImplement: true
    };
  }

  private async createSupportIntegrationPlan(supportApps: any[]): Promise<IntegrationPlan | null> {
    if (supportApps.length < 2) return null;

    const apps = supportApps.map(a => a.id);
    const integrationPoints = [];

    // Create mesh between support apps
    for (let i = 0; i < supportApps.length; i++) {
      for (let j = i + 1; j < supportApps.length; j++) {
        integrationPoints.push({
          from: supportApps[i].id,
          to: supportApps[j].id,
          type: 'ticket_sharing',
          frequency: 'realtime',
          data: ['tickets', 'customer_data']
        });
      }
    }

    await this.pool.query(`
      INSERT INTO integration_plans (id, name, description, applications, priority, estimated_impact, auto_implement)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        applications = EXCLUDED.applications
    `, [
      'integration-support-' + Date.now(),
      'تكامل خدمة العملاء',
      `ربط ${supportApps.length} منصة دعم ومساعدة`,
      apps,
      'medium',
      Math.min(90, 60 + (apps.length * 7)),
      true
    ]);

    return {
      id: 'integration-support-' + Date.now(),
      name: 'تكامل خدمة العملاء',
      description: `ربط ${supportApps.length} منصة دعم ومساعدة`,
      applications: apps,
      integrationPoints,
      priority: 'medium',
      estimatedImpact: Math.min(90, 60 + (apps.length * 7)),
      autoImplement: true
    };
  }

  private async createMarketingIntegrationPlan(
    marketingApps: any[],
    commerceApps: any[]
  ): Promise<IntegrationPlan | null> {
    const apps = [...marketingApps, ...commerceApps].map(a => a.id);
    if (apps.length < 2) return null;

    const integrationPoints = [];
    for (const marketing of marketingApps) {
      for (const commerce of commerceApps) {
        integrationPoints.push({
          from: marketing.id,
          to: commerce.id,
          type: 'campaign_tracking',
          frequency: 'realtime',
          data: ['campaign_data', 'conversion_metrics']
        });
      }
    }

    await this.pool.query(`
      INSERT INTO integration_plans (id, name, description, applications, priority, estimated_impact, auto_implement)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        applications = EXCLUDED.applications
    `, [
      'integration-marketing-' + Date.now(),
      'تكامل التسويق',
      `ربط ${marketingApps.length} منصة تسويق مع ${commerceApps.length} منصة تجارية`,
      apps,
      'medium',
      Math.min(85, 55 + (apps.length * 6)),
      true
    ]);

    return {
      id: 'integration-marketing-' + Date.now(),
      name: 'تكامل التسويق',
      description: `ربط ${marketingApps.length} منصة تسويق مع ${commerceApps.length} منصة تجارية`,
      applications: apps,
      integrationPoints,
      priority: 'medium',
      estimatedImpact: Math.min(85, 55 + (apps.length * 6)),
      autoImplement: true
    };
  }

  private prioritizeIntegrationPlans(plans: IntegrationPlan[]): IntegrationPlan[] {
    return plans.sort((a, b) => (b.estimatedImpact) - (a.estimatedImpact));
  }
}
