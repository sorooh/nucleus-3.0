/**
 * Intelligence Pattern Miner - Phase 9.6.2
 * Analyzes intelligence data to discover recurring patterns and insights
 * 
 * Features:
 * - Pattern detection across multiple intelligence items
 * - Confidence scoring based on frequency and consistency
 * - Automatic pattern storage and updates
 * - Cross-node pattern analysis
 */

import { db } from '../db';
import { intelligenceData, intelligencePatterns, intelligenceAuditLog, type IntelligenceData } from '@shared/schema';
import { desc, eq, sql, and, gte } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Pattern Types
 */
export type PatternType = 
  | 'code_quality_trend'
  | 'performance_degradation'
  | 'security_vulnerability'
  | 'usage_spike'
  | 'error_cluster'
  | 'resource_bottleneck'
  | 'anomaly_detection';

/**
 * Pattern Detection Result
 */
export interface PatternResult {
  patternType: PatternType;
  confidence: number;
  frequency: number;
  sourceNodes: string[];
  firstSeen: Date;
  lastSeen: Date;
  description: string;
  evidence: any[];
  suggestedActions: string[];
}

/**
 * Pattern Miner Configuration
 */
export interface PatternMinerConfig {
  minConfidence: number;        // Minimum confidence to save pattern (0-100)
  minFrequency: number;          // Minimum occurrences to be considered a pattern
  lookbackDays: number;          // How far back to analyze
  enabledPatternTypes: PatternType[];
}

const DEFAULT_CONFIG: PatternMinerConfig = {
  minConfidence: 70,
  minFrequency: 3,
  lookbackDays: 7,
  enabledPatternTypes: [
    'code_quality_trend',
    'performance_degradation',
    'security_vulnerability',
    'usage_spike',
    'error_cluster'
  ]
};

/**
 * Main Pattern Miner Class
 */
export class IntelligencePatternMiner {
  private config: PatternMinerConfig;
  
