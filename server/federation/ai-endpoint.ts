/**
 * Federation AI Endpoint - توزيع ذكاء Llama 3.3 70B
 * POST /api/federation/ai/chat
 * POST /api/federation/ai/generate
 * 
 * يسمح لكل منصات Surooh باستخدام Llama 3.3 70B المستضاف على GPU
 * بدون الحاجة لتشغيل GPU خاص بكل منصة
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  federationAiUsage,
  federationNodes,
  insertFederationAiUsageSchema,
  type InsertFederationAiUsage
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { verifyFederationSecurity } from './security-middleware';
import { ollamaProvider } from '../ai/providers/ollama';

const router = Router();

// ============================================
// Types
// ============================================

interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: 'llama3.3:70b' | 'llama3.2:3b';
  stream?: boolean;
}

interface AIResponse {
  success: boolean;
  response?: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
  error?: string;
}

// ============================================
// Utilities
// ============================================

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `ai-${timestamp}-${random}`;
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  // For Arabic: 1 token ≈ 2-3 characters
  return Math.ceil(text.length / 3.5);
}

/**
 * Log AI usage to database
 */
async function logAIUsage(
  nodeId: string,
  requestId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  processingTime: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(federationAiUsage).values({
      nodeId,
      requestId,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      processingTime,
      success,
      errorMessage
    });
  } catch (error: any) {
    console.error('[Federation AI] Failed to log usage:', error.message);
  }
}

// ============================================
// Endpoints
// ============================================

/**
 * POST /api/federation/ai/chat
 * Chat completion using Llama 3.3 70B
 */
router.post('/ai/chat', verifyFederationSecurity, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    const { nodeId } = (req as any).federationAuth;
    
    // Validate request
    const {
      prompt,
      systemPrompt = 'أنت مساعد ذكي من نيكولاس 3.2 - ذكاء سروح الموحد. تساعد المستخدمين باحترافية بالعربية والإنجليزية.',
      maxTokens = 2000,
      temperature = 0.7,
      model = 'llama3.3:70b',
      stream = false
    } = req.body as AIRequest;
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    // Get node info
    const [node] = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.nodeId, nodeId))
      .limit(1);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Node not found'
      });
    }
    
    console.log(`[Federation AI] Chat request from ${nodeId} (${node.nodeType})`);
    console.log(`[Federation AI] Model: ${model} | MaxTokens: ${maxTokens}`);
    
    // Call Ollama
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
      : prompt;
    
    const aiResponse = await ollamaProvider.generateText(fullPrompt, {
      maxTokens,
      temperature,
      model: model as any
    });
    
    const processingTime = Date.now() - startTime;
    
    // Estimate token usage
    const promptTokens = estimateTokens(fullPrompt);
    const completionTokens = estimateTokens(aiResponse);
    const totalTokens = promptTokens + completionTokens;
    
    // Log usage
    await logAIUsage(
      nodeId,
      requestId,
      model,
      promptTokens,
      completionTokens,
      processingTime,
      true
    );
    
    console.log(`[Federation AI] ✅ Response generated: ${completionTokens} tokens in ${processingTime}ms`);
    
    const response: AIResponse = {
      success: true,
      response: aiResponse,
      model,
      provider: 'Ollama (Self-hosted GPU)',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      processingTime
    };
    
    return res.json(response);
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Federation AI] Chat error:', error.message);
    
    // Log failed usage
    const { nodeId } = (req as any).federationAuth || {};
    if (nodeId) {
      await logAIUsage(
        nodeId,
        requestId,
        req.body.model || 'llama3.3:70b',
        0,
        0,
        processingTime,
        false,
        error.message
      );
    }
    
    return res.status(500).json({
      success: false,
      error: 'AI generation failed',
      details: error.message,
      processingTime
    } as AIResponse);
  }
});

/**
 * POST /api/federation/ai/generate
 * Simple text generation (no system prompt)
 */
router.post('/ai/generate', verifyFederationSecurity, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  try {
    const { nodeId } = (req as any).federationAuth;
    
    // Validate request
    const {
      prompt,
      maxTokens = 1000,
      temperature = 0.7,
      model = 'llama3.3:70b'
    } = req.body as AIRequest;
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    console.log(`[Federation AI] Generate request from ${nodeId}`);
    
    // Call Ollama
    const aiResponse = await ollamaProvider.generateText(prompt, {
      maxTokens,
      temperature,
      model: model as any
    });
    
    const processingTime = Date.now() - startTime;
    
    // Estimate token usage
    const promptTokens = estimateTokens(prompt);
    const completionTokens = estimateTokens(aiResponse);
    const totalTokens = promptTokens + completionTokens;
    
    // Log usage
    await logAIUsage(
      nodeId,
      requestId,
      model,
      promptTokens,
      completionTokens,
      processingTime,
      true
    );
    
    console.log(`[Federation AI] ✅ Generated: ${completionTokens} tokens in ${processingTime}ms`);
    
    const response: AIResponse = {
      success: true,
      response: aiResponse,
      model,
      provider: 'Ollama (Self-hosted GPU)',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens
      },
      processingTime
    };
    
    return res.json(response);
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Federation AI] Generate error:', error.message);
    
    // Log failed usage
    const { nodeId } = (req as any).federationAuth || {};
    if (nodeId) {
      await logAIUsage(
        nodeId,
        requestId,
        req.body.model || 'llama3.3:70b',
        0,
        0,
        processingTime,
        false,
        error.message
      );
    }
    
    return res.status(500).json({
      success: false,
      error: 'AI generation failed',
      details: error.message,
      processingTime
    } as AIResponse);
  }
});

