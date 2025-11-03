/**
 * PHASE 11.0: FULL AUTONOMY API ROUTES
 * 
 * RESTful API for Full Autonomy System
 * - Decisions: Strategic decision management
 * - Achievements: Autonomous achievement tracking
 * - Agents: Agent orchestration and monitoring
 * - Reports: Weekly emperor reports
 * 
 * ZERO MOCK DATA POLICY: All endpoints return real data from PostgreSQL
 */

import { Router } from 'express';
import { db } from '../db';
import { autonomyDecisions, autonomyAchievements, autonomyAgents, autonomyReports } from '../../shared/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { strategicDecisionEngine } from './decision-engine';

const router = Router();

// ============= DECISIONS API =============

/**
 * GET /api/autonomy/decisions
 * Get all strategic decisions
 */
router.get('/decisions', async (req, res) => {
  try {
    // Anti-Mock Guard: Verify database connection
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection not established - cannot operate without real data'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const decisions = await strategicDecisionEngine.getDecisions(limit);

    res.json({
      success: true,
      data: decisions,
      total: decisions.length
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching decisions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autonomy/decisions/stats
 * Get decision statistics
 */
router.get('/decisions/stats', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    const stats = await strategicDecisionEngine.getDecisionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching decision stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= ACHIEVEMENTS API =============

/**
 * GET /api/autonomy/achievements
 * Get all autonomous achievements
 */
router.get('/achievements', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    
    const achievements = await db.select()
      .from(autonomyAchievements)
      .orderBy(desc(autonomyAchievements.achievedAt))
      .limit(limit);

    res.json({
      success: true,
      data: achievements,
      total: achievements.length
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autonomy/achievements/stats
 * Get achievement statistics
 */
router.get('/achievements/stats', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total_achievements,
        COUNT(CASE WHEN achievement_type = 'system_built' THEN 1 END) as systems_built,
        COUNT(CASE WHEN achievement_type = 'issue_fixed' THEN 1 END) as issues_fixed,
        COUNT(CASE WHEN achievement_type = 'performance_improved' THEN 1 END) as performance_improvements,
        COUNT(CASE WHEN verified = 1 THEN 1 END) as verified_achievements,
        AVG(estimated_value) as avg_value
      FROM autonomy_achievements
    `);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching achievement stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= AGENTS API =============

/**
 * GET /api/autonomy/agents
 * Get all active agents
 */
router.get('/agents', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    const agents = await db.select()
      .from(autonomyAgents)
      .where(eq(autonomyAgents.isOnline, 1))
      .orderBy(desc(autonomyAgents.lastActivityAt));

    res.json({
      success: true,
      data: agents,
      total: agents.length
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autonomy/agents/stats
 * Get agent statistics
 */
router.get('/agents/stats', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total_agents,
        COUNT(CASE WHEN is_online = 1 THEN 1 END) as active_agents,
        SUM(tasks_completed) as total_tasks_completed,
        SUM(tasks_failed) as total_tasks_failed,
        AVG(success_rate) as avg_success_rate,
        AVG(average_execution_time) as avg_execution_time
      FROM autonomy_agents
    `);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= REPORTS API =============

/**
 * GET /api/autonomy/reports/latest
 * Get latest weekly report
 */
router.get('/reports/latest', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    const [latestReport] = await db.select()
      .from(autonomyReports)
      .orderBy(desc(autonomyReports.reportGeneratedAt))
      .limit(1);

    res.json({
      success: true,
      data: latestReport || null
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching latest report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/autonomy/reports
 * Get all weekly reports
 */
router.get('/reports', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const reports = await db.select()
      .from(autonomyReports)
      .orderBy(desc(autonomyReports.reportGeneratedAt))
      .limit(limit);

    res.json({
      success: true,
      data: reports,
      total: reports.length
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= SYSTEM STATUS API =============

/**
 * GET /api/autonomy/status
 * Get overall full autonomy system status
 */
router.get('/status', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '❌ Database connection required'
      });
    }

    // Get counts from all tables
    const decisionResult = await db.execute(sql`SELECT COUNT(*) as count FROM autonomy_decisions`);
    const achievementResult = await db.execute(sql`SELECT COUNT(*) as count FROM autonomy_achievements`);
    const agentResult = await db.execute(sql`SELECT COUNT(*) as count, COUNT(CASE WHEN is_online = 1 THEN 1 END) as online FROM autonomy_agents`);
    const reportResult = await db.execute(sql`SELECT COUNT(*) as count FROM autonomy_reports`);

    const decisionStats = decisionResult.rows[0] as any;
    const achievementStats = achievementResult.rows[0] as any;
    const agentStats = agentResult.rows[0] as any;
    const reportStats = reportResult.rows[0] as any;

    res.json({
      success: true,
      data: {
        isActive: true,
        timestamp: new Date().toISOString(),
        decisions: {
          total: decisionStats.count || 0,
        },
        achievements: {
          total: achievementStats.count || 0,
        },
        agents: {
          total: agentStats.count || 0,
          online: agentStats.online || 0,
        },
        reports: {
          total: reportStats.count || 0,
        }
      }
    });
  } catch (error: any) {
    console.error('[Autonomy API] Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
