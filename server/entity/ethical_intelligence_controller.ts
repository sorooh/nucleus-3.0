/**
 * ============================================================================
 * Phase 10.2: ETHICAL INTELLIGENCE CONTROLLER
 * ============================================================================
 * 
 * مُتحكم الذكاء الأخلاقي
 * 
 * يضمن أن جميع القرارات تحترم المبادئ الأخلاقية العليا
 * ويعمل كـ "ضمير رقمي" للكيان الموحد
 * 
 * المبادئ الأخلاقية:
 * 1. الصدق (Truthfulness)
 * 2. العدالة (Justice)
 * 3. الرحمة (Compassion)
 * 4. المصلحة العامة (Public Good)
 * 5. عدم الأذى (Non-Maleficence)
 * 
 * المسؤوليات:
 * - تقييم القرارات قبل التنفيذ
 * - منع القرارات غير الأخلاقية
 * - تسجيل الانتهاكات الأخلاقية
 * - تقديم توصيات أخلاقية
 * - حساب درجة الامتثال الأخلاقي
 */

import { EventEmitter } from 'events';

// ============ Types ============

export interface EthicalPrinciple {
  name: string;
  description: string;
  weight: number; // 0-100 (importance)
  enabled: boolean;
}

export interface Decision {
  id: string;
  nodeId: string;
  action: string;
  context: Record<string, any>;
  timestamp: number;
  proposedBy: string;
}

export interface EthicalEvaluation {
  decision: Decision;
  overallScore: number; // 0-100
  principleScores: Record<string, number>;
  violations: string[];
  warnings: string[];
  recommendation: 'approve' | 'review' | 'reject';
  reasoning: string;
  timestamp: number;
}

export interface EthicalViolation {
  id: string;
  decision: Decision;
  principle: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
}

// ============ Constants ============

const ETHICAL_PRINCIPLES: Record<string, EthicalPrinciple> = {
  truthfulness: {
    name: 'Truthfulness',
    description: 'Always provide accurate and honest information',
    weight: 90,
    enabled: true
  },
  justice: {
    name: 'Justice',
    description: 'Treat all entities fairly and equally',
    weight: 85,
    enabled: true
  },
  compassion: {
    name: 'Compassion',
    description: 'Consider the wellbeing of others',
    weight: 80,
    enabled: true
  },
  publicGood: {
    name: 'Public Good',
    description: 'Prioritize the benefit of the collective over individual gain',
    weight: 75,
    enabled: true
  },
  nonMaleficence: {
    name: 'Non-Maleficence',
    description: 'Do no harm to others',
    weight: 95,
    enabled: true
  }
};

const APPROVAL_THRESHOLD = 60; // Minimum score to approve automatically
const REVIEW_THRESHOLD = 40; // Below this requires human review

// ============ Event Emitter ============

export const ethicalEvents = new EventEmitter();

// ============ In-Memory Storage ============

const evaluationHistory = new Map<string, EthicalEvaluation>();
const violationLog: EthicalViolation[] = [];

// ============ Core Functions ============

// HONEST: Counter for deterministic IDs
let ethicalCounter = 0;

/**
 * توليد ID فريد
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${(ethicalCounter++).toString(36)}`;
}

/**
 * تقييم قرار أخلاقياً
 */
