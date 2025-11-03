/**
 * SMART REPORTS SYSTEM - نظام التقارير الذكية
 * 
 * Automatically analyzes Intelligence System data and generates:
 * - Pattern Detection (اكتشاف الأنماط)
 * - Performance Insights (رؤى الأداء)
 * - Recommendations (التوصيات)
 * - Trend Analysis (تحليل الاتجاهات)
 */

import { feedbackLoop } from './feedback-loop';
import { vectorMemory } from './vector-memory';
import { sharedLearning } from './shared-learning';

// ============= Types =============

interface SmartReport {
  generatedAt: Date;
  summary: {
    totalDecisions: number;
    successRate: number;
    averageConfidence: number;
    totalMemories: number;
    sharedPatterns: number;
  };
  patterns: PatternInsight[];
  insights: PerformanceInsight[];
  recommendations: Recommendation[];
  trends: TrendAnalysis[];
}

interface PatternInsight {
  type: string;
  pattern: string;
  occurrences: number;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

interface PerformanceInsight {
  metric: string;
  value: number;
  change: number; // percentage change
  status: 'improving' | 'declining' | 'stable';
  description: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
}

interface TrendAnalysis {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  timeframe: string;
  prediction: string;
}

// ============= Smart Reports Class =============

export class SmartReports {
  private active: boolean = false;

  activate(): void {
    if (this.active) return;
    this.active = true;
    console.log('[SmartReports] Activated - Intelligent analysis enabled');
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    console.log('[SmartReports] Deactivated');
  }

  /**
   * Generate comprehensive smart report
   */
  async generateReport(): Promise<SmartReport> {
    if (!this.active) {
      throw new Error('Smart Reports is not active');
    }

    try {
      // Gather stats from all intelligence systems
      const [feedbackStats, vectorStats, learningStats] = await Promise.all([
        feedbackLoop.getStats().catch(() => null),
        vectorMemory.getStats().catch(() => null),
        sharedLearning.getStats().catch(() => null)
      ]);

      // Build summary
      const summary = {
        totalDecisions: feedbackStats?.totalDecisions || 0,
        successRate: feedbackStats?.successRate || 0,
        averageConfidence: feedbackStats?.averageConfidence || 0,
        totalMemories: vectorStats?.totalMemories || 0,
        sharedPatterns: learningStats?.totalSharedPatterns || 0
      };

      // Analyze patterns
      const patterns = await this.detectPatterns(feedbackStats);

      // Generate insights
      const insights = await this.generateInsights(feedbackStats, vectorStats, learningStats);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(summary, patterns, insights);

      // Analyze trends
      const trends = await this.analyzeTrends(feedbackStats);

      return {
        generatedAt: new Date(),
        summary,
        patterns,
        insights,
        recommendations,
        trends
      };
    } catch (error) {
      console.error('[SmartReports] Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * Detect patterns in decision-making
   */
  private async detectPatterns(feedbackStats: any): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = [];

    if (!feedbackStats?.topPatterns || feedbackStats.topPatterns.length === 0) {
      // Generate default patterns based on recent decisions
      const recentDecisions = feedbackStats?.recentDecisions || [];
      
      // Group by decision type
      const typeCount: Record<string, number> = {};
      recentDecisions.forEach((dec: any) => {
        typeCount[dec.decisionType] = (typeCount[dec.decisionType] || 0) + 1;
      });

      // Convert to patterns
      Object.entries(typeCount).forEach(([type, count]) => {
        if (count > 1) {
          patterns.push({
            type: 'decision-type',
            pattern: `Frequent ${type} decisions`,
            occurrences: count,
            confidence: Math.min((count / recentDecisions.length) * 100, 95),
            impact: count > 5 ? 'high' : count > 2 ? 'medium' : 'low'
          });
        }
      });
    }

    return patterns;
  }

  /**
   * Generate performance insights
   */
  private async generateInsights(
    feedbackStats: any,
    vectorStats: any,
    learningStats: any
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Success rate insight
    if (feedbackStats) {
      const successRate = feedbackStats.successRate || 0;
      insights.push({
        metric: 'Success Rate',
        value: successRate,
        change: 0, // Would need historical data for this
        status: successRate >= 80 ? 'improving' : successRate >= 60 ? 'stable' : 'declining',
        description: `نسبة النجاح الحالية ${successRate}%. ${
          successRate >= 80 ? 'أداء ممتاز!' : successRate >= 60 ? 'أداء جيد' : 'يحتاج تحسين'
        }`
      });
    }

    // Confidence insight
    if (feedbackStats?.averageConfidence) {
      const confidence = feedbackStats.averageConfidence;
      insights.push({
        metric: 'Average Confidence',
        value: confidence,
        change: 0,
        status: confidence >= 75 ? 'improving' : confidence >= 60 ? 'stable' : 'declining',
        description: `متوسط الثقة ${confidence}%. ${
          confidence >= 75 ? 'النظام واثق من قراراته' : 'قد يحتاج تدريب إضافي'
        }`
      });
    }

    // Memory growth insight
    if (vectorStats?.totalMemories) {
      insights.push({
        metric: 'Vector Memory',
        value: vectorStats.totalMemories,
        change: 0,
        status: 'stable',
        description: `${vectorStats.totalMemories} ذاكرة مخزنة في النظام`
      });
    }

    // Shared learning insight
    if (learningStats) {
      insights.push({
        metric: 'Shared Learning',
        value: learningStats.totalSharedPatterns || 0,
        change: 0,
        status: 'stable',
        description: `التعلم الجماعي: ${learningStats.totalSharedPatterns || 0} نمط مشترك`
      });
    }

    return insights;
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(
    summary: any,
    patterns: PatternInsight[],
    insights: PerformanceInsight[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Low confidence recommendation
    if (summary.averageConfidence < 70) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: 'تحسين مستوى الثقة',
        description: 'متوسط الثقة منخفض. يُنصح بتدريب النظام على المزيد من البيانات وتقديم تغذية راجعة على القرارات.',
        expectedImpact: 'زيادة الثقة بنسبة 10-20%'
      });
    }

    // Low success rate recommendation
    if (summary.successRate < 70 && summary.totalDecisions > 5) {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        title: 'تحسين معدل النجاح',
        description: 'معدل النجاح أقل من المتوقع. راجع القرارات الفاشلة واستخدم التغذية الراجعة للتعلم.',
        expectedImpact: 'رفع معدل النجاح إلى 80%+'
      });
    }

