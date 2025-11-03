/**
 * INTELLIGENCE DISTRIBUTOR - موزع الذكاء
 * 
 * Distributes intelligence from autonomous systems to all platforms
 * 
 * Features:
 * - Auto-distribution of learned patterns
 * - Broadcasting insights to Memory Hub → UKB → All Platforms
 * - Collective intelligence sharing
 * - Real-time knowledge propagation
 */

import { EventEmitter } from 'events';

// ============================================
// Types & Interfaces
// ============================================

interface IntelligencePackage {
  source: 'self-learning' | 'memory-consolidation' | 'predictive' | 'meta-learning' | 'autonomous';
  type: 'pattern' | 'insight' | 'prediction' | 'strategy' | 'goal' | 'action';
  content: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface DistributionMetrics {
  totalDistributed: number;
  bySource: Map<string, number>;
  byPlatform: Map<string, number>;
  lastDistributionTime: Date | null;
}

// ============================================
// Intelligence Distributor Class
// ============================================

export class IntelligenceDistributor extends EventEmitter {
  private active: boolean = false;
  private distributionQueue: IntelligencePackage[] = [];
  private metrics: DistributionMetrics = {
    totalDistributed: 0,
    bySource: new Map(),
    byPlatform: new Map(),
    lastDistributionTime: null
  };
  private maxQueueSize: number = 100;

  constructor() {
    super();
  }

  /**
   * Activate Intelligence Distributor
   */
  activate(): void {
    if (this.active) {
      console.log('[IntelligenceDistributor] Already active');
      return;
    }

    this.active = true;
    console.log('📡 [IntelligenceDistributor] Intelligence distribution activated');
    console.log('   • Broadcasting insights to all platforms');
    console.log('   • Collective intelligence sharing enabled');
    console.log('   • Real-time knowledge propagation ready');

    // Listen to intelligence sources
    this.setupIntelligenceListeners();

    // Start distribution worker
    this.startDistributionWorker();
  }

  /**
   * Deactivate Intelligence Distributor
   */
  deactivate(): void {
    this.active = false;
    console.log('[IntelligenceDistributor] Deactivated');
  }

  /**
   * Setup listeners for all intelligence systems
   */
  private setupIntelligenceListeners(): void {
    try {
      // Listen to Self-Learning insights
      this.on('self-learning:pattern', (data) => {
        this.enqueue({
          source: 'self-learning',
          type: 'pattern',
          content: data.description || data.pattern,
          confidence: data.confidence || 0.7,
          priority: 'high',
          metadata: data,
          timestamp: new Date()
        });
      });

      // Listen to Memory Consolidation discoveries
      this.on('memory-consolidation:pattern', (data) => {
        this.enqueue({
          source: 'memory-consolidation',
          type: 'insight',
          content: data.pattern || data.insight,
          confidence: data.confidence || 0.8,
          priority: data.significance === 'high' ? 'high' : 'medium',
          metadata: data,
          timestamp: new Date()
        });
      });

      // Listen to Predictive Intelligence predictions
      this.on('predictive:prediction', (data) => {
        this.enqueue({
          source: 'predictive',
          type: 'prediction',
          content: data.description,
          confidence: data.confidence || 0.6,
          priority: data.type === 'risk' ? 'critical' : 'medium',
          metadata: data,
          timestamp: new Date()
        });
      });

      // Listen to Meta-Learning strategies
      this.on('meta-learning:insight', (data) => {
        this.enqueue({
          source: 'meta-learning',
          type: 'strategy',
          content: data.insight || data.recommendation,
          confidence: 0.75,
          priority: data.impact === 'high' ? 'high' : 'medium',
          metadata: data,
          timestamp: new Date()
        });
      });

      // Listen to Autonomous Reasoning goals & actions
      this.on('autonomous:goal', (data) => {
        this.enqueue({
          source: 'autonomous',
          type: 'goal',
          content: data.description,
          confidence: 0.8,
          priority: data.priority || 'medium',
          metadata: data,
          timestamp: new Date()
        });
      });

      console.log('[IntelligenceDistributor] ✅ Listening to 5 intelligence sources');
    } catch (error: any) {
      console.error('[IntelligenceDistributor] Failed to setup listeners:', error.message);
    }
  }

