/**
 * MEMORY CONSOLIDATION - دمج الذكريات واستخراج الأنماط
 * 
 * Consolidates memories, finds hidden patterns, and creates knowledge
 * 
 * Features:
 * - Automatic memory clustering
 * - Pattern discovery across memories
 * - Knowledge synthesis
 * - Sleep-like consolidation cycles
 */

import OpenAI from 'openai';

// ============================================
// Types & Interfaces
// ============================================

interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: Date;
  tags?: string[];
  metadata?: any;
}

interface MemoryCluster {
  id: string;
  theme: string;
  memories: string[]; // Memory IDs
  strength: number; // How strong is this cluster
  insights: string[];
  createdAt: Date;
}

interface DiscoveredPattern {
  id: string;
  pattern: string;
  evidence: string[];
  confidence: number;
  significance: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendation?: string;
}

interface ConsolidationCycle {
  cycleNumber: number;
  timestamp: Date;
  memoriesProcessed: number;
  clustersFormed: number;
  patternsDiscovered: number;
  insightsGenerated: number;
}

// ============================================
// Memory Consolidation System Class
// ============================================

export class MemoryConsolidationSystem {
  private active: boolean = false;
  private openai: OpenAI | null = null;
  private clusters: Map<string, MemoryCluster> = new Map();
  private discoveredPatterns: Map<string, DiscoveredPattern> = new Map();
  private consolidationHistory: ConsolidationCycle[] = [];
  private cycleCount: number = 0;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('[MemoryConsolidation] ✅ OpenAI provider initialized');
      }
    } catch (error: any) {
      console.error('[MemoryConsolidation] ❌ Failed to initialize:', error.message);
    }
  }

  /**
   * Activate Memory Consolidation
   */
  activate(): void {
    if (this.active) {
      console.log('[MemoryConsolidation] Already active');
      return;
    }

    this.active = true;
    console.log('🧩 [MemoryConsolidation] Memory consolidation activated');
    console.log(`   • Clustering similar memories`);
    console.log(`   • Discovering hidden patterns`);
    console.log(`   • Synthesizing knowledge`);
    
    // Start periodic consolidation cycles (like sleep)
    this.startConsolidationCycles();
  }

  /**
   * Deactivate Memory Consolidation
   */
  deactivate(): void {
    this.active = false;
    console.log('[MemoryConsolidation] Deactivated');
  }

  /**
   * Consolidate memories - like a sleep cycle for the brain
   */
  async consolidate(): Promise<void> {
    if (!this.active || !this.openai) return;

    this.cycleCount++;
    console.log(`\n💤 [MemoryConsolidation] Starting consolidation cycle #${this.cycleCount}`);

    try {
      // Get memories from Memory Hub
      const { memoryHub } = await import('../../nucleus/core/memory-hub');
      const memories = memoryHub.getAllInsights().map((m: any) => ({
        id: m.id,
        content: m.description,
        type: m.type,
        timestamp: new Date(m.recordedAt),
        tags: m.tags || [],
        metadata: m.context
      }));

      if (memories.length < 10) {
        console.log('   ⏭️ Not enough memories to consolidate (need 10+)');
        return;
      }

      console.log(`   📊 Processing ${memories.length} memories...`);

      // Step 1: Cluster similar memories
      const clusters = await this.clusterMemories(memories);
      console.log(`   🗂️ Formed ${clusters} clusters`);

      // Step 2: Discover patterns across clusters
      const patterns = await this.discoverPatterns();
      console.log(`   🔍 Discovered ${patterns} patterns`);

      // Step 3: Generate insights
      const insights = await this.generateInsights();
      console.log(`   💡 Generated ${insights} insights`);

      // Record cycle
      this.consolidationHistory.push({
        cycleNumber: this.cycleCount,
        timestamp: new Date(),
        memoriesProcessed: memories.length,
        clustersFormed: clusters,
        patternsDiscovered: patterns,
        insightsGenerated: insights
      });

      console.log(`✅ [MemoryConsolidation] Cycle #${this.cycleCount} complete\n`);
    } catch (error: any) {
      console.error('[MemoryConsolidation] Consolidation failed:', error.message);
    }
  }

  /**
   * Cluster similar memories together
   */
  private async clusterMemories(memories: Memory[]): Promise<number> {
    if (!this.openai || memories.length === 0) return 0;

    try {
      // Sample recent memories for clustering
      const recentMemories = memories.slice(-50);

      const prompt = `حلل هذه الذكريات واجمعها في مجموعات متشابهة:

${recentMemories.map((m, i) => `${i + 1}. [${m.type}] ${m.content}`).join('\n')}

اجمع الذكريات المتشابهة بصيغة JSON:
{
  "clusters": [
    {
      "theme": "موضوع المجموعة",
      "memoryIndices": [1, 5, 12],
      "strength": 0.85,
      "insights": ["insight 1", "insight 2"]
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.clusters && Array.isArray(parsed.clusters)) {
          parsed.clusters.forEach((c: any) => {
            const clusterId = this.generateClusterId(c.theme);
            
            const memoryIds = (c.memoryIndices || [])
              .map((idx: number) => recentMemories[idx - 1]?.id)
              .filter(Boolean);

            this.clusters.set(clusterId, {
              id: clusterId,
              theme: c.theme,
              memories: memoryIds,
              strength: c.strength || 0.5,
              insights: c.insights || [],
              createdAt: new Date()
            });
          });

          return parsed.clusters.length;
        }
      }

      return 0;
    } catch (error: any) {
      console.error('[MemoryConsolidation] Clustering failed:', error.message);
      return 0;
    }
  }

  /**
   * Discover patterns across clusters
   */
  private async discoverPatterns(): Promise<number> {
    if (!this.openai || this.clusters.size === 0) return 0;

    try {
      const clustersList = Array.from(this.clusters.values());

      const prompt = `اكتشف الأنماط المخفية في هذه المجموعات:

${clustersList.map((c, i) => `
${i + 1}. Theme: ${c.theme}
   Memories: ${c.memories.length}
   Insights: ${c.insights.join(', ')}
`).join('\n')}

اكتشف الأنماط بصيغة JSON:
{
  "patterns": [
    {
      "pattern": "وصف النمط",
      "evidence": ["دليل 1", "دليل 2"],
      "confidence": 0.8,
      "significance": "high",
      "actionable": true,
      "recommendation": "ماذا يجب فعله"
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 1200
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.patterns && Array.isArray(parsed.patterns)) {
          parsed.patterns.forEach((p: any) => {
            const patternId = this.generatePatternId(p.pattern);
            
            this.discoveredPatterns.set(patternId, {
              id: patternId,
              pattern: p.pattern,
              evidence: p.evidence || [],
              confidence: p.confidence || 0.5,
              significance: p.significance || 'medium',
              actionable: p.actionable || false,
              recommendation: p.recommendation
            });

            // Broadcast to Intelligence Distributor
            this.broadcastPattern(p);
          });

          return parsed.patterns.length;
        }
      }

      return 0;
    } catch (error: any) {
      console.error('[MemoryConsolidation] Pattern discovery failed:', error.message);
      return 0;
    }
  }

  /**
   * Broadcast discovered pattern to Intelligence Distributor
   */
  private broadcastPattern(pattern: any): void {
    try {
      const { intelligenceDistributor } = require('./distributor');
      intelligenceDistributor.emit('memory-consolidation:pattern', {
        pattern: pattern.pattern,
        confidence: pattern.confidence || 0.8,
        significance: pattern.significance || 'medium',
        actionable: pattern.actionable || false,
        recommendation: pattern.recommendation,
        timestamp: new Date()
      });
    } catch (error) {
      // Silent fail - distributor might not be active
    }
  }

  /**
   * Generate insights from patterns
   */
  private async generateInsights(): Promise<number> {
    if (!this.openai || this.discoveredPatterns.size === 0) return 0;

    try {
      const patterns = Array.from(this.discoveredPatterns.values())
        .filter(p => p.significance === 'high' && p.actionable);

      if (patterns.length === 0) return 0;

      // Store insights in Memory Hub
      const { memoryHub } = await import('../../nucleus/core/memory-hub');
      
      let insightCount = 0;
      for (const pattern of patterns) {
        memoryHub.recordInsight({
          type: 'pattern',
          description: `🧩 Pattern Discovered: ${pattern.pattern}`,
          confidence: pattern.confidence,
          sources: ['memory-consolidation'],
          evidence: {
            pattern: pattern.pattern,
            evidence: pattern.evidence,
            recommendation: pattern.recommendation,
            significance: pattern.significance
          }
        });
        insightCount++;
      }

      return insightCount;
    } catch (error: any) {
      console.error('[MemoryConsolidation] Insight generation failed:', error.message);
      return 0;
    }
  }

  /**
   * Start periodic consolidation cycles
   */
  private startConsolidationCycles(): void {
    // Run first cycle immediately (after 1 minute)
    setTimeout(async () => {
      if (this.active) await this.consolidate();
    }, 60000); // 1 minute

    // Then run consolidation every 10 minutes (like REM sleep)
    setInterval(async () => {
      if (!this.active) return;
      await this.consolidate();
    }, 10 * 60 * 1000); // 10 minutes
    
    console.log('   ⏰ Cycles: Initial (1min) → Every 10 minutes');
  }

  /**
   * Get consolidation insights
   */
  getInsights(): {
    totalClusters: number;
    totalPatterns: number;
    topPatterns: DiscoveredPattern[];
    recentCycles: ConsolidationCycle[];
  } {
    const topPatterns = Array.from(this.discoveredPatterns.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    return {
      totalClusters: this.clusters.size,
      totalPatterns: this.discoveredPatterns.size,
      topPatterns,
      recentCycles: this.consolidationHistory.slice(-5)
    };
  }

  /**
   * Generate cluster ID
   */
  private generateClusterId(theme: string): string {
    return theme.toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * Generate pattern ID
   */
  private generatePatternId(pattern: string): string {
    return pattern.toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      active: this.active,
      consolidationCycles: this.cycleCount,
      clusters: this.clusters.size,
      patterns: this.discoveredPatterns.size,
      aiProvider: this.openai ? 'OpenAI GPT-4o-mini' : 'None'
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const memoryConsolidation = new MemoryConsolidationSystem();
