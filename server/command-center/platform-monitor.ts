/**
 * 💓 Platform Monitoring System
 * =============================
 * Real-time monitoring of external platforms with SIDE integration
 * 
 * Features:
 * - Heartbeat receiver from platforms
 * - Auto-verification checks
 * - Health status tracking
 * - Alert generation
 * 
 * @supreme Nicholas watches over all platforms
 * @eternal Continuous monitoring - 24/7
 */

import { db } from "../db";
import {
  platformHeartbeats,
  platformVerification,
  platformHealthStatus,
  type InsertPlatformHeartbeat,
  type InsertPlatformVerification,
  type InsertPlatformHealthStatus,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { EXTERNAL_PLATFORMS } from "./external-platforms-registry";

interface HeartbeatData {
  platformId: string;
  platformName?: string;
  sideInstalled: boolean;
  sideVersion?: string;
  sideActive: boolean;
  status: 'online' | 'degraded' | 'offline';
  cpuUsage?: number;
  memoryUsage?: number;
  responseTime?: number;
  complianceScore?: number;
  codeQualityScore?: number;
  securityScore?: number;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

interface VerificationResult {
  platformId: string;
  platformName: string;
  platformUrl: string;
  verificationType: 'side_installation' | 'side_version' | 'health_check' | 'compliance_check';
  success: boolean;
  sideDetected: boolean;
  sideVersion?: string;
  responseCode?: number;
  responseTime?: number;
  errorMessage?: string;
  verificationData?: Record<string, any>;
}

/**
 * Platform Monitor - Main monitoring engine
 */
export class PlatformMonitor {
  
  /**
   * Process incoming heartbeat from platform
   */
  async processHeartbeat(data: HeartbeatData): Promise<void> {
    console.log(`[Platform Monitor] 💓 Heartbeat received from ${data.platformId}`);

    // Get platform info
    const platform = EXTERNAL_PLATFORMS.find(p => p.nodeId === data.platformId);
    const platformName = data.platformName || platform?.nodeName || data.platformId;

    // Record heartbeat
    await db.insert(platformHeartbeats).values({
      platformId: data.platformId,
      platformName,
      sideInstalled: data.sideInstalled ? 1 : 0,
      sideVersion: data.sideVersion,
      sideActive: data.sideActive ? 1 : 0,
      status: data.status,
      cpuUsage: data.cpuUsage,
      memoryUsage: data.memoryUsage,
      responseTime: data.responseTime,
      complianceScore: data.complianceScore,
      codeQualityScore: data.codeQualityScore,
      securityScore: data.securityScore,
      metadata: data.metadata || {},
      ipAddress: data.ipAddress,
    });

    // Update platform health status - atomic heartbeat increment
    await this.updatePlatformHealthFromHeartbeat(data.platformId, {
      platformName,
      currentStatus: data.status,
      sideInstalled: data.sideInstalled ? 1 : 0,
      sideVersion: data.sideVersion,
      sideActive: data.sideActive ? 1 : 0,
      complianceScore: data.complianceScore,
      lastHeartbeat: new Date(),
      lastOnline: data.status === 'online' ? new Date() : undefined,
    });

    // Broadcast real-time update via WebSocket
    try {
      const { commandWebSocket } = await import('./command-websocket');
      commandWebSocket.broadcastPlatformStatus(data.platformId, {
        platformName,
        status: data.status,
        sideInstalled: data.sideInstalled,
        sideVersion: data.sideVersion,
        complianceScore: data.complianceScore,
        lastHeartbeat: new Date().toISOString(),
      });
    } catch (error) {
      // WebSocket not critical - continue without it
      console.warn(`[Platform Monitor] WebSocket broadcast failed:`, error);
    }

    console.log(`[Platform Monitor] ✅ Heartbeat processed for ${data.platformId}`);
  }

  /**
   * Update platform health status from heartbeat - atomically increments heartbeat counter
   */
  private async updatePlatformHealthFromHeartbeat(
    platformId: string,
    updates: Partial<InsertPlatformHealthStatus>
  ): Promise<void> {
    // Filter out undefined values to avoid overwriting existing data
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    ) as Partial<InsertPlatformHealthStatus>;

    // Check if record exists
    const [existing] = await db
      .select()
      .from(platformHealthStatus)
      .where(eq(platformHealthStatus.platformId, platformId))
      .limit(1);

    if (existing) {
      // Update existing record with atomic heartbeat increment
      await db
        .update(platformHealthStatus)
        .set({
          ...filteredUpdates,
          totalHeartbeats: sql`${platformHealthStatus.totalHeartbeats} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(platformHealthStatus.platformId, platformId));
    } else {
      // Create new record
      const platform = EXTERNAL_PLATFORMS.find(p => p.nodeId === platformId);
      
      await db.insert(platformHealthStatus).values({
        platformId,
        platformName: filteredUpdates.platformName || platform?.nodeName || platformId,
        platformUrl: platform?.nodeUrl,
        platformType: platform?.nodeType,
        priority: platform?.priority || 'normal',
        currentStatus: filteredUpdates.currentStatus || 'unknown',
        sideInstalled: filteredUpdates.sideInstalled || 0,
        sideVersion: filteredUpdates.sideVersion,
        sideActive: filteredUpdates.sideActive || 0,
        complianceScore: filteredUpdates.complianceScore || 0,
        totalHeartbeats: 1,
        ...filteredUpdates,
      });
    }
  }

  /**
   * Update platform health status (non-heartbeat updates)
   */
  private async updatePlatformHealthFromVerification(
    platformId: string,
    updates: Partial<InsertPlatformHealthStatus>
  ): Promise<void> {
    // Filter out undefined values to avoid overwriting existing data
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    ) as Partial<InsertPlatformHealthStatus>;

    // Check if record exists
    const [existing] = await db
      .select()
      .from(platformHealthStatus)
      .where(eq(platformHealthStatus.platformId, platformId))
      .limit(1);

    if (existing) {
      // Update existing record (no heartbeat increment)
      await db
        .update(platformHealthStatus)
        .set({
          ...filteredUpdates,
          updatedAt: new Date(),
        })
        .where(eq(platformHealthStatus.platformId, platformId));
    } else {
      // Create new record if it doesn't exist
      const platform = EXTERNAL_PLATFORMS.find(p => p.nodeId === platformId);
      
      await db.insert(platformHealthStatus).values({
        platformId,
        platformName: filteredUpdates.platformName || platform?.nodeName || platformId,
        platformUrl: platform?.nodeUrl,
        platformType: platform?.nodeType,
        priority: platform?.priority || 'normal',
        currentStatus: filteredUpdates.currentStatus || 'unknown',
        sideInstalled: filteredUpdates.sideInstalled || 0,
        sideVersion: filteredUpdates.sideVersion,
        sideActive: filteredUpdates.sideActive || 0,
        complianceScore: filteredUpdates.complianceScore || 0,
        totalHeartbeats: 0,
        totalVerifications: filteredUpdates.totalVerifications || 0,
        failedVerifications: filteredUpdates.failedVerifications || 0,
        ...filteredUpdates,
      });
    }
  }

  /**
   * Verify SIDE installation on platform
   */
  async verifyPlatform(platformId: string): Promise<VerificationResult> {
    console.log(`[Platform Monitor] 🔍 Verifying platform ${platformId}...`);

    const platform = EXTERNAL_PLATFORMS.find(p => p.nodeId === platformId);
    if (!platform) {
      throw new Error(`Platform ${platformId} not found in registry`);
    }

    const startTime = Date.now();
    let verificationResult: VerificationResult = {
      platformId,
      platformName: platform.nodeName,
      platformUrl: platform.nodeUrl,
      verificationType: 'side_installation',
      success: false,
      sideDetected: false,
    };

    try {
      // Try to reach platform's SIDE status endpoint
      const url = `${platform.nodeUrl}/api/side/status`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        verificationResult = {
          ...verificationResult,
          success: true,
          sideDetected: data.installed === true,
          sideVersion: data.version,
          responseCode: response.status,
          responseTime,
          verificationData: data,
        };
      } else {
        verificationResult = {
          ...verificationResult,
          success: false,
          sideDetected: false,
          responseCode: response.status,
          responseTime,
          errorMessage: `HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      verificationResult = {
        ...verificationResult,
        success: false,
        sideDetected: false,
        errorMessage: error.message || 'Verification failed',
        responseTime: Date.now() - startTime,
      };
    }

    // Record verification
    await db.insert(platformVerification).values({
      platformId: verificationResult.platformId,
      platformName: verificationResult.platformName,
      platformUrl: verificationResult.platformUrl,
      verificationType: verificationResult.verificationType,
      verificationStatus: verificationResult.success ? 'success' : 'failed',
      sideDetected: verificationResult.sideDetected ? 1 : 0,
      sideVersion: verificationResult.sideVersion,
      responseCode: verificationResult.responseCode,
      responseTime: verificationResult.responseTime,
      errorMessage: verificationResult.errorMessage,
      verificationData: verificationResult.verificationData || {},
    });

    // Update platform health status with atomic verification counter increments
    // Check if record exists to use atomic SQL increments
    const [existing] = await db
      .select()
      .from(platformHealthStatus)
      .where(eq(platformHealthStatus.platformId, platformId))
      .limit(1);
    
    if (existing) {
      // Build update object conditionally to avoid undefined values
      const updateData: any = {
        lastVerification: new Date(),
        totalVerifications: sql`${platformHealthStatus.totalVerifications} + 1`,
        updatedAt: new Date(),
      };
      
      // Only increment failedVerifications on failure
      if (!verificationResult.success) {
        updateData.failedVerifications = sql`${platformHealthStatus.failedVerifications} + 1`;
      }
      
      // Use atomic SQL increments for verification counters
      await db
        .update(platformHealthStatus)
        .set(updateData)
        .where(eq(platformHealthStatus.platformId, platformId));
    } else {
      // Create new record if it doesn't exist
      await this.updatePlatformHealthFromVerification(platformId, {
        lastVerification: new Date(),
        totalVerifications: 1,
        failedVerifications: verificationResult.success ? 0 : 1,
      });
    }

    console.log(
      `[Platform Monitor] ${verificationResult.success ? '✅' : '❌'} Verification complete for ${platformId}`
    );

    return verificationResult;
  }

  /**
   * Verify all platforms
   */
  async verifyAllPlatforms(): Promise<VerificationResult[]> {
    console.log('[Platform Monitor] 🔍 Starting verification for all platforms...');

    const results: VerificationResult[] = [];

    for (const platform of EXTERNAL_PLATFORMS) {
      try {
        const result = await this.verifyPlatform(platform.nodeId);
        results.push(result);
      } catch (error: any) {
        console.error(`[Platform Monitor] Failed to verify ${platform.nodeId}:`, error);
        results.push({
          platformId: platform.nodeId,
          platformName: platform.nodeName,
          platformUrl: platform.nodeUrl,
          verificationType: 'side_installation',
          success: false,
          sideDetected: false,
          errorMessage: error.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const detected = results.filter(r => r.sideDetected).length;

    console.log('[Platform Monitor] 📊 Verification complete:');
    console.log(`   ✅ Successful checks: ${successful}/${results.length}`);
    console.log(`   🔍 SIDE detected: ${detected}/${results.length}`);

    return results;
  }

  /**
   * Get platform health status
   */
  async getPlatformHealth(platformId: string) {
    const [health] = await db
      .select()
      .from(platformHealthStatus)
      .where(eq(platformHealthStatus.platformId, platformId))
      .limit(1);

    return health || null;
  }

  /**
   * Get all platforms health status
   */
  async getAllPlatformsHealth() {
    const healthStatuses = await db
      .select()
      .from(platformHealthStatus)
      .orderBy(desc(platformHealthStatus.updatedAt));

    return healthStatuses;
  }

  /**
   * Get recent heartbeats for platform
   */
  async getRecentHeartbeats(platformId: string, limit = 10) {
    const heartbeats = await db
      .select()
      .from(platformHeartbeats)
      .where(eq(platformHeartbeats.platformId, platformId))
      .orderBy(desc(platformHeartbeats.heartbeatAt))
      .limit(limit);

    return heartbeats;
  }

  /**
   * Get verification history for platform
   */
  async getVerificationHistory(platformId: string, limit = 10) {
    const verifications = await db
      .select()
      .from(platformVerification)
      .where(eq(platformVerification.platformId, platformId))
      .orderBy(desc(platformVerification.verifiedAt))
      .limit(limit);

    return verifications;
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats() {
    const allHealth = await this.getAllPlatformsHealth();

    const totalPlatforms = EXTERNAL_PLATFORMS.length;
    const monitoredPlatforms = allHealth.length;
    const onlinePlatforms = allHealth.filter(h => h.currentStatus === 'online').length;
    const withSIDE = allHealth.filter(h => h.sideInstalled === 1).length;
    const sideActive = allHealth.filter(h => h.sideActive === 1).length;

    const avgHealthScore = allHealth.length > 0
      ? allHealth.reduce((sum, h) => sum + (h.healthScore || 0), 0) / allHealth.length
      : 0;

    const avgComplianceScore = allHealth.length > 0
      ? allHealth.reduce((sum, h) => sum + (h.complianceScore || 0), 0) / allHealth.length
      : 0;

    return {
      totalPlatforms,
      monitoredPlatforms,
      onlinePlatforms,
      offlinePlatforms: monitoredPlatforms - onlinePlatforms,
      withSIDE,
      withoutSIDE: monitoredPlatforms - withSIDE,
      sideActive,
      sideInactive: withSIDE - sideActive,
      avgHealthScore: Math.round(avgHealthScore),
      avgComplianceScore: Math.round(avgComplianceScore),
      lastUpdate: new Date(),
    };
  }
}

// Export singleton instance
export const platformMonitor = new PlatformMonitor();
