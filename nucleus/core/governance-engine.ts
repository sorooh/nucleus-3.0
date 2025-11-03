/**
 * META-GOVERNANCE LAYER - Built from Absolute Zero
 * 
 * النواة الأم تحكم النوى الفرعية
 * Mother Brain governs all Child Brains
 * 
 * Purpose: Monitor, approve, and enforce policies across all child brains
 * Features:
 * - Decision monitoring and approval
 * - Policy enforcement
 * - Conflict detection
 * - Authority delegation
 */

import { EventEmitter } from 'events';

// ============= Types & Interfaces =============

export type DecisionSource = string; // e.g., "B2B_Brain", "B2C_Brain", "CE_Brain"
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'conflict';
export type PolicyAction = 'allow' | 'deny' | 'review';
export type AuthorityLevel = 'full' | 'delegated' | 'restricted' | 'revoked';

export interface Decision {
  id: string;
  source: DecisionSource;
  action: string;
  data: Record<string, any>;
  timestamp: number;
  status: DecisionStatus;
  reviewedBy: string;
  reason?: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: (decision: Decision) => boolean;
  action: PolicyAction;
  priority: number;
  active: boolean;
}

export interface Authority {
  brainId: string;
  level: AuthorityLevel;
  permissions: string[];
  grantedAt: number;
  expiresAt?: number;
}

export interface GovernanceAnalytics {
  totalDecisions: number;
  approved: number;
  rejected: number;
  conflicts: number;
  policiesActive: number;
  authoritiesGranted: number;
}

// ============= Governance Engine =============

export class GovernanceEngine extends EventEmitter {
  private active: boolean = false;
  private decisions: Map<string, Decision> = new Map();
  private policies: Map<string, PolicyRule> = new Map();
  private authorities: Map<string, Authority> = new Map();
  private motherBrainId: string = 'nucleus-mother-brain';

  constructor() {
    super();
    console.log('[GovernanceEngine] Initialized (from absolute zero)');
    this.initializeDefaultPolicies();
  }

  // ============= Activation =============

  activate(): void {
    if (this.active) {
      console.log('[GovernanceEngine] Already active');
      return;
    }

    this.active = true;
    this.emit('activated');
    console.log('👑 Governance Engine activated - Mother Brain in control');
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.emit('deactivated');
    console.log('[GovernanceEngine] Deactivated');
  }

  // ============= Default Policies =============

  private initializeDefaultPolicies(): void {
    // Policy 1: Critical actions require approval
    this.addPolicy({
      id: 'policy-critical-approval',
      name: 'Critical Actions Require Approval',
      condition: (decision) => {
        const critical = ['delete_user', 'modify_payment', 'change_pricing', 'system_shutdown'];
        return critical.includes(decision.action);
      },
      action: 'review',
      priority: 10,
      active: true
    });

    // Policy 2: Allow standard operations
    this.addPolicy({
      id: 'policy-standard-allow',
      name: 'Allow Standard Operations',
      condition: (decision) => {
        const standard = ['create_order', 'update_profile', 'send_notification', 'generate_report'];
        return standard.includes(decision.action);
      },
      action: 'allow',
      priority: 5,
      active: true
    });

    // Policy 3: Allow Federation operations (Higher priority than unauthorized access)
    this.addPolicy({
      id: 'policy-federation-allow',
      name: 'Allow Federation Operations',
      condition: (decision) => {
        const federationOps = ['register_node', 'activate_node', 'ws_connect', 'broadcast_message'];
        const isFederationOp = decision.source === 'nicholas-federation' && federationOps.includes(decision.action);
        const isSyncOp = decision.source === 'nicholas-federation' && decision.action.startsWith('sync_');
        const isIntelligenceOp = decision.action.startsWith('intelligence_') || decision.action === 'broadcast_intelligence';
        const isAutonomousLearningOp = decision.action === 'send_decision' || decision.action === 'submit_feedback'; // Phase 9.7
        return isFederationOp || isSyncOp || isIntelligenceOp || isAutonomousLearningOp;
      },
      action: 'allow',
      priority: 20, // Higher than deny-unauthorized (15)
      active: true
    });

    // Policy 4: Deny unauthorized access
    this.addPolicy({
      id: 'policy-deny-unauthorized',
      name: 'Deny Unauthorized Access',
      condition: (decision) => {
        const authority = this.authorities.get(decision.source);
        return !authority || authority.level === 'revoked';
      },
      action: 'deny',
      priority: 15,
      active: true
    });
  }

