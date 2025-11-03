/**
 * Legal Compliance Engine - Phase 9.9
 * محرك التحقق من الامتثال القانوني
 * 
 * يتحقق من العقود، الاتفاقيات، والبنود القانونية المرتبطة بالقرار
 * يطبق خوارزمية "Clause Mapping" لمطابقة البنود مع نوع القرار
 */

interface LegalRule {
  id: string;
  category: string;
  clause: string;
  applies_to: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

interface ComplianceCheckResult {
  status: 'pass' | 'fail' | 'warning';
  applicable_rules: LegalRule[];
  violations: string[];
  warnings: string[];
  compliance_score: number; // 0.0 - 1.0
  recommendations: string[];
}

export class LegalComplianceEngine {
  private legalRules: LegalRule[];

  constructor() {
    console.log('[LegalComplianceEngine] Initialized');
    this.legalRules = this.loadLegalRules();
  }

  /**
   * تحميل القواعد القانونية
   */
  private loadLegalRules(): LegalRule[] {
    // في الإنتاج، سيتم تحميل القواعد من قاعدة بيانات أو ملفات JSON
    return [
      {
        id: 'legal-001',
        category: 'data-protection',
        clause: 'GDPR Article 6 - Lawful basis for processing',
        applies_to: ['data-sync', 'user-data-transfer', 'database-migration'],
        severity: 'critical',
        description: 'يجب وجود أساس قانوني لمعالجة البيانات الشخصية'
      },
      {
        id: 'legal-002',
        category: 'financial',
        clause: 'SOX Section 404 - Internal Controls',
        applies_to: ['financial-transaction', 'accounting-sync', 'budget-modification'],
        severity: 'critical',
        description: 'يجب وجود ضوابط داخلية للمعاملات المالية'
      },
      {
        id: 'legal-003',
        category: 'system-integrity',
        clause: 'ISO 27001 - Information Security',
        applies_to: ['security-policy', 'access-control', 'encryption-change'],
        severity: 'high',
        description: 'يجب الحفاظ على أمن المعلومات'
      },
      {
        id: 'legal-004',
        category: 'ai-ethics',
        clause: 'EU AI Act - High-Risk AI Systems',
        applies_to: ['ai-decision', 'autonomous-action', 'ml-model-deploy'],
        severity: 'high',
        description: 'أنظمة AI عالية المخاطر تتطلب إشراف بشري'
      },
      {
        id: 'legal-005',
        category: 'contracts',
        clause: 'Service Level Agreement Compliance',
        applies_to: ['service-modification', 'downtime-decision', 'resource-scaling'],
        severity: 'medium',
        description: 'يجب الالتزام باتفاقيات مستوى الخدمة'
      }
    ];
  }

  /**
   * التحقق من الامتثال القانوني لقرار معين
   */
  async checkCompliance(
    decisionType: string,
    decisionPayload: any,
    nodeOrigin: string
  ): Promise<ComplianceCheckResult> {
    console.log(`[LegalCompliance] Checking decision: ${decisionType} from ${nodeOrigin}`);

    // إيجاد القواعد المطبقة
    const applicableRules = this.findApplicableRules(decisionType);
    
    // فحص الانتهاكات
    const violations: string[] = [];
    const warnings: string[] = [];
    
    for (const rule of applicableRules) {
      const violation = this.checkRule(rule, decisionType, decisionPayload);
      
      if (violation) {
        if (rule.severity === 'critical' || rule.severity === 'high') {
          violations.push(`${rule.id}: ${violation}`);
        } else {
          warnings.push(`${rule.id}: ${violation}`);
        }
      }
    }
    
    // حساب درجة الامتثال
    const complianceScore = this.calculateComplianceScore(
      applicableRules.length,
      violations.length,
      warnings.length
    );
    
    // تحديد الحالة
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    
    if (violations.length > 0) {
      status = 'fail';
    } else if (warnings.length > 0) {
      status = 'warning';
    }
    
    // توليد التوصيات
    const recommendations = this.generateRecommendations(
      status,
      violations,
      warnings,
      applicableRules
    );
    
    console.log(`[LegalCompliance] Status: ${status}, Score: ${complianceScore.toFixed(2)}`);
    
    return {
      status,
      applicable_rules: applicableRules,
      violations,
      warnings,
      compliance_score: complianceScore,
      recommendations
    };
  }

