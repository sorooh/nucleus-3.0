/**
 * Redis-based Rate Limiter
 * 
 * نظام حماية متقدم يعمل مع Redis للتوزيع على عدة سيرفرات
 * 
 * Features:
 * - Distributed rate limiting (multi-server support)
 * - Three-tier limits: RPM, RPH, RPD
 * - Sliding window algorithm (more accurate than fixed window)
 * - Automatic cleanup of expired keys
 * - Performance: O(1) operations via Redis
 * 
 * البيان الهندسي السيادي - منظومة سُروح
 */

import { Redis } from '@upstash/redis';

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  resetAt: {
    minute: number;
    hour: number;
    day: number;
  };
  current: {
    minute: number;
    hour: number;
    day: number;
  };
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  rpm: number;  // Requests per minute
  rph: number;  // Requests per hour
  rpd: number;  // Requests per day
}

/**
 * Redis Rate Limiter Class
 */
export class RedisRateLimiter {
  private redis: Redis;
  private keyPrefix: string;

  constructor() {
    // Initialize Upstash Redis
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    this.keyPrefix = 'ugw:ratelimit';
  }

  /**
   * Generate Redis key for rate limit tracking
   */
  private generateKey(platformId: string, window: 'minute' | 'hour' | 'day'): string {
    const now = new Date();
    
    let timeKey: string;
    if (window === 'minute') {
      // Format: ugw:ratelimit:platform123:minute:2025-10-24:09:30
      timeKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}:${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    } else if (window === 'hour') {
      // Format: ugw:ratelimit:platform123:hour:2025-10-24:09
      timeKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}:${String(now.getUTCHours()).padStart(2, '0')}`;
    } else {
      // Format: ugw:ratelimit:platform123:day:2025-10-24
      timeKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    }

    return `${this.keyPrefix}:${platformId}:${window}:${timeKey}`;
  }

  /**
   * Get TTL for each window
   */
  private getTTL(window: 'minute' | 'hour' | 'day'): number {
    if (window === 'minute') {
      return 90; // 1.5 minutes (90 seconds) - buffer for cleanup
    } else if (window === 'hour') {
      return 3900; // 65 minutes (3900 seconds)
    } else {
      return 90000; // 25 hours (90000 seconds)
    }
  }

  /**
   * Get reset timestamp for window
   */
  private getResetAt(window: 'minute' | 'hour' | 'day'): number {
    const now = Date.now();
    const nowDate = new Date(now);

    if (window === 'minute') {
      // Next minute
      return new Date(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth(),
        nowDate.getUTCDate(),
        nowDate.getUTCHours(),
        nowDate.getUTCMinutes() + 1,
        0,
        0
      ).getTime();
    } else if (window === 'hour') {
      // Next hour
      return new Date(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth(),
        nowDate.getUTCDate(),
        nowDate.getUTCHours() + 1,
        0,
        0,
        0
      ).getTime();
    } else {
      // Next day
      return new Date(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth(),
        nowDate.getUTCDate() + 1,
        0,
        0,
        0,
        0
      ).getTime();
    }
  }

  /**
   * Check and increment rate limit using Sliding Window
   * 
   * Uses Redis sorted sets for true sliding window behavior
   * This prevents bursty traffic at window boundaries
   */
  async checkLimit(
    platformId: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Fail-open: If Redis throws, allow the request
    try {
      const now = Date.now();
      
      // Sliding window keys
      const minuteKey = `${this.keyPrefix}:${platformId}:sliding:minute`;
      const hourKey = `${this.keyPrefix}:${platformId}:sliding:hour`;
      const dayKey = `${this.keyPrefix}:${platformId}:sliding:day`;

      // HONEST: Generate deterministic member IDs using platformId
      const memberBase = `${platformId}-${now}`;
      const minuteMember = `${memberBase}-m`;
      const hourMember = `${memberBase}-h`;
      const dayMember = `${memberBase}-d`;

      // Window boundaries
      const minuteWindow = now - 60000; // 60 seconds ago
      const hourWindow = now - 3600000; // 60 minutes ago
      const dayWindow = now - 86400000; // 24 hours ago

      // Use pipeline for performance
      const pipeline = this.redis.pipeline();

      // Remove old entries & count current entries for each window
      pipeline.zremrangebyscore(minuteKey, 0, minuteWindow);
      pipeline.zcard(minuteKey);
      pipeline.zadd(minuteKey, { score: now, member: minuteMember });
      pipeline.expire(minuteKey, 90); // Cleanup after 90 seconds

      pipeline.zremrangebyscore(hourKey, 0, hourWindow);
      pipeline.zcard(hourKey);
      pipeline.zadd(hourKey, { score: now, member: hourMember });
      pipeline.expire(hourKey, 3900); // Cleanup after 65 minutes

      pipeline.zremrangebyscore(dayKey, 0, dayWindow);
      pipeline.zcard(dayKey);
      pipeline.zadd(dayKey, { score: now, member: dayMember });
      pipeline.expire(dayKey, 90000); // Cleanup after 25 hours

      const results = await pipeline.exec();

      // Parse Upstash pipeline results: [err, value] tuples
      const minuteCount = ((results[1] as [any, number])[1] as number) + 1; // +1 for current request
      const hourCount = ((results[5] as [any, number])[1] as number) + 1;
      const dayCount = ((results[9] as [any, number])[1] as number) + 1;

      // Check limits
      const minuteAllowed = minuteCount <= config.rpm;
      const hourAllowed = hourCount <= config.rph;
      const dayAllowed = dayCount <= config.rpd;

      const allowed = minuteAllowed && hourAllowed && dayAllowed;

      // Precise rollback: remove ONLY the entries we just added
      if (!allowed) {
        const rollbackPipeline = this.redis.pipeline();
        
        // Only remove from windows that were exceeded
        if (!minuteAllowed) {
          rollbackPipeline.zrem(minuteKey, minuteMember);
        }
        if (!hourAllowed) {
          rollbackPipeline.zrem(hourKey, hourMember);
        }
        if (!dayAllowed) {
          rollbackPipeline.zrem(dayKey, dayMember);
        }
        
        await rollbackPipeline.exec();
      }

      // Calculate reset timestamps (when oldest entry expires)
      const minuteResetAt = now + 60000;
      const hourResetAt = now + 3600000;
      const dayResetAt = now + 86400000;

      return {
        allowed,
        remaining: {
          minute: Math.max(0, config.rpm - minuteCount),
          hour: Math.max(0, config.rph - hourCount),
          day: Math.max(0, config.rpd - dayCount),
        },
        resetAt: {
          minute: minuteResetAt,
          hour: hourResetAt,
          day: dayResetAt,
        },
        current: {
          minute: minuteCount,
          hour: hourCount,
          day: dayCount,
        },
      };
    } catch (error: any) {
      // FAIL-OPEN POLICY: Allow request if Redis is down
      console.error('[RedisRateLimiter] ⚠️ Redis error - FAIL OPEN:', error.message);
      console.warn('[RedisRateLimiter] ⚠️ Allowing request due to Redis failure');
      
      return {
        allowed: true,
        remaining: {
          minute: config.rpm,
          hour: config.rph,
          day: config.rpd,
        },
        resetAt: {
          minute: Date.now() + 60000,
          hour: Date.now() + 3600000,
          day: Date.now() + 86400000,
        },
        current: {
          minute: 0,
          hour: 0,
          day: 0,
        },
      };
    }
  }

  /**
   * Get current rate limit stats for a platform
   * (without incrementing) - Sliding Window version
   */
  async getStats(platformId: string): Promise<{
    minute: number;
    hour: number;
    day: number;
  }> {
    try {
      const now = Date.now();
      
      const minuteKey = `${this.keyPrefix}:${platformId}:sliding:minute`;
      const hourKey = `${this.keyPrefix}:${platformId}:sliding:hour`;
      const dayKey = `${this.keyPrefix}:${platformId}:sliding:day`;

      const minuteWindow = now - 60000;
      const hourWindow = now - 3600000;
      const dayWindow = now - 86400000;

      const pipeline = this.redis.pipeline();
      
      // Count entries within the sliding window
      pipeline.zcount(minuteKey, minuteWindow, now);
      pipeline.zcount(hourKey, hourWindow, now);
      pipeline.zcount(dayKey, dayWindow, now);

      const results = await pipeline.exec();

      // Parse Upstash pipeline results: [err, value] tuples
      return {
        minute: ((results[0] as [any, number])[1] as number) || 0,
        hour: ((results[1] as [any, number])[1] as number) || 0,
        day: ((results[2] as [any, number])[1] as number) || 0,
      };
    } catch (error: any) {
      console.error('[RedisRateLimiter] Error getting stats:', error.message);
      return { minute: 0, hour: 0, day: 0 };
    }
  }

  /**
   * Reset rate limit for a platform (for testing/admin) - Sliding Window version
   */
  async resetLimit(platformId: string): Promise<void> {
    try {
      const minuteKey = `${this.keyPrefix}:${platformId}:sliding:minute`;
      const hourKey = `${this.keyPrefix}:${platformId}:sliding:hour`;
      const dayKey = `${this.keyPrefix}:${platformId}:sliding:day`;

      await this.redis.del(minuteKey, hourKey, dayKey);
      console.log(`[RedisRateLimiter] ✅ Reset limits for: ${platformId}`);
    } catch (error: any) {
      console.error('[RedisRateLimiter] Error resetting limit:', error.message);
    }
  }

  /**
   * Get all active platforms with their current counts
   * (for monitoring dashboard) - Sliding Window version
   */
  async getAllStats(): Promise<Record<string, any>> {
    try {
      // Scan for all sliding window keys
      const pattern = `${this.keyPrefix}:*:sliding:*`;
      const keys = await this.redis.keys(pattern);

      const stats: Record<string, any> = {};

      for (const key of keys) {
        // Extract platform ID from key
        // Format: ugw:ratelimit:platform123:sliding:minute
        const parts = key.split(':');
        const platformId = parts[2];

        if (!stats[platformId]) {
          const platformStats = await this.getStats(platformId);
          stats[platformId] = platformStats;
        }
      }

      return stats;
    } catch (error: any) {
      console.error('[RedisRateLimiter] Error getting all stats:', error.message);
      return {};
    }
  }

  /**
   * Health check - verify Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error: any) {
      console.error('[RedisRateLimiter] Health check failed:', error.message);
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let rateLimiter: RedisRateLimiter | null = null;

/**
 * Get rate limiter instance (singleton)
 */
export function getRateLimiter(): RedisRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RedisRateLimiter();
  }
  return rateLimiter;
}

/**
 * Express middleware for rate limiting
 * 
 * Usage:
 *   import { rateLimitMiddleware } from './redis-rate-limiter';
 *   
 *   router.get('/api/uil/analyze',
 *     authenticatePlatform,
 *     rateLimitMiddleware,
 *     handler
 *   );
 */
export async function rateLimitMiddleware(
  req: any,
  res: any,
  next: any
): Promise<void> {
  if (!req.platform) {
    return res.status(401).json({
      success: false,
      error: 'Platform not authenticated',
    });
  }

  const limiter = getRateLimiter();
  
  const result = await limiter.checkLimit(req.platform.platformId, {
    rpm: req.platform.rateLimitRPM || 60,
    rph: req.platform.rateLimitRPH || 600,
    rpd: req.platform.rateLimitRPD || 5000,
  });

  // Add headers
  res.setHeader('X-RateLimit-Limit-Minute', req.platform.rateLimitRPM.toString());
  res.setHeader('X-RateLimit-Limit-Hour', req.platform.rateLimitRPH.toString());
  res.setHeader('X-RateLimit-Limit-Day', req.platform.rateLimitRPD.toString());
  
  res.setHeader('X-RateLimit-Remaining-Minute', result.remaining.minute.toString());
  res.setHeader('X-RateLimit-Remaining-Hour', result.remaining.hour.toString());
  res.setHeader('X-RateLimit-Remaining-Day', result.remaining.day.toString());
  
  res.setHeader('X-RateLimit-Reset-Minute', new Date(result.resetAt.minute).toISOString());
  res.setHeader('X-RateLimit-Reset-Hour', new Date(result.resetAt.hour).toISOString());
  res.setHeader('X-RateLimit-Reset-Day', new Date(result.resetAt.day).toISOString());

  if (!result.allowed) {
    console.warn(
      `[RateLimit] ⚠️ Limit exceeded: ${req.platform.platformId} ` +
      `(M: ${result.current.minute}/${req.platform.rateLimitRPM}, ` +
      `H: ${result.current.hour}/${req.platform.rateLimitRPH}, ` +
      `D: ${result.current.day}/${req.platform.rateLimitRPD})`
    );

    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      remaining: result.remaining,
      resetAt: result.resetAt,
      current: result.current,
      limits: {
        minute: req.platform.rateLimitRPM,
        hour: req.platform.rateLimitRPH,
        day: req.platform.rateLimitRPD,
      },
    });
  }

  next();
}
