import { EventEmitter } from 'events';

interface ErrorLog {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

interface HealthStatus {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  message?: string;
}

interface RecoveryAction {
  id: string;
  timestamp: number;
  type: 'restart' | 'reset' | 'cleanup' | 'custom';
  component: string;
  success: boolean;
  duration: number;
}

export class RecoveryManager extends EventEmitter {
  private active: boolean = false;
  private errorLogs: ErrorLog[] = [];
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private recoveryActions: RecoveryAction[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private registeredComponents: Map<string, any> = new Map();

  constructor() {
    super();
  }

  async activate(): Promise<void> {
    if (this.active) {
      console.log('🔄 Recovery Manager already active');
      return;
    }

    this.active = true;
    this.startHealthChecks();
    this.startCleanup();
    this.emit('activated');
    console.log('🔄 Recovery Manager activated - Auto-recovery enabled');
  }

  async shutdown(): Promise<void> {
    if (!this.active) return;

    this.active = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.emit('shutdown');
    console.log('🔄 Recovery Manager shutdown');
  }

  registerComponent(name: string, component: any): void {
    if (!this.active) return;

    this.registeredComponents.set(name, component);
    
    this.healthStatuses.set(name, {
      component: name,
      status: 'healthy',
      lastCheck: Date.now(),
      message: 'Component registered'
    });

    this.emit('component_registered', { name });
    console.log(`✅ Component registered: ${name}`);
  }

  logError(error: Omit<ErrorLog, 'id' | 'timestamp'>): void {
    if (!this.active) return;

    const errorLog: ErrorLog = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...error
    };

    this.errorLogs.push(errorLog);
    this.emit('error_logged', errorLog);

    if (errorLog.severity === 'critical') {
      this.emit('critical_error', errorLog);
      console.error(`🚨 CRITICAL ERROR [${errorLog.source}]: ${errorLog.message}`);
      this.attemptRecovery(errorLog.source);
    } else if (errorLog.severity === 'high') {
      console.error(`⚠️ HIGH ERROR [${errorLog.source}]: ${errorLog.message}`);
    } else {
      console.warn(`⚠️ ${errorLog.severity.toUpperCase()} ERROR [${errorLog.source}]: ${errorLog.message}`);
    }
  }

  updateHealthStatus(component: string, status: 'healthy' | 'degraded' | 'unhealthy', message?: string): void {
    if (!this.active) return;

    const healthStatus: HealthStatus = {
      component,
      status,
      lastCheck: Date.now(),
      message
    };

    this.healthStatuses.set(component, healthStatus);
    this.emit('health_updated', healthStatus);

    if (status === 'unhealthy') {
      console.error(`❌ Component unhealthy: ${component} - ${message || 'Unknown reason'}`);
      this.attemptRecovery(component);
    } else if (status === 'degraded') {
      console.warn(`⚠️ Component degraded: ${component} - ${message || 'Unknown reason'}`);
    }
  }

  private async attemptRecovery(component: string): Promise<void> {
    const startTime = Date.now();
    const actionId = `recovery-${startTime}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🔄 Attempting recovery for: ${component}`);
    this.emit('recovery_started', { component, actionId });

    try {
      const registeredComponent = this.registeredComponents.get(component);

      if (!registeredComponent) {
        throw new Error(`Component not registered: ${component}`);
      }

      if (typeof registeredComponent.activate === 'function') {
        await registeredComponent.activate();
      } else if (typeof registeredComponent.restart === 'function') {
        await registeredComponent.restart();
      } else {
        throw new Error(`Component ${component} has no recovery method`);
      }

      const duration = Date.now() - startTime;
      const action: RecoveryAction = {
        id: actionId,
        timestamp: startTime,
        type: 'restart',
        component,
        success: true,
        duration
      };

      this.recoveryActions.push(action);
      this.emit('recovery_completed', action);
      console.log(`✅ Recovery successful for ${component} (${duration}ms)`);

      this.updateHealthStatus(component, 'healthy', 'Recovered successfully');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const action: RecoveryAction = {
        id: actionId,
        timestamp: startTime,
        type: 'restart',
        component,
        success: false,
        duration
      };

      this.recoveryActions.push(action);
      this.emit('recovery_failed', { action, error: error.message });
      console.error(`❌ Recovery failed for ${component}: ${error.message}`);
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);
  }

