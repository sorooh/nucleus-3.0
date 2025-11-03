/**
 * 📊 Professional Logger - Enterprise Logging System
 * 
 * Advanced logging with structured output, multiple levels,
 * correlation tracking, and performance monitoring
 * 
 * @version 3.1.0-Professional
 * @author Nucleus Team
 * @enterprise-grade
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

// Log Levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log Entry Interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, any>;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  performanceData?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Logger Configuration
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  maxFileSize: number;
  maxFiles: number;
  remoteEndpoint?: string;
  includeStack: boolean;
  includePerformance: boolean;
}

/**
 * Professional Logger with Enterprise Features
 */
export class Logger extends EventEmitter {
  private component: string;
  private config: LoggerConfig;
  private logBuffer: LogEntry[];
  private correlationId?: string;
  private sessionId?: string;
  private userId?: string;
  
  private static readonly DEFAULT_CONFIG: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableFile: false,
    enableRemote: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    includeStack: true,
    includePerformance: true
  };

  constructor(component: string, config?: Partial<LoggerConfig>) {
    super();
    this.component = component;
    this.config = { ...Logger.DEFAULT_CONFIG, ...config };
    this.logBuffer = [];
    
    // Auto-flush buffer every 5 seconds
    setInterval(() => this.flushBuffer(), 5000);
  }

  /**
   * Set correlation context for request tracking
   */
  setContext(correlationId?: string, sessionId?: string, userId?: string): void {
    this.correlationId = correlationId;
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Error level logging
   */
  error(message: string, data?: Record<string, any>, error?: Error): void {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: this.config.includeStack ? error.stack : undefined
    } : undefined;
    
    this.log(LogLevel.ERROR, message, data, errorData);
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, data?: Record<string, any>, error?: Error): void {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: this.config.includeStack ? error.stack : undefined
    } : undefined;
    
    this.log(LogLevel.FATAL, message, data, errorData);
  }

  /**
   * Performance timing helper
   */
  time(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.info(`Performance: ${label}`, {
        duration: Math.round(duration * 100) / 100,
        label
      });
    };
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel, 
    message: string, 
    data?: Record<string, any>, 
    error?: { name: string; message: string; stack?: string }
  ): void {
    // Check if log level is enabled
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data,
      correlationId: this.correlationId,
      userId: this.userId,
      sessionId: this.sessionId,
      error
    };

    // Add performance data if enabled
    if (this.config.includePerformance) {
      entry.performanceData = {
        memory: process.memoryUsage().heapUsed,
        cpu: process.cpuUsage().user
      };
    }

    // Add to buffer
    this.logBuffer.push(entry);

    // Output to console if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Emit event for external handlers
    this.emit('log', entry);

    // Auto-flush for high priority logs
    if (level >= LogLevel.ERROR) {
      this.flushBuffer();
    }
  }

  /**
   * Output log entry to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelColors = ['\x1b[36m', '\x1b[32m', '\x1b[33m', '\x1b[31m', '\x1b[35m'];
    const resetColor = '\x1b[0m';
    
    const color = levelColors[entry.level] || '';
    const level = levelNames[entry.level] || 'UNKNOWN';
    
    let output = `${color}[${entry.timestamp}] ${level} [${entry.component}]${resetColor} ${entry.message}`;
    
    if (entry.correlationId) {
      output += ` (${entry.correlationId})`;
    }
    
    console.log(output);
    
    if (entry.data && Object.keys(entry.data).length > 0) {
      console.log('  Data:', JSON.stringify(entry.data, null, 2));
    }
    
    if (entry.error) {
      console.log(`  Error: ${entry.error.name}: ${entry.error.message}`);
      if (entry.error.stack) {
        console.log('  Stack:', entry.error.stack);
      }
    }
    
    if (entry.performanceData) {
      console.log('  Performance:', {
        memory: `${Math.round(entry.performanceData.memory / 1024 / 1024 * 100) / 100}MB`,
        cpu: entry.performanceData.cpu
      });
    }
  }

  /**
   * Flush buffered logs
   */
  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // Emit batch for external processing
    this.emit('flush', logsToFlush);
  }

  /**
   * Get current buffer contents
   */
  getBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create child logger with additional context
   */
  child(additionalComponent: string): Logger {
    const childLogger = new Logger(
      `${this.component}:${additionalComponent}`,
      this.config
    );
    
    childLogger.setContext(this.correlationId, this.sessionId, this.userId);
    
    return childLogger;
  }
}

// Singleton global logger
export const globalLogger = new Logger('Nucleus');

// Helper functions
export function createLogger(component: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(component, config);
}

export function getLogLevelName(level: LogLevel): string {
  const names = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  return names[level] || 'UNKNOWN';
}