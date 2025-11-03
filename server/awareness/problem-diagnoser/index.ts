/**
 * Problem Diagnoser - محرك التشخيص الذكي
 * Phase 3.2 → 5.0: Conscious Awareness Layer
 * 
 * يكتشف المشاكل ويحدد أولوياتها ويقترح الحلول
 */

import { EventEmitter } from 'events';

interface DetectedIssue {
  id: string;
  category: 'performance' | 'integration' | 'data' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  nucleusId: string;
  description: string;
  detectedAt: Date;
  suggestedSolutions?: string[];
}

interface ProposedSolution {
  issueId: string;
  solution: string;
  priority: number;
  estimatedImpact: string;
  implementationSteps?: string[];
}

interface DiagnosticReport {
  totalIssues: number;
  issuesByCategory: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  topIssues: DetectedIssue[];
  proposedSolutions: ProposedSolution[];
}

export class ProblemDiagnoser extends EventEmitter {
  private issues: DetectedIssue[] = [];
  private solutions: ProposedSolution[] = [];
  private isActive: boolean = false;

  constructor() {
    super();
    console.log('🩺 [ProblemDiagnoser] Initializing diagnostic engine...');
  }

  /**
   * تفعيل محرك التشخيص الذكي
   */
  async activateDiagnosticEngine(): Promise<void> {
    console.log('🩺 [ProblemDiagnoser] Activating diagnostic engine...');
    this.isActive = true;

    try {
      // إعادة تعيين المشاكل القديمة لتجنب التكرار
      this.issues = [];
      this.solutions = [];
      
      // كشف مشاكل الأداء
      await this.detectPerformanceIssues();
      
      // كشف مشاكل التكامل
      await this.detectIntegrationProblems();
      
      // كشف مشاكل البيانات
      await this.detectDataIssues();
      
      // كشف فجوات الأمان
      await this.detectSecurityGaps();
      
      // بناء نظام التنبيهات
      await this.buildAlertSystem();
      
      // اقتراح الحلول
      await this.proposeSolutions();

      this.emit('diagnostic-complete', {
        totalIssues: this.issues.length,
        solutions: this.solutions.length,
        timestamp: new Date()
      });

      console.log('✅ [ProblemDiagnoser] Diagnostic engine activated successfully');
    } catch (error) {
      console.error('❌ [ProblemDiagnoser] Error during diagnosis:', error);
      this.emit('diagnostic-error', error);
    }
  }

  private async detectPerformanceIssues(): Promise<void> {
    console.log('⚡ [ProblemDiagnoser] Detecting performance issues...');

    const performanceIssues: DetectedIssue[] = [];

    try {
      // قراءة logs من Log Processor للكشف عن مشاكل أداء حقيقية
      const { logProcessor } = await import('../log-processor');
      const logStatus = logProcessor.getStatus();

      // تحليل logs للكشف عن الأخطاء المتكررة
      const allLogs = Array.from((logProcessor as any).logs.values()).flat();
      const errorLogs = allLogs.filter((log: any) => log.level === 'error');
      const warningLogs = allLogs.filter((log: any) => log.level === 'warn');

      // إذا كان هناك أكثر من 3 أخطاء من نفس النواة، نعتبرها مشكلة
      const errorsByNucleus = new Map<string, number>();
      for (const log of errorLogs) {
        const typedLog = log as any;
        const count = errorsByNucleus.get(typedLog.nucleusId) || 0;
        errorsByNucleus.set(typedLog.nucleusId, count + 1);
      }

      for (const [nucleusId, errorCount] of Array.from(errorsByNucleus.entries())) {
        if (errorCount >= 3) {
          performanceIssues.push({
            id: `perf-errors-${nucleusId}`,
            category: 'performance',
            severity: 'high',
            nucleusId,
            description: `كثرة الأخطاء في ${nucleusId}: ${errorCount} خطأ`,
            detectedAt: new Date(),
            suggestedSolutions: [
              'مراجعة logs للتعرف على السبب الجذري',
              'تحسين معالجة الأخطاء',
              'إضافة monitoring للأداء'
            ]
          });
        }
      }

      // تحليل warnings للكشف عن مشاكل محتملة
      const warningsByNucleus = new Map<string, number>();
      for (const log of warningLogs) {
        const typedLog = log as any;
        const count = warningsByNucleus.get(typedLog.nucleusId) || 0;
        warningsByNucleus.set(typedLog.nucleusId, count + 1);
      }

      for (const [nucleusId, warningCount] of Array.from(warningsByNucleus.entries())) {
        if (warningCount >= 5) {
          performanceIssues.push({
            id: `perf-warnings-${nucleusId}`,
            category: 'performance',
            severity: 'medium',
            nucleusId,
            description: `تحذيرات متكررة في ${nucleusId}: ${warningCount} تحذير`,
            detectedAt: new Date(),
            suggestedSolutions: [
              'تحليل التحذيرات لفهم الأسباب',
              'تحسين الأداء لتقليل التحذيرات',
              'إضافة معالجة استباقية'
            ]
          });
        }
      }

    } catch (error) {
      console.error('[ProblemDiagnoser] Error detecting performance issues:', error);
    }

    this.issues.push(...performanceIssues);
    console.log(`⚡ [ProblemDiagnoser] Detected ${performanceIssues.length} performance issues`);
  }

