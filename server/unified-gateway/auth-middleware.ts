/**
 * Unified Gateway Authentication Middleware
 * 
 * يدعم طريقتين للمصادقة:
 * 1. INTERNAL_JWT - للمنصات الداخلية (14 منصة موجودة)
 * 2. ENHANCED (JWT + HMAC) - للمنصات الخارجية الحساسة
 * 
 * البيان الهندسي السيادي - منظومة سُروح
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { platformRegistry } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getRateLimiter } from './redis-rate-limiter';

// Extend Express Request to include platform info
export interface AuthenticatedRequest extends Request {
  platform?: {
    id: string;
    platformId: string;
    displayName: string;
    authMode: string;
    allowedEndpoints: any;
    dataScopes: any;
    rateLimitRPM: number;
    rateLimitRPH: number;
    rateLimitRPD: number;
  };
  traceId?: string;
}

/**
 * Helper: Check rate limit using Redis
 */
async function checkRateLimit(platformId: string, rpm: number, rph: number, rpd: number): Promise<{
  allowed: boolean;
  remaining: { minute: number; hour: number; day: number };
  current: { minute: number; hour: number; day: number };
  resetAt: { minute: number; hour: number; day: number };
}> {
  const limiter = getRateLimiter();
  
  const result = await limiter.checkLimit(platformId, {
    rpm,
    rph,
    rpd,
  });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    current: result.current,
    resetAt: result.resetAt,
  };
}

/**
 * Helper: Verify HMAC signature
 */
function verifyHMACSignature(
  hmacSecret: string,
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
      console.warn(`[UGW Auth] Request too old: ${now - requestTime}ms`);
      return false;
    }
    
    // إنشاء التوقيع المتوقع
    const data = JSON.stringify(payload) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', hmacSecret)
      .update(data)
      .digest('hex');
    
    // مقارنة آمنة ضد timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[UGW Auth] HMAC verification error:', error);
    return false;
  }
}

/**
 * Helper: Verify JWT token
 */
function verifyJWTToken(token: string, secret: string): any {
  try {
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    console.error('[UGW Auth] JWT verification error:', error);
    return null;
  }
}

/**
 * Helper: Check endpoint authorization
 */
