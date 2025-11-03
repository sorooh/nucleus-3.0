/**
 * Governance AI Core - Phase 9.9
 * النواة الذكية للحوكمة الجماعية
 * 
 * يجمع جميع طبقات التحقق (القانوني، المالي، الأخلاقي)
 * ويصدر القرار النهائي: approve / reject / manual-review
 */

import { legalComplianceEngine } from './legal_compliance_engine';
import { financialValidator } from './financial_validator';
import { ethicalGovernor } from './ethical_governor';
import { governanceEngine } from '../../../nucleus/core/governance-engine';
import { db } from '../../db';
import { governanceAuditLog } from '@shared/schema';

interface GovernanceDecision {
  node: string;
  decisionId: string;
  decisionType: string;
  payload: any;
  confidence: number;
  expectedImpact: number;
}

interface GovernanceVerdict {
  decisionId: string;
  verdict: 'approved' | 'rejected' | 'manual-review';
  details: {
    legal: {
      status: string;
      score: number;
      violations: string[];
      warnings: string[];
    };
    financial: {
      status: string;
      score: number;
      budget_impact: number;
      conflicts: string[];
    };
    ethical: {
      status: string;
      score: number;
      transparency_level: number;
      bias_score: number;
    };
  };
  overall_score: number;
  consensus_reached: boolean;
  recommendations: string[];
  requires_cpe: boolean;
  timestamp: string;
}

export class GovernanceAICore {
  private config = {
    min_score_threshold: 0.7, // 70% minimum score to approve
    consensus_threshold: 0.7, // 70% agreement between validators
    auto_approve_score: 0.9 // 90% score = auto approve
  };

  constructor() {
    console.log('[GovernanceAICore] Initialized');
  }