  private async detectIntegrationProblems(): Promise<void> {
    console.log('🔗 [ProblemDiagnoser] Detecting integration problems...');

    const integrationIssues: DetectedIssue[] = [];

    try {
      // قراءة logs للكشف عن مشاكل تكامل حقيقية
      const { logProcessor } = await import('../log-processor');
      const allLogs = Array.from((logProcessor as any).logs.values()).flat();
      
      // البحث عن أخطاء تحتوي على كلمات مفتاحية للتكامل
      const integrationKeywords = ['connection', 'timeout', 'failed', 'api', 'integration', 'sync'];
      const integrationErrors = allLogs.filter((log: any) => {
        if (log.level !== 'error') return false;
        const message = log.message?.toLowerCase() || '';
        return integrationKeywords.some(keyword => message.includes(keyword));
      });

      // تجميع الأخطاء حسب النواة
      const errorsByNucleus = new Map<string, any[]>();
      for (const error of integrationErrors) {
        const typedError = error as any;
        const errors = errorsByNucleus.get(typedError.nucleusId) || [];
        errors.push(typedError);
        errorsByNucleus.set(typedError.nucleusId, errors);
      }

      // إنشاء مشاكل تكامل من الأخطاء الحقيقية
      for (const [nucleusId, errors] of Array.from(errorsByNucleus.entries())) {
        if (errors.length >= 2) {
          integrationIssues.push({
            id: `int-${nucleusId}-${Date.now()}`,
            category: 'integration',
            severity: errors.length >= 5 ? 'critical' : 'high',
            nucleusId,
            description: `مشاكل تكامل في ${nucleusId}: ${errors.length} خطأ`,
            detectedAt: new Date(),
            suggestedSolutions: [
              'مراجعة اتصالات API',
              'التحقق من timeout settings',
              'تحسين معالجة الأخطاء في التكامل'
            ]
          });
        }
      }
    } catch (error) {
      console.error('[ProblemDiagnoser] Error detecting integration problems:', error);
    }

    this.issues.push(...integrationIssues);
    console.log(`🔗 [ProblemDiagnoser] Detected ${integrationIssues.length} integration problems`);
  }

  private async detectDataIssues(): Promise<void> {
    console.log('💾 [ProblemDiagnoser] Detecting data issues...');

    const dataIssues: DetectedIssue[] = [];

    try {
      // قراءة logs للكشف عن مشاكل بيانات حقيقية
      const { logProcessor } = await import('../log-processor');
      const allLogs = Array.from((logProcessor as any).logs.values()).flat();
      
      // البحث عن أخطاء متعلقة بالبيانات
      const dataKeywords = ['database', 'query', 'data', 'sql', 'duplicate', 'constraint'];
      const dataErrors = allLogs.filter((log: any) => {
        if (log.level !== 'error') return false;
        const message = log.message?.toLowerCase() || '';
        return dataKeywords.some(keyword => message.includes(keyword));
      });

      // تجميع أخطاء البيانات حسب النواة
      const errorsByNucleus = new Map<string, any[]>();
      for (const error of dataErrors) {
        const typedError = error as any;
        const errors = errorsByNucleus.get(typedError.nucleusId) || [];
        errors.push(typedError);
        errorsByNucleus.set(typedError.nucleusId, errors);
      }

      // إنشاء مشاكل بيانات من الأخطاء الحقيقية
      for (const [nucleusId, errors] of Array.from(errorsByNucleus.entries())) {
        if (errors.length >= 1) {
          dataIssues.push({
            id: `data-${nucleusId}-${Date.now()}`,
            category: 'data',
            severity: errors.length >= 3 ? 'high' : 'medium',
            nucleusId,
            description: `مشاكل بيانات في ${nucleusId}: ${errors.length} خطأ`,
            detectedAt: new Date(),
            suggestedSolutions: [
              'مراجعة استعلامات قاعدة البيانات',
              'التحقق من صحة البيانات',
              'إضافة معالجة أخطاء أفضل'
            ]
          });
        }
      }
    } catch (error) {
      console.error('[ProblemDiagnoser] Error detecting data issues:', error);
    }

    this.issues.push(...dataIssues);
    console.log(`💾 [ProblemDiagnoser] Detected ${dataIssues.length} data issues`);
  }

