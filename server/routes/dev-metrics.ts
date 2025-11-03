/**
 * PROGRAMMER STATS API
 * Endpoint for /api/dev-metrics - real programmer trust scores
 */

import express from "express";
import { repairHistoryService } from "../system/audit-engine/core/repair-history";
import { autoEnforcement } from "../system/audit-engine/enforcement/auto-enforcement";

const router = express.Router();

/**
 * GET /api/dev-metrics
 * Get all programmer statistics and trust scores
 */
router.get("/", async (req, res) => {
  try {
    const rankings = await repairHistoryService.getProgrammerRankings();

    // Get detailed stats for each programmer
    const metrics = await Promise.all(
      rankings.map(async (r: any) => {
        const stats = await repairHistoryService.getProgrammerStats(r.programmerId);
        const enforcement = await autoEnforcement.enforceQualityStandards(r.programmerId);

        return {
          programmerId: stats.programmerId,
          trustScore: stats.trustScore,
          totalRepairs: stats.totalRepairs,
          successfulRepairs: stats.successfulRepairs,
          failedRepairs: stats.failedRepairs,
          penalties: stats.penalties,
          successRate: stats.totalRepairs > 0 
            ? Math.round((stats.successfulRepairs / stats.totalRepairs) * 100) 
            : 100,
          issueTypes: stats.issueTypes,
          severityBreakdown: stats.severityBreakdown,
          lastRepair: stats.lastRepair,
          enforcement: {
            allowed: enforcement.allowed,
            action: enforcement.action,
            reason: enforcement.reason,
            banExpiresAt: enforcement.banExpiresAt,
          },
        };
      })
    );

    res.json({
      success: true,
      metrics,
      totalProgrammers: metrics.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Dev Metrics API] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dev-metrics/:programmerId
 * Get detailed stats for a specific programmer
 */
router.get("/:programmerId", async (req, res) => {
  try {
    const { programmerId } = req.params;

    const stats = await repairHistoryService.getProgrammerStats(programmerId);
    const enforcement = await autoEnforcement.enforceQualityStandards(programmerId);
    const history = await repairHistoryService.getProgrammerHistory(programmerId, 100);

    res.json({
      success: true,
      programmer: {
        id: programmerId,
        trustScore: stats.trustScore,
        totalRepairs: stats.totalRepairs,
        successfulRepairs: stats.successfulRepairs,
        failedRepairs: stats.failedRepairs,
        penalties: stats.penalties,
        successRate: stats.totalRepairs > 0 
          ? Math.round((stats.successfulRepairs / stats.totalRepairs) * 100) 
          : 100,
        issueTypes: stats.issueTypes,
        severityBreakdown: stats.severityBreakdown,
        lastRepair: stats.lastRepair,
        enforcement: {
          allowed: enforcement.allowed,
          action: enforcement.action,
          reason: enforcement.reason,
          banExpiresAt: enforcement.banExpiresAt,
        },
        recentHistory: history.slice(0, 10),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[Dev Metrics API] Error for ${req.params.programmerId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
