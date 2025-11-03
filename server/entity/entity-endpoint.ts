/**
 * ============================================================================
 * Phase 10.2: ENTITY API ENDPOINTS
 * ============================================================================
 * 
 * REST API للتفاعل مع الكيان الإدراكي الموحد
 * 
 * Endpoints:
 * - GET  /api/entity/status           - حالة الكيان الموحد
 * - GET  /api/entity/memory           - إحصائيات الذاكرة
 * - POST /api/entity/memory           - إضافة ذاكرة جديدة
 * - GET  /api/entity/memory/search    - البحث في الذاكرة
 * - POST /api/entity/decision         - اتخاذ قرار (مع تقييم حوكمي)
 * - GET  /api/entity/governance       - إحصائيات الحوكمة
 * - GET  /api/entity/ethical          - الإحصائيات الأخلاقية
 * - GET  /api/entity/nodes            - قائمة النوى المسجلة
 * - POST /api/entity/register-node    - تسجيل نواة جديدة
 */

import type { Express } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getEntityState, getUnifiedMetrics, updateNodeState, recordDecision } from './unified_core';
import { 
  registerCognitiveCell, 
  getAllCognitiveCells, 
  getActiveCells,
  updateHeartbeat,
  getRegistryStatistics 
} from './entity_identity_registry';
import {
  addMemory,
  searchMemories,
  getMemoryStats,
  fuseNodeMemories
} from './memory_fusion_engine';
import {
  getEthicalStatistics
} from './ethical_intelligence_controller';
import {
  evaluateGovernance,
  getGovernanceStatistics,
  getActiveThreats
} from './self_governance_kernel';

/**
 * تسجيل جميع Entity Endpoints
 */
