/**
 * Phase Ω.9: Governance API
 * 
 * REST endpoints for autonomous governance decisions monitoring and control
 */

import { Router } from 'express';
import { db } from './db';
import { autonomousGovernanceDecisions, integrityReports, evolutionSuggestions as evolutionSuggestionsTable } from '@shared/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { alignDecision } from './governance/alignment/decision-aligner';
import type { DecisionContext } from './governance/alignment/ethics-evaluator';

const router = Router();

/**
 * GET /api/governance/decisions
 * Get recent governance decisions
 */
router.get('/decisions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const decisions = await db
      .select()
      .from(autonomousGovernanceDecisions)
      .orderBy(desc(autonomousGovernanceDecisions.createdAt))
      .limit(limit);
    
    res.json({
      success: true,
      data: decisions,
      count: decisions.length
    });
  } catch (error) {
    console.error('Failed to fetch governance decisions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch governance decisions'
    });
  }
});

/**
 * GET /api/governance/stats
 * Get governance statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Get decision stats
    const totalDecisions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autonomousGovernanceDecisions);
    
    const approvedDecisions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autonomousGovernanceDecisions)
      .where(eq(autonomousGovernanceDecisions.isApproved, true));
    
    const blockedDecisions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autonomousGovernanceDecisions)
      .where(eq(autonomousGovernanceDecisions.isApproved, false));
    
    const executedDecisions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autonomousGovernanceDecisions)
      .where(sql`execution_result = 'success'`);
    
    // Get average scores
    const avgScores = await db
      .select({
        avgEthics: sql<number>`avg(ethics_score)`,
        avgImpact: sql<number>`avg(impact_score)`,
        avgRisk: sql<number>`avg(risk_score)`,
        avgAlignment: sql<number>`avg(alignment_score)`,
        avgConfidence: sql<number>`avg(ai_confidence)`
      })
      .from(autonomousGovernanceDecisions);
    
    // Get recent trends (last 24 hours)
    const last24h = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autonomousGovernanceDecisions)
      .where(sql`created_at > NOW() - INTERVAL '24 hours'`);
    
    res.json({
      success: true,
      data: {
        total: totalDecisions[0]?.count || 0,
        approved: approvedDecisions[0]?.count || 0,
        blocked: blockedDecisions[0]?.count || 0,
        executed: executedDecisions[0]?.count || 0,
        pending: (approvedDecisions[0]?.count || 0) - (executedDecisions[0]?.count || 0),
        averageScores: {
          ethics: parseFloat((avgScores[0]?.avgEthics || 0).toFixed(2)),
          impact: parseFloat((avgScores[0]?.avgImpact || 0).toFixed(2)),
          risk: parseFloat((avgScores[0]?.avgRisk || 0).toFixed(2)),
          alignment: parseFloat((avgScores[0]?.avgAlignment || 0).toFixed(2))
        },
        avgConfidence: parseFloat((avgScores[0]?.avgConfidence || 0).toFixed(2)),
        last24Hours: last24h[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch governance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch governance stats'
    });
  }
});

/**
 * GET /api/governance/summary
 * Get high-level summary for Supreme Dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    // Get total cycles count
    const totalCycles = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(autonomousGovernanceDecisions);
    
    // Get approved/rejected counts
    const decisionsApproved = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(autonomousGovernanceDecisions)
      .where(eq(autonomousGovernanceDecisions.isApproved, true));
    
    const decisionsRejected = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(autonomousGovernanceDecisions)
      .where(eq(autonomousGovernanceDecisions.isApproved, false));
    
    // Get executed actions count
    const actionsExecuted = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(autonomousGovernanceDecisions)
      .where(sql`execution_result = 'success'`);
    
    // Get average confidence and alignment
    const avgMetrics = await db
      .select({
        avgConfidence: sql<number>`COALESCE(AVG(${autonomousGovernanceDecisions.aiConfidence}), 0)`,
        avgAlignment: sql<number>`COALESCE(AVG(${autonomousGovernanceDecisions.alignmentScore}), 0)`
      })
      .from(autonomousGovernanceDecisions);
    
    const total = totalCycles[0]?.count || 0;
    const approved = decisionsApproved[0]?.count || 0;
    const rejected = decisionsRejected[0]?.count || 0;
    const executed = actionsExecuted[0]?.count || 0;
    
    const successRate = total > 0 ? (executed / total) * 100 : 0;
    
    res.json({
      totalCycles: total,
      decisionsApproved: approved,
      decisionsRejected: rejected,
      actionsExecuted: executed,
      successRate: successRate,
      avgConfidence: avgMetrics[0]?.avgConfidence || 0,
      avgAlignmentScore: avgMetrics[0]?.avgAlignment || 0
    });
  } catch (error) {
    console.error('Failed to fetch governance summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * POST /api/governance/validate
 * Validate a decision manually
 */