  private async performHealthChecks(): Promise<void> {
    const now = Date.now();
    const staleThreshold = 60000;

    const checks = Array.from(this.registeredComponents.entries()).map(async ([name, component]) => {
      try {
        let statusUpdated = false;
        
        if (typeof component.getStatus === 'function') {
          const statusResult = component.getStatus();
          const status = statusResult instanceof Promise ? await statusResult : statusResult;
          
          if (status && typeof status === 'object') {
            if (status.active === false) {
              this.updateHealthStatus(name, 'unhealthy', 'Component inactive');
              statusUpdated = true;
            } else if (status.active === true) {
              this.updateHealthStatus(name, 'healthy', 'Component active');
              statusUpdated = true;
            }
          }
        }

        if (!statusUpdated) {
          const healthStatus = this.healthStatuses.get(name);
          if (healthStatus && now - healthStatus.lastCheck > staleThreshold) {
            this.updateHealthStatus(name, 'degraded', 'Health check overdue');
          }
        }
      } catch (error: any) {
        this.logError({
          severity: 'medium',
          source: name,
          message: `Health check failed: ${error.message}`,
          stack: error.stack
        });
      }
    });

    await Promise.all(checks);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 600000);
  }

  private cleanup(): void {
    const now = Date.now();
    const retentionPeriod = 86400000;

    this.errorLogs = this.errorLogs.filter(log => now - log.timestamp < retentionPeriod);
    this.recoveryActions = this.recoveryActions.filter(action => now - action.timestamp < retentionPeriod);

    console.log('🧹 Recovery Manager cleanup completed');
  }

  getStatus() {
    return {
      active: this.active,
      registeredComponents: this.registeredComponents.size,
      errorLogs: this.errorLogs.length,
      healthStatuses: this.healthStatuses.size,
      recoveryActions: this.recoveryActions.length
    };
  }

  getErrorLogs(severity?: 'low' | 'medium' | 'high' | 'critical', limit: number = 50): ErrorLog[] {
    let logs = this.errorLogs;
    
    if (severity) {
      logs = logs.filter(log => log.severity === severity);
    }

    return logs.slice(-limit).reverse();
  }

  getHealthStatuses(): HealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  getRecoveryActions(limit: number = 50): RecoveryAction[] {
    return this.recoveryActions.slice(-limit).reverse();
  }

  getAnalytics() {
    const now = Date.now();
    const last24Hours = now - 86400000;

    const recentErrors = this.errorLogs.filter(log => log.timestamp >= last24Hours);
    const recentRecoveries = this.recoveryActions.filter(action => action.timestamp >= last24Hours);

    const errorsBySeverity = {
      low: recentErrors.filter(e => e.severity === 'low').length,
      medium: recentErrors.filter(e => e.severity === 'medium').length,
      high: recentErrors.filter(e => e.severity === 'high').length,
      critical: recentErrors.filter(e => e.severity === 'critical').length
    };

    const recoverySuccessRate = recentRecoveries.length > 0
      ? (recentRecoveries.filter(r => r.success).length / recentRecoveries.length) * 100
      : 100;

    const healthyComponents = Array.from(this.healthStatuses.values()).filter(h => h.status === 'healthy').length;
    const degradedComponents = Array.from(this.healthStatuses.values()).filter(h => h.status === 'degraded').length;
    const unhealthyComponents = Array.from(this.healthStatuses.values()).filter(h => h.status === 'unhealthy').length;

    return {
      timeWindow: '24h',
      totalErrors: recentErrors.length,
      errorsBySeverity,
      totalRecoveries: recentRecoveries.length,
      successfulRecoveries: recentRecoveries.filter(r => r.success).length,
      failedRecoveries: recentRecoveries.filter(r => !r.success).length,
      recoverySuccessRate: Math.round(recoverySuccessRate),
      components: {
        total: this.healthStatuses.size,
        healthy: healthyComponents,
        degraded: degradedComponents,
        unhealthy: unhealthyComponents
      }
    };
  }
}

export const recoveryManager = new RecoveryManager();