  // ============= Decision Processing =============

  submitDecision(source: DecisionSource, action: string, data: Record<string, any> = {}): Decision {
    if (!this.active) {
      throw new Error('Governance Engine is not active');
    }

    const decisionId = `decision-${Date.now()}-${this.randomId()}`;
    
    const decision: Decision = {
      id: decisionId,
      source,
      action,
      data,
      timestamp: Date.now(),
      status: 'pending',
      reviewedBy: this.motherBrainId
    };

    // Apply policies
    const result = this.applyPolicies(decision);
    decision.status = result.status;
    decision.reason = result.reason;

    this.decisions.set(decisionId, decision);
    this.emit('decision-processed', { decision });

    console.log(`[GovernanceEngine] Decision ${result.status}: ${source} → ${action}`);
    return decision;
  }

  private applyPolicies(decision: Decision): { status: DecisionStatus; reason: string } {
    // Get applicable policies sorted by priority
    const applicablePolicies = Array.from(this.policies.values())
      .filter(p => p.active && p.condition(decision))
      .sort((a, b) => b.priority - a.priority);

    if (applicablePolicies.length === 0) {
      return { status: 'approved', reason: 'No policies matched, default allow' };
    }

    // Apply highest priority policy
    const policy = applicablePolicies[0];

    switch (policy.action) {
      case 'allow':
        return { status: 'approved', reason: `Policy: ${policy.name}` };
      case 'deny':
        return { status: 'rejected', reason: `Policy: ${policy.name}` };
      case 'review':
        return { status: 'pending', reason: `Requires review: ${policy.name}` };
      default:
        return { status: 'approved', reason: 'Default allow' };
    }
  }

  approveDecision(decisionId: string, reason?: string): Decision | null {
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    decision.status = 'approved';
    decision.reason = reason || 'Manually approved by Mother Brain';
    this.emit('decision-approved', { decision });
    
    console.log(`[GovernanceEngine] Decision approved: ${decisionId}`);
    return decision;
  }

  rejectDecision(decisionId: string, reason: string): Decision | null {
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    decision.status = 'rejected';
    decision.reason = reason;
    this.emit('decision-rejected', { decision });
    
    console.log(`[GovernanceEngine] Decision rejected: ${decisionId}`);
    return decision;
  }

  // ============= Policy Management =============

  addPolicy(policy: PolicyRule): void {
    this.policies.set(policy.id, policy);
    this.emit('policy-added', { policy });
    console.log(`[GovernanceEngine] Policy added: ${policy.name}`);
  }

  removePolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId);
    if (deleted) {
      this.emit('policy-removed', { policyId });
      console.log(`[GovernanceEngine] Policy removed: ${policyId}`);
    }
    return deleted;
  }

  updatePolicy(policyId: string, updates: Partial<PolicyRule>): PolicyRule | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    Object.assign(policy, updates);
    this.emit('policy-updated', { policy });
    console.log(`[GovernanceEngine] Policy updated: ${policy.name}`);
    return policy;
  }

  // ============= Authority Management =============

  grantAuthority(brainId: string, level: AuthorityLevel, permissions: string[], expiresIn?: number): Authority {
    const authority: Authority = {
      brainId,
      level,
      permissions,
      grantedAt: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined
    };

    this.authorities.set(brainId, authority);
    this.emit('authority-granted', { authority });
    console.log(`[GovernanceEngine] Authority granted: ${brainId} → ${level}`);
    return authority;
  }

  revokeAuthority(brainId: string): boolean {
    const authority = this.authorities.get(brainId);
    if (!authority) return false;

    authority.level = 'revoked';
    this.emit('authority-revoked', { brainId });
    console.log(`[GovernanceEngine] Authority revoked: ${brainId}`);
    return true;
  }

  delegateAuthority(fromBrain: string, toBrain: string, permissions: string[], duration: number): Authority | null {
    const fromAuthority = this.authorities.get(fromBrain);
    if (!fromAuthority || fromAuthority.level === 'revoked') {
      return null;
    }

    // Check if fromBrain has permissions to delegate
    const canDelegate = permissions.every(p => fromAuthority.permissions.includes(p));
    if (!canDelegate) {
      return null;
    }

    return this.grantAuthority(toBrain, 'delegated', permissions, duration);
  }

  // ============= Conflict Detection =============

  detectConflicts(): Decision[] {
    const conflicts: Decision[] = [];
    
    // Check for conflicting decisions in last 5 minutes
    const recentTime = Date.now() - 5 * 60 * 1000;
    const recentDecisions = Array.from(this.decisions.values())
      .filter(d => d.timestamp > recentTime);

    for (let i = 0; i < recentDecisions.length; i++) {
      for (let j = i + 1; j < recentDecisions.length; j++) {
        const d1 = recentDecisions[i];
        const d2 = recentDecisions[j];

        // Same action from different sources = potential conflict
        if (d1.action === d2.action && d1.source !== d2.source) {
          d1.status = 'conflict';
          d2.status = 'conflict';
          conflicts.push(d1, d2);
        }
      }
    }

    if (conflicts.length > 0) {
      this.emit('conflicts-detected', { conflicts });
      console.log(`[GovernanceEngine] Conflicts detected: ${conflicts.length}`);
    }

    return conflicts;
  }

  // ============= Analytics =============

  getAnalytics(): GovernanceAnalytics {
    const decisions = Array.from(this.decisions.values());
    
    return {
      totalDecisions: decisions.length,
      approved: decisions.filter(d => d.status === 'approved').length,
      rejected: decisions.filter(d => d.status === 'rejected').length,
      conflicts: decisions.filter(d => d.status === 'conflict').length,
      policiesActive: Array.from(this.policies.values()).filter(p => p.active).length,
      authoritiesGranted: Array.from(this.authorities.values()).filter(a => a.level !== 'revoked').length
    };
  }

  // ============= Queries =============

  getDecisions(filter?: { source?: string; status?: DecisionStatus; limit?: number }): Decision[] {
    let decisions = Array.from(this.decisions.values());

    if (filter?.source) {
      decisions = decisions.filter(d => d.source === filter.source);
    }
    if (filter?.status) {
      decisions = decisions.filter(d => d.status === filter.status);
    }

    // Sort by timestamp descending
    decisions.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      decisions = decisions.slice(0, filter.limit);
    }

    return decisions;
  }

  getPolicies(): PolicyRule[] {
    return Array.from(this.policies.values());
  }

  getAuthorities(): Authority[] {
    return Array.from(this.authorities.values());
  }

  getStatus(): { active: boolean; decisionsProcessed: number; policiesActive: number; authoritiesGranted: number } {
    return {
      active: this.active,
      decisionsProcessed: this.decisions.size,
      policiesActive: Array.from(this.policies.values()).filter(p => p.active).length,
      authoritiesGranted: Array.from(this.authorities.values()).filter(a => a.level !== 'revoked').length
    };
  }

  // ============= Utilities =============

  private randomId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  // ============= Export for Integration =============

  getDecisionLedger(): Decision[] {
    return Array.from(this.decisions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Export singleton instance
export const governanceEngine = new GovernanceEngine();
