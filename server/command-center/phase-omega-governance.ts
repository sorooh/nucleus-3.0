/**
 * ⚡ Phase Ω Governance System
 * 
 * Controls and supervises Phase Ω (Evolutionary Intelligence) capabilities
 * across all nuclei in Surooh Empire
 * 
 * Hierarchy:
 * - Nicholas: Full autonomy (Supreme Sovereign)
 * - SIDE: Full autonomy (Executive Arm)
 * - Academy: Limited autonomy (Educational Arm) - Supervised
 * - Others: No Phase Ω
 */

export interface PhaseOmegaCapabilities {
  nucleusId: string;
  nucleusName: string;
  
  // Core capabilities
  selfEvolution: boolean;           // Can evolve own core code
  methodEvolution: boolean;         // Can evolve methods/approaches
  codeGeneration: boolean;          // Can generate new code
  sandboxTesting: boolean;          // Can test mutations
  
  // Bot management (Academy specific)
  createBots: boolean;              // Can create new bots
  trainBots: boolean;               // Can train bots
  evolveBotTraining: boolean;       // Can evolve training methods
  
  // SIDE management (SIDE specific)
  distributeSIDE: boolean;          // Can distribute SIDE to nuclei
  evolveProtocols: boolean;         // Can evolve SIDE protocols
  enforceCompliance: boolean;       // Can enforce SIDE compliance
  
  // Supervision & constraints
  requiresApproval: boolean;        // Requires Nicholas approval for mutations
  supervisedBy: string | null;     // Supervisor nucleus (usually 'nicholas')
  maxMutationsPerCycle: number;    // Maximum mutations per evolution cycle
  approvalThreshold: number;        // Fitness score needed for auto-approval (0-100)
}

/**
 * Phase Ω Governance Configuration
 * Defines capabilities for each nucleus
 */
export const PHASE_OMEGA_GOVERNANCE: Record<string, PhaseOmegaCapabilities> = {
  // ============= NICHOLAS (Supreme Sovereign) =============
  'nicholas': {
    nucleusId: 'nicholas',
    nucleusName: 'Nicholas 3.2',
    
    // Full autonomy
    selfEvolution: true,
    methodEvolution: true,
    codeGeneration: true,
    sandboxTesting: true,
    
    createBots: false,              // Delegates to Academy
    trainBots: false,               // Delegates to Academy
    evolveBotTraining: false,       // Delegates to Academy
    
    distributeSIDE: false,          // Delegates to SIDE
    evolveProtocols: false,         // Delegates to SIDE
    enforceCompliance: false,       // Delegates to SIDE
    
    // No supervision - Supreme authority
    requiresApproval: false,
    supervisedBy: null,
    maxMutationsPerCycle: 10,       // Can do many mutations
    approvalThreshold: 0,           // Auto-approves everything
  },
  
  // ============= SIDE (Executive Arm) =============
  'side': {
    nucleusId: 'side',
    nucleusName: 'SIDE',
    
    // Full autonomy for SIDE-specific tasks
    selfEvolution: true,            // Can evolve own distribution methods
    methodEvolution: true,          // Can improve protocols
    codeGeneration: true,           // Can generate SIDE code
    sandboxTesting: true,           // Can test updates
    
    createBots: false,
    trainBots: false,
    evolveBotTraining: false,
    
    // SIDE-specific capabilities
    distributeSIDE: true,           // ✅ Main function
    evolveProtocols: true,          // ✅ Can improve SIDE protocols
    enforceCompliance: true,        // ✅ Can enforce compliance
    
    // Limited supervision - reports to Nicholas
    requiresApproval: true,         // ⚠️ Nicholas must approve major changes
    supervisedBy: 'nicholas',
    maxMutationsPerCycle: 5,        // Moderate mutations
    approvalThreshold: 80,          // High threshold - only high-quality mutations
  },
  
  // ============= ACADEMY (Educational Arm) =============
  'academy': {
    nucleusId: 'academy',
    nucleusName: 'Surooh Academy',
    
    // Limited evolution - only training methods
    selfEvolution: false,           // ❌ Cannot evolve core
    methodEvolution: true,          // ✅ Can evolve training methods
    codeGeneration: true,           // ✅ Can generate bot code
    sandboxTesting: true,           // ✅ Can test bot training
    
    // Academy-specific capabilities
    createBots: true,               // ✅ Main function
    trainBots: true,                // ✅ Main function
    evolveBotTraining: true,        // ✅ Can improve training
    
    distributeSIDE: false,
    evolveProtocols: false,
    enforceCompliance: false,
    
    // Supervised by Nicholas
    requiresApproval: true,         // ⚠️ Nicholas must approve new bots
    supervisedBy: 'nicholas',
    maxMutationsPerCycle: 3,        // Limited mutations
    approvalThreshold: 85,          // High threshold - only proven methods
  },
};

