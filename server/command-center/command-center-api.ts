/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👑 SUPREME COMMAND CENTER - API Gateway
 * ═══════════════════════════════════════════════════════════════════════════
 * Central control system for all 21 nuclei across Surooh Empire
 * 
 * @module CommandCenterAPI
 * @eternal Zero human intervention - automated imperial control
 */

import { Router } from "express";
import { db } from "../db";
import { 
  commandCenterNuclei, 
  healthChecks,
  nucleiAlerts,
  sideCompliance
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { healthMonitor } from "./health-monitor";

const router = Router();

// ============= NUCLEI MANAGEMENT =============

/**
 * GET /api/command-center/nuclei
 * Get all registered nuclei
 */
router.get('/nuclei', async (req, res) => {
    try {
      const nuclei = await db
        .select()
        .from(commandCenterNuclei)
        .orderBy(commandCenterNuclei.nucleusName);

      res.json({
        success: true,
        nuclei,
        total: nuclei.length
      });
    } catch (error) {
      console.error('[API] ❌ Failed to fetch nuclei:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nuclei'
      });
    }
  });

/**
 * GET /api/command-center/nuclei/:nucleusId
 * Get specific nucleus details
 */
router.get('/nuclei/:nucleusId', async (req, res) => {
    try {
      const { nucleusId } = req.params;
      
      const [nucleus] = await db
        .select()
        .from(commandCenterNuclei)
        .where(eq(commandCenterNuclei.nucleusId, nucleusId))
        .limit(1);

      if (!nucleus) {
        return res.status(404).json({
          success: false,
          error: 'Nucleus not found'
        });
      }

      res.json({
        success: true,
        nucleus
      });
    } catch (error) {
      console.error('[API] ❌ Failed to fetch nucleus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch nucleus'
      });
    }
  });

// ============= HEALTH MONITORING =============

/**
 * GET /api/command-center/health/history/:nucleusId
 * Get health check history for a nucleus
 */
router.get('/health/history/:nucleusId', async (req, res) => {
    try {
      const { nucleusId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await healthMonitor.getHealthHistory(nucleusId, limit);

      res.json({
        success: true,
        history,
        nucleusId,
        count: history.length
      });
    } catch (error) {
      console.error('[API] ❌ Failed to fetch health history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch health history'
      });
    }
  });

/**
 * GET /api/command-center/health/monitor/status
 * Get health monitor status
 */
router.get('/health/monitor/status', async (req, res) => {
    try {
      const status = healthMonitor.getStatus();

      res.json({
        success: true,
        monitor: status
      });
    } catch (error) {
      console.error('[API] ❌ Failed to get monitor status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get monitor status'
      });
    }
  });

// ============= ALERTS SYSTEM =============

/**
 * GET /api/command-center/alerts
 * Get all active alerts
 */
router.get('/alerts', async (req, res) => {
    try {
      const alerts = await healthMonitor.getActiveAlerts();

      res.json({
        success: true,
        alerts,
        total: alerts.length
      });
    } catch (error) {
      console.error('[API] ❌ Failed to fetch alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts'
      });
    }
  });

/**
 * POST /api/command-center/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
    try {
      const { alertId } = req.params;

      await db
        .update(nucleiAlerts)
        .set({
          acknowledgedAt: new Date(),
          acknowledgedBy: req.body.userId || 'system'
        })
        .where(eq(nucleiAlerts.id, alertId));

      res.json({
        success: true,
        message: 'Alert acknowledged'
      });
    } catch (error) {
      console.error('[API] ❌ Failed to acknowledge alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  });

/**
 * POST /api/command-center/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/alerts/:alertId/resolve', async (req, res) => {
    try {
      const { alertId } = req.params;

      await db
        .update(nucleiAlerts)
        .set({
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: req.body.userId || 'system',
          resolution: req.body.resolution || 'Manual resolution'
        })
        .where(eq(nucleiAlerts.id, alertId));

      res.json({
        success: true,
        message: 'Alert resolved'
      });
    } catch (error) {
      console.error('[API] ❌ Failed to resolve alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  });

// ============= COMMAND CENTER STATUS =============

/**
 * GET /api/command-center/status
 * Get overall Command Center status
 */
