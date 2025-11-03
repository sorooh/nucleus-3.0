/**
 * Log Processor - قارئ السجلات الشامل
 * Phase 3.2 → 5.0: Conscious Awareness Layer
 * 
 * يقرأ ويحلل سجلات جميع الـ21 nucleus في النظام
 */

import { EventEmitter } from 'events';

interface ServiceLog {
  nucleusId: string;
  nucleusName: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
}

interface LogAnalysis {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  patterns: string[];
  anomalies: string[];
}

export class LogProcessor extends EventEmitter {
  private nucleiList: string[] = [
    // Core Services
    'nicholas', 'side', 'customer-service', 'accounting',
    'mail-hub', 'marketing', 'ssl-certs', 'wallet',
    'legal-docs', 'chat',
    
    // Stores
    'b2b-store', 'b2c-store', 'academy',
    
    // Intelligence
    'ai-brain', 'knowledge-feed',
    
    // Operations
    'procurement', 'shipping', 'secretary',
    
    // Development
    'crawler'
  ];

  private logs: Map<string, ServiceLog[]> = new Map();
  private isActive: boolean = false;

  constructor() {
    super();
    console.log('🔍 [LogProcessor] Initializing Universal Log Reading System...');
    this.initializeLogStorage();
  }

  private initializeLogStorage() {
    // Initialize storage for each nucleus
    this.nucleiList.forEach(nucleusId => {
      this.logs.set(nucleusId, []);
    });
  }

  /**
   * تفعيل قراءة سجلات جميع التطبيقات
   */
  async activateUniversalLogReading(): Promise<void> {
    console.log('🔍 [LogProcessor] Activating universal log reading for 21 nuclei...');
    this.isActive = true;

    try {
      // قراءة سجلات الخدمات الأساسية
      const coreLogs = await this.readCoreLogs();
      
      // قراءة سجلات المتاجر
      const storeLogs = await this.readStoresLogs();
      
      // قراءة سجلات الذكاء
      const intelligenceLogs = await this.readIntelligenceLogs();
      
      // قراءة سجلات العمليات
      const operationsLogs = await this.readOperationsLogs();
      
      // قراءة سجلات التطوير
      const developmentLogs = await this.readDevelopmentLogs();
      
      // تحليل الأنماط
      const patterns = await this.analyzeBehaviorPatterns();

      this.emit('reading-complete', {
        coreLogs,
        storeLogs,
        intelligenceLogs,
        operationsLogs,
        developmentLogs,
        patterns,
        timestamp: new Date()
      });

      console.log('✅ [LogProcessor] Universal log reading activated successfully');
    } catch (error) {
      console.error('❌ [LogProcessor] Error during log reading:', error);
      this.emit('reading-error', error);
    }
  }

  private async readCoreLogs(): Promise<Map<string, ServiceLog[]>> {
    const coreServices = [
      'nicholas', 'side', 'customer-service', 'accounting',
      'mail-hub', 'marketing', 'ssl-certs', 'wallet',
      'legal-docs', 'chat'
    ];

    const results = new Map<string, ServiceLog[]>();

    for (const service of coreServices) {
      const logs = await this.processServiceLogs(service);
      results.set(service, logs);
    }

    console.log(`📊 [LogProcessor] Read ${results.size} core services logs`);
    return results;
  }

  private async readStoresLogs(): Promise<Map<string, ServiceLog[]>> {
    const stores = ['b2b-store', 'b2c-store', 'academy'];
    const results = new Map<string, ServiceLog[]>();

    for (const store of stores) {
      const logs = await this.processServiceLogs(store);
      results.set(store, logs);
    }

    console.log(`🏪 [LogProcessor] Read ${results.size} store logs`);
    return results;
  }

  private async readIntelligenceLogs(): Promise<Map<string, ServiceLog[]>> {
    const intelligence = ['ai-brain', 'knowledge-feed'];
    const results = new Map<string, ServiceLog[]>();

    for (const service of intelligence) {
      const logs = await this.processServiceLogs(service);
      results.set(service, logs);
    }

    console.log(`🧠 [LogProcessor] Read ${results.size} intelligence system logs`);
    return results;
  }

  private async readOperationsLogs(): Promise<Map<string, ServiceLog[]>> {
    const operations = ['procurement', 'shipping', 'secretary'];
    const results = new Map<string, ServiceLog[]>();

    for (const service of operations) {
      const logs = await this.processServiceLogs(service);
      results.set(service, logs);
    }

    console.log(`📦 [LogProcessor] Read ${results.size} operations logs`);
    return results;
  }

  private async readDevelopmentLogs(): Promise<Map<string, ServiceLog[]>> {
    const development = ['crawler'];
    const results = new Map<string, ServiceLog[]>();

    for (const service of development) {
      const logs = await this.processServiceLogs(service);
      results.set(service, logs);
    }

    console.log(`💻 [LogProcessor] Read ${results.size} development system logs`);
    return results;
  }

