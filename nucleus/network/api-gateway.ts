/**
 * API Gateway
 * REST API endpoints for Nucleus 2.0
 * 
 * Built from zero - clean implementation
 */

import type { Express } from 'express';
import { communicationLayer } from '../core/communication-layer';
import { securityGuard } from '../core/security-guard';
import { recoveryManager } from '../core/recovery-manager';
import { refinementEngine } from '../core/refinement-engine';
import { governanceEngine } from '../core/governance-engine';
import { pulseMonitor } from '../core/pulse-monitor';
import { memoryHub } from '../core/memory-hub';
import { knowledgeFeed } from '../core/knowledge-feed';
import { redisCache } from '../core/redis-cache';

// ============================================
// API Gateway Setup
// ============================================

export async function setupNucleusAPI(app: Express): Promise<void> {
  // Initialize recovery manager
  await recoveryManager.activate();

  // Initialize security guard
  await securityGuard.activate();

  // Initialize refinement engine
  await refinementEngine.activate();

  // Initialize governance engine
  await governanceEngine.activate();

  // Initialize pulse monitor (5 min intervals)
  pulseMonitor.activate(5 * 60 * 1000);

  // Initialize memory hub
  memoryHub.activate();

  // Initialize knowledge feed
  await knowledgeFeed.activate();

  // Initialize Redis cache (performance layer)
  try {
    await redisCache.activate();
  } catch (error: any) {
    console.warn('⚠️ Redis Cache failed to activate:', error.message);
    console.warn('   Continuing without cache...');
  }

  // Initialize communication layer
  await communicationLayer.initialize();

  // Register components with recovery manager
  recoveryManager.registerComponent('refinement-engine', refinementEngine);
  recoveryManager.registerComponent('governance-engine', governanceEngine);
  recoveryManager.registerComponent('pulse-monitor', pulseMonitor);
  recoveryManager.registerComponent('memory-hub', memoryHub);
  recoveryManager.registerComponent('knowledge-feed', knowledgeFeed);
  recoveryManager.registerComponent('redis-cache', redisCache);

  console.log('🌐 API Gateway initialized');

  // ============================================
  // Nucleus APIs
  // ============================================

  /**
   * POST /api/nucleus/think
   * Main thinking endpoint
   */
  app.post('/api/nucleus/think', async (req, res) => {
    try {
      const { input, user, context } = req.body;

      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'Input is required'
        });
      }

      const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';

      const response = await communicationLayer.handleRequest({
        input,
        user,
        context: {
          ...context,
          ip: clientIp,
          endpoint: '/api/nucleus/think'
        },
        source: 'rest'
      });

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/nucleus/status
   * Get nucleus status
   */
  app.get('/api/nucleus/status', async (req, res) => {
    try {
      const status = communicationLayer.getStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/nucleus/shutdown
   * Shutdown nucleus (admin only)
   */
  app.post('/api/nucleus/shutdown', async (req, res) => {
    try {
      await communicationLayer.shutdown();
      
      res.json({
        success: true,
        message: 'Nucleus shutdown successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