  constructor(config: Partial<PatternMinerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Run pattern mining on recent intelligence data
   */
  async minePatterns(): Promise<PatternResult[]> {
    console.log('[Pattern Miner] 🔍 Starting pattern analysis...');
    const startTime = Date.now();
    
    try {
      // Get recent intelligence data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.lookbackDays);
      
      const recentIntelligence = await db
        .select()
        .from(intelligenceData)
        .where(
          and(
            gte(intelligenceData.receivedAt, cutoffDate),
            eq(intelligenceData.verified, 1)
          )
        )
        .orderBy(desc(intelligenceData.receivedAt));
      
      console.log(`[Pattern Miner] Analyzing ${recentIntelligence.length} intelligence items from last ${this.config.lookbackDays} days`);
      
      const discoveredPatterns: PatternResult[] = [];
      
      // Detect patterns for each enabled type
      for (const patternType of this.config.enabledPatternTypes) {
        const patterns = await this.detectPatternType(patternType, recentIntelligence);
        discoveredPatterns.push(...patterns);
      }
      
      // Filter by confidence and frequency
      const validPatterns = discoveredPatterns.filter(p => 
        p.confidence >= this.config.minConfidence && 
        p.frequency >= this.config.minFrequency
      );
      
      console.log(`[Pattern Miner] ✅ Discovered ${validPatterns.length} valid patterns (from ${discoveredPatterns.length} candidates)`);
      
      // Store patterns
      for (const pattern of validPatterns) {
        await this.storePattern(pattern);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Log audit
      await db.insert(intelligenceAuditLog).values({
        eventType: 'pattern_mining_complete',
        eventStatus: 'success',
        endpoint: 'pattern-miner',
        method: 'CRON',
        processingTime,
        itemsProcessed: validPatterns.length,
        metadata: {
          totalCandidates: discoveredPatterns.length,
          validPatterns: validPatterns.length,
          analysisWindow: `${this.config.lookbackDays} days`,
          intelligenceAnalyzed: recentIntelligence.length
        }
      });
      
      return validPatterns;
      
    } catch (error: any) {
      console.error('[Pattern Miner] ❌ Error:', error);
      
      await db.insert(intelligenceAuditLog).values({
        eventType: 'pattern_mining_failed',
        eventStatus: 'failed',
        endpoint: 'pattern-miner',
        method: 'CRON',
        errorMessage: error.message,
        errorCode: error.code || 'PATTERN_MINING_ERROR',
        metadata: { stack: error.stack }
      });
      
      throw error;
    }
  }
  
  /**
   * Detect patterns of a specific type
   */
  private async detectPatternType(
    patternType: PatternType,
    intelligence: IntelligenceData[]
  ): Promise<PatternResult[]> {
    
    switch (patternType) {
      case 'code_quality_trend':
        return this.detectCodeQualityTrends(intelligence);
      
      case 'performance_degradation':
        return this.detectPerformanceDegradation(intelligence);
      
      case 'security_vulnerability':
        return this.detectSecurityPatterns(intelligence);
      
      case 'usage_spike':
        return this.detectUsageSpikes(intelligence);
      
      case 'error_cluster':
        return this.detectErrorClusters(intelligence);
      
      default:
        return [];
    }
  }
  
  /**
   * Detect code quality trends
   */
  private async detectCodeQualityTrends(intelligence: IntelligenceData[]): Promise<PatternResult[]> {
    const codeQualityItems = intelligence.filter(i => 
      i.category === 'code_quality' && i.intelligenceType === 'insight'
    );
    
    if (codeQualityItems.length < this.config.minFrequency) {
      return [];
    }
    
    // Group by node to find trends
    const nodeMap = new Map<string, IntelligenceData[]>();
    for (const item of codeQualityItems) {
      if (!nodeMap.has(item.nodeId)) {
        nodeMap.set(item.nodeId, []);
      }
      nodeMap.get(item.nodeId)!.push(item);
    }
    
    const patterns: PatternResult[] = [];
    
    // Detect declining quality
    for (const [nodeId, items] of nodeMap) {
      if (items.length >= 3) {
        const sortedItems = items.sort((a, b) => 
          new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
        );
        
        // Check if issues are increasing
        const issuesCounts = sortedItems.map(i => (i.data as any).issuesFound || 0);
        const isIncreasing = issuesCounts.slice(1).every((count, idx) => 
          count >= issuesCounts[idx]
        );
        
        if (isIncreasing && issuesCounts[issuesCounts.length - 1] > issuesCounts[0]) {
          patterns.push({
            patternType: 'code_quality_trend',
            confidence: 85,
            frequency: items.length,
            sourceNodes: [nodeId],
            firstSeen: new Date(sortedItems[0].receivedAt),
            lastSeen: new Date(sortedItems[sortedItems.length - 1].receivedAt),
            description: `Code quality declining on ${nodeId}: issues increased from ${issuesCounts[0]} to ${issuesCounts[issuesCounts.length - 1]}`,
            evidence: sortedItems.map(i => ({
              intelligenceId: i.intelligenceId,
              title: i.title,
              issuesFound: (i.data as any).issuesFound
            })),
            suggestedActions: [
              'Schedule code review session',
              'Implement automated linting',
              'Review recent commits for quality issues'
            ]
          });
        }
      }
    }
    
    return patterns;
  }
  
  /**
   * Detect performance degradation
   */
  private async detectPerformanceDegradation(intelligence: IntelligenceData[]): Promise<PatternResult[]> {
    const performanceItems = intelligence.filter(i => 
      i.category === 'performance' && i.intelligenceType === 'insight'
    );
    
    if (performanceItems.length < this.config.minFrequency) {
      return [];
    }
    
    const patterns: PatternResult[] = [];
    
    // Look for increasing latency or decreasing throughput
    const latencyItems = performanceItems.filter(i => 
      (i.data as any).avgLatency !== undefined
    );
    
    if (latencyItems.length >= 3) {
      const sortedItems = latencyItems.sort((a, b) => 
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );
      
      const latencies = sortedItems.map(i => (i.data as any).avgLatency);
      const avgIncrease = latencies.slice(1).reduce((sum, lat, idx) => 
        sum + (lat - latencies[idx]), 0
      ) / (latencies.length - 1);
      
      if (avgIncrease > 50) { // More than 50ms average increase
        patterns.push({
          patternType: 'performance_degradation',
          confidence: 90,
          frequency: latencyItems.length,
          sourceNodes: [...new Set(latencyItems.map(i => i.nodeId))],
          firstSeen: new Date(sortedItems[0].receivedAt),
          lastSeen: new Date(sortedItems[sortedItems.length - 1].receivedAt),
          description: `Performance degradation detected: average latency increased by ${avgIncrease.toFixed(0)}ms`,
          evidence: sortedItems.map(i => ({
            intelligenceId: i.intelligenceId,
            latency: (i.data as any).avgLatency,
            timestamp: i.receivedAt
          })),
          suggestedActions: [
            'Review database query performance',
            'Check for memory leaks',
            'Analyze recent code changes',
            'Monitor server resource usage'
          ]
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Detect security-related patterns
   */
  private async detectSecurityPatterns(intelligence: IntelligenceData[]): Promise<PatternResult[]> {
    const securityAlerts = intelligence.filter(i => 
      i.category === 'security' && i.intelligenceType === 'alert'
    );
    
    if (securityAlerts.length < this.config.minFrequency) {
      return [];
    }
    
    const patterns: PatternResult[] = [];
    
    // Group by alert type
    const alertTypes = new Map<string, IntelligenceData[]>();
    for (const alert of securityAlerts) {
      const alertType = (alert.data as any).alertType || 'unknown';
      if (!alertTypes.has(alertType)) {
        alertTypes.set(alertType, []);
      }
      alertTypes.get(alertType)!.push(alert);
    }
    
    // Find recurring security issues
    for (const [alertType, alerts] of alertTypes) {
      if (alerts.length >= 3) {
        patterns.push({
          patternType: 'security_vulnerability',
          confidence: 95,
          frequency: alerts.length,
          sourceNodes: [...new Set(alerts.map(a => a.nodeId))],
          firstSeen: new Date(Math.min(...alerts.map(a => new Date(a.receivedAt).getTime()))),
          lastSeen: new Date(Math.max(...alerts.map(a => new Date(a.receivedAt).getTime()))),
          description: `Recurring security alert: ${alertType} (${alerts.length} occurrences)`,
          evidence: alerts.map(a => ({
            intelligenceId: a.intelligenceId,
            severity: a.priority,
            details: (a.data as any).details
          })),
          suggestedActions: [
            'Investigate root cause immediately',
            'Review security policies',
            'Update security dependencies',
            'Implement additional monitoring'
          ]
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Detect usage spikes
   */
  private async detectUsageSpikes(intelligence: IntelligenceData[]): Promise<PatternResult[]> {
    const usageItems = intelligence.filter(i => 
      i.category === 'usage' && (i.data as any).activeUsers !== undefined
    );
    
    if (usageItems.length < 3) {
      return [];
    }
    
    const patterns: PatternResult[] = [];
    
    // Calculate average usage
    const usageCounts = usageItems.map(i => (i.data as any).activeUsers);
    const avgUsage = usageCounts.reduce((sum, count) => sum + count, 0) / usageCounts.length;
    
    // Find spikes (> 2x average)
    const spikes = usageItems.filter(i => (i.data as any).activeUsers > avgUsage * 2);
    
    if (spikes.length >= 2) {
      patterns.push({
        patternType: 'usage_spike',
        confidence: 80,
        frequency: spikes.length,
        sourceNodes: [...new Set(spikes.map(s => s.nodeId))],
        firstSeen: new Date(Math.min(...spikes.map(s => new Date(s.receivedAt).getTime()))),
        lastSeen: new Date(Math.max(...spikes.map(s => new Date(s.receivedAt).getTime()))),
        description: `Usage spikes detected: ${spikes.length} instances above ${avgUsage.toFixed(0)} average users`,
        evidence: spikes.map(s => ({
          intelligenceId: s.intelligenceId,
          activeUsers: (s.data as any).activeUsers,
          timestamp: s.receivedAt
        })),
        suggestedActions: [
          'Prepare for scale-up',
          'Review infrastructure capacity',
          'Monitor performance during peak usage'
        ]
      });
    }
    
    return patterns;
  }
  
  /**
   * Detect error clusters
   */
  private async detectErrorClusters(intelligence: IntelligenceData[]): Promise<PatternResult[]> {
    const errorAlerts = intelligence.filter(i => 
      i.intelligenceType === 'alert' && 
      (i.priority === 'high' || i.priority === 'critical')
    );
    
    if (errorAlerts.length < this.config.minFrequency) {
      return [];
    }
    
    const patterns: PatternResult[] = [];
    
    // Group errors by time window (1 hour)
    const timeWindows = new Map<number, IntelligenceData[]>();
    const hourInMs = 60 * 60 * 1000;
    
    for (const alert of errorAlerts) {
      const windowKey = Math.floor(new Date(alert.receivedAt).getTime() / hourInMs);
      if (!timeWindows.has(windowKey)) {
        timeWindows.set(windowKey, []);
      }
      timeWindows.get(windowKey)!.push(alert);
    }
    
    // Find windows with clustered errors
    for (const [windowKey, alerts] of timeWindows) {
      if (alerts.length >= 3) {
        patterns.push({
          patternType: 'error_cluster',
          confidence: 88,
          frequency: alerts.length,
          sourceNodes: [...new Set(alerts.map(a => a.nodeId))],
          firstSeen: new Date(Math.min(...alerts.map(a => new Date(a.receivedAt).getTime()))),
          lastSeen: new Date(Math.max(...alerts.map(a => new Date(a.receivedAt).getTime()))),
          description: `Error cluster detected: ${alerts.length} high-priority alerts within 1 hour`,
          evidence: alerts.map(a => ({
            intelligenceId: a.intelligenceId,
            title: a.title,
            priority: a.priority
          })),
          suggestedActions: [
            'Investigate common root cause',
            'Check for cascading failures',
            'Review recent deployments',
            'Enable emergency monitoring'
          ]
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Store pattern in database
   */
  private async storePattern(pattern: PatternResult): Promise<void> {
    try {
      // Generate pattern ID
      const patternId = this.generatePatternId(pattern);
      
      // Check if pattern already exists
      const existing = await db
        .select()
        .from(intelligencePatterns)
        .where(eq(intelligencePatterns.patternId, patternId))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing pattern
        const existingPattern = existing[0];
        await db
          .update(intelligencePatterns)
          .set({
            frequency: pattern.frequency,
            confidence: pattern.confidence,
            metadata: {
              ...((existingPattern.metadata as any) || {}),
              lastSeen: pattern.lastSeen,
              evidence: pattern.evidence
            },
            updatedAt: new Date()
          })
          .where(eq(intelligencePatterns.id, existingPattern.id));
        
        console.log(`[Pattern Miner] Updated pattern: ${pattern.patternType} (${patternId.substring(0, 16)}...)`);
      } else {
        // Create new pattern
        await db.insert(intelligencePatterns).values({
          patternId,
          patternType: pattern.patternType,
          category: this.getCategoryFromType(pattern.patternType),
          name: `${pattern.patternType}_${Date.now()}`,
          description: pattern.description,
          confidence: pattern.confidence,
          frequency: pattern.frequency,
          pattern: {
            sourceNodes: pattern.sourceNodes,
            firstSeen: pattern.firstSeen,
            lastSeen: pattern.lastSeen,
            evidence: pattern.evidence
          },
          affectedNodes: pattern.sourceNodes,
          severity: this.getSeverityFromConfidence(pattern.confidence),
          recommendations: pattern.suggestedActions,
          status: 'active',
          verified: 0,
          metadata: {
            discoveredAt: new Date(),
            firstSeen: pattern.firstSeen,
            lastSeen: pattern.lastSeen
          }
        });
        
        console.log(`[Pattern Miner] ✨ New pattern discovered: ${pattern.patternType}`);
      }
    } catch (error) {
      console.error('[Pattern Miner] Error storing pattern:', error);
    }
  }
  
  /**
   * Generate unique pattern ID
   */
  private generatePatternId(pattern: PatternResult): string {
    const timestamp = Date.now();
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        type: pattern.patternType,
        description: pattern.description,
        nodes: pattern.sourceNodes.sort()
      }))
      .digest('hex')
      .substring(0, 8);
    
    return `pattern-${timestamp}-${hash}`;
  }
  
  /**
   * Get category from pattern type
   */
  private getCategoryFromType(patternType: PatternType): string {
    const categoryMap: Record<PatternType, string> = {
      'code_quality_trend': 'code',
      'performance_degradation': 'performance',
      'security_vulnerability': 'security',
      'usage_spike': 'usage',
      'error_cluster': 'errors',
      'resource_bottleneck': 'performance',
      'anomaly_detection': 'monitoring'
    };
    
    return categoryMap[patternType] || 'general';
  }
  
  /**
   * Get severity from confidence level
   */
  private getSeverityFromConfidence(confidence: number): string {
    if (confidence >= 90) return 'critical';
    if (confidence >= 80) return 'high';
    if (confidence >= 70) return 'medium';
    return 'low';
  }
  
  /**
   * Get active patterns
   */
  async getActivePatterns(limit = 50): Promise<any[]> {
    return await db
      .select()
      .from(intelligencePatterns)
      .where(eq(intelligencePatterns.status, 'active'))
      .orderBy(desc(intelligencePatterns.confidence), desc(intelligencePatterns.updatedAt))
      .limit(limit);
  }
}

// Export singleton instance
export const patternMiner = new IntelligencePatternMiner();

/**
 * Convenience function to run pattern mining
 */
export async function runPatternMining(config?: Partial<PatternMinerConfig>): Promise<PatternResult[]> {
  const miner = config ? new IntelligencePatternMiner(config) : patternMiner;
  return await miner.minePatterns();
}
