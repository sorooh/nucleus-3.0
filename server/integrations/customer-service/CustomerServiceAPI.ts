/**
 * Customer Service API Endpoints
 * 
 * Endpoints للتكامل مع منصة خدمة العملاء:
 * - POST /api/nucleus/customer/message - استقبال محادثة جديدة
 * - PATCH /api/nucleus/customer/message/:id - تحديث محادثة
 * - GET /api/nucleus/customer/stats/:account - إحصائيات حساب
 * - GET /api/nucleus/customer/stats - إحصائيات عامة
 * 
 * التأمين:
 * - HMAC-SHA256 signature verification
 * - JWT authentication
 */

import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { CustomerServiceAdapter } from "./CustomerServiceAdapter";
import { insertCustomerConversationSchema } from "../../../shared/schema";
import { z } from "zod";

const router: Router = express.Router();
const adapter = new CustomerServiceAdapter();

// Note: Raw body is already captured in server/index.ts global middleware

/**
 * Middleware: التحقق من JWT Token
 */
function verifyJWT(req: any, res: Response, next: Function) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Missing or invalid Authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const secret = process.env.NUCLEUS_JWT_SECRET;

    if (!secret) {
      console.error('[CustomerServiceAPI] ❌ NUCLEUS_JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    // التحقق من التوقيع
    const decoded = jwt.verify(token, secret);
    req.jwtPayload = decoded;
    
    console.log('[CustomerServiceAPI] ✅ JWT verified');
    next();
  } catch (error: any) {
    console.error('[CustomerServiceAPI] ❌ JWT verification failed:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
}

/**
 * Middleware: التحقق من HMAC Signature
 */
function verifyHMAC(req: any, res: Response, next: Function) {
  try {
    const signature = req.headers['x-signature'];
    
    if (!signature) {
      return res.status(401).json({ 
        success: false, 
        message: 'Missing X-Signature header' 
      });
    }

    const secret = process.env.CUSTOMER_HMAC_SECRET;
    
    if (!secret) {
      console.error('[CustomerServiceAPI] ❌ CUSTOMER_HMAC_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    // استخدام raw body من global middleware
    const rawBody = req.rawBody || JSON.stringify(req.body);
    
    // حساب التوقيع المتوقع
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // مقارنة آمنة (timing-safe)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('[CustomerServiceAPI] ❌ Invalid HMAC signature');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }

    console.log('[CustomerServiceAPI] ✅ HMAC signature verified');
    next();
  } catch (error: any) {
    console.error('[CustomerServiceAPI] ❌ HMAC verification error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Signature verification failed' 
    });
  }
}

/**
 * POST /api/nucleus/customer/message
 * استقبال محادثة جديدة من منصة خدمة العملاء
 */
router.post('/message', verifyJWT, verifyHMAC, async (req: Request, res: Response) => {
  try {
    console.log('[CustomerServiceAPI] 📥 Receiving new conversation');

    // Validation schema - نضيف messageTimestamp
    const schema = insertCustomerConversationSchema.extend({
      messageTimestamp: z.string().transform(val => new Date(val))
    });

    const validatedData = schema.parse(req.body);

    // حفظ المحادثة
    const conversation = await adapter.saveConversation(validatedData);

    console.log('[CustomerServiceAPI] ✅ Conversation saved successfully');

    res.status(201).json({
      success: true,
      message: 'Conversation recorded successfully',
      data: {
        conversationId: conversation.id,
        account: conversation.accountName,
        topic: conversation.classifiedTopic,
        feedback: conversation.feedback
      }
    });
  } catch (error: any) {
    console.error('[CustomerServiceAPI] ❌ Error:', error.message);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * PATCH /api/nucleus/customer/message/:id
 * تحديث محادثة موجودة (اختياري)
 */
router.patch('/message/:id', verifyJWT, verifyHMAC, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[CustomerServiceAPI] 🔄 Updating conversation:', id);

    // التحقق من وجود المحادثة
    const existing = await adapter.getConversation(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // التحديثات المسموحة
    const allowedUpdates = {
      finalReply: req.body.finalReply,
      feedback: req.body.feedback,
      metadata: req.body.metadata
    };

    // إزالة القيم undefined
    const updates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided'
      });
    }

    const updated = await adapter.updateConversation(id, updates);

    console.log('[CustomerServiceAPI] ✅ Conversation updated');

    res.json({
      success: true,
      message: 'Conversation updated successfully',
      data: {
        conversationId: updated.id,
        feedback: updated.feedback,
        finalReply: updated.finalReply
      }
    });
  } catch (error: any) {
    console.error('[CustomerServiceAPI] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/nucleus/customer/stats/:account
 * الحصول على إحصائيات حساب معين
 */
router.get('/stats/:account', verifyJWT, async (req: Request, res: Response) => {
  try {
    const { account } = req.params;
    console.log('[CustomerServiceAPI] 📊 Getting stats for:', account);

    const stats = await adapter.getAccountStats(account);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[CustomerServiceAPI] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/nucleus/customer/stats
 * الحصول على إحصائيات عامة
 */
router.get('/stats', verifyJWT, async (req: Request, res: Response) => {
  try {
    console.log('[CustomerServiceAPI] 📊 Getting overall stats');

    const stats = await adapter.getOverallStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[CustomerServiceAPI] ❌ Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

export default router;
