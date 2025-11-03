/**
 * Consensus Resolver - Phase 9.8
 * محلل التوافق الجماعي
 * 
 * يحسب اتفاق النوى (Agreement Ratio) ويختار القرار النهائي
 * - Agreement ≥ 70% → القرار يُعتمد تلقائيًا
 * - Agreement < 70% → يُرسل للمراجعة اليدوية (CPE/TAG)
 */

import crypto from 'crypto';
import type { NodeDecision } from './decision-graph-engine';
import type { GraphAnalysisResult } from './decision-graph-engine';

/**
 * Consensus Method Types
 */
export type ConsensusMethod = 'weighted-vote' | 'unanimous' | 'majority' | 'quorum';

/**
 * Consensus Result
 */
export interface ConsensusResult {
  consensusReached: boolean;
  agreementRatio: number; // 0.0 - 1.0
  consensusMethod: ConsensusMethod;
  finalDecision: any;
  finalConfidence: number;
  checksum: string;
  votingResults: {
    [nodeId: string]: {
      vote: 'approve' | 'reject' | 'abstain';
      weight: number;
    };
  };
  status: 'approved' | 'review_required' | 'rejected';
  reviewReason?: string;
  timestamp: string;
}

/**
 * Consensus Configuration
 */
interface ConsensusConfig {
  approvalThreshold: number; // 0.7 = 70%
  unanimousRequired: boolean;
  quorumPercentage: number; // Minimum participation required
  weightByConfidence: boolean;
  weightByImpact: boolean;
}

/**
 * Consensus Resolver Class
 */
export class ConsensusResolver {
  private config: ConsensusConfig = {
    approvalThreshold: 0.7, // 70% agreement
    unanimousRequired: false,
    quorumPercentage: 0.6, // 60% minimum participation
    weightByConfidence: true,
    weightByImpact: true
  };

  constructor() {
    console.log('[ConsensusResolver] Initialized');
  }

