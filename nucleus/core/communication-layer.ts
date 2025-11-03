/**
 * Communication Layer
 * Handles all external communication with Nucleus
 * 
 * Built from zero - clean architecture
 */

import { nucleus } from './nucleus';
import { authModule } from './auth-module';
import { securityGuard } from './security-guard';
import { recoveryManager } from './recovery-manager';
import { refinementEngine } from './refinement-engine';
import { intelligence } from '../intelligence';
import { EventEmitter } from 'events';

// ============================================
// Types
// ============================================

interface CommunicationRequest {
  input: string;
  user?: string;
  context?: Record<string, any>;
  source: 'rest' | 'websocket' | 'internal';
}

interface CommunicationResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

// ============================================
// Communication Layer Class
// ============================================

export class CommunicationLayer extends EventEmitter {
  private connected: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize communication layer
   * Idempotent - safe to call multiple times
   */
  async initialize(): Promise<void> {
    if (this.connected) {
      console.log('📡 Communication Layer already initialized - skipping');
      return;
    }

    // Activate nucleus (with guard)
    const nucleusStatus = nucleus.getStatus();
    if (!nucleusStatus.active) {
      await nucleus.activate();
    }

    // Initialize and register auth module
    await authModule.initialize();
    nucleus.registerModule('auth-module', authModule);

    // Register components with Recovery Manager (after activation)
    const recoveryStatus = recoveryManager.getStatus();
    if (recoveryStatus.active) {
      recoveryManager.registerComponent('nucleus', nucleus);
      recoveryManager.registerComponent('auth-module', authModule);
      recoveryManager.registerComponent('security-guard', securityGuard);
    }
    
    this.connected = true;
    this.emit('communication:ready');
    
    console.log('📡 Communication Layer initialized');
  }

  /**
   * Handle incoming request
   */
  async handleRequest(request: CommunicationRequest): Promise<CommunicationResponse> {
    if (!this.connected) {
      return {
        success: false,
        error: 'Communication layer not initialized',
        timestamp: new Date().toISOString()
      };
    }

    const clientIp = request.context?.ip || 'unknown';
    const endpoint = request.context?.endpoint || '/api/nucleus/think';

    try {
      // Validate request
      if (!request.input || request.input.trim() === '') {
        securityGuard.logRequest({
          ip: clientIp,
          userId: request.user,
          timestamp: Date.now(),
          endpoint,
          success: false
        });

        return {
          success: false,
          error: 'Input is required',
          timestamp: new Date().toISOString()
        };
      }

      // Check rate limit
      const rateLimitOk = securityGuard.checkRateLimit(clientIp, request.user);
      if (!rateLimitOk) {
        securityGuard.logRequest({
          ip: clientIp,
          userId: request.user,
          timestamp: Date.now(),
          endpoint,
          success: false
        });

        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          timestamp: new Date().toISOString()
        };
      }

      this.emit('request:received', { request, source: request.source });

      // Process through nucleus
      const response = await nucleus.process(
        request.input,
        request.context,
        request.user
      );

      // Log successful request
      securityGuard.logRequest({
        ip: clientIp,
        userId: request.user,
        timestamp: Date.now(),
        endpoint,
        success: true
      });

      // Record learning cycle with refinement engine
      const refinementStatus = refinementEngine.getStatus();
      if (refinementStatus.active && response.decision) {
        refinementEngine.recordLearningCycle(
          { input: request.input, context: request.context },
          response.decision,
          'success',
          `Processed successfully with ${response.decision} decision`
        );

        // Analyze decision pattern
        refinementEngine.analyzePattern('decision', {
          input: request.input.substring(0, 50),
          decision: response.decision,
          user: request.user || 'anonymous'
        });
      }

      // Auto-Learning: Log decision in Intelligence System
      try {
        if (intelligence.isInitialized()) {
          await intelligence.logDecision({
            type: response.decision || 'unknown',
            source: 'nucleus-core',
            context: { 
              input: request.input,
              user: request.user,
              requestSource: request.source,
              requestId: response.requestId
            },
            decision: {
              action: response.decision,
              data: response.data
            },
            confidence: Math.round(response.confidence)
          });
        }
      } catch (error) {
        // Silent fail - don't interrupt the main flow
        console.error('[Auto-Learning] Failed to log decision:', error);
      }

      this.emit('response:sent', { response, source: request.source });

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      // Log failed request
      securityGuard.logRequest({
        ip: clientIp,
        userId: request.user,
        timestamp: Date.now(),
        endpoint,
        success: false
      });

      this.emit('error', { error: error.message, request });

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Broadcast message to all connected clients (for WebSocket)
   */
  broadcast(message: any): void {
    this.emit('broadcast', message);
  }

  /**
   * Get communication status
   */
  getStatus() {
    return {
      connected: this.connected,
      nucleusStatus: nucleus.getStatus()
    };
  }

  /**
   * Shutdown communication layer
   */
  async shutdown(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await nucleus.deactivate();
    this.connected = false;
    this.emit('communication:closed');
    
    console.log('📡 Communication Layer shutdown');
  }
}

// ============================================
// Export singleton
// ============================================

export const communicationLayer = new CommunicationLayer();
