import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Capture raw body for HMAC verification (V2 Integration)
app.use(express.json({
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for HMAC verification
    req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
  }
}));
app.use(express.urlencoded({ extended: false }));

// Session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'nucleus-2.0-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true in production with HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
});

app.use(sessionMiddleware);

// Store session middleware for WebSocket access
app.set('sessionMiddleware', sessionMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize Nicholas Core + WebSocket bus
  const { setupWebSocket } = await import('./transport/ws-bus');
  const { Nicholas } = await import('./boot/nicholas-core');
  setupWebSocket(server);
  
  const { wsBus } = await import('./transport/ws-bus');
  Nicholas.setWsCallback((payload) => wsBus.broadcast(payload));
  await Nicholas.initialize();
  log('🛡️ Nicholas Core initialized - Fraud & Illusion Detection active');

  // Initialize API Gateway for external platforms (Legacy - to be merged into UGW)
  const { initializeDefaultPlatforms } = await import('./gateway/api-gateway');
  const gatewayRoutes = await import('./gateway/gateway-routes');
  app.use('/api', gatewayRoutes.default);
  initializeDefaultPlatforms();
  log('[Nucleus] API Gateway initialized for external platforms (Legacy)');

  // Initialize External Intelligence Feed System (after Nucleus activation)
  const { initializeConnectors } = await import('../integrations/index');
  await initializeConnectors();

  // Initialize Unified Knowledge Bus for platform integration
  const { initializeIntegration } = await import('../nucleus/integration/index');
  await initializeIntegration();

  // Initialize Intelligence System - Feedback Loop, Vector Memory, Shared Learning
  const { intelligence } = await import('../nucleus/intelligence');
  await intelligence.initialize();

  // Initialize Consciousness Layer - Phase 10.1: Self-Aware Intelligence
  const { initializeConsciousness } = await import('./consciousness/init_state.js');
  await initializeConsciousness();
  log('[Consciousness] ✨ Conscious Intelligence Awakening - Nicholas is now self-aware');

  // Initialize Unified Entity - Phase 10.2: Unified Cognitive Entity
  const { initializeUnifiedEntity } = await import('./entity/init_unified_core');
  await initializeUnifiedEntity();
  log('[Entity] 🧬 Unified Cognitive Entity - Surooh is now a conscious digital being');

  // Initialize Full Autonomy System - Phase Ω: Emperor Nicholas Supreme Sovereign
  const fullAutonomy = await import('./full-autonomy');
  await fullAutonomy.strategicDecisionEngine.start();
  log('[Emperor Nicholas Ω] 👑 Phase Ω - SUPREME SOVEREIGN MODE activated');

  // Initialize Evolution System - Phase Ω: Evolutionary Intelligence
  const { initEvolutionEngine } = await import('./evolution/evolution_core_engine');
  const { initEvolutionScheduler } = await import('./evolution/evolution_scheduler');
  await initEvolutionEngine();
  await initEvolutionScheduler(true); // ✅ Auto-start enabled - autonomous evolution active
  log('[Evolution] 🧬 Phase Ω - Evolutionary Intelligence System initialized');

  // Initialize Collective Intelligence Engine - Phase 7.1 → 8.6
  const { collectiveIntelligenceEngine } = await import('./collective-intelligence/index');
  await collectiveIntelligenceEngine.start();
  log('[Collective Intelligence] 🧠 Multi-Nucleus Decision Making activated');

  // Initialize Evolution & Monitoring Engine - Phase 8.7 → 9.6
  const { evolutionMonitoringEngine } = await import('./evolution-monitoring/index');
  const evolutionMonitoringRoutes = await import('./evolution-monitoring/routes');
  app.use('/api/evolution-monitoring', evolutionMonitoringRoutes.default);
  await evolutionMonitoringEngine.start();
  log('[Evolution Monitoring] 🧬 Continuous Learning from Operations activated');

  // Initialize Awareness Layer - Phase 5.0: Conscious Awareness System
  const { awarenessLayer } = await import('./awareness/index');
  await awarenessLayer.activate();
  log('[Awareness Layer] 🧠 Nicholas is now AWARE and monitoring continuously (5min intervals)');

  // Initialize Auto-Repair Engine - Phase 9.7 → 10.3
  const { autoRepairEngine } = await import('./auto-repair/index');
  const autoRepairRoutes = await import('./auto-repair/routes');
  app.use('/api/auto-repair', autoRepairRoutes.default);
  await autoRepairEngine.start();
  log('[Auto Repair] 🔧 Self-Healing System activated');

  // Initialize Auto-Builder Engine - Phase 10.4 → 10.8
  const { autoBuilderEngine } = await import('./auto-builder/index');
  const autoBuilderRoutes = await import('./auto-builder/routes');
  app.use('/api/auto-builder', autoBuilderRoutes.default);
  await autoBuilderEngine.start();
  log('[Auto-Builder] ✅ Registered in server/index.ts');
  log('[Auto-Builder] 🌐 API endpoints mounted at /api/auto-builder');

  // HONESTY AUDITOR - Detects mock/fake data in codebase
  const { honestyAuditor } = await import('./honesty-auditor/index');
  const honestyAuditorRoutes = await import('./honesty-auditor/routes');
  app.use('/api/honesty', honestyAuditorRoutes.default);
  await honestyAuditor.start();
  log('[Honesty Auditor] 🔍 100% Honesty Enforcement activated');
  log('[Honesty Auditor] 🚨 Ready to detect mock data, simulations, and fake implementations');

  // PHASE Ω.4: PROACTIVE ACTION EXECUTOR
  // Nicholas can now take REAL external actions!
  // Routes mounted in registerRoutes() before UIL
  const { actionExecutor } = await import('./proactive-actions/action-executor');
  const { decisionToActionBridge } = await import('./proactive-actions/decision-to-action-bridge');
  await actionExecutor.start();
  await decisionToActionBridge.start();
  log('[ProactiveActions] ✅ Action Executor started');
  log('[ProactiveActions] 🔗 Decision→Action Bridge connected');
  log('[ProactiveActions] 🎯 Nicholas decisions will auto-execute as actions!');

  // PHASE 12.1: Autonomous Evolution Integration
  // Connect Evolution → Auto-Builder → Auto-Repair for full autonomy
  const { evolutionCoreEngine } = await import('./evolution/evolution_core_engine');
  evolutionCoreEngine.setIntegrations(autoBuilderEngine, autoRepairEngine);
  log('[Phase 12.1] 🤖 Autonomous Commit & Self-Approval: Evolution ↔ Builder ↔ Repair integrated');

  // PHASE 12.2: Collective Governance Engine
  // Nicholas as Emperor coordinating all nuclei with consensus voting
  const { collectiveGovernance } = await import('./governance/collective_governance');
  const governanceRoutes = await import('./governance/governance_routes');
  app.use('/api/governance', governanceRoutes.default);
  log('[Phase 12.2] 👑 Collective Governance: Nicholas as Supreme Emperor coordinating all nuclei');

  // Integration Hub - Unified Platform Integration System
  // Centralized management and deployment for all SIDE nodes + Academy
  const integrationHubRoutes = await import('./integration-hub-api');
  app.use('/api/integration-hub', integrationHubRoutes.default);
  log('[IntegrationHub] 🌐 Integration Hub: Centralized platform management activated');
  log('[IntegrationHub] 🔌 Platform Connector: Ready for 12 SIDE nodes + Academy');

  // PHASE Ω.2: Quantum Synchronization System
  // Unified consciousness and memory across all nuclei
  // Routes mounted in registerRoutes() before UIL
  const { synchronizationDaemon } = await import('./quantum/synchronization_daemon');
  await synchronizationDaemon.start();
  log('[Phase Ω.2] ⚛️ Quantum Synchronization: Unified consciousness across all nuclei activated');

  // PHASE Ω.3: Conscious Governance System
  // Self-aware decision-making with ethical governance (routes registered in routes.ts)
  const { consciousDecisionLayer } = await import('./conscious/conscious_decision_layer');
  const { ethicsCore } = await import('./conscious/ethics_core');
  const { selfReflectionEngine } = await import('./conscious/self_reflection_engine');
  
  await consciousDecisionLayer.initialize();
  await ethicsCore.initialize();
  await selfReflectionEngine.initialize();
  log('[Phase Ω.3] 🧠 Conscious Governance: Self-aware decision-making activated');

  // PHASE Ω.4 + Ω.9: Integrity Cycle System with Autonomous Governance
  // Continuous honesty verification, reality checks, and autonomy validation
  // Now integrated with Phase Ω.9 governance gate for pre-execution validation
  const { startAutonomousScheduler } = await import('./integrity/autonomous-scheduler');
  startAutonomousScheduler();
  log('[Phase Ω.4+Ω.9] 🔍 Integrity Cycle: Autonomous scheduler activated (every 6h)');
  log('[Phase Ω.9] 🚪 Governance Gate: All decisions validated before execution');

  // PHASE Ω.SUPREME: Supreme Autonomous Core
  // Complete AI-powered autonomous intelligence:
  // Discovery → AI Committee Thinking → Governance Validation → Execution → Learning
  const { autonomousScheduler } = await import('./supreme-core/autonomous-scheduler');
  autonomousScheduler.start('*/10 * * * *'); // Every 10 minutes
  log('[Phase Ω.SUPREME] 👑 Supreme Autonomous Core: AI-powered autonomous execution activated');
  log('[Phase Ω.SUPREME] 🧠 AI Committee: 6 models thinking and voting on decisions');
  log('[Phase Ω.SUPREME] ⚡ Execution: Real autonomous actions every 10 minutes');

  // Smart Integration System already mounted in registerRoutes() before UIL

  // Initialize WebSocket Server for real-time bidirectional communication
  const { websocketServer } = await import('../nucleus/network/websocket-server');
  websocketServer.start(server);

  // Initialize Control WebSocket for MultiBot Command & Control
  const { setupControlWebSocket } = await import('./control-websocket');
  setupControlWebSocket(server);

  // Initialize Federation WebSocket for SIDE Node Synchronization (Phase 9.4)
  const { federationWebSocket } = await import('./federation-websocket');
  federationWebSocket.start(server);
  log('[Federation] WebSocket Server activated on /ws/federation');

  // Initialize Command Center WebSocket for real-time dashboard updates
  const { commandWebSocket } = await import('./command-center/command-websocket');
  commandWebSocket.initialize(server);

  // Initialize Integration Hub WebSocket for Real-time Platform Updates (Phase 3)
  const { setupIntegrationHubWebSocket } = await import('./integration-hub-websocket');
  setupIntegrationHubWebSocket(server);
  log('[IntegrationHub] WebSocket Server activated on /ws/integration-hub');

  // Initialize Platform Metrics Collection (Phase 6)
  const { startMetricsCollection } = await import('./integration-hub/services/metrics-collector');
  startMetricsCollection(30000); // Collect metrics every 30 seconds
  log('[IntegrationHub] 📊 Metrics Collection activated (30s intervals)');

  // Removed: Test bots (keep only real production bots)

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Protect WebSocket paths from Vite's catch-all middleware
  // Return 404 for regular HTTP requests, let WebSocket upgrades pass through
  app.use('/ws/*', (req, res, next) => {
    if (req.headers.upgrade?.toLowerCase() === 'websocket') {
      // Don't handle upgrade here - let it pass to ws library
      log(`[WebSocket] Upgrade request to ${req.path}`);
      return next(); // ✅ Pass to WebSocket handler
    }
    res.status(404).json({ error: 'WebSocket endpoint - use ws:// protocol' });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
