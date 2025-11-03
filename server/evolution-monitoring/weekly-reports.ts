/**
 * WEEKLY PERFORMANCE REPORTS
 * 
 * Generates comprehensive performance reports for Surooh Empire
 * Tracks trends, identifies improvements, and highlights concerns
 */

import { db } from "../db";
import { evolutionRuns, fitnessScores, improvementActions } from "@shared/schema";
import { desc, sql, gte } from "drizzle-orm";

interface WeeklyReportSummary {
  reportId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  generatedAt: Date;
  
  // Evolution metrics
  totalEvolutionRuns: number;
  averageFitness: number;
  fitnessImprovement: number;
  
  // Improvements
  improvementsProposed: number;
  improvementsExecuted: number;
  improvementsSuccess: number;
  improvementsFailed: number;
  
  // Nucleus performance
  topPerformingNuclei: Array<{
    nucleusId: string;
    fitness: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  weakNuclei: Array<{
    nucleusId: string;
    fitness: number;
    concerns: string[];
  }>;
  
  // Overall health
  overallHealthScore: number;
  systemStability: 'excellent' | 'good' | 'fair' | 'poor';
  criticalIssues: number;
}

export class WeeklyReportGenerator {
  /**
   * Generate weekly performance report
   */
  async generateWeeklyReport(): Promise<WeeklyReportSummary> {
    console.log('[Weekly Reports] 📊 Generating weekly performance report...');

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get evolution runs from last week
    const runs = await db.query.evolutionRuns.findMany({
      where: gte(evolutionRuns.startedAt, weekAgo),
      orderBy: [desc(evolutionRuns.startedAt)],
    });

    console.log(`[Weekly Reports] 🔍 Found ${runs.length} evolution runs in past week`);

    // Get fitness scores from last week
    const scores = await db.query.fitnessScores.findMany({
      where: gte(fitnessScores.calculatedAt, weekAgo),
      orderBy: [desc(fitnessScores.calculatedAt)],
    });

    console.log(`[Weekly Reports] 🎯 Found ${scores.length} fitness scores in past week`);

    // Get improvements from last week
    const improvements = await db.query.improvementActions.findMany({
      where: gte(improvementActions.proposedAt, weekAgo),
      orderBy: [desc(improvementActions.proposedAt)],
    });

    console.log(`[Weekly Reports] 💡 Found ${improvements.length} improvements in past week`);

    // Calculate average fitness
    const avgFitness = this.calculateAverageFitness(scores);
    
    // Calculate fitness improvement (compare to previous week)
    const fitnessImprovement = await this.calculateFitnessImprovement(weekAgo);

    // Identify top performing nuclei
    const topPerformingNuclei = this.identifyTopPerformers(scores);

    // Identify weak nuclei
    const weakNuclei = this.identifyWeakNuclei(scores);

    // Calculate improvement stats
    const improvementStats = this.calculateImprovementStats(improvements);

    // Calculate overall health score
    const overallHealthScore = this.calculateOverallHealth(avgFitness, improvementStats);

    // Determine system stability
    const systemStability = this.determineStability(overallHealthScore, weakNuclei.length);

    const report: WeeklyReportSummary = {
      reportId: `report-${Date.now()}`,
      weekStartDate: weekAgo,
      weekEndDate: now,
      generatedAt: now,
      
      totalEvolutionRuns: runs.length,
      averageFitness: Math.round(avgFitness * 10) / 10,
      fitnessImprovement: Math.round(fitnessImprovement * 10) / 10,
      
      improvementsProposed: improvements.length,
      improvementsExecuted: improvementStats.executed,
      improvementsSuccess: improvementStats.success,
      improvementsFailed: improvementStats.failed,
      
      topPerformingNuclei,
      weakNuclei,
      
      overallHealthScore: Math.round(overallHealthScore * 10) / 10,
      systemStability,
      criticalIssues: weakNuclei.filter(n => n.fitness < 50).length,
    };

    console.log('[Weekly Reports] ✅ Report generated successfully');
    console.log(`[Weekly Reports] 📈 Overall Health: ${report.overallHealthScore}/100 (${report.systemStability})`);
    console.log(`[Weekly Reports] 🎯 Average Fitness: ${report.averageFitness}/100`);
    console.log(`[Weekly Reports] 📊 Fitness Trend: ${report.fitnessImprovement > 0 ? '↑' : report.fitnessImprovement < 0 ? '↓' : '→'} ${Math.abs(report.fitnessImprovement)}`);
    console.log(`[Weekly Reports] 💡 Improvements: ${report.improvementsExecuted}/${report.improvementsProposed} executed`);

    return report;
  }

  /**
   * Calculate average fitness from scores
   */
  private calculateAverageFitness(scores: any[]): number {
    if (scores.length === 0) return 0;
    
    const total = scores.reduce((sum, score) => {
      return sum + parseFloat(score.overallFitness ?? '0');
    }, 0);
    
    return total / scores.length;
  }

