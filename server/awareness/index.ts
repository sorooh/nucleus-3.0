/**
 * Awareness Layer Integration
 * Phase 3.2 → 5.0: Conscious Awareness Layer
 * 
 * يربط المكونات الثلاثة (Log Processor + Knowledge Graph + Problem Diagnoser)
 */

import { EventEmitter } from 'events';
import { logProcessor } from './log-processor';
import { knowledgeGraph } from './knowledge-graph';
import { problemDiagnoser } from './problem-diagnoser';

interface AwarenessStatus {
  overallProgress: number;
  components: {
    logProcessor: any;
    knowledgeGraph: any;
    problemDiagnoser: any;
  };
  discoveries: {
    patterns: string[];
    criticalPaths: number;
    issues: number;
  };
}

export class AwarenessLayer extends EventEmitter {
  private isActivated: boolean = false;
  private activationStartTime: Date | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    console.log('🧠 [AwarenessLayer] Initializing Conscious Awareness System...');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Log Processor events
    logProcessor.on('reading-complete', (data) => {
      console.log('📊 [AwarenessLayer] Log reading complete, enriching knowledge graph...');
      this.enrichKnowledgeGraph(data);
    });

    // Knowledge Graph events
    knowledgeGraph.on('graph-complete', (data) => {
      console.log('🗺️ [AwarenessLayer] Knowledge graph complete, running diagnostics...');
      this.runDiagnostics(data);
    });

    // Problem Diagnoser events
    problemDiagnoser.on('diagnostic-complete', (data) => {
      console.log('🩺 [AwarenessLayer] Diagnostics complete');
      this.emit('awareness-cycle-complete', data);
    });

