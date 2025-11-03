/**
 * Unified Intelligence Layer (UIL) - Nucleus 3.1.1
 * 
 * Central intelligence gateway for all Surooh modules
 * Provides secure, authenticated access to AI Provider Bridge
 */

import crypto from "crypto";
import { generateMockResponse, getMockHealth, getMockStats } from './UIL-Mock';

export type TaskType = "analysis" | "conversation" | "summarization" | "planning" | "coding";

export interface UILRequest {
  taskType: TaskType;
  prompt: string;
  meta?: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
}

export interface UILResponse {
  provider: string;
  latency_ms: number;
  output: string;
  traceId: string;
  taskType: TaskType;
  timestamp: string;
}

export interface UILError {
  error: string;
  traceId: string;
  provider?: string;
  retryable: boolean;
}

const BRIDGE_URL = process.env.BRIDGE_URL || "http://127.0.0.1:7010";
const HMAC_SECRET = process.env.CHAT_HMAC_SECRET || process.env.SESSION_SECRET || "default_secret";
const UIL_ENABLED = process.env.UIL_ENABLED !== "false";
const MOCK_MODE = process.env.UIL_MOCK_MODE === "true";

/**
 * Generate HMAC signature for request authentication
 */
function generateSignature(body: string): string {
  return crypto.createHmac("sha256", HMAC_SECRET).update(body).digest("hex");
}

/**
 * Verify HMAC signature from response
 */
function verifySignature(body: string, signature: string): boolean {
  const expected = generateSignature(body);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Main UIL completion function
 * Routes intelligent tasks to AI Provider Bridge
 */
export async function UIL_complete(req: UILRequest): Promise<UILResponse> {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();

  if (!UIL_ENABLED) {
    throw {
      error: "UIL is disabled",
      traceId,
      retryable: false
    } as UILError;
  }

  // Mock mode for development/testing
  if (MOCK_MODE) {
    const mockResponse = generateMockResponse(req);
    return {
      ...mockResponse,
      taskType: req.taskType,
    };
  }

  try {
    // Prepare request payload
    const payload = {
      messages: [
        { role: "user", content: req.prompt }
      ],
      maxTokens: req.maxTokens || 1024,
      temperature: req.temperature || 0.7,
      taskType: req.taskType,
      taskId: traceId,
      meta: req.meta || {}
    };

    const bodyStr = JSON.stringify(payload);

    // Prepare headers with HMAC authentication
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-SRH-Signature": generateSignature(bodyStr),
      "X-SRH-Caller": "SuroohNucleus",
      "X-Trace-Id": traceId,
      "X-Task-Type": req.taskType
    };

    // Call Bridge API
    const url = `${BRIDGE_URL}/v1/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(65000) // 65s timeout (Bridge has 60s)
    });

    const latency_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw {
        error: `Bridge error ${response.status}: ${errorText}`,
        traceId,
        retryable: response.status >= 500,
        latency_ms
      } as UILError;
    }

    // Parse response
    const data = await response.json();

    // Extract output from OpenAI-compatible format
    let output = "";
    let provider = "unknown";

    if (data.choices && data.choices[0]?.message?.content) {
      output = data.choices[0].message.content;
    } else if (data.content) {
      output = data.content;
    } else {
      output = JSON.stringify(data);
    }

    // Extract provider from response or headers
    provider = data.model || response.headers.get("X-Provider") || "bridge";

    return {
      provider,
      latency_ms,
      output,
      traceId,
      taskType: req.taskType,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    const latency_ms = Date.now() - startTime;

    // Network or timeout errors
    if (error.name === "AbortError" || error.code === "ECONNREFUSED") {
      throw {
        error: "Bridge connection failed - service may be unavailable",
        traceId,
        retryable: true,
        latency_ms
      } as UILError;
    }

    // Re-throw UILError as-is
    if (error.traceId) {
      throw error;
    }

    // Unknown errors
    throw {
      error: error.message || "Unknown UIL error",
      traceId,
      retryable: false,
      latency_ms
    } as UILError;
  }
}

/**
 * UIL Analysis - Optimized for analytical tasks
 */
export async function UIL_analyze(prompt: string, meta?: Record<string, any>): Promise<UILResponse> {
  return UIL_complete({
    taskType: "analysis",
    prompt,
    meta,
    maxTokens: 1024,
    temperature: 0.5
  });
}

/**
 * UIL Conversation - Optimized for chat/dialogue
 */
export async function UIL_chat(prompt: string, meta?: Record<string, any>): Promise<UILResponse> {
  return UIL_complete({
    taskType: "conversation",
    prompt,
    meta,
    maxTokens: 512,
    temperature: 0.8
  });
}

/**
 * UIL Summarization - Optimized for text summarization
 */
export async function UIL_summarize(prompt: string, meta?: Record<string, any>): Promise<UILResponse> {
  return UIL_complete({
    taskType: "summarization",
    prompt,
    meta,
    maxTokens: 512,
    temperature: 0.3
  });
}

/**
 * UIL Planning - Optimized for strategic planning
 */
export async function UIL_plan(prompt: string, meta?: Record<string, any>): Promise<UILResponse> {
  return UIL_complete({
    taskType: "planning",
    prompt,
    meta,
    maxTokens: 1536,
    temperature: 0.6
  });
}

/**
 * UIL Coding - Optimized for code generation
 */
export async function UIL_code(prompt: string, meta?: Record<string, any>): Promise<UILResponse> {
  return UIL_complete({
    taskType: "coding",
    prompt,
    meta,
    maxTokens: 2048,
    temperature: 0.2
  });
}

/**
 * Check UIL health and Bridge connectivity
 */
export async function UIL_health(): Promise<{ healthy: boolean; bridge: any; error?: string }> {
  // Mock mode
  if (MOCK_MODE) {
    return getMockHealth();
  }

  try {
    const url = `${BRIDGE_URL}/health`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return {
        healthy: false,
        bridge: null,
        error: `Bridge returned ${response.status}`
      };
    }

    const data = await response.json();
    return {
      healthy: true,
      bridge: data
    };

  } catch (error: any) {
    return {
      healthy: false,
      bridge: null,
      error: error.message || "Connection failed"
    };
  }
}

/**
 * Get UIL statistics from Bridge
 */
export async function UIL_stats(): Promise<any> {
  // Mock mode
  if (MOCK_MODE) {
    return getMockStats();
  }

  try {
    const url = `${BRIDGE_URL}/stats`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Stats unavailable: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    return {
      error: error.message,
      available: false
    };
  }
}