  private async detectSecurityGaps(): Promise<void> {
    console.log('🔒 [ProblemDiagnoser] Detecting security gaps...');

    const securityIssues: DetectedIssue[] = [];

    try {
      // قراءة logs للكشف عن مشاكل أمنية حقيقية
      const { logProcessor } = await import('../log-processor');
      const allLogs = Array.from((logProcessor as any).logs.values()).flat();
      
      // البحث عن أخطاء أمنية
      const securityKeywords = ['auth', 'unauthorized', 'forbidden', 'security', 'token', 'permission'];
      const securityErrors = allLogs.filter((log: any) => {
        if (log.level !== 'error' && log.level !== 'warn') return false;
        const message = log.message?.toLowerCase() || '';
        return securityKeywords.some(keyword => message.includes(keyword));
      });

      // تجميع مشاكل الأمان حسب النواة
      const errorsByNucleus = new Map<string, any[]>();
      for (const error of securityErrors) {
        const typedError = error as any;
        const errors = errorsByNucleus.get(typedError.nucleusId) || [];
        errors.push(typedError);
        errorsByNucleus.set(typedError.nucleusId, errors);
      }

      // إنشاء مشاكل أمنية من الأخطاء الحقيقية
      for (const [nucleusId, errors] of Array.from(errorsByNucleus.entries())) {
        if (errors.length >= 1) {
          securityIssues.push({
            id: `sec-${nucleusId}-${Date.now()}`,
            category: 'security',
            severity: errors.length >= 3 ? 'critical' : 'high',
            nucleusId,
            description: `مشاكل أمنية في ${nucleusId}: ${errors.length} مشكلة`,
            detectedAt: new Date(),
            suggestedSolutions: [
              'مراجعة إعدادات الأمان',
              'تحسين آلية المصادقة',
              'إضافة logging للأحداث الأمنية'
            ]
          });
        }
      }
    } catch (error) {
      console.error('[ProblemDiagnoser] Error detecting security gaps:', error);
    }

    this.issues.push(...securityIssues);
    console.log(`🔒 [ProblemDiagnoser] Detected ${securityIssues.length} security gaps`);
  }

  private async buildAlertSystem(): Promise<void> {
    console.log('🚨 [ProblemDiagnoser] Building alert system...');
    
    // تصنيف المشاكل حسب الأولوية
    const criticalIssues = this.issues.filter(i => i.severity === 'critical');
    const highIssues = this.issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      this.emit('critical-alert', {
        count: criticalIssues.length,
        issues: criticalIssues
      });
    }

    if (highIssues.length > 0) {
      this.emit('high-priority-alert', {
        count: highIssues.length,
        issues: highIssues
      });
    }

    console.log(`🚨 [ProblemDiagnoser] Alert system built: ${criticalIssues.length} critical, ${highIssues.length} high priority`);
  }

  private async proposeSolutions(): Promise<void> {
    console.log('💡 [ProblemDiagnoser] Proposing solutions...');

    // اقتراح حلول لكل مشكلة
    for (const issue of this.issues) {
      if (issue.suggestedSolutions && issue.suggestedSolutions.length > 0) {
        const solution: ProposedSolution = {
          issueId: issue.id,
          solution: issue.suggestedSolutions[0], // الحل الأول هو الأفضل
          priority: this.calculatePriority(issue.severity),
          estimatedImpact: this.estimateImpact(issue.severity),
          implementationSteps: issue.suggestedSolutions
        };
        
        this.solutions.push(solution);
      }
    }

    console.log(`💡 [ProblemDiagnoser] Proposed ${this.solutions.length} solutions`);
  }

  private calculatePriority(severity: string): number {
    const priorities = {
      critical: 10,
      high: 7,
      medium: 5,
      low: 2
    };
    return priorities[severity as keyof typeof priorities] || 1;
  }

  private estimateImpact(severity: string): string {
    const impacts = {
      critical: 'تحسين كبير في الأداء والاستقرار',
      high: 'تحسين ملحوظ في تجربة المستخدم',
      medium: 'تحسين متوسط في الكفاءة',
      low: 'تحسين طفيف في الأداء'
    };
    return impacts[severity as keyof typeof impacts] || 'تأثير غير محدد';
  }

  /**
   * إنتاج تقرير تشخيصي شامل
   */
  generateDiagnosticReport(): DiagnosticReport {
    const issuesByCategory: Record<string, number> = {
      performance: 0,
      integration: 0,
      data: 0,
      security: 0
    };

    const issuesBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    this.issues.forEach(issue => {
      issuesByCategory[issue.category]++;
      issuesBySeverity[issue.severity]++;
    });

    // أهم 10 مشاكل
    const topIssues = [...this.issues]
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10);

    return {
      totalIssues: this.issues.length,
      issuesByCategory,
      issuesBySeverity,
      topIssues,
      proposedSolutions: this.solutions
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      totalIssues: this.issues.length,
      criticalIssues: this.issues.filter(i => i.severity === 'critical').length,
      proposedSolutions: this.solutions.length
    };
  }

  /**
   * Get all issues
   */
  getAllIssues(): DetectedIssue[] {
    return this.issues;
  }

  /**
   * Get all solutions
   */
  getAllSolutions(): ProposedSolution[] {
    return this.solutions;
  }
}

// Export singleton instance
export const problemDiagnoser = new ProblemDiagnoser();
