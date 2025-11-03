/**
 * ⚡ Professional Circuit Breaker - Enterprise Fault Tolerance
 * 
 * Advanced circuit breaker with configurable thresholds,
 * exponential backoff, health checks, and auto-recovery
 * 
 * @version 3.1.0-Professional
 * @author Nucleus Team
 * @enterprise-grade
 */

import { EventEmitter } from 'events';
import { Logger } from './logger';

// Circuit Breaker States
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

// Circuit Breaker Configuration
export interface CircuitBreakerConfig {
  threshold: number; // Number of failures before opening
  timeout: number; // Time in ms to wait before trying again
  resetTimeout: number; // Time in ms to wait before going to half-open
  monitoringPeriod: number; // Time window for monitoring failures
  volumeThreshold: number; // Minimum number of requests in monitoring period
  errorThresholdPercentage: number; // Percentage of errors that triggers opening
  maxRetries: number; // Maximum number of retries in half-open state
  exponentialBackoff: boolean; // Enable exponential backoff
  enableHealthCheck: boolean; // Enable periodic health checks
  healthCheckInterval: number; // Health check interval in ms
}

// Execution Result
export interface CircuitBreakerResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  state: CircuitBreakerState;
  executionTime: number;
  attempt: number;
}

// Statistics
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  errorRate: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  timeInCurrentState: number;
  stateChangeCount: number;
}

/**
 * Professional Circuit Breaker with Enterprise Features
 */
export class CircuitBreaker extends EventEmitter {
  private logger: Logger;
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private failureCount: number;
  private successCount: number;
  private totalRequests: number;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private stateChangeTime: number;
  private stateChangeCount: number;
  private nextAttemptTime: number;
  private halfOpenRetries: number;
  private healthCheckTimer?: NodeJS.Timeout;
  