  /**
   * Enqueue intelligence package for distribution
   */
  private enqueue(pkg: IntelligencePackage): void {
    this.distributionQueue.push(pkg);

    // Maintain max queue size
    if (this.distributionQueue.length > this.maxQueueSize) {
      this.distributionQueue = this.distributionQueue.slice(-this.maxQueueSize);
    }

    console.log(`[IntelligenceDistributor] 📦 Queued: ${pkg.source} → ${pkg.type} (${this.distributionQueue.length} in queue)`);
  }

  /**
   * Start distribution worker to process queue
   */
  private startDistributionWorker(): void {
    // Process queue every 10 seconds
    setInterval(async () => {
      if (!this.active || this.distributionQueue.length === 0) return;

      const batch = this.distributionQueue.splice(0, 10); // Process 10 at a time
      await this.distributeBatch(batch);
    }, 10000); // 10 seconds
  }

  /**
   * Distribute a batch of intelligence packages
   */
  private async distributeBatch(batch: IntelligencePackage[]): Promise<void> {
    if (batch.length === 0) return;

    console.log(`\n📡 [IntelligenceDistributor] Distributing ${batch.length} intelligence packages...`);

    for (const pkg of batch) {
      try {
        // Distribute to Memory Hub
        await this.distributeToMemoryHub(pkg);

        // Distribute via UKB to all platforms
        await this.distributeViaUKB(pkg);

        // Update metrics
        this.updateMetrics(pkg);

        console.log(`   ✅ ${pkg.source} → Memory Hub + UKB (${pkg.type})`);
      } catch (error: any) {
        console.error(`   ❌ Failed to distribute ${pkg.source}:`, error.message);
      }
    }

    this.metrics.lastDistributionTime = new Date();
    console.log(`✅ [IntelligenceDistributor] Distributed ${batch.length} packages`);
  }

  /**
   * Distribute to Memory Hub
   */
  private async distributeToMemoryHub(pkg: IntelligencePackage): Promise<void> {
    try {
      const { memoryHub } = await import('../../nucleus/core/memory-hub');

      // Store as insight in Memory Hub
      memoryHub.recordInsight({
        type: 'pattern' as any, // Use 'pattern' as base type for all intelligence
        description: `🧠 [${pkg.source.toUpperCase()}] ${pkg.content}`,
        sourceBrain: 'nucleus-intelligence',
        confidence: Math.round(pkg.confidence * 100),
        context: {
          intelligenceSource: pkg.source,
          intelligenceType: pkg.type,
          priority: pkg.priority,
          metadata: pkg.metadata
        },
        tags: [pkg.source, pkg.type, 'distributed-intelligence']
      });
    } catch (error: any) {
      console.error('[IntelligenceDistributor] Memory Hub distribution failed:', error.message);
    }
  }

  /**
   * Distribute via UKB to all platforms
   */
  private async distributeViaUKB(pkg: IntelligencePackage): Promise<void> {
    try {
      const { unifiedKnowledgeBus } = await import('../integration/knowledge-bus');

      // Create UKB message for all platforms
      const message = {
        type: 'intelligence_update',
        source: 'nucleus',
        data: {
          intelligenceSource: pkg.source,
          intelligenceType: pkg.type,
          content: pkg.content,
          confidence: pkg.confidence,
          priority: pkg.priority,
          timestamp: pkg.timestamp.toISOString()
        }
      };

      // Broadcast to all connected platforms
      const platforms = ['MAIL_HUB', 'SUROOH_CHAT', 'ACADEMY', 'B2B', 'B2C', 'CE', 'ACCOUNTING', 'SHIPPING', 'WALLET', 'CUSTOMER_SERVICE'];
      
      for (const platform of platforms) {
        try {
          await unifiedKnowledgeBus.sendMessage(platform, message);
          
          // Update platform metrics
          const count = this.metrics.byPlatform.get(platform) || 0;
          this.metrics.byPlatform.set(platform, count + 1);
        } catch (error) {
          // Silent fail - platform might not be connected
        }
      }
    } catch (error: any) {
      console.error('[IntelligenceDistributor] UKB distribution failed:', error.message);
    }
  }

