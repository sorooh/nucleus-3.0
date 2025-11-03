/**
 * PHASE 7.1 → 8.6: COLLECTIVE INTELLIGENCE API ROUTES
 */

import express from 'express';
import { collectiveIntelligenceEngine } from './index';
import { db } from '../db';
import { collectiveSessions } from '@shared/schema';
import { desc } from 'drizzle-orm';

const router = express.Router();

// ============================================
// ENGINE CONTROL
// ============================================

router.get('/status', async (req, res) => {
  try {
    const status = collectiveIntelligenceEngine.getStatus();
    const stats = await collectiveIntelligenceEngine.getStatistics();
    
    res.json({
      success: true,
      data: {
        ...status,
        stats,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/start', async (req, res) => {
  try {
    await collectiveIntelligenceEngine.start();
    res.json({
      success: true,
      message: 'Collective Intelligence Engine started',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/stop', async (req, res) => {
  try {
    await collectiveIntelligenceEngine.stop();
    res.json({
      success: true,
      message: 'Collective Intelligence Engine stopped',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/autonomous/enable', async (req, res) => {
  try {
    const { threshold } = req.body;
    collectiveIntelligenceEngine.enableAutonomousMode(threshold || 60);
    res.json({
      success: true,
      message: 'Autonomous Mode enabled - decisions will auto-approve at threshold',
      autonomousMode: true,
      threshold: threshold || 60,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/autonomous/disable', async (req, res) => {
  try {
    collectiveIntelligenceEngine.disableAutonomousMode();
    res.json({
      success: true,
      message: 'Autonomous Mode disabled',
      autonomousMode: false,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// COLLECTIVE SESSIONS
// ============================================

router.get('/sessions', async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    let sessions;
    
    if (statusFilter) {
      sessions = await collectiveIntelligenceEngine.getActiveSessions();
    } else {
      // Get all sessions (both open and decided)
      sessions = await db.query.collectiveSessions.findMany({
        orderBy: [desc(collectiveSessions.startedAt)],
        limit: 50,
      });
    }
    
    res.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const session = await collectiveIntelligenceEngine.initiateSession(req.body);
    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/sessions/:sessionId/vote', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const decision = await collectiveIntelligenceEngine.submitDecision({
      sessionId,
      ...req.body,
    });
    res.json({
      success: true,
      data: decision,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// INTELLIGENCE SHARING
// ============================================

router.get('/exchanges', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const exchanges = await collectiveIntelligenceEngine.getRecentExchanges(limit);
    res.json({
      success: true,
      data: exchanges,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/exchanges', async (req, res) => {
  try {
    const exchange = await collectiveIntelligenceEngine.shareIntelligence(req.body);
    res.json({
      success: true,
      data: exchange,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/exchanges/:exchangeId/acknowledge', async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { nucleusId } = req.body;
    
    await collectiveIntelligenceEngine.acknowledgeIntelligence(exchangeId, nucleusId);
    res.json({
      success: true,
      message: 'Intelligence acknowledged',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// COGNITIVE BUS MESSAGES
// ============================================

router.get('/messages', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const messages = await collectiveIntelligenceEngine.getRecentMessages(limit);
    res.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/messages/broadcast', async (req, res) => {
  try {
    const message = await collectiveIntelligenceEngine.broadcastMessage(req.body);
    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/messages/request', async (req, res) => {
  try {
    const message = await collectiveIntelligenceEngine.sendRequest(req.body);
    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/messages/:requestId/respond', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { responseData } = req.body;
    
    const response = await collectiveIntelligenceEngine.sendResponse(requestId, responseData);
    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// STATISTICS
// ============================================

router.get('/stats', async (req, res) => {
  try {
    const stats = await collectiveIntelligenceEngine.getStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
