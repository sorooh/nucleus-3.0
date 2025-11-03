/**
 * PHASE 7.1 → 8.6: COLLECTIVE INTELLIGENCE ENGINE
 * 
 * Nicholas coordinates collective decision-making across all nuclei
 * - Multi-nucleus voting and consensus building
 * - Intelligence sharing via Cognitive Bus
 * - Unified decision framework
 * - Swarm intelligence coordination
 */

import { db } from "../db";
import { 
  collectiveSessions, 
  collectiveDecisions, 
  intelligenceExchanges, 
  cognitiveBusMessages
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { EventEmitter } from 'events';

class CollectiveIntelligenceEngine extends EventEmitter {
  private isActive: boolean = false;
  private autonomousMode: boolean = false;
  private autoApprovalThreshold: number = 60; // Min consensus % for auto-approval

  constructor() {
    super();
    console.log('[Collective Intelligence] 🧠 Initializing Collective Intelligence Engine...');
  }

  /**
   * Start the Collective Intelligence Engine
   */
  async start() {
    this.isActive = true;
    console.log('[Collective Intelligence] ✅ Engine activated');
    this.emit('engine:started');
  }

  /**
   * Stop the engine
   */
  async stop() {
    this.isActive = false;
    console.log('[Collective Intelligence] ⏸️ Engine stopped');
    this.emit('engine:stopped');
  }

  /**
   * Enable autonomous mode - decisions auto-approved at threshold
   */
  enableAutonomousMode(threshold: number = 60) {
    this.autonomousMode = true;
    this.autoApprovalThreshold = threshold;
    console.log(`[Collective Intelligence] 🤖 Autonomous Mode ENABLED (threshold: ${threshold}%)`);
    this.emit('autonomous:enabled', { threshold });
  }

  /**
   * Disable autonomous mode
   */
  disableAutonomousMode() {
    this.autonomousMode = false;
    console.log('[Collective Intelligence] 🛑 Autonomous Mode DISABLED');
    this.emit('autonomous:disabled');
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      autonomousMode: this.autonomousMode,
      autoApprovalThreshold: this.autoApprovalThreshold,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // COLLECTIVE DECISION MAKING
  // ============================================

  /**
   * Initiate a collective decision session
   */
  async initiateSession(params: {
    topic: string;
    description: string;
    priority: string;
    category: string;
    initiatorNucleus: string;
    participantNuclei: string[];
    requiredConsensus?: number;
    expiresIn?: number; // hours
  }) {
    console.log(`[Collective Intelligence] 🗳️ Initiating session: ${params.topic}`);

    const expiresAt = params.expiresIn 
      ? new Date(Date.now() + params.expiresIn * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // default 24h

    const [session] = await db.insert(collectiveSessions).values({
      topic: params.topic,
      description: params.description,
      priority: params.priority,
      category: params.category,
      initiatorNucleus: params.initiatorNucleus,
      participantNuclei: params.participantNuclei,
      requiredConsensus: params.requiredConsensus || 60,
      status: 'open',
      expiresAt,
    }).returning();

    // Notify all participants via Cognitive Bus
    await this.broadcastMessage({
      sourceNucleus: params.initiatorNucleus,
      targetNuclei: params.participantNuclei,
      channel: 'coordination',
      messageType: 'broadcast',
      priority: params.priority,
      payload: {
        type: 'session_initiated',
        sessionId: session.id,
        topic: params.topic,
        requiredConsensus: session.requiredConsensus,
        expiresAt: session.expiresAt,
      },
    });

    this.emit('session:initiated', session);
    console.log(`[Collective Intelligence] ✅ Session created: ${session.id}`);
    
    return session;
  }

  /**
   * Submit a decision/vote for a session
   */
  async submitDecision(params: {
    sessionId: string;
    nucleusId: string;
    position: 'support' | 'oppose' | 'abstain' | 'conditional';
    reasoning: string;
    confidence: number;
    evidenceProvided?: any;
    alternativeProposal?: string;
    conditions?: any;
    voteWeight?: number;
  }) {
    console.log(`[Collective Intelligence] 🗳️ ${params.nucleusId} voting: ${params.position}`);

    const [decision] = await db.insert(collectiveDecisions).values({
      sessionId: params.sessionId,
      nucleusId: params.nucleusId,
      position: params.position,
      reasoning: params.reasoning,
      confidence: params.confidence,
      evidenceProvided: params.evidenceProvided,
      alternativeProposal: params.alternativeProposal,
      conditions: params.conditions,
      voteWeight: params.voteWeight || 1,
    }).returning();

    // Check if we can reach consensus
    await this.evaluateConsensus(params.sessionId);

    this.emit('decision:submitted', decision);
    return decision;
  }

  /**
   * Evaluate if consensus has been reached
   */
  async evaluateConsensus(sessionId: string) {
    const session = await db.query.collectiveSessions.findFirst({
      where: eq(collectiveSessions.id, sessionId),
    });

    if (!session || session.status !== 'open') {
      return null;
    }

    // Get all decisions for this session
    const decisions = await db.query.collectiveDecisions.findMany({
      where: eq(collectiveDecisions.sessionId, sessionId),
    });

    const participantCount = (session.participantNuclei as string[]).length;
    const requiredVotes = Math.ceil(participantCount * (session.requiredConsensus / 100));

    // Count weighted votes
    const supportVotes = decisions
      .filter(d => d.position === 'support')
      .reduce((sum, d) => sum + (d.voteWeight || 1), 0);

    const opposeVotes = decisions
      .filter(d => d.position === 'oppose')
      .reduce((sum, d) => sum + (d.voteWeight || 1), 0);

    const totalVotes = supportVotes + opposeVotes;
    const consensusLevel = totalVotes > 0 ? Math.round((supportVotes / totalVotes) * 100) : 0;

    console.log(`[Collective Intelligence] 📊 Session ${sessionId}: ${consensusLevel}% consensus (need ${session.requiredConsensus}%)`);

    // Check if consensus reached
    if (consensusLevel >= session.requiredConsensus && decisions.length >= requiredVotes) {
      const dissenting = decisions
        .filter(d => d.position === 'oppose')
        .map(d => ({
          nucleusId: d.nucleusId,
          reasoning: d.reasoning,
          alternativeProposal: d.alternativeProposal,
        }));

      await db.update(collectiveSessions)
        .set({
          status: 'decided',
          finalDecision: 'approved',
          consensusLevel,
          dissenting,
          decidedAt: new Date(),
        })
        .where(eq(collectiveSessions.id, sessionId));

      console.log(`[Collective Intelligence] ✅ Consensus reached: ${consensusLevel}%`);
      this.emit('consensus:reached', { sessionId, consensusLevel });

      return { decided: true, consensusLevel };
    }

    return { decided: false, consensusLevel };
  }

  // ============================================
  // INTELLIGENCE SHARING
  // ============================================

  /**
   * Share intelligence between nuclei
   */
  async shareIntelligence(params: {
    senderNucleus: string;
    receiverNuclei: string[];
    exchangeType: 'insight' | 'pattern' | 'alert' | 'knowledge' | 'request';
    title: string;
    content: string;
    priority: string;
    category: string;
    tags?: string[];
    confidenceScore?: number;
    actionRequired?: boolean;
    sourceData?: any;
    attachments?: any;
  }) {
    console.log(`[Collective Intelligence] 📡 ${params.senderNucleus} sharing: ${params.title}`);

    const [exchange] = await db.insert(intelligenceExchanges).values({
      senderNucleus: params.senderNucleus,
      receiverNuclei: params.receiverNuclei,
      exchangeType: params.exchangeType,
      title: params.title,
      content: params.content,
      priority: params.priority,
      category: params.category,
      tags: params.tags,
      confidenceScore: params.confidenceScore || 70,
      actionRequired: params.actionRequired ? 1 : 0,
      sourceData: params.sourceData,
      attachments: params.attachments,
    }).returning();

    // Send via Cognitive Bus
    await this.broadcastMessage({
      sourceNucleus: params.senderNucleus,
      targetNuclei: params.receiverNuclei,
      channel: 'insights',
      messageType: 'async',
      priority: params.priority,
      payload: {
        type: 'intelligence_shared',
        exchangeId: exchange.id,
        title: params.title,
        exchangeType: params.exchangeType,
        actionRequired: params.actionRequired,
      },
    });

    this.emit('intelligence:shared', exchange);
    return exchange;
  }

  /**
   * Acknowledge receipt of intelligence
   */
  async acknowledgeIntelligence(exchangeId: string, nucleusId: string) {
    const exchange = await db.query.intelligenceExchanges.findFirst({
      where: eq(intelligenceExchanges.id, exchangeId),
    });

    if (!exchange) {
      throw new Error('Exchange not found');
    }

    const acknowledged = (exchange.acknowledged as any[]) || [];
    if (!acknowledged.includes(nucleusId)) {
      acknowledged.push(nucleusId);

      await db.update(intelligenceExchanges)
        .set({ acknowledged })
        .where(eq(intelligenceExchanges.id, exchangeId));
    }

    console.log(`[Collective Intelligence] ✅ ${nucleusId} acknowledged exchange ${exchangeId}`);
    this.emit('intelligence:acknowledged', { exchangeId, nucleusId });
  }

  // ============================================
  // COGNITIVE BUS MESSAGING
  // ============================================

  /**
   * Broadcast a message on the Cognitive Bus
   */
  async broadcastMessage(params: {
    sourceNucleus: string;
    targetNuclei: string[];
    channel: 'alerts' | 'insights' | 'coordination' | 'emergency';
    messageType: 'sync' | 'async' | 'broadcast' | 'request' | 'response';
    priority: string;
    payload: any;
    expiresIn?: number; // hours
  }) {
    const expiresAt = params.expiresIn
      ? new Date(Date.now() + params.expiresIn * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [message] = await db.insert(cognitiveBusMessages).values({
      sourceNucleus: params.sourceNucleus,
      targetNuclei: params.targetNuclei,
      channel: params.channel,
      messageType: params.messageType,
      priority: params.priority,
      payload: params.payload,
      deliveryStatus: 'sent',
      expiresAt,
    }).returning();

    console.log(`[Cognitive Bus] 📨 Broadcasting from ${params.sourceNucleus} to ${params.targetNuclei.length} nuclei`);
    this.emit('message:broadcast', message);

    return message;
  }

  /**
   * Send a targeted request message
   */
  async sendRequest(params: {
    sourceNucleus: string;
    targetNucleus: string;
    channel: string;
    priority: string;
    payload: any;
  }) {
    const [message] = await db.insert(cognitiveBusMessages).values({
      sourceNucleus: params.sourceNucleus,
      targetNuclei: [params.targetNucleus],
      channel: params.channel,
      messageType: 'request',
      priority: params.priority,
      payload: params.payload,
      deliveryStatus: 'sent',
    }).returning();

    console.log(`[Cognitive Bus] 📩 Request from ${params.sourceNucleus} to ${params.targetNucleus}`);
    this.emit('request:sent', message);

    return message;
  }

  /**
   * Send a response to a request
   */
  async sendResponse(requestId: string, responseData: any) {
    const request = await db.query.cognitiveBusMessages.findFirst({
      where: eq(cognitiveBusMessages.id, requestId),
    });

    if (!request) {
      throw new Error('Request not found');
    }

    // Create response message
    const [response] = await db.insert(cognitiveBusMessages).values({
      sourceNucleus: (request.targetNuclei as string[])[0],
      targetNuclei: [request.sourceNucleus],
      channel: request.channel,
      messageType: 'response',
      priority: request.priority,
      payload: responseData,
      requestId: request.id,
      deliveryStatus: 'sent',
    }).returning();

    // Mark request as responded
    await db.update(cognitiveBusMessages)
      .set({
        responseReceived: 1,
        responseData,
      })
      .where(eq(cognitiveBusMessages.id, requestId));

    console.log(`[Cognitive Bus] 💬 Response sent for request ${requestId}`);
    this.emit('response:sent', response);

    return response;
  }

  // ============================================
  // ANALYTICS & REPORTING
  // ============================================

  /**
   * Get collective intelligence statistics
   */
  async getStatistics() {
    const activeSessions = await db.query.collectiveSessions.findMany({
      where: eq(collectiveSessions.status, 'open'),
    });

    const recentExchanges = await db.query.intelligenceExchanges.findMany({
      orderBy: [desc(intelligenceExchanges.sentAt)],
      limit: 10,
    });

    const recentMessages = await db.query.cognitiveBusMessages.findMany({
      orderBy: [desc(cognitiveBusMessages.createdAt)],
      limit: 10,
    });

    return {
      activeSessions: activeSessions.length,
      recentExchanges: recentExchanges.length,
      recentMessages: recentMessages.length,
      totalSessions: await db.query.collectiveSessions.findMany().then(r => r.length),
      totalExchanges: await db.query.intelligenceExchanges.findMany().then(r => r.length),
      totalMessages: await db.query.cognitiveBusMessages.findMany().then(r => r.length),
    };
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions() {
    return await db.query.collectiveSessions.findMany({
      where: eq(collectiveSessions.status, 'open'),
      orderBy: [desc(collectiveSessions.startedAt)],
    });
  }

  /**
   * Get recent intelligence exchanges
   */
  async getRecentExchanges(limit: number = 20) {
    return await db.query.intelligenceExchanges.findMany({
      orderBy: [desc(intelligenceExchanges.sentAt)],
      limit,
    });
  }

  /**
   * Get recent bus messages
   */
  async getRecentMessages(limit: number = 50) {
    return await db.query.cognitiveBusMessages.findMany({
      orderBy: [desc(cognitiveBusMessages.createdAt)],
      limit,
    });
  }
}

// Singleton instance
export const collectiveIntelligenceEngine = new CollectiveIntelligenceEngine();

export default collectiveIntelligenceEngine;