  private static readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    threshold: 5,
    timeout: 30000, // 30 seconds
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 60000, // 1 minute
    volumeThreshold: 10,
    errorThresholdPercentage: 50,
    maxRetries: 3,
    exponentialBackoff: true,
    enableHealthCheck: false,
    healthCheckInterval: 30000 // 30 seconds
  };

  constructor(config?: Partial<CircuitBreakerConfig>, name: string = 'CircuitBreaker') {
    super();
    this.logger = new Logger(`CircuitBreaker:${name}`);
    this.config = { ...CircuitBreaker.DEFAULT_CONFIG, ...config };
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.stateChangeTime = Date.now();
    this.stateChangeCount = 0;
    this.nextAttemptTime = 0;
    this.halfOpenRetries = 0;
    
    this.startHealthCheck();
    
    this.logger.info('Circuit Breaker initialized', {
      config: this.config,
      state: this.state
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.totalRequests++;
    
    // Check if circuit breaker allows execution
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker is ${this.state} - execution not allowed`);
      this.emit('execution:blocked', {
        state: this.state,
        nextAttemptTime: this.nextAttemptTime,
        error
      });
      throw error;
    }
    
    let attempt = 1;
    
    try {
      // Execute the function
      const result = await fn();
      
      // Record success
      this.onSuccess();
      
      const executionTime = Date.now() - startTime;
      const executionResult: CircuitBreakerResult<T> = {
        success: true,
        result,
        state: this.state,
        executionTime,
        attempt
      };
      
      this.emit('execution:success', executionResult);
      
      return result;
      
    } catch (error) {
      // Record failure
      this.onFailure(error as Error);
      
      const executionTime = Date.now() - startTime;
      const executionResult: CircuitBreakerResult<T> = {
        success: false,
        error: error as Error,
        state: this.state,
        executionTime,
        attempt
      };
      
      this.emit('execution:failure', executionResult);
      
      throw error;
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>, 
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || this.config.maxRetries;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await this.execute(fn);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= retries) {
          const delay = this.config.exponentialBackoff 
            ? Math.min(1000 * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
            : 1000;
          
          this.logger.debug(`Retry attempt ${attempt} after ${delay}ms`, {
            error: lastError.message,
            attempt,
            maxRetries: retries
          });
          
          await this.delay(delay);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Check if execution is allowed
   */
  private canExecute(): boolean {
    const now = Date.now();
    
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;
        
      case CircuitBreakerState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;
        
      case CircuitBreakerState.HALF_OPEN:
        return this.halfOpenRetries < this.config.maxRetries;
        
      default:
        return false;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenRetries++;
      
      // If we've had enough successful retries, close the circuit
      if (this.halfOpenRetries >= this.config.maxRetries) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success when closed
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    this.logger.warn('Circuit breaker recorded failure', {
      error: error.message,
      failureCount: this.failureCount,
      state: this.state
    });
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state should open the circuit
      this.transitionToOpen();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Check if circuit should open
   */
  private shouldOpen(): boolean {
    // Simple threshold-based opening
    if (this.failureCount >= this.config.threshold) {
      return true;
    }
    
    // Percentage-based opening (if we have enough volume)
    if (this.totalRequests >= this.config.volumeThreshold) {
      const errorRate = (this.failureCount / this.totalRequests) * 100;
      return errorRate >= this.config.errorThresholdPercentage;
    }
    
    return false;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    if (this.state === CircuitBreakerState.OPEN) return;
    
    const previousState = this.state;
    this.state = CircuitBreakerState.OPEN;
    this.stateChangeTime = Date.now();
    this.stateChangeCount++;
    this.nextAttemptTime = this.stateChangeTime + this.config.resetTimeout;
    this.halfOpenRetries = 0;
    
    this.logger.warn('Circuit breaker opened', {
      previousState,
      failureCount: this.failureCount,
      totalRequests: this.totalRequests,
      nextAttemptTime: new Date(this.nextAttemptTime).toISOString()
    });
    
    this.emit('state:open', {
      previousState,
      failureCount: this.failureCount,
      nextAttemptTime: this.nextAttemptTime
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) return;
    
    const previousState = this.state;
    this.state = CircuitBreakerState.HALF_OPEN;
    this.stateChangeTime = Date.now();
    this.stateChangeCount++;
    this.halfOpenRetries = 0;
    
    this.logger.info('Circuit breaker half-opened', {
      previousState,
      maxRetries: this.config.maxRetries
    });
    
    this.emit('state:half-open', {
      previousState,
      maxRetries: this.config.maxRetries
    });
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    if (this.state === CircuitBreakerState.CLOSED) return;
    
    const previousState = this.state;
    this.state = CircuitBreakerState.CLOSED;
    this.stateChangeTime = Date.now();
    this.stateChangeCount++;
    this.failureCount = 0;
    this.halfOpenRetries = 0;
    
    this.logger.info('Circuit breaker closed', {
      previousState,
      successCount: this.successCount
    });
    
    this.emit('state:closed', {
      previousState,
      successCount: this.successCount
    });
  }

  /**
   * Start health check if enabled
   */
  private startHealthCheck(): void {
    if (!this.config.enableHealthCheck) return;
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (this.state !== CircuitBreakerState.OPEN) return;
    
    const now = Date.now();
    
    // Check if it's time to try half-open
    if (now >= this.nextAttemptTime) {
      this.logger.debug('Health check: attempting to transition to half-open');
      this.transitionToHalfOpen();
    }
  }

  /**
   * Stop health check
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public API Methods
   */

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  /**
   * Check if circuit breaker is closed
   */
  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  /**
   * Check if circuit breaker is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const now = Date.now();
    const errorRate = this.totalRequests > 0 
      ? (this.failureCount / this.totalRequests) * 100 
      : 0;
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      errorRate,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      timeInCurrentState: now - this.stateChangeTime,
      stateChangeCount: this.stateChangeCount
    };
  }

  /**
   * Reset circuit breaker statistics
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.stateChangeCount = 0;
    this.halfOpenRetries = 0;
    this.transitionToClosed();
    
    this.logger.info('Circuit breaker reset');
    this.emit('reset');
  }

  /**
   * Force circuit breaker to open
   */
  forceOpen(): void {
    this.transitionToOpen();
    this.logger.warn('Circuit breaker forced open');
    this.emit('forced:open');
  }

  /**
   * Force circuit breaker to close
   */
  forceClose(): void {
    this.transitionToClosed();
    this.logger.info('Circuit breaker forced closed');
    this.emit('forced:closed');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
    
    this.logger.info('Circuit breaker configuration updated', { config: this.config });
    this.emit('config:updated', this.config);
    
    // Restart health check if settings changed
    if (config.enableHealthCheck !== undefined || config.healthCheckInterval !== undefined) {
      this.stopHealthCheck();
      this.startHealthCheck();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthCheck();
    this.removeAllListeners();
    
    this.logger.info('Circuit breaker destroyed');
  }
}

// Export types
export type {
  CircuitBreakerConfig,
  CircuitBreakerResult,
  CircuitBreakerStats
};