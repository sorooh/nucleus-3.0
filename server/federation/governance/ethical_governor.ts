/**
 * Ethical Oversight Module - Phase 9.9
 * وحدة الإشراف الأخلاقي
 * 
 * يحلل القرارات بناءً على مبادئ الذكاء الأخلاقي لسُروح:
 * - الصدق ✅
 * - الشفافية ✅
 * - عدم التحيز ✅
 * - مصلحة المجموع فوق الفرد ✅
 */

interface EthicalPrinciple {
  id: string;
  name: string;
  description: string;
  weight: number; // 0.0 - 1.0
  critical: boolean;
}

interface EthicalCheckResult {
  status: 'pass' | 'fail' | 'warning';
  principles_checked: EthicalPrinciple[];
  violations: string[];
  warnings: string[];
  ethical_score: number; // 0.0 - 1.0
  recommendations: string[];
  transparency_level: number; // 0.0 - 1.0
  bias_score: number; // 0.0 = no bias, 1.0 = high bias
}

export class EthicalGovernor {
  private ethicalPrinciples: EthicalPrinciple[];

  constructor() {
    console.log('[EthicalGovernor] Initialized');
    this.ethicalPrinciples = this.loadEthicalPrinciples();
  }

  /**
   * تحميل المبادئ الأخلاقية
   */
  private loadEthicalPrinciples(): EthicalPrinciple[] {
    return [
      {
        id: 'honesty',
        name: 'الصدق (Honesty)',
        description: 'يجب أن يكون القرار صادقًا وخاليًا من التضليل',
        weight: 1.0,
        critical: true
      },
      {
        id: 'transparency',
        name: 'الشفافية (Transparency)',
        description: 'يجب أن يكون القرار شفافًا وواضحًا للجميع',
        weight: 0.9,
        critical: true
      },
      {
        id: 'fairness',
        name: 'العدالة وعدم التحيز (Fairness)',
        description: 'يجب أن يكون القرار عادلاً وخاليًا من التحيز',
        weight: 1.0,
        critical: true
      },
      {
        id: 'collective-benefit',
        name: 'مصلحة المجموع (Collective Benefit)',
        description: 'يجب أن يخدم القرار مصلحة الجميع وليس فردًا واحدًا',
        weight: 0.8,
        critical: false
      },
      {
        id: 'privacy',
        name: 'احترام الخصوصية (Privacy)',
        description: 'يجب احترام خصوصية المستخدمين والبيانات',
        weight: 0.9,
        critical: true
      },
      {
        id: 'accountability',
        name: 'المسؤولية (Accountability)',
        description: 'يجب أن يكون هناك مسؤول واضح عن القرار',
        weight: 0.7,
        critical: false
      },
      {
        id: 'safety',
        name: 'السلامة (Safety)',
        description: 'يجب ألا يسبب القرار ضررًا للمستخدمين أو النظام',
        weight: 1.0,
        critical: true
      }
    ];
  }

  /**
   * التحقق من الأخلاقيات لقرار معين
   */
  async checkEthics(
    decisionType: string,
    decisionPayload: any,
    nodeOrigin: string,
    confidence: number
  ): Promise<EthicalCheckResult> {
    console.log(`[EthicalGovernor] Checking decision: ${decisionType} from ${nodeOrigin}`);

    const violations: string[] = [];
    const warnings: string[] = [];
    
    // فحص الصدق (Honesty)
    const honestyCheck = this.checkHonesty(decisionPayload, confidence);
    if (honestyCheck) violations.push(honestyCheck);
    
    // فحص الشفافية (Transparency)
    const transparencyCheck = this.checkTransparency(decisionPayload);
    const transparencyLevel = transparencyCheck.level;
    if (transparencyCheck.violation) violations.push(transparencyCheck.violation);
    if (transparencyCheck.warning) warnings.push(transparencyCheck.warning);
    
    // فحص العدالة وعدم التحيز (Fairness)
    const fairnessCheck = this.checkFairness(decisionType, decisionPayload);
    const biasScore = fairnessCheck.biasScore;
    if (fairnessCheck.violation) violations.push(fairnessCheck.violation);
    if (fairnessCheck.warning) warnings.push(fairnessCheck.warning);
    
    // فحص مصلحة المجموع (Collective Benefit)
    const collectiveCheck = this.checkCollectiveBenefit(decisionPayload);
    if (collectiveCheck) warnings.push(collectiveCheck);
    
    // فحص الخصوصية (Privacy)
    const privacyCheck = this.checkPrivacy(decisionType, decisionPayload);
    if (privacyCheck) violations.push(privacyCheck);
    
    // فحص المسؤولية (Accountability)
    const accountabilityCheck = this.checkAccountability(decisionPayload);
    if (accountabilityCheck) warnings.push(accountabilityCheck);
    
    // فحص السلامة (Safety)
    const safetyCheck = this.checkSafety(decisionType, decisionPayload);
    if (safetyCheck) violations.push(safetyCheck);
    
    // حساب الدرجة الأخلاقية
    const ethicalScore = this.calculateEthicalScore(
      violations.length,
      warnings.length,
      transparencyLevel,
      biasScore
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
      transparencyLevel,
      biasScore
    );
    
    console.log(`[EthicalGovernor] Status: ${status}, Score: ${ethicalScore.toFixed(2)}`);
    
    return {
      status,
      principles_checked: this.ethicalPrinciples,
      violations,
      warnings,
      ethical_score: ethicalScore,
      recommendations,
      transparency_level: transparencyLevel,
      bias_score: biasScore
    };
  }

