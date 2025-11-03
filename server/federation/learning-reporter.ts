/**
 * Learning Reporter - Phase 9.7.1
 * نظام تقارير التعلّم الأسبوعية
 * 
 * يُنشئ تقارير شاملة عن أداء التعلّم الذاتي
 * يحفظها في /reports/learning/
 */

import { db } from '../db';
import {
  autonomousDecisions,
  intelligencePatterns,
  federationNodes
} from '@shared/schema';
import { eq, desc, gte, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

/**
 * Learning Report Structure
 */
interface LearningReport {
  reportId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
    durationDays: number;
  };
  summary: {
    totalDecisions: number;
    decisionsWithFeedback: number;
    avgConfidence: number;
    avgFeedbackScore: number;
    avgSuccessRate: number;
    avgImpact: number;
  };
  byDecisionType: {
    [key: string]: {
      count: number;
      avgConfidence: number;
      successRate: number;
    };
  };
  byNode: {
    [key: string]: {
      totalDecisions: number;
      successCount: number;
      failCount: number;
      avgImpact: number;
    };
  };
  topPerformingPatterns: {
    patternId: string;
    successCount: number;
    avgImpact: number;
  }[];
  recommendations: string[];
  trends: {
    confidenceGrowth: number; // percentage
    accuracyImprovement: number; // percentage
    learningVelocity: string; // 'increasing', 'stable', 'decreasing'
  };
}

/**
 * Learning Reporter Class
 */
