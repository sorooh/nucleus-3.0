/**
 * REPAIR HISTORY SERVICE
 * Manages programmer trust scores, repair actions, and audit trail
 */

import { db } from "../../../db";
import { repairHistory, type InsertRepairHistory, type RepairHistory } from "../../../../shared/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export class RepairHistoryService {
  /**
   * Record a new repair action
   */
  async recordRepair(data: Omit<InsertRepairHistory, "signedHash">): Promise<RepairHistory> {
    // Generate SHA256 signature for immutability
    const signedHash = this.generateSignature(data);

    const [record] = await db.insert(repairHistory).values({
      ...data,
      signedHash,
    }).returning();

    console.log(`[Repair History] 📝 Recorded repair: ${record.id} for ${data.programmerId}`);
    return record;
  }

  /**
   * Generate SHA256 signature for immutability
   */
  private generateSignature(data: any): string {
    const payload = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    });
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Verify signature integrity
   */
  verifySignature(record: RepairHistory): boolean {
    const { signedHash, ...data } = record;
    const recomputed = this.generateSignature(data);
    return recomputed === signedHash;
  }

  /**
   * Get repair history for a programmer
   */
  async getProgrammerHistory(programmerId: string, limit = 50): Promise<RepairHistory[]> {
    return await db.query.repairHistory.findMany({
      where: eq(repairHistory.programmerId, programmerId),
      orderBy: [desc(repairHistory.createdAt)],
      limit,
    });
  }

  /**
   * Get repair history for a nucleus
   */
  async getNucleusHistory(nucleusId: string, limit = 50): Promise<RepairHistory[]> {
    return await db.query.repairHistory.findMany({
      where: eq(repairHistory.nucleusId, nucleusId),
      orderBy: [desc(repairHistory.createdAt)],
      limit,
    });
  }

  /**
   * Calculate programmer trust score
   * Trust score = (successful repairs / total repairs) * 100 - penalties
   */
  async calculateTrustScore(programmerId: string): Promise<{
    score: number;
    total: number;
    successful: number;
    failed: number;
    penalties: number;
  }> {
    const history = await this.getProgrammerHistory(programmerId, 1000);

    const total = history.length;
    const successful = history.filter(r => r.status === 'completed' && !r.rollbackPerformed).length;
    const failed = history.filter(r => r.status === 'failed' || r.rollbackPerformed).length;
    
    // Calculate penalties from trust impacts
    const penalties = history.reduce((sum, r) => {
      return sum + (r.trustImpact < 0 ? Math.abs(r.trustImpact) : 0);
    }, 0);

    const baseScore = total > 0 ? (successful / total) * 100 : 100;
    const score = Math.max(0, Math.min(100, baseScore - penalties));

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal
      total,
      successful,
      failed,
      penalties,
    };
  }

  /**
   * Get programmer statistics
   */
  async getProgrammerStats(programmerId: string) {
    const history = await this.getProgrammerHistory(programmerId, 1000);
    const trustScore = await this.calculateTrustScore(programmerId);

    // Count by issue type
    const issueTypes = history.reduce((acc, r) => {
      acc[r.issueType] = (acc[r.issueType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by severity
    const severityBreakdown = history.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      programmerId,
      trustScore: trustScore.score,
      totalRepairs: trustScore.total,
      successfulRepairs: trustScore.successful,
      failedRepairs: trustScore.failed,
      penalties: trustScore.penalties,
      issueTypes,
      severityBreakdown,
      lastRepair: history[0]?.createdAt || null,
    };
  }

  /**
   * Get all programmers ranked by trust score
   */
  async getProgrammerRankings(): Promise<Array<{
    programmerId: string;
    trustScore: number;
    totalRepairs: number;
  }>> {
    // Get all unique programmers
    const result = await db.select({
      programmerId: repairHistory.programmerId,
    })
    .from(repairHistory)
    .groupBy(repairHistory.programmerId);

    const programmers = result.map((r: { programmerId: string }) => r.programmerId);

    // Calculate trust scores for each
    const rankings = await Promise.all(
      programmers.map(async (programmerId: string) => {
        const stats = await this.getProgrammerStats(programmerId);
        return {
          programmerId,
          trustScore: stats.trustScore,
          totalRepairs: stats.totalRepairs,
        };
      })
    );

    // Sort by trust score descending
    return rankings.sort((a: any, b: any) => b.trustScore - a.trustScore);
  }

  /**
   * Update repair status
   */
  async updateRepairStatus(
    repairId: string,
    status: string,
    verificationResults?: any,
    completedAt?: Date
  ): Promise<RepairHistory | null> {
    const [updated] = await db.update(repairHistory)
      .set({
        status,
        verificationResults,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(repairHistory.id, repairId))
      .returning();

    return updated || null;
  }

  /**
   * Mark repair as rolled back
   */
  async markRolledBack(repairId: string): Promise<RepairHistory | null> {
    const [updated] = await db.update(repairHistory)
      .set({
        status: 'rolled_back',
        rollbackPerformed: 1,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(repairHistory.id, repairId))
      .returning();

    return updated || null;
  }
}

export const repairHistoryService = new RepairHistoryService();
