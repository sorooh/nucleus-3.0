/**
 * Nucleus 3.0 - Advanced Error Management System
 * 
 * نظام إدارة الأخطاء المتقدم مع تسلسل هرمي كامل
 * يدعم Error Recovery, Circuit Breakers, و Contextual Information
 */

export interface ErrorContext {
  operation?: string;
  platformId?: string;
  userId?: string;
  requestId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

/**
 * Base Error Class
 * جميع أخطاء Nucleus ترث من هذا الكلاس
 */
export abstract class NucleusError extends Error {
  abstract code: string;
  abstract statusCode: number;
  public context?: ErrorContext;
  public timestamp: string;
  public isOperational: boolean = true;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Operational Errors - أخطاء تشغيلية متوقعة
 */
export class OperationalError extends NucleusError {
  code = 'OPERATIONAL_ERROR';
  statusCode = 500;
}

/**
 * AI Provider Errors - أخطاء مقدمي خدمات الذكاء الاصطناعي
 */
export class AIProviderError extends NucleusError {
  code = 'AI_PROVIDER_ERROR';
  statusCode = 502;
  public provider?: string;

  constructor(message: string, provider?: string, context?: ErrorContext) {
    super(message, context);
    this.provider = provider;
  }
}

/**
 * Validation Errors - أخطاء التحقق من البيانات
 */
export class ValidationError extends NucleusError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  public validationErrors?: Record<string, string[]>;

  constructor(message: string, validationErrors?: Record<string, string[]>, context?: ErrorContext) {
    super(message, context);
    this.validationErrors = validationErrors;
  }
}

/**
 * Rate Limit Errors - أخطاء تجاوز الحد المسموح
 */
export class RateLimitError extends NucleusError {
  code = 'RATE_LIMIT_ERROR';
  statusCode = 429;
  public retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: ErrorContext) {
    super(message, context);
    this.retryAfter = retryAfter;
  }
}

/**
 * Authentication Errors - أخطاء المصادقة
 */
export class AuthenticationError extends NucleusError {
  code = 'AUTHENTICATION_ERROR';
  statusCode = 401;
}

/**
 * Authorization Errors - أخطاء الصلاحيات
 */
export class AuthorizationError extends NucleusError {
  code = 'AUTHORIZATION_ERROR';
  statusCode = 403;
  public requiredPermissions?: string[];

  constructor(message: string, requiredPermissions?: string[], context?: ErrorContext) {
    super(message, context);
    this.requiredPermissions = requiredPermissions;
  }
}

/**
 * Not Found Errors - أخطاء عدم وجود المورد
 */
export class NotFoundError extends NucleusError {
  code = 'NOT_FOUND_ERROR';
  statusCode = 404;
  public resourceType?: string;
  public resourceId?: string;

  constructor(message: string, resourceType?: string, resourceId?: string, context?: ErrorContext) {
    super(message, context);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Database Errors - أخطاء قاعدة البيانات
 */
export class DatabaseError extends NucleusError {
  code = 'DATABASE_ERROR';
  statusCode = 500;
  public query?: string;

  constructor(message: string, query?: string, context?: ErrorContext) {
    super(message, context);
    this.query = query;
  }
}

/**
 * Redis Errors - أخطاء Redis
 */
export class RedisError extends NucleusError {
  code = 'REDIS_ERROR';
  statusCode = 500;
  public command?: string;

  constructor(message: string, command?: string, context?: ErrorContext) {
    super(message, context);
    this.command = command;
  }
}

/**
 * Memory System Errors - أخطاء نظام الذاكرة
 */
export class MemorySystemError extends NucleusError {
  code = 'MEMORY_SYSTEM_ERROR';
  statusCode = 500;
}

/**
 * Intelligence System Errors - أخطاء نظام الذكاء
 */
export class IntelligenceSystemError extends NucleusError {
  code = 'INTELLIGENCE_SYSTEM_ERROR';
  statusCode = 500;
  public component?: string;

  constructor(message: string, component?: string, context?: ErrorContext) {
    super(message, context);
    this.component = component;
  }
}

/**
 * Timeout Errors - أخطاء انتهاء الوقت
 */
export class TimeoutError extends NucleusError {
  code = 'TIMEOUT_ERROR';
  statusCode = 504;
  public timeoutMs?: number;

  constructor(message: string, timeoutMs?: number, context?: ErrorContext) {
    super(message, context);
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Circuit Breaker Open Error - خطأ Circuit Breaker مفتوح
 */
export class CircuitBreakerOpenError extends NucleusError {
  code = 'CIRCUIT_BREAKER_OPEN';
  statusCode = 503;
  public circuitName?: string;

  constructor(message: string, circuitName?: string, context?: ErrorContext) {
    super(message, context);
    this.circuitName = circuitName;
  }
}

/**
 * Configuration Errors - أخطاء الإعدادات
 */
export class ConfigurationError extends NucleusError {
  code = 'CONFIGURATION_ERROR';
  statusCode = 500;
  public configKey?: string;
  isOperational = false; // Not recoverable

  constructor(message: string, configKey?: string, context?: ErrorContext) {
    super(message, context);
    this.configKey = configKey;
  }
}

/**
 * External Service Errors - أخطاء الخدمات الخارجية
 */
export class ExternalServiceError extends NucleusError {
  code = 'EXTERNAL_SERVICE_ERROR';
  statusCode = 502;
  public service?: string;

  constructor(message: string, service?: string, context?: ErrorContext) {
    super(message, context);
    this.service = service;
  }
}

/**
 * Helper function to check if error is operational
 */
export function isOperationalError(error: any): boolean {
  if (error instanceof NucleusError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper function to wrap unknown errors
 */
export function wrapError(error: any, operation?: string): NucleusError {
  // Already a NucleusError
  if (error instanceof NucleusError) {
    return error;
  }

  // Wrap generic errors
  const message = error.message || 'Unknown error occurred';
  const context: ErrorContext = {
    operation,
    originalError: error.toString(),
    originalStack: error.stack,
  };

  // Try to classify based on message
  if (message.includes('rate limit')) {
    return new RateLimitError(message, undefined, context);
  }

  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return new TimeoutError(message, undefined, context);
  }

  if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    return new ExternalServiceError(message, operation, context);
  }

  if (message.includes('database') || message.includes('query')) {
    return new DatabaseError(message, undefined, context);
  }

  if (message.includes('redis')) {
    return new RedisError(message, undefined, context);
  }

  if (message.includes('not found') || error.statusCode === 404) {
    return new NotFoundError(message, undefined, undefined, context);
  }

  if (message.includes('unauthorized') || error.statusCode === 401) {
    return new AuthenticationError(message, context);
  }

  if (message.includes('forbidden') || error.statusCode === 403) {
    return new AuthorizationError(message, undefined, context);
  }

  // Default to operational error
  return new OperationalError(message, context);
}

/**
 * Error formatter for API responses
 */
export function formatErrorResponse(error: NucleusError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      ...(error.context && { context: error.context }),
    },
  };
}