  /**
   * تحليل قرار وإصدار الحكم الحوكمي
   */
  async analyzeDecision(decision: GovernanceDecision): Promise<GovernanceVerdict> {
    console.log('\n' + '='.repeat(70));
    console.log('[GovernanceAICore] ⚖️ Analyzing decision...');
    console.log('='.repeat(70));
    console.log(`Decision ID: ${decision.decisionId}`);
    console.log(`Node: ${decision.node}`);
    console.log(`Type: ${decision.decisionType}`);
    
    const startTime = Date.now();

    // Step 1: Legal Compliance Check
    console.log('\n[Step 1] Legal Compliance Check...');
    const legalResult = await legalComplianceEngine.checkCompliance(
      decision.decisionType,
      decision.payload,
      decision.node
    );
    
    console.log(`  Legal Status: ${legalResult.status}`);
    console.log(`  Compliance Score: ${legalResult.compliance_score.toFixed(2)}`);
    
    // Step 2: Financial Validation
    console.log('\n[Step 2] Financial Validation...');
    const financialResult = await financialValidator.validateFinancial(
      decision.decisionType,
      decision.payload,
      decision.node
    );
    
    console.log(`  Financial Status: ${financialResult.status}`);
    console.log(`  Financial Score: ${financialResult.financial_score.toFixed(2)}`);
    console.log(`  Budget Impact: $${financialResult.budget_impact.toFixed(2)}`);
    
    // Step 3: Ethical Oversight
    console.log('\n[Step 3] Ethical Oversight...');
    const ethicalResult = await ethicalGovernor.checkEthics(
      decision.decisionType,
      decision.payload,
      decision.node,
      decision.confidence
    );
    
    console.log(`  Ethical Status: ${ethicalResult.status}`);
    console.log(`  Ethical Score: ${ethicalResult.ethical_score.toFixed(2)}`);
    console.log(`  Transparency: ${(ethicalResult.transparency_level * 100).toFixed(0)}%`);
    console.log(`  Bias Score: ${(ethicalResult.bias_score * 100).toFixed(0)}%`);
    
    // Step 4: Calculate Overall Score
    console.log('\n[Step 4] Calculating Overall Governance Score...');
    const overallScore = this.calculateOverallScore(
      legalResult.compliance_score,
      financialResult.financial_score,
      ethicalResult.ethical_score
    );
    
    console.log(`  Overall Score: ${(overallScore * 100).toFixed(1)}%`);
    
    // Step 5: Check Consensus
    const consensusReached = this.checkConsensus(
      legalResult.status,
      financialResult.status,
      ethicalResult.status
    );
    
    console.log(`  Consensus: ${consensusReached ? 'Yes' : 'No'}`);
    
    // Step 6: Determine Verdict
    const verdict = this.determineVerdict(
      overallScore,
      consensusReached,
      legalResult.status,
      financialResult.status,
      ethicalResult.status
    );
    
    console.log(`\n[Step 6] Final Verdict: ${verdict.verdict.toUpperCase()}`);
    
    // Step 7: Governance Engine Validation
    const governanceDecision = governanceEngine.submitDecision(
      decision.node,
      `governance_check_${decision.decisionType}`,
      {
        decisionId: decision.decisionId,
        overallScore,
        verdict: verdict.verdict
      }
    );
    
    const requiresCPE = 
      verdict.verdict === 'manual-review' ||
      governanceDecision.status !== 'approved' ||
      overallScore < this.config.min_score_threshold;
    
    console.log(`  Requires CPE Review: ${requiresCPE ? 'Yes' : 'No'}`);
    
    // Step 8: Generate Recommendations
    const recommendations = this.generateRecommendations(
      verdict.verdict,
      legalResult,
      financialResult,
      ethicalResult,
      overallScore
    );
    
    // Prepare final verdict
    const finalVerdict: GovernanceVerdict = {
      decisionId: decision.decisionId,
      verdict: verdict.verdict,
      details: {
        legal: {
          status: legalResult.status,
          score: legalResult.compliance_score,
          violations: legalResult.violations,
          warnings: legalResult.warnings
        },
        financial: {
          status: financialResult.status,
          score: financialResult.financial_score,
          budget_impact: financialResult.budget_impact,
          conflicts: financialResult.conflicts
        },
        ethical: {
          status: ethicalResult.status,
          score: ethicalResult.ethical_score,
          transparency_level: ethicalResult.transparency_level,
          bias_score: ethicalResult.bias_score
        }
      },
      overall_score: overallScore,
      consensus_reached: consensusReached,
      recommendations,
      requires_cpe: requiresCPE,
      timestamp: new Date().toISOString()
    };
    
    // Step 9: Log to Database
    await this.logToAudit(decision, finalVerdict);
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Analysis completed in ${duration}ms`);
    console.log('='.repeat(70) + '\n');
    
    return finalVerdict;
  }

  /**
   * حساب الدرجة الإجمالية
   */
  private calculateOverallScore(
    legalScore: number,
    financialScore: number,
    ethicalScore: number
  ): number {
    // وزن كل عامل:
    // القانوني: 35%
    // المالي: 30%
    // الأخلاقي: 35%
    
    return (legalScore * 0.35) + (financialScore * 0.30) + (ethicalScore * 0.35);
  }

  /**
   * التحقق من التوافق بين المحققات
   */
  private checkConsensus(
    legalStatus: string,
    financialStatus: string,
    ethicalStatus: string
  ): boolean {
    const statuses = [legalStatus, financialStatus, ethicalStatus];
    
    // عد الموافقات
    const passCount = statuses.filter(s => s === 'pass').length;
    
    // التوافق = على الأقل 70% موافقة (2 من 3)
    return (passCount / statuses.length) >= this.config.consensus_threshold;
  }

  /**
   * تحديد الحكم النهائي
   */
  private determineVerdict(
    overallScore: number,
    consensusReached: boolean,
    legalStatus: string,
    financialStatus: string,
    ethicalStatus: string
  ): { verdict: 'approved' | 'rejected' | 'manual-review'; reason: string } {
    // رفض تلقائي إذا فشل أي فحص حرج
    if (legalStatus === 'fail' || financialStatus === 'fail' || ethicalStatus === 'fail') {
      return {
        verdict: 'rejected',
        reason: 'Critical validation failure in one or more categories'
      };
    }
    
    // موافقة تلقائية إذا كانت الدرجة عالية جدًا
    if (overallScore >= this.config.auto_approve_score && consensusReached) {
      return {
        verdict: 'approved',
        reason: 'High overall score with full consensus'
      };
    }
    
    // موافقة إذا استوفى الحد الأدنى والتوافق
    if (overallScore >= this.config.min_score_threshold && consensusReached) {
      return {
        verdict: 'approved',
        reason: 'Meets minimum threshold with consensus'
      };
    }
    
    // مراجعة يدوية للحالات المتوسطة
    if (overallScore >= 0.5) {
      return {
        verdict: 'manual-review',
        reason: 'Borderline case requires human judgment'
      };
    }
    
    // رفض للدرجات المنخفضة
    return {
      verdict: 'rejected',
      reason: 'Overall score below acceptable threshold'
    };
  }

  /**
   * توليد التوصيات
   */
  private generateRecommendations(
    verdict: string,
    legalResult: any,
    financialResult: any,
    ethicalResult: any,
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (verdict === 'approved') {
      recommendations.push('✅ القرار معتمد - يمكن التنفيذ مباشرة');
      recommendations.push(`📊 الدرجة الإجمالية: ${(overallScore * 100).toFixed(1)}%`);
    } else if (verdict === 'rejected') {
      recommendations.push('⛔ القرار مرفوض - لا يمكن التنفيذ');
      recommendations.push('🔍 يجب معالجة الانتهاكات الحرجة أولاً');
    } else {
      recommendations.push('⚠️ القرار يحتاج مراجعة يدوية من CPE');
      recommendations.push(`📊 الدرجة الإجمالية: ${(overallScore * 100).toFixed(1)}%`);
    }
    
    // إضافة توصيات من كل محقق
    if (legalResult.recommendations.length > 0) {
      recommendations.push(...legalResult.recommendations.slice(0, 2));
    }
    
    if (financialResult.recommendations.length > 0) {
      recommendations.push(...financialResult.recommendations.slice(0, 2));
    }
    
    if (ethicalResult.recommendations.length > 0) {
      recommendations.push(...ethicalResult.recommendations.slice(0, 2));
    }
    
    return recommendations;
  }

  /**
   * تسجيل في سجل التدقيق
   */
  private async logToAudit(
    decision: GovernanceDecision,
    verdict: GovernanceVerdict
  ): Promise<void> {
    try {
      await db.insert(governanceAuditLog).values({
        decisionId: decision.decisionId,
        nodeOrigin: decision.node,
        decisionType: decision.decisionType,
        legalStatus: verdict.details.legal.status,
        financialStatus: verdict.details.financial.status,
        ethicalStatus: verdict.details.ethical.status,
        finalVerdict: verdict.verdict,
        overallScore: verdict.overall_score,
        consensusReached: verdict.consensus_reached ? 1 : 0,
        requiresCpe: verdict.requires_cpe ? 1 : 0,
        details: verdict.details,
        recommendations: verdict.recommendations
      });
      
      console.log(`[GovernanceAICore] Logged to audit: ${decision.decisionId}`);
    } catch (error: any) {
      console.error('[GovernanceAICore] Failed to log audit:', error.message);
    }
  }

  /**
   * الحصول على إحصائيات الحوكمة
   */
  async getStatistics(): Promise<any> {
    const allLogs = await db.select().from(governanceAuditLog);
    
    const total = allLogs.length;
    const approved = allLogs.filter(l => l.finalVerdict === 'approved').length;
    const rejected = allLogs.filter(l => l.finalVerdict === 'rejected').length;
    const manualReview = allLogs.filter(l => l.finalVerdict === 'manual-review').length;
    
    const avgScore = total > 0
      ? allLogs.reduce((sum, l) => sum + (l.overallScore || 0), 0) / total
      : 0;
    
    const consensusRate = total > 0
      ? allLogs.filter(l => l.consensusReached === 1).length / total
      : 0;
    
    return {
      total,
      approved,
      rejected,
      manual_review: manualReview,
      approval_rate: total > 0 ? approved / total : 0,
      rejection_rate: total > 0 ? rejected / total : 0,
      manual_review_rate: total > 0 ? manualReview / total : 0,
      avg_score: avgScore,
      consensus_rate: consensusRate
    };
  }

  /**
   * تحديث الإعدادات
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    console.log('[GovernanceAICore] Configuration updated:', this.config);
  }

  /**
   * الحصول على الإعدادات
   */
  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export const governanceAICore = new GovernanceAICore();

console.log('[GovernanceAICore] Module loaded');