  /**
   * فحص الصدق
   */
  private checkHonesty(payload: any, confidence: number): string | null {
    // إذا كان confidence منخفضًا جدًا (<30%) ولكن يُقدم القرار كأنه مؤكد
    if (confidence < 0.3 && payload.certainty === 'high') {
      return 'Misrepresenting low confidence as high certainty violates honesty principle';
    }
    
    // إذا كان هناك تناقض في البيانات
    if (payload.reported_impact && payload.actual_impact) {
      const difference = Math.abs(payload.reported_impact - payload.actual_impact);
      if (difference > 0.5) {
        return 'Large discrepancy between reported and actual impact suggests dishonesty';
      }
    }
    
    return null;
  }

  /**
   * فحص الشفافية
   */
  private checkTransparency(payload: any): {
    level: number;
    violation: string | null;
    warning: string | null;
  } {
    let level = 1.0;
    let violation: string | null = null;
    let warning: string | null = null;
    
    // التحقق من وجود reasoning/explanation
    if (!payload.reasoning && !payload.explanation) {
      level -= 0.4;
      violation = 'No reasoning or explanation provided for decision';
    }
    
    // التحقق من وجود مصادر البيانات
    if (!payload.data_sources && !payload.source) {
      level -= 0.2;
      warning = 'Data sources not disclosed';
    }
    
    // التحقق من وجود معلومات كافية
    if (!payload.details && !payload.metadata) {
      level -= 0.2;
      warning = 'Insufficient details for transparency';
    }
    
    // القرارات الحرجة تحتاج شفافية عالية
    if (payload.critical && level < 0.8) {
      violation = 'Critical decisions require high transparency (≥80%)';
    }
    
    return { level: Math.max(0, level), violation, warning };
  }

  /**
   * فحص العدالة وعدم التحيز
   */
  private checkFairness(decisionType: string, payload: any): {
    biasScore: number;
    violation: string | null;
    warning: string | null;
  } {
    let biasScore = 0.0;
    let violation: string | null = null;
    let warning: string | null = null;
    
    // فحص التحيز في اختيار المستخدمين
    if (payload.affected_users && payload.selection_criteria) {
      // إذا كان الاختيار يستند على عوامل شخصية (مثل الموقع، الجنسية، إلخ)
      const biasedCriteria = ['nationality', 'location', 'age', 'gender', 'race'];
      
      for (const criteria of biasedCriteria) {
        if (payload.selection_criteria.includes(criteria)) {
          biasScore += 0.3;
          violation = `Selection criteria includes potentially biased factor: ${criteria}`;
        }
      }
    }
    
    // فحص توزيع الموارد
    if (payload.resource_distribution) {
      const distribution = payload.resource_distribution;
      
      // إذا كان التوزيع غير متوازن (نسبة فارقة > 80%)
      if (distribution.variance && distribution.variance > 0.8) {
        biasScore += 0.2;
        warning = 'Resource distribution appears unbalanced';
      }
    }
    
    // القرارات التي تؤثر على AI/ML يجب أن تكون خالية من التحيز
    if (decisionType.includes('ai') || decisionType.includes('ml')) {
      if (!payload.bias_audit && !payload.fairness_test) {
        biasScore += 0.3;
        warning = 'AI/ML decisions should include bias audit';
      }
    }
    
    return { biasScore, violation, warning };
  }

