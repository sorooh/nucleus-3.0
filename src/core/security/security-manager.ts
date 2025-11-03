/**
 * 🔒 Professional Security Manager - Enterprise Security System
 * 
 * Advanced security with encryption, authentication, authorization,
 * threat detection, and compliance monitoring
 * 
 * @version 3.1.0-Professional
 * @author Nucleus Team
 * @enterprise-grade
 */

import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { Logger } from '../monitoring/logger';

const scryptAsync = promisify(scrypt);

// Security Interfaces
export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  roles: string[];
  permissions: string[];
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  csrfToken?: string;
}

export interface SecurityPolicy {
  requireAuthentication: boolean;
  requireAuthorization: boolean;
  allowedIps?: string[];
  blockedIps?: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  sessionTimeout: number;
  requireHttps: boolean;
  enableCsrf: boolean;
  enableAuditLogging: boolean;
}

export interface ThreatDetection {
  enableBruteForceProtection: boolean;
  enableSqlInjectionDetection: boolean;
  enableXssDetection: boolean;
  enableDdosProtection: boolean;
  enableAnomalyDetection: boolean;
  suspiciousActivityThreshold: number;
}

export interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'threat' | 'audit' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  details: Record<string, any>;
}

/**
 * Professional Security Manager with Enterprise Features
 */
export class SecurityManager extends EventEmitter {
  private logger: Logger;
  private policy: SecurityPolicy;
  private threatDetection: ThreatDetection;
  private rateLimitCache: Map<string, { count: number; lastReset: number }>;
  private sessionCache: Map<string, SecurityContext>;
  private threatCache: Map<string, { threats: number; lastThreat: number }>;
  private auditLog: SecurityEvent[];
  
