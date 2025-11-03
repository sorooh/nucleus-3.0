// server/scp-external-api.ts
import express, { Request, Response } from "express";
import crypto from "crypto";
import { memoryHub } from "../nucleus/core/memory-hub";
import { knowledgeBus } from "../nucleus/integration/knowledge-bus";
import OpenAI from "openai";

const router = express.Router();

// Initialize OpenAI client (with null check)
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('🤖 [SCP-API] OpenAI client initialized for AI responses');
  } else {
    console.warn('⚠️ [SCP-API] OPENAI_API_KEY not set - AI responses will use fallback');
  }
} catch (error: any) {
  console.error('❌ [SCP-API] Failed to initialize OpenAI:', error.message);
}

// HMAC Verification Middleware
const verifyHMAC = (req: Request, res: Response, next: express.NextFunction) => {
  const signature = req.headers['x-surooh-signature'] as string;
  const secret = process.env.CHAT_HMAC_SECRET;

  if (!secret) {
    return res.status(503).json({
      success: false,
      error: "CHAT_HMAC_SECRET not configured"
    });
  }

  if (!signature) {
    return res.status(401).json({
      success: false,
      error: "Missing X-Surooh-Signature header"
    });
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.log('[SCP-AUTH] Authentication failed from IP:', req.ip);
      return res.status(401).json({
        success: false,
        error: "Invalid signature"
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Signature verification failed"
    });
  }
};

// ✅ SCP Health Check (Public)
router.get("/status", (req: Request, res: Response) => {
  res.json({
    scp_status: "active",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ✅ SCP Ping (Public)
router.get("/ping", (req: Request, res: Response) => {
  res.json({
    message: "SCP Bridge responding successfully 🚀",
  });
});

// ✅ POST /send - Receive messages from Surooh Chat (Protected)
router.post("/send", verifyHMAC, async (req: Request, res: Response) => {
  try {
    const { sessionId, message, userId, metadata } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: sessionId, message"
      });
    }

    // 📋 Full detailed logging
    console.log('\n' + '='.repeat(80));
    console.log('📨 [SCP/SEND] NEW MESSAGE FROM SUROOH CHAT');
    console.log('='.repeat(80));
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('👤 User ID:', userId || 'N/A');
    console.log('💬 Session ID:', sessionId);
    console.log('📝 Message:', message);
    if (metadata) {
      console.log('📊 Metadata:', JSON.stringify(metadata, null, 2));
    }
    console.log('🔍 Full Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🌐 IP Address:', req.ip);
    console.log('🔧 User Agent:', req.headers['user-agent'] || 'N/A');
    console.log('='.repeat(80) + '\n');

    // 🧠 Store in Memory Hub
    const chatMemory = memoryHub.recordInsight({
      type: 'pattern',
      description: `💬 **سُروح Chat (${userId || 'anonymous'})**: ${message}`,
      confidence: 1.0,
      sources: ['surooh-chat'],
      evidence: {
        sessionId,
        userId: userId || 'anonymous',
        message,
        metadata: metadata || {},
        source: 'SUROOH_CHAT',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    });

    console.log('🧠 [Memory Hub] Chat message stored:', chatMemory.id);

    // 📡 Send to Knowledge Bus for platform integration
    try {
      await knowledgeBus.receiveMessage({
        platform: 'SCP',
        direction: 'INBOUND',
        dataType: 'CHAT_MESSAGE',
        payload: {
          sessionId,
          userId: userId || 'anonymous',
          message,
          summary: `Chat from ${userId || 'anonymous'}: ${message.substring(0, 100)}`,
          details: [{ sessionId, userId, message, metadata }]
        },
        metadata: {
          source: 'SUROOH_CHAT',
          priority: 'MEDIUM',
          schemaVersion: '1.0'
        },
        timestamp: new Date().toISOString()
      });
      console.log('📡 [Knowledge Bus] Message forwarded to platform integration');
    } catch (kbError: any) {
      console.warn('⚠️ [Knowledge Bus] Failed to forward message:', kbError.message);
    }

    // 🤖 Generate AI Response using OpenAI
    let aiReply = "مرحباً! كيف يمكنني مساعدتك اليوم؟"; // Default fallback
    let usingFallback = true;
    
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "أنت مساعد ذكي ومفيد لمنصة سُروح. تجيب باللغة العربية بطريقة احترافية ومختصرة. تساعد المستخدمين في استفساراتهم وتقدم معلومات دقيقة ومفيدة."
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        aiReply = completion.choices[0]?.message?.content || aiReply;
        usingFallback = false;
        console.log('🤖 [AI Response] Generated via OpenAI');
      } catch (aiError: any) {
        console.error('⚠️ [AI Response] OpenAI failed, using fallback:', aiError.message);
      }
    } else {
      console.warn('⚠️ [AI Response] OpenAI not available - using fallback response');
    }

    const responseData = {
      success: true,
      message: "Message received and processed",
      reply: aiReply, // ✅ AI Response للتطبيق
      ...(usingFallback && { 
        warning: "AI response unavailable - using fallback greeting" 
      }),
      data: {
        sessionId,
        processed: true,
        memoryId: chatMemory.id,
        timestamp: new Date().toISOString(),
        aiProvider: usingFallback ? 'fallback' : 'openai'
      }
    };

    console.log(`✅ [SCP/SEND] Response sent with ${usingFallback ? 'fallback' : 'AI'} reply`);

    res.json(responseData);
  } catch (error: any) {
    console.error('\n❌ [SCP/SEND] ERROR:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to process message",
      message: error.message
    });
  }
});