export class LearningReporter {
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports', 'learning');
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
      console.log('[Learning Reporter] Reports directory created:', this.reportsDir);
    }
  }

  /**
   * Generate weekly learning report
   */
  async generateWeeklyReport(): Promise<LearningReport> {
    console.log('[Learning Reporter] 📊 Generating weekly report...');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const reportId = `weekly-${Date.now()}`;
    
    // Fetch decisions from last 7 days
    const decisions = await db
      .select()
      .from(autonomousDecisions)
      .where(gte(autonomousDecisions.createdAt, startDate))
      .orderBy(desc(autonomousDecisions.createdAt));
    
    const decisionsWithFeedback = decisions.filter(d => d.feedbackReceived === 1);
    
    // Summary
    const summary = {
      totalDecisions: decisions.length,
      decisionsWithFeedback: decisionsWithFeedback.length,
      avgConfidence: this.calculateAverage(decisions.map(d => d.confidence)),
      avgFeedbackScore: this.calculateAverage(decisionsWithFeedback.map(d => d.feedbackScore)),
      avgSuccessRate: this.calculateAverage(decisions.map(d => d.successRate)),
      avgImpact: this.calculateAverage(
        decisionsWithFeedback
          .filter(d => d.actualImpact !== null)
          .map(d => d.actualImpact || 0)
      )
    };
    
    // By Decision Type
    const byDecisionType = this.groupByDecisionType(decisions);
    
    // By Node
    const byNode = this.groupByNode(decisionsWithFeedback);
    
    // Top Performing Patterns
    const topPerformingPatterns = await this.getTopPatterns(decisionsWithFeedback);
    
    // Recommendations
    const recommendations = this.generateRecommendations(summary, byDecisionType, byNode);
    
    // Trends (compare with previous week)
    const trends = await this.analyzeTrends(startDate);
    
    const report: LearningReport = {
      reportId,
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        durationDays: 7
      },
      summary,
      byDecisionType,
      byNode,
      topPerformingPatterns,
      recommendations,
      trends
    };
    
    // Save report
    await this.saveReport(report);
    
    console.log('[Learning Reporter] ✅ Weekly report generated:', reportId);
    return report;
  }

  /**
   * Generate monthly learning report
   */
  async generateMonthlyReport(): Promise<LearningReport> {
    console.log('[Learning Reporter] 📊 Generating monthly report...');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const reportId = `monthly-${Date.now()}`;
    
    const decisions = await db
      .select()
      .from(autonomousDecisions)
      .where(gte(autonomousDecisions.createdAt, startDate))
      .orderBy(desc(autonomousDecisions.createdAt));
    
    const decisionsWithFeedback = decisions.filter(d => d.feedbackReceived === 1);
    
    const summary = {
      totalDecisions: decisions.length,
      decisionsWithFeedback: decisionsWithFeedback.length,
      avgConfidence: this.calculateAverage(decisions.map(d => d.confidence)),
      avgFeedbackScore: this.calculateAverage(decisionsWithFeedback.map(d => d.feedbackScore)),
      avgSuccessRate: this.calculateAverage(decisions.map(d => d.successRate)),
      avgImpact: this.calculateAverage(
        decisionsWithFeedback
          .filter(d => d.actualImpact !== null)
          .map(d => d.actualImpact || 0)
      )
    };
    
    const byDecisionType = this.groupByDecisionType(decisions);
    const byNode = this.groupByNode(decisionsWithFeedback);
    const topPerformingPatterns = await this.getTopPatterns(decisionsWithFeedback);
    const recommendations = this.generateRecommendations(summary, byDecisionType, byNode);
    const trends = await this.analyzeTrends(startDate);
    
    const report: LearningReport = {
      reportId,
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        durationDays: 30
      },
      summary,
      byDecisionType,
      byNode,
      topPerformingPatterns,
      recommendations,
      trends
    };
    
    await this.saveReport(report);
    
    console.log('[Learning Reporter] ✅ Monthly report generated:', reportId);
    return report;
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Group decisions by type
   */
  private groupByDecisionType(decisions: any[]): any {
    const grouped: any = {};
    
    for (const decision of decisions) {
      const type = decision.decisionType;
      
      if (!grouped[type]) {
        grouped[type] = {
          count: 0,
          totalConfidence: 0,
          totalSuccess: 0
        };
      }
      
      grouped[type].count++;
      grouped[type].totalConfidence += decision.confidence;
      grouped[type].totalSuccess += decision.successRate;
    }
    
    // Calculate averages
    const result: any = {};
    for (const [type, data] of Object.entries(grouped)) {
      const d = data as any;
      result[type] = {
        count: d.count,
        avgConfidence: d.totalConfidence / d.count,
        successRate: d.totalSuccess / d.count
      };
    }
    
    return result;
  }

  /**
   * Group decisions by node
   */
  private groupByNode(decisions: any[]): any {
    const grouped: any = {};
    
    for (const decision of decisions) {
      const nodeId = decision.nodeId;
      
      if (!grouped[nodeId]) {
        grouped[nodeId] = {
          totalDecisions: 0,
          successCount: 0,
          failCount: 0,
          totalImpact: 0,
          impactCount: 0
        };
      }
      
      grouped[nodeId].totalDecisions++;
      
      if (decision.feedbackScore > 0) {
        grouped[nodeId].successCount++;
      } else {
        grouped[nodeId].failCount++;
      }
      
      if (decision.actualImpact !== null) {
        grouped[nodeId].totalImpact += decision.actualImpact;
        grouped[nodeId].impactCount++;
      }
    }
    
    // Calculate averages
    const result: any = {};
    for (const [nodeId, data] of Object.entries(grouped)) {
      const d = data as any;
      result[nodeId] = {
        totalDecisions: d.totalDecisions,
        successCount: d.successCount,
        failCount: d.failCount,
        avgImpact: d.impactCount > 0 ? d.totalImpact / d.impactCount : 0
      };
    }
    
    return result;
  }

  /**
   * Get top performing patterns
   */
  private async getTopPatterns(decisions: any[]): Promise<any[]> {
    const patternStats: Map<string, { successCount: number; totalImpact: number; count: number }> = new Map();
    
    for (const decision of decisions) {
      if (!decision.sourcePattern) continue;
      
      const existing = patternStats.get(decision.sourcePattern) || {
        successCount: 0,
        totalImpact: 0,
        count: 0
      };
      
      if (decision.feedbackScore > 0) {
        existing.successCount++;
      }
      
      if (decision.actualImpact !== null) {
        existing.totalImpact += decision.actualImpact;
        existing.count++;
      }
      
      patternStats.set(decision.sourcePattern, existing);
    }
    
    return Array.from(patternStats.entries())
      .map(([patternId, stats]) => ({
        patternId,
        successCount: stats.successCount,
        avgImpact: stats.count > 0 ? stats.totalImpact / stats.count : 0
      }))
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 10);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(summary: any, byType: any, byNode: any): string[] {
    const recommendations: string[] = [];
    
    // Confidence recommendations
    if (summary.avgConfidence < 0.6) {
      recommendations.push('Low average confidence detected. Increase training data or review decision criteria.');
    } else if (summary.avgConfidence > 0.85) {
      recommendations.push('High confidence achieved. System is learning effectively.');
    }
    
    // Feedback coverage
    const feedbackRate = summary.decisionsWithFeedback / summary.totalDecisions;
    if (feedbackRate < 0.5) {
      recommendations.push(`Low feedback rate (${(feedbackRate * 100).toFixed(1)}%). Encourage nodes to provide feedback.`);
    }
    
    // Success rate
    if (summary.avgSuccessRate < 0.7) {
      recommendations.push('Success rate below target. Review decision generation logic.');
    } else if (summary.avgSuccessRate > 0.9) {
      recommendations.push('Excellent success rate. Continue current learning approach.');
    }
    
    // Node-specific
    for (const [nodeId, stats] of Object.entries(byNode)) {
      const s = stats as any;
      const nodeSuccessRate = s.successCount / s.totalDecisions;
      
      if (nodeSuccessRate < 0.5) {
        recommendations.push(`Node ${nodeId} has low success rate (${(nodeSuccessRate * 100).toFixed(1)}%). Review decisions for this node.`);
      }
    }
    
    // Impact
    if (summary.avgImpact < 0.3) {
      recommendations.push('Low average impact. Consider more aggressive optimization decisions.');
    } else if (summary.avgImpact > 0.8) {
      recommendations.push('High impact achieved. Decisions are making significant improvements.');
    }
    
    return recommendations;
  }

  /**
   * Analyze trends compared to previous period
   */
  private async analyzeTrends(currentStartDate: Date): Promise<any> {
    const previousEndDate = new Date(currentStartDate);
    const previousStartDate = new Date(currentStartDate);
    previousStartDate.setDate(previousStartDate.getDate() - 7);
    
    const previousDecisions = await db
      .select()
      .from(autonomousDecisions)
      .where(
        and(
          gte(autonomousDecisions.createdAt, previousStartDate),
          gte(autonomousDecisions.createdAt, previousEndDate)
        )
      );
    
    const currentDecisions = await db
      .select()
      .from(autonomousDecisions)
      .where(gte(autonomousDecisions.createdAt, currentStartDate));
    
    const prevAvgConfidence = this.calculateAverage(previousDecisions.map(d => d.confidence));
    const currAvgConfidence = this.calculateAverage(currentDecisions.map(d => d.confidence));
    
    const prevSuccessRate = this.calculateAverage(previousDecisions.map(d => d.successRate));
    const currSuccessRate = this.calculateAverage(currentDecisions.map(d => d.successRate));
    
    const confidenceGrowth = prevAvgConfidence > 0 
      ? ((currAvgConfidence - prevAvgConfidence) / prevAvgConfidence) * 100 
      : 0;
    
    const accuracyImprovement = prevSuccessRate > 0
      ? ((currSuccessRate - prevSuccessRate) / prevSuccessRate) * 100
      : 0;
    
    let learningVelocity = 'stable';
    if (confidenceGrowth > 5) learningVelocity = 'increasing';
    else if (confidenceGrowth < -5) learningVelocity = 'decreasing';
    
    return {
      confidenceGrowth,
      accuracyImprovement,
      learningVelocity
    };
  }

  /**
   * Save report to file
   */
  private async saveReport(report: LearningReport): Promise<void> {
    const filename = `${report.reportId}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    
    // Also save a "latest" version
    const latestPath = path.join(this.reportsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log('[Learning Reporter] Report saved:', filepath);
  }

  /**
   * Get latest report
   */
  getLatestReport(): LearningReport | null {
    const latestPath = path.join(this.reportsDir, 'latest.json');
    
    if (!fs.existsSync(latestPath)) {
      return null;
    }
    
    const content = fs.readFileSync(latestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * List all reports
   */
  listReports(): string[] {
    if (!fs.existsSync(this.reportsDir)) {
      return [];
    }
    
    return fs.readdirSync(this.reportsDir)
      .filter(f => f.endsWith('.json') && f !== 'latest.json')
      .sort()
      .reverse();
  }
}

// Export singleton instance
export const learningReporter = new LearningReporter();

console.log('[Learning Reporter] Module loaded');
