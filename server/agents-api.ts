import { Router } from 'express';
import { db } from './db';
import { agents, permissionRequests, agentCommands, insertAgentSchema, insertPermissionRequestSchema } from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Helper: Generate platform-specific HMAC secret
function generatePlatformSecret(platform: string): string {
  const masterSeed = process.env.SRH_HMAC_SECRET || process.env.CENTRAL_HMAC_SECRET || 'test-secret-key';
  
  // Create unique secret for each platform
  // Format: SHA256(platform:masterSeed)
  return crypto
    .createHash('sha256')
    .update(`${platform}:${masterSeed}`)
    .digest('hex');
}

// Helper: Verify HMAC signature with fallback support
function verifySignature(payload: any, signature: string, platform: string): boolean {
  const { signature: _, ...data } = payload;
  const message = JSON.stringify(data);
  
  // Try 1: Platform-specific secret (new system)
  const platformSecret = generatePlatformSecret(platform);
  const expectedPlatformSig = crypto.createHmac('sha256', platformSecret).update(message).digest('hex');
  
  if (signature === expectedPlatformSig) {
    console.log('[AgentsAPI] ✅ Signature verified (platform-specific)');
    return true;
  }
  
  // Try 2: Master secret (fallback for legacy bots)
  const masterSecret = process.env.SRH_HMAC_SECRET || process.env.CENTRAL_HMAC_SECRET || 'test-secret-key';
  const expectedMasterSig = crypto.createHmac('sha256', masterSecret).update(message).digest('hex');
  
  if (signature === expectedMasterSig) {
    console.log('[AgentsAPI] ✅ Signature verified (legacy master secret) - Consider upgrading bot');
    return true;
  }
  
  console.log('[AgentsAPI] ❌ Signature verification failed');
  console.log('  Platform:', platform);
  console.log('  Received:', signature);
  console.log('  Expected (platform):', expectedPlatformSig);
  console.log('  Expected (master):', expectedMasterSig);
  
  return false;
}

