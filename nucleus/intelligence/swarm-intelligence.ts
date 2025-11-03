/**
 * SWARM INTELLIGENCE LAYER - طبقة ذكاء السرب
 * 
 * Distributed decision-making across platforms:
 * - Weighted voting system for collective decisions
 * - Quorum-based consensus mechanism
 * - Cross-platform intelligence aggregation
 * - Conflict resolution through democratic voting
 * 
 * Features:
 * - Quorum: Minimum platforms required for decision
 * - Weighted Voting: Different platforms have different weights
 * - Timeout: Maximum time to wait for responses
 * - Consensus Tracking: Monitor agreement levels
 */

import { EventEmitter } from 'events';

interface SwarmConfig {
  quorum: number;
  voting: 'simple' | 'weighted' | 'unanimous';
  timeoutMs: number;
}

interface Platform {
  id: string;
  name: string;
  weight: number;
  status: 'active' | 'inactive' | 'responding';
}

interface Vote {
  platformId: string;
  decision: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

interface SwarmDecision {
  id: string;
  question: string;
  startTime: Date;
  endTime?: Date;
  votes: Vote[];
  result: 'approved' | 'rejected' | 'timeout' | 'pending';
  consensus: number;
  quorumReached: boolean;
  metadata: any;
}

class SwarmIntelligenceLayer extends EventEmitter {
  private active: boolean = false;
  private config: SwarmConfig = {
    quorum: 3,
    voting: 'weighted',
    timeoutMs: 1200
  };
  private platforms: Map<string, Platform> = new Map();
  private decisions: SwarmDecision[] = [];
  private pendingDecisions: Map<string, SwarmDecision> = new Map();

  activate(params?: Partial<SwarmConfig>): void {
    if (this.active) {
      console.log('[SwarmIntelligence] Already active');
      return;
    }

    if (params) {
      this.config = { ...this.config, ...params };
    }

    this.initializePlatforms();
    this.active = true;

    console.log('🐝 [SwarmIntelligence] Collective decision-making activated');
    console.log(`   • Quorum: ${this.config.quorum} platforms`);
    console.log(`   • Voting: ${this.config.voting}`);
    console.log(`   • Timeout: ${this.config.timeoutMs}ms`);
    console.log(`   • Platforms: ${this.platforms.size}`);

    this.emit('activated', {
      quorum: this.config.quorum,
      voting: this.config.voting,
      platforms: this.platforms.size
    });
  }

  private initializePlatforms(): void {
    const platformConfigs = [
      { id: 'mail-hub', name: 'Mail Hub', weight: 1.0 },
      { id: 'surooh-chat', name: 'Surooh Chat', weight: 1.2 },
      { id: 'academy', name: 'Surooh Academy', weight: 1.1 },
      { id: 'b2b', name: 'B2B Platform', weight: 0.9 },
      { id: 'b2c', name: 'B2C Platform', weight: 0.9 },
      { id: 'ce', name: 'CE Platform', weight: 0.8 },
      { id: 'accounting', name: 'Accounting', weight: 1.0 },
      { id: 'shipping', name: 'Shipping', weight: 0.7 },
      { id: 'wallet', name: 'Wallet', weight: 1.0 },
      { id: 'customer-service', name: 'Customer Service', weight: 1.1 }
    ];

    for (const config of platformConfigs) {
      this.platforms.set(config.id, {
        ...config,
        status: 'active'
      });
    }

    console.log(`[SwarmIntelligence] Initialized ${this.platforms.size} platforms`);
  }

