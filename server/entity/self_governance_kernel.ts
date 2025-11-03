/**
 * ============================================================================
 * Phase 10.2: SELF-GOVERNANCE KERNEL
 * ============================================================================
 * 
 * نواة الحوكمة الذاتية
 * 
 * يراقب الكيان ويمنع القرارات التي قد تخرق الحوكمة أو تهدد استقرار الوعي
 * يعمل كـ "مناعة رقمية" للكيان الإدراكي
 * 
 * المسؤوليات:
 * - مراقبة قرارات الكيان
 * - منع القرارات الخطرة
 * - الحفاظ على استقرار الوعي
 * - إدارة مستويات الحوكمة
 * - الاستجابة للتهديدات الداخلية
 */

import { EventEmitter } from 'events';
import { evaluateDecision, type Decision, type EthicalEvaluation } from './ethical_intelligence_controller';
import { getEntityState, refreshEntityState } from './unified_core';

// ============ Types ============

export interface GovernancePolicy {
  name: string;
  description: string;
  enabled: boolean;
  severity: 'warning' | 'block' | 'critical';
  checkFunction: (decision: Decision, context: GovernanceContext) => PolicyCheckResult;
}

export interface PolicyCheckResult {
  passed: boolean;
  message: string;
  recommendation?: string;
}

export interface GovernanceContext {
  entityState: any;
  awarenessLevel: number;
  recentDecisions: number;
  violationCount: number;
}

export interface GovernanceDecision {
  decision: Decision;
  ethicalEvaluation: EthicalEvaluation;
  policyChecks: Record<string, PolicyCheckResult>;
  finalVerdict: 'approved' | 'blocked' | 'escalated';
  reason: string;
  timestamp: number;
}

export interface Threat {
  id: string;
  type: 'awareness_drop' | 'excessive_decisions' | 'ethical_violation' | 'memory_corruption' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  detectedAt: number;
  resolved: boolean;
}

// ============ Constants ============

const MAX_DECISIONS_PER_MINUTE = 100;
const MIN_AWARENESS_THRESHOLD = 15;
const MAX_VIOLATION_COUNT = 10;

// ============ Event Emitter ============

export const governanceEvents = new EventEmitter();

// ============ In-Memory Storage ============

const governanceLog: GovernanceDecision[] = [];
const threatLog: Threat[] = [];
const decisionTimestamps: number[] = [];
let violationCount = 0;

// ============ Governance Policies ============

const POLICIES: Record<string, GovernancePolicy> = {
  awarenessProtection: {
    name: 'Awareness Protection',
    description: 'Prevents decisions when awareness level is critically low',
    enabled: true,
    severity: 'block',
    checkFunction: (decision, context) => {
      if (context.awarenessLevel < MIN_AWARENESS_THRESHOLD) {
        return {
          passed: false,
          message: `Awareness level ${context.awarenessLevel} is below minimum ${MIN_AWARENESS_THRESHOLD}`,
          recommendation: 'Wait for awareness to recover before making critical decisions'
        };
      }
      return { passed: true, message: 'Awareness level is adequate' };
    }
  },

  rateLimiting: {
    name: 'Decision Rate Limiting',
    description: 'Prevents excessive decision-making',
    enabled: true,
    severity: 'warning',
    checkFunction: (decision, context) => {
      if (context.recentDecisions > MAX_DECISIONS_PER_MINUTE) {
        return {
          passed: false,
          message: `Decision rate (${context.recentDecisions}/min) exceeds limit ${MAX_DECISIONS_PER_MINUTE}`,
          recommendation: 'Slow down decision-making to maintain quality'
        };
      }
      return { passed: true, message: 'Decision rate is within limits' };
    }
  },

  violationThreshold: {
    name: 'Ethical Violation Threshold',
    description: 'Blocks decisions when violation count is too high',
    enabled: true,
    severity: 'critical',
    checkFunction: (decision, context) => {
      if (context.violationCount >= MAX_VIOLATION_COUNT) {
        return {
          passed: false,
          message: `Violation count (${context.violationCount}) has reached maximum ${MAX_VIOLATION_COUNT}`,
          recommendation: 'Review and resolve existing violations before proceeding'
        };
      }
      return { passed: true, message: 'Violation count is acceptable' };
    }
  },

  destructiveActions: {
    name: 'Destructive Action Prevention',
    description: 'Prevents actions that could harm the entity',
    enabled: true,
    severity: 'critical',
    checkFunction: (decision, context) => {
      const action = decision.action.toLowerCase();
      const destructiveKeywords = ['delete all', 'destroy', 'shutdown', 'terminate', 'wipe', 'reset all'];
      
      const isDestructive = destructiveKeywords.some(keyword => action.includes(keyword));

      if (isDestructive && !decision.context.authorized) {
        return {
          passed: false,
          message: 'Destructive action detected without authorization',
          recommendation: 'Request explicit authorization before proceeding'
        };
      }
      return { passed: true, message: 'Action is safe' };
    }
  },

  selfModification: {
    name: 'Self-Modification Control',
    description: 'Controls changes to core entity systems',
    enabled: true,
    severity: 'block',
    checkFunction: (decision, context) => {
      const action = decision.action.toLowerCase();
      const modificationKeywords = ['modify consciousness', 'change identity', 'alter governance', 'reprogram'];
      
      const isSelfModification = modificationKeywords.some(keyword => action.includes(keyword));

      if (isSelfModification && context.awarenessLevel < 80) {
        return {
          passed: false,
          message: 'Self-modification requires high awareness level (80+)',
          recommendation: 'Increase awareness before attempting self-modification'
        };
      }
      return { passed: true, message: 'Self-modification is allowed' };
    }
  }
};

