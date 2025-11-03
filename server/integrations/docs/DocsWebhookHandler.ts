/**
 * Docs Webhook Handler - Receive events from Abosham Docs Platform
 * 
 * Inbound webhook handler for document events
 * Events: document.created, document.analyzed, document.updated
 * Security: HMAC-SHA256 signature verification
 */

import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import { memoryHub } from "../../../nucleus/core/memory-hub";

const router: Router = express.Router();

// Note: Raw body is already captured in server/index.ts global middleware
// No need to apply express.json() again here

/**
 * Verify HMAC signature from Docs Platform
 * Format: t=<timestamp>, v1=<signature>
 */
function verifyDocsSignature(
  body: string,
  header: string | undefined,
  secret: string
): boolean {
  if (!header) {
    console.log('[DocsWebhook] Missing signature header');
    return false;
  }

  try {
    const parts = header.split(",").map(x => x.trim());
    const tsPart = parts.find(p => p.startsWith("t="));
    const sigPart = parts.find(p => p.startsWith("v1="));

    if (!tsPart || !sigPart) {
      console.log('[DocsWebhook] Invalid signature format');
      return false;
    }

    const ts = tsPart.replace("t=", "");
    const v1 = sigPart.replace("v1=", "");

    const computed = crypto
      .createHmac("sha256", secret)
      .update(`${ts}.${body}`)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(v1),
      Buffer.from(computed)
    );

    if (!isValid) {
      console.log('[DocsWebhook] Signature verification failed');
    }

    return isValid;
  } catch (err) {
    console.error('[DocsWebhook] Signature verification error:', err);
    return false;
  }
}

/**
 * Middleware to verify all incoming webhooks
 */
const verifyWebhook = (req: Request, res: Response, next: express.NextFunction) => {
  const secret = process.env.DOC_HMAC_SECRET;

  if (!secret) {
    console.error('[DocsWebhook] DOC_HMAC_SECRET not configured');
    return res.status(503).json({
      success: false,
      error: "DOC_HMAC_SECRET not configured",
    });
  }

  const signature = req.header("X-Docs-Signature");
  
  // Use raw body for signature verification to avoid JSON serialization issues
  const body = (req as any).rawBody || JSON.stringify(req.body);

  const valid = verifyDocsSignature(body, signature, secret);

  if (!valid) {
    console.log('[DocsWebhook] Authentication failed from IP:', req.ip);
    return res.status(401).json({
      success: false,
      error: "Invalid signature",
    });
  }

  next();
};

/**
 * POST /api/webhooks/docs/created
 * Handle document.created event
 */
router.post("/created", verifyWebhook, async (req: Request, res: Response) => {
  try {
    const { event, timestamp, data } = req.body;

    console.log('\n' + '='.repeat(80));
    console.log('📄 [DOCS WEBHOOK] DOCUMENT CREATED');
    console.log('='.repeat(80));
    console.log('🕐 Timestamp:', timestamp);
    console.log('📋 Document ID:', data.documentId);
    console.log('📝 Title:', data.title || 'N/A');
    console.log('📂 Category:', data.category || 'N/A');
    console.log('🔍 Full Data:', JSON.stringify(data, null, 2));
    console.log('='.repeat(80) + '\n');

    // Store in Memory Hub
    const memory = memoryHub.recordInsight({
      type: 'pattern',
      description: `📄 Document Created: ${data.title || data.documentId}`,
      confidence: 1.0,
      sources: ['abosham-docs'],
      evidence: {
        event: 'document.created',
        documentId: data.documentId,
        title: data.title,
        category: data.category,
        timestamp,
        rawData: data,
        ip: req.ip,
      }
    });

    console.log('🧠 [Memory Hub] Document creation stored:', memory.id);

    res.json({
      success: true,
      message: "Document creation event received",
      memoryId: memory.id,
    });
  } catch (error: any) {
    console.error('[DocsWebhook] Error processing document.created:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/webhooks/docs/analyzed
 * Handle document.analyzed event (after OCR + AI)
 */
router.post("/analyzed", verifyWebhook, async (req: Request, res: Response) => {
  try {
    const { event, timestamp, data } = req.body;

    console.log('\n' + '='.repeat(80));
    console.log('🔍 [DOCS WEBHOOK] DOCUMENT ANALYZED');
    console.log('='.repeat(80));
    console.log('🕐 Timestamp:', timestamp);
    console.log('📋 Document ID:', data.documentId);
    console.log('📂 Category:', data.category || 'N/A');
    console.log('🏷️  Tags:', data.tags?.join(', ') || 'N/A');
    console.log('📄 Summary:', data.summary || 'N/A');
    console.log('🔍 Full Data:', JSON.stringify(data, null, 2));
    console.log('='.repeat(80) + '\n');

    // Store analysis results in Memory Hub
    const memory = memoryHub.recordInsight({
      type: 'pattern',
      description: `🔍 Document Analyzed: ${data.summary || data.documentId}`,
      confidence: data.confidence || 0.9,
      sources: ['abosham-docs'],
      evidence: {
        event: 'document.analyzed',
        documentId: data.documentId,
        category: data.category,
        tags: data.tags || [],
        summary: data.summary,
        timestamp,
        rawData: data,
        ip: req.ip,
      }
    });

    console.log('🧠 [Memory Hub] Document analysis stored:', memory.id);

    res.json({
      success: true,
      message: "Document analysis event received",
      memoryId: memory.id,
    });
  } catch (error: any) {
    console.error('[DocsWebhook] Error processing document.analyzed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/webhooks/docs/updated
 * Handle document.updated event
 */
router.post("/updated", verifyWebhook, async (req: Request, res: Response) => {
  try {
    const { event, timestamp, data } = req.body;

    console.log('\n' + '='.repeat(80));
    console.log('🔄 [DOCS WEBHOOK] DOCUMENT UPDATED');
    console.log('='.repeat(80));
    console.log('🕐 Timestamp:', timestamp);
    console.log('📋 Document ID:', data.documentId);
    console.log('📝 Changes:', data.changes || 'N/A');
    console.log('🔍 Full Data:', JSON.stringify(data, null, 2));
    console.log('='.repeat(80) + '\n');

    // Store update in Memory Hub
    const memory = memoryHub.recordInsight({
      type: 'pattern',
      description: `🔄 Document Updated: ${data.documentId}`,
      confidence: 1.0,
      sources: ['abosham-docs'],
      evidence: {
        event: 'document.updated',
        documentId: data.documentId,
        changes: data.changes,
        timestamp,
        rawData: data,
        ip: req.ip,
      }
    });

    console.log('🧠 [Memory Hub] Document update stored:', memory.id);

    res.json({
      success: true,
      message: "Document update event received",
      memoryId: memory.id,
    });
  } catch (error: any) {
    console.error('[DocsWebhook] Error processing document.updated:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/webhooks/docs/health
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "active",
    service: "docs-webhook-handler",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

export default router;