/**
 * GET /api/federation/ai/usage
 * Get AI usage statistics for a node
 */
router.get('/ai/usage', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    const { nodeId } = (req as any).federationAuth;
    const { limit = 100, offset = 0 } = req.query;
    
    // Get usage records
    const records = await db
      .select()
      .from(federationAiUsage)
      .where(eq(federationAiUsage.nodeId, nodeId))
      .orderBy(desc(federationAiUsage.requestedAt))
      .limit(Number(limit))
      .offset(Number(offset));
    
    // Get statistics
    const stats = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        successfulRequests: sql<number>`sum(case when success = 1 then 1 else 0 end)`,
        failedRequests: sql<number>`sum(case when success = 0 then 1 else 0 end)`,
        totalTokens: sql<number>`sum(total_tokens)`,
        totalPromptTokens: sql<number>`sum(prompt_tokens)`,
        totalCompletionTokens: sql<number>`sum(completion_tokens)`,
        avgProcessingTime: sql<number>`avg(processing_time)`
      })
      .from(federationAiUsage)
      .where(eq(federationAiUsage.nodeId, nodeId))
      .then(rows => rows[0]);
    
    return res.json({
      success: true,
      nodeId,
      statistics: {
        totalRequests: Number(stats.totalRequests) || 0,
        successfulRequests: Number(stats.successfulRequests) || 0,
        failedRequests: Number(stats.failedRequests) || 0,
        totalTokens: Number(stats.totalTokens) || 0,
        totalPromptTokens: Number(stats.totalPromptTokens) || 0,
        totalCompletionTokens: Number(stats.totalCompletionTokens) || 0,
        avgProcessingTime: Math.round(Number(stats.avgProcessingTime) || 0)
      },
      records: {
        count: records.length,
        data: records
      }
    });
    
  } catch (error: any) {
    console.error('[Federation AI] Usage query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to query usage',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/ai/models
 * List available AI models
 */
router.get('/ai/models', verifyFederationSecurity, async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      models: [
        {
          id: 'llama3.3:70b',
          name: 'Llama 3.3 70B',
          provider: 'Ollama (Self-hosted)',
          parameters: '70 Billion (Q4 quantized)',
          contextWindow: '128K tokens',
          features: [
            'Arabic & English support',
            'Advanced reasoning',
            'Code generation',
            'Long context',
            'Fast inference on GPU'
          ],
          recommended: true
        },
        {
          id: 'llama3.2:3b',
          name: 'Llama 3.2 3B',
          provider: 'Ollama (Self-hosted)',
          parameters: '3 Billion',
          contextWindow: '128K tokens',
          features: [
            'Lightweight',
            'Fast responses',
            'Basic tasks'
          ],
          recommended: false
        }
      ]
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to list models',
      details: error.message
    });
  }
});

/**
 * GET /api/federation/ai/info
 * Get AI endpoint information (public endpoint for dashboard)
 */
router.get('/ai/info', async (req: Request, res: Response) => {
  try {
    // Get total usage from all platforms
    const totalUsage = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        totalTokens: sql<number>`sum(total_tokens)`,
        activePlatforms: sql<number>`count(distinct node_id)`
      })
      .from(federationAiUsage)
      .then(rows => rows[0]);

    // Get GPU status from environment
    const gpuEndpoint = process.env.OLLAMA_BASE_URL || 'Not configured';
    const podId = process.env.POD_ID || 'Not configured';

    return res.json({
      success: true,
      endpoint: `/api/federation/ai`,
      model: 'llama3.3:70b',
      provider: 'Ollama (Self-hosted GPU)',
      gpu: {
        type: 'A100 SXM (80GB VRAM)',
        endpoint: gpuEndpoint,
        podId,
        performance: '~25 tokens/second',
        cost: '$0.95/hr Spot (~$29/month with auto-stop)'
      },
      usage: {
        totalRequests: Number(totalUsage.totalRequests) || 0,
        totalTokens: Number(totalUsage.totalTokens) || 0,
        activePlatforms: Number(totalUsage.activePlatforms) || 0
      },
      features: [
        '100% Open-Source (Llama 3.3 70B)',
        'Complete data privacy',
        'Unlimited usage',
        'Auto start/stop for cost optimization',
        'Arabic & English support',
        'Fast GPU-accelerated inference'
      ]
    });
  } catch (error: any) {
    console.error('[Federation AI] Info query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get AI info',
      details: error.message
    });
  }
});

export default router;