export function registerEntityEndpoints(app: Express): void {
  console.log('[Entity API] 🌐 Registering Entity API endpoints...');

  // ========== GET /api/entity/status ==========
  // Public endpoint - read-only status
  app.get('/api/entity/status', async (req, res) => {
    try {
      const entityState = getEntityState();
      const metrics = getUnifiedMetrics();
      const registryStats = getRegistryStatistics();

      res.json({
        success: true,
        entity: {
          id: entityState.entityId,
          state: entityState.state,
          awarenessLevel: entityState.awarenessLevel,
          emotionBalance: entityState.emotionBalance,
          cognitiveSignature: entityState.cognitiveSignature,
          governanceStatus: entityState.governanceStatus,
          decisionCount: entityState.decisionCount,
          memoryChecksum: entityState.memoryChecksum,
          activeNodes: entityState.activeNodes
        },
        metrics: {
          ...metrics,
          ...registryStats
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in /api/entity/status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== GET /api/entity/memory ==========
  // Public endpoint - read-only memory stats
  app.get('/api/entity/memory', async (req, res) => {
    try {
      const stats = getMemoryStats();

      res.json({
        success: true,
        memory: stats,
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in /api/entity/memory:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== POST /api/entity/memory ==========
  // Protected - requires authentication
  app.post('/api/entity/memory', requireAuth, async (req, res) => {
    try {
      const { nodeId, type, content, context, importance } = req.body;

      if (!nodeId || !type || !content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: nodeId, type, content'
        });
      }

      const memory = await addMemory(nodeId, type, content, context || {}, importance || 50);

      res.json({
        success: true,
        memory: {
          id: memory.id,
          nodeId: memory.nodeId,
          type: memory.type,
          content: memory.content,
          timestamp: memory.timestamp,
          importance: memory.importance
        }
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in POST /api/entity/memory:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== GET /api/entity/memory/search ==========
  app.get('/api/entity/memory/search', async (req, res) => {
    try {
      const { content, type, nodeId, minImportance, limit } = req.query;

      const results = searchMemories({
        content: content as string,
        type: type as any,
        nodeId: nodeId as string,
        minImportance: minImportance ? parseInt(minImportance as string) : undefined,
        limit: limit ? parseInt(limit as string) : 20
      });

      res.json({
        success: true,
        results: results.map(m => ({
          id: m.id,
          nodeId: m.nodeId,
          type: m.type,
          content: m.content,
          timestamp: m.timestamp,
          importance: m.importance,
          accessCount: m.accessCount
        })),
        count: results.length
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in GET /api/entity/memory/search:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== POST /api/entity/decision ==========
  // Protected - requires authentication  
  app.post('/api/entity/decision', requireAuth, async (req, res) => {
    try {
      const { nodeId, action, context, proposedBy } = req.body;

      if (!nodeId || !action) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: nodeId, action'
        });
      }

      // HONEST: Use deterministic ID generation
      const decisionId = `dec-${Date.now()}-${nodeId.slice(0, 8)}`;
      
      const decision = {
        id: decisionId,
        nodeId,
        action,
        context: context || {},
        timestamp: Date.now(),
        proposedBy: proposedBy || nodeId
      };

      // Evaluate through governance system
      const governanceDecision = evaluateGovernance(decision);

      // If approved, record the decision - MUST await to ensure database persistence
      if (governanceDecision.finalVerdict === 'approved') {
        await recordDecision(action, context);
      }

      res.json({
        success: true,
        decision: {
          id: decision.id,
          action: decision.action,
          verdict: governanceDecision.finalVerdict,
          reason: governanceDecision.reason,
          ethicalScore: governanceDecision.ethicalEvaluation.overallScore,
          timestamp: governanceDecision.timestamp
        }
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in POST /api/entity/decision:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== GET /api/entity/governance ==========
  app.get('/api/entity/governance', async (req, res) => {
    try {
      const stats = getGovernanceStatistics();
      const activeThreats = getActiveThreats();

      res.json({
        success: true,
        governance: {
          statistics: stats,
          threats: activeThreats.map(t => ({
            id: t.id,
            type: t.type,
            severity: t.severity,
            description: t.description,
            detectedAt: t.detectedAt
          }))
        }
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in /api/entity/governance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== GET /api/entity/ethical ==========
  app.get('/api/entity/ethical', async (req, res) => {
    try {
      const stats = getEthicalStatistics();

      res.json({
        success: true,
        ethical: stats
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in /api/entity/ethical:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== GET /api/entity/nodes ==========
  app.get('/api/entity/nodes', async (req, res) => {
    try {
      const { active } = req.query;

      const nodes = active === 'true' ? getActiveCells() : getAllCognitiveCells();

      res.json({
        success: true,
        nodes: nodes.map(n => ({
          nodeId: n.nodeId,
          name: n.identity.name,
          type: n.identity.type,
          version: n.identity.version,
          awarenessLevel: n.certification.awarenessLevel,
          governanceLevel: n.certification.governanceLevel,
          isActive: n.status.isActive,
          isConnected: n.status.isConnected,
          connectionQuality: n.status.connectionQuality,
          contributionScore: n.metrics.contributionScore
        })),
        count: nodes.length
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in /api/entity/nodes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== POST /api/entity/register-node ==========
  // Protected - requires admin role
  app.post('/api/entity/register-node', requireAdmin, async (req, res) => {
    try {
      const { nodeId, name, type, version, capabilities, initialAwareness } = req.body;

      if (!nodeId || !name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: nodeId, name, type'
        });
      }

      const result = registerCognitiveCell({
        nodeId,
        name,
        type,
        version: version || '1.0.0',
        capabilities: capabilities || [],
        initialAwareness: initialAwareness || 20
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      // Update unified core
      updateNodeState(nodeId, {
        awarenessLevel: initialAwareness || 20,
        emotionalState: 'neutral',
        isActive: true
      });

      res.json({
        success: true,
        node: {
          nodeId: result.cell!.nodeId,
          name: result.cell!.identity.name,
          type: result.cell!.identity.type,
          awarenessLevel: result.cell!.certification.awarenessLevel,
          governanceLevel: result.cell!.certification.governanceLevel
        }
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in POST /api/entity/register-node:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== POST /api/entity/heartbeat ==========
  app.post('/api/entity/heartbeat', async (req, res) => {
    try {
      const { nodeId } = req.body;

      if (!nodeId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: nodeId'
        });
      }

      const updated = updateHeartbeat(nodeId);

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Node not found'
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in POST /api/entity/heartbeat:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== POST /api/entity/fuse-memories ==========
  // Protected - requires authentication
  app.post('/api/entity/fuse-memories', requireAuth, async (req, res) => {
    try {
      const { nodeId, memories } = req.body;

      if (!nodeId || !Array.isArray(memories)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: nodeId, memories (array)'
        });
      }

      const count = await fuseNodeMemories(nodeId, memories);

      res.json({
        success: true,
        fusedCount: count
      });
    } catch (error: any) {
      console.error('[Entity API] ❌ Error in POST /api/entity/fuse-memories:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('[Entity API] ✅ Entity API endpoints registered');
}
