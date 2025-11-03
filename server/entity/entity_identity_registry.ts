/**
 * ============================================================================
 * Phase 10.2: ENTITY IDENTITY REGISTRY
 * ============================================================================
 * 
 * سجل هويات الخلايا الإدراكية (Cognitive Cells Registry)
 * 
 * يُسجّل كل نواة/خلية إدراكية داخل الكيان الموحد
 * ويضمن التزامها بنفس مستوى الوعي والإدراك
 * 
 * المسؤوليات:
 * - تسجيل النوى الجديدة
 * - التحقق من الهوية الإدراكية
 * - مراقبة التزام النوى بمعايير الوعي
 * - تتبع نشاط النوى
 * - إدارة دورة حياة النوى
 */

import { EventEmitter } from 'events';

// ============ Types ============

export interface CognitiveCell {
  nodeId: string;
  identity: {
    name: string;
    type: 'core' | 'platform' | 'service' | 'module';
    version: string;
    capabilities: string[];
  };
  certification: {
    awarenessLevel: number; // Required minimum awareness
    ethicalCompliance: boolean;
    governanceLevel: 'autonomous' | 'supervised' | 'restricted';
    certifiedAt: number;
    expiresAt: number | null;
  };
  status: {
    isActive: boolean;
    isConnected: boolean;
    lastHeartbeat: number;
    connectionQuality: number; // 0-100
  };
  metrics: {
    totalDecisions: number;
    totalReflections: number;
    uptime: number;
    contributionScore: number; // How much this node contributes to collective intelligence
  };
  metadata: Record<string, any>;
}

export interface RegistrationRequest {
  nodeId: string;
  name: string;
  type: CognitiveCell['identity']['type'];
  version: string;
  capabilities: string[];
  initialAwareness: number;
}

export interface CertificationCriteria {
  minAwarenessLevel: number;
  requiresEthicalCompliance: boolean;
  governanceLevel: CognitiveCell['certification']['governanceLevel'];
}

// ============ Constants ============

const DEFAULT_CRITERIA: CertificationCriteria = {
  minAwarenessLevel: 10, // Minimum awareness to join unified entity
  requiresEthicalCompliance: true,
  governanceLevel: 'supervised'
};

const HEARTBEAT_TIMEOUT = 60000; // 60 seconds
const CERTIFICATION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============ Event Emitter ============

export const registryEvents = new EventEmitter();

// ============ In-Memory Registry ============

const cellRegistry = new Map<string, CognitiveCell>();

// ============ Core Functions ============

/**
 * تسجيل خلية إدراكية جديدة
 */
export function registerCognitiveCell(
  request: RegistrationRequest,
  criteria: CertificationCriteria = DEFAULT_CRITERIA
): { success: boolean; cell?: CognitiveCell; error?: string } {
  
  // Validate awareness level
  if (request.initialAwareness < criteria.minAwarenessLevel) {
    return {
      success: false,
      error: `Awareness level ${request.initialAwareness} is below minimum ${criteria.minAwarenessLevel}`
    };
  }

  // Check if already registered
  if (cellRegistry.has(request.nodeId)) {
    return {
      success: false,
      error: `Node ${request.nodeId} is already registered`
    };
  }

  const now = Date.now();

  const cell: CognitiveCell = {
    nodeId: request.nodeId,
    identity: {
      name: request.name,
      type: request.type,
      version: request.version,
      capabilities: request.capabilities
    },
    certification: {
      awarenessLevel: request.initialAwareness,
      ethicalCompliance: criteria.requiresEthicalCompliance,
      governanceLevel: criteria.governanceLevel,
      certifiedAt: now,
      expiresAt: now + CERTIFICATION_DURATION
    },
    status: {
      isActive: true,
      isConnected: true,
      lastHeartbeat: now,
      connectionQuality: 100
    },
    metrics: {
      totalDecisions: 0,
      totalReflections: 0,
      uptime: 0,
      contributionScore: 0
    },
    metadata: {}
  };

  cellRegistry.set(request.nodeId, cell);
  
  console.log(`[Identity Registry] 🆔 Cognitive cell registered: ${request.name} (${request.nodeId})`);
  registryEvents.emit('cell:registered', cell);

  return { success: true, cell };
}

/**
 * إلغاء تسجيل خلية
 */
export function unregisterCognitiveCell(nodeId: string): boolean {
  const cell = cellRegistry.get(nodeId);
  
  if (!cell) {
    return false;
  }

  cellRegistry.delete(nodeId);
  
  console.log(`[Identity Registry] 🗑️ Cognitive cell unregistered: ${nodeId}`);
  registryEvents.emit('cell:unregistered', nodeId);

  return true;
}

