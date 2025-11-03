/**
 * PHASE 11.5: EMPIRE PRO+ TYPES
 * Type definitions for Emperor Nicholas Autonomous Bootstrap Runner
 */

export type ServiceName =
  | 'nicholasCore'      // Main Nicholas server (server/index.ts)
  | 'autoDev'           // Auto Development Engine
  | 'academy'           // Academy Intelligence
  | 'sideIntegration'   // SIDE Integration
  | 'monitoring'        // Professional Monitoring
  | 'governance'        // Autonomous Governance
  | 'memoryBridge'      // Memory Intelligence Bridge
  | 'dna'               // Digital DNA Engine
  | 'quantumMesh'       // Quantum Command Mesh
  | 'consciousness'     // Consciousness Layer
  | 'evolution'         // Evolution Engine
  | 'collectiveIntel'   // Collective Intelligence
  | 'fullAutonomy';     // Full Autonomy System (Phase Ω)

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  details?: Record<string, unknown>;
  timestamp: string;
  uptime?: number;
}

export interface ServiceDescriptor {
  name: ServiceName;
  displayName: string;
  start: () => Promise<void>;
  health: () => Promise<ServiceHealth>;
  stop?: () => Promise<void>;
  priority: number; // Lower = starts earlier
  critical: boolean; // If true, system fails if service fails
}

export interface EmpireContext {
  env: NodeJS.ProcessEnv;
  logger: import('pino').Logger;
  startTime: number;
}

export interface BootstrapResult {
  success: boolean;
  startedServices: ServiceName[];
  failedServices: Array<{ name: ServiceName; error: string }>;
  totalTime: number;
}