  private async processServiceLogs(nucleusId: string): Promise<ServiceLog[]> {
    const logs: ServiceLog[] = [];
    const nucleusName = this.getNucleusName(nucleusId);

    try {
      // قراءة insights من Memory Hub للـnucleus هذا
      const { memoryHub } = await import('../../../nucleus/core/memory-hub');
      const status = memoryHub.getStatus();
      
      if (status.active) {
        // Get recent insights
        const recentInsights = Array.from((memoryHub as any)['insightMemories'].values())
          .filter((insight: any) => {
            const sources = insight.sources || [];
            return sources.some((s: string) => s.toLowerCase().includes(nucleusId.toLowerCase()));
          })
          .slice(0, 10);

        for (const insight of recentInsights) {
          const ins = insight as any;
          logs.push({
            nucleusId,
            nucleusName,
            timestamp: new Date(ins.timestamp),
            level: ins.confidence > 0.7 ? 'info' : 'warn',
            message: `Insight: ${ins.description}`,
            context: { 
              type: ins.type, 
              confidence: ins.confidence,
              sources: ins.sources 
            }
          });
        }

        // Get recent decisions
        const recentDecisions = Array.from((memoryHub as any)['decisionMemories'].values())
          .filter((decision: any) => decision.sourceBrain === nucleusId)
          .slice(0, 10);

        for (const decision of recentDecisions) {
          const dec = decision as any;
          logs.push({
            nucleusId,
            nucleusName,
            timestamp: new Date(dec.timestamp),
            level: dec.outcome === 'failure' ? 'error' : 'info',
            message: `Decision: ${dec.decisionType} - ${dec.outcome}`,
            context: {
              decisionType: dec.decisionType,
              outcome: dec.outcome,
              impact: dec.impact
            }
          });
        }
      }

      // إذا لم نجد logs، نضيف log واحد للتأكيد أن النظام يعمل
      if (logs.length === 0) {
        logs.push({
          nucleusId,
          nucleusName,
          timestamp: new Date(),
          level: 'info',
          message: `${nucleusName} - No recent activity`,
          context: { status: 'idle' }
        });
      }

      // Store logs in memory
      this.logs.set(nucleusId, logs);

    } catch (error) {
      console.error(`[LogProcessor] Error reading logs for ${nucleusId}:`, error);
      logs.push({
        nucleusId,
        nucleusName,
        timestamp: new Date(),
        level: 'error',
        message: `Error reading logs: ${error}`,
        context: { error: String(error) }
      });
    }

    return logs;
  }

  private async analyzeBehaviorPatterns(): Promise<string[]> {
    const patterns: string[] = [];

    // تحليل أنماط السلوك عبر جميع السجلات
    this.logs.forEach((logs, nucleusId) => {
      const errorLogs = logs.filter(log => log.level === 'error');
      
      if (errorLogs.length > 10) {
        patterns.push(`${nucleusId}: High error rate detected`);
      }
    });

    console.log(`🔍 [LogProcessor] Detected ${patterns.length} behavior patterns`);
    return patterns;
  }

  /**
   * تحليل السجلات وإنتاج تقرير
   */
  async analyzeAllLogs(): Promise<LogAnalysis> {
    let totalLogs = 0;
    let errorCount = 0;
    let warningCount = 0;
    const patterns: string[] = [];
    const anomalies: string[] = [];

    this.logs.forEach((logs, nucleusId) => {
      totalLogs += logs.length;
      errorCount += logs.filter(log => log.level === 'error').length;
      warningCount += logs.filter(log => log.level === 'warn').length;
    });

    return {
      totalLogs,
      errorCount,
      warningCount,
      patterns,
      anomalies
    };
  }

  private getNucleusName(nucleusId: string): string {
    const names: Record<string, string> = {
      'nicholas': 'Nicholas 3.2',
      'side': 'SIDE Core',
      'customer-service': 'Customer Service',
      'accounting': 'Accounting & Billing',
      'mail-hub': 'Email Hub',
      'marketing': 'Marketing & Media',
      'ssl-certs': 'SSL Certificates',
      'wallet': 'Loyalty Wallet',
      'legal-docs': 'Legal Documents',
      'chat': 'Live Chat',
      'b2b-store': 'B2B Store',
      'b2c-store': 'B2C Store',
      'academy': 'Academy',
      'ai-brain': 'AI Brain',
      'knowledge-feed': 'Knowledge Feed',
      'procurement': 'Procurement',
      'secretary': 'Secretary',
      'crawler': 'Crawler'
    };

    return names[nucleusId] || nucleusId;
  }

  /**
   * Get current status
   */
  getStatus() {
    const totalLogs = Array.from(this.logs.values())
      .reduce((sum, logs) => sum + logs.length, 0);
    
    return {
      isActive: this.isActive,
      nucleiCount: this.nucleiList.length,
      totalLogsCollected: totalLogs,
      progress: this.isActive && totalLogs > 0 ? 
        Math.min(100, Math.floor((totalLogs / this.nucleiList.length) * 5)) : 0
    };
  }
}

// Export singleton instance
export const logProcessor = new LogProcessor();
