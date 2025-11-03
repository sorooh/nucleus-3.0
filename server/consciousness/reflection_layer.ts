/**
 * Reflection Layer - Phase 10.1
 * طبقة التأمل والمراجعة
 * 
 * يراجع كل حدث حدث داخل النظام (success/failure)
 * يحلل "هل القرار كان صائبًا؟ ولماذا؟"
 * يُسجّل تقرير تأملي (Reflection Report)
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// ============= TYPES =============

export interface ReflectionEvent {
  eventId: string;
  nodeId: string;
  originalDecision: any;
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  expectedResult: any;
  actualResult: any;
  timestamp: number;
}

export interface ReflectionAnalysis {
  reflectionId: string;
  eventId: string;
  nodeId: string;
  
  // التحليل
  wasCorrect: boolean;
  accuracy: number; // 0.0-1.0
  reasoning: string; // لماذا كان صحيحاً أو خاطئاً؟
  
  // الدروس المستفادة
  lessonsLearned: string[];
  improvements: string[];
  
  // التوصيات المستقبلية
  recommendations: string[];
  
  // البيانات الوصفية
  confidence: number; // 0.0-1.0
  importance: number; // 0.0-1.0
  
  timestamp: number;
}

export interface ReflectionReport {
  reportId: string;
  nodeId: string;
  period: {
    start: Date;
    end: Date;
  };
  
  summary: {
    totalEvents: number;
    successfulDecisions: number;
    failedDecisions: number;
    partialSuccess: number;
    accuracyRate: number; // percentage
  };
  
  keyInsights: string[];
  majorLessons: string[];
  actionItems: string[];
  
  reflections: ReflectionAnalysis[];
  
  generatedAt: Date;
}

// ============= REFLECTION LAYER =============

export class ReflectionLayer extends EventEmitter {
  private nodeId: string;
  private reflections: ReflectionAnalysis[] = [];
  private events: ReflectionEvent[] = [];
  
  constructor(nodeId: string) {
    super();
    this.nodeId = nodeId;
    this.startPeriodicReflection();
  }

  /**
   * تسجيل حدث للمراجعة
   */
  async recordEvent(event: Omit<ReflectionEvent, 'eventId' | 'timestamp'>): Promise<void> {
    // HONEST: Create deterministic event ID based on timestamp and node
    const timestamp = Date.now();
    const eventId = `evt-${timestamp}-${this.nodeId.slice(0, 8)}-${this.events.length}`;
    
    const reflectionEvent: ReflectionEvent = {
      eventId,
      timestamp,
      ...event
    };

    this.events.push(reflectionEvent);
    
    // الاحتفاظ بآخر 1000 حدث
    if (this.events.length > 1000) {
      this.events.shift();
    }

    // تحليل فوري للأحداث المهمة
    if (event.outcome === 'failure') {
      await this.reflectOnEvent(reflectionEvent);
    }

    console.log(`[Reflection:${this.nodeId}] 📝 Event recorded: ${event.outcome}`);
  }

  /**
   * التأمل في حدث محدد
   */
  async reflectOnEvent(event: ReflectionEvent): Promise<ReflectionAnalysis> {
    try {
      // تحليل الحدث
      const wasCorrect = event.outcome === 'success';
      const accuracy = this.calculateAccuracy(event);
      const reasoning = this.analyzeReasoning(event);
      const lessonsLearned = this.extractLessons(event);
      const improvements = this.suggestImprovements(event);
      const recommendations = this.generateRecommendations(event);

      // HONEST: Create deterministic reflection ID based on timestamp
      const timestamp = Date.now();
      const reflectionId = `ref-${timestamp}-${this.nodeId.slice(0, 8)}-${this.reflections.length}`;
      
      const analysis: ReflectionAnalysis = {
        reflectionId,
        eventId: event.eventId,
        nodeId: this.nodeId,
        wasCorrect,
        accuracy,
        reasoning,
        lessonsLearned,
        improvements,
        recommendations,
        confidence: 0.8,
        importance: event.outcome === 'failure' ? 0.9 : 0.6,
        timestamp: Date.now()
      };

      // حفظ التحليل
      this.reflections.push(analysis);
      
      // الاحتفاظ بآخر 500 تحليل
      if (this.reflections.length > 500) {
        this.reflections.shift();
      }

      // Emit event
      this.emit('reflection:completed', analysis);

      console.log(`[Reflection:${this.nodeId}] 🔍 Analysis: ${wasCorrect ? 'Correct' : 'Incorrect'} (${(accuracy * 100).toFixed(0)}%)`);

      return analysis;

    } catch (error: any) {
      console.error('[Reflection] ❌ Failed to reflect on event:', error.message);
      throw error;
    }
  }

  /**
   * توليد تقرير تأملي دوري
   */
  async generateReport(periodDays: number = 7): Promise<ReflectionReport> {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

      // تصفية الأحداث في الفترة المحددة
      const periodEvents = this.events.filter(e => 
        e.timestamp >= startDate.getTime() && e.timestamp <= now.getTime()
      );

      const periodReflections = this.reflections.filter(r =>
        r.timestamp >= startDate.getTime() && r.timestamp <= now.getTime()
      );

      // حساب الإحصائيات
      const totalEvents = periodEvents.length;
      const successfulDecisions = periodEvents.filter(e => e.outcome === 'success').length;
      const failedDecisions = periodEvents.filter(e => e.outcome === 'failure').length;
      const partialSuccess = periodEvents.filter(e => e.outcome === 'partial').length;
      const accuracyRate = totalEvents > 0 
        ? (successfulDecisions / totalEvents) * 100 
        : 0;

      // استخراج أهم الرؤى
      const keyInsights = this.extractKeyInsights(periodReflections);
      const majorLessons = this.extractMajorLessons(periodReflections);
      const actionItems = this.generateActionItems(periodReflections);

      const report: ReflectionReport = {
        reportId: `report-${Date.now()}`,
        nodeId: this.nodeId,
        period: {
          start: startDate,
          end: now
        },
        summary: {
          totalEvents,
          successfulDecisions,
          failedDecisions,
          partialSuccess,
          accuracyRate: Math.round(accuracyRate)
        },
        keyInsights,
        majorLessons,
        actionItems,
        reflections: periodReflections,
        generatedAt: now
      };

      // حفظ التقرير في ملف
      await this.saveReport(report);

      // Emit event
      this.emit('report:generated', report);

      console.log(`[Reflection:${this.nodeId}] 📊 Report generated: ${totalEvents} events, ${accuracyRate.toFixed(0)}% accuracy`);

      return report;

    } catch (error: any) {
      console.error('[Reflection] ❌ Failed to generate report:', error.message);
      throw error;
    }
  }

  /**
   * الحصول على آخر التحليلات
   */
  getRecentReflections(limit: number = 10): ReflectionAnalysis[] {
    return this.reflections.slice(-limit);
  }

  /**
   * الحصول على إحصائيات التأمل
   */
  getReflectionStats(): any {
    const total = this.reflections.length;
    if (total === 0) {
      return {
        total: 0,
        correctDecisions: 0,
        incorrectDecisions: 0,
        avgAccuracy: 0,
        lessonsLearned: 0
      };
    }

    const correct = this.reflections.filter(r => r.wasCorrect).length;
    const avgAccuracy = this.reflections.reduce((sum, r) => sum + r.accuracy, 0) / total;
    const totalLessons = this.reflections.reduce((sum, r) => sum + r.lessonsLearned.length, 0);

    return {
      total,
      correctDecisions: correct,
      incorrectDecisions: total - correct,
      avgAccuracy: Math.round(avgAccuracy * 100),
      lessonsLearned: totalLessons
    };
  }

  // ============= HELPER METHODS =============

  private calculateAccuracy(event: ReflectionEvent): number {
    if (event.outcome === 'success') return 1.0;
    if (event.outcome === 'failure') return 0.0;
    if (event.outcome === 'partial') return 0.5;
    return 0.3;
  }

  private analyzeReasoning(event: ReflectionEvent): string {
    // في الإنتاج سنستخدم AI للتحليل
    if (event.outcome === 'success') {
      return 'Decision was correct - expected and actual results aligned well';
    } else if (event.outcome === 'failure') {
      return 'Decision was incorrect - actual result deviated significantly from expectations';
    } else {
      return 'Decision was partially correct - some aspects succeeded while others failed';
    }
  }

  private extractLessons(event: ReflectionEvent): string[] {
    const lessons: string[] = [];

    if (event.outcome === 'failure') {
      lessons.push('Need to validate assumptions more thoroughly before making decisions');
      lessons.push('Consider edge cases and potential failure modes');
    } else if (event.outcome === 'success') {
      lessons.push('Current approach is effective and should be reinforced');
    }

    return lessons;
  }

  private suggestImprovements(event: ReflectionEvent): string[] {
    const improvements: string[] = [];

    if (event.outcome !== 'success') {
      improvements.push('Enhance pre-decision validation logic');
      improvements.push('Implement additional safety checks');
      improvements.push('Increase confidence threshold for similar decisions');
    }

    return improvements;
  }

  private generateRecommendations(event: ReflectionEvent): string[] {
    const recommendations: string[] = [];

    recommendations.push('Continue monitoring similar patterns for recurring issues');
    recommendations.push('Update decision-making models with new learnings');

    if (event.outcome === 'failure') {
      recommendations.push('Investigate root cause and implement preventive measures');
    }

    return recommendations;
  }

  private extractKeyInsights(reflections: ReflectionAnalysis[]): string[] {
    if (reflections.length === 0) return [];

    const insights: string[] = [];
    const failureRate = reflections.filter(r => !r.wasCorrect).length / reflections.length;

    if (failureRate > 0.3) {
      insights.push('High failure rate detected - immediate attention required');
    } else if (failureRate < 0.1) {
      insights.push('Excellent decision-making performance - maintain current approach');
    }

    const avgAccuracy = reflections.reduce((sum, r) => sum + r.accuracy, 0) / reflections.length;
    insights.push(`Average decision accuracy: ${(avgAccuracy * 100).toFixed(0)}%`);

    return insights;
  }

  private extractMajorLessons(reflections: ReflectionAnalysis[]): string[] {
    const allLessons: string[] = [];
    reflections.forEach(r => allLessons.push(...r.lessonsLearned));
    
    // إرجاع أكثر 5 دروس تكراراً
    return Array.from(new Set(allLessons)).slice(0, 5);
  }

  private generateActionItems(reflections: ReflectionAnalysis[]): string[] {
    const items: string[] = [];
    
    const failedReflections = reflections.filter(r => !r.wasCorrect);
    if (failedReflections.length > 0) {
      items.push('Review and address all failed decisions');
      items.push('Update decision-making parameters based on failures');
    }

    return items;
  }

  private async saveReport(report: ReflectionReport): Promise<void> {
    try {
      const reportsDir = path.join(process.cwd(), 'reports', 'reflection');
      
      // إنشاء المجلد إذا لم يكن موجوداً
      await fs.mkdir(reportsDir, { recursive: true });

      const filename = `${report.nodeId}-${report.reportId}.json`;
      const filepath = path.join(reportsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');

      console.log(`[Reflection] ✅ Report saved: ${filename}`);
    } catch (error) {
      console.error('[Reflection] Failed to save report:', error);
    }
  }

  /**
   * مراجعة دورية (كل ساعة)
   */
  private startPeriodicReflection(): void {
    setInterval(async () => {
      // مراجعة الأحداث الأخيرة
      const recentEvents = this.events.slice(-100);
      
      for (const event of recentEvents) {
        // فقط نراجع الأحداث التي لم يتم تحليلها بعد
        const alreadyReflected = this.reflections.some(r => r.eventId === event.eventId);
        if (!alreadyReflected) {
          await this.reflectOnEvent(event);
        }
      }

    }, 3600000); // 1 hour
  }
}

// ============= SINGLETON INSTANCES =============

const reflectionLayers: Map<string, ReflectionLayer> = new Map();

export function initializeReflectionLayer(nodeId: string): ReflectionLayer {
  if (!reflectionLayers.has(nodeId)) {
    const layer = new ReflectionLayer(nodeId);
    reflectionLayers.set(nodeId, layer);
    console.log(`[Reflection] ✅ Reflection Layer initialized for node: ${nodeId}`);
  }
  return reflectionLayers.get(nodeId)!;
}

export function getReflectionLayer(nodeId: string): ReflectionLayer | null {
  return reflectionLayers.get(nodeId) || null;
}

export function getAllReflectionLayers(): ReflectionLayer[] {
  return Array.from(reflectionLayers.values());
}
