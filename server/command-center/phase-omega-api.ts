/**
 * ⚡ Phase Ω Governance API
 * 
 * RESTful endpoints for monitoring and managing Phase Ω capabilities
 * across all nuclei in Surooh Empire
 */

import { Router } from 'express';
import { 
  PHASE_OMEGA_GOVERNANCE, 
  validateMutation, 
  canPerformOperation,
  getSupervisor,
  getMaxMutationsPerCycle,
  type MutationRequest,
  type PhaseOmegaCapabilities 
} from './phase-omega-governance';
import { db } from '../db';
import { commandCenterNuclei } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/phase-omega/status
 * Get Phase Ω status for all nuclei
 */
router.get('/status', async (req, res) => {
  try {
    // Get all nuclei with Phase Ω active
    const nuclei = await db
      .select()
      .from(commandCenterNuclei)
      .where(eq(commandCenterNuclei.phaseOmegaActive, 1));
    
    const status = nuclei.map(nucleus => {
      const governance = PHASE_OMEGA_GOVERNANCE[nucleus.nucleusId];
      
      return {
        nucleusId: nucleus.nucleusId,
        nucleusName: nucleus.nucleusName,
        arabicName: nucleus.arabicName,
        category: nucleus.category,
        
        // Phase Ω status
        phaseOmegaActive: nucleus.phaseOmegaActive === 1,
        
        // Capabilities
        capabilities: governance ? {
          selfEvolution: governance.selfEvolution,
          methodEvolution: governance.methodEvolution,
          codeGeneration: governance.codeGeneration,
          createBots: governance.createBots,
          distributeSIDE: governance.distributeSIDE,
        } : null,
        
        // Supervision
        supervision: governance ? {
          requiresApproval: governance.requiresApproval,
          supervisedBy: governance.supervisedBy,
          maxMutationsPerCycle: governance.maxMutationsPerCycle,
          approvalThreshold: governance.approvalThreshold,
        } : null,
        
        // Health
        status: nucleus.status,
        health: nucleus.health,
        lastHealthCheck: nucleus.lastHealthCheck,
      };
    });
    
    // Categorize by autonomy level
    const summary = {
      total: status.length,
      fullAutonomy: status.filter(n => 
        n.supervision?.requiresApproval === false
      ).length,
      supervised: status.filter(n => 
        n.supervision?.requiresApproval === true
      ).length,
      nuclei: status,
    };
    
    res.json(summary);
  } catch (error) {
    console.error('[Phase Ω API] Error fetching status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Phase Ω status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/phase-omega/nucleus/:nucleusId
 * Get detailed Phase Ω capabilities for specific nucleus
 */
router.get('/nucleus/:nucleusId', (req, res) => {
  const { nucleusId } = req.params;
  
  const governance = PHASE_OMEGA_GOVERNANCE[nucleusId];
  
  if (!governance) {
    return res.status(404).json({ 
      error: `Nucleus ${nucleusId} not found in Phase Ω governance registry`
    });
  }
  
  res.json(governance);
});

/**
 * POST /api/phase-omega/validate-mutation
 * Validate if a mutation is allowed for a nucleus
 */
router.post('/validate-mutation', (req, res) => {
  try {
    const request: MutationRequest = req.body;
    
    // Validate request
    if (!request.nucleusId || !request.mutationType || typeof request.fitnessScore !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid request. Required: nucleusId, mutationType, fitnessScore, description'
      });
    }
    
    if (!['core', 'method', 'bot', 'protocol'].includes(request.mutationType)) {
      return res.status(400).json({ 
        error: 'Invalid mutationType. Must be: core, method, bot, or protocol'
      });
    }
    
    // Validate mutation
    const validation = validateMutation(request);
    
    res.json({
      nucleusId: request.nucleusId,
      mutationType: request.mutationType,
      fitnessScore: request.fitnessScore,
      validation,
    });
  } catch (error) {
    console.error('[Phase Ω API] Error validating mutation:', error);
    res.status(500).json({ 
      error: 'Failed to validate mutation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/phase-omega/hierarchy
 * Get Phase Ω hierarchy and supervision tree
 */
router.get('/hierarchy', (req, res) => {
  try {
    const hierarchy = {
      supreme: {
        nucleusId: 'nicholas',
        nucleusName: 'Nicholas 3.2',
        arabicName: 'نيكولاس 3.2',
        role: 'Supreme Sovereign',
        autonomy: 'Full',
        supervision: 'None',
        capabilities: PHASE_OMEGA_GOVERNANCE['nicholas'],
        supervises: ['side', 'academy'],
      },
      
      executives: [
        {
          nucleusId: 'side',
          nucleusName: 'SIDE',
          arabicName: 'سيدا',
          role: 'Executive Arm',
          autonomy: 'Limited',
          supervision: 'Nicholas',
          capabilities: PHASE_OMEGA_GOVERNANCE['side'],
          supervises: [],
        },
      ],
      
      educational: [
        {
          nucleusId: 'academy',
          nucleusName: 'Surooh Academy',
          arabicName: 'أكاديمية سروح',
          role: 'Educational Arm',
          autonomy: 'Limited',
          supervision: 'Nicholas',
          capabilities: PHASE_OMEGA_GOVERNANCE['academy'],
          supervises: [],
        },
      ],
      
      specialized: {
        count: 18,
        phaseOmega: false,
        intelligence: 'Domain-specific AI agents only',
        note: 'No Phase Ω capabilities - use specialized AI for their domains',
      },
    };
    
    res.json(hierarchy);
  } catch (error) {
    console.error('[Phase Ω API] Error fetching hierarchy:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Phase Ω hierarchy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/phase-omega/statistics
 * Get Phase Ω usage statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const nucleiWithPhaseOmega = await db
      .select()
      .from(commandCenterNuclei)
      .where(eq(commandCenterNuclei.phaseOmegaActive, 1));
    
    const stats = {
      activeNuclei: nucleiWithPhaseOmega.length,
      totalNuclei: 21,
      coverage: `${Math.round((nucleiWithPhaseOmega.length / 21) * 100)}%`,
      
      byAutonomy: {
        full: nucleiWithPhaseOmega.filter(n => {
          const gov = PHASE_OMEGA_GOVERNANCE[n.nucleusId];
          return gov && !gov.requiresApproval;
        }).length,
        supervised: nucleiWithPhaseOmega.filter(n => {
          const gov = PHASE_OMEGA_GOVERNANCE[n.nucleusId];
          return gov && gov.requiresApproval;
        }).length,
      },
      
      byCategory: {
        intelligence: nucleiWithPhaseOmega.filter(n => n.category === 'intelligence').length,
        development: nucleiWithPhaseOmega.filter(n => n.category === 'development').length,
        education: nucleiWithPhaseOmega.filter(n => n.category === 'education').length,
      },
      
      totalMaxMutations: Object.values(PHASE_OMEGA_GOVERNANCE)
        .reduce((sum, gov) => sum + gov.maxMutationsPerCycle, 0),
      
      governanceRegistered: Object.keys(PHASE_OMEGA_GOVERNANCE).length,
    };
    
    res.json(stats);
  } catch (error) {
    console.error('[Phase Ω API] Error fetching statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Phase Ω statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

console.log('[Phase Ω API] ✅ Phase Ω governance API initialized');
console.log('[Phase Ω API] 📍 Endpoints:');
console.log('   GET  /api/phase-omega/status');
console.log('   GET  /api/phase-omega/nucleus/:nucleusId');
console.log('   POST /api/phase-omega/validate-mutation');
console.log('   GET  /api/phase-omega/hierarchy');
console.log('   GET  /api/phase-omega/statistics');

export default router;
