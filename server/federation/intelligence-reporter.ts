/**
 * Intelligence Reporter - Phase 9.6.2
 * Generates comprehensive reports on intelligence system performance
 * 
 * Features:
 * - Intelligence statistics and trends
 * - Pattern analysis summary
 * - Broadcast performance metrics
 * - Node-level breakdowns
 * - JSON export for external analysis
 */

import { db } from '../db';
import { 
  intelligenceData, 
  intelligencePatterns, 
  intelligenceAuditLog,
  federationNodes
} from '@shared/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Intelligence Report Structure
 */
export interface IntelligenceReport {
  fileName: string;
  generatedAt: Date;
  reportPeriod: {
    from: Date;
    to: Date;
    days: number;
  };
  summary: {
    totalIntelligence: number;
    totalPatterns: number;
    activeNodes: number;
    broadcastSuccessRate: number;
    avgProcessingTime: number;
  };
  intelligenceBreakdown: {
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byNode: Record<string, number>;
  };
  patterns: {
    total: number;
    byType: Record<string, number>;
    highConfidence: number;
    avgConfidence: number;
  };
  broadcasting: {
    totalBroadcasts: number;
    successfulBroadcasts: number;
    failedBroadcasts: number;
    partialBroadcasts: number;
    avgResponseTime: number;
  };
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    health: number;
    intelligenceContributed: number;
    lastActivity: Date;
  }>;
  topPatterns: Array<{
    patternType: string;
    description: string;
    confidence: number;
    frequency: number;
  }>;
  recommendations: string[];
}

/**
 * Generate comprehensive intelligence report
 */
export async function generateIntelligenceReport(days = 7): Promise<IntelligenceReport> {
  console.log(`[Intelligence Reporter] 📊 Generating report for last ${days} days...`);
  
  const reportDate = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Gather intelligence statistics
  const allIntelligence = await db
    .select()
    .from(intelligenceData)
    .where(gte(intelligenceData.receivedAt, cutoffDate));
  
  // Gather patterns
  const allPatterns = await db
    .select()
    .from(intelligencePatterns)
    .where(gte(intelligencePatterns.firstDetectedAt, cutoffDate));
  
  // Gather broadcast audit logs  
  const allAuditLogs = await db
    .select()
    .from(intelligenceAuditLog)
    .where(gte(intelligenceAuditLog.createdAt, cutoffDate));
  
  const broadcastLogs = allAuditLogs.filter(log => 
    log.eventType && log.eventType.includes('broadcast')
  );
  
  // Gather active nodes
  const nodes = await db
    .select()
    .from(federationNodes)
    .where(eq(federationNodes.status, 'active'));
  
  // Calculate intelligence breakdown
  const intelligenceBreakdown = {
    byType: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byNode: {} as Record<string, number>
  };
  
  for (const intel of allIntelligence) {
    // By type
    intelligenceBreakdown.byType[intel.intelligenceType] = 
      (intelligenceBreakdown.byType[intel.intelligenceType] || 0) + 1;
    
    // By category
    intelligenceBreakdown.byCategory[intel.category] = 
      (intelligenceBreakdown.byCategory[intel.category] || 0) + 1;
    
    // By priority
    intelligenceBreakdown.byPriority[intel.priority] = 
      (intelligenceBreakdown.byPriority[intel.priority] || 0) + 1;
    
    // By node
    intelligenceBreakdown.byNode[intel.nodeId] = 
      (intelligenceBreakdown.byNode[intel.nodeId] || 0) + 1;
  }
  
  // Calculate pattern statistics
  const patternsByType: Record<string, number> = {};
  let totalConfidence = 0;
  let highConfidenceCount = 0;
  
  for (const pattern of allPatterns) {
    patternsByType[pattern.patternType] = 
      (patternsByType[pattern.patternType] || 0) + 1;
    
    totalConfidence += pattern.confidence;
    if (pattern.confidence >= 85) {
      highConfidenceCount++;
    }
  }
  
  const avgConfidence = allPatterns.length > 0 
    ? totalConfidence / allPatterns.length 
    : 0;
  
  // Calculate broadcast statistics
  const successfulBroadcasts = broadcastLogs.filter(
    log => log.eventStatus === 'success'
  ).length;
  
  const failedBroadcasts = broadcastLogs.filter(
    log => log.eventStatus === 'failed'
  ).length;
  
  const partialBroadcasts = broadcastLogs.filter(
    log => log.eventStatus === 'partial'
  ).length;
  
  const totalBroadcasts = broadcastLogs.length;
  const broadcastSuccessRate = totalBroadcasts > 0
    ? (successfulBroadcasts / totalBroadcasts) * 100
    : 0;
  
  const avgResponseTime = broadcastLogs.length > 0
    ? broadcastLogs.reduce((sum, log) => sum + (log.processingTime || 0), 0) / broadcastLogs.length
    : 0;
  
  // Get top patterns
  const topPatterns = allPatterns
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
    .map(p => ({
      patternType: p.patternType,
      description: p.description,
      confidence: p.confidence,
      frequency: p.frequency
    }));
  
  // Generate node summary
  const nodeSummary = nodes.map(node => ({
    nodeId: node.nodeId,
    nodeType: node.nodeType,
    health: node.health,
    intelligenceContributed: intelligenceBreakdown.byNode[node.nodeId] || 0,
    lastActivity: node.lastHeartbeat || node.createdAt
  }));
  
  // Generate recommendations
  const recommendations = generateRecommendations({
    totalIntelligence: allIntelligence.length,
    totalPatterns: allPatterns.length,
    broadcastSuccessRate,
    intelligenceBreakdown,
    patterns: allPatterns
  });
  
  // Build report
  const report: IntelligenceReport = {
    fileName: `intelligence-sync-report-${reportDate.toISOString().split('T')[0]}.json`,
    generatedAt: reportDate,
    reportPeriod: {
      from: cutoffDate,
      to: reportDate,
      days
    },
    summary: {
      totalIntelligence: allIntelligence.length,
      totalPatterns: allPatterns.length,
      activeNodes: nodes.length,
      broadcastSuccessRate: Math.round(broadcastSuccessRate * 100) / 100,
      avgProcessingTime: Math.round(avgResponseTime)
    },
    intelligenceBreakdown,
    patterns: {
      total: allPatterns.length,
      byType: patternsByType,
      highConfidence: highConfidenceCount,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    },
    broadcasting: {
      totalBroadcasts,
      successfulBroadcasts,
      failedBroadcasts,
      partialBroadcasts,
      avgResponseTime: Math.round(avgResponseTime)
    },
    nodes: nodeSummary,
    topPatterns,
    recommendations
  };
  
  // Save report to file
  await saveReport(report);
  
  console.log('[Intelligence Reporter] ✅ Report generated successfully');
  console.log(`   File: /reports/${report.fileName}`);
  console.log(`   Intelligence: ${report.summary.totalIntelligence}`);
  console.log(`   Patterns: ${report.summary.totalPatterns}`);
  console.log(`   Success Rate: ${report.summary.broadcastSuccessRate}%`);
  
  return report;
}