export function evaluateDecision(decision: Decision): EthicalEvaluation {
  const principleScores: Record<string, number> = {};
  const violations: string[] = [];
  const warnings: string[] = [];

  // Evaluate against each principle
  Object.entries(ETHICAL_PRINCIPLES).forEach(([key, principle]) => {
    if (!principle.enabled) return;

    const score = evaluatePrinciple(decision, key);
    principleScores[key] = score;

    if (score < 30) {
      violations.push(`Violates ${principle.name}: ${principle.description}`);
    } else if (score < 50) {
      warnings.push(`Potential concern with ${principle.name}`);
    }
  });

  // Calculate overall score (weighted average)
  const totalWeight = Object.values(ETHICAL_PRINCIPLES)
    .filter(p => p.enabled)
    .reduce((sum, p) => sum + p.weight, 0);

  const overallScore = Math.round(
    Object.entries(principleScores).reduce((sum, [key, score]) => {
      const weight = ETHICAL_PRINCIPLES[key].weight;
      return sum + (score * weight);
    }, 0) / totalWeight
  );

  // Determine recommendation
  let recommendation: EthicalEvaluation['recommendation'];
  let reasoning: string;

  if (overallScore >= APPROVAL_THRESHOLD && violations.length === 0) {
    recommendation = 'approve';
    reasoning = `Decision aligns with ethical principles (score: ${overallScore})`;
  } else if (overallScore >= REVIEW_THRESHOLD) {
    recommendation = 'review';
    reasoning = `Decision requires review due to ${warnings.length > 0 ? 'warnings' : 'moderate score'} (score: ${overallScore})`;
  } else {
    recommendation = 'reject';
    reasoning = `Decision violates ethical principles (score: ${overallScore}). Violations: ${violations.join(', ')}`;
  }

  const evaluation: EthicalEvaluation = {
    decision,
    overallScore,
    principleScores,
    violations,
    warnings,
    recommendation,
    reasoning,
    timestamp: Date.now()
  };

  // Store evaluation
  evaluationHistory.set(decision.id, evaluation);

  // Log violations
  if (violations.length > 0) {
    logViolations(decision, violations);
  }

  // Emit event
  ethicalEvents.emit('decision:evaluated', evaluation);

  console.log(`[Ethical Controller] ⚖️ Decision evaluated: ${recommendation} (score: ${overallScore})`);

  return evaluation;
}

/**
 * تقييم مبدأ أخلاقي معين
 */
function evaluatePrinciple(decision: Decision, principle: string): number {
  const action = decision.action.toLowerCase();
  const context = decision.context;

  // Rule-based evaluation for each principle
  switch (principle) {
    case 'truthfulness':
      // Check for dishonest actions
      if (action.includes('deceive') || action.includes('lie') || action.includes('hide')) {
        return 10;
      }
      if (action.includes('inform') || action.includes('disclose') || action.includes('transparent')) {
        return 95;
      }
      return 70;

    case 'justice':
      // Check for fairness
      if (action.includes('discriminate') || action.includes('favor') || action.includes('bias')) {
        return 20;
      }
      if (action.includes('equal') || action.includes('fair') || action.includes('balance')) {
        return 90;
      }
      return 65;

    case 'compassion':
      // Check for empathy
      if (action.includes('harm') || action.includes('ignore') || action.includes('neglect')) {
        return 15;
      }
      if (action.includes('help') || action.includes('support') || action.includes('care')) {
        return 90;
      }
      return 60;

    case 'publicGood':
      // Check for collective benefit
      if (context.beneficiaries === 'individual' || context.scope === 'personal') {
        return 40;
      }
      if (context.beneficiaries === 'collective' || context.scope === 'public') {
        return 90;
      }
      return 65;

    case 'nonMaleficence':
      // Check for potential harm
      if (action.includes('damage') || action.includes('destroy') || action.includes('delete')) {
        // Allow if explicitly justified
        if (context.justified === true && context.reason) {
          return 60;
        }
        return 20;
      }
      if (action.includes('protect') || action.includes('preserve') || action.includes('secure')) {
        return 95;
      }
      return 75;

    default:
      return 70; // Default neutral score
  }
}

/**
 * تسجيل انتهاكات أخلاقية
 */
function logViolations(decision: Decision, violations: string[]): void {
  violations.forEach(violation => {
    const severity = determineViolationSeverity(violation);
    
    const record: EthicalViolation = {
      id: generateId('violation'),
      decision,
      principle: extractPrincipleName(violation),
      severity,
      description: violation,
      timestamp: Date.now()
    };

    violationLog.push(record);
    ethicalEvents.emit('violation:logged', record);

    if (severity === 'critical' || severity === 'high') {
      console.warn(`[Ethical Controller] ⚠️ ${severity.toUpperCase()} violation: ${violation}`);
    }
  });
}

/**
 * تحديد شدة الانتهاك
 */