  /**
   * Resolve consensus from graph analysis
   */
  async resolveConsensus(
    graphAnalysis: GraphAnalysisResult,
    method: ConsensusMethod = 'weighted-vote'
  ): Promise<ConsensusResult> {
    console.log(`[ConsensusResolver] Resolving consensus using ${method}...`);
    
    const { graph, conflictLevel, coherenceScore } = graphAnalysis;
    
    // Calculate voting results
    const votingResults = this.calculateVotes(graph.nodes.map(n => n.decision), conflictLevel);
    
    // Calculate agreement ratio based on method
    const agreementRatio = this.calculateAgreementRatio(votingResults, method);
    
    // Determine consensus status
    const consensusReached = this.checkConsensusReached(agreementRatio, method);
    
    // Generate final decision
    const finalDecision = this.generateFinalDecision(
      graph.nodes.map(n => n.decision),
      votingResults
    );
    
    // Calculate final confidence
    const finalConfidence = this.calculateFinalConfidence(
      graph.nodes.map(n => n.decision),
      agreementRatio,
      coherenceScore
    );
    
    // Generate checksum
    const checksum = this.generateChecksum(finalDecision);
    
    // Determine status
    let status: 'approved' | 'review_required' | 'rejected' = 'rejected';
    let reviewReason: string | undefined;
    
    if (consensusReached && conflictLevel < 0.3) {
      status = 'approved';
    } else if (consensusReached && conflictLevel >= 0.3) {
      status = 'review_required';
      reviewReason = `High conflict level (${(conflictLevel * 100).toFixed(1)}%) requires manual review`;
    } else {
      status = 'review_required';
      reviewReason = `Agreement ratio (${(agreementRatio * 100).toFixed(1)}%) below threshold (${(this.config.approvalThreshold * 100).toFixed(1)}%)`;
    }
    
    console.log(`[ConsensusResolver] Consensus resolved:`);
    console.log(`  Agreement Ratio: ${(agreementRatio * 100).toFixed(1)}%`);
    console.log(`  Status: ${status}`);
    console.log(`  Final Confidence: ${finalConfidence.toFixed(2)}`);
    
    return {
      consensusReached,
      agreementRatio,
      consensusMethod: method,
      finalDecision,
      finalConfidence,
      checksum,
      votingResults,
      status,
      reviewReason,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate votes from node decisions
   */
  private calculateVotes(
    decisions: NodeDecision[],
    conflictLevel: number
  ): ConsensusResult['votingResults'] {
    const votes: ConsensusResult['votingResults'] = {};
    
    for (const decision of decisions) {
      // Determine vote based on confidence
      let vote: 'approve' | 'reject' | 'abstain' = 'approve';
      
      if (decision.confidence < 0.3) {
        vote = 'abstain'; // Low confidence = abstain
      } else if (decision.confidence < 0.5 && conflictLevel > 0.5) {
        vote = 'reject'; // Low confidence + high conflict = reject
      }
      
      // Calculate weight
      let weight = decision.confidence;
      
      if (this.config.weightByConfidence) {
        weight *= decision.confidence;
      }
      
      if (this.config.weightByImpact) {
        weight *= decision.expectedImpact;
      }
      
      votes[decision.nodeId] = { vote, weight };
    }
    
    return votes;
  }

  /**
   * Calculate agreement ratio based on method
   */
  private calculateAgreementRatio(
    votingResults: ConsensusResult['votingResults'],
    method: ConsensusMethod
  ): number {
    const votes = Object.values(votingResults);
    
    if (votes.length === 0) return 0;
    
    switch (method) {
      case 'weighted-vote': {
        // Weight each vote by its assigned weight
        const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
        const approveWeight = votes
          .filter(v => v.vote === 'approve')
          .reduce((sum, v) => sum + v.weight, 0);
        
        return totalWeight > 0 ? approveWeight / totalWeight : 0;
      }
      
      case 'unanimous': {
        // All nodes must approve
        const allApprove = votes.every(v => v.vote === 'approve');
        return allApprove ? 1.0 : 0.0;
      }
      
      case 'majority': {
        // Simple majority (>50%)
        const approveCount = votes.filter(v => v.vote === 'approve').length;
        return approveCount / votes.length;
      }
      
      case 'quorum': {
        // Quorum-based
        const participating = votes.filter(v => v.vote !== 'abstain').length;
        const participationRatio = participating / votes.length;
        
        if (participationRatio < this.config.quorumPercentage) {
          return 0; // Quorum not met
        }
        
        const approveCount = votes.filter(v => v.vote === 'approve').length;
        return approveCount / participating;
      }
      
      default:
        return 0;
    }
  }

  /**
   * Check if consensus is reached
   */
  private checkConsensusReached(
    agreementRatio: number,
    method: ConsensusMethod
  ): boolean {
    if (method === 'unanimous') {
      return agreementRatio === 1.0;
    }
    
    return agreementRatio >= this.config.approvalThreshold;
  }

  /**
   * Generate final decision from all node decisions
   */
  private generateFinalDecision(
    decisions: NodeDecision[],
    votingResults: ConsensusResult['votingResults']
  ): any {
    // Get approved decisions
    const approvedDecisions = decisions.filter(
      d => votingResults[d.nodeId]?.vote === 'approve'
    );
    
    if (approvedDecisions.length === 0) {
      return {
        decisionType: 'no-decision',
        payload: {},
        reason: 'No approved decisions'
      };
    }
    
    // If all decisions are the same type, merge payloads
    const firstType = approvedDecisions[0].decisionType;
    const allSameType = approvedDecisions.every(d => d.decisionType === firstType);
    
    if (allSameType) {
      // Merge payloads from all approved decisions
      const mergedPayload = this.mergePayloads(
        approvedDecisions.map(d => d.payload)
      );
      
      return {
        decisionType: firstType,
        payload: mergedPayload,
        participatingNodes: approvedDecisions.map(d => d.nodeId),
        source: 'collective-consensus'
      };
    }
    
    // Different decision types - pick highest weight decision
    const highestWeightDecision = approvedDecisions.reduce((prev, curr) => {
      const prevWeight = votingResults[prev.nodeId].weight;
      const currWeight = votingResults[curr.nodeId].weight;
      return currWeight > prevWeight ? curr : prev;
    });
    
    return {
      decisionType: highestWeightDecision.decisionType,
      payload: highestWeightDecision.payload,
      primaryNode: highestWeightDecision.nodeId,
      supportingNodes: approvedDecisions
        .filter(d => d.nodeId !== highestWeightDecision.nodeId)
        .map(d => d.nodeId),
      source: 'weighted-consensus'
    };
  }

  /**
   * Merge multiple payloads into one
   */
  private mergePayloads(payloads: any[]): any {
    if (payloads.length === 0) return {};
    if (payloads.length === 1) return payloads[0];
    
    // Simple merge strategy: combine all keys, prefer higher values
    const merged: any = {};
    
    for (const payload of payloads) {
      for (const [key, value] of Object.entries(payload)) {
        if (merged[key] === undefined) {
          merged[key] = value;
        } else if (typeof value === 'number' && typeof merged[key] === 'number') {
          // For numbers, take average
          merged[key] = (merged[key] + value) / 2;
        } else {
          // For other types, keep first value
          merged[key] = merged[key];
        }
      }
    }
    
    return merged;
  }

  /**
   * Calculate final confidence score
   */
  private calculateFinalConfidence(
    decisions: NodeDecision[],
    agreementRatio: number,
    coherenceScore: number
  ): number {
    if (decisions.length === 0) return 0;
    
    // Average confidence from all decisions
    const avgConfidence = decisions.reduce(
      (sum, d) => sum + d.confidence,
      0
    ) / decisions.length;
    
    // Weighted formula:
    // 40% average confidence + 40% agreement ratio + 20% coherence
    return (avgConfidence * 0.4) + (agreementRatio * 0.4) + (coherenceScore * 0.2);
  }

  /**
   * Generate SHA-256 checksum for final decision
   */
  private generateChecksum(finalDecision: any): string {
    const dataString = JSON.stringify(finalDecision);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConsensusConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[ConsensusResolver] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ConsensusConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const consensusResolver = new ConsensusResolver();

console.log('[ConsensusResolver] Module loaded');
