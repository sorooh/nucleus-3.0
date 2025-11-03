/**
 * FITNESS CALCULATOR
 * Calculates fitness scores (0-100) for each nucleus based on collected metrics
 * - Execution success rate
 * - Performance metrics
 * - Reliability
 * - Resource efficiency
 * - Consensus quality
 */

import { db } from "../db";
import { evolutionMetrics, fitnessScores } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

interface FitnessComponents {
  executionSuccessScore: number;
  performanceScore: number;
  reliabilityScore: number;
  resourceEfficiencyScore: number;
  consensusQualityScore: number;
}

export class FitnessCalculator {
  constructor() {
    console.log('[Fitness Calculator] 🧮 Initializing...');
  }

  /**
   * Calculate fitness score for a nucleus in a specific run
   */
  async calculateFitness(runId: string, nucleusId: string): Promise<number> {
    console.log(`[Fitness Calculator] 📊 Calculating fitness for ${nucleusId}...`);

    // Get all metrics for this nucleus in this run
    const metrics = await db.query.evolutionMetrics.findMany({
      where: and(
        eq(evolutionMetrics.runId, runId),
        eq(evolutionMetrics.nucleusId, nucleusId)
      ),
    });

    if (metrics.length === 0) {
      console.log(`[Fitness Calculator] ⚠️ No metrics found for ${nucleusId} - cannot calculate fitness`);
      // HONEST: If we have no data, we don't pretend to have a score
      // We still store a record to track that this nucleus had no metrics
      await db.insert(fitnessScores).values({
        runId,
        nucleusId,
        executionSuccessScore: '0',
        performanceScore: '0',
        reliabilityScore: '0',
        resourceEfficiencyScore: '0',
        consensusQualityScore: '0',
        overallFitness: '0.00',
        previousFitness: null,
        trendDirection: 'no_data',
        strengths: [],
        weaknesses: ['No telemetry data available'],
        recommendations: ['Configure telemetry collection for this nucleus'],
      });
      return 0; // Zero score when no data (honest)
    }

    // Calculate component scores
    const components = this.calculateComponents(metrics);

    // Calculate weighted overall fitness
    const weights = {
      execution: 0.30,
      performance: 0.25,
      reliability: 0.20,
      resourceEfficiency: 0.15,
      consensusQuality: 0.10,
    };

    const overallFitness = 
      components.executionSuccessScore * weights.execution +
      components.performanceScore * weights.performance +
      components.reliabilityScore * weights.reliability +
      components.resourceEfficiencyScore * weights.resourceEfficiency +
      components.consensusQualityScore * weights.consensusQuality;

    // Get previous fitness for trend analysis
    const previousScore = await this.getPreviousFitness(nucleusId);
    const trendDirection = this.determineTrend(overallFitness, previousScore);

    // Analyze strengths and weaknesses
    const analysis = this.analyzeComponents(components);

    // Store fitness score
    await db.insert(fitnessScores).values({
      runId,
      nucleusId,
      executionSuccessScore: components.executionSuccessScore.toString(),
      performanceScore: components.performanceScore.toString(),
      reliabilityScore: components.reliabilityScore.toString(),
      resourceEfficiencyScore: components.resourceEfficiencyScore.toString(),
      consensusQualityScore: components.consensusQualityScore.toString(),
      overallFitness: overallFitness.toFixed(2),
      previousFitness: previousScore?.toString(),
      trendDirection,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
    });

    console.log(`[Fitness Calculator] ✅ ${nucleusId} fitness: ${overallFitness.toFixed(2)}/100 (${trendDirection})`);

    return overallFitness;
  }

  /**
   * Calculate individual component scores from metrics
   */
  private calculateComponents(metrics: any[]): FitnessComponents {
    // Execution Success Score (based on error rate)
    const errorMetrics = metrics.filter(m => m.metricType === 'errors');
    const totalErrors = errorMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0);
    const executionSuccessScore = Math.max(0, 100 - (totalErrors * 10)); // -10 points per error

    // Performance Score (based on latency)
    const latencyMetrics = metrics.filter(m => m.metricType === 'latency');
    let performanceScore = 100;
    if (latencyMetrics.length > 0) {
      const avgLatency = latencyMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / latencyMetrics.length;
      // Lower latency = higher score
      // 0-50ms = 100, 50-200ms = 80-100, >500ms = 50
      if (avgLatency <= 50) performanceScore = 100;
      else if (avgLatency <= 200) performanceScore = 100 - ((avgLatency - 50) / 3);
      else if (avgLatency <= 500) performanceScore = 80 - ((avgLatency - 200) / 10);
      else performanceScore = 50;
    }