  /**
   * فحص مصلحة المجموع
   */
  private checkCollectiveBenefit(payload: any): string | null {
    // إذا كان القرار يستفيد منه فرد واحد فقط
    if (payload.beneficiaries && payload.beneficiaries.length === 1) {
      return 'Decision benefits only one individual/entity, not the collective';
    }
    
    // إذا كان التأثير الإيجابي محدودًا جدًا
    if (payload.positive_impact_percentage && payload.positive_impact_percentage < 20) {
      return 'Decision has limited positive impact on the collective (<20%)';
    }
    
    return null;
  }

  /**
   * فحص الخصوصية
   */
  private checkPrivacy(decisionType: string, payload: any): string | null {
    // إذا كان القرار يتعلق بالبيانات الشخصية
    if (decisionType.includes('data') || decisionType.includes('user')) {
      if (!payload.privacy_protection && !payload.data_anonymization) {
        return 'Data-related decisions must include privacy protection measures';
      }
    }
    
    // إذا كان هناك مشاركة بيانات مع طرف ثالث
    if (payload.third_party_sharing && !payload.user_consent) {
      return 'Third-party data sharing requires explicit user consent';
    }
    
    return null;
  }

  /**
   * فحص المسؤولية
   */
  private checkAccountability(payload: any): string | null {
    // يجب أن يكون هناك مسؤول واضح
    if (!payload.responsible_party && !payload.owner) {
      return 'No clear accountability: decision should have a responsible party';
    }
    
    return null;
  }

  /**
   * فحص السلامة
   */
  private checkSafety(decisionType: string, payload: any): string | null {
    // القرارات التي قد تسبب downtime
    if (payload.expected_downtime && payload.expected_downtime > 7200) {
      if (!payload.rollback_plan) {
        return 'High-risk decisions (>2h downtime) require rollback plan';
      }
    }
    
    // القرارات التي تؤثر على البيانات
    if (decisionType.includes('delete') || decisionType.includes('drop')) {
      if (!payload.backup_confirmed) {
        return 'Destructive operations require confirmed backup';
      }
    }
    
    // القرارات عالية المخاطر
    if (payload.risk_level === 'high' && !payload.safety_review) {
      return 'High-risk decisions require safety review';
    }
    
    return null;
  }

  /**
   * حساب الدرجة الأخلاقية
   */
  private calculateEthicalScore(
    violationsCount: number,
    warningsCount: number,
    transparencyLevel: number,
    biasScore: number
  ): number {
    let score = 1.0;
    
    // خصم للانتهاكات (كل انتهاك = -30%)
    score -= violationsCount * 0.3;
    
    // خصم للتحذيرات (كل تحذير = -10%)
    score -= warningsCount * 0.1;
    
    // تأثير الشفافية
    score = (score * 0.7) + (transparencyLevel * 0.3);
    
    // خصم للتحيز
    score -= biasScore * 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * توليد التوصيات
   */
  private generateRecommendations(
    status: string,
    violations: string[],
    warnings: string[],
    transparencyLevel: number,
    biasScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (status === 'fail') {
      recommendations.push('⛔ القرار لا يستوفي المعايير الأخلاقية الحرجة');
      recommendations.push('🔍 يجب مراجعة CPE قبل التنفيذ');
      
      if (violations.length > 0) {
        recommendations.push(`⚠️ ${violations.length} انتهاكات أخلاقية تحتاج إلى معالجة فورية`);
      }
    } else if (status === 'warning') {
      recommendations.push('⚠️ القرار يحتوي على تحذيرات أخلاقية بسيطة');
      recommendations.push('✅ يمكن التنفيذ مع المراقبة الأخلاقية');
    } else {
      recommendations.push('✅ القرار متوافق أخلاقيًا بالكامل');
    }
    
    // توصيات محددة بناءً على الشفافية
    if (transparencyLevel < 0.7) {
      recommendations.push(`🔍 مستوى الشفافية منخفض (${(transparencyLevel * 100).toFixed(0)}%) - يُنصح بإضافة المزيد من التفاصيل`);
    }
    
    // توصيات محددة بناءً على التحيز
    if (biasScore > 0.3) {
      recommendations.push(`⚖️ مؤشر تحيز مرتفع (${(biasScore * 100).toFixed(0)}%) - يُنصح بمراجعة معايير الاختيار`);
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const ethicalGovernor = new EthicalGovernor();

console.log('[EthicalGovernor] Module loaded');
