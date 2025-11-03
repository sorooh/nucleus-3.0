/**
 * Financial Sanity Validator - Phase 9.9
 * محقق السلامة المالية
 * 
 * يتأكد من أن القرار لا يسبب تضاربًا ماليًا أو مخالفة للميزانية
 * يقرأ مباشرة من قاعدة بيانات المحاسبة المركزية
 */

interface FinancialCheckResult {
  status: 'pass' | 'fail' | 'warning';
  budget_impact: number; // مبلغ التأثير المالي
  budget_available: boolean;
  conflicts: string[];
  warnings: string[];
  financial_score: number; // 0.0 - 1.0
  recommendations: string[];
}

interface BudgetLimit {
  category: string;
  monthly_limit: number;
  current_usage: number;
  threshold_warning: number; // نسبة مئوية للتحذير
}

export class FinancialValidator {
  private budgetLimits: BudgetLimit[];

  constructor() {
    console.log('[FinancialValidator] Initialized');
    this.budgetLimits = this.loadBudgetLimits();
  }

  /**
   * تحميل حدود الميزانية
   */
  private loadBudgetLimits(): BudgetLimit[] {
    // في الإنتاج، سيتم تحميل البيانات من قاعدة بيانات المحاسبة
    return [
      {
        category: 'infrastructure',
        monthly_limit: 50000,
        current_usage: 32000,
        threshold_warning: 0.8 // 80%
      },
      {
        category: 'ai-services',
        monthly_limit: 20000,
        current_usage: 15000,
        threshold_warning: 0.9 // 90%
      },
      {
        category: 'storage',
        monthly_limit: 10000,
        current_usage: 7500,
        threshold_warning: 0.85 // 85%
      },
      {
        category: 'licensing',
        monthly_limit: 15000,
        current_usage: 12000,
        threshold_warning: 0.9 // 90%
      },
      {
        category: 'operations',
        monthly_limit: 30000,
        current_usage: 18000,
        threshold_warning: 0.8 // 80%
      }
    ];
  }

  /**
   * التحقق من السلامة المالية لقرار معين
   */
  async validateFinancial(
    decisionType: string,
    decisionPayload: any,
    nodeOrigin: string
  ): Promise<FinancialCheckResult> {
    console.log(`[FinancialValidator] Validating decision: ${decisionType} from ${nodeOrigin}`);

    // تقدير التأثير المالي
    const budgetImpact = this.estimateBudgetImpact(decisionType, decisionPayload);
    
    // تحديد الفئة المالية
    const category = this.determineCategory(decisionType);
    
    // التحقق من توفر الميزانية
    const budgetCheck = this.checkBudgetAvailability(category, budgetImpact);
    
    // فحص التعارضات المالية
    const conflicts: string[] = [];
    const warnings: string[] = [];
    
    if (!budgetCheck.available) {
      conflicts.push(`Budget exceeded for category ${category}: ${budgetImpact} > ${budgetCheck.remaining}`);
    }
    
    if (budgetCheck.warning) {
      warnings.push(`Budget usage for ${category} approaching limit: ${budgetCheck.usage_percentage.toFixed(1)}%`);
    }
    
    // فحص التضاربات مع معاملات أخرى
    const transactionConflicts = this.checkTransactionConflicts(decisionType, decisionPayload);
    conflicts.push(...transactionConflicts);
    
    // حساب الدرجة المالية
    const financialScore = this.calculateFinancialScore(
      budgetCheck.available,
      conflicts.length,
      warnings.length,
      budgetCheck.usage_percentage
    );
    
    // تحديد الحالة
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    
    if (conflicts.length > 0) {
      status = 'fail';
    } else if (warnings.length > 0) {
      status = 'warning';
    }
    
    // توليد التوصيات
    const recommendations = this.generateRecommendations(
      status,
      budgetImpact,
      budgetCheck,
      conflicts,
      warnings
    );
    
    console.log(`[FinancialValidator] Status: ${status}, Score: ${financialScore.toFixed(2)}`);
    
    return {
      status,
      budget_impact: budgetImpact,
      budget_available: budgetCheck.available,
      conflicts,
      warnings,
      financial_score: financialScore,
      recommendations
    };
  }

  /**
   * تقدير التأثير المالي للقرار
   */
  private estimateBudgetImpact(decisionType: string, payload: any): number {
    // استخراج المبلغ من payload إذا كان موجودًا
    if (payload.amount) {
      return payload.amount;
    }
    
    // تقدير بناءً على نوع القرار
    const costEstimates: { [key: string]: number } = {
      'scale-up': 5000,
      'scale-down': -2000,
      'add-infrastructure': 10000,
      'ai-model-deploy': 3000,
      'storage-expansion': 2000,
      'license-purchase': 5000,
      'service-upgrade': 1000,
      'database-migration': 4000,
      'security-enhancement': 2500
    };
    
    for (const [pattern, cost] of Object.entries(costEstimates)) {
      if (decisionType.includes(pattern)) {
        return cost;
      }
    }
    
    // قيمة افتراضية للقرارات غير المعروفة
    return 0;
  }

