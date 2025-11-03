/**
 * GOVERNANCE GATEWAY - Built from Absolute Zero
 * 
 * REST API for Meta-Governance Layer
 * Mother Brain's command center
 */

import { Router, Request, Response } from 'express';
import { governanceEngine } from '../core/governance-engine';

const router = Router();

// ============= Decision Management =============

// Submit decision from child brain
router.post('/submit-decision', (req: Request, res: Response) => {
  try {
    const { source, action, data } = req.body;

    if (!source || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: source, action' 
      });
    }

    const decision = governanceEngine.submitDecision(source, action, data || {});

    res.json({
      message: 'Decision submitted',
      decision: {
        id: decision.id,
        source: decision.source,
        action: decision.action,
        status: decision.status,
        reason: decision.reason,
        timestamp: decision.timestamp
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve decision
router.post('/approve-decision', (req: Request, res: Response) => {
  try {
    const { decisionId, reason } = req.body;

    if (!decisionId) {
      return res.status(400).json({ error: 'Missing decisionId' });
    }

    const decision = governanceEngine.approveDecision(decisionId, reason);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json({
      message: 'Decision approved',
      decision: {
        id: decision.id,
        source: decision.source,
        action: decision.action,
        status: decision.status,
        reason: decision.reason
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject decision
router.post('/reject-decision', (req: Request, res: Response) => {
  try {
    const { decisionId, reason } = req.body;

    if (!decisionId || !reason) {
      return res.status(400).json({ error: 'Missing required fields: decisionId, reason' });
    }

    const decision = governanceEngine.rejectDecision(decisionId, reason);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json({
      message: 'Decision rejected',
      decision: {
        id: decision.id,
        source: decision.source,
        action: decision.action,
        status: decision.status,
        reason: decision.reason
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get decision ledger
router.get('/ledger', (req: Request, res: Response) => {
  try {
    const { source, status, limit } = req.query;

    const decisions = governanceEngine.getDecisions({
      source: source as string,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      count: decisions.length,
      decisions: decisions.map(d => ({
        id: d.id,
        source: d.source,
        action: d.action,
        status: d.status,
        reason: d.reason,
        timestamp: d.timestamp,
        reviewedBy: d.reviewedBy
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Policy Management =============

// Get policies
router.get('/policies', (req: Request, res: Response) => {
  try {
    const policies = governanceEngine.getPolicies();

    res.json({
      count: policies.length,
      policies: policies.map(p => ({
        id: p.id,
        name: p.name,
        action: p.action,
        priority: p.priority,
        active: p.active
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add policy
router.post('/add-policy', (req: Request, res: Response) => {
  try {
    const { id, name, action, priority, active } = req.body;

    if (!id || !name || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, name, action' 
      });
    }

    // Note: condition function must be set programmatically, not via API
    const policy = {
      id,
      name,
      condition: () => true, // Default condition
      action,
      priority: priority || 5,
      active: active !== false
    };

    governanceEngine.addPolicy(policy);

    res.json({
      message: 'Policy added',
      policy: {
        id: policy.id,
        name: policy.name,
        action: policy.action,
        priority: policy.priority,
        active: policy.active
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update policy
router.patch('/update-policy', (req: Request, res: Response) => {
  try {
    const { policyId, active } = req.body;

    if (!policyId) {
      return res.status(400).json({ error: 'Missing policyId' });
    }

    const policy = governanceEngine.updatePolicy(policyId, { active });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({
      message: 'Policy updated',
      policy: {
        id: policy.id,
        name: policy.name,
        active: policy.active
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove policy
router.delete('/remove-policy', (req: Request, res: Response) => {
  try {
    const { policyId } = req.body;

    if (!policyId) {
      return res.status(400).json({ error: 'Missing policyId' });
    }

    const removed = governanceEngine.removePolicy(policyId);

    if (!removed) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({
      message: 'Policy removed',
      policyId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Authority Management =============

// Grant authority
router.post('/grant-authority', (req: Request, res: Response) => {
  try {
    const { brainId, level, permissions, expiresIn } = req.body;

    if (!brainId || !level || !permissions) {
      return res.status(400).json({ 
        error: 'Missing required fields: brainId, level, permissions' 
      });
    }

    const authority = governanceEngine.grantAuthority(
      brainId, 
      level, 
      permissions,
      expiresIn
    );

    res.json({
      message: 'Authority granted',
      authority: {
        brainId: authority.brainId,
        level: authority.level,
        permissions: authority.permissions,
        grantedAt: authority.grantedAt,
        expiresAt: authority.expiresAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Revoke authority
router.post('/revoke-authority', (req: Request, res: Response) => {
  try {
    const { brainId } = req.body;

    if (!brainId) {
      return res.status(400).json({ error: 'Missing brainId' });
    }

    const revoked = governanceEngine.revokeAuthority(brainId);

    if (!revoked) {
      return res.status(404).json({ error: 'Authority not found' });
    }

    res.json({
      message: 'Authority revoked',
      brainId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delegate authority
router.post('/delegate-authority', (req: Request, res: Response) => {
  try {
    const { fromBrain, toBrain, permissions, duration } = req.body;

    if (!fromBrain || !toBrain || !permissions || !duration) {
      return res.status(400).json({ 
        error: 'Missing required fields: fromBrain, toBrain, permissions, duration' 
      });
    }

    const authority = governanceEngine.delegateAuthority(
      fromBrain,
      toBrain,
      permissions,
      duration
    );

    if (!authority) {
      return res.status(403).json({ 
        error: 'Cannot delegate - insufficient permissions or authority revoked' 
      });
    }

    res.json({
      message: 'Authority delegated',
      authority: {
        brainId: authority.brainId,
        level: authority.level,
        permissions: authority.permissions,
        expiresAt: authority.expiresAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get authorities
router.get('/authorities', (req: Request, res: Response) => {
  try {
    const authorities = governanceEngine.getAuthorities();

    res.json({
      count: authorities.length,
      authorities: authorities.map(a => ({
        brainId: a.brainId,
        level: a.level,
        permissions: a.permissions,
        grantedAt: a.grantedAt,
        expiresAt: a.expiresAt
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Conflict Detection =============

router.get('/detect-conflicts', (req: Request, res: Response) => {
  try {
    const conflicts = governanceEngine.detectConflicts();

    res.json({
      count: conflicts.length,
      conflicts: conflicts.map(c => ({
        id: c.id,
        source: c.source,
        action: c.action,
        status: c.status,
        timestamp: c.timestamp
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Analytics & Status =============

router.get('/analytics', (req: Request, res: Response) => {
  try {
    const analytics = governanceEngine.getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', (req: Request, res: Response) => {
  try {
    const status = governanceEngine.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= Activation =============

router.post('/activate', (req: Request, res: Response) => {
  try {
    governanceEngine.activate();
    res.json({ message: 'Governance Engine activated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deactivate', (req: Request, res: Response) => {
  try {
    governanceEngine.deactivate();
    res.json({ message: 'Governance Engine deactivated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

console.log('👑 Governance API Gateway initialized');

export default router;