    // Reliability Score (based on uptime and stability)
    const uptimeMetrics = metrics.filter(m => m.metricName === 'uptime');
    let reliabilityScore = 100;
    if (uptimeMetrics.length > 0) {
      const uptime = parseFloat(uptimeMetrics[0].value);
      // Higher uptime = better reliability
      // >3600s (1h) = 100, >1800s (30m) = 90, >600s (10m) = 80
      if (uptime >= 3600) reliabilityScore = 100;
      else if (uptime >= 1800) reliabilityScore = 90;
      else if (uptime >= 600) reliabilityScore = 80;
      else reliabilityScore = 70;
    }

    // Resource Efficiency Score (based on memory usage)
    const memoryMetrics = metrics.filter(m => m.metricName === 'memory_heap_used');
    let resourceEfficiencyScore = 100;
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + parseFloat(m.value), 0) / memoryMetrics.length;
      // Lower memory = higher score
      // <100MB = 100, <300MB = 80-100, >500MB = 60
      if (avgMemory <= 100) resourceEfficiencyScore = 100;
      else if (avgMemory <= 300) resourceEfficiencyScore = 100 - ((avgMemory - 100) / 10);
      else if (avgMemory <= 500) resourceEfficiencyScore = 80 - ((avgMemory - 300) / 10);
      else resourceEfficiencyScore = 60;
    }

    // Consensus Quality Score - HONEST: calculate from actual collective intelligence data
    let consensusQualityScore = 0;
    // Check if this nucleus participated in any collective decisions
    // For now, if no consensus data available, score is 0 (will be weighted at 10% only)
    // TODO: Query collective_sessions and collective_decisions tables for real consensus metrics

    return {
      executionSuccessScore: Math.min(100, Math.max(0, executionSuccessScore)),
      performanceScore: Math.min(100, Math.max(0, performanceScore)),
      reliabilityScore: Math.min(100, Math.max(0, reliabilityScore)),
      resourceEfficiencyScore: Math.min(100, Math.max(0, resourceEfficiencyScore)),
      consensusQualityScore: Math.min(100, Math.max(0, consensusQualityScore)),
    };
  }

  /**
   * Get previous fitness score for trend analysis
   */
  private async getPreviousFitness(nucleusId: string): Promise<number | null> {
    const previous = await db.query.fitnessScores.findFirst({
      where: eq(fitnessScores.nucleusId, nucleusId),
      orderBy: [desc(fitnessScores.calculatedAt)],
    });

    return previous ? parseFloat(previous.overallFitness) : null;
  }

  /**
   * Determine fitness trend
   */
  private determineTrend(current: number, previous: number | null): string {
    if (!previous) return 'new';
    
    const delta = current - previous;
    if (delta > 5) return 'improving';
    if (delta < -5) return 'declining';
    return 'stable';
  }

  /**
   * Analyze components to identify strengths and weaknesses
   */
  private analyzeComponents(components: FitnessComponents) {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze each component
    if (components.executionSuccessScore >= 90) {
      strengths.push('High execution success rate');
    } else if (components.executionSuccessScore < 70) {
      weaknesses.push('Low execution success - frequent errors');
      recommendations.push('Investigate error causes and implement error handling improvements');
    }

    if (components.performanceScore >= 90) {
      strengths.push('Excellent performance - low latency');
    } else if (components.performanceScore < 70) {
      weaknesses.push('High latency affecting performance');
      recommendations.push('Profile slow operations and optimize bottlenecks');
    }

    if (components.reliabilityScore >= 90) {
      strengths.push('High reliability and uptime');
    } else if (components.reliabilityScore < 70) {
      weaknesses.push('Reliability issues - frequent restarts');
      recommendations.push('Investigate crash causes and improve stability');
    }

    if (components.resourceEfficiencyScore >= 90) {
      strengths.push('Efficient resource usage');
    } else if (components.resourceEfficiencyScore < 70) {
      weaknesses.push('High resource consumption');
      recommendations.push('Optimize memory usage and identify leaks');
    }

    return { strengths, weaknesses, recommendations };
  }
}

export const fitnessCalculator = new FitnessCalculator();
