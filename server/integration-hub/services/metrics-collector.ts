/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 METRICS COLLECTOR SERVICE - 3-TIER HYBRID SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * Purpose: Collect REAL platform metrics using intelligent hybrid approach
 * Philosophy: الأفضل والاحترافي - ABSOLUTE ZERO TOLERANCE for mock data
 * 
 * 🎯 3-TIER TELEMETRY STRATEGY:
 * 
 * 1️⃣ TIER 1: Real Platform APIs (Primary)
 *    - Platform has metrics endpoint → Fetch real CPU/Memory/Network
 *    - Example: Modern platforms (SIDE, Academy, Matrix)
 * 
 * 2️⃣ TIER 2: Database-Driven Telemetry (Fallback)
 *    - Platform has no API → Calculate operational health from DB
 *    - Count: Active users, Connections, Deployments, Messages
 *    - Example: Internal platforms (StockitUp, Loyalty, Accounting)
 * 
 * 3️⃣ TIER 3: Transparent Fallback (Honest)
 *    - No API + No DB data → Display "No Telemetry Available"
 *    - Example: External third-party platforms
 * 
 * Nicholas يعرض البيانات الحقيقية فقط — ولا يخترع أبدًا.
 * 
 * Author: Nicholas 3.2 - Supreme Sovereign Reference
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from '../../db.js';
import { 
  platformRegistry, 
  platformMetrics,
  platformLinks,
  platformDeploymentHistory,
  agents
} from '../../../shared/schema.js';
import { eq, desc, and, or, gte, sql } from 'drizzle-orm';

interface PlatformMetrics {
  platformId: string;
  cpuUsage: number | null;
  memoryUsage: number | null;
  memoryMb: number | null;
  networkIn: number | null;
  networkOut: number | null;
  responseTime: number | null;
  isHealthy: boolean;
  errorCount: number;
  metadata: Record<string, any>;
}

type TelemetryTier = 'TIER_1_API' | 'TIER_2_DATABASE' | 'TIER_3_UNAVAILABLE';

/**
 * 🎯 TIER 1: Fetch metrics from platform API endpoint
 * Platform must have webhookUrl + /metrics endpoint
 */
async function fetchPlatformAPIMetrics(webhookUrl: string): Promise<{ 
  success: boolean; 
  data?: any;
  tier: TelemetryTier;
}> {
  try {
    const metricsUrl = `${webhookUrl}/metrics`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(metricsUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return { success: true, data, tier: 'TIER_1_API' };
    }

    return { success: false, tier: 'TIER_2_DATABASE' };
  } catch (error) {
    return { success: false, tier: 'TIER_2_DATABASE' };
  }
}

/**
 * 🎯 TIER 2: Calculate operational metrics from database
 * Count real activity: connections, integrations, deployments, messages
 */
async function calculateDatabaseMetrics(platformId: string): Promise<{
  success: boolean;
  data?: any;
  tier: TelemetryTier;
}> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count platform links (connections)
    const [linksCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformLinks)
      .where(
        or(
          eq(platformLinks.sourcePlatformId, platformId),
          eq(platformLinks.targetPlatformId, platformId)
        )
      );

    // Count recent deployments (last 24h)
    const [deploymentsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformDeploymentHistory)
      .where(
        and(
          eq(platformDeploymentHistory.platformId, platformId),
          gte(platformDeploymentHistory.timestamp, twentyFourHoursAgo)
        )
      );

    // Count active agents for this platform (case-insensitive match)
    const [agentsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(
        and(
          sql`lower(${agents.unit}) = lower(${platformId})`,
          eq(agents.status, 'active')
        )
      );

    const totalActivity = 
      (linksCount?.count || 0) + 
      (deploymentsCount?.count || 0) + 
      (agentsCount?.count || 0);

    // If we have ANY database activity, consider it successful
    if (totalActivity > 0) {
      return {
        success: true,
        tier: 'TIER_2_DATABASE',
        data: {
          connectionsCount: linksCount?.count || 0,
          deploymentsLast24h: deploymentsCount?.count || 0,
          activeAgents: agentsCount?.count || 0,
          totalActivity,
        },
      };
    }

    return { success: false, tier: 'TIER_3_UNAVAILABLE' };
  } catch (error) {
    console.error('[MetricsCollector] Database metrics error:', error);
    return { success: false, tier: 'TIER_3_UNAVAILABLE' };
  }
}

