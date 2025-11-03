/**
 * EMPIRE-WIDE FITNESS SCORE
 * 
 * Calculates overall fitness across all nuclei in the Surooh Empire
 * Provides comprehensive performance health metrics
 */

import { db } from "../db";
import { fitnessScores } from "@shared/schema";
import { desc, sql } from "drizzle-orm";

interface EmpireFitnessBreakdown {
  performance: number;
  reliability: number;
  scalability: number;
  security: number;
}

interface EmpireFitnessScore {
  overall: number;
  technical: number;
  business: number;
  experience: number;
  innovation: number;
  breakdown: EmpireFitnessBreakdown;
  lastUpdated: Date;
  nucleiScored: number;
}

export class EmpireFitnessCalculator {
  /**
   * Calculate empire-wide fitness score
   */
  async calculateEmpireFitness(): Promise<EmpireFitnessScore> {
    console.log('[Empire Fitness] 📊 Calculating empire-wide fitness...');

    // Get the latest fitness scores for all nuclei
    const latestScores = await db.query.fitnessScores.findMany({
      orderBy: [desc(fitnessScores.calculatedAt)],
      limit: 100, // Get recent scores for all nuclei
    });

    if (latestScores.length === 0) {
      console.log('[Empire Fitness] ⚠️ No fitness scores found - returning baseline');
      return this.getBaselineScore();
    }

    // Group by nucleusId to get latest score per nucleus
    const latestByNucleus = new Map<string, typeof latestScores[0]>();
    for (const score of latestScores) {
      if (!latestByNucleus.has(score.nucleusId)) {
        latestByNucleus.set(score.nucleusId, score);
      }
    }

    const nucleiScores = Array.from(latestByNucleus.values());
    
    // Calculate averages (HONEST: real data only)
    const avgExecutionSuccess = this.average(nucleiScores.map(s => parseFloat(s.executionSuccessScore ?? '0')));
    const avgPerformance = this.average(nucleiScores.map(s => parseFloat(s.performanceScore ?? '0')));
    const avgReliability = this.average(nucleiScores.map(s => parseFloat(s.reliabilityScore ?? '0')));
    const avgResourceEfficiency = this.average(nucleiScores.map(s => parseFloat(s.resourceEfficiencyScore ?? '0')));
    const avgConsensusQuality = this.average(nucleiScores.map(s => parseFloat(s.consensusQualityScore ?? '0')));

    // Calculate composite scores
    const technical = this.calculateTechnicalFitness(avgPerformance, avgReliability, avgResourceEfficiency);
    const business = this.calculateBusinessFitness(avgExecutionSuccess, avgConsensusQuality);
    const experience = this.calculateExperienceFitness(avgPerformance, avgReliability);
    const innovation = this.calculateInnovationFitness(avgConsensusQuality, avgResourceEfficiency);

    // Overall score (weighted average)
    const overall = (technical * 0.35) + (business * 0.25) + (experience * 0.25) + (innovation * 0.15);

    const result: EmpireFitnessScore = {
      overall: Math.round(overall * 10) / 10,
      technical: Math.round(technical * 10) / 10,
      business: Math.round(business * 10) / 10,
      experience: Math.round(experience * 10) / 10,
      innovation: Math.round(innovation * 10) / 10,
      breakdown: {
        performance: Math.round(avgPerformance * 10) / 10,
        reliability: Math.round(avgReliability * 10) / 10,
        scalability: Math.round(avgResourceEfficiency * 10) / 10,
        security: Math.round(avgExecutionSuccess * 10) / 10,
      },
      lastUpdated: new Date(),
      nucleiScored: nucleiScores.length,
    };

    console.log(`[Empire Fitness] ✅ Overall: ${result.overall}/100 (${result.nucleiScored} nuclei)`);
    console.log(`[Empire Fitness] 📈 Technical: ${result.technical}/100`);
    console.log(`[Empire Fitness] 💼 Business: ${result.business}/100`);
    console.log(`[Empire Fitness] 🎯 Experience: ${result.experience}/100`);
    console.log(`[Empire Fitness] 💡 Innovation: ${result.innovation}/100`);

    return result;
  }

  /**
   * Calculate technical fitness (performance, reliability, scalability)
   */
  private calculateTechnicalFitness(performance: number, reliability: number, resourceEfficiency: number): number {
    return (performance * 0.4) + (reliability * 0.35) + (resourceEfficiency * 0.25);
  }

  /**
   * Calculate business fitness (execution success, consensus quality)
   */
  private calculateBusinessFitness(executionSuccess: number, consensusQuality: number): number {
    return (executionSuccess * 0.6) + (consensusQuality * 0.4);
  }

  /**
   * Calculate experience fitness (performance, reliability)
   */
  private calculateExperienceFitness(performance: number, reliability: number): number {
    return (performance * 0.5) + (reliability * 0.5);
  }

  /**
   * Calculate innovation fitness (consensus quality, resource efficiency)
   */
  private calculateInnovationFitness(consensusQuality: number, resourceEfficiency: number): number {
    return (consensusQuality * 0.6) + (resourceEfficiency * 0.4);
  }

  /**
   * Calculate average (HONEST: returns 0 if no data)
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return sum / numbers.length;
  }

  /**
   * Get baseline score when no data available (HONEST: not fake high scores)
   */
  private getBaselineScore(): EmpireFitnessScore {
    return {
      overall: 0,
      technical: 0,
      business: 0,
      experience: 0,
      innovation: 0,
      breakdown: {
        performance: 0,
        reliability: 0,
        scalability: 0,
        security: 0,
      },
      lastUpdated: new Date(),
      nucleiScored: 0,
    };
  }
}

export const empireFitnessCalculator = new EmpireFitnessCalculator();
