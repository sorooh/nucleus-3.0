/**
 * Cognitive Orchestrator - Phase 9.8
 * المنسق الإدراكي الجماعي (Cognitive Hub)
 * 
 * المركز الإدراكي الذي يجمع القرارات من جميع النوى،
 * يحللها، يكتشف التعارضات والتوافقات،
 * ثم يعيد توزيع القرار النهائي إلى جميع النوى
 */

import crypto from 'crypto';
import { db } from '../db';
import { cognitiveConsensus } from '@shared/schema';
import { decisionGraphEngine, type NodeDecision } from './decision-graph-engine';
import { consensusResolver, type ConsensusMethod } from './consensus-resolver';
import { governanceEngine } from '../../nucleus/core/governance-engine';

/**
 * Orchestration Request
 */
export interface OrchestrationRequest {
  initiatorNode: string;
  decisionType: string;
  nodeDecisions: NodeDecision[];
  consensusMethod?: ConsensusMethod;
  requiresGovernance?: boolean;
}

/**
 * Orchestration Result
 */
export interface OrchestrationResult {
  consensusId: string;
  status: 'approved' | 'review_required' | 'rejected';
  agreementRatio: number;
  finalDecision: any;
  finalConfidence: number;
  checksum: string;
  participatingNodes: string[];
  conflictLevel: number;
  coherenceScore: number;
  governanceApproved: boolean;
  reviewReason?: string;
  recommendations: string[];
  createdAt: string;
}

/**
 * Cognitive Orchestrator Class
 */
export class CognitiveOrchestrator {
  private config = {
    minNodes: 2, // Minimum nodes required for consensus
    maxDecisionAge: 5 * 60 * 1000, // 5 minutes max age for decisions
    autoApproveThreshold: 0.8, // Auto-approve if agreement >= 80%
    governanceThreshold: 0.5 // Require governance if conflict >= 50%
  };

  constructor() {
    console.log('[CognitiveOrchestrator] Initialized');
  }

