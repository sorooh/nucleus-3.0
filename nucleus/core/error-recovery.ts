/**
 * Nucleus 3.0 - Error Recovery System with Circuit Breaker
 * 
 * نظام التعافي التلقائي من الأخطاء مع Circuit Breaker Pattern
 * يضمن استقرار النظام حتى عند فشل المكونات الفردية
 */

import { EventEmitter } from 'events';
import {
  NucleusError,
  OperationalError,
  CircuitBreakerOpenError,
  TimeoutError,
  wrapError,
  type ErrorContext,
} from '../../shared/errors';

/**
 * Circuit Breaker States
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

/**
 * Circuit Breaker Configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes to close from half-open
  timeout: number;               // Time in ms before trying half-open
  resetTimeout?: number;         // Time to reset failure count
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(
    public name: string,
    private config: CircuitBreakerConfig,
    private emitter: EventEmitter
  ) {}

  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if enough time has passed to try half-open
      if (this.nextAttemptTime && Date.now() >= this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        this.emitter.emit('circuit-half-open', { circuit: this.name });
        return true;
      }
      return false;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.emitter.emit('circuit-closed', { circuit: this.name });
      }
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
      return;
    }

    if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.open();
      }
    }
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.emitter.emit('circuit-opened', {
      circuit: this.name,
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime,
    });
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.emitter.emit('circuit-reset', { circuit: this.name });
  }
}

/**
 * Retry Strategy Configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Error Recovery System
 */
export class ErrorRecoverySystem extends EventEmitter {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorCounts = new Map<string, number>();
  private lastErrors = new Map<string, Error>();

  // Default configurations
  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    resetTimeout: 300000, // 5 minutes
  };

  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT_ERROR', 'EXTERNAL_SERVICE_ERROR', 'AI_PROVIDER_ERROR'],
  };

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.on('circuit-opened', (data) => {
      console.error(`[ErrorRecovery] Circuit breaker opened: ${data.circuit}`);
    });

    this.on('circuit-closed', (data) => {
      console.log(`[ErrorRecovery] Circuit breaker closed: ${data.circuit}`);
    });

    this.on('circuit-half-open', (data) => {
      console.log(`[ErrorRecovery] Circuit breaker half-open: ${data.circuit}`);
    });

    this.on('recovery-failed', (data) => {
      console.error(`[ErrorRecovery] Recovery failed for ${data.operation}:`, data.error);
    });

    this.on('recovery-success', (data) => {
      console.log(`[ErrorRecovery] Recovery succeeded for ${data.operation} using fallback`);
    });
  }

  /**
   * Get or create circuit breaker
   */
  private getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const fullConfig = { ...this.defaultCircuitConfig, ...config };
      this.circuitBreakers.set(name, new CircuitBreaker(name, fullConfig, this));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Execute task with error recovery and circuit breaker
   */
  async executeWithRecovery<T>(
    operation: string,
    task: () => Promise<T>,
    options?: {
      fallback?: () => Promise<T>;
      circuitConfig?: Partial<CircuitBreakerConfig>;
      retryConfig?: Partial<RetryConfig>;
      timeout?: number;
    }
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(operation, options?.circuitConfig);

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker open for ${operation}`,
        operation,
        { nextAttemptTime: circuitBreaker.getStats().nextAttemptTime }
      );
    }

    try {
      // Execute with timeout if specified
      const result = options?.timeout
        ? await this.executeWithTimeout(task, options.timeout, operation)
        : await task();

      circuitBreaker.recordSuccess();
      this.errorCounts.delete(operation);
      return result;
    } catch (error) {
      circuitBreaker.recordFailure();
      this.recordError(operation, error);

      // Try fallback if available
      if (options?.fallback) {
        try {
          const fallbackResult = await options.fallback();
          this.emit('recovery-success', { operation });
          return fallbackResult;
        } catch (fallbackError) {
          this.emit('recovery-failed', { operation, error, fallbackError });
          throw this.wrapAndThrow(error, operation);
        }
      }

      // Try retry if configured
      if (options?.retryConfig) {
        return this.executeWithRetry(task, operation, options.retryConfig);
      }

      throw this.wrapAndThrow(error, operation);
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    task: () => Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    return Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(`Operation timed out: ${operation}`, timeoutMs, { operation }));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    task: () => Promise<T>,
    operation: string,
    config: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: any;
    let delay = retryConfig.initialDelay;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await task();
        if (attempt > 1) {
          console.log(`[ErrorRecovery] Retry succeeded for ${operation} on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        const wrappedError = wrapError(error, operation);

        // Check if error is retryable
        const isRetryable =
          retryConfig.retryableErrors?.includes(wrappedError.code) ||
          wrappedError instanceof TimeoutError;

        if (!isRetryable || attempt === retryConfig.maxAttempts) {
          throw wrappedError;
        }

        console.warn(
          `[ErrorRecovery] Attempt ${attempt}/${retryConfig.maxAttempts} failed for ${operation}, retrying in ${delay}ms`
        );

        await this.sleep(delay);
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
      }
    }

    throw wrapError(lastError, operation);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Record error for monitoring
   */
  private recordError(operation: string, error: any): void {
    const count = (this.errorCounts.get(operation) || 0) + 1;
    this.errorCounts.set(operation, count);
    this.lastErrors.set(operation, error);

    this.emit('error-recorded', {
      operation,
      error: wrapError(error, operation),
      count,
      timestamp: Date.now(),
    });
  }

  /**
   * Wrap and throw error
   */
  private wrapAndThrow(error: any, operation: string): never {
    const wrappedError = wrapError(error, operation);
    throw wrappedError;
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitStats(name?: string) {
    if (name) {
      const circuit = this.circuitBreakers.get(name);
      return circuit ? circuit.getStats() : null;
    }

    const stats: any = {};
    for (const [name, circuit] of this.circuitBreakers) {
      stats[name] = circuit.getStats();
    }
    return stats;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      lastErrors: Object.fromEntries(
        Array.from(this.lastErrors.entries()).map(([op, err]) => [
          op,
          {
            message: err.message,
            name: err.name,
            timestamp: (err as any).timestamp,
          },
        ])
      ),
      circuitBreakers: this.getCircuitStats(),
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(name: string): void {
    const circuit = this.circuitBreakers.get(name);
    if (circuit) {
      circuit.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuits(): void {
    for (const circuit of this.circuitBreakers.values()) {
      circuit.reset();
    }
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

// Singleton instance
let errorRecoveryInstance: ErrorRecoverySystem | null = null;

export function getErrorRecovery(): ErrorRecoverySystem {
  if (!errorRecoveryInstance) {
    errorRecoveryInstance = new ErrorRecoverySystem();
  }
  return errorRecoveryInstance;
}