    // Vector memory recommendation
    if (summary.totalMemories < 10) {
      recommendations.push({
        priority: 'medium',
        category: 'knowledge',
        title: 'بناء قاعدة المعرفة',
        description: 'عدد الذكريات المخزنة قليل. قم بتخزين المزيد من المعلومات المهمة في Vector Memory للاستفادة منها لاحقاً.',
        expectedImpact: 'تحسين القرارات المستقبلية'
      });
    }

    // Shared learning recommendation
    if (summary.sharedPatterns === 0 && summary.totalDecisions > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'collaboration',
        title: 'تفعيل التعلم المشترك',
        description: 'لا توجد أنماط مشتركة. فعّل التعاون بين البوتات لمشاركة المعرفة والتعلم الجماعي.',
        expectedImpact: 'تسريع التعلم والتطوير'
      });
    }

    // Good performance recognition
    if (summary.successRate >= 90 && summary.averageConfidence >= 80) {
      recommendations.push({
        priority: 'low',
        category: 'optimization',
        title: 'أداء ممتاز - استمر!',
        description: 'النظام يعمل بكفاءة عالية. استمر في تقديم التغذية الراجعة للحفاظ على هذا المستوى.',
        expectedImpact: 'الحفاظ على الأداء العالي'
      });
    }

    return recommendations;
  }

  /**
   * Analyze trends over time
   */
  private async analyzeTrends(feedbackStats: any): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    // Would need historical data for accurate trends
    // For now, provide current state analysis

    if (feedbackStats?.totalDecisions > 0) {
      trends.push({
        metric: 'Decision Making Activity',
        direction: 'stable',
        percentage: 0,
        timeframe: 'Current Session',
        prediction: `${feedbackStats.totalDecisions} قرار تم اتخاذه حتى الآن`
      });
    }

    if (feedbackStats?.successRate) {
      trends.push({
        metric: 'Quality Trend',
        direction: feedbackStats.successRate >= 80 ? 'up' : feedbackStats.successRate >= 60 ? 'stable' : 'down',
        percentage: feedbackStats.successRate,
        timeframe: 'Current Session',
        prediction: feedbackStats.successRate >= 80 
          ? 'مستوى جودة ممتاز ومتوقع الاستمرار'
          : 'يحتاج تحسين مستمر'
      });
    }

    return trends;
  }
}

// ============= Export Singleton =============

export const smartReports = new SmartReports();