router.get('/status', async (req, res) => {
    try {
      const nuclei = await db.select().from(commandCenterNuclei);
      const alerts = await healthMonitor.getActiveAlerts();
      
      // Calculate statistics
      const stats = {
        total: nuclei.length,
        healthy: nuclei.filter(n => n.status === 'healthy').length,
        warning: nuclei.filter(n => n.status === 'warning').length,
        critical: nuclei.filter(n => n.status === 'critical').length,
        offline: nuclei.filter(n => n.status === 'offline').length,
        phaseOmegaActive: nuclei.filter(n => n.phaseOmegaActive).length,
        sideIntegrated: nuclei.filter(n => n.sideIntegrated).length,
        activeAlerts: alerts.length
      };

      const monitorStatus = healthMonitor.getStatus();

      res.json({
        success: true,
        commandCenter: {
          status: 'operational',
          nucleiStats: stats,
          healthMonitor: monitorStatus,
          lastUpdate: new Date()
        }
      });
    } catch (error) {
      console.error('[API] ❌ Failed to fetch status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch status'
      });
    }
  });

// ============= SIDE COMPLIANCE =============

/**
 * GET /api/command-center/side/compliance
 * Get SIDE compliance status for all nuclei
 */
router.get('/side/compliance', async (req, res) => {
    try {
      const compliance = await db
        .select()
        .from(sideCompliance)
        .orderBy(desc(sideCompliance.lastAudit));

      res.json({
        success: true,
        compliance,
        total: compliance.length
      });
    } catch (error) {
      console.error('[API] ❌ Failed to fetch SIDE compliance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SIDE compliance'
      });
    }
  });

// ============= IMPERIAL COMMANDS =============

/**
 * POST /api/command-center/nuclei/:nucleusId/quarantine
 * Quarantine a nucleus (emergency isolation)
 */
router.post('/nuclei/:nucleusId/quarantine', async (req, res) => {
    try {
      const { nucleusId } = req.params;
      const { reason } = req.body;

      const [nucleus] = await db
        .select()
        .from(commandCenterNuclei)
        .where(eq(commandCenterNuclei.nucleusId, nucleusId))
        .limit(1);

      if (!nucleus) {
        return res.status(404).json({
          success: false,
          error: 'Nucleus not found'
        });
      }

      await db
        .update(commandCenterNuclei)
        .set({
          quarantined: 1,
          status: 'offline',
          lastUpdated: new Date()
        })
        .where(eq(commandCenterNuclei.nucleusId, nucleusId));

      console.log(`[Command Center] 🚨 Nucleus quarantined: ${nucleusId}`);

      res.json({
        success: true,
        message: `Nucleus ${nucleusId} quarantined`,
        reason
      });
    } catch (error) {
      console.error('[API] ❌ Failed to quarantine nucleus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to quarantine nucleus'
      });
    }
  });

/**
 * POST /api/command-center/nuclei/:nucleusId/release
 * Release a nucleus from quarantine
 */
router.post('/nuclei/:nucleusId/release', async (req, res) => {
    try {
      const { nucleusId } = req.params;

      await db
        .update(commandCenterNuclei)
        .set({
          quarantined: 0,
          status: 'unknown',
          lastUpdated: new Date()
        })
        .where(eq(commandCenterNuclei.nucleusId, nucleusId));

      console.log(`[Command Center] ✅ Nucleus released from quarantine: ${nucleusId}`);

      res.json({
        success: true,
        message: `Nucleus ${nucleusId} released from quarantine`
      });
    } catch (error) {
      console.error('[API] ❌ Failed to release nucleus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to release nucleus'
      });
    }
  });

export default router;