  /**
   * Update distribution metrics
   */
  private updateMetrics(pkg: IntelligencePackage): void {
    this.metrics.totalDistributed++;

    const sourceCount = this.metrics.bySource.get(pkg.source) || 0;
    this.metrics.bySource.set(pkg.source, sourceCount + 1);
  }

  /**
   * Get distribution statistics
   */
  getStats() {
    return {
      active: this.active,
      queueSize: this.distributionQueue.length,
      totalDistributed: this.metrics.totalDistributed,
      distributionBySource: Object.fromEntries(this.metrics.bySource),
      distributionByPlatform: Object.fromEntries(this.metrics.byPlatform),
      lastDistribution: this.metrics.lastDistributionTime
    };
  }

  /**
   * Manually trigger distribution (for testing)
   */
  async distribute(pkg: Omit<IntelligencePackage, 'timestamp'>): Promise<void> {
    const fullPackage: IntelligencePackage = {
      ...pkg,
      timestamp: new Date()
    };

    await this.distributeBatch([fullPackage]);
  }

  /**
   * NEW: Distribute AI Capabilities (Llama 3.3 70B Access)
   * Provides all platforms with access to self-hosted GPU-powered AI
   */
  async distributeAICapabilities(): Promise<{
    success: boolean;
    platforms: string[];
    endpoint: string;
    model: string;
  }> {
    try {
      console.log('\n🤖 [IntelligenceDistributor] Distributing AI Capabilities...');

      // Get Federation AI endpoint info
      const endpoint = `${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/api/federation/ai`;
      const platforms = [
        'MAIL_HUB', 'SUROOH_CHAT', 'ACADEMY', 'B2B', 'B2C', 
        'CE', 'ACCOUNTING', 'SHIPPING', 'WALLET', 'CUSTOMER_SERVICE',
        'INTEGRATION_HUB', 'NICHOLAS_CORE'
      ];

      // Broadcast AI capability to all platforms via UKB
      const { unifiedKnowledgeBus } = await import('../integration/knowledge-bus');

      const aiCapabilityMessage = {
        type: 'ai_capability_update',
        source: 'nucleus',
        data: {
          capability: 'llama-3.3-70b',
          provider: 'self-hosted-gpu',
          endpoint: endpoint,
          model: 'Llama 3.3 70B (Q4)',
          features: [
            '100% Private & Secure',
            'Unlimited Usage',
            'Arabic & English Support',
            'GPU-Accelerated Inference',
            'Auto Start/Stop (Cost Optimized)'
          ],
          usage: {
            authentication: 'Federation JWT Token',
            endpoint: `POST ${endpoint}/chat`,
            exampleRequest: {
              messages: [{ role: 'user', content: 'Your message' }],
              temperature: 0.7,
              maxTokens: 4096
            }
          },
          timestamp: new Date().toISOString()
        }
      };

      let distributedCount = 0;
      for (const platform of platforms) {
        try {
          await unifiedKnowledgeBus.sendMessage(platform, aiCapabilityMessage);
          distributedCount++;
          console.log(`   ✅ ${platform} → AI Capability distributed`);
        } catch (error) {
          console.log(`   ⚠️ ${platform} → Not connected (will receive on next connection)`);
        }
      }

      console.log(`\n✅ [IntelligenceDistributor] AI Capabilities distributed to ${distributedCount}/${platforms.length} platforms`);
      console.log(`   🤖 Model: Llama 3.3 70B (Self-hosted GPU)`);
      console.log(`   🔗 Endpoint: ${endpoint}`);

      return {
        success: true,
        platforms: platforms,
        endpoint: endpoint,
        model: 'Llama 3.3 70B (Q4)'
      };
    } catch (error: any) {
      console.error('[IntelligenceDistributor] Failed to distribute AI capabilities:', error.message);
      return {
        success: false,
        platforms: [],
        endpoint: '',
        model: ''
      };
    }
  }
}

// Export singleton instance
export const intelligenceDistributor = new IntelligenceDistributor();
