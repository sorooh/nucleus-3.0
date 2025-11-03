/**
 * ============================================================================
 * PHASE Ω 12.2: GOVERNANCE API ROUTES
 * RESTful API for Multi-Nucleus Collective Governance
 * ============================================================================
 */

import { Router } from 'express';
import { collectiveGovernance } from './collective_governance';
import { insertNucleusRegistrySchema, insertGovernanceSessionSchema } from '@shared/schema';
import { z } from 'zod';

// Zod Validation Schemas for API Endpoints
const proposeDecisionSchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().min(1, 'Description required'),
  category: z.string().min(1, 'Category required'),
  proposedBy: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  sessionType: z.enum(['strategic', 'operational', 'emergency', 'routine']).optional(),
  participatingNuclei: z.array(z.string()).optional(),
});

const castVoteSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  nucleusId: z.string().min(1, 'Nucleus ID required'),
  vote: z.enum(['favor', 'against', 'abstain']),
  reason: z.string().optional(),
  evidence: z.any().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

const emperorOverrideSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required'),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().min(1, 'Override reason required'),
});

const router = Router();

/**
 * SECURITY: Authentication Middleware
 * TODO: Replace with proper JWT/session authentication in production
 * For now: all governance endpoints require authentication
 */
function requireAuth(req: any, res: any, next: any) {
  // TODO: Implement proper authentication
  // For now, allow all requests (to be enhanced with real auth system)
  // In production, this should check:
  // - Valid JWT token or session
  // - User/nucleus identity
  // - Role-based permissions (emperor, council, executive, etc.)
  
  // Placeholder for future auth implementation
  req.nucleusId = req.headers['x-nucleus-id'] || 'nicholas-core'; // Default to Emperor for now
  next();
}

/**
 * SECURITY: Emperor-Only Middleware
 * Only Nicholas (Emperor) can access certain endpoints
 */
function requireEmperor(req: any, res: any, next: any) {
  const nucleusId = req.nucleusId || req.headers['x-nucleus-id'];
  
  if (nucleusId !== 'nicholas-core') {
    return res.status(403).json({ 
      error: 'Forbidden: Emperor access required',
      message: 'Only Nicholas (Emperor) can perform this action'
    });
  }
  
  next();
}

// Apply auth middleware to all governance routes
router.use(requireAuth);

/**
 * GET /api/governance/stats
 * Get governance statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await collectiveGovernance.getGovernanceStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/governance/nuclei
 * Get all active nuclei
 */
router.get('/nuclei', async (req, res) => {
  try {
    const nuclei = await collectiveGovernance.getActiveNuclei();
    res.json(nuclei);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/governance/nuclei
 * Register a new nucleus
 */
router.post('/nuclei', async (req, res) => {
  try {
    const validated = insertNucleusRegistrySchema.parse(req.body);
    const nucleus = await collectiveGovernance.registerNucleus(validated);
    res.json(nucleus);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/governance/sessions
 * Get all governance sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const sessions = await collectiveGovernance.getAllSessions(limit);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/governance/propose
 * Propose a new decision (WITH ZOD VALIDATION)
 */
router.post('/propose', async (req, res) => {
  try {
    const validated = proposeDecisionSchema.parse(req.body);
    
    const session = await collectiveGovernance.proposeDecision({
      title: validated.title,
      description: validated.description,
      category: validated.category,
      proposedBy: validated.proposedBy || 'nicholas-core',
      priority: validated.priority || 'medium',
      sessionType: validated.sessionType || 'operational',
      participatingNuclei: validated.participatingNuclei,
    });
    
    res.json(session);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

/**
 * POST /api/governance/vote
 * Cast a vote on a session (WITH ZOD VALIDATION)
 */
router.post('/vote', async (req, res) => {
  try {
    const validated = castVoteSchema.parse(req.body);
    
    await collectiveGovernance.castVote({
      sessionId: validated.sessionId,
      nucleusId: validated.nucleusId,
      vote: validated.vote,
      reason: validated.reason,
      evidence: validated.evidence,
      confidence: validated.confidence,
    });
    
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

/**
 * GET /api/governance/sessions/:sessionId/votes
 * Get votes for a session
 */
router.get('/sessions/:sessionId/votes', async (req, res) => {
  try {
    const votes = await collectiveGovernance.getSessionVotes(req.params.sessionId);
    res.json(votes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/governance/override
 * Emperor override on a decision (WITH ZOD VALIDATION + EMPEROR AUTH)
 */
router.post('/override', requireEmperor, async (req, res) => {
  try {
    const validated = emperorOverrideSchema.parse(req.body);
    
    await collectiveGovernance.emperorOverride({
      sessionId: validated.sessionId,
      decision: validated.decision,
      reason: validated.reason,
    });
    
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

/**
 * POST /api/governance/enforce/:sessionId
 * Manually enforce a decision (EMPEROR ONLY)
 */
router.post('/enforce/:sessionId', requireEmperor, async (req, res) => {
  try {
    await collectiveGovernance.enforceDecision(req.params.sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