  /**
   * Orchestrate consensus from multiple node decisions
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    console.log('\n' + '='.repeat(70));
    console.log('[CognitiveOrchestrator] 🧬 Starting cognitive orchestration...');
    console.log('='.repeat(70));
    console.log(`Initiator: ${request.initiatorNode}`);
    console.log(`Decision Type: ${request.decisionType}`);
    console.log(`Participating Nodes: ${request.nodeDecisions.length}`);
    
    const startTime = Date.now();
    
    // Validate request
    this.validateRequest(request);
    
    // Generate consensus ID
    const consensusId = this.generateConsensusId();
    
    // Step 1: Build decision graph
    console.log('\n[Step 1] Building decision graph...');
    const graph = decisionGraphEngine.buildGraph(request.nodeDecisions);
    
    // Step 2: Analyze graph
    console.log('[Step 2] Analyzing relationships and conflicts...');
    const graphAnalysis = decisionGraphEngine.analyzeGraph(graph);
    
    console.log(`  Conflict Level: ${(graphAnalysis.conflictLevel * 100).toFixed(1)}%`);
    console.log(`  Coherence Score: ${(graphAnalysis.coherenceScore * 100).toFixed(1)}%`);
    console.log(`  Interconnections: ${graph.interconnections}`);
    
    // Step 3: Resolve consensus
    console.log('[Step 3] Resolving consensus...');
    const consensusMethod = request.consensusMethod || 'weighted-vote';
    const consensusResult = await consensusResolver.resolveConsensus(
      graphAnalysis,
      consensusMethod
    );
    
    console.log(`  Agreement Ratio: ${(consensusResult.agreementRatio * 100).toFixed(1)}%`);
    console.log(`  Final Confidence: ${consensusResult.finalConfidence.toFixed(2)}`);
    console.log(`  Status: ${consensusResult.status}`);
    
    // Step 4: Governance check
    console.log('[Step 4] Checking governance requirements...');
    let governanceApproved = false;
    let reviewReason = consensusResult.reviewReason;
    
    const requiresGovernance = 
      request.requiresGovernance ||
      graphAnalysis.conflictLevel >= this.config.governanceThreshold ||
      consensusResult.status === 'review_required';
    
    if (requiresGovernance) {
      const governanceDecision = governanceEngine.submitDecision(
        request.initiatorNode,
        `orchestrate_${request.decisionType}`,
        {
          consensusId,
          agreementRatio: consensusResult.agreementRatio,
          conflictLevel: graphAnalysis.conflictLevel,
          participatingNodes: request.nodeDecisions.map(d => d.nodeId)
        }
      );
      
      governanceApproved = governanceDecision.status === 'approved';
      
      if (!governanceApproved) {
        reviewReason = governanceDecision.reason || 'Governance approval required';
      }
      
      console.log(`  Governance: ${governanceApproved ? 'Approved' : 'Review Required'}`);
    } else {
      // Auto-approve if high agreement and low conflict
      governanceApproved = 
        consensusResult.agreementRatio >= this.config.autoApproveThreshold &&
        graphAnalysis.conflictLevel < 0.3;
      
      console.log(`  Governance: Auto-${governanceApproved ? 'Approved' : 'Review Required'}`);
    }
    
    // Determine final status
    let finalStatus: 'approved' | 'review_required' | 'rejected' = consensusResult.status;
    
    if (governanceApproved && consensusResult.status === 'review_required') {
      finalStatus = 'approved'; // Governance override
    } else if (!governanceApproved && consensusResult.status === 'approved') {
      finalStatus = 'review_required'; // Governance requires review
    }
    
    // Step 5: Store consensus in database
    console.log('[Step 5] Storing consensus...');
    const stored = await this.storeConsensus({
      consensusId,
      decisionType: request.decisionType,
      initiatorNode: request.initiatorNode,
      participatingNodes: request.nodeDecisions.map(d => d.nodeId),
      graph,
      nodeDecisions: request.nodeDecisions,
      agreementRatio: consensusResult.agreementRatio,
      conflictLevel: graphAnalysis.conflictLevel,
      consensusMethod,
      finalDecision: consensusResult.finalDecision,
      finalConfidence: consensusResult.finalConfidence,
      checksum: consensusResult.checksum,
      status: finalStatus,
      reviewReason,
      governanceApproved,
      votingResults: consensusResult.votingResults
    });
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Orchestration completed in ${duration}ms`);
    console.log('='.repeat(70) + '\n');
    
    return {
      consensusId,
      status: finalStatus,
      agreementRatio: consensusResult.agreementRatio,
      finalDecision: consensusResult.finalDecision,
      finalConfidence: consensusResult.finalConfidence,
      checksum: consensusResult.checksum,
      participatingNodes: request.nodeDecisions.map(d => d.nodeId),
      conflictLevel: graphAnalysis.conflictLevel,
      coherenceScore: graphAnalysis.coherenceScore,
      governanceApproved,
      reviewReason,
      recommendations: graphAnalysis.recommendations,
      createdAt: stored.createdAt?.toISOString() || new Date().toISOString()
    };
  }

  /**
   * Validate orchestration request
   */
  private validateRequest(request: OrchestrationRequest): void {
    if (!request.initiatorNode) {
      throw new Error('Initiator node is required');
    }
    
    if (!request.decisionType) {
      throw new Error('Decision type is required');
    }
    
    if (!request.nodeDecisions || request.nodeDecisions.length < this.config.minNodes) {
      throw new Error(`At least ${this.config.minNodes} node decisions required`);
    }
    
    // Validate each node decision
    for (const decision of request.nodeDecisions) {
      if (!decision.nodeId) {
        throw new Error('Node ID is required for all decisions');
      }
      
      if (decision.confidence < 0 || decision.confidence > 1) {
        throw new Error(`Invalid confidence for node ${decision.nodeId}: must be between 0 and 1`);
      }
      
      if (decision.expectedImpact < 0 || decision.expectedImpact > 1) {
        throw new Error(`Invalid expected impact for node ${decision.nodeId}: must be between 0 and 1`);
      }
    }
  }

