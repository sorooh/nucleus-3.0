import { EventEmitter } from 'events';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RequestLog {
  ip: string;
  userId?: string;
  timestamp: number;
  endpoint: string;
  success: boolean;
}

interface BlockedEntity {
  type: 'ip' | 'user';
  value: string;
  reason: string;
  blockedAt: number;
  expiresAt?: number;
}

interface AnomalyPattern {
  type: 'rapid_requests' | 'failed_auth';
  severity: 'low' | 'medium' | 'high';
  threshold: number;
}

export class SecurityGuard extends EventEmitter {
  private active: boolean = false;
  private requestLogs: RequestLog[] = [];
  private blockedEntities: Map<string, BlockedEntity> = new Map();
  private rateLimitConfig: RateLimitConfig = {
    windowMs: 60000,
    maxRequests: 100
  };
  private anomalyPatterns: AnomalyPattern[] = [
    { type: 'rapid_requests', severity: 'high', threshold: 50 },
    { type: 'failed_auth', severity: 'medium', threshold: 5 }
  ];
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();
  }

  async activate(): Promise<void> {
    if (this.active) {
      console.log('🛡️ Security Guard already active');
      return;
    }

    this.active = true;
    this.startCleanup();
    this.emit('activated');
    console.log('🛡️ Security Guard activated - Protection enabled');
  }

  async shutdown(): Promise<void> {
    if (!this.active) return;

    this.active = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.emit('shutdown');
    console.log('🛡️ Security Guard shutdown');
  }

  logRequest(request: RequestLog): void {
    if (!this.active) return;

    this.requestLogs.push(request);
    this.emit('request_logged', request);

    this.detectAnomalies(request);
  }

  checkRateLimit(ip: string, userId?: string): boolean {
    if (!this.active) return true;

    if (this.isBlocked(ip, userId)) {
      this.emit('blocked_request', { ip, userId });
      return false;
    }

    const now = Date.now();
    const windowStart = now - this.rateLimitConfig.windowMs;

    const recentRequests = this.requestLogs.filter(log => {
      const matchesIp = log.ip === ip;
      const matchesUser = userId && log.userId === userId;
      const inWindow = log.timestamp >= windowStart;
      return (matchesIp || matchesUser) && inWindow;
    });

    if (recentRequests.length >= this.rateLimitConfig.maxRequests) {
      this.emit('rate_limit_exceeded', { ip, userId, count: recentRequests.length });
      return false;
    }

    return true;
  }

  isBlocked(ip: string, userId?: string): boolean {
    const now = Date.now();

    const ipBlocked = this.blockedEntities.get(`ip:${ip}`);
    if (ipBlocked && (!ipBlocked.expiresAt || ipBlocked.expiresAt > now)) {
      return true;
    }

    if (userId) {
      const userBlocked = this.blockedEntities.get(`user:${userId}`);
      if (userBlocked && (!userBlocked.expiresAt || userBlocked.expiresAt > now)) {
        return true;
      }
    }

    return false;
  }

  blockEntity(type: 'ip' | 'user', value: string, reason: string, durationMs?: number): void {
    if (!this.active) return;

    const key = `${type}:${value}`;
    const blocked: BlockedEntity = {
      type,
      value,
      reason,
      blockedAt: Date.now(),
      expiresAt: durationMs ? Date.now() + durationMs : undefined
    };

    this.blockedEntities.set(key, blocked);
    this.emit('entity_blocked', blocked);
    console.log(`🚫 Blocked ${type}: ${value} - ${reason}`);
  }

  unblockEntity(type: 'ip' | 'user', value: string): boolean {
    if (!this.active) return false;

    const key = `${type}:${value}`;
    const removed = this.blockedEntities.delete(key);
    
    if (removed) {
      this.emit('entity_unblocked', { type, value });
      console.log(`✅ Unblocked ${type}: ${value}`);
    }

    return removed;
  }

  private detectAnomalies(request: RequestLog): void {
    const now = Date.now();
    const last5Minutes = now - 300000;

    const recentRequestsFromIp = this.requestLogs.filter(
      log => log.ip === request.ip && log.timestamp >= last5Minutes
    );

    if (recentRequestsFromIp.length > this.anomalyPatterns[0].threshold) {
      this.emit('anomaly_detected', {
        type: 'rapid_requests',
        severity: 'high',
        ip: request.ip,
        count: recentRequestsFromIp.length
      });
      
      this.blockEntity('ip', request.ip, 'Rapid requests detected', 3600000);
    }

    const failedAuthAttempts = this.requestLogs.filter(
      log => log.ip === request.ip && 
             log.endpoint.includes('/auth/login') && 
             !log.success &&
             log.timestamp >= last5Minutes
    );

    if (failedAuthAttempts.length > this.anomalyPatterns[1].threshold) {
      this.emit('anomaly_detected', {
        type: 'failed_auth',
        severity: 'medium',
        ip: request.ip,
        count: failedAuthAttempts.length
      });
      
      this.blockEntity('ip', request.ip, 'Multiple failed login attempts', 1800000);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 600000);
  }

  private cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    this.requestLogs = this.requestLogs.filter(log => log.timestamp >= oneHourAgo);

    const expiredKeys: string[] = [];
    this.blockedEntities.forEach((blocked, key) => {
      if (blocked.expiresAt && blocked.expiresAt <= now) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.blockedEntities.delete(key);
      console.log(`🔓 Auto-unblocked: ${key}`);
    });
  }

  getStatus() {
    return {
      active: this.active,
      requestLogs: this.requestLogs.length,
      blockedEntities: this.blockedEntities.size,
      rateLimit: this.rateLimitConfig,
      anomalyPatterns: this.anomalyPatterns.length
    };
  }

  getBlockedEntities(): BlockedEntity[] {
    const now = Date.now();
    return Array.from(this.blockedEntities.values()).filter(
      blocked => !blocked.expiresAt || blocked.expiresAt > now
    );
  }

  getAnalytics() {
    const now = Date.now();
    const last24Hours = now - 86400000;
    
    const recentLogs = this.requestLogs.filter(log => log.timestamp >= last24Hours);
    
    const totalRequests = recentLogs.length;
    const successfulRequests = recentLogs.filter(log => log.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const uniqueIps = new Set(recentLogs.map(log => log.ip)).size;
    const uniqueUsers = new Set(
      recentLogs.filter(log => log.userId).map(log => log.userId)
    ).size;

    const topIps = this.getTopIps(recentLogs, 5);
    const topEndpoints = this.getTopEndpoints(recentLogs, 5);

    return {
      timeWindow: '24h',
      totalRequests,
      successfulRequests,
      failedRequests,
      uniqueIps,
      uniqueUsers,
      topIps,
      topEndpoints,
      blockedCount: this.blockedEntities.size
    };
  }

  private getTopIps(logs: RequestLog[], limit: number) {
    const ipCounts = new Map<string, number>();
    
    logs.forEach(log => {
      ipCounts.set(log.ip, (ipCounts.get(log.ip) || 0) + 1);
    });

    return Array.from(ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([ip, count]) => ({ ip, count }));
  }

  private getTopEndpoints(logs: RequestLog[], limit: number) {
    const endpointCounts = new Map<string, number>();
    
    logs.forEach(log => {
      endpointCounts.set(log.endpoint, (endpointCounts.get(log.endpoint) || 0) + 1);
    });

    return Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  updateRateLimit(windowMs: number, maxRequests: number): void {
    this.rateLimitConfig = { windowMs, maxRequests };
    this.emit('rate_limit_updated', this.rateLimitConfig);
    console.log(`⚙️ Rate limit updated: ${maxRequests} requests per ${windowMs}ms`);
  }
}

export const securityGuard = new SecurityGuard();
