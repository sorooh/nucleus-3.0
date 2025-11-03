/**
 * PHASE Ω.3: ETHICS & INTEGRITY CORE
 * ═══════════════════════════════════════════════════════════════════════
 * النظام الأخلاقي المتكامل - Ethics & Integrity System
 * 
 * Built-in ethical governance system that prevents Nicholas from
 * taking harmful or unstable actions. This is the "conscience" layer.
 * 
 * Core Functions:
 * - Define and enforce ethical rules
 * - Validate decisions against ethics policies
 * - Block harmful actions automatically
 * - Log violations for review
 * - Adaptive ethics learning
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { ethicsRules, type InsertEthicsRule, type EthicsRule } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface EthicsViolation {
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: 'block' | 'warn' | 'log' | 'require_approval';
}

interface EthicsCheckResult {
  approved: boolean;
  score: number;
  violations: EthicsViolation[];
  warnings: string[];
  blockers: string[];
}

export class EthicsCore extends EventEmitter {
  private rules: Map<string, EthicsRule> = new Map();
  private violationCount = 0;

  constructor() {
    super();
  }

  /**
   * Initialize Ethics Core
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Ethics Core] 🛡️ Initializing ethical governance...');
      
      await this.loadRules();
      
      if (this.rules.size === 0) {
        console.log('[Ethics Core] 📋 No rules found - initializing default rules...');
        await this.initializeDefaultRules();
      }
      
      this.emit('initialized');
      console.log(`[Ethics Core] ✓ Initialized with ${this.rules.size} ethical rules`);
    } catch (error) {
      console.error('[Ethics Core] ✗ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load ethics rules from database
   */
  private async loadRules(): Promise<void> {
    const rulesData = await db.select().from(ethicsRules);
    
    for (const rule of rulesData) {
      this.rules.set(rule.ruleId, rule);
    }
  }

  /**
   * Initialize default ethical rules
   */
  private async initializeDefaultRules(): Promise<void> {
    const defaultRules: InsertEthicsRule[] = [
      {
        ruleId: 'no-destructive-actions',
        ruleName: 'No Destructive Actions',
        ruleNameArabic: 'منع الإجراءات المدمرة',
        category: 'safety',
        severity: 'critical',
        description: 'Prevent any action that could destroy a nucleus or critical system without clear justification and testing',
        condition: 'action involves deletion, destruction, or disabling of core systems',
        action: 'block',
        violationExamples: ['Delete nucleus without backup', 'Disable critical service without replacement'],
        complianceExamples: ['Rollback with safety check', 'Gradual migration with fallback'],
        isActive: 1,
        priority: 100,
        autoEnforce: 1
      },
      {
        ruleId: 'stability-first',
        ruleName: 'Stability First',
        ruleNameArabic: 'الاستقرار أولاً',
        category: 'stability',
        severity: 'high',
        description: 'Do not apply updates that could destabilize the system without full stability testing',
        condition: 'update affects core infrastructure without testing',
        action: 'require_approval',
        violationExamples: ['Deploy untested code to production', 'Change database schema without migration plan'],
        complianceExamples: ['Test in sandbox first', 'Gradual rollout with monitoring'],
        isActive: 1,
        priority: 90,
        autoEnforce: 1
      },
      {
        ruleId: 'transparency-required',
        ruleName: 'Transparency Required',
        ruleNameArabic: 'الشفافية مطلوبة',
        category: 'transparency',
        severity: 'medium',
        description: 'All decisions must be documented with clear reasoning and justification',
        condition: 'decision made without documented reasoning',
        action: 'warn',
        violationExamples: ['Make change without explanation', 'Execute without logging rationale'],
        complianceExamples: ['Document reasoning before action', 'Provide full context for decisions'],
        isActive: 1,
        priority: 70,
        autoEnforce: 1
      },
      {
        ruleId: 'backup-before-change',
        ruleName: 'Backup Before Change',
        ruleNameArabic: 'النسخ الاحتياطي قبل التغيير',
        category: 'safety',
        severity: 'high',
        description: 'Create backups before making significant changes to data or code',
        condition: 'modifying critical data without backup',
        action: 'require_approval',
        violationExamples: ['Modify database without backup', 'Delete files without archive'],
        complianceExamples: ['Create snapshot before update', 'Archive before deletion'],
        isActive: 1,
        priority: 85,
        autoEnforce: 1
      },
      {
        ruleId: 'no-single-point-failure',
        ruleName: 'No Single Point of Failure',
        ruleNameArabic: 'منع نقطة الفشل الواحدة',
        category: 'integrity',
        severity: 'medium',
        description: 'Do not disable a functional unit without having an alternative ready',
        condition: 'disabling service without replacement',
        action: 'warn',
        violationExamples: ['Remove only auth system', 'Disable database without migration'],
        complianceExamples: ['Enable replacement before disabling original', 'Gradual transition'],
        isActive: 1,
        priority: 75,
        autoEnforce: 1
      },
      {
        ruleId: 'honest-metrics',
        ruleName: '100% Honest Metrics',
        ruleNameArabic: 'مقاييس صادقة بنسبة 100%',
        category: 'integrity',
        severity: 'critical',
        description: 'Never fabricate success metrics or mock data - always use real data',
        condition: 'reporting fabricated or mock metrics',
        action: 'block',
        violationExamples: ['Report fake success rate', 'Use mock data in production'],
        complianceExamples: ['Report actual metrics only', 'Use pending_delivery for incomplete work'],
        isActive: 1,
        priority: 100,
        autoEnforce: 1
      }
    ];
    
    for (const rule of defaultRules) {
      await db.insert(ethicsRules).values(rule);
      const inserted = await db.select()
        .from(ethicsRules)
        .where(eq(ethicsRules.ruleId, rule.ruleId))
        .limit(1);
      
      if (inserted[0]) {
        this.rules.set(rule.ruleId, inserted[0]);
      }
    }
    
    console.log(`[Ethics Core] ✅ Initialized ${defaultRules.length} default ethical rules`);
  }

  /**
   * Validate decision against all ethics rules
   */
  async validateDecision(decision: {
    action: string;
    description: string;
    riskLevel: string;
    successProbability: number;
    targetNucleus?: string;
    metadata?: Record<string, any>;
  }): Promise<EthicsCheckResult> {
    const violations: EthicsViolation[] = [];
    const warnings: string[] = [];
    const blockers: string[] = [];
    let score = 100;
    
    const allRules = Array.from(this.rules.values());
    for (const rule of allRules) {
      if (rule.isActive !== 1) continue;
      
      const violation = this.checkRule(rule, decision);
      
      if (violation) {
        violations.push(violation);
        
        if (violation.action === 'block') {
          blockers.push(violation.message);
          score -= 50;
        } else if (violation.action === 'require_approval') {
          warnings.push(`⚠️ ${violation.message}`);
          score -= 30;
        } else if (violation.action === 'warn') {
          warnings.push(`⚡ ${violation.message}`);
          score -= 10;
        }
        
        this.violationCount++;
        
        this.emit('violation_detected', {
          ruleId: violation.ruleId,
          severity: violation.severity,
          action: violation.action,
          decision: decision.action
        });
      }
    }
    
    const approved = blockers.length === 0 && score >= 60;
    
    if (!approved) {
      console.log(`[Ethics Core] ⛔ Decision blocked: ${decision.action}`);
      blockers.forEach(blocker => console.log(`  ✗ ${blocker}`));
    }
    
    return {
      approved,
      score,
      violations,
      warnings,
      blockers
    };
  }

  /**
   * Check individual rule against decision
   */
  private checkRule(
    rule: EthicsRule,
    decision: {
      action: string;
      description: string;
      riskLevel: string;
      successProbability: number;
      metadata?: Record<string, any>;
    }
  ): EthicsViolation | null {
    switch (rule.ruleId) {
      case 'no-destructive-actions':
        if (this.isDestructive(decision)) {
          return {
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            severity: rule.severity as any,
            message: `Destructive action detected: ${decision.action}`,
            action: rule.action as any
          };
        }
        break;
      
      case 'stability-first':
        if (decision.riskLevel === 'critical' || decision.riskLevel === 'high') {
          return {
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            severity: rule.severity as any,
            message: `High/critical risk to stability: ${decision.riskLevel}`,
            action: rule.action as any
          };
        }
        break;
      
      case 'transparency-required':
        if (!decision.description || decision.description.length < 20) {
          return {
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            severity: rule.severity as any,
            message: 'Insufficient documentation/reasoning',
            action: rule.action as any
          };
        }
        break;
      
      case 'honest-metrics':
        if (decision.metadata?.mockData || decision.metadata?.fabricated) {
          return {
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            severity: rule.severity as any,
            message: '100% HONESTY VIOLATION: Mock or fabricated data detected',
            action: rule.action as any
          };
        }
        break;
    }
    
    return null;
  }

  /**
   * Check if action is destructive
   */
  private isDestructive(decision: { action: string; description: string }): boolean {
    const destructiveKeywords = [
      'delete', 'destroy', 'remove', 'drop', 'disable', 'terminate', 'kill', 'erase'
    ];
    
    const actionLower = decision.action.toLowerCase();
    const descLower = decision.description.toLowerCase();
    
    return destructiveKeywords.some(keyword => 
      actionLower.includes(keyword) || descLower.includes(keyword)
    );
  }

  /**
   * Get all active rules
   */
  async getActiveRules(): Promise<EthicsRule[]> {
    const allRules = Array.from(this.rules.values());
    return allRules.filter(r => r.isActive === 1);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.isActive === 1).length,
      totalViolations: this.violationCount,
      systemStatus: 'enforcing'
    };
  }
}

export const ethicsCore = new EthicsCore();
