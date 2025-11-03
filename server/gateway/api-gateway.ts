/**
 * Nucleus API Gateway
 * 
 * Central gateway for external platforms
 * Handles authentication, routing, and rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Platform Registry - المنصات المسموح لها بالاتصال
export interface RegisteredPlatform {
  id: string;
  name: string;
  apiKey: string;
  hmacSecret: string;
  allowedEndpoints: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  active: boolean;
  createdAt: Date;
}

// In-memory registry (سننقلها للـ database لاحقاً)
const platformRegistry: Map<string, RegisteredPlatform> = new Map();

// Rate limiting tracker
const rateLimitTracker: Map<string, {
  minute: { count: number; resetAt: number };
  hour: { count: number; resetAt: number };
}> = new Map();

/**
 * تسجيل منصة جديدة
 */
export function registerPlatform(platform: Omit<RegisteredPlatform, 'createdAt'>): RegisteredPlatform {
  const fullPlatform: RegisteredPlatform = {
    ...platform,
    createdAt: new Date()
  };
  
  platformRegistry.set(platform.id, fullPlatform);
  console.log(`[API Gateway] Platform registered: ${platform.name} (${platform.id})`);
  
  return fullPlatform;
}

/**
 * HMAC Signature Verification
 * يتحقق من صحة التوقيع للطلبات القادمة من المنصات الخارجية
 */
export function verifyHMACSignature(
  platform: RegisteredPlatform,
  payload: any,
  signature: string,
  timestamp: string
): boolean {
  try {
    // التحقق من أن الطلب ليس قديم (5 دقائق max)
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - requestTime > fiveMinutes) {
      console.warn(`[API Gateway] Request too old: ${now - requestTime}ms`);
      return false;
    }
    
    // إنشاء التوقيع المتوقع
    const data = JSON.stringify(payload) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', platform.hmacSecret)
      .update(data)
      .digest('hex');
    
    // مقارنة آمنة ضد timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[API Gateway] HMAC verification error:', error);
    return false;
  }
}

/**
 * Rate Limiting
 * يحمي من الاستخدام الزائد
 */
export function checkRateLimit(platformId: string, limits: RegisteredPlatform['rateLimit']): {
  allowed: boolean;
  remaining: {
    perMinute: number;
    perHour: number;
  };
} {
  const now = Date.now();
  
  // الحصول على أو إنشاء tracker للمنصة
  let tracker = rateLimitTracker.get(platformId);
  
  if (!tracker) {
    tracker = {
      minute: { count: 0, resetAt: now + 60 * 1000 },
      hour: { count: 0, resetAt: now + 60 * 60 * 1000 }
    };
    rateLimitTracker.set(platformId, tracker);
  }
  
  // Reset counters if expired
  if (now > tracker.minute.resetAt) {
    tracker.minute = { count: 0, resetAt: now + 60 * 1000 };
  }
  if (now > tracker.hour.resetAt) {
    tracker.hour = { count: 0, resetAt: now + 60 * 60 * 1000 };
  }
  
  // Check limits
  const minuteAllowed = tracker.minute.count < limits.requestsPerMinute;
  const hourAllowed = tracker.hour.count < limits.requestsPerHour;
  
  if (minuteAllowed && hourAllowed) {
    tracker.minute.count++;
    tracker.hour.count++;
    
    return {
      allowed: true,
      remaining: {
        perMinute: limits.requestsPerMinute - tracker.minute.count,
        perHour: limits.requestsPerHour - tracker.hour.count
      }
    };
  }
  
  return {
    allowed: false,
    remaining: {
      perMinute: limits.requestsPerMinute - tracker.minute.count,
      perHour: limits.requestsPerHour - tracker.hour.count
    }
  };
}

/**
 * API Gateway Middleware
 * يتحقق من الـ Authentication, Authorization, Rate Limiting
 */
export function apiGatewayMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // استخراج المعلومات من الـ headers
    const apiKey = req.headers['x-api-key'] as string;
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const platformId = req.headers['x-platform-id'] as string;
    
    // التحقق من وجود كل المعلومات المطلوبة
    if (!apiKey || !signature || !timestamp || !platformId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers',
        required: ['x-api-key', 'x-signature', 'x-timestamp', 'x-platform-id']
      });
    }
    
    // البحث عن المنصة في الـ registry
    const platform = platformRegistry.get(platformId);
    
    if (!platform) {
      return res.status(401).json({
        success: false,
        error: 'Unknown platform',
        platformId
      });
    }
    
    // التحقق من أن المنصة نشطة
    if (!platform.active) {
      return res.status(403).json({
        success: false,
        error: 'Platform is inactive',
        platformId
      });
    }
    
    // التحقق من الـ API Key
    if (platform.apiKey !== apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    // التحقق من الـ HMAC Signature
    const isValidSignature = verifyHMACSignature(
      platform,
      req.body,
      signature,
      timestamp
    );
    
    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
    
    // التحقق من الـ endpoint permissions
    const requestedEndpoint = req.path;
    const hasPermission = platform.allowedEndpoints.some(endpoint => {
      if (endpoint.endsWith('*')) {
        return requestedEndpoint.startsWith(endpoint.slice(0, -1));
      }
      return requestedEndpoint === endpoint;
    });
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Endpoint not allowed for this platform',
        endpoint: requestedEndpoint
      });
    }
    
    // التحقق من الـ rate limit
    const rateLimitResult = checkRateLimit(platformId, platform.rateLimit);
    
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        remaining: rateLimitResult.remaining
      });
    }
    
    // إضافة معلومات المنصة للـ request
    (req as any).platform = platform;
    (req as any).rateLimit = rateLimitResult.remaining;
    
    // السماح بالمرور
    next();
    
  } catch (error) {
    console.error('[API Gateway] Middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal gateway error'
    });
  }
}

/**
 * Initialize default platforms
 * تسجيل المنصات الافتراضية
 */
export function initializeDefaultPlatforms() {
  console.log('[API Gateway] No default platforms to initialize');
}

/**
 * Get platform info (for admin/monitoring)
 */
export function getPlatformInfo(platformId: string): RegisteredPlatform | undefined {
  return platformRegistry.get(platformId);
}

/**
 * List all platforms (for admin)
 */
export function listPlatforms(): RegisteredPlatform[] {
  return Array.from(platformRegistry.values());
}
