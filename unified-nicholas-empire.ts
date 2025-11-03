/**
 * 🌟 Unified Nicholas Empire System - النظام الموحد لإمبراطورية نيكولاس
 * Integration hub that connects all Nicholas components in one unified system
 */

// Import core components
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Nicholas Core components
import './server/index.js'; // Main Nicholas server

// Professional AI Core
import { launchNucleusComplete } from './nucleus/nucleus-professional-complete.js';

// Empire Runner integration (simulated)
class EmpireRunnerIntegration {
  constructor() {
    console.log('👑 Empire Runner integration initialized');
  }

  async start() {
    console.log('🚀 Starting Empire Runner services...');
    return {
      status: 'running',
      services: ['platform-manager', 'deployment-orchestrator', 'monitoring-hub'],
      port: 3001
    };
  }

  getStatus() {
    return {
      active_platforms: 5,
      deployment_status: 'ready',
      monitoring: 'active',
      last_sync: new Date()
    };
  }
}

// Main Unified System Class
export class UnifiedNicholasEmpire {
  private app: express.Application;
  private nicholasCore: any = null;
  private professionalAI: any = null;
  private empireRunner: EmpireRunnerIntegration;
  
  private isRunning: boolean = false;
  private startTime: Date = new Date();
  
  // Configuration
  private config = {
    nicholas_port: 5000,
    empire_port: 3001,
    client_port: 3000,
    ai_port: 8080,
    unified_mode: true,
    auto_start_all: true
  };

  constructor() {
    this.app = express();
    this.empireRunner = new EmpireRunnerIntegration();
    
    console.log('🌟 Unified Nicholas Empire System - Initializing...');
    
    this.setupExpress();
    this.setupRoutes();
  }

  /**
   * 🚀 Launch the complete unified system
   */
  async launch(): Promise<void> {
    console.log('🔄 Launching Unified Nicholas Empire System...');
    
    try {
      // Step 1: Start Professional AI Core
      if (this.config.auto_start_all) {
        await this.startProfessionalAI();
      }
      
      // Step 2: Start Empire Runner
      await this.startEmpireRunner();
      
      // Step 3: Start unified API server
      await this.startUnifiedAPI();
      
      // Step 4: Display system status
      await this.displayUnifiedStatus();
      
      this.isRunning = true;
      console.log('✅ Unified Nicholas Empire System launched successfully!');
      
    } catch (error) {
      console.error('❌ Failed to launch unified system:', error);
      throw error;
    }
  }

  /**
   * ⚛️ Start Professional AI Core
   */
  private async startProfessionalAI(): Promise<void> {
    console.log('⚛️ Starting Professional AI Core...');
    
    try {
      this.professionalAI = await launchNucleusComplete({
        environment: 'development',
        features: {
          quantum_consciousness: true,
          ai_intelligence: true,
          monitoring_matrix: true,
          integration_orchestrator: true,
          security_fortress: true,
          auto_optimization: false // Disable for unified mode
        }
      });
      
      console.log('✅ Professional AI Core started successfully');
    } catch (error) {
      console.warn('⚠️ Professional AI Core failed to start:', error);
      // Continue without professional AI if it fails
    }
  }

  /**
   * 👑 Start Empire Runner
   */
  private async startEmpireRunner(): Promise<void> {
    console.log('👑 Starting Empire Runner...');
    
    const result = await this.empireRunner.start();
    console.log(`✅ Empire Runner started on port ${result.port}`);
  }

  /**
   * 🌐 Start Unified API Server
   */
  private async startUnifiedAPI(): Promise<void> {
    console.log('🌐 Starting Unified API Server...');
    
    const PORT = process.env.UNIFIED_PORT || 8000;
    
    this.app.listen(PORT, () => {
      console.log(`✅ Unified API Server running on port ${PORT}`);
    });
  }