// ✅ GET /search - Search chat history in Memory Hub (Protected)
router.post("/search", verifyHMAC, async (req: Request, res: Response) => {
  try {
    const { query, sessionId, userId, limit = 50 } = req.body;

    console.log('\n' + '='.repeat(80));
    console.log('🔍 [SCP/SEARCH] SEARCH REQUEST FROM SUROOH CHAT');
    console.log('='.repeat(80));
    console.log('📝 Query:', query || 'ALL');
    console.log('💬 Session ID:', sessionId || 'ALL');
    console.log('👤 User ID:', userId || 'ALL');
    console.log('📊 Limit:', limit);
    console.log('='.repeat(80) + '\n');

    // Get all chat messages from Memory Hub
    const allInsights = memoryHub.getAllInsights();
    
    // Filter for Surooh Chat messages
    let chatMessages = allInsights.filter(insight => 
      insight.sources.includes('surooh-chat')
    );

    // Filter by sessionId if provided
    if (sessionId) {
      chatMessages = chatMessages.filter(msg => 
        (msg.evidence as any).sessionId === sessionId
      );
    }

    // Filter by userId if provided
    if (userId) {
      chatMessages = chatMessages.filter(msg => 
        (msg.evidence as any).userId === userId
      );
    }

    // Filter by query text if provided
    if (query) {
      chatMessages = chatMessages.filter(msg => 
        msg.description.toLowerCase().includes(query.toLowerCase()) ||
        ((msg.evidence as any).message || '').toLowerCase().includes(query.toLowerCase())
      );
    }

    // Sort by timestamp (newest first) and limit results
    chatMessages = chatMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    console.log(`✅ [SCP/SEARCH] Found ${chatMessages.length} messages`);

    res.json({
      success: true,
      data: {
        total: chatMessages.length,
        messages: chatMessages.map(msg => ({
          id: msg.id,
          message: (msg.evidence as any).message,
          userId: (msg.evidence as any).userId,
          sessionId: (msg.evidence as any).sessionId,
          metadata: (msg.evidence as any).metadata,
          timestamp: new Date(msg.timestamp).toISOString()
        }))
      }
    });
  } catch (error: any) {
    console.error('\n❌ [SCP/SEARCH] ERROR:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: "Failed to search messages",
      message: error.message
    });
  }
});

// ✅ POST /execute - Execute SCP commands (Protected)
router.post("/execute", verifyHMAC, async (req: Request, res: Response) => {
  try {
    const { command, params = {}, sessionId } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: command"
      });
    }

    // 📋 Audit logging (no sensitive data)
    console.log('\n' + '='.repeat(80));
    console.log('⚙️ [SCP/EXECUTE] NEW COMMAND FROM SUROOH CHAT');
    console.log('='.repeat(80));
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('💬 Session ID:', sessionId || 'N/A');
    console.log('📟 Command:', command);
    console.log('🌐 IP Address:', req.ip);
    console.log('🔧 User Agent:', req.headers['user-agent'] || 'N/A');
    console.log('='.repeat(80) + '\n');

    // Execute command via SCP Capabilities
    const { executeCapability } = await import('./scp-capabilities');

    const result = await executeCapability({
      action: command,
      capability: params.capability || 'admin.full',
      params: params,
      sessionId,
      userId: params.userId
    });

    console.log('✅ [SCP/EXECUTE] Command executed successfully');

    res.json(result);
  } catch (error: any) {
    console.error('\n❌ [SCP/EXECUTE] ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: "Failed to execute command",
      message: error.message
    });
  }
});

export default router;