router.post('/validate', async (req, res) => {
  try {
    const context: DecisionContext = req.body;
    
    if (!context.action || !context.description || !context.impact) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: action, description, impact'
      });
    }
    
    // Run governance validation
    const result = await alignDecision(context);
    
    // Save to database
    await db.insert(autonomousGovernanceDecisions).values({
      action: context.action,
      target: context.target,
      description: context.description,
      impact: context.impact,
      ethicsScore: result.ethics,
      impactScore: result.impact,
      riskScore: result.risk,
      alignmentScore: result.score,
      approved: result.approved ? 1 : 0,
      reasoning: result.reasoning,
      recommendation: result.recommendation,
      ethicsViolations: result.details.ethicsViolations,
      impactBenefits: result.details.impactBenefits,
      riskFactors: result.details.riskFactors,
      mitigations: result.details.mitigations,
      source: 'api'
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Failed to validate decision:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate decision'
    });
  }
});

/**
 * GET /api/governance/pulse
 * Get real-time system pulse
 */
router.get('/pulse', async (req, res) => {
  try {
    // Get latest integrity report
    const latestReport = await db
      .select()
      .from(integrityReports)
      .orderBy(desc(integrityReports.cycleTimestamp))
      .limit(1);
    
    // Get latest governance decisions
    const recentDecisions = await db
      .select()
      .from(autonomousGovernanceDecisions)
      .orderBy(desc(autonomousGovernanceDecisions.createdAt))
      .limit(5);
    
    // Get pending evolution suggestions
    const pendingSuggestions = await db
      .select()
      .from(evolutionSuggestionsTable)
      .where(eq(evolutionSuggestionsTable.status, 'pending'))
      .limit(10);
    
    const pulse = {
      timestamp: new Date().toISOString(),
      integrity: latestReport[0] || null,
      governance: {
        recentDecisions,
        totalPending: recentDecisions.filter(d => d.approved === 1 && d.executed === 0).length
      },
      evolution: {
        pendingSuggestions: pendingSuggestions.length,
        suggestions: pendingSuggestions
      },
      status: latestReport[0]?.overallStatus || 'unknown'
    };
    
    res.json({
      success: true,
      data: pulse
    });
  } catch (error) {
    console.error('Failed to fetch system pulse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system pulse'
    });
  }
});

/**
 * GET /api/governance/evolution/suggestions
 * Get evolution suggestions
 */
router.get('/evolution/suggestions', async (req, res) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const limit = parseInt(req.query.limit as string) || 50;
    
    let query = db
      .select()
      .from(evolutionSuggestionsTable)
      .orderBy(desc(evolutionSuggestionsTable.createdAt))
      .limit(limit);
    
    if (status !== 'all') {
      query = query.where(eq(evolutionSuggestionsTable.status, status));
    }
    
    const suggestions = await query;
    
    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Failed to fetch evolution suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evolution suggestions'
    });
  }
});

/**
 * POST /api/governance/evolution/approve/:id
 * Approve an evolution suggestion
 */
router.post('/evolution/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy = 'admin' } = req.body;
    
    // Update suggestion status
    await db
      .update(evolutionSuggestionsTable)
      .set({
        status: 'approved',
        appliedBy: approvedBy,
        appliedAt: new Date()
      })
      .where(eq(evolutionSuggestionsTable.id, id));
    
    res.json({
      success: true,
      message: 'Evolution suggestion approved'
    });
  } catch (error) {
    console.error('Failed to approve evolution suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve evolution suggestion'
    });
  }
});

export default router;