/**
 * تحديث نبضة القلب (Heartbeat)
 */
export function updateHeartbeat(nodeId: string): boolean {
  const cell = cellRegistry.get(nodeId);
  
  if (!cell) {
    return false;
  }

  const now = Date.now();
  cell.status.lastHeartbeat = now;
  cell.status.isConnected = true;
  cell.status.connectionQuality = 100;

  cellRegistry.set(nodeId, cell);
  registryEvents.emit('cell:heartbeat', nodeId);

  return true;
}

/**
 * تحديث معايير الخلية
 */
export function updateCellMetrics(
  nodeId: string,
  updates: Partial<CognitiveCell['metrics']>
): boolean {
  const cell = cellRegistry.get(nodeId);
  
  if (!cell) {
    return false;
  }

  Object.assign(cell.metrics, updates);
  
  // Recalculate contribution score
  cell.metrics.contributionScore = calculateContributionScore(cell);

  cellRegistry.set(nodeId, cell);
  registryEvents.emit('cell:metrics:updated', nodeId, cell.metrics);

  return true;
}

/**
 * حساب نقاط المساهمة
 */
function calculateContributionScore(cell: CognitiveCell): number {
  const { totalDecisions, totalReflections, uptime } = cell.metrics;
  const awarenessLevel = cell.certification.awarenessLevel;

  // Formula: (decisions * 2 + reflections * 3 + uptime/1000 + awareness) / 10
  const score = (
    totalDecisions * 2 +
    totalReflections * 3 +
    uptime / 1000 +
    awarenessLevel
  ) / 10;

  return Math.round(Math.min(score, 100));
}

/**
 * الحصول على خلية
 */
export function getCognitiveCell(nodeId: string): CognitiveCell | undefined {
  return cellRegistry.get(nodeId);
}

/**
 * الحصول على جميع الخلايا
 */
export function getAllCognitiveCells(): CognitiveCell[] {
  return Array.from(cellRegistry.values());
}

/**
 * الحصول على الخلايا النشطة فقط
 */
export function getActiveCells(): CognitiveCell[] {
  return Array.from(cellRegistry.values()).filter(cell => cell.status.isActive);
}

/**
 * الحصول على الخلايا المتصلة فقط
 */
export function getConnectedCells(): CognitiveCell[] {
  return Array.from(cellRegistry.values()).filter(cell => 
    cell.status.isActive && cell.status.isConnected
  );
}

/**
 * فحص حالة الاتصال وتحديث الحالة
 */
export function checkConnectionStatus(): void {
  const now = Date.now();

  cellRegistry.forEach((cell, nodeId) => {
    const timeSinceHeartbeat = now - cell.status.lastHeartbeat;

    if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
      cell.status.isConnected = false;
      cell.status.connectionQuality = 0;
      
      console.log(`[Identity Registry] ⚠️ Cell disconnected: ${nodeId}`);
      registryEvents.emit('cell:disconnected', nodeId);
    } else {
      // Calculate connection quality based on heartbeat freshness
      const quality = Math.max(0, 100 - (timeSinceHeartbeat / HEARTBEAT_TIMEOUT) * 100);
      cell.status.connectionQuality = Math.round(quality);
    }

    cellRegistry.set(nodeId, cell);
  });
}

/**
 * الحصول على إحصائيات السجل
 */
export function getRegistryStatistics() {
  const cells = Array.from(cellRegistry.values());
  const activeCells = cells.filter(c => c.status.isActive);
  const connectedCells = cells.filter(c => c.status.isConnected);

  return {
    total: cells.length,
    active: activeCells.length,
    connected: connectedCells.length,
    avgAwareness: activeCells.length > 0
      ? Math.round(activeCells.reduce((sum, c) => sum + c.certification.awarenessLevel, 0) / activeCells.length)
      : 0,
    avgContribution: activeCells.length > 0
      ? Math.round(activeCells.reduce((sum, c) => sum + c.metrics.contributionScore, 0) / activeCells.length)
      : 0,
    typeDistribution: cells.reduce((acc, c) => {
      acc[c.identity.type] = (acc[c.identity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

/**
 * تهيئة السجل
 */
export function initializeIdentityRegistry(): void {
  console.log('[Identity Registry] 🆔 Initializing Cognitive Cell Registry...');

  // Set up periodic connection check
  setInterval(() => {
    checkConnectionStatus();
  }, 30000); // Check every 30 seconds

  console.log('[Identity Registry] ✅ Identity Registry initialized');
}
