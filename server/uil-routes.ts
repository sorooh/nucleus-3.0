/**
 * UIL API Routes - Unified Intelligence Layer Endpoints
 * Nucleus 3.1.1
 */

import { Router, Request, Response } from "express";
import {
  UIL_complete,
  UIL_analyze,
  UIL_chat,
  UIL_summarize,
  UIL_plan,
  UIL_code,
  UIL_health,
  UIL_stats,
  type UILRequest,
  type UILResponse,
  type UILError
} from "../nucleus/uil/UIL";

const router = Router();

/**
 * Middleware: Log UIL requests
 */
router.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[UIL] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

/**
 * POST /api/uil/complete
 * General-purpose UIL completion
 */
router.post("/uil/complete", async (req: Request, res: Response) => {
  try {
    const { prompt, taskType, meta, maxTokens, temperature } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "prompt is required and must be a string"
      });
    }

    if (!taskType || !["analysis", "conversation", "summarization", "planning", "coding"].includes(taskType)) {
      return res.status(400).json({
        error: "taskType is required and must be one of: analysis, conversation, summarization, planning, coding"
      });
    }

    const uilRequest: UILRequest = {
      taskType,
      prompt,
      meta,
      maxTokens,
      temperature
    };

    const result: UILResponse = await UIL_complete(uilRequest);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    const uilError = error as UILError;
    res.status(uilError.retryable ? 503 : 500).json({
      success: false,
      error: uilError.error || error.message,
      traceId: uilError.traceId,
      retryable: uilError.retryable || false
    });
  }
});

/**
 * POST /api/uil/analyze
 * Analysis-optimized endpoint
 */
router.post("/uil/analyze", async (req: Request, res: Response) => {
  try {
    const { prompt, meta } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await UIL_analyze(prompt, meta);
    res.json({ success: true, data: result });

  } catch (error: any) {
    const uilError = error as UILError;
    res.status(uilError.retryable ? 503 : 500).json({
      success: false,
      error: uilError.error || error.message,
      traceId: uilError.traceId
    });
  }
});

/**
 * POST /api/uil/chat
 * Conversation-optimized endpoint
 */
router.post("/uil/chat", async (req: Request, res: Response) => {
  try {
    const { prompt, meta } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await UIL_chat(prompt, meta);
    res.json({ success: true, data: result });

  } catch (error: any) {
    const uilError = error as UILError;
    res.status(uilError.retryable ? 503 : 500).json({
      success: false,
      error: uilError.error || error.message,
      traceId: uilError.traceId
    });
  }
});

/**
 * POST /api/uil/summarize
 * Summarization-optimized endpoint
 */
router.post("/uil/summarize", async (req: Request, res: Response) => {
  try {
    const { prompt, meta } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await UIL_summarize(prompt, meta);
    res.json({ success: true, data: result });

  } catch (error: any) {
    const uilError = error as UILError;
    res.status(uilError.retryable ? 503 : 500).json({
      success: false,
      error: uilError.error || error.message,
      traceId: uilError.traceId
    });
  }
});

/**
 * POST /api/uil/plan
 * Planning-optimized endpoint
 */
router.post("/uil/plan", async (req: Request, res: Response) => {
  try {
    const { prompt, meta } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await UIL_plan(prompt, meta);
    res.json({ success: true, data: result });

  } catch (error: any) {
    const uilError = error as UILError;
    res.status(uilError.retryable ? 503 : 500).json({
      success: false,
      error: uilError.error || error.message,
      traceId: uilError.traceId
    });
  }
});

/**
 * POST /api/uil/code
 * Code generation-optimized endpoint
 */
router.post("/uil/code", async (req: Request, res: Response) => {
  try {
    const { prompt, meta } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await UIL_code(prompt, meta);
    res.json({ success: true, data: result });

  } catch (error: any) {
    const uilError = error as UILError;
    res.status(uilError.retryable ? 503 : 500).json({
      success: false,
      error: uilError.error || error.message,
      traceId: uilError.traceId
    });
  }
});

/**
 * GET /api/uil/health
 * Check UIL and Bridge health
 */
router.get("/uil/health", async (req: Request, res: Response) => {
  try {
    const health = await UIL_health();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      healthy: false,
      error: error.message
    });
  }
});

/**
 * GET /api/uil/stats
 * Get UIL statistics
 */
router.get("/uil/stats", async (req: Request, res: Response) => {
  try {
    const stats = await UIL_stats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      available: false
    });
  }
});

export default router;
