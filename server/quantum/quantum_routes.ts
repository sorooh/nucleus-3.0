/**
 * PHASE Ω.2: QUANTUM SYNCHRONIZATION API ROUTES
 * ═════════════════════════════════════════════════════════════════════
 * 
 * RESTful API for managing quantum synchronization across Surooh Empire
 * 
 * Routes:
 * - GET  /api/quantum/status - Overall quantum system status
 * - GET  /api/quantum/bridge - Quantum bridge status
 * - POST /api/quantum/bridge/sync - Trigger bridge synchronization
 * - GET  /api/quantum/fusion/stats - Memory fusion statistics
 * - POST /api/quantum/fusion/memory - Fuse new memory
 * - GET  /api/quantum/fusion/search - Search unified memory
 * - GET  /api/quantum/bus/status - Cognitive bus status
 * - POST /api/quantum/bus/broadcast - Broadcast message
 * - GET  /api/quantum/bus/messages/:nucleusId - Get messages for nucleus
 * - GET  /api/quantum/daemon/status - Synchronization daemon status
 * - POST /api/quantum/daemon/start - Start daemon
 * - POST /api/quantum/daemon/stop - Stop daemon
 * - GET  /api/quantum/health - System health snapshots
 * - GET  /api/quantum/health/latest - Latest health snapshot
 */

import { Router } from 'express';
import { quantumBridgeEngine } from './quantum_bridge_engine';
import { memoryFusionEngine } from './memory_fusion_engine';
import { cognitiveBusEngine } from './cognitive_bus';
import { synchronizationDaemon } from './synchronization_daemon';
import { db } from '../db';
import { quantumSyncHealth } from '@shared/schema';
import { desc } from 'drizzle-orm';

export const quantumRoutes = Router();

/**
 * GET /api/quantum/status
 * Overall quantum system status
 */
quantumRoutes.get('/status', async (req, res) => {
  try {
    const bridgeStatus = await quantumBridgeEngine.getStatus();
    const fusionStats = await memoryFusionEngine.getStats();
    const busStatus = await cognitiveBusEngine.getStatus();
    const daemonStatus = synchronizationDaemon.getStatus();

    res.json({
      success: true,
      quantum: {
        bridge: bridgeStatus,
        fusion: fusionStats,
        bus: busStatus,
        daemon: daemonStatus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Quantum API] Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/bridge
 * Quantum bridge status
 */
quantumRoutes.get('/bridge', async (req, res) => {
  try {
    const status = await quantumBridgeEngine.getStatus();
    res.json({
      success: true,
      bridge: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/quantum/bridge/sync
 * Trigger bridge synchronization
 */
quantumRoutes.post('/bridge/sync', async (req, res) => {
  try {
    const { sourceNucleus, targetNuclei, memoryType, memoryContent, priority } = req.body;

    if (!sourceNucleus || !targetNuclei || !memoryType || !memoryContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sourceNucleus, targetNuclei, memoryType, memoryContent',
      });
    }

    const syncId = await quantumBridgeEngine.synchronizeState({
      sourceNucleus,
      targetNuclei,
      memoryType,
      memoryContent,
      priority,
    });

    res.json({
      success: true,
      syncId,
      message: 'Synchronization initiated',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/fusion/stats
 * Memory fusion statistics
 */
quantumRoutes.get('/fusion/stats', async (req, res) => {
  try {
    const stats = await memoryFusionEngine.getStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/quantum/fusion/memory
 * Fuse new memory across nuclei
 */
quantumRoutes.post('/fusion/memory', async (req, res) => {
  try {
    const { sourceNucleus, targetNuclei, memoryType, content, metadata, vector } = req.body;

    if (!sourceNucleus || !targetNuclei || !memoryType || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sourceNucleus, targetNuclei, memoryType, content',
      });
    }

    const result = await memoryFusionEngine.fuseMemory({
      sourceNucleus,
      targetNuclei,
      memoryType,
      content,
      metadata,
      vector,
    });

    res.json({
      success: true,
      fusion: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/fusion/search
 * Search unified memory
 */
quantumRoutes.get('/fusion/search', async (req, res) => {
  try {
    const { query, nucleusFilter, memoryType, limit } = req.query;

    const results = await memoryFusionEngine.searchMemory({
      query: query as string,
      nucleusFilter: nucleusFilter as string,
      memoryType: memoryType as string,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/bus/status
 * Cognitive bus status
 */
quantumRoutes.get('/bus/status', async (req, res) => {
  try {
    const status = await cognitiveBusEngine.getStatus();
    res.json({
      success: true,
      bus: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/quantum/bus/broadcast
 * Broadcast message via cognitive bus
 */
quantumRoutes.post('/bus/broadcast', async (req, res) => {
  try {
    const { senderNucleus, messageType, payload, recipientNuclei, priority, ttlSeconds } = req.body;

    if (!senderNucleus || !messageType || !payload) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: senderNucleus, messageType, payload',
      });
    }

    const delivery = await cognitiveBusEngine.broadcast({
      senderNucleus,
      messageType,
      payload,
      recipientNuclei,
      priority,
      ttlSeconds,
    });

    res.json({
      success: true,
      delivery,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/bus/messages/:nucleusId
 * Get messages for specific nucleus
 */
quantumRoutes.get('/bus/messages/:nucleusId', async (req, res) => {
  try {
    const { nucleusId } = req.params;
    const { messageType, limit, includeExpired } = req.query;

    const messages = await cognitiveBusEngine.getMessages({
      nucleusId,
      messageType: messageType as string,
      limit: limit ? parseInt(limit as string) : 50,
      includeExpired: includeExpired === 'true',
    });

    res.json({
      success: true,
      nucleusId,
      messages,
      count: messages.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/daemon/status
 * Synchronization daemon status
 */
quantumRoutes.get('/daemon/status', async (req, res) => {
  try {
    const status = synchronizationDaemon.getStatus();
    res.json({
      success: true,
      daemon: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/quantum/daemon/start
 * Start synchronization daemon
 */
quantumRoutes.post('/daemon/start', async (req, res) => {
  try {
    await synchronizationDaemon.start();
    res.json({
      success: true,
      message: 'Synchronization daemon started',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/quantum/daemon/stop
 * Stop synchronization daemon
 */
quantumRoutes.post('/daemon/stop', async (req, res) => {
  try {
    await synchronizationDaemon.stop();
    res.json({
      success: true,
      message: 'Synchronization daemon stopped',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/health
 * Get health snapshots
 */
quantumRoutes.get('/health', async (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const snapshots = await db.query.quantumSyncHealth.findMany({
      limit: parseInt(limit as string),
      orderBy: [desc(quantumSyncHealth.createdAt)],
    });

    res.json({
      success: true,
      snapshots,
      count: snapshots.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/quantum/health/latest
 * Get latest health snapshot
 */
quantumRoutes.get('/health/latest', async (req, res) => {
  try {
    const latest = await db.query.quantumSyncHealth.findFirst({
      orderBy: [desc(quantumSyncHealth.createdAt)],
    });

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'No health snapshots found',
      });
    }

    res.json({
      success: true,
      snapshot: latest,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