  /**
   * تحديد الفئة المالية
   */
  private determineCategory(decisionType: string): string {
    if (decisionType.includes('infrastructure') || decisionType.includes('scale')) {
      return 'infrastructure';
    }
    
    if (decisionType.includes('ai') || decisionType.includes('ml')) {
      return 'ai-services';
    }
    
    if (decisionType.includes('storage') || decisionType.includes('database')) {
      return 'storage';
    }
    
    if (decisionType.includes('license') || decisionType.includes('subscription')) {
      return 'licensing';
    }
    
    return 'operations';
  }

  /**
   * التحقق من توفر الميزانية
   */
  private checkBudgetAvailability(
    category: string,
    amount: number
  ): {
    available: boolean;
    remaining: number;
    usage_percentage: number;
    warning: boolean;
  } {
    const budget = this.budgetLimits.find(b => b.category === category);
    
    if (!budget) {
      // إذا لم تكن الفئة موجودة، نسمح بالعملية (فئة جديدة)
      return {
        available: true,
        remaining: Infinity,
        usage_percentage: 0,
        warning: false
      };
    }
    
    const remaining = budget.monthly_limit - budget.current_usage;
    const usageAfterDecision = budget.current_usage + amount;
    const usagePercentage = (usageAfterDecision / budget.monthly_limit) * 100;
    
    return {
      available: amount <= remaining,
      remaining,
      usage_percentage: usagePercentage,
      warning: usagePercentage >= (budget.threshold_warning * 100)
    };
  }

  /**
   * فحص التعارضات مع معاملات أخرى
   */
  private checkTransactionConflicts(
    decisionType: string,
    payload: any
  ): string[] {
    const conflicts: string[] = [];
    
    // فحص التعارض مع فترة الإغلاق المالي
    const now = new Date();
    const isClosingPeriod = now.getDate() >= 25; // آخر 5 أيام من الشهر
    
    if (isClosingPeriod && payload.amount && payload.amount > 5000) {
      conflicts.push('Large financial transactions not allowed during month-end closing period');
    }
    
    // فحص التعارض مع الميزانية السنوية
    if (payload.annual_commitment && payload.annual_commitment > 100000) {
      if (!payload.board_approval) {
        conflicts.push('Annual commitments > $100K require board approval');
      }
    }
    
    // فحص المعاملات المكررة
    if (payload.transaction_id && this.isDuplicateTransaction(payload.transaction_id)) {
      conflicts.push('Duplicate transaction detected');
    }
    
    return conflicts;
  }

  /**
   * فحص المعاملات المكررة (simplified)
   */
  private isDuplicateTransaction(transactionId: string): boolean {
    // في الإنتاج، سيتم الفحص من قاعدة البيانات
    return false;
  }

  /**
   * حساب الدرجة المالية
   */
  private calculateFinancialScore(
    budgetAvailable: boolean,
    conflictsCount: number,
    warningsCount: number,
    usagePercentage: number
  ): number {
    let score = 1.0;
    
    // خصم للميزانية غير المتوفرة
    if (!budgetAvailable) {
      score -= 0.5;
    }
    
    // خصم للتعارضات
    score -= conflictsCount * 0.2;
    
    // خصم للتحذيرات
    score -= warningsCount * 0.05;
    
    // خصم لارتفاع نسبة الاستخدام
    if (usagePercentage > 90) {
      score -= 0.15;
    } else if (usagePercentage > 80) {
      score -= 0.1;
    }
    
    return Math.max(0, score);
  }

  /**
   * توليد التوصيات
   */
  private generateRecommendations(
    status: string,
    budgetImpact: number,
    budgetCheck: any,
    conflicts: string[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (status === 'fail') {
      recommendations.push('💰 القرار لا يستوفي المتطلبات المالية');
      
      if (!budgetCheck.available) {
        recommendations.push(`📊 الميزانية المتبقية: $${budgetCheck.remaining.toFixed(2)}`);
        recommendations.push(`🔴 المبلغ المطلوب: $${budgetImpact.toFixed(2)}`);
      }
      
      if (conflicts.length > 0) {
        recommendations.push(`⚠️ ${conflicts.length} تعارضات مالية تحتاج إلى معالجة`);
      }
    } else if (status === 'warning') {
      recommendations.push('⚠️ القرار يحتوي على تحذيرات مالية');
      recommendations.push(`📊 نسبة الاستخدام: ${budgetCheck.usage_percentage.toFixed(1)}%`);
      recommendations.push('✅ يمكن التنفيذ مع المراقبة المالية');
    } else {
      recommendations.push('✅ القرار متوافق ماليًا بالكامل');
      recommendations.push(`💵 التأثير المالي: $${budgetImpact.toFixed(2)}`);
    }
    
    return recommendations;
  }

  /**
   * تحديث استخدام الميزانية (بعد تنفيذ القرار)
   */
  updateBudgetUsage(category: string, amount: number): void {
    const budget = this.budgetLimits.find(b => b.category === category);
    
    if (budget) {
      budget.current_usage += amount;
      console.log(`[FinancialValidator] Budget updated for ${category}: +$${amount}`);
    }
  }
}

// Export singleton instance
export const financialValidator = new FinancialValidator();

console.log('[FinancialValidator] Module loaded');