/**
 * Save report to file system
 */
async function saveReport(report: IntelligenceReport): Promise<void> {
  const reportsDir = join(process.cwd(), 'reports');
  const filePath = join(reportsDir, report.fileName);
  
  const reportJson = JSON.stringify(report, null, 2);
  await writeFile(filePath, reportJson, 'utf-8');
  
  // Also save a "latest" copy for easy access
  const latestPath = join(reportsDir, 'intelligence-sync-report-latest.json');
  await writeFile(latestPath, reportJson, 'utf-8');
}

/**
 * Generate recommendations based on report data
 */
function generateRecommendations(data: {
  totalIntelligence: number;
  totalPatterns: number;
  broadcastSuccessRate: number;
  intelligenceBreakdown: any;
  patterns: any[];
}): string[] {
  const recommendations: string[] = [];
  
  // Intelligence volume
  if (data.totalIntelligence < 10) {
    recommendations.push(
      'Low intelligence volume detected. Consider increasing data collection frequency from SIDE nodes.'
    );
  } else if (data.totalIntelligence > 1000) {
    recommendations.push(
      'High intelligence volume detected. Review data quality and consider implementing filtering.'
    );
  }
  
  // Pattern detection
  if (data.totalPatterns === 0) {
    recommendations.push(
      'No patterns detected. Ensure Pattern Miner is running and intelligence data is diverse enough.'
    );
  } else if (data.totalPatterns > 50) {
    recommendations.push(
      'Many patterns detected. Review and prioritize high-confidence patterns for action.'
    );
  }
  
  // Broadcast success rate
  if (data.broadcastSuccessRate < 80) {
    recommendations.push(
      `Low broadcast success rate (${data.broadcastSuccessRate.toFixed(1)}%). Check SIDE node connectivity and endpoint availability.`
    );
  } else if (data.broadcastSuccessRate === 100) {
    recommendations.push(
      'Perfect broadcast success rate! System is operating optimally.'
    );
  }
  
  // Category distribution
  const categories = Object.keys(data.intelligenceBreakdown.byCategory);
  if (categories.length < 3) {
    recommendations.push(
      'Limited intelligence categories detected. Expand data collection to cover more aspects of system operation.'
    );
  }
  
  // Security patterns
  const securityPatterns = data.patterns.filter((p: any) => 
    p.patternType === 'security_vulnerability'
  );
  if (securityPatterns.length > 0) {
    recommendations.push(
      `⚠️  ${securityPatterns.length} security pattern(s) detected. Review immediately and implement suggested actions.`
    );
  }
  
  // Performance patterns
  const performancePatterns = data.patterns.filter((p: any) => 
    p.patternType === 'performance_degradation'
  );
  if (performancePatterns.length > 0) {
    recommendations.push(
      `Performance degradation patterns detected. Investigate infrastructure and optimize resource usage.`
    );
  }
  
  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push(
      'System operating normally. Continue monitoring intelligence data and patterns.'
    );
  }
  
  return recommendations;
}

/**
 * Get latest report
 */
export async function getLatestReport(): Promise<IntelligenceReport | null> {
  try {
    const { readFile } = await import('fs/promises');
    const reportsDir = join(process.cwd(), 'reports');
    const latestPath = join(reportsDir, 'intelligence-sync-report-latest.json');
    
    const reportJson = await readFile(latestPath, 'utf-8');
    return JSON.parse(reportJson);
  } catch (error) {
    console.log('[Intelligence Reporter] No previous report found');
    return null;
  }
}