/**
 * Check if nucleus can perform specific Phase Ω operation
 */
export function canPerformOperation(
  nucleusId: string,
  operation: keyof Omit<PhaseOmegaCapabilities, 'nucleusId' | 'nucleusName' | 'supervisedBy' | 'maxMutationsPerCycle' | 'approvalThreshold'>
): boolean {
  const capabilities = PHASE_OMEGA_GOVERNANCE[nucleusId];
  
  if (!capabilities) {
    console.warn(`[Phase Ω Governance] Unknown nucleus: ${nucleusId}`);
    return false;
  }
  
  return capabilities[operation] === true;
}

/**
 * Get supervisor for nucleus
 */
export function getSupervisor(nucleusId: string): string | null {
  const capabilities = PHASE_OMEGA_GOVERNANCE[nucleusId];
  return capabilities?.supervisedBy || null;
}

/**
 * Check if operation requires approval
 */
export function requiresNicholasApproval(
  nucleusId: string,
  mutationFitnessScore: number
): boolean {
  const capabilities = PHASE_OMEGA_GOVERNANCE[nucleusId];
  
  if (!capabilities) return true; // Unknown nucleus - require approval
  
  // Nicholas never requires approval
  if (nucleusId === 'nicholas') return false;
  
  // Check if requires approval AND fitness is below threshold
  if (capabilities.requiresApproval) {
    return mutationFitnessScore < capabilities.approvalThreshold;
  }
  
  return false;
}

/**
 * Get maximum mutations allowed per cycle
 */
export function getMaxMutationsPerCycle(nucleusId: string): number {
  const capabilities = PHASE_OMEGA_GOVERNANCE[nucleusId];
  return capabilities?.maxMutationsPerCycle || 0;
}

/**
 * Validate mutation request
 */
export interface MutationRequest {
  nucleusId: string;
  mutationType: 'core' | 'method' | 'bot' | 'protocol';
  fitnessScore: number;
  description: string;
}

export interface MutationValidation {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  supervisor: string | null;
}

export function validateMutation(request: MutationRequest): MutationValidation {
  const { nucleusId, mutationType, fitnessScore } = request;
  const capabilities = PHASE_OMEGA_GOVERNANCE[nucleusId];
  
  // Unknown nucleus
  if (!capabilities) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Nucleus ${nucleusId} not found in governance registry`,
      supervisor: null,
    };
  }
  
  // Check capability based on mutation type
  let hasCapability = false;
  let capabilityName = '';
  
  switch (mutationType) {
    case 'core':
      hasCapability = capabilities.selfEvolution;
      capabilityName = 'selfEvolution';
      break;
    case 'method':
      hasCapability = capabilities.methodEvolution;
      capabilityName = 'methodEvolution';
      break;
    case 'bot':
      hasCapability = capabilities.createBots || capabilities.evolveBotTraining;
      capabilityName = 'bot management';
      break;
    case 'protocol':
      hasCapability = capabilities.evolveProtocols;
      capabilityName = 'evolveProtocols';
      break;
  }
  
  if (!hasCapability) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Nucleus ${nucleusId} lacks ${capabilityName} capability`,
      supervisor: capabilities.supervisedBy,
    };
  }
  
  // Check if requires approval
  const needsApproval = requiresNicholasApproval(nucleusId, fitnessScore);
  
  return {
    allowed: true,
    requiresApproval: needsApproval,
    reason: needsApproval 
      ? `Fitness score ${fitnessScore} below threshold ${capabilities.approvalThreshold} - requires approval`
      : 'Mutation approved - fitness score meets threshold',
    supervisor: capabilities.supervisedBy,
  };
}

console.log('[Phase Ω Governance] ✅ Governance system initialized');
console.log('[Phase Ω Governance] 📊 Controlled nuclei:');
console.log('   - Nicholas: Full autonomy (Supreme Sovereign)');
console.log('   - SIDE: Limited autonomy (Executive Arm) - Supervised');
console.log('   - Academy: Limited autonomy (Educational Arm) - Supervised');