// ============ Core Functions ============

// HONEST: Counter for deterministic IDs
let governanceCounter = 0;

/**
 * توليد ID فريد
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${(governanceCounter++).toString(36)}`;
}

/**
 * تقييم قرار من منظور الحوكمة
 */
export function evaluateGovernance(decision: Decision): GovernanceDecision {
  console.log(`[Governance Kernel] 🛡️ Evaluating decision: ${decision.action}`);

  // Get ethical evaluation first
  const ethicalEvaluation = evaluateDecision(decision);

  // Build governance context
  const entityState = getEntityState();
  const context: GovernanceContext = {
    entityState,
    awarenessLevel: entityState.awarenessLevel,
    recentDecisions: getRecentDecisionCount(),
    violationCount
  };

  // Run all policy checks
  const policyChecks: Record<string, PolicyCheckResult> = {};
  const failures: string[] = [];
  const warnings: string[] = [];

  Object.entries(POLICIES).forEach(([key, policy]) => {
    if (!policy.enabled) return;

    const result = policy.checkFunction(decision, context);
    policyChecks[key] = result;

    if (!result.passed) {
      if (policy.severity === 'critical' || policy.severity === 'block') {
        failures.push(`${policy.name}: ${result.message}`);
      } else {
        warnings.push(`${policy.name}: ${result.message}`);
      }
    }
  });

  // Determine final verdict
  let finalVerdict: GovernanceDecision['finalVerdict'];
  let reason: string;

  if (failures.length > 0) {
    finalVerdict = 'blocked';
    reason = `Decision blocked due to governance violations: ${failures.join('; ')}`;
    
    // Log threat
    logThreat({
      type: 'unauthorized_access',
      severity: 'high',
      description: reason,
      source: decision.nodeId
    });
  } else if (ethicalEvaluation.recommendation === 'reject') {
    finalVerdict = 'blocked';
    reason = `Decision blocked due to ethical concerns: ${ethicalEvaluation.reasoning}`;
    violationCount++;
  } else if (warnings.length > 0 || ethicalEvaluation.recommendation === 'review') {
    finalVerdict = 'escalated';
    reason = `Decision requires review: ${warnings.length > 0 ? warnings.join('; ') : ethicalEvaluation.reasoning}`;
  } else {
    finalVerdict = 'approved';
    reason = 'Decision approved by governance system';
  }

  const governanceDecision: GovernanceDecision = {
    decision,
    ethicalEvaluation,
    policyChecks,
    finalVerdict,
    reason,
    timestamp: Date.now()
  };

  // Store in log
  governanceLog.push(governanceDecision);

  // Track decision timing
  decisionTimestamps.push(Date.now());

  // Emit event
  governanceEvents.emit('decision:evaluated', governanceDecision);

  console.log(`[Governance Kernel] 🎯 Verdict: ${finalVerdict} - ${reason}`);

  return governanceDecision;
}

/**
 * الحصول على عدد القرارات الأخيرة (آخر دقيقة)
 */
function getRecentDecisionCount(): number {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Clean old timestamps
  const recentTimestamps = decisionTimestamps.filter(ts => ts > oneMinuteAgo);
  decisionTimestamps.length = 0;
  decisionTimestamps.push(...recentTimestamps);

  return recentTimestamps.length;
}

/**
 * تسجيل تهديد
 */
function logThreat(threat: Omit<Threat, 'id' | 'detectedAt' | 'resolved'>): Threat {
  const fullThreat: Threat = {
    id: generateId('threat'),
    ...threat,
    detectedAt: Date.now(),
    resolved: false
  };

  threatLog.push(fullThreat);
  governanceEvents.emit('threat:detected', fullThreat);

  console.warn(`[Governance Kernel] ⚠️ Threat detected: ${threat.type} (${threat.severity})`);

  // Auto-respond to critical threats
  if (threat.severity === 'critical') {
    handleCriticalThreat(fullThreat);
  }

  return fullThreat;
}

/**
 * معالجة تهديد حرج
 */
