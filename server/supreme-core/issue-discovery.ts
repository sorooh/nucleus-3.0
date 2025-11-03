/**
 * ISSUE DISCOVERY MODULE
 * 
 * Automatically discovers issues across the system:
 * - Integrity issues (mock data, simulations)
 * - Performance bottlenecks
 * - Security vulnerabilities
 * - Evolution opportunities
 * 
 * Feeds issues to Supreme Autonomous Agent for processing
 */

import { db } from '../db';
import { integrityReports, evolutionSuggestions } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

// ============================================
// Types
// ============================================

export interface DiscoveredIssue {
  id: string;
  type: 'integrity' | 'performance' | 'security' | 'evolution';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  target: string;
  context: Record<string, any>;
  discoveredAt: Date;
}

// ============================================
// Issue Discovery
// ============================================

export class IssueDiscovery {
  /**
   * Discover all current issues in the system
   */
  async discoverAll(): Promise<DiscoveredIssue[]> {
    console.log('🔍 [Discovery] Scanning system for issues...');

    const issues: DiscoveredIssue[] = [];

    // 1. Discover integrity issues
    const integrityIssues = await this.discoverIntegrityIssues();
    issues.push(...integrityIssues);

    // 2. Discover evolution opportunities
    const evolutionIssues = await this.discoverEvolutionOpportunities();
    issues.push(...evolutionIssues);

    console.log(`🔍 [Discovery] Found ${issues.length} issues:`);
    console.log(`   - Integrity: ${integrityIssues.length}`);
    console.log(`   - Evolution: ${evolutionIssues.length}`);

    return issues;
  }

  /**
   * Discover integrity issues from latest integrity report
   */
  private async discoverIntegrityIssues(): Promise<DiscoveredIssue[]> {
    const issues: DiscoveredIssue[] = [];

    try {
      // Get latest integrity report
      const latestReport = await db
        .select()
        .from(integrityReports)
        .orderBy(desc(integrityReports.cycleTimestamp))
        .limit(1);

      if (latestReport.length === 0) {
        return issues;
      }

      const report = latestReport[0];

      // Add fake modules as issues
      if (report.fakeModulesCount > 0) {
        const fakeModules = report.fakeModules as string[];
        
        fakeModules.forEach((module, index) => {
          issues.push({
            id: `integrity-fake-${report.cycleNumber}-${index}`,
            type: 'integrity',
            severity: 'high',
            description: `Mock data or fake implementation detected`,
            target: module,
            context: {
              reportId: report.id,
              cycleNumber: report.cycleNumber,
              issueType: 'fake_module'
            },
            discoveredAt: new Date()
          });
        });
      }

      // Add critical failures as issues
      if (report.criticalFailuresCount > 0) {
        const criticalFailures = report.criticalFailures as string[];
        
        criticalFailures.forEach((failure, index) => {
          issues.push({
            id: `integrity-critical-${report.cycleNumber}-${index}`,
            type: 'integrity',
            severity: 'critical',
            description: `Critical failure in module functionality`,
            target: failure,
            context: {
              reportId: report.id,
              cycleNumber: report.cycleNumber,
              issueType: 'critical_failure'
            },
            discoveredAt: new Date()
          });
        });
      }
    } catch (error) {
      console.error('❌ [Discovery] Failed to discover integrity issues:', error);
    }

    return issues;
  }

  /**
   * Discover evolution opportunities from suggestions
   */
  private async discoverEvolutionOpportunities(): Promise<DiscoveredIssue[]> {
    const issues: DiscoveredIssue[] = [];

    try {
      // Get pending evolution suggestions with high confidence
      const suggestions = await db
        .select()
        .from(evolutionSuggestions)
        .where(eq(evolutionSuggestions.status, 'pending'))
        .orderBy(desc(evolutionSuggestions.confidenceScore))
        .limit(10);

      suggestions.forEach(suggestion => {
        // All pending suggestions are considered evolution opportunities
        issues.push({
          id: `evolution-${suggestion.id}`,
          type: 'evolution',
          severity: suggestion.riskLevel === 'high' ? 'high' : 'medium',
          description: suggestion.learnedLesson,
          target: suggestion.patternSource,
          context: {
            suggestionId: suggestion.id,
            pattern: suggestion.patternDetected,
            improvementType: suggestion.improvementType,
            estimatedImpact: suggestion.estimatedImpact,
            confidenceScore: suggestion.confidenceScore
          },
          discoveredAt: new Date()
        });
      });
    } catch (error) {
      console.error('❌ [Discovery] Failed to discover evolution opportunities:', error);
    }

    return issues;
  }

  /**
   * Prioritize issues by severity and impact
   */
  prioritize(issues: DiscoveredIssue[]): DiscoveredIssue[] {
    return issues.sort((a, b) => {
      // Sort by severity first
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      
      if (severityDiff !== 0) {
        return severityDiff;
      }

      // Then by type (integrity > security > performance > evolution)
      const typeOrder = { integrity: 0, security: 1, performance: 2, evolution: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }
}

// ============================================
// Singleton Instance
// ============================================

export const issueDiscovery = new IssueDiscovery();