  /**
   * إيجاد القواعد القانونية المطبقة على نوع القرار
   */
  private findApplicableRules(decisionType: string): LegalRule[] {
    return this.legalRules.filter(rule => 
      rule.applies_to.some(pattern => 
        decisionType.includes(pattern) || 
        pattern.includes(decisionType.split('-')[0])
      )
    );
  }

  /**
   * فحص قاعدة قانونية محددة
   */
  private checkRule(
    rule: LegalRule,
    decisionType: string,
    payload: any
  ): string | null {
    // خوارزمية "Clause Mapping" - تطبيق بسيط
    
    switch (rule.category) {
      case 'data-protection':
        // التحقق من وجود موافقة أو أساس قانوني
        if (!payload.legal_basis && !payload.user_consent) {
          return 'Missing legal basis or user consent for data processing';
        }
        break;
        
      case 'financial':
        // التحقق من وجود موافقة مالية
        if (payload.amount && payload.amount > 10000 && !payload.cfo_approval) {
          return 'Financial transactions > $10,000 require CFO approval';
        }
        break;
        
      case 'system-integrity':
        // التحقق من سياسة الأمان
        if (decisionType.includes('security') && !payload.security_review) {
          return 'Security changes require security team review';
        }
        break;
        
      case 'ai-ethics':
        // التحقق من الإشراف البشري على AI
        if (payload.autonomous && payload.risk_level === 'high' && !payload.human_oversight) {
          return 'High-risk AI decisions require human oversight';
        }
        break;
        
      case 'contracts':
        // التحقق من SLA
        if (payload.expected_downtime && payload.expected_downtime > 3600) {
          return 'Expected downtime > 1 hour may violate SLA';
        }
        break;
    }
    
    return null;
  }

  /**
   * حساب درجة الامتثال
   */
  private calculateComplianceScore(
    totalRules: number,
    violations: number,
    warnings: number
  ): number {
    if (totalRules === 0) return 1.0;
    
    // معادلة: 100% - (انتهاكات × 40%) - (تحذيرات × 10%)
    const violationPenalty = (violations / totalRules) * 0.4;
    const warningPenalty = (warnings / totalRules) * 0.1;
    
    return Math.max(0, 1.0 - violationPenalty - warningPenalty);
  }

  /**
   * توليد التوصيات
   */
  private generateRecommendations(
    status: string,
    violations: string[],
    warnings: string[],
    applicableRules: LegalRule[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (status === 'fail') {
      recommendations.push('⛔ القرار لا يستوفي المتطلبات القانونية الحرجة');
      recommendations.push('📋 يجب مراجعة القسم القانوني قبل التنفيذ');
      
      if (violations.length > 0) {
        recommendations.push(`🔍 ${violations.length} انتهاكات حرجة تحتاج إلى معالجة`);
      }
    } else if (status === 'warning') {
      recommendations.push('⚠️ القرار يحتوي على تحذيرات قانونية بسيطة');
      recommendations.push('✅ يمكن التنفيذ مع المراقبة');
    } else {
      recommendations.push('✅ القرار متوافق قانونيًا بالكامل');
    }
    
    // إضافة توصيات محددة بناءً على القواعد المطبقة
    const criticalRules = applicableRules.filter(r => r.severity === 'critical');
    if (criticalRules.length > 0) {
      recommendations.push(`⚖️ ${criticalRules.length} قواعد حرجة مطبقة على هذا القرار`);
    }
    
    return recommendations;
  }

  /**
   * إضافة قاعدة قانونية جديدة
   */
  addLegalRule(rule: LegalRule): void {
    this.legalRules.push(rule);
    console.log(`[LegalCompliance] New rule added: ${rule.id}`);
  }

  /**
   * الحصول على جميع القواعد القانونية
   */
  getAllRules(): LegalRule[] {
    return [...this.legalRules];
  }
}

// Export singleton instance
export const legalComplianceEngine = new LegalComplianceEngine();

console.log('[LegalComplianceEngine] Module loaded');