// POST /api/agents/notify - Bot activation/status notification
router.post('/notify', async (req, res) => {
  try {
    const { event, unit, uuid, ip, agentType, name, source, timestamp, signature } = req.body;

    // Verify signature using platform-specific secret
    if (!verifySignature(req.body, signature, unit)) {
      return res.status(401).json({ error: 'توقيع غير صالح' });
    }

    console.log(`[AgentsAPI] Event: ${event} from ${agentType} (${unit}) - Source: ${source || 'unknown'}`);

    if (event === 'activated') {
      // Check if agent already exists
      const existing = await db.query.agents.findFirst({
        where: eq(agents.uuid, uuid)
      });

      if (existing) {
        // Update existing agent
        await db.update(agents)
          .set({
            status: 'active',
            lastPing: new Date(),
            ip,
            unit,
            agentType,
            name: name || existing.name,
            source: source || existing.source || 'unknown',
            disconnectedAt: null
          })
          .where(eq(agents.uuid, uuid));

        console.log(`[AgentsAPI] ✅ Agent reactivated: ${uuid}`);
      } else {
        // Create new agent
        await db.insert(agents).values({
          uuid,
          unit,
          agentType,
          name: name || `${unit} ${agentType}`,
          source: source || 'unknown',
          ip,
          status: 'active',
          metadata: { activationTime: timestamp }
        });

        console.log(`[AgentsAPI] ✅ New agent registered: ${uuid}`);
      }

      return res.json({ 
        success: true, 
        message: 'Agent activated successfully',
        uuid 
      });
    }

    if (event === 'reconnected') {
      // Update agent status
      await db.update(agents)
        .set({
          status: 'active',
          lastPing: new Date(),
          disconnectedAt: null
        })
        .where(eq(agents.uuid, uuid));

      console.log(`[AgentsAPI] 🟢 Agent reconnected: ${uuid}`);

      return res.json({ 
        success: true, 
        message: 'Agent reconnected successfully' 
      });
    }

    if (event === 'maintenance_completed') {
      console.log(`[AgentsAPI] ✅ Maintenance completed by ${uuid}: ${req.body.action}`);
      
      return res.json({ 
        success: true, 
        message: 'Maintenance completion recorded' 
      });
    }

    return res.json({ 
      success: true, 
      message: 'Event processed' 
    });

  } catch (error: any) {
    console.error('[AgentsAPI] Notify error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/agents/ping - Heartbeat from bot
router.post('/ping', async (req, res) => {
  try {
    const { uuid, unit, agentType, timestamp, signature } = req.body;

    // Verify signature using platform-specific secret
    if (!verifySignature(req.body, signature, unit)) {
      return res.status(401).json({ error: 'توقيع غير صالح' });
    }

    // Update last ping
    const result = await db.update(agents)
      .set({ 
        lastPing: new Date(),
        status: 'active'
      })
      .where(eq(agents.uuid, uuid))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not found - please activate first' 
      });
    }

    return res.json({ 
      success: true, 
      message: 'Ping received',
      serverTime: Date.now()
    });

  } catch (error: any) {
    console.error('[AgentsAPI] Ping error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const allAgents = await db.query.agents.findMany();
    
    // Count active agents (connected via WebSocket or pinged within last 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const activeCount = allAgents.filter(agent => {
      const lastPingTime = agent.lastPing || agent.activatedAt || new Date(0);
      const isConnected = agent.status === 'connected' || agent.status === 'active';
      return isConnected && lastPingTime >= fiveMinutesAgo;
    }).length;

    // Count pending permission requests
    const pendingRequests = await db.query.permissionRequests.findMany({
      where: eq(permissionRequests.status, 'pending')
    });

    return res.json({
      success: true,
      stats: {
        total: allAgents.length,
        active: activeCount,
        pendingRequests: pendingRequests.length
      }
    });
  } catch (error: any) {
    console.error('[AgentsAPI] Stats error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const allAgents = await db.query.agents.findMany({
      orderBy: [desc(agents.lastPing)]
    });

    // Check for disconnected agents (no ping > 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const enrichedAgents = allAgents.map(agent => {
      const lastPingTime = agent.lastPing || agent.activatedAt || new Date();
      const isDisconnected = lastPingTime < fiveMinutesAgo && agent.status === 'active';
      
      if (isDisconnected && agent.status === 'active') {
        // Mark as disconnected (will be done in background)
        db.update(agents)
          .set({ 
            status: 'disconnected',
            disconnectedAt: new Date()
          })
          .where(eq(agents.id, agent.id))
          .then(() => {
            console.log(`[AgentsAPI] ⚠️ Agent ${agent.uuid} marked as disconnected`);
            // TODO: Send notification to Surooh Chat
          });
      }

      return {
        ...agent,
        isOnline: !isDisconnected,
        lastPingAgo: Math.floor((now.getTime() - lastPingTime.getTime()) / 1000)
      };
    });

    return res.json({ 
      success: true, 
      agents: enrichedAgents,
      total: allAgents.length,
      active: enrichedAgents.filter(a => a.isOnline).length
    });

  } catch (error: any) {
    console.error('[AgentsAPI] List error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:uuid - Get specific agent
router.get('/:uuid', async (req, res) => {
  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.uuid, req.params.uuid)
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get permission requests for this agent
    const permissions = await db.query.permissionRequests.findMany({
      where: eq(permissionRequests.agentId, agent.id),
      orderBy: [desc(permissionRequests.createdAt)],
      limit: 10
    });

    // Get recent commands
    const commands = await db.query.agentCommands.findMany({
      where: eq(agentCommands.agentId, agent.id),
      orderBy: [desc(agentCommands.createdAt)],
      limit: 10
    });

    return res.json({ 
      success: true, 
      agent,
      permissions,
      commands
    });

  } catch (error: any) {
    console.error('[AgentsAPI] Get agent error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/agents/permissions/request - Bot requests permission (from WebSocket)
export async function handlePermissionRequest(requestData: any) {
  try {
    const { requestId, unit, uuid, agentType, action, details } = requestData;

    // Find agent
    const agent = await db.query.agents.findFirst({
      where: eq(agents.uuid, uuid)
    });

    if (!agent) {
      console.error(`[AgentsAPI] Permission request from unknown agent: ${uuid}`);
      return { approved: false, reason: 'Agent not found' };
    }

    // Store permission request
    await db.insert(permissionRequests).values({
      requestId,
      agentId: agent.id,
      action,
      details,
      status: 'pending'
    });

    console.log(`[AgentsAPI] 🔐 Permission request: ${action} from ${agent.name}`);

    // TODO: Send to Surooh Chat for approval
    // For now, auto-approve low-risk actions
    const autoApproved = ['MEMORY_CLEANUP', 'CACHE_CLEANUP', 'LOG_ROTATION'];
    
    if (autoApproved.includes(action)) {
      await db.update(permissionRequests)
        .set({ 
          status: 'approved',
          approvedBy: null, // System auto-approval
          respondedAt: new Date()
        })
        .where(eq(permissionRequests.requestId, requestId));

      console.log(`[AgentsAPI] ✅ Auto-approved: ${action}`);
      return { approved: true, action, requestId };
    }

    // High-risk actions need manual approval
    console.log(`[AgentsAPI] ⏳ Awaiting manual approval: ${action}`);

    return { approved: false, reason: 'Awaiting manual approval', requestId };

  } catch (error: any) {
    console.error('[AgentsAPI] Permission request error:', error);
    return { approved: false, reason: error.message };
  }
}

// POST /api/agents/permissions/:requestId/respond - Approve/Deny permission
router.post('/permissions/:requestId/respond', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approved, reason } = req.body;

    // Get permission request
    const permission = await db.query.permissionRequests.findFirst({
      where: eq(permissionRequests.requestId, requestId)
    });

    if (!permission) {
      return res.status(404).json({ error: 'Permission request not found' });
    }

    // Update status
    await db.update(permissionRequests)
      .set({
        status: approved ? 'approved' : 'denied',
        approvedBy: (req as any).user?.id || null,
        denialReason: approved ? null : reason,
        respondedAt: new Date()
      })
      .where(eq(permissionRequests.requestId, requestId));

    console.log(`[AgentsAPI] ${approved ? '✅ Approved' : '❌ Denied'}: ${permission.action}`);

    // Send response back to bot via WebSocket
    try {
      const { sendPermissionResponse } = await import('./control-websocket');
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, permission.agentId)
      });

      if (agent) {
        await sendPermissionResponse(agent.uuid, {
          requestId,
          approved,
          reason: approved ? null : reason,
          action: permission.action
        });
        console.log(`[AgentsAPI] 📤 Response sent to agent ${agent.uuid}`);
      }
    } catch (wsError: any) {
      console.error(`[AgentsAPI] WebSocket send error:`, wsError.message);
      // Don't fail the response if WS send fails
    }

    return res.json({ 
      success: true, 
      approved, 
      requestId 
    });

  } catch (error: any) {
    console.error('[AgentsAPI] Permission respond error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