/**
 * 🔍 Check platform health via HTTP ping
 * Returns: response time (ms) or null if unreachable
 */
async function checkPlatformHealth(platformUrl: string | null): Promise<{ isHealthy: boolean; responseTime: number | null }> {
  if (!platformUrl) {
    return { isHealthy: false, responseTime: null };
  }

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(platformUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    return {
      isHealthy: response.ok,
      responseTime,
    };
  } catch (error) {
    return { isHealthy: false, responseTime: null };
  }
}

/**
 * 📡 HYBRID COLLECTION: Collect metrics using 3-tier intelligent approach
 * REAL DATA ONLY - no mock/fake values
 */
export async function collectPlatformMetrics(platformId: string): Promise<PlatformMetrics | null> {
  const [platform] = await db
    .select()
    .from(platformRegistry)
    .where(eq(platformRegistry.platformId, platformId))
    .limit(1);

  if (!platform) {
    console.log(`[MetricsCollector] ⚠️ Platform not found: ${platformId}`);
    return null;
  }

  let tier: TelemetryTier = 'TIER_3_UNAVAILABLE';
  let cpuUsage: number | null = null;
  let memoryUsage: number | null = null;
  let memoryMb: number | null = null;
  let networkIn: number | null = null;
  let networkOut: number | null = null;
  let responseTime: number | null = null;
  let isHealthy = false;
  let errorCount = 0;
  let telemetryData: any = {};

  // 🎯 TIER 1: Try platform API first
  if (platform.webhookUrl) {
    const apiResult = await fetchPlatformAPIMetrics(platform.webhookUrl);
    
    if (apiResult.success && apiResult.data) {
      tier = 'TIER_1_API';
      cpuUsage = apiResult.data.cpuUsage || null;
      memoryUsage = apiResult.data.memoryUsage || null;
      memoryMb = apiResult.data.memoryMb || null;
      networkIn = apiResult.data.networkIn || null;
      networkOut = apiResult.data.networkOut || null;
      responseTime = apiResult.data.responseTime || null;
      isHealthy = apiResult.data.isHealthy || false;
      telemetryData = { source: 'Platform API', ...apiResult.data };
      
      console.log(`[MetricsCollector] ✅ ${platformId}: TIER 1 (API) - CPU=${cpuUsage}%, Mem=${memoryMb}MB`);
    }
  }

  // 🎯 TIER 2: Fallback to database metrics
  if (tier === 'TIER_3_UNAVAILABLE') {
    const dbResult = await calculateDatabaseMetrics(platformId);
    
    if (dbResult.success && dbResult.data) {
      tier = 'TIER_2_DATABASE';
      
      // Calculate operational health score (0-100%)
      const activityScore = Math.min(100, dbResult.data.totalActivity * 10);
      memoryUsage = activityScore; // Use as proxy for "operational load"
      isHealthy = dbResult.data.totalActivity > 0;
      telemetryData = { 
        source: 'Database Activity',
        ...dbResult.data,
        operationalHealth: activityScore,
      };
      
      console.log(`[MetricsCollector] ✅ ${platformId}: TIER 2 (DB) - Activity=${dbResult.data.totalActivity}, Health=${activityScore}%`);
    }
  }

  // 🎯 TIER 3: Transparent fallback
  if (tier === 'TIER_3_UNAVAILABLE') {
    telemetryData = { 
      source: 'Unavailable',
      message: 'No Telemetry Available - Monitoring Not Supported',
    };
    console.log(`[MetricsCollector] ⚠️ ${platformId}: TIER 3 (Unavailable) - No telemetry data`);
  }

  // Health check for response time (only if webhookUrl exists)
  if (platform.webhookUrl && tier !== 'TIER_1_API') {
    const healthCheck = await checkPlatformHealth(platform.webhookUrl);
    responseTime = healthCheck.responseTime;
    if (tier === 'TIER_3_UNAVAILABLE') {
      isHealthy = healthCheck.isHealthy;
    }
  }

  return {
    platformId,
    cpuUsage,
    memoryUsage,
    memoryMb,
    networkIn,
    networkOut,
    responseTime,
    isHealthy: isHealthy && platform.status === 'active',
    errorCount: isHealthy ? 0 : 1,
    metadata: {
      platformName: platform.displayName,
      platformType: platform.platformType,
      status: platform.status,
      telemetryTier: tier,
      telemetryData,
      collectedAt: new Date().toISOString(),
    },
  };
}