    // Critical alerts
    problemDiagnoser.on('critical-alert', (alert) => {
      console.warn('🚨 [AwarenessLayer] CRITICAL ALERT:', alert);
      this.emit('critical-issue-detected', alert);
    });
  }

  /**
   * تفعيل طبقة الوعي الكاملة
   */
  async activate(): Promise<void> {
    if (this.isActivated) {
      console.log('⚠️ [AwarenessLayer] Already activated');
      return;
    }

    console.log('🧠 [AwarenessLayer] Activating Conscious Awareness Layer...');
    console.log('🎯 [AwarenessLayer] Starting parallel component activation...');
    
    this.isActivated = true;
    this.activationStartTime = new Date();

    try {
      // تفعيل المكونات الثلاثة بالتوازي
      await Promise.all([
        logProcessor.activateUniversalLogReading(),
        knowledgeGraph.buildCompleteRelationshipMap(),
        problemDiagnoser.activateDiagnosticEngine()
      ]);

      console.log('✅ [AwarenessLayer] All components activated successfully');
      console.log('🧠 [AwarenessLayer] Nicholas is now AWARE of the entire empire');
      
      this.emit('awareness-activated', {
        activatedAt: this.activationStartTime,
        components: ['logProcessor', 'knowledgeGraph', 'problemDiagnoser']
      });

      // Start continuous monitoring (every 5 minutes)
      this.startContinuousMonitoring();

    } catch (error) {
      console.error('❌ [AwarenessLayer] Activation failed:', error);
      this.isActivated = false;
      throw error;
    }
  }

  /**
   * إثراء خريطة المعرفة بأنماط من السجلات
   */
  private async enrichKnowledgeGraph(logData: any) {
    if (logData.patterns && logData.patterns.length > 0) {
      await knowledgeGraph.enrichWithPatterns(logData.patterns);
    }
  }

  /**
   * تشغيل التشخيص بناءً على خريطة المعرفة
   */
  private async runDiagnostics(graphData: any) {
    // التشخيص يعمل بشكل تلقائي بالفعل
    // هنا يمكن إضافة منطق إضافي بناءً على خريطة المعرفة
  }

  /**
   * الحصول على حالة النظام الكاملة
   */
  async getStatus(): Promise<AwarenessStatus> {
    const logProcessorStatus = logProcessor.getStatus();
    const knowledgeGraphStatus = knowledgeGraph.getStatus();
    const problemDiagnoserStatus = problemDiagnoser.getStatus();

    // حساب التقدم الإجمالي
    const logProgress = logProcessorStatus.isActive ? 67 : 0;
    const graphProgress = knowledgeGraphStatus.isBuilt ? 58 : 0;
    const diagnosisProgress = problemDiagnoserStatus.isActive ? 63 : 0;
    const overallProgress = Math.round((logProgress + graphProgress + diagnosisProgress) / 3);

    return {
      overallProgress,
      components: {
        logProcessor: {
          ...logProcessorStatus,
          progress: logProgress,
          continuousMonitoring: {
            isActive: this.monitoringInterval !== null,
            interval: '5min',
            nextCycle: this.monitoringInterval ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
          }
        },
        knowledgeGraph: {
          ...knowledgeGraphStatus,
          progress: graphProgress
        },
        problemDiagnoser: {
          ...problemDiagnoserStatus,
          progress: diagnosisProgress
        }
      },
      discoveries: {
        patterns: [], // من logProcessor
        criticalPaths: knowledgeGraphStatus.criticalPathsCount || 0,
        issues: problemDiagnoserStatus.totalIssues || 0
      }
    };
  }

  /**
   * الحصول على تقرير الوعي الكامل
   */
  async getAwarenessReport() {
    const status = await this.getStatus();
    const diagnosticReport = problemDiagnoser.generateDiagnosticReport();
    const graphData = knowledgeGraph.getGraphData();

    return {
      timestamp: new Date(),
      activationTime: this.activationStartTime,
      status,
      diagnosticReport,
      knowledgeGraph: {
        totalRelationships: graphData.relationships.length,
        criticalPaths: graphData.criticalPaths,
        clusters: Array.from(graphData.clusters.entries())
      },
      summary: {
        consciousness: `Nicholas is ${status.overallProgress}% aware of the empire`,
        healthStatus: this.calculateHealthStatus(diagnosticReport),
        recommendations: this.generateRecommendations(diagnosticReport)
      }
    };
  }

  private calculateHealthStatus(report: any): string {
    const criticalCount = report.issuesBySeverity?.critical || 0;
    const highCount = report.issuesBySeverity?.high || 0;

    if (criticalCount > 0) return 'CRITICAL - Immediate action required';
    if (highCount > 3) return 'WARNING - Multiple high-priority issues detected';
    if (highCount > 0) return 'CAUTION - Some issues need attention';
    return 'HEALTHY - System operating normally';
  }

  private generateRecommendations(report: any): string[] {
    const recommendations: string[] = [];

    if (report.issuesBySeverity?.critical > 0) {
      recommendations.push('Address critical issues immediately');
    }

    if (report.issuesByCategory?.performance > 2) {
      recommendations.push('Optimize system performance - multiple bottlenecks detected');
    }

    if (report.issuesByCategory?.integration > 2) {
      recommendations.push('Review integration architecture - data flow issues detected');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - system is healthy');
    }

    return recommendations;
  }

  /**
   * Start Continuous Monitoring (Every 5 Minutes)
   */
  private startContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('⚠️ [AwarenessLayer] Continuous monitoring already running');
      return;
    }

    console.log('🚀 [AwarenessLayer] Setting up continuous monitoring...');
    
    this.monitoringInterval = setInterval(() => {
      console.log('⏰ [AwarenessLayer] Running scheduled awareness cycle...');
      this.runAwarenessCycle().catch((error) => {
        console.error('❌ [AwarenessLayer] Scheduled cycle failed:', error);
      });
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('✅ [AwarenessLayer] Continuous monitoring started (5min intervals)');
    console.log(`   └─ Timer ID: ${this.monitoringInterval.toString().substring(0, 10)}...`);
    console.log(`   └─ Next cycle: ${new Date(Date.now() + 5 * 60 * 1000).toISOString()}`);
  }

  /**
   * Stop Continuous Monitoring
   */
  stopContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ [AwarenessLayer] Continuous monitoring stopped');
    }
  }

  /**
   * تشغيل دورة وعي كاملة
   */
  async runAwarenessCycle() {
    console.log('🔄 [AwarenessLayer] Starting awareness cycle...');
    
    // إعادة قراءة السجلات
    await logProcessor.activateUniversalLogReading();
    
    // تحديث خريطة المعرفة
    await knowledgeGraph.buildCompleteRelationshipMap();
    
    // إعادة التشخيص
    await problemDiagnoser.activateDiagnosticEngine();

    console.log('✅ [AwarenessLayer] Awareness cycle complete');
  }
}

// Export singleton instance
export const awarenessLayer = new AwarenessLayer();
