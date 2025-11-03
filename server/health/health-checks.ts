/**
 * Nucleus 3.0 - Comprehensive Health Check System
 * 
 * نظام فحص صحة شامل لجميع مكونات Nucleus
 * يوفر معلومات تفصيلية عن حالة كل نظام فرعي
 */

import { db } from '../db';
import { Redis } from '@upstash/redis';
import { sql } from 'drizzle-orm';

/**
 * Health Check Result Interface
 */
interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  details?: any;
  latency?: number;
  timestamp: string;
}

/**
 * Overall System Health
 */
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number; // 0-100
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    ai_providers: HealthCheckResult;
    memory_systems: HealthCheckResult;
    external_services: HealthCheckResult;
    platform_registry: HealthCheckResult;
  };
  uptime: number;
  timestamp: string;
}

/**
 * Health Check System
 */
export class HealthCheckSystem {
  /**
   * Run comprehensive health check on all systems
   */
  async runComprehensiveHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();

    // Run all checks in parallel
    const [database, redis_check, ai_providers, memory_systems, external_services, platform_registry] =
      await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkAIProviders(),
        this.checkMemorySystems(),
        this.checkExternalServices(),
        this.checkPlatformRegistry(),
      ]);

    const checks = {
      database,
      redis: redis_check,
      ai_providers,
      memory_systems,
      external_services,
      platform_registry,
    };

    // Calculate health score
    const healthScore = this.calculateHealthScore(checks);

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthScore >= 90) {
      status = 'healthy';
    } else if (healthScore >= 60) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      score: healthScore,
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check Database Health
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Simple query to test connection
      await db.execute(sql`SELECT 1 as health_check`);

      // Try to query platform registry
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM platform_registry`);

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        message: 'Database is healthy',
        details: {
          connected: true,
          latency,
          platformCount: (result.rows[0] as any)?.count || 0,
        },
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      return {
        healthy: false,
        message: 'Database connection failed',
        details: {
          error: error.message,
        },
        latency,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Redis Health
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check if Redis is configured
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!redisUrl || !redisToken) {
        return {
          healthy: false,
          message: 'Redis not configured',
          details: {
            connected: false,
            configured: false,
          },
          latency: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      const testKey = 'health:check:test';
      const testValue = Date.now().toString();

      // Set a test value
      await redis.set(testKey, testValue, { ex: 10 });

      // Get it back
      const retrieved = await redis.get(testKey);

      // Clean up
      await redis.del(testKey);

      const latency = Date.now() - startTime;

      if (retrieved === testValue) {
        return {
          healthy: true,
          message: 'Redis is healthy',
          details: {
            connected: true,
            readWrite: true,
            latency,
          },
          latency,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          healthy: false,
          message: 'Redis read/write mismatch',
          details: {
            expected: testValue,
            received: retrieved,
          },
          latency,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      return {
        healthy: false,
        message: 'Redis connection failed',
        details: {
          error: error.message,
        },
        latency,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check AI Providers Health
   */
  private async checkAIProviders(): Promise<HealthCheckResult> {
    const providers = ['hunyuan', 'openai', 'claude', 'llama', 'mistral', 'falcon'];
    const startTime = Date.now();

    try {
      // Test which providers are accessible
      const results = await Promise.allSettled(
        providers.map(async (provider) => {
          const testStart = Date.now();
          const healthy = await this.testAIProvider(provider);
          const providerLatency = Date.now() - testStart;

          return {
            provider,
            healthy,
            latency: providerLatency,
          };
        })
      );

      const providerResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            provider: providers[index],
            healthy: false,
            error: result.reason?.message || 'Unknown error',
          };
        }
      });

      const healthyCount = providerResults.filter((r) => r.healthy).length;
      const totalLatency = Date.now() - startTime;

      return {
        healthy: healthyCount > 0, // At least one provider should be healthy
        message: `${healthyCount}/${providers.length} AI providers are healthy`,
        details: {
          providers: providerResults,
          healthyCount,
          totalCount: providers.length,
        },
        latency: totalLatency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: 'AI provider check failed',
        details: {
          error: error.message,
        },
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Test individual AI provider
   */
  private async testAIProvider(provider: string): Promise<boolean> {
    try {
      // Check if API key exists
      const envVars: Record<string, string> = {
        hunyuan: 'SILICONFLOW_API_KEY',
        openai: 'OPENAI_API_KEY',
        claude: 'ANTHROPIC_API_KEY',
        llama: 'GROQ_API_KEY',
        mistral: 'MISTRAL_API_KEY',
        falcon: 'HF_TOKEN',
      };

      const apiKey = process.env[envVars[provider]];
      return !!apiKey && apiKey.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check Memory Systems Health
   */
  private async checkMemorySystems(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check if vector memory is accessible (via env)
      const vectorURL = process.env.UPSTASH_VECTOR_REST_URL;
      const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;

      const hasVectorConfig = !!vectorURL && !!vectorToken;

      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        message: 'Memory systems are healthy',
        details: {
          vectorMemory: hasVectorConfig,
          heap: {
            used: heapUsedMB,
            total: heapTotalMB,
            percentage: Math.round((heapUsedMB / heapTotalMB) * 100),
          },
          rss: rssMB,
        },
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: 'Memory system check failed',
        details: {
          error: error.message,
        },
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check External Services Health
   */
  private async checkExternalServices(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check required env vars for external services
      const services = {
        newsapi: !!process.env.NEWSAPI_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
        upstash_redis: !!process.env.UPSTASH_REDIS_REST_URL,
        upstash_vector: !!process.env.UPSTASH_VECTOR_REST_URL,
      };

      const configuredCount = Object.values(services).filter((v) => v).length;
      const totalCount = Object.keys(services).length;

      const latency = Date.now() - startTime;

      return {
        healthy: configuredCount >= 3, // At least 3 services should be configured
        message: `${configuredCount}/${totalCount} external services are configured`,
        details: {
          services,
          configuredCount,
          totalCount,
        },
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: 'External services check failed',
        details: {
          error: error.message,
        },
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Platform Registry Health
   */
  private async checkPlatformRegistry(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Query platform registry
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN auth_mode = 'ENHANCED' THEN 1 ELSE 0 END) as enhanced
        FROM platform_registry
      `);

      const stats = result.rows[0] as any;
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        message: 'Platform registry is healthy',
        details: {
          totalPlatforms: parseInt(stats.total) || 0,
          activePlatforms: parseInt(stats.active) || 0,
          enhancedPlatforms: parseInt(stats.enhanced) || 0,
        },
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: 'Platform registry check failed',
        details: {
          error: error.message,
        },
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(checks: SystemHealth['checks']): number {
    const weights = {
      database: 25, // Critical
      redis: 20, // Important
      ai_providers: 15, // Important
      memory_systems: 15, // Important
      external_services: 15, // Nice to have
      platform_registry: 10, // Nice to have
    };

    let score = 0;

    for (const [key, check] of Object.entries(checks)) {
      if (check.healthy) {
        score += weights[key as keyof typeof weights];
      } else {
        // Partial credit for degraded state
        const latency = check.latency || 0;
        if (latency < 5000) {
          // If fast but failed, give some credit
          score += weights[key as keyof typeof weights] * 0.3;
        }
      }
    }

    return Math.round(score);
  }

  /**
   * Quick health check (just database and redis)
   */
  async quickHealthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const [database, redis_check] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

      const healthy = database.healthy && redis_check.healthy;

      return {
        healthy,
        message: healthy ? 'System is operational' : 'System is experiencing issues',
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: `Health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const memoryUsage = process.memoryUsage();

    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
let healthCheckInstance: HealthCheckSystem | null = null;

export function getHealthCheck(): HealthCheckSystem {
  if (!healthCheckInstance) {
    healthCheckInstance = new HealthCheckSystem();
  }
  return healthCheckInstance;
}