  /**
   * Calculate fitness improvement compared to previous week
   */
  private async calculateFitnessImprovement(weekAgo: Date): Promise<number> {
    // Get scores from previous week (2 weeks ago to 1 week ago)
    const twoWeeksAgo = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const previousScores = await db.query.fitnessScores.findMany({
      where: sql`${fitnessScores.calculatedAt} >= ${twoWeeksAgo} AND ${fitnessScores.calculatedAt} < ${weekAgo}`,
    });

    if (previousScores.length === 0) return 0;

    const previousAvg = this.calculateAverageFitness(previousScores);
    const currentScores = await db.query.fitnessScores.findMany({
      where: gte(fitnessScores.calculatedAt, weekAgo),
    });

    const currentAvg = this.calculateAverageFitness(currentScores);

    return currentAvg - previousAvg;
  }

  /**
   * Identify top performing nuclei
   */
  private identifyTopPerformers(scores: any[]): Array<{nucleusId: string, fitness: number, trend: 'up' | 'down' | 'stable'}> {
    // Group scores by nucleus
    const nucleusScores = new Map<string, number[]>();
    
    for (const score of scores) {
      const nucleusId = score.nucleusId;
      const fitness = parseFloat(score.overallFitness ?? '0');
      
      if (!nucleusScores.has(nucleusId)) {
        nucleusScores.set(nucleusId, []);
      }
      nucleusScores.get(nucleusId)!.push(fitness);
    }

    // Calculate average for each nucleus
    const nucleusAvg: Array<{nucleusId: string, fitness: number, trend: 'up' | 'down' | 'stable'}> = [];
    
    for (const [nucleusId, fitnesses] of Array.from(nucleusScores.entries())) {
      const avg = fitnesses.reduce((a: number, b: number) => a + b, 0) / fitnesses.length;
      
      // Determine trend (compare first half to second half)
      const mid = Math.floor(fitnesses.length / 2);
      const firstHalf = fitnesses.slice(0, mid);
      const secondHalf = fitnesses.slice(mid);
      
      const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length : avg;
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length : avg;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (secondAvg > firstAvg + 5) trend = 'up';
      else if (secondAvg < firstAvg - 5) trend = 'down';
      
      nucleusAvg.push({ nucleusId, fitness: avg, trend });
    }

    // Return top 5 performers
    return nucleusAvg
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, 5);
  }

  /**
   * Identify weak nuclei that need attention
   */
  private identifyWeakNuclei(scores: any[]): Array<{nucleusId: string, fitness: number, concerns: string[]}> {
    // Group scores by nucleus
    const nucleusScores = new Map<string, any[]>();
    
    for (const score of scores) {
      const nucleusId = score.nucleusId;
      
      if (!nucleusScores.has(nucleusId)) {
        nucleusScores.set(nucleusId, []);
      }
      nucleusScores.get(nucleusId)!.push(score);
    }

    const weakNuclei: Array<{nucleusId: string, fitness: number, concerns: string[]}> = [];

    for (const [nucleusId, nucleusScoresList] of Array.from(nucleusScores.entries())) {
      // Get latest score
      const latestScore = nucleusScoresList[nucleusScoresList.length - 1];
      const fitness = parseFloat(latestScore.overallFitness ?? '0');

      // Consider weak if fitness < 70
      if (fitness < 70) {
        const concerns: string[] = [];
        
        if (parseFloat(latestScore.performanceScore ?? '0') < 60) {
          concerns.push('Low performance score');
        }
        if (parseFloat(latestScore.reliabilityScore ?? '0') < 60) {
          concerns.push('Reliability issues');
        }
        if (parseFloat(latestScore.executionSuccessScore ?? '0') < 60) {
          concerns.push('Execution failures');
        }

        weakNuclei.push({ nucleusId, fitness, concerns });
      }
    }

    return weakNuclei.sort((a, b) => a.fitness - b.fitness);
  }

  /**
   * Calculate improvement statistics
   */
  private calculateImprovementStats(improvements: any[]) {
    const executed = improvements.filter(i => i.executionStatus === 'executed').length;
    const success = improvements.filter(i => 
      i.executionStatus === 'executed' && 
      (i.executionResult as any)?.success === true
    ).length;
    const failed = improvements.filter(i => i.executionStatus === 'failed').length;

    return { executed, success, failed };
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealth(avgFitness: number, improvementStats: any): number {
    // Base score from fitness
    let healthScore = avgFitness * 0.7;

    // Bonus for successful improvements
    if (improvementStats.executed > 0) {
      const successRate = improvementStats.success / improvementStats.executed;
      healthScore += successRate * 30;
    }

    return Math.min(100, healthScore);
  }

  /**
   * Determine system stability
   */
  private determineStability(healthScore: number, weakCount: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (healthScore >= 90 && weakCount === 0) return 'excellent';
    if (healthScore >= 75 && weakCount <= 2) return 'good';
    if (healthScore >= 60 && weakCount <= 5) return 'fair';
    return 'poor';
  }
}

export const weeklyReportGenerator = new WeeklyReportGenerator();