  async proposeDecision(question: string, metadata: any = {}): Promise<string> {
    if (!this.active) {
      throw new Error('Swarm Intelligence not active');
    }

    const decision: SwarmDecision = {
      id: `swarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question,
      startTime: new Date(),
      votes: [],
      result: 'pending',
      consensus: 0,
      quorumReached: false,
      metadata
    };

    this.pendingDecisions.set(decision.id, decision);

    this.emit('decision-proposed', {
      id: decision.id,
      question
    });

    setTimeout(() => {
      this.finalizeDecision(decision.id);
    }, this.config.timeoutMs);

    return decision.id;
  }

  async castVote(decisionId: string, vote: Omit<Vote, 'timestamp'>): Promise<boolean> {
    const decision = this.pendingDecisions.get(decisionId);
    if (!decision) {
      throw new Error('Decision not found or already finalized');
    }

    const existingVote = decision.votes.find(v => v.platformId === vote.platformId);
    if (existingVote) {
      console.log(`[SwarmIntelligence] Platform ${vote.platformId} already voted`);
      return false;
    }

    decision.votes.push({
      ...vote,
      timestamp: new Date()
    });

    const platform = this.platforms.get(vote.platformId);
    if (platform) {
      platform.status = 'responding';
    }

    this.emit('vote-received', {
      decisionId,
      platformId: vote.platformId,
      decision: vote.decision
    });

    if (decision.votes.length >= this.config.quorum) {
      decision.quorumReached = true;
    }

    return true;
  }

  private finalizeDecision(decisionId: string): void {
    const decision = this.pendingDecisions.get(decisionId);
    if (!decision) return;

    if (decision.votes.length < this.config.quorum) {
      decision.result = 'timeout';
      decision.endTime = new Date();
      
      this.pendingDecisions.delete(decisionId);
      this.decisions.push(decision);
      
      this.emit('decision-timeout', {
        id: decisionId,
        votesReceived: decision.votes.length,
        quorumRequired: this.config.quorum
      });
      
      return;
    }

    const result = this.calculateResult(decision);
    decision.result = result.decision;
    decision.consensus = result.consensus;
    decision.endTime = new Date();

    this.pendingDecisions.delete(decisionId);
    this.decisions.push(decision);

    if (this.decisions.length > 100) {
      this.decisions.shift();
    }

    this.emit('decision-finalized', {
      id: decisionId,
      result: decision.result,
      consensus: decision.consensus,
      votes: decision.votes.length
    });

    console.log(`🐝 [SwarmIntelligence] Decision ${decisionId}: ${decision.result} (consensus: ${Math.round(decision.consensus * 100)}%)`);
  }

  private calculateResult(decision: SwarmDecision): { decision: 'approved' | 'rejected', consensus: number } {
    const { votes } = decision;

    if (this.config.voting === 'unanimous') {
      const allApprove = votes.every(v => v.decision === 'approve');
      const allReject = votes.every(v => v.decision === 'reject');
      return {
        decision: allApprove ? 'approved' : 'rejected',
        consensus: allApprove || allReject ? 1.0 : 0.0
      };
    }

    if (this.config.voting === 'weighted') {
      let totalWeight = 0;
      let approveWeight = 0;

      for (const vote of votes) {
        const platform = this.platforms.get(vote.platformId);
        const weight = platform ? platform.weight : 1.0;
        
        totalWeight += weight;
        
        if (vote.decision === 'approve') {
          approveWeight += weight * vote.confidence;
        }
      }

      const approveRatio = approveWeight / totalWeight;
      
      return {
        decision: approveRatio >= 0.5 ? 'approved' : 'rejected',
        consensus: approveRatio >= 0.5 ? approveRatio : (1 - approveRatio)
      };
    }

    const approveCount = votes.filter(v => v.decision === 'approve').length;
    const rejectCount = votes.filter(v => v.decision === 'reject').length;
    const totalVotes = votes.length;

    const approveRatio = approveCount / totalVotes;

    return {
      decision: approveCount > rejectCount ? 'approved' : 'rejected',
      consensus: approveCount > rejectCount ? approveRatio : (rejectCount / totalVotes)
    };
  }

  getStatus(): any {
    const activePlatforms = Array.from(this.platforms.values()).filter(p => p.status === 'active');
    const recentDecisions = this.decisions.slice(-10);
    const avgConsensus = recentDecisions.length > 0
      ? recentDecisions.reduce((sum, d) => sum + d.consensus, 0) / recentDecisions.length
      : 0;

    return {
      active: this.active,
      config: this.config,
      platforms: {
        total: this.platforms.size,
        active: activePlatforms.length,
        list: Array.from(this.platforms.values()).map(p => ({
          id: p.id,
          name: p.name,
          weight: p.weight,
          status: p.status
        }))
      },
      decisions: {
        total: this.decisions.length,
        pending: this.pendingDecisions.size,
        recent: recentDecisions.map(d => ({
          id: d.id,
          question: d.question.substring(0, 100),
          result: d.result,
          consensus: Math.round(d.consensus * 100) / 100,
          votes: d.votes.length,
          timestamp: d.startTime
        }))
      },
      stats: {
        averageConsensus: Math.round(avgConsensus * 100) / 100,
        quorumReached: recentDecisions.filter(d => d.quorumReached).length,
        timeouts: recentDecisions.filter(d => d.result === 'timeout').length
      }
    };
  }

  getDecision(id: string): SwarmDecision | null {
    return this.decisions.find(d => d.id === id) || 
           this.pendingDecisions.get(id) || 
           null;
  }

  getRecentDecisions(limit: number = 10): SwarmDecision[] {
    return this.decisions.slice(-limit);
  }

  getPlatforms(): Platform[] {
    return Array.from(this.platforms.values());
  }

  updatePlatformStatus(platformId: string, status: 'active' | 'inactive'): void {
    const platform = this.platforms.get(platformId);
    if (platform) {
      platform.status = status;
      this.emit('platform-status-changed', { platformId, status });
    }
  }

  configure(params: Partial<SwarmConfig>): void {
    this.config = { ...this.config, ...params };
    console.log(`[SwarmIntelligence] Configuration updated:`, this.config);
  }
}

export const swarmIntelligence = new SwarmIntelligenceLayer();
