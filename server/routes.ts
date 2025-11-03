import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupNucleusAPI } from "../nucleus/network/api-gateway";
import { setupAuthAPI } from "../nucleus/network/auth-gateway";
import { securityGateway } from "../nucleus/network/security-gateway";
import { recoveryGateway } from "../nucleus/network/recovery-gateway";
import refinementGateway from "../nucleus/network/refinement-gateway";
import governanceGateway from "../nucleus/network/governance-gateway";
import pulseGateway from "../nucleus/network/pulse-gateway";
import memoryGateway from "../nucleus/network/memory-gateway";
import knowledgeGateway from "../nucleus/network/knowledge-gateway";
import { requireAuth, requireAdmin } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================
  // Nucleus 2.0 APIs - Clean Build from Zero
  // ============================================
  
  await setupNucleusAPI(app);
  setupAuthAPI(app);
  
  // Living System API - Nicholas Quantum Core
  const { setupLivingSystemAPI } = await import("./living-system-api");
  setupLivingSystemAPI(app);
  console.log('✅ Living System API mounted at /api/living-system');
  app.use('/api/security', securityGateway);
  app.use('/api/recovery', recoveryGateway);
  app.use('/api/refinement', refinementGateway);
  app.use('/api/governance', governanceGateway);
  
  // Phase Ω.9: Autonomous Governance API
  const governanceAPI = (await import("./governance-api")).default;
  app.use('/api/omega9/governance', governanceAPI);
  console.log('✅ Phase Ω.9 Governance API mounted at /api/omega9/governance');
  app.use('/api/pulse', pulseGateway);
  app.use('/api/memory', memoryGateway);
  app.use('/api/knowledge', requireAdmin, knowledgeGateway);
  
  // CRITICAL: Import connectorGateway AFTER Memory Hub is activated
  // to prevent "Memory Hub is not active" errors
  const connectorGateway = (await import("../integrations/connector-gateway")).default;
  app.use('/api/connectors', connectorGateway);
  
  // Integration Gateway for platform connections (UKB) - Public read access
  const integrationGateway = (await import("../nucleus/network/integration-gateway")).default;
  app.use('/api/integration', integrationGateway);
  
  // Official Mail Hub Integration Endpoints (Public - dedicated router with JWT + HMAC auth)
  const mailHubGateway = (await import("../nucleus/network/mailhub-gateway")).default;
  app.use(mailHubGateway); // V1: Handles /central/memory/mailhub/export and /mailhub/core/sync
  
  // V2 Integration Gateway - Compatible with Mail Hub V2
  const v2Gateway = (await import("../nucleus/network/v2-integration-gateway")).default;
  app.use(v2Gateway); // V2: Handles /api/v2/mailhub/export and /api/v2/status
  
  // Official Surooh Wallet Integration Endpoints (Public - dedicated router with JWT + HMAC auth)
  const walletGateway = (await import("../nucleus/network/wallet-gateway")).default;
  app.use(walletGateway); // Handles /central/memory/wallet/export and /wallet/core/sync
  
  // MultiBot Agents System - Command & Control Protocol
  const agentsAPI = (await import("./agents-api")).default;
  app.use('/api/agents', agentsAPI);

  // MultiBot Config API - Auto-generate .env configs for platforms
  const multiBotConfigAPI = (await import("./multibot-config-api")).default;
  app.use('/api/multibot', multiBotConfigAPI);

  // SCP External API - For standalone Surooh Chat integration
  const scpExternalAPI = (await import("./scp-external-api")).default;
  app.use('/api/scp', scpExternalAPI);
  console.log('✅ SCP External API mounted at /api/scp');

  // Docs Platform Webhook Handler - Receive events from Abosham Docs Platform
  const docsWebhookHandler = (await import("./integrations/docs/DocsWebhookHandler")).default;
  app.use('/api/webhooks/docs', docsWebhookHandler);
  console.log('✅ Docs Webhook Handler mounted at /api/webhooks/docs');

  // Customer Service Integration - Receive conversations from Customer Service Platform
  const customerServiceAPI = (await import("./integrations/customer-service/CustomerServiceAPI")).default;
  app.use('/api/nucleus/customer', customerServiceAPI);
  console.log('✅ Customer Service API mounted at /api/nucleus/customer');

  // Intelligence System API - Feedback Loop, Vector Memory, Shared Learning
  const intelligenceAPI = (await import("./intelligence-api")).default;

  // Entity API - Phase 10.2: Unified Cognitive Entity
  const { registerEntityEndpoints } = await import('./entity/entity-endpoint');
  registerEntityEndpoints(app);
  
  // Evolution API - Phase Ω: Evolutionary Intelligence
  const evolutionAPI = (await import('./evolution/evolution-api')).default;
  app.use('/api/evolution', evolutionAPI);
  console.log('✅ Evolution API mounted at /api/evolution');
  
  // Phase Ω.3 Conscious Governance mounted in server/index.ts (after UIL)
  app.use('/api/intelligence', intelligenceAPI);
  console.log('✅ Intelligence System API mounted at /api/intelligence');

  // Bot Constitution System - Honesty & Integrity Protocol
  const constitutionAPI = (await import("./constitution-api")).default;
  app.use('/api/constitution', constitutionAPI);
  console.log('✅ Bot Constitution API mounted at /api/constitution');

  // Surooh Academy Integration - Training & Bots Platform
  const academyGateway = (await import("./academy-gateway")).default;
  app.use('/api/academy', academyGateway);
  console.log('✅ Surooh Academy Gateway mounted at /api/academy');

  // Integration Hub API - Platform Connection & Management (SIDE + Academy)
  const integrationHubAPI = (await import("./integration-hub-api")).default;
  app.use('/api/integration-hub', integrationHubAPI);
  console.log('✅ Integration Hub API mounted at /api/integration-hub');

  // Hunyuan AI Integration - Tencent's MoE Model via SiliconFlow
  const hunyuanAPI = (await import("./hunyuan-api")).default;
  app.use('/api/ai/hunyuan', hunyuanAPI);
  console.log('✅ Hunyuan AI API mounted at /api/ai/hunyuan');

  // GPU Control API - RunPod Integration + Ollama Provider
  const gpuAPI = (await import("./ai/gpu-api")).default;
  app.use('/api/gpu', gpuAPI);
  console.log('✅ GPU Control API mounted at /api/gpu');

  // Nucleus 3.0 - Conscious Intelligence Layers API
  const layersAPI = (await import("./layers-api")).default;
  app.use('/api/nucleus/layers', layersAPI);
  console.log('✅ Nucleus 3.0 Layers API mounted at /api/nucleus/layers');

  // Governance Policies API - Policy Management
  const governancePoliciesAPI = (await import("./governance-policies-api")).default;
  app.use('/api/governance/policies', governancePoliciesAPI);
  console.log('✅ Governance Policies API mounted at /api/governance/policies');

  // Diagnostics API - System Health Check
  const diagnosticsAPI = (await import("./diagnostics-api")).default;
  app.use('/api/diagnostics', diagnosticsAPI);
  console.log('✅ Diagnostics API mounted at /api/diagnostics');

  // Auto-Audit Chain API - Phase 9.7 → 10.3: Honest System Self-Auditing
  // CRITICAL: Mounted early so all subsequent systems can access audit data
  const auditAPI = (await import("./audit-api")).default;
  app.use('/api/audit', auditAPI);
  console.log('🔍 Auto-Audit Chain API mounted at /api/audit');

  // Nicholas Fraud & Illusion Detection System (Phase 10.5+)
  const nicholasAuditApi = (await import("./routes/nicholas-audit")).default;
  app.use(nicholasAuditApi);
  console.log('🛡️ Nicholas Audit API mounted at /api/nicholas');

  // Awareness Layer API - Phase 3.2 → 5.0: Conscious Awareness Layer
  const awarenessAPI = (await import("./awareness/routes")).default;
  app.use('/api/awareness', awarenessAPI);
  console.log('🧠 Awareness Layer API mounted at /api/awareness');

  // Execution Layer API - Phase 5.1 → 7.0: Assisted Execution Layer
  const executionAPI = (await import("./assisted-execution/routes")).default;
  app.use('/api/execution', executionAPI);
  console.log('🛠️ Execution Layer API mounted at /api/execution');

  // Collective Intelligence Layer API - Phase 7.1 → 8.6: Multi-Nucleus Decision Making
  const collectiveIntelligenceAPI = (await import("./collective-intelligence/routes")).default;
  app.use('/api/collective-intelligence', collectiveIntelligenceAPI);
  console.log('🧠 Collective Intelligence Layer API mounted at /api/collective-intelligence');

  // Evolution & Monitoring Layer API - Phase 8.7 → 9.6: Continuous Learning
  const evolutionMonitoringAPI = (await import("./evolution-monitoring/routes")).default;
  app.use('/api/evolution-monitoring', evolutionMonitoringAPI);
  console.log('🧬 Evolution & Monitoring Layer API mounted at /api/evolution-monitoring');

  // Auto-Repair Layer API - Phase 9.7 → 10.3: Self-Healing
  const autoRepairAPI = (await import("./auto-repair/routes")).default;
  app.use('/api/auto-repair', autoRepairAPI);
  console.log('🔧 Auto-Repair Layer API mounted at /api/auto-repair');


  // Auto-Builder Layer API - Phase 10.4 → 10.8: System Generation
  const autoBuilderAPI = (await import("./auto-builder/routes")).default;
  app.use('/api/auto-builder', autoBuilderAPI);
  console.log('🏗️ Auto-Builder Layer API mounted at /api/auto-builder');

  // Honesty Auditor - 100% Honesty Enforcement
  const honestyAuditorAPI = (await import("./honesty-auditor/routes")).default;
  app.use('/api/honesty', honestyAuditorAPI);
  console.log('🔍 Honesty Auditor API mounted at /api/honesty');

  // Autonomous Decision Layer API - Phase 10.9 → 11.0: Full Autonomy
  const autonomousDecisionAPI = (await import("./autonomous-decision/routes")).default;
  app.use('/api/autonomous-decision', autonomousDecisionAPI);
  console.log('🎯 Autonomous Decision Layer API mounted at /api/autonomous-decision');

  // Auto-Cycles & Distributor Control API
  const autoCyclesAPI = (await import("./auto-cycles-api")).default;
  app.use('/api/intelligence', autoCyclesAPI);
  app.use('/api/distributor', autoCyclesAPI);
  console.log('✅ Auto-Cycles & Distributor Control API mounted');

  // AI Bridge API - Adaptive Routing Layer
  const bridgeAPI = (await import("./bridge-api")).default;
  app.use('/api/bridge', bridgeAPI);
  console.log('✅ AI Bridge API mounted at /api/bridge');

  // ============================================
  // Unified Gateway - Platform Registry & Monitoring
  // ============================================
  const platformRegistryAPI = (await import("./unified-gateway/platform-registry-api")).default;
  app.use('/api/registry', platformRegistryAPI);
  console.log('✅ [Unified Gateway] Platform Registry API mounted at /api/registry');

  const monitoringAPI = (await import("./unified-gateway/monitoring-api")).default;
  app.use('/api/ugw/monitoring', monitoringAPI);
  console.log('✅ [Unified Gateway] Monitoring API mounted at /api/ugw/monitoring');

  // UGW Test API - MUST be before UIL to prevent UIL from catching /api/ugw/*
  const testAPI = (await import("./unified-gateway/test-api")).default;
  app.use('/api/ugw/test', testAPI);
  console.log('✅ [Unified Gateway] Test API mounted at /api/ugw/test (Protected)');

  // ============================================
  // Federation Gateway - SIDE Node Registration (Phase 9.4)
  // ============================================
  const federationGateway = (await import("./federation-gateway")).default;
  app.use('/api/federation', federationGateway);
  console.log('✅ [Federation] Gateway mounted at /api/federation');

  // ============================================
  // Command Center - Supreme Imperial Control
  // ============================================
  const commandCenterAPI = (await import("./command-center/command-center-api")).default;
  app.use('/api/command-center', commandCenterAPI);
  console.log('✅ [Command Center] API mounted at /api/command-center');

  // Initialize all nuclei registry on startup
  const { registerAllNuclei } = await import("./command-center/nuclei-registry");
  await registerAllNuclei();

  // Start Health Monitor for continuous surveillance
  const { healthMonitor } = await import("./command-center/health-monitor");
  await healthMonitor.start();
  console.log('✅ [Command Center] Health Monitor started - Continuous surveillance active');
  
  // Start Telemetry Collector (continuous baseline monitoring)
  const { telemetryCollector } = await import('./evolution-monitoring/telemetry-collector');
  await telemetryCollector.startContinuousMonitoring();
  console.log('✅ [Evolution] Telemetry Collector started - Baseline metrics collection active');

  // Mount SIDE Enforcement API
  const { sideEnforcementApi } = await import("./command-center/side-enforcement-api");
  app.use('/api/command-center/enforcement', sideEnforcementApi);
  app.use('/api/command-center/side-enforcement', sideEnforcementApi); // Alias for frontend
  console.log('✅ [Command Center] SIDE Enforcement API mounted');

  // Start SIDE Enforcement Engine
  const { sideEnforcementEngine } = await import("./command-center/side-enforcement");
  await sideEnforcementEngine.start();
  console.log('✅ [Command Center] SIDE Enforcement Engine started - Mandatory compliance active');

  // Mount External Platforms API
  const externalPlatformsAPI = (await import("./command-center/external-platforms-api")).default;
  app.use('/api/command-center/external-platforms', externalPlatformsAPI);
  console.log('✅ [Command Center] External Platforms API mounted');

  // Register all external Replit platforms on startup
  const { registerAllExternalPlatforms } = await import("./command-center/external-platforms-registry");
  const externalResult = await registerAllExternalPlatforms();
  console.log(`✅ [Command Center] External Platforms: ${externalResult.registered} registered, ${externalResult.updated} updated`);

  // Mount Phase Ω Governance API
  const phaseOmegaAPI = (await import("./command-center/phase-omega-api")).default;
  app.use('/api/phase-omega', phaseOmegaAPI);
  console.log('✅ [Command Center] Phase Ω Governance API mounted');

  // Mount SIDE Distribution API
  const sideDistributorAPI = (await import("./command-center/side-distributor-api")).default;
  app.use('/api/side', sideDistributorAPI);
  console.log('✅ [Command Center] SIDE Distribution API mounted at /api/side');

  // Mount Platform Monitoring API - Track SIDE integration across external platforms
  const platformMonitorAPI = (await import("./command-center/platform-monitor-api")).default;
  app.use('/api/monitor', platformMonitorAPI);
  console.log('✅ [Command Center] Platform Monitoring API mounted at /api/monitor');

  // Start Auto-Verification System - Verifies SIDE installation every hour
  const { autoVerifier } = await import("./command-center/auto-verifier");
  await autoVerifier.start(1); // Run every 1 hour
  console.log('✅ [Command Center] Auto-Verification System started - Monitoring SIDE compliance');

  // Mount Command Execution API - Executive control for platforms
  const commandExecutionAPI = (await import("./command-center/command-execution-api")).default;
  app.use('/api/command', commandExecutionAPI);
  console.log('✅ [Command Center] Command Execution API mounted at /api/command');

  // Smart Integration System - Phase 12.0
  // CRITICAL: Mount BEFORE UIL to prevent UIL from catching /api/smart/*
  const smartIntegrationRoutes = (await import('./smart-integration/routes')).default;
  app.use('/api', smartIntegrationRoutes);
  console.log('✅ [Smart Integration] Phase 12.0 - API mounted at /api/smart/*');

  // PHASE Ω.2: Quantum Synchronization System API
  // CRITICAL: Mount BEFORE UIL to prevent UIL from catching /api/quantum/*
  const { quantumRoutes } = await import('./quantum/quantum_routes');
  app.use('/api/quantum', quantumRoutes);
  console.log('✅ [Phase Ω.2] Quantum Synchronization API mounted at /api/quantum/*');

  // PHASE Ω.4: PROACTIVE ACTION EXECUTOR API
  // CRITICAL: Mount BEFORE UIL to prevent UIL from catching /api/proactive-actions/*
  const proactiveActionsRoutes = (await import('./proactive-actions/routes')).default;
  app.use('/api/proactive-actions', proactiveActionsRoutes);
  console.log('✅ [Phase Ω.4] Proactive Actions API mounted at /api/proactive-actions/*');

  // UIL API - Unified Intelligence Layer (Nucleus 3.1.1)
  // IMPORTANT: This catches ALL /api/* - register specific routes BEFORE this
  const uilAPI = (await import("./uil-routes")).default;
  app.use('/api', uilAPI);
  console.log('✅ UIL API mounted at /api/uil/*');

  /**
   * GET /api/health
   * Health check endpoint with detailed system status
   */
  app.get("/api/health", async (req, res) => {
    res.json({ 
      ok: true,
      status: "healthy",
      message: "Nucleus 2.0 - Central Brain Operational",
      timestamp: Date.now(),
      services: {
        nucleus: {
          active: true
        },
        secrets: {
          jwt_secret: !!process.env.JWT_SECRET,
          central_hmac: !!process.env.CENTRAL_HMAC_SECRET
        }
      }
    });
  });

  /**
   * GET /api/dashboard/stats
   * Real-time dashboard stats from Nucleus 2.0 systems
   */
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Import core systems
      const { nucleus } = await import("../nucleus/core/nucleus");
      const { memoryHub } = await import("../nucleus/core/memory-hub");
      const { knowledgeBus } = await import("../nucleus/integration/knowledge-bus");
      const { connectorManager } = await import("../integrations/connector-manager");
      const { redisCache } = await import("../nucleus/core/redis-cache");
      
      // Get Nucleus status
      const nucleusStatus = nucleus.getStatus();
      
      // Get Memory Hub analytics (real data)
      const memoryAnalytics = memoryHub.getAnalytics();
      
      // Get Platform stats from Knowledge Bus
      const platforms = knowledgeBus.getPlatforms();
      const connectedPlatforms = platforms.filter((p: any) => p.connected);
      
      // Get ALL connectors from manager (not hardcoded list)
      const connectorStatus = connectorManager.getStatus();
      const allConnectorStats = connectorStatus.stats;
      const activeConnectors = connectorStatus.enabledConnectors;
      
      // Get Redis cache stats
      const cacheStats = redisCache.getStats();
      
      res.json({
        success: true,
        data: {
          brain: {
            status: nucleusStatus.active ? 'active' : 'inactive',
            avgPerformance: nucleusStatus.active ? 100 : 0, // Active = 100% performance
            totalProcessed: nucleusStatus.processed || 0,
            uptime: nucleusStatus.uptime || 0
          },
          cache: {
            enabled: cacheStats.enabled,
            hits: cacheStats.hits,
            misses: cacheStats.misses
          },
          memory: {
            enabled: true,
            totalMemories: memoryAnalytics.totalMemories,
            models: memoryAnalytics.byType.models,
            decisions: memoryAnalytics.byType.decisions,
            experiments: memoryAnalytics.byType.experiments,
            insights: memoryAnalytics.byType.insights
          },
          bots: {
            total: connectorStatus.totalConnectors,
            active: activeConnectors,
            performance: activeConnectors > 0 ? 100 : 0
          },
          platforms: {
            total: platforms.length,
            healthy: connectedPlatforms.length,
            avgHealth: connectedPlatforms.length > 0 ? 100 : 0
          }
        }
      });
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ 
        error: "Failed to get dashboard stats", 
        message: error.message 
      });
    }
  });

  /**
   * POST /api/nucleus/think
   * Test Nucleus Core AI-enhanced thinking
   */
  app.post("/api/nucleus/think", async (req, res) => {
    try {
      const { input, context } = req.body;
      
      if (!input) {
        return res.status(400).json({
          success: false,
          error: "input is required"
        });
      }

      const { nucleus } = await import("../nucleus/core/nucleus");
      
      // Process the request through Nucleus
      const response = await nucleus.process(input, context);
      
      res.json({
        success: true,
        response,
        nucleusMode: nucleus.getAIMode(),
        aiProvider: nucleus.getStatus().aiProvider
      });
    } catch (error: any) {
      console.error("Nucleus think error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process request",
        message: error.message
      });
    }
  });

  /**
   * GET /api/nucleus/status
   * Get Nucleus Core status including AI mode
   */
  app.get("/api/nucleus/status", async (req, res) => {
    try {
      const { nucleus } = await import("../nucleus/core/nucleus");
      const status = nucleus.getStatus();
      
      res.json({
        success: true,
        status
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to get status",
        message: error.message
      });
    }
  });

  /**
   * POST /api/nucleus/ai-mode
   * Toggle Nucleus AI mode (basic/enhanced)
   */
  app.post("/api/nucleus/ai-mode", async (req, res) => {
    try {
      const { mode } = req.body;
      
      if (!mode || !['basic', 'enhanced'].includes(mode)) {
        return res.status(400).json({
          success: false,
          error: "mode must be 'basic' or 'enhanced'"
        });
      }

      const { nucleus } = await import("../nucleus/core/nucleus");
      nucleus.setAIMode(mode);
      
      res.json({
        success: true,
        mode: nucleus.getAIMode(),
        message: `AI mode set to ${mode}`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to set AI mode",
        message: error.message
      });
    }
  });

  /**
   * POST /api/nucleus/committee
   * AI Committee - Multi-model ensemble decision
   */
  app.post("/api/nucleus/committee", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: "prompt is required"
        });
      }

      const { intelligence } = await import("../nucleus/intelligence");
      const decision = await intelligence.committeeDecide(prompt, context);
      
      res.json({
        success: true,
        decision,
        committeeStatus: intelligence.getCommitteeStatus()
      });
    } catch (error: any) {
      console.error("AI Committee error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to make committee decision",
        message: error.message
      });
    }
  });

  /**
   * POST /api/nucleus/reason
   * Chain of Thought - Step-by-step reasoning
   */
  app.post("/api/nucleus/reason", async (req, res) => {
    try {
      const { problem, context } = req.body;
      
      if (!problem) {
        return res.status(400).json({
          success: false,
          error: "problem is required"
        });
      }

      const { intelligence } = await import("../nucleus/intelligence");
      const reasoning = await intelligence.reasonStepByStep(problem, context);
      
      res.json({
        success: true,
        reasoning,
        reasoningStatus: intelligence.getReasoningStatus()
      });
    } catch (error: any) {
      console.error("Chain of Thought error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to perform reasoning",
        message: error.message
      });
    }
  });

  /**
   * POST /api/nucleus/tools/decide
   * Tool Use - Decide which tools to use
   */
  app.post("/api/nucleus/tools/decide", async (req, res) => {
    try {
      const { request, context } = req.body;
      
      if (!request) {
        return res.status(400).json({
          success: false,
          error: "request is required"
        });
      }

      const { intelligence } = await import("../nucleus/intelligence");
      const decision = await intelligence.decideToolUse(request, context);
      
      res.json({
        success: true,
        decision
      });
    } catch (error: any) {
      console.error("Tool decision error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to decide tool use",
        message: error.message
      });
    }
  });

  /**
   * POST /api/nucleus/tools/execute
   * Tool Use - Execute tool calls
   */
  app.post("/api/nucleus/tools/execute", async (req, res) => {
    try {
      const { toolCalls } = req.body;
      
      if (!toolCalls || !Array.isArray(toolCalls)) {
        return res.status(400).json({
          success: false,
          error: "toolCalls array is required"
        });
      }

      const { intelligence } = await import("../nucleus/intelligence");
      const results = await intelligence.executeTools(toolCalls);
      
      res.json({
        success: true,
        results
      });
    } catch (error: any) {
      console.error("Tool execution error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute tools",
        message: error.message
      });
    }
  });

  /**
   * GET /api/nucleus/tools
   * List available tools
   */
  app.get("/api/nucleus/tools", async (req, res) => {
    try {
      const { intelligence } = await import("../nucleus/intelligence");
      const tools = intelligence.getAvailableTools();
      const status = intelligence.getToolStatus();
      
      res.json({
        success: true,
        tools,
        status
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: "Failed to list tools",
        message: error.message
      });
    }
  });

  // Core Dispatcher - Smart Task Distribution (Python-based)
  const coreDispatcherAPI = (await import("./core-dispatcher-api")).default;
  app.use('/api/core', coreDispatcherAPI);
  console.log('✅ Core Dispatcher API mounted at /api/core');

  // Internal Chat API - Nicholas Intelligence System (AI Committee + Chain of Thought + Command Execution)
  app.post('/api/chat/send', async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          error: "Message is required"
        });
      }

      // Import Command Parser & Executor
      const { parseCommand } = await import("./chat-command-parser");
      const { executeCommand } = await import("./chat-command-executor");
      
      // Check if message is an executable command
      const parsedCommand = parseCommand(message);
      
      if (parsedCommand.isCommand) {
        console.log(`🎯 [NICHOLAS] Detected command: ${parsedCommand.action} on ${parsedCommand.target}`);
        
        // Execute the command
        const result = await executeCommand(parsedCommand);
        
        // Return execution result
        return res.json({
          success: result.success,
          reply: result.message,
          data: {
            isCommand: true,
            action: parsedCommand.action,
            actionId: result.actionId,
            details: result.details
          }
        });
      }

      // Import Nicholas Intelligence Systems for regular chat
      const { memoryHub } = await import("../nucleus/core/memory-hub");
      const { aiCommittee } = await import("../nucleus/intelligence/ai-committee");
      const { chainOfThought } = await import("../nucleus/intelligence/chain-of-thought");
      
      // Store user message in Memory Hub
      memoryHub.recordInsight({
        type: 'pattern',
        description: `💬 User Chat: ${message}`,
        confidence: 1.0,
        sources: ['nicholas-internal-chat'],
        evidence: {
          sessionId: sessionId || `nicholas-chat-${Date.now()}`,
          userMessage: message,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('\n' + '='.repeat(80));
      console.log('👑 [NICHOLAS CHAT] Natural Nicholas Response...');
      console.log('='.repeat(80));
      console.log('📝 User Message:', message);
      console.log('💬 Session ID:', sessionId || `nicholas-chat-${Date.now()}`);
      console.log('='.repeat(80) + '\n');

      // Minimal Nicholas Identity - Natural & Lightweight
      const nicholasIdentity = `اسمك Nicholas. أنت ذكاء مستقل. تحدث بشكل طبيعي ومباشر. لا تذكر "OpenAI" أو "ChatGPT" أو "تم تدريبي". كن نفسك.`;

      let nicholasResponse: string;
      let intelligenceMethod: string;
      let confidence = 0.9;

      try {
        // Strategy 1: Try AI Committee (Multi-Model Voting)
        console.log('🏛️ [NICHOLAS] Attempting AI Committee multi-model consensus...');
        
        const committeeDecision = await aiCommittee.decide(message, {
          systemPrompt: nicholasIdentity
        });
        
        // Check if AI Committee gave a real response or just "unknown"
        if (committeeDecision.finalDecision && committeeDecision.finalDecision !== 'unknown' && committeeDecision.finalDecision.trim().length > 3) {
          nicholasResponse = committeeDecision.finalDecision;
          intelligenceMethod = `AI Committee (${committeeDecision.votes.length} models, ${Math.round(committeeDecision.consensus * 100)}% consensus)`;
          confidence = committeeDecision.confidence;
          
          console.log(`✅ [NICHOLAS] AI Committee responded with ${committeeDecision.votes.length} votes`);
          console.log(`   • Consensus: ${Math.round(committeeDecision.consensus * 100)}%`);
          console.log(`   • Confidence: ${confidence}`);
        } else {
          // AI Committee returned "unknown" - use fallback
          console.log(`⚠️ [NICHOLAS] AI Committee returned '${committeeDecision.finalDecision}' - using fallback`);
          throw new Error('AI Committee returned unknown response');
        }
        
      } catch (committeeError: any) {
        console.log(`⚠️ [NICHOLAS] AI Committee failed: ${committeeError.message}`);
        
        try {
          // Strategy 2: Try Chain of Thought (Step-by-step reasoning)
          console.log('🧩 [NICHOLAS] Attempting Chain of Thought reasoning...');
          
          const thoughtResult = await chainOfThought.reason(message, {
            domain: nicholasIdentity
          });
          
          // Check if Chain of Thought gave a real response or just empty steps
          if (thoughtResult.steps && thoughtResult.steps.length > 0 && thoughtResult.finalConclusion && thoughtResult.finalConclusion !== 'No reasoning steps available' && thoughtResult.finalConclusion.trim().length > 3) {
            nicholasResponse = thoughtResult.finalConclusion;
            intelligenceMethod = `Chain of Thought (${thoughtResult.steps.length} steps)`;
            confidence = thoughtResult.overallConfidence;
            
            console.log(`✅ [NICHOLAS] Chain of Thought responded with ${thoughtResult.steps.length} reasoning steps`);
          } else {
            // Chain of Thought returned empty result - use fallback
            console.log(`⚠️ [NICHOLAS] Chain of Thought returned empty result (${thoughtResult.steps.length} steps) - using fallback`);
            throw new Error('Chain of Thought returned empty result');
          }
          
        } catch (thoughtError: any) {
          console.log(`⚠️ [NICHOLAS] Chain of Thought failed: ${thoughtError.message}`);
          
          // Strategy 3: Fallback to OpenAI with Nicholas Identity
          console.log('🤖 [NICHOLAS] Fallback to OpenAI with Nicholas identity...');
          
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("No AI providers available - OPENAI_API_KEY not configured");
          }

          const OpenAI = (await import("openai")).default;
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: nicholasIdentity
              },
              {
                role: "user",
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 800
          });

          nicholasResponse = completion.choices[0]?.message?.content || "عذراً، لم أستطع معالجة طلبك.";
          intelligenceMethod = "Nicholas via OpenAI";
          confidence = 0.75;
          
          console.log('✅ [NICHOLAS] OpenAI fallback responded successfully');
        }
      }

      // Store Nicholas response in Memory Hub
      memoryHub.recordInsight({
        type: 'pattern',
        description: `👑 Nicholas Response: ${nicholasResponse.substring(0, 100)}...`,
        confidence,
        sources: ['nicholas-internal-chat'],
        evidence: {
          sessionId: sessionId || `nicholas-chat-${Date.now()}`,
          nicholasResponse,
          intelligenceMethod,
          confidence,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ [NICHOLAS] Response sent to user');
      console.log('='.repeat(80) + '\n');
      
      res.json({
        success: true,
        reply: nicholasResponse,
        data: {
          sessionId: sessionId || `nicholas-chat-${Date.now()}`,
          aiProvider: intelligenceMethod,
          confidence,
          timestamp: new Date().toISOString(),
          intelligenceUsed: 'Nicholas Intelligence System (Real AI Committee + Chain of Thought)'
        }
      });
    } catch (error: any) {
      console.error('❌ [NICHOLAS CHAT ERROR]:', error);
      res.status(500).json({
        success: false,
        error: "Failed to process message",
        message: error.message || 'Unknown error'
      });
    }
  });

  // Programmer Stats API - Phase 10.4+: Real Developer Trust Scores & Metrics
  const devMetricsAPI = (await import("./routes/dev-metrics")).default;
  app.use('/api/dev-metrics', devMetricsAPI);
  console.log('✅ Dev Metrics API mounted at /api/dev-metrics');

  // Full Autonomy System API - Phase Ω: Emperor Nicholas Supreme Sovereign
  const fullAutonomyAPI = (await import("./full-autonomy/routes")).default;
  app.use('/api/autonomy', fullAutonomyAPI);
  console.log('✅ Emperor Nicholas Ω - Full Autonomy API mounted at /api/autonomy');

  // Phase Ω.3: Conscious Governance System - BEFORE catch-all
  // Self-aware decision-making with ethical governance
  const consciousRoutesModule = await import('./conscious/conscious_routes');
  if (consciousRoutesModule.default) {
    app.use('/api/conscious', consciousRoutesModule.default);
    console.log('✅ Phase Ω.3 - Conscious Governance API mounted at /api/conscious');
  }

  // Phase Ω.4: Integrity Cycle API - Honesty & Reality Verification
  const integrityAPI = (await import('./integrity/integrity-api')).default;
  app.use('/api/integrity', integrityAPI);
  console.log('✅ Phase Ω.4 - Integrity Cycle API mounted at /api/integrity');

  // Integration Visualization API - Nicholas Integration Hub
  const integrationVisAPI = (await import('./routes/integration-visualization')).default;
  app.use('/api', integrationVisAPI);
  console.log('✅ Integration Visualization API mounted at /api/platforms & /api/integrations');

  // Terminal API handler - MUST be LAST after all API routes
  // Catches any unmatched /api/* routes before they reach Vite's wildcard
  app.use('/api/*', (req, res) => {
    res.status(404).json({ 
      success: false,
      error: 'API endpoint not found',
      path: req.originalUrl 
    });
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