  /**
   * Generate unique consensus ID
   */
  private generateConsensusId(): string {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(4).toString('hex');
    return `consensus-${timestamp}-${randomHash}`;
  }

  /**
   * Store consensus in database
   */
  private async storeConsensus(data: {
    consensusId: string;
    decisionType: string;
    initiatorNode: string;
    participatingNodes: string[];
    graph: any;
    nodeDecisions: NodeDecision[];
    agreementRatio: number;
    conflictLevel: number;
    consensusMethod: ConsensusMethod;
    finalDecision: any;
    finalConfidence: number;
    checksum: string;
    status: string;
    reviewReason?: string;
    governanceApproved: boolean;
    votingResults: any;
  }) {
    const [consensus] = await db
      .insert(cognitiveConsensus)
      .values({
        consensusId: data.consensusId,
        decisionType: data.decisionType,
        initiatorNode: data.initiatorNode,
        participatingNodes: data.participatingNodes,
        decisionGraph: data.graph,
        nodeDecisions: data.nodeDecisions,
        agreementRatio: data.agreementRatio,
        conflictLevel: data.conflictLevel,
        consensusMethod: data.consensusMethod,
        finalDecision: data.finalDecision,
        finalConfidence: data.finalConfidence,
        checksum: data.checksum,
        status: data.status,
        reviewReason: data.reviewReason,
        expectedImpact: 0.5, // Default, can be calculated from graph
        governanceApproved: data.governanceApproved ? 1 : 0,
        consensusReachedAt: new Date(),
      })
      .returning();
    
    console.log(`[CognitiveOrchestrator] Consensus stored: ${data.consensusId}`);
    
    return consensus;
  }

  /**
   * Get consensus by ID
   */
  async getConsensus(consensusId: string) {
    const [consensus] = await db
      .select()
      .from(cognitiveConsensus)
      .where((table) => table.consensusId === consensusId)
      .limit(1);
    
    return consensus || null;
  }

  /**
   * Update consensus status (after execution/broadcast)
   */
  async updateConsensusStatus(
    consensusId: string,
    updates: {
      status?: string;
      executionResults?: any;
      actualImpact?: number;
      performanceGain?: number;
      broadcastStatus?: string;
      broadcastedTo?: string[];
      broadcastAcknowledgments?: any;
    }
  ) {
    const [updated] = await db
      .update(cognitiveConsensus)
      .set({
        ...updates,
        executedAt: updates.status === 'executed' ? new Date() : undefined,
        broadcastedAt: updates.broadcastStatus === 'completed' ? new Date() : undefined,
      })
      .where((table) => table.consensusId === consensusId)
      .returning();
    
    console.log(`[CognitiveOrchestrator] Consensus updated: ${consensusId}`);
    
    return updated;
  }

  /**
   * Get recent consensus decisions
   */
  async getRecentConsensus(limit: number = 10) {
    const results = await db
      .select()
      .from(cognitiveConsensus)
      .orderBy((table) => table.createdAt)
      .limit(limit);
    
    return results;
  }

  /**
   * Get consensus statistics
   */
  async getStatistics() {
    const all = await db.select().from(cognitiveConsensus);
    
    const approved = all.filter(c => c.status === 'approved').length;
    const reviewRequired = all.filter(c => c.status === 'review_required').length;
    const rejected = all.filter(c => c.status === 'rejected').length;
    
    const avgAgreement = all.length > 0
      ? all.reduce((sum, c) => sum + c.agreementRatio, 0) / all.length
      : 0;
    
    const avgConflict = all.length > 0
      ? all.reduce((sum, c) => sum + c.conflictLevel, 0) / all.length
      : 0;
    
    return {
      total: all.length,
      approved,
      reviewRequired,
      rejected,
      avgAgreementRatio: avgAgreement,
      avgConflictLevel: avgConflict,
      governanceApprovedCount: all.filter(c => c.governanceApproved === 1).length
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    console.log('[CognitiveOrchestrator] Configuration updated:', this.config);
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export const cognitiveOrchestrator = new CognitiveOrchestrator();

console.log('[CognitiveOrchestrator] Module loaded');