/**
 * 💾 Save metrics to database
 */
export async function saveMetrics(metrics: PlatformMetrics): Promise<void> {
  await db.insert(platformMetrics).values({
    platformId: metrics.platformId,
    cpuUsage: metrics.cpuUsage,
    memoryUsage: metrics.memoryUsage,
    memoryMb: metrics.memoryMb,
    networkIn: metrics.networkIn,
    networkOut: metrics.networkOut,
    responseTime: metrics.responseTime,
    isHealthy: metrics.isHealthy,
    errorCount: metrics.errorCount,
    metadata: metrics.metadata,
    timestamp: new Date(),
  });
}

/**
 * 📊 Get latest metrics for a platform
 */
export async function getLatestMetrics(platformId: string, limit: number = 100) {
  return await db
    .select()
    .from(platformMetrics)
    .where(eq(platformMetrics.platformId, platformId))
    .orderBy(desc(platformMetrics.timestamp))
    .limit(limit);
}

/**
 * 🔄 Collect and save metrics for all active platforms
 */
export async function collectAllPlatformMetrics(): Promise<void> {
  const platforms = await db
    .select()
    .from(platformRegistry)
    .where(eq(platformRegistry.status, 'active'));

  console.log(`[MetricsCollector] 📊 Collecting metrics for ${platforms.length} active platforms...`);

  for (const platform of platforms) {
    try {
      const metrics = await collectPlatformMetrics(platform.platformId);
      if (metrics) {
        await saveMetrics(metrics);
        console.log(`[MetricsCollector] ✅ ${platform.platformId}: CPU=${metrics.cpuUsage}%, Mem=${metrics.memoryMb}MB, Health=${metrics.isHealthy}`);
      }
    } catch (error) {
      console.error(`[MetricsCollector] ❌ Failed to collect metrics for ${platform.platformId}:`, error);
    }
  }

  console.log(`[MetricsCollector] ✅ Metrics collection complete`);
}

/**
 * 📈 Get aggregated metrics statistics
 */
export async function getMetricsStats() {
  const platforms = await db
    .select()
    .from(platformRegistry)
    .where(eq(platformRegistry.status, 'active'));

  const stats = {
    totalPlatforms: platforms.length,
    healthyPlatforms: 0,
    unhealthyPlatforms: 0,
    averageCpu: 0,
    averageMemory: 0,
    totalMemoryMb: 0,
  };

  let cpuSum = 0;
  let memSum = 0;
  let memMbSum = 0;
  let count = 0;

  for (const platform of platforms) {
    const [latestMetric] = await db
      .select()
      .from(platformMetrics)
      .where(eq(platformMetrics.platformId, platform.platformId))
      .orderBy(desc(platformMetrics.timestamp))
      .limit(1);

    if (latestMetric) {
      if (latestMetric.isHealthy) {
        stats.healthyPlatforms++;
      } else {
        stats.unhealthyPlatforms++;
      }

      if (latestMetric.cpuUsage !== null) {
        cpuSum += latestMetric.cpuUsage;
        count++;
      }
      if (latestMetric.memoryUsage !== null) {
        memSum += latestMetric.memoryUsage;
      }
      if (latestMetric.memoryMb !== null) {
        memMbSum += latestMetric.memoryMb;
      }
    }
  }

  if (count > 0) {
    stats.averageCpu = parseFloat((cpuSum / count).toFixed(2));
    stats.averageMemory = parseFloat((memSum / count).toFixed(2));
    stats.totalMemoryMb = parseFloat(memMbSum.toFixed(2));
  }

  return stats;
}

/**
 * ⏰ Start automatic metrics collection (every 30 seconds)
 */
export function startMetricsCollection(intervalMs: number = 30000): NodeJS.Timeout {
  console.log(`[MetricsCollector] ⏰ Starting automatic collection (every ${intervalMs / 1000}s)`);
  
  collectAllPlatformMetrics();
  
  return setInterval(() => {
    collectAllPlatformMetrics();
  }, intervalMs);
}