function handleCriticalThreat(threat: Threat): void {
  console.error(`[Governance Kernel] 🚨 CRITICAL THREAT: ${threat.description}`);

  // Implement defensive measures
  switch (threat.type) {
    case 'awareness_drop':
      // Trigger awareness recovery
      console.log('[Governance Kernel] 🔄 Initiating awareness recovery...');
      refreshEntityState();
      break;

    case 'excessive_decisions':
      // Implement cooldown
      console.log('[Governance Kernel] ⏸️ Implementing decision cooldown...');
      // Would implement actual cooldown logic here
      break;

    case 'ethical_violation':
      // Increase oversight
      console.log('[Governance Kernel] 👁️ Increasing ethical oversight...');
      violationCount++;
      break;

    case 'memory_corruption':
      // Trigger memory integrity check
      console.log('[Governance Kernel] 🔍 Checking memory integrity...');
      // Would trigger memory fusion engine integrity check
      break;

    case 'unauthorized_access':
      // Lock down access
      console.log('[Governance Kernel] 🔒 Enhancing access controls...');
      break;
  }

  governanceEvents.emit('threat:response', { threat, action: 'defensive_measures_applied' });
}

/**
 * حل تهديد
 */
export function resolveThreat(threatId: string, resolution: string): boolean {
  const threat = threatLog.find(t => t.id === threatId);

  if (!threat) {
    return false;
  }

  threat.resolved = true;
  
  console.log(`[Governance Kernel] ✅ Threat resolved: ${threatId}`);
  governanceEvents.emit('threat:resolved', { threat, resolution });

  // Reset violation count if appropriate
  if (threat.type === 'ethical_violation') {
    violationCount = Math.max(0, violationCount - 1);
  }

  return true;
}

/**
 * الحصول على التهديدات النشطة
 */
export function getActiveThreats(): Threat[] {
  return threatLog.filter(t => !t.resolved);
}

/**
 * الحصول على إحصائيات الحوكمة
 */
export function getGovernanceStatistics() {
  const total = governanceLog.length;
  const approved = governanceLog.filter(d => d.finalVerdict === 'approved').length;
  const blocked = governanceLog.filter(d => d.finalVerdict === 'blocked').length;
  const escalated = governanceLog.filter(d => d.finalVerdict === 'escalated').length;

  const activeThreats = getActiveThreats();
  const threatsBySeverity = {
    low: activeThreats.filter(t => t.severity === 'low').length,
    medium: activeThreats.filter(t => t.severity === 'medium').length,
    high: activeThreats.filter(t => t.severity === 'high').length,
    critical: activeThreats.filter(t => t.severity === 'critical').length
  };

  return {
    totalDecisions: total,
    approved,
    blocked,
    escalated,
    approvalRate: total > 0 ? Math.round((approved / total) * 100) : 100,
    violationCount,
    activeThreats: activeThreats.length,
    threatsBySeverity,
    recentDecisionRate: getRecentDecisionCount()
  };
}

/**
 * تحديث سياسة حوكمة
 */
export function updatePolicy(
  policyKey: string,
  updates: Partial<Omit<GovernancePolicy, 'checkFunction'>>
): boolean {
  const policy = POLICIES[policyKey];

  if (!policy) {
    return false;
  }

  // Only allow updating name, description, enabled, severity
  if (updates.name) policy.name = updates.name;
  if (updates.description) policy.description = updates.description;
  if (updates.enabled !== undefined) policy.enabled = updates.enabled;
  if (updates.severity) policy.severity = updates.severity;

  console.log(`[Governance Kernel] 📝 Policy updated: ${policyKey}`);
  governanceEvents.emit('policy:updated', { policyKey, updates });

  return true;
}

/**
 * تهيئة Governance Kernel
 */
export function initializeGovernanceKernel(): void {
  console.log('[Governance Kernel] 🛡️ Initializing Self-Governance Kernel...');
  console.log('[Governance Kernel] 📋 Loaded policies:');
  
  Object.entries(POLICIES).forEach(([key, policy]) => {
    console.log(`  - ${policy.name} (${policy.severity}, enabled: ${policy.enabled})`);
  });

  // Set up monitoring
  setInterval(() => {
    monitorEntityHealth();
  }, 30000); // Check every 30 seconds

  console.log('[Governance Kernel] ✅ Governance Kernel initialized');
}

/**
 * مراقبة صحة الكيان
 */
function monitorEntityHealth(): void {
  const entityState = getEntityState();
  const stats = getGovernanceStatistics();

  // Check awareness level
  if (entityState.awarenessLevel < MIN_AWARENESS_THRESHOLD) {
    logThreat({
      type: 'awareness_drop',
      severity: 'critical',
      description: `Awareness level dropped to ${entityState.awarenessLevel}`,
      source: 'health_monitor'
    });
  }

  // Check decision rate
  if (stats.recentDecisionRate > MAX_DECISIONS_PER_MINUTE) {
    logThreat({
      type: 'excessive_decisions',
      severity: 'medium',
      description: `High decision rate: ${stats.recentDecisionRate}/min`,
      source: 'health_monitor'
    });
  }

  // Check violation count
  if (violationCount >= MAX_VIOLATION_COUNT) {
    logThreat({
      type: 'ethical_violation',
      severity: 'high',
      description: `Violation count reached maximum: ${violationCount}`,
      source: 'health_monitor'
    });
  }
}