function isEndpointAllowed(requestPath: string, allowedEndpoints: string[]): boolean {
  for (const pattern of allowedEndpoints) {
    // Support wildcards: /api/uil/* matches /api/uil/analyze
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(requestPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Main Authentication Middleware
 * يدعم INTERNAL_JWT و ENHANCED modes
 */
export async function authenticateGateway(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Generate Trace ID for observability
    const traceId = crypto.randomBytes(16).toString('hex');
    req.traceId = traceId;

    // Extract authentication headers
    const apiKey = req.headers['x-api-key'] as string;
    const platformId = req.headers['x-platform-id'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const signature = req.headers['x-signature'] as string;
    const authHeader = req.headers['authorization'] as string;

    // Determine auth mode based on headers
    const hasHMACHeaders = apiKey && platformId && timestamp && signature;
    const hasJWTHeader = authHeader?.startsWith('Bearer ');

    if (!hasHMACHeaders && !hasJWTHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Provide either JWT (Authorization header) or HMAC credentials',
        traceId,
      });
    }

    let platform: any = null;

    // ==================== ENHANCED MODE (HMAC + JWT) ====================
    if (hasHMACHeaders) {
      // Get platform from registry
      const [foundPlatform] = await db
        .select()
        .from(platformRegistry)
        .where(
          and(
            eq(platformRegistry.platformId, platformId),
            eq(platformRegistry.isActive, 1)
          )
        )
        .limit(1);

      if (!foundPlatform) {
        return res.status(401).json({
          success: false,
          error: 'Platform not registered or inactive',
          traceId,
        });
      }

      // Verify API key
      if (foundPlatform.apiKey !== apiKey) {
        console.warn(`[UGW Auth] Invalid API key for platform: ${platformId}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          traceId,
        });
      }

      // Verify HMAC signature
      if (!foundPlatform.hmacSecret) {
        return res.status(500).json({
          success: false,
          error: 'Platform HMAC secret not configured',
          traceId,
        });
      }

      const isValidSignature = verifyHMACSignature(
        foundPlatform.hmacSecret,
        req.body,
        signature,
        timestamp
      );

      if (!isValidSignature) {
        console.warn(`[UGW Auth] Invalid HMAC signature for platform: ${platformId}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid signature or timestamp',
          traceId,
        });
      }

      platform = foundPlatform;
      console.log(`[UGW Auth] ✅ ENHANCED auth: ${platform.displayName}`);
    }
    
    // ==================== INTERNAL_JWT MODE ====================
    else if (hasJWTHeader) {
      const token = authHeader.substring(7); // Remove 'Bearer '
      
      // Try to decode JWT to get platform info
      const decoded: any = jwt.decode(token);
      
      if (!decoded || !decoded.platform) {
        return res.status(401).json({
          success: false,
          error: 'Invalid JWT token format',
          traceId,
        });
      }

      // Get platform from registry
      const [foundPlatform] = await db
        .select()
        .from(platformRegistry)
        .where(
          and(
            eq(platformRegistry.platformId, decoded.platform),
            eq(platformRegistry.isActive, 1)
          )
        )
        .limit(1);

      if (!foundPlatform) {
        return res.status(401).json({
          success: false,
          error: 'Platform not registered or inactive',
          traceId,
        });
      }

      // Verify JWT with platform secret
      if (!foundPlatform.jwtSecret) {
        return res.status(500).json({
          success: false,
          error: 'Platform JWT secret not configured',
          traceId,
        });
      }

      const jwtPayload = verifyJWTToken(token, foundPlatform.jwtSecret);

      if (!jwtPayload) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired JWT token',
          traceId,
        });
      }

      platform = foundPlatform;
      console.log(`[UGW Auth] ✅ JWT auth: ${platform.displayName}`);
    }

    // ==================== AUTHORIZATION ====================
    
    // Check endpoint authorization
    const isAllowed = isEndpointAllowed(req.path, platform.allowedEndpoints);
    
    if (!isAllowed) {
      console.warn(`[UGW Auth] Unauthorized endpoint access: ${platform.platformId} → ${req.path}`);
      return res.status(403).json({
        success: false,
        error: 'Endpoint not authorized for this platform',
        path: req.path,
        traceId,
      });
    }

    // ==================== RATE LIMITING ====================
    
    const rateLimit = await checkRateLimit(
      platform.platformId,
      platform.rateLimitRPM,
      platform.rateLimitRPH,
      platform.rateLimitRPD || 10000
    );

    if (!rateLimit.allowed) {
      console.warn(`[UGW Auth] Rate limit exceeded: ${platform.platformId}`);
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        remaining: rateLimit.remaining,
        current: rateLimit.current,
        resetAt: rateLimit.resetAt,
        traceId,
      });
    }

    // ==================== SUCCESS ====================
    
    // Update last active timestamp
    await db
      .update(platformRegistry)
      .set({ lastActive: new Date() })
      .where(eq(platformRegistry.platformId, platform.platformId));

    // Attach platform info to request
    req.platform = {
      id: platform.id,
      platformId: platform.platformId,
      displayName: platform.displayName,
      authMode: platform.authMode,
      allowedEndpoints: platform.allowedEndpoints,
      dataScopes: platform.dataScopes,
      rateLimitRPM: platform.rateLimitRPM,
      rateLimitRPH: platform.rateLimitRPH,
      rateLimitRPD: platform.rateLimitRPD || 10000,
    };

    // Add rate limit headers
    res.setHeader('X-RateLimit-Remaining-Minute', rateLimit.remaining.minute.toString());
    res.setHeader('X-RateLimit-Remaining-Hour', rateLimit.remaining.hour.toString());
    res.setHeader('X-RateLimit-Remaining-Day', rateLimit.remaining.day.toString());
    res.setHeader('X-Trace-ID', traceId);

    next();
  } catch (error: any) {
    console.error('[UGW Auth] Authentication error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: error.message,
      traceId: req.traceId,
    });
  }
}

/**
 * Optional middleware: Require specific data scopes
 */
export function requireScopes(...requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.platform) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const platformScopes = req.platform.dataScopes || [];
    const hasAllScopes = requiredScopes.every((scope) => 
      platformScopes.includes(scope)
    );

    if (!hasAllScopes) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: requiredScopes,
        granted: platformScopes,
      });
    }

    next();
  };
}

/**
 * Export rate limit stats (now powered by Redis)
 * 
 * Use the Monitoring API instead:
 * GET /api/ugw/monitoring/rate-limits
 * GET /api/ugw/monitoring/rate-limits/:platformId
 */
export async function getRateLimitStats(platformId?: string) {
  const limiter = getRateLimiter();
  
  if (platformId) {
    return await limiter.getStats(platformId);
  }
  
  return await limiter.getAllStats();
}
