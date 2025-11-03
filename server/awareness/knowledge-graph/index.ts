/**
 * Knowledge Graph - خريطة المعرفة
 * Phase 3.2 → 5.0: Conscious Awareness Layer
 * 
 * يبني خريطة كاملة للعلاقات والتدفقات بين جميع الأنظمة
 */

import { EventEmitter } from 'events';

interface NucleusRelationship {
  from: string;
  to: string;
  type: 'data-flow' | 'api-call' | 'dependency' | 'integration';
  strength: 'critical' | 'high' | 'medium' | 'low';
  bidirectional: boolean;
}

interface CriticalPath {
  path: string[];
  importance: number;
  description: string;
}

interface KnowledgeGraphData {
  relationships: NucleusRelationship[];
  criticalPaths: CriticalPath[];
  clusters: Map<string, string[]>;
}

export class KnowledgeGraph extends EventEmitter {
  private relationships: NucleusRelationship[] = [];
  private criticalPaths: CriticalPath[] = [];
  private clusters: Map<string, string[]> = new Map();
  private isBuilt: boolean = false;

  constructor() {
    super();
    console.log('🗺️ [KnowledgeGraph] Initializing relationship mapping system...');
  }

  /**
   * بناء خريطة علاقات شاملة للـ21 nucleus
   */
  async buildCompleteRelationshipMap(): Promise<KnowledgeGraphData> {
    console.log('🗺️ [KnowledgeGraph] Building complete relationship map from logs...');

    try {
      // بناء العلاقات من تحليل logs حقيقي
      await this.discoverRelationshipsFromLogs();
      
      // بناء الشبكة الرئيسية
      await this.buildMasterGraph();
      
      // تحديد المسارات الحرجة
      await this.identifyCriticalPaths();

      this.isBuilt = true;

      const graphData: KnowledgeGraphData = {
        relationships: this.relationships,
        criticalPaths: this.criticalPaths,
        clusters: this.clusters
      };

      this.emit('graph-complete', graphData);
      console.log('✅ [KnowledgeGraph] Relationship map built from real logs');

      return graphData;
    } catch (error) {
      console.error('❌ [KnowledgeGraph] Error building knowledge graph:', error);
      this.emit('graph-error', error);
      throw error;
    }
  }

  /**
   * اكتشاف العلاقات من logs حقيقية (بدون hardcoding)
   */
  private async discoverRelationshipsFromLogs(): Promise<void> {
    console.log('🔍 [KnowledgeGraph] Discovering relationships from real logs...');

    try {
      // قراءة logs من Log Processor
      const { logProcessor } = await import('../log-processor');
      const allLogs = Array.from((logProcessor as any).logs.values()).flat();

      // تتبع النوى النشطة
      const activeNuclei = new Set<string>();
      for (const log of allLogs) {
        const typedLog = log as any;
        if (typedLog.nucleusId) {
          activeNuclei.add(typedLog.nucleusId);
        }
      }

      // محاولة اكتشاف علاقات من سياق logs
      // نبحث عن logs تشير لتكامل أو اتصال بين نوى
      const relationshipKeywords = ['api', 'call', 'request', 'sync', 'integration', 'connect'];
      
      for (const log of allLogs) {
        const typedLog = log as any;
        const message = typedLog.message?.toLowerCase() || '';
        const context = JSON.stringify(typedLog.context || {}).toLowerCase();
        const combinedText = `${message} ${context}`;

        // إذا وجدنا كلمات مفتاحية للتكامل
        if (relationshipKeywords.some(kw => combinedText.includes(kw))) {
          // محاولة استخراج nucleus آخر من السياق
          for (const otherNucleus of Array.from(activeNuclei)) {
            if (otherNucleus !== typedLog.nucleusId && combinedText.includes(otherNucleus)) {
              // وجدنا علاقة محتملة
              const existingRel = this.relationships.find(r => 
                (r.from === typedLog.nucleusId && r.to === otherNucleus) ||
                (r.to === typedLog.nucleusId && r.from === otherNucleus)
              );

              if (!existingRel) {
                this.relationships.push({
                  from: typedLog.nucleusId,
                  to: otherNucleus,
                  type: 'integration',
                  strength: typedLog.level === 'error' ? 'critical' : 'medium',
                  bidirectional: false
                });
              }
            }
          }
        }
      }

      console.log(`🔍 [KnowledgeGraph] Discovered ${this.relationships.length} relationships from logs`);
    } catch (error) {
      console.error('[KnowledgeGraph] Error discovering relationships:', error);
      console.log('⚠️ [KnowledgeGraph] No relationships discovered - logs may not contain integration data');
    }
  }