  private static readonly DEFAULT_POLICY: SecurityPolicy = {
    requireAuthentication: true,
    requireAuthorization: true,
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    },
    sessionTimeout: 3600000, // 1 hour
    requireHttps: true,
    enableCsrf: true,
    enableAuditLogging: true
  };

  private static readonly DEFAULT_THREAT_DETECTION: ThreatDetection = {
    enableBruteForceProtection: true,
    enableSqlInjectionDetection: true,
    enableXssDetection: true,
    enableDdosProtection: true,
    enableAnomalyDetection: true,
    suspiciousActivityThreshold: 5
  };

  constructor(policy?: Partial<SecurityPolicy>, threatDetection?: Partial<ThreatDetection>) {
    super();
    this.logger = new Logger('SecurityManager');
    this.policy = { ...SecurityManager.DEFAULT_POLICY, ...policy };
    this.threatDetection = { ...SecurityManager.DEFAULT_THREAT_DETECTION, ...threatDetection };
    this.rateLimitCache = new Map();
    this.sessionCache = new Map();
    this.threatCache = new Map();
    this.auditLog = [];
    
    // Cleanup expired sessions and caches
    setInterval(() => this.cleanupExpired(), 60000); // Every minute
    
    this.logger.info('Security Manager initialized', {
      policy: this.policy,
      threatDetection: this.threatDetection
    });
  }

  /**
   * Validate incoming request
   */
  async validateRequest(request: any): Promise<SecurityContext> {
    const context: SecurityContext = {
      userId: request.userId,
      sessionId: request.sessionId,
      roles: request.roles || [],
      permissions: request.permissions || [],
      ipAddress: request.ipAddress || 'unknown',
      userAgent: request.userAgent || 'unknown',
      timestamp: Date.now(),
      csrfToken: request.csrfToken
    };

    // Rate limiting
    await this.checkRateLimit(context.ipAddress);
    
    // Threat detection
    await this.detectThreats(request, context);
    
    // Authentication
    if (this.policy.requireAuthentication) {
      await this.validateAuthentication(context);
    }
    
    // Authorization
    if (this.policy.requireAuthorization) {
      await this.validateAuthorization(context, request.resource);
    }
    
    // CSRF protection
    if (this.policy.enableCsrf && request.method !== 'GET') {
      await this.validateCsrf(context);
    }
    
    // Log security event
    this.logSecurityEvent({
      id: this.generateEventId(),
      type: 'audit',
      severity: 'low',
      message: 'Request validated successfully',
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: context.timestamp,
      details: { resource: request.resource }
    });
    
    return context;
  }

  /**
   * Generate secure hash
   */
  async generateHash(data: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const actualSalt = salt || randomBytes(32).toString('hex');
    const hash = await scryptAsync(data, actualSalt, 64) as Buffer;
    
    return {
      hash: hash.toString('hex'),
      salt: actualSalt
    };
  }

  /**
   * Verify hash
   */
  async verifyHash(data: string, hash: string, salt: string): Promise<boolean> {
    const { hash: computedHash } = await this.generateHash(data, salt);
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  /**
   * Generate JWT-like token
   */
  generateSecureToken(payload: Record<string, any>, secret: string, expiresIn: number = 3600): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn
    };
    
    const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadEncoded = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    
    const signature = createHmac('sha256', secret)
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest('base64url');
    
    return `${headerEncoded}.${payloadEncoded}.${signature}`;
  }

  /**
   * Verify JWT-like token
   */
  verifySecureToken(token: string, secret: string): Record<string, any> | null {
    try {
      const [headerEncoded, payloadEncoded, signature] = token.split('.');
      
      // Verify signature
      const expectedSignature = createHmac('sha256', secret)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64url');
      
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error('Invalid signature');
      }
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());
      
      // Check expiration
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        throw new Error('Token expired');
      }
      
      return payload;
      
    } catch (error) {
      this.logger.warn('Token verification failed', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string, key: string): { encrypted: string; iv: string } {
    const crypto = require('crypto');
    const iv = randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, key: string, iv: string): string {
    const crypto = require('crypto');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(identifier: string): Promise<void> {
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    
    let rateInfo = this.rateLimitCache.get(key);
    
    if (!rateInfo) {
      rateInfo = { count: 0, lastReset: now };
      this.rateLimitCache.set(key, rateInfo);
    }
    
    // Reset counter if minute has passed
    if (now - rateInfo.lastReset > 60000) {
      rateInfo.count = 0;
      rateInfo.lastReset = now;
    }
    
    rateInfo.count++;
    
    if (rateInfo.count > this.policy.rateLimits.requestsPerMinute) {
      this.logSecurityEvent({
        id: this.generateEventId(),
        type: 'threat',
        severity: 'high',
        message: 'Rate limit exceeded',
        ipAddress: identifier,
        userAgent: 'unknown',
        timestamp: now,
        details: { 
          count: rateInfo.count, 
          limit: this.policy.rateLimits.requestsPerMinute 
        }
      });
      
      throw new Error('Rate limit exceeded');
    }
  }

  /**
   * Detect security threats
   */
  private async detectThreats(request: any, context: SecurityContext): Promise<void> {
    const threats: string[] = [];
    
    // SQL Injection Detection
    if (this.threatDetection.enableSqlInjectionDetection) {
      const sqlPatterns = [
        /(\b(select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
        /(union\s+(all\s+)?select)/i,
        /(\b(or|and)\s+\d+\s*=\s*\d+)/i
      ];
      
      const queryString = JSON.stringify(request);
      if (sqlPatterns.some(pattern => pattern.test(queryString))) {
        threats.push('SQL Injection Attempt');
      }
    }
    
    // XSS Detection
    if (this.threatDetection.enableXssDetection) {
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/i,
        /on\w+\s*=/i
      ];
      
      const queryString = JSON.stringify(request);
      if (xssPatterns.some(pattern => pattern.test(queryString))) {
        threats.push('XSS Attempt');
      }
    }
    
    // Brute Force Detection
    if (this.threatDetection.enableBruteForceProtection) {
      const threatKey = `threat_${context.ipAddress}`;
      let threatInfo = this.threatCache.get(threatKey);
      
      if (!threatInfo) {
        threatInfo = { threats: 0, lastThreat: 0 };
        this.threatCache.set(threatKey, threatInfo);
      }
      
      if (threats.length > 0) {
        threatInfo.threats++;
        threatInfo.lastThreat = Date.now();
        
        if (threatInfo.threats > this.threatDetection.suspiciousActivityThreshold) {
          threats.push('Brute Force Attack');
        }
      }
    }
    
    // Log threats
    if (threats.length > 0) {
      this.logSecurityEvent({
        id: this.generateEventId(),
        type: 'threat',
        severity: 'critical',
        message: `Security threats detected: ${threats.join(', ')}`,
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: context.timestamp,
        details: { threats, request }
      });
      
      throw new Error(`Security threat detected: ${threats.join(', ')}`);
    }
  }

  /**
   * Validate authentication
   */
  private async validateAuthentication(context: SecurityContext): Promise<void> {
    if (!context.sessionId || !context.userId) {
      throw new Error('Authentication required');
    }
    
    const session = this.sessionCache.get(context.sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }
    
    // Check session timeout
    if (Date.now() - session.timestamp > this.policy.sessionTimeout) {
      this.sessionCache.delete(context.sessionId);
      throw new Error('Session expired');
    }
  }

  /**
   * Validate authorization
   */
  private async validateAuthorization(context: SecurityContext, resource?: string): Promise<void> {
    if (!resource) return; // No specific resource to authorize
    
    // Simple role-based authorization
    const requiredPermissions = this.getRequiredPermissions(resource);
    
    const hasPermission = requiredPermissions.every(permission => 
      context.permissions.includes(permission) || 
      context.roles.some(role => this.getRolePermissions(role).includes(permission))
    );
    
    if (!hasPermission) {
      this.logSecurityEvent({
        id: this.generateEventId(),
        type: 'authorization',
        severity: 'medium',
        message: 'Authorization failed',
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: context.timestamp,
        details: { 
          resource, 
          requiredPermissions, 
          userPermissions: context.permissions,
          userRoles: context.roles
        }
      });
      
      throw new Error('Insufficient permissions');
    }
  }

  /**
   * Validate CSRF token
   */
  private async validateCsrf(context: SecurityContext): Promise<void> {
    if (!context.csrfToken) {
      throw new Error('CSRF token required');
    }
    
    // Simple CSRF validation (should be more sophisticated in production)
    const expectedToken = createHash('sha256')
      .update(`${context.sessionId}:${context.userId}:csrf_secret`)
      .digest('hex');
    
    if (context.csrfToken !== expectedToken) {
      throw new Error('Invalid CSRF token');
    }
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.auditLog.push(event);
    
    // Keep only last 10000 events
    if (this.auditLog.length > 10000) {
      this.auditLog.shift();
    }
    
    // Log to regular logger
    const logLevel = event.severity === 'critical' ? 'error' : 
                    event.severity === 'high' ? 'warn' : 'info';
    
    this.logger[logLevel](`Security Event: ${event.message}`, {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      details: event.details
    });
    
    // Emit event for external handlers
    this.emit('security:event', event);
  }

  /**
   * Cleanup expired sessions and caches
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    // Cleanup expired sessions
    for (const [sessionId, session] of this.sessionCache) {
      if (now - session.timestamp > this.policy.sessionTimeout) {
        this.sessionCache.delete(sessionId);
      }
    }
    
    // Cleanup old rate limit entries
    for (const [key, rateInfo] of this.rateLimitCache) {
      if (now - rateInfo.lastReset > 3600000) { // 1 hour
        this.rateLimitCache.delete(key);
      }
    }
    
    // Cleanup old threat entries
    for (const [key, threatInfo] of this.threatCache) {
      if (now - threatInfo.lastThreat > 86400000) { // 24 hours
        this.threatCache.delete(key);
      }
    }
  }

  /**
   * Helper methods
   */
  private generateEventId(): string {
    return `${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private getRequiredPermissions(resource: string): string[] {
    // Simple resource-to-permission mapping
    const resourcePermissions: Record<string, string[]> = {
      'ai.analyze': ['ai.read'],
      'ai.generate': ['ai.write'],
      'ai.admin': ['ai.admin'],
      'system.config': ['system.admin'],
      'user.profile': ['user.read'],
      'user.admin': ['user.admin']
    };
    
    return resourcePermissions[resource] || ['default.access'];
  }

  private getRolePermissions(role: string): string[] {
    // Simple role-to-permission mapping
    const rolePermissions: Record<string, string[]> = {
      'user': ['ai.read', 'user.read', 'default.access'],
      'premium': ['ai.read', 'ai.write', 'user.read', 'default.access'],
      'admin': ['ai.read', 'ai.write', 'ai.admin', 'user.read', 'user.admin', 'system.admin', 'default.access']
    };
    
    return rolePermissions[role] || [];
  }

  /**
   * Public API Methods
   */
  
  createSession(userId: string, roles: string[], permissions: string[]): string {
    const sessionId = randomBytes(32).toString('hex');
    
    this.sessionCache.set(sessionId, {
      userId,
      sessionId,
      roles,
      permissions,
      ipAddress: 'unknown',
      userAgent: 'unknown',
      timestamp: Date.now()
    });
    
    return sessionId;
  }

  destroySession(sessionId: string): void {
    this.sessionCache.delete(sessionId);
  }

  getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.auditLog.slice(-limit);
  }

  updatePolicy(policy: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    this.logger.info('Security policy updated', { policy: this.policy });
  }

  updateThreatDetection(threatDetection: Partial<ThreatDetection>): void {
    this.threatDetection = { ...this.threatDetection, ...threatDetection };
    this.logger.info('Threat detection updated', { threatDetection: this.threatDetection });
  }

  getSecurityMetrics(): Record<string, any> {
    return {
      activeSessions: this.sessionCache.size,
      rateLimitEntries: this.rateLimitCache.size,
      threatEntries: this.threatCache.size,
      auditLogSize: this.auditLog.length,
      policy: this.policy,
      threatDetection: this.threatDetection
    };
  }
}

// Singleton global security manager
export const globalSecurity = new SecurityManager();

// Export types
export type {
  SecurityContext,
  SecurityPolicy,
  ThreatDetection,
  SecurityEvent
};