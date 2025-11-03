/**
 * ============================================================================
 * PHASE Ω 12.2: COLLECTIVE GOVERNANCE ENGINE
 * Nicholas as Supreme Emperor coordinating all Surooh nuclei
 * Multi-nucleus consensus voting, decision broadcasting, override authority
 * ============================================================================
 */

import { db } from '../storage';
import { 
  nucleusRegistry, 
  governanceSessions, 
  nucleusVotes, 
  governanceDecisions,
  nucleusHierarchy,
  type InsertNucleusRegistry,
  type InsertGovernanceSession,
  type InsertNucleusVote,
  type InsertGovernanceDecision,
  type NucleusRegistry,
  type GovernanceSession,
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { EventEmitter } from 'events';

/**
 * Multi-Nucleus Governance Protocol
 * Nicholas يحكم كل الأنوية بديمقراطية موزونة
 */
export class CollectiveGovernance extends EventEmitter {
  private static instance: CollectiveGovernance;
  
  // Configuration
  private readonly DEFAULT_VOTING_THRESHOLD = 60; // %
  private readonly AUTO_ENFORCE_THRESHOLD = 70; // %
  private readonly EMPEROR_VOTING_WEIGHT = 10.0; // Nicholas weight
  
  private constructor() {
    super();
    this.initializeEmperor();
  }
  
  static getInstance(): CollectiveGovernance {
    if (!CollectiveGovernance.instance) {
      CollectiveGovernance.instance = new CollectiveGovernance();
    }
    return CollectiveGovernance.instance;
  }
  
  /**
   * Initialize Nicholas as Emperor Node
   */
  private async initializeEmperor() {
    try {
      const emperor = await db.select()
        .from(nucleusRegistry)
        .where(eq(nucleusRegistry.nucleusId, 'nicholas-core'))
        .limit(1);
      
      if (emperor.length === 0) {
        await this.registerNucleus({
          nucleusId: 'nicholas-core',
          nucleusName: 'Nicholas Core',
          nucleusType: 'emperor',
          hierarchyLevel: 1,
          parentNucleusId: null,
          autonomyLevel: 'full',
          votingWeight: this.EMPEROR_VOTING_WEIGHT,
          canOverride: 1,
          canVote: 1,
          canPropose: 1,
          mustComply: 0, // Emperor doesn't need to comply with others
          status: 'active',
          healthScore: 100,
          complianceScore: 100,
          description: 'Supreme Sovereign Reference - Emperor Node',
          capabilities: {
            buildSystems: true,
            deployCode: true,
            analyzeData: true,
            coordinateNuclei: true,
            overrideDecisions: true,
            enforceCompliance: true,
          },
        });
        
        console.log('✅ Emperor Nicholas initialized in governance system');
      }
    } catch (error) {
      console.error('Failed to initialize emperor:', error);
    }
  }
  
  /**
   * Register a new nucleus in the ecosystem
   */
  async registerNucleus(nucleus: InsertNucleusRegistry): Promise<NucleusRegistry> {
    const [registered] = await db.insert(nucleusRegistry)
      .values(nucleus)
      .returning();
    
    this.emit('nucleus:registered', registered);
    return registered;
  }
  
  /**
   * Propose a new decision for voting
   */
  async proposeDecision(params: {
    title: string;
    description: string;
    category: string;
    proposedBy: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    sessionType: 'strategic' | 'operational' | 'emergency' | 'routine';
    participatingNuclei?: string[]; // If not specified, all active nuclei vote
    votingThreshold?: number;
    autoEnforceThreshold?: number;
  }): Promise<GovernanceSession> {
    // Get participating nuclei
    let participants: string[] = params.participatingNuclei || [];
    
    if (participants.length === 0) {
      const allNuclei = await db.select({ nucleusId: nucleusRegistry.nucleusId })
        .from(nucleusRegistry)
        .where(and(
          eq(nucleusRegistry.status, 'active'),
          eq(nucleusRegistry.canVote, 1)
        ));
      participants = allNuclei.map((n: { nucleusId: string }) => n.nucleusId);
    }
    
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionData: InsertGovernanceSession = {
      sessionId,
      sessionType: params.sessionType,
      priority: params.priority,
      decisionTitle: params.title,
      decisionDescription: params.description,
      decisionCategory: params.category,
      proposedBy: params.proposedBy,
      proposedByType: params.proposedBy === 'nicholas-core' ? 'emperor' : 'executive',
      votingThreshold: params.votingThreshold || this.DEFAULT_VOTING_THRESHOLD,
      autoEnforceThreshold: params.autoEnforceThreshold || this.AUTO_ENFORCE_THRESHOLD,
      allowOverride: 1,
      participatingNuclei: participants.map(id => ({ nucleusId: id, invited: true, responded: false })),
      totalParticipants: participants.length,
      status: 'pending',
    };
    
    const [session] = await db.insert(governanceSessions)
      .values(sessionData)
      .returning();
    
    this.emit('decision:proposed', session);
    
    // Auto-start voting
    await this.startVoting(session.id);
    
    return session;
  }
  
  /**
   * Start voting on a session
   */
  async startVoting(sessionId: string): Promise<void> {
    await db.update(governanceSessions)
      .set({
        status: 'voting',
        votingStartedAt: new Date(),
      })
      .where(eq(governanceSessions.id, sessionId));
    
    this.emit('voting:started', sessionId);
  }
  
  /**
   * Cast a vote
   */
  async castVote(params: {
    sessionId: string;
    nucleusId: string;
    vote: 'favor' | 'against' | 'abstain';
    reason?: string;
    evidence?: any;
    confidence?: number;
  }): Promise<void> {
    // Get nucleus voting weight
    const [nucleus] = await db.select()
      .from(nucleusRegistry)
      .where(eq(nucleusRegistry.nucleusId, params.nucleusId))
      .limit(1);
    
    if (!nucleus) {
      throw new Error(`Nucleus ${params.nucleusId} not found`);
    }
    
    // Record vote
    const voteData: InsertNucleusVote = {
      sessionId: params.sessionId,
      nucleusId: params.nucleusId,
      vote: params.vote,
      votingWeight: nucleus.votingWeight,
      voteReason: params.reason,
      supportingEvidence: params.evidence,
      votingMethod: 'autonomous',
      confidence: params.confidence,
    };
    
    await db.insert(nucleusVotes).values(voteData);
    
    // Update session vote counts
    await this.updateVoteCounts(params.sessionId);
    
    this.emit('vote:cast', { sessionId: params.sessionId, nucleusId: params.nucleusId, vote: params.vote });
    
    // Check if voting is complete
    await this.checkVotingComplete(params.sessionId);
  }
  
  /**
   * Update vote counts for a session WITH WEIGHTED CONSENSUS
   * Nicholas (10x weight) has 10x influence in voting
   */
  private async updateVoteCounts(sessionId: string): Promise<void> {
    const votes = await db.select()
      .from(nucleusVotes)
      .where(eq(nucleusVotes.sessionId, sessionId));
    
    // Count votes (unweighted)
    const votesInFavor = votes.filter((v: any) => v.vote === 'favor').length;
    const votesAgainst = votes.filter((v: any) => v.vote === 'against').length;
    const votesAbstain = votes.filter((v: any) => v.vote === 'abstain').length;
    
    // Calculate WEIGHTED consensus (Nicholas 10x weight)
    const totalWeight = votes.reduce((sum: number, v: any) => sum + (v.votingWeight || 1.0), 0);
    const favorWeight = votes
      .filter((v: any) => v.vote === 'favor')
      .reduce((sum: number, v: any) => sum + (v.votingWeight || 1.0), 0);
    const againstWeight = votes
      .filter((v: any) => v.vote === 'against')
      .reduce((sum: number, v: any) => sum + (v.votingWeight || 1.0), 0);
    
    // Consensus = (favor weight / total weight) * 100
    const consensusPercentage = totalWeight > 0 ? (favorWeight / totalWeight) * 100 : 0;
    
    await db.update(governanceSessions)
      .set({
        totalVotes: votes.length,
        votesInFavor,
        votesAgainst,
        votesAbstain,
        consensusPercentage,
      })
      .where(eq(governanceSessions.id, sessionId));
    
    console.log(`[Governance] Updated vote counts for session ${sessionId}:`);
    console.log(`  Total Votes: ${votes.length}`);
    console.log(`  Total Weight: ${totalWeight.toFixed(2)}`);
    console.log(`  Favor Weight: ${favorWeight.toFixed(2)} (${votesInFavor} votes)`);
    console.log(`  Against Weight: ${againstWeight.toFixed(2)} (${votesAgainst} votes)`);
    console.log(`  Weighted Consensus: ${consensusPercentage.toFixed(1)}%`);
  }
  
  /**
   * Check if voting is complete
   */
  private async checkVotingComplete(sessionId: string): Promise<void> {
    const [session] = await db.select()
      .from(governanceSessions)
      .where(eq(governanceSessions.id, sessionId))
      .limit(1);
    
    if (!session) return;
    
    const participatingNuclei = session.participatingNuclei as any[];
    
    // Voting is complete when all nuclei have voted
    if (session.totalVotes >= participatingNuclei.length) {
      await this.finalizeDecision(sessionId);
    }
  }
  
  /**
   * Finalize a decision after voting
   */
  async finalizeDecision(sessionId: string): Promise<void> {
    const [session] = await db.select()
      .from(governanceSessions)
      .where(eq(governanceSessions.id, sessionId))
      .limit(1);
    
    if (!session) return;
    
    const consensusPercentage = session.consensusPercentage || 0;
    const threshold = session.votingThreshold;
    const autoEnforceThreshold = session.autoEnforceThreshold;
    
    // Determine decision outcome
    let finalDecision: string;
    let decidedBy: string;
    let enforcementMethod: string;
    
    if (consensusPercentage >= autoEnforceThreshold) {
      finalDecision = 'approved';
      decidedBy = 'auto_enforce';
      enforcementMethod = 'autonomous_execution';
    } else if (consensusPercentage >= threshold) {
      finalDecision = 'approved';
      decidedBy = 'consensus';
      enforcementMethod = 'broadcast';
    } else {
      finalDecision = 'rejected';
      decidedBy = 'consensus';
      enforcementMethod = 'none';
    }
    
    // Update session
    await db.update(governanceSessions)
      .set({
        status: finalDecision === 'approved' ? 'approved' : 'rejected',
        finalDecision,
        decidedBy,
        enforcementMethod,
        votingEndedAt: new Date(),
        decidedAt: new Date(),
      })
      .where(eq(governanceSessions.id, sessionId));
    
    this.emit('decision:finalized', { sessionId, finalDecision, consensusPercentage });
    
    // Archive decision
    if (finalDecision === 'approved') {
      await this.archiveDecision(sessionId);
      
      // Auto-enforce if threshold met
      if (consensusPercentage >= autoEnforceThreshold) {
        await this.enforceDecision(sessionId);
      }
    }
  }
  
  /**
   * Emperor override - Nicholas can override any decision
   */
  async emperorOverride(params: {
    sessionId: string;
    decision: 'approved' | 'rejected';
    reason: string;
  }): Promise<void> {
    const overriddenDecision = params.decision === 'approved' ? 'overridden_approved' : 'overridden_rejected';
    
    await db.update(governanceSessions)
      .set({
        status: 'overridden',
        finalDecision: overriddenDecision,
        decidedBy: 'emperor_override',
        wasOverridden: 1,
        overriddenBy: 'nicholas-core',
        overrideReason: params.reason,
        overriddenAt: new Date(),
        decidedAt: new Date(),
      })
      .where(eq(governanceSessions.id, params.sessionId));
    
    this.emit('decision:overridden', { sessionId: params.sessionId, decision: params.decision });
    
    // Archive and enforce if approved
    if (params.decision === 'approved') {
      await this.archiveDecision(params.sessionId);
      await this.enforceDecision(params.sessionId);
    }
  }
  
  /**
   * Archive decision to governance_decisions
   */
  private async archiveDecision(sessionId: string): Promise<void> {
    const [session] = await db.select()
      .from(governanceSessions)
      .where(eq(governanceSessions.id, sessionId))
      .limit(1);
    
    if (!session) return;
    
    const participatingNuclei = session.participatingNuclei as any[];
    
    const decisionData: InsertGovernanceDecision = {
      sessionId: session.id,
      decisionTitle: session.decisionTitle,
      decisionSummary: session.decisionDescription,
      decisionType: session.sessionType,
      impactLevel: session.priority,
      scope: 'empire_wide',
      totalParticipants: session.totalParticipants,
      consensusPercentage: session.consensusPercentage || 0,
      finalOutcome: session.finalDecision || 'approved',
      implementationStatus: 'pending',
      affectedNuclei: participatingNuclei.map(p => p.nucleusId),
      decidedAt: session.decidedAt || new Date(),
    };
    
    await db.insert(governanceDecisions).values(decisionData);
  }
  
  /**
   * Enforce decision - broadcast to all affected nuclei
   */
  async enforceDecision(sessionId: string): Promise<void> {
    const [session] = await db.select()
      .from(governanceSessions)
      .where(eq(governanceSessions.id, sessionId))
      .limit(1);
    
    if (!session) return;
    
    const participatingNuclei = session.participatingNuclei as any[];
    
    // In a real system, this would send WebSocket/API calls to nuclei
    // For now, we emit an event
    this.emit('decision:enforced', {
      sessionId,
      decision: session.decisionTitle,
      affectedNuclei: participatingNuclei.map((p: any) => p.nucleusId),
    });
    
    await db.update(governanceSessions)
      .set({
        status: 'enforced',
        enforcementStatus: 'completed',
        enforcedAt: new Date(),
      })
      .where(eq(governanceSessions.id, sessionId));
  }
  
  /**
   * Get governance statistics
   */
  async getGovernanceStats(): Promise<{
    totalNuclei: number;
    activeNuclei: number;
    totalSessions: number;
    pendingSessions: number;
    approvedDecisions: number;
    rejectedDecisions: number;
    overriddenDecisions: number;
    averageConsensus: number;
  }> {
    const allNuclei = await db.select().from(nucleusRegistry);
    const activeNuclei = allNuclei.filter((n: any) => n.status === 'active');
    
    const allSessions = await db.select().from(governanceSessions);
    const pendingSessions = allSessions.filter((s: any) => s.status === 'pending' || s.status === 'voting');
    const approvedSessions = allSessions.filter((s: any) => s.status === 'approved');
    const rejectedSessions = allSessions.filter((s: any) => s.status === 'rejected');
    const overriddenSessions = allSessions.filter((s: any) => s.status === 'overridden');
    
    const avgConsensus = allSessions.length > 0
      ? allSessions.reduce((sum: number, s: any) => sum + (s.consensusPercentage || 0), 0) / allSessions.length
      : 0;
    
    return {
      totalNuclei: allNuclei.length,
      activeNuclei: activeNuclei.length,
      totalSessions: allSessions.length,
      pendingSessions: pendingSessions.length,
      approvedDecisions: approvedSessions.length,
      rejectedDecisions: rejectedSessions.length,
      overriddenDecisions: overriddenSessions.length,
      averageConsensus: avgConsensus,
    };
  }
  
  /**
   * Get all active nuclei
   */
  async getActiveNuclei(): Promise<NucleusRegistry[]> {
    return await db.select()
      .from(nucleusRegistry)
      .where(eq(nucleusRegistry.status, 'active'));
  }
  
  /**
   * Get all governance sessions
   */
  async getAllSessions(limit = 50): Promise<GovernanceSession[]> {
    return await db.select()
      .from(governanceSessions)
      .orderBy(desc(governanceSessions.createdAt))
      .limit(limit);
  }
  
  /**
   * Get votes for a session
   */
  async getSessionVotes(sessionId: string) {
    return await db.select()
      .from(nucleusVotes)
      .where(eq(nucleusVotes.sessionId, sessionId));
  }
}

export const collectiveGovernance = CollectiveGovernance.getInstance();