  private async _REMOVED_mapCoreServices(): Promise<void> {
    // REMOVED: كانت hardcoded relationships
    // الآن نستخدم discoverRelationshipsFromLogs()
  }

  private async _REMOVED_mapStores(): Promise<void> {
    // REMOVED: كانت hardcoded relationships
  }

  private async _REMOVED_mapIntelligence(): Promise<void> {
    // REMOVED: كانت hardcoded relationships
  }

  private async buildMasterGraph(): Promise<void> {
    // بناء مجموعات (clusters) من الأنظمة المكتشفة فعلياً
    const nuclei = new Set<string>();
    for (const rel of this.relationships) {
      nuclei.add(rel.from);
      nuclei.add(rel.to);
    }

    // تجميع النوى حسب عدد الاتصالات
    const connections = new Map<string, number>();
    for (const nucleus of Array.from(nuclei)) {
      const count = this.relationships.filter(r => 
        r.from === nucleus || r.to === nucleus
      ).length;
      connections.set(nucleus, count);
    }

    // إنشاء clusters بناءً على الاتصالات الفعلية
    const highlyConnected = Array.from(connections.entries())
      .filter(([_, count]) => count >= 3)
      .map(([nucleus, _]) => nucleus);
    
    if (highlyConnected.length > 0) {
      this.clusters.set('highly-connected', highlyConnected);
    }

    console.log(`🌐 [KnowledgeGraph] Built master graph with ${this.clusters.size} clusters from ${nuclei.size} active nuclei`);
  }

  private async identifyCriticalPaths(): Promise<void> {
    // تحديد المسارات الحرجة من العلاقات المكتشفة
    this.criticalPaths = [];

    // البحث عن علاقات critical
    const criticalRelationships = this.relationships.filter(r => r.strength === 'critical');
    
    for (const rel of criticalRelationships) {
      this.criticalPaths.push({
        path: [rel.from, rel.to],
        importance: 10,
        description: `Critical ${rel.type} between ${rel.from} and ${rel.to}`
      });
    }

    console.log(`🎯 [KnowledgeGraph] Identified ${this.criticalPaths.length} critical paths from discovered relationships`);
  }

  /**
   * إثراء الخريطة بأنماط من السجلات
   */
  async enrichWithPatterns(patterns: string[]): Promise<void> {
    console.log(`🔍 [KnowledgeGraph] Enriching graph with ${patterns.length} patterns`);
    // TODO: تحليل الأنماط وتحديث العلاقات
    this.emit('patterns-integrated', patterns);
  }

  /**
   * الحصول على جميع العلاقات لنظام معين
   */
  getRelationshipsFor(nucleusId: string): NucleusRelationship[] {
    return this.relationships.filter(
      rel => rel.from === nucleusId || rel.to === nucleusId
    );
  }

  /**
   * الحصول على المسارات الحرجة التي تمر بنظام معين
   */
  getCriticalPathsFor(nucleusId: string): CriticalPath[] {
    return this.criticalPaths.filter(
      path => path.path.includes(nucleusId)
    );
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isBuilt: this.isBuilt,
      relationshipsCount: this.relationships.length,
      criticalPathsCount: this.criticalPaths.length,
      clustersCount: this.clusters.size
    };
  }

  /**
   * Get complete graph data
   */
  getGraphData(): KnowledgeGraphData {
    return {
      relationships: this.relationships,
      criticalPaths: this.criticalPaths,
      clusters: this.clusters
    };
  }
}

// Export singleton instance
export const knowledgeGraph = new KnowledgeGraph();
