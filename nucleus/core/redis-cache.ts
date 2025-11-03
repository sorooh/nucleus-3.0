import { EventEmitter } from 'events';
import { Redis } from '@upstash/redis';

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
}

export class RedisCache extends EventEmitter {
  private active: boolean = false;
  private redis: Redis | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0
  };
  private defaultTTL: number = 300; // 5 minutes default

  constructor() {
    super();
    console.log('[RedisCache] Initialized (from absolute zero)');
  }

  async activate(): Promise<void> {
    if (this.active) {
      console.log('💨 Redis Cache already active');
      return;
    }

    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!url || !token) {
        throw new Error('Redis credentials not found');
      }

      this.redis = new Redis({
        url,
        token
      });

      // Test connection
      await this.redis.ping();

      this.active = true;
      this.emit('activated');
      console.log('💨 Redis Cache activated - Response acceleration enabled');
    } catch (error: any) {
      console.error('❌ Redis Cache activation failed:', error.message);
      this.active = false;
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.active) return;

    this.active = false;
    this.redis = null;
    this.emit('shutdown');
    console.log('💨 Redis Cache shutdown');
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.active || !this.redis) return null;

    this.stats.totalRequests++;

    try {
      const entry = await this.redis.get<CacheEntry>(key);

      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        await this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      this.emit('cache:hit', { key });
      
      return entry.value as T;
    } catch (error: any) {
      console.error('Redis get error:', error.message);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.active || !this.redis) return;

    try {
      const entry: CacheEntry = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL
      };

      await this.redis.set(key, entry, {
        ex: ttl || this.defaultTTL
      });

      this.emit('cache:set', { key, ttl: ttl || this.defaultTTL });
    } catch (error: any) {
      console.error('Redis set error:', error.message);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.active || !this.redis) return;

    try {
      await this.redis.del(key);
      this.emit('cache:delete', { key });
    } catch (error: any) {
      console.error('Redis delete error:', error.message);
    }
  }

  async clear(): Promise<void> {
    if (!this.active || !this.redis) return;

    try {
      await this.redis.flushdb();
      this.emit('cache:cleared');
      console.log('💨 Redis Cache cleared');
    } catch (error: any) {
      console.error('Redis clear error:', error.message);
    }
  }

  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = (this.stats.hits / this.stats.totalRequests) * 100;
    }
  }

  getStats(): CacheStats & { enabled: boolean } {
    return {
      enabled: this.active,
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalRequests: this.stats.totalRequests,
      hitRate: Math.round(this.stats.hitRate * 100) / 100
    };
  }

  getStatus() {
    return {
      active: this.active,
      stats: this.stats
    };
  }

  isActive(): boolean {
    return this.active;
  }
}

// Singleton instance
export const redisCache = new RedisCache();