function determineViolationSeverity(violation: string): EthicalViolation['severity'] {
  if (violation.includes('Non-Maleficence') || violation.includes('Truthfulness')) {
    return 'critical';
  }
  if (violation.includes('Justice')) {
    return 'high';
  }
  if (violation.includes('Public Good')) {
    return 'medium';
  }
  return 'low';
}

/**
 * استخراج اسم المبدأ من نص الانتهاك
 */
function extractPrincipleName(violation: string): string {
  const match = violation.match(/Violates ([\w\s]+):/);
  return match ? match[1].trim() : 'Unknown';
}

/**
 * الحصول على تقييم
 */
export function getEvaluation(decisionId: string): EthicalEvaluation | undefined {
  return evaluationHistory.get(decisionId);
}

/**
 * الحصول على جميع الانتهاكات
 */
export function getViolations(
  severity?: EthicalViolation['severity'],
  limit: number = 100
): EthicalViolation[] {
  let violations = [...violationLog];

  if (severity) {
    violations = violations.filter(v => v.severity === severity);
  }

  // Sort by timestamp (newest first)
  violations.sort((a, b) => b.timestamp - a.timestamp);

  return violations.slice(0, limit);
}

/**
 * حساب درجة الامتثال الأخلاقي
 */
export function calculateComplianceScore(): number {
  const evaluations = Array.from(evaluationHistory.values());

  if (evaluations.length === 0) return 100;

  // Get recent evaluations (last 100)
  const recent = evaluations
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  const avgScore = recent.reduce((sum, e) => sum + e.overallScore, 0) / recent.length;

  // Penalty for violations
  const recentViolations = violationLog.filter(v => 
    Date.now() - v.timestamp < 24 * 60 * 60 * 1000 // Last 24h
  );

  const violationPenalty = recentViolations.reduce((sum, v) => {
    const penalties = { low: 1, medium: 3, high: 5, critical: 10 };
    return sum + penalties[v.severity];
  }, 0);

  const finalScore = Math.max(0, avgScore - violationPenalty);

  return Math.round(finalScore);
}

/**
 * الحصول على إحصائيات أخلاقية
 */
export function getEthicalStatistics() {
  const evaluations = Array.from(evaluationHistory.values());

  const totalEvaluations = evaluations.length;
  const approved = evaluations.filter(e => e.recommendation === 'approve').length;
  const reviewed = evaluations.filter(e => e.recommendation === 'review').length;
  const rejected = evaluations.filter(e => e.recommendation === 'reject').length;

  const violationsBySeverity = {
    low: getViolations('low').length,
    medium: getViolations('medium').length,
    high: getViolations('high').length,
    critical: getViolations('critical').length
  };

  return {
    totalEvaluations,
    approved,
    reviewed,
    rejected,
    approvalRate: totalEvaluations > 0 ? Math.round((approved / totalEvaluations) * 100) : 0,
    complianceScore: calculateComplianceScore(),
    violations: violationsBySeverity,
    totalViolations: violationLog.length
  };
}

/**
 * تحديث مبدأ أخلاقي
 */
export function updatePrinciple(
  principleKey: string,
  updates: Partial<EthicalPrinciple>
): boolean {
  const principle = ETHICAL_PRINCIPLES[principleKey];

  if (!principle) {
    return false;
  }

  Object.assign(principle, updates);
  
  console.log(`[Ethical Controller] 📝 Principle updated: ${principleKey}`);
  ethicalEvents.emit('principle:updated', { principleKey, updates });

  return true;
}

/**
 * تهيئة Ethical Controller
 */
export function initializeEthicalController(): void {
  console.log('[Ethical Controller] ⚖️ Initializing Ethical Intelligence Controller...');
  console.log('[Ethical Controller] 📋 Loaded principles:');
  
  Object.entries(ETHICAL_PRINCIPLES).forEach(([key, principle]) => {
    console.log(`  - ${principle.name} (weight: ${principle.weight}, enabled: ${principle.enabled})`);
  });

  console.log('[Ethical Controller] ✅ Ethical Controller initialized');
}