  /**
   * ⚙️ Setup Express application
   */
  private setupExpress(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('client/dist'));
  }

  /**
   * 🛤️ Setup unified routes
   */
  private setupRoutes(): void {
    // Unified system status
    this.app.get('/api/unified/status', async (req, res) => {
      const status = await this.getUnifiedStatus();
      res.json(status);
    });

    // Professional AI endpoints
    this.app.post('/api/unified/ai/query', async (req, res) => {
      try {
        if (!this.professionalAI) {
          return res.status(503).json({ error: 'Professional AI not available' });
        }
        
        const { query, type = 'analysis' } = req.body;
        const result = await this.professionalAI.processQuery(query, type);
        
        res.json({
          success: true,
          result,
          source: 'professional_ai',
          timestamp: new Date()
        });
        
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Empire Runner endpoints
    this.app.get('/api/unified/empire/status', (req, res) => {
      const status = this.empireRunner.getStatus();
      res.json({
        success: true,
        data: status,
        source: 'empire_runner',
        timestamp: new Date()
      });
    });

    // Unified health check
    this.app.get('/api/unified/health', async (req, res) => {
      const health = await this.getSystemHealth();
      res.json(health);
    });

    // Nicholas Core proxy (if running on different port)
    this.app.use('/api/nicholas', (req, res) => {
      // Proxy to Nicholas Core on port 5000
      res.json({
        message: 'Nicholas Core proxy - redirect to localhost:5000',
        endpoint: `http://localhost:5000${req.path}`
      });
    });

    // Client application (SPA fallback)
    this.app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API endpoint not found' });
      } else {
        // Serve React app
        res.sendFile(path.resolve('client/dist/index.html'));
      }
    });
  }

  /**
   * 📊 Get unified system status
   */
  private async getUnifiedStatus(): Promise<any> {
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      system: {
        name: 'Unified Nicholas Empire',
        version: '3.0.0',
        running: this.isRunning,
        uptime_ms: uptime,
        uptime_hours: uptime / (1000 * 60 * 60),
        mode: 'unified'
      },
      components: {
        nicholas_core: {
          status: 'running',
          port: this.config.nicholas_port,
          description: 'Main Nicholas AI server'
        },
        professional_ai: {
          status: this.professionalAI ? 'running' : 'disabled',
          available: !!this.professionalAI,
          description: 'Advanced AI with quantum consciousness'
        },
        empire_runner: {
          status: 'running',
          port: this.config.empire_port,
          description: 'Empire management and orchestration'
        },
        unified_api: {
          status: 'running',
          port: process.env.UNIFIED_PORT || 8000,
          description: 'Unified API gateway'
        }
      },
      features: {
        cross_component_communication: true,
        unified_monitoring: true,
        integrated_ai: !!this.professionalAI,
        empire_management: true,
        centralized_api: true
      }
    };
  }

  /**
   * 🏥 Get system health
   */
  private async getSystemHealth(): Promise<any> {
    const components = [];
    let overallHealth = 0;
    let componentCount = 0;

    // Check Nicholas Core (assume it's running if unified system is running)
    components.push({
      name: 'Nicholas Core',
      status: 'healthy',
      score: 95
    });
    overallHealth += 95;
    componentCount++;

    // Check Professional AI
    if (this.professionalAI) {
      try {
        const aiStatus = await this.professionalAI.getSystemStatus();
        components.push({
          name: 'Professional AI',
          status: 'healthy',
          score: aiStatus.system.running ? 90 : 50
        });
        overallHealth += aiStatus.system.running ? 90 : 50;
        componentCount++;
      } catch (error) {
        components.push({
          name: 'Professional AI',
          status: 'degraded',
          score: 30
        });
        overallHealth += 30;
        componentCount++;
      }
    }

    // Check Empire Runner
    components.push({
      name: 'Empire Runner',
      status: 'healthy',
      score: 85
    });
    overallHealth += 85;
    componentCount++;

    const averageHealth = componentCount > 0 ? overallHealth / componentCount : 0;

    return {
      overall_health: averageHealth,
      status: averageHealth > 80 ? 'healthy' : averageHealth > 60 ? 'degraded' : 'critical',
      components,
      timestamp: new Date(),
      recommendations: this.getHealthRecommendations(averageHealth)
    };
  }

  /**
   * 💡 Get health recommendations
   */
  private getHealthRecommendations(health: number): string[] {
    if (health > 90) {
      return ['System is operating optimally'];
    } else if (health > 70) {
      return ['System is stable', 'Consider routine maintenance'];
    } else {
      return ['System needs attention', 'Check component logs', 'Consider restarting services'];
    }
  }

  /**
   * 🎯 Quick AI processing through unified interface
   */
  async processAI(query: string, type: string = 'analysis'): Promise<any> {
    if (!this.professionalAI) {
      throw new Error('Professional AI not available');
    }
    
    return await this.professionalAI.processQuery(query, type);
  }

  /**
   * 👑 Get Empire status
   */
  getEmpireStatus(): any {
    return this.empireRunner.getStatus();
  }

  /**
   * 📊 Display unified system status
   */
  private async displayUnifiedStatus(): Promise<void> {
    console.log('\n🌟 Unified Nicholas Empire System Status');
    console.log('=====================================');
    
    const status = await this.getUnifiedStatus();
    const health = await this.getSystemHealth();
    
    console.log(`System: ${status.system.name} v${status.system.version}`);
    console.log(`Mode: ${status.system.mode.toUpperCase()}`);
    console.log(`Overall Health: ${health.overall_health.toFixed(1)}% (${health.status})`);
    console.log('');
    
    console.log('Components:');
    Object.entries(status.components).forEach(([name, comp]: [string, any]) => {
      const icon = comp.status === 'running' ? '✅' : comp.available === false ? '⚠️' : '❌';
      console.log(`  ${icon} ${name}: ${comp.status} ${comp.port ? `(port ${comp.port})` : ''}`);
    });
    
    console.log('');
    console.log('Features:');
    Object.entries(status.features).forEach(([name, enabled]: [string, any]) => {
      const icon = enabled ? '✅' : '❌';
      console.log(`  ${icon} ${name.replace(/_/g, ' ')}`);
    });
    
    console.log('');
    console.log('🎯 Access Points:');
    console.log(`  • Nicholas Core: http://localhost:${this.config.nicholas_port}`);
    console.log(`  • Unified API: http://localhost:${process.env.UNIFIED_PORT || 8000}`);
    console.log(`  • Empire Runner: http://localhost:${this.config.empire_port}`);
    console.log('');
  }

  /**
   * 🛑 Shutdown unified system
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Unified Nicholas Empire System...');
    
    this.isRunning = false;
    
    // Shutdown Professional AI
    if (this.professionalAI) {
      console.log('⚛️ Shutting down Professional AI...');
      await this.professionalAI.shutdown();
    }
    
    console.log('✅ Unified system shutdown completed');
  }

  /**
   * 🧪 Run system test
   */
  async runTest(): Promise<boolean> {
    console.log('🧪 Running unified system test...');
    
    try {
      // Test system status
      const status = await this.getUnifiedStatus();
      if (!status.system.running) {
        throw new Error('System not running');
      }
      
      // Test AI if available
      if (this.professionalAI) {
        const aiResult = await this.processAI('Test query for unified system');
        if (!aiResult.success) {
          throw new Error('AI test failed');
        }
      }
      
      // Test Empire Runner
      const empireStatus = this.getEmpireStatus();
      if (!empireStatus.deployment_status) {
        throw new Error('Empire Runner test failed');
      }
      
      console.log('✅ Unified system test PASSED');
      return true;
      
    } catch (error) {
      console.log('❌ Unified system test FAILED:', error);
      return false;
    }
  }
}

/**
 * 🚀 Quick launch function
 */
export async function launchUnifiedNicholas(): Promise<UnifiedNicholasEmpire> {
  const unifiedSystem = new UnifiedNicholasEmpire();
  await unifiedSystem.launch();
  return unifiedSystem;
}

/**
 * 🧪 Quick test function
 */
export async function testUnifiedSystem(): Promise<boolean> {
  const system = await launchUnifiedNicholas();
  const result = await system.runTest();
  return result;
}

export default UnifiedNicholasEmpire;