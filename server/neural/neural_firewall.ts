/**
 * Neural Firewall - Phase 10.0
 * جدار الحماية العصبي
 * 
 * يحمي الشبكة العصبية من:
 * - الإشارات المشبوهة
 * - هجمات Replay
 * - حمل زائد (DDoS)
 * - البيانات الضارة
 * 
 * يعمل مع AI Self-Defense للكشف التلقائي عن الأنماط المشبوهة
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { neuralNodes } from '@shared/schema';
import { eq } from 'drizzle-orm';

// ============= TYPES =============

export interface FirewallRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'block' | 'allow' | 'throttle' | 'inspect';
  condition: (signal: NeuralSignal) => boolean;
  action: (signal: NeuralSignal) => FirewallAction;
  priority: number;
  enabled: boolean;
}

export interface NeuralSignal {
  signalId: string;
  sourceNode: string;
  targetNode: string;
  signalType: string;
  payload: any;
  timestamp: number;
  signature?: string;
}

export interface FirewallAction {
  decision: 'allow' | 'block' | 'throttle' | 'inspect';
  reason: string;
  ruleId?: string;
}

export interface ThreatDetection {
  threatId: string;
  sourceNode: string;
  threatType: 'replay-attack' | 'ddos' | 'malformed-data' | 'unauthorized' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details: any;
}

// ============= NEURAL FIREWALL =============

export class NeuralFirewall extends EventEmitter {
  private rules: Map<string, FirewallRule> = new Map();
  private signalHistory: Map<string, number[]> = new Map(); // node -> timestamps
  private blockedNodes: Set<string> = new Set();
  private threatLog: ThreatDetection[] = [];
  
  // Rate limiting config
  private readonly MAX_SIGNALS_PER_MINUTE = 100;
  private readonly MAX_SIGNALS_PER_HOUR = 1000;
  private readonly ANOMALY_THRESHOLD = 0.8;

  constructor() {
    super();
    this.initializeDefaultRules();
    this.startThreatMonitoring();
  }

  /**
   * فحص إشارة واردة
   */
  async inspectSignal(signal: NeuralSignal): Promise<FirewallAction> {
    try {
      // 1. التحقق من Node محظورة
      if (this.blockedNodes.has(signal.sourceNode)) {
        return this.blockSignal(signal, 'Source node is blocked');
      }

      // 2. التحقق من Rate Limiting
      const rateLimitAction = this.checkRateLimit(signal);
      if (rateLimitAction.decision === 'block') {
        return rateLimitAction;
      }

      // 3. تطبيق القواعد بالترتيب (حسب Priority)
      const sortedRules = Array.from(this.rules.values())
        .filter(r => r.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        if (rule.condition(signal)) {
          const action = rule.action(signal);
          
          if (action.decision === 'block') {
            this.logThreat({
              threatId: `threat-${Date.now()}`,
              sourceNode: signal.sourceNode,
              threatType: 'unauthorized',
              severity: 'medium',
              timestamp: Date.now(),
              details: { signal, rule: rule.ruleName }
            });
            
            // Update node statistics
            await this.incrementSuspiciousActivity(signal.sourceNode);
          }

          return action;
        }
      }

      // 4. AI Anomaly Detection
      const anomalyScore = await this.detectAnomaly(signal);
      if (anomalyScore > this.ANOMALY_THRESHOLD) {
        this.logThreat({
          threatId: `threat-${Date.now()}`,
          sourceNode: signal.sourceNode,
          threatType: 'anomaly',
          severity: anomalyScore > 0.95 ? 'critical' : 'high',
          timestamp: Date.now(),
          details: { signal, anomalyScore }
        });

        return {
          decision: 'inspect',
          reason: `Anomaly detected (score: ${anomalyScore.toFixed(2)})`,
          ruleId: 'ai-anomaly-detector'
        };
      }

      // 5. السماح بالإشارة
      this.recordSignal(signal);
      return {
        decision: 'allow',
        reason: 'Signal passed all firewall checks'
      };

    } catch (error: any) {
      console.error('[Firewall] ❌ Inspection failed:', error.message);
      return {
        decision: 'block',
        reason: `Inspection error: ${error.message}`
      };
    }
  }

  /**
   * إضافة قاعدة جديدة
   */
  addRule(rule: FirewallRule): void {
    this.rules.set(rule.ruleId, rule);
    console.log(`[Firewall] ✅ Rule added: ${rule.ruleName} (priority: ${rule.priority})`);
    this.emit('rule:added', { rule });
  }

  /**
   * حذف قاعدة
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      console.log(`[Firewall] 🗑️  Rule removed: ${ruleId}`);
      this.emit('rule:removed', { ruleId });
    }
    return deleted;
  }

  /**
   * حظر نواة
   */
  async blockNode(nodeName: string, reason: string): Promise<void> {
    this.blockedNodes.add(nodeName);
    
    // تحديث في Database
    await db.update(neuralNodes)
      .set({
        connectionStatus: 'error',
        firewallEnabled: 1,
        blockedSignals: 0
      })
      .where(eq(neuralNodes.nodeName, nodeName));

    console.log(`[Firewall] 🚫 Node blocked: ${nodeName} (reason: ${reason})`);
    this.emit('node:blocked', { nodeName, reason });
  }

  /**
   * إلغاء حظر نواة
   */
  async unblockNode(nodeName: string): Promise<void> {
    this.blockedNodes.delete(nodeName);
    
    // تحديث في Database
    await db.update(neuralNodes)
      .set({
        connectionStatus: 'disconnected'
      })
      .where(eq(neuralNodes.nodeName, nodeName));

    console.log(`[Firewall] ✅ Node unblocked: ${nodeName}`);
    this.emit('node:unblocked', { nodeName });
  }

  /**
   * الحصول على سجل التهديدات
   */
  getThreatLog(limit: number = 100): ThreatDetection[] {
    return this.threatLog.slice(-limit);
  }

  /**
   * الحصول على إحصائيات Firewall
   */
  getFirewallStats(): any {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    let signalsLastMinute = 0;
    let signalsLastHour = 0;

    this.signalHistory.forEach(timestamps => {
      signalsLastMinute += timestamps.filter(t => t > oneMinuteAgo).length;
      signalsLastHour += timestamps.filter(t => t > oneHourAgo).length;
    });

    return {
      activeRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalRules: this.rules.size,
      blockedNodes: this.blockedNodes.size,
      threats: {
        total: this.threatLog.length,
        critical: this.threatLog.filter(t => t.severity === 'critical').length,
        high: this.threatLog.filter(t => t.severity === 'high').length,
        medium: this.threatLog.filter(t => t.severity === 'medium').length,
        low: this.threatLog.filter(t => t.severity === 'low').length
      },
      signalRate: {
        lastMinute: signalsLastMinute,
        lastHour: signalsLastHour
      }
    };
  }

  // ============= HELPER METHODS =============

  private initializeDefaultRules(): void {
    // Rule 1: Block malformed signatures
    this.addRule({
      ruleId: 'rule-malformed-signature',
      ruleName: 'Block Malformed Signatures',
      ruleType: 'block',
      priority: 100,
      enabled: true,
      condition: (signal) => {
        return !!(signal.signature && signal.signature.length < 10);
      },
      action: (signal) => ({
        decision: 'block',
        reason: 'Malformed signature detected',
        ruleId: 'rule-malformed-signature'
      })
    });

    // Rule 2: Throttle high-frequency signals
    this.addRule({
      ruleId: 'rule-throttle-high-freq',
      ruleName: 'Throttle High Frequency Signals',
      ruleType: 'throttle',
      priority: 90,
      enabled: true,
      condition: (signal) => {
        const history = this.signalHistory.get(signal.sourceNode) || [];
        const oneSecondAgo = Date.now() - 1000;
        const recentSignals = history.filter(t => t > oneSecondAgo).length;
        return recentSignals > 10; // > 10 signals per second
      },
      action: (signal) => ({
        decision: 'throttle',
        reason: 'Too many signals per second',
        ruleId: 'rule-throttle-high-freq'
      })
    });

    // Rule 3: Inspect large payloads
    this.addRule({
      ruleId: 'rule-inspect-large-payload',
      ruleName: 'Inspect Large Payloads',
      ruleType: 'inspect',
      priority: 80,
      enabled: true,
      condition: (signal) => {
        const size = JSON.stringify(signal.payload).length;
        return size > 100000; // > 100KB
      },
      action: (signal) => ({
        decision: 'inspect',
        reason: 'Large payload requires inspection',
        ruleId: 'rule-inspect-large-payload'
      })
    });

    console.log('[Firewall] ✅ Default rules initialized');
  }

  private checkRateLimit(signal: NeuralSignal): FirewallAction {
    const history = this.signalHistory.get(signal.sourceNode) || [];
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const signalsLastMinute = history.filter(t => t > oneMinuteAgo).length;
    const signalsLastHour = history.filter(t => t > oneHourAgo).length;

    if (signalsLastMinute > this.MAX_SIGNALS_PER_MINUTE) {
      this.logThreat({
        threatId: `threat-${Date.now()}`,
        sourceNode: signal.sourceNode,
        threatType: 'ddos',
        severity: 'high',
        timestamp: now,
        details: { signalsLastMinute }
      });

      return {
        decision: 'block',
        reason: `Rate limit exceeded: ${signalsLastMinute} signals/min (max: ${this.MAX_SIGNALS_PER_MINUTE})`,
        ruleId: 'rate-limit-minute'
      };
    }

    if (signalsLastHour > this.MAX_SIGNALS_PER_HOUR) {
      return {
        decision: 'throttle',
        reason: `Hourly rate limit reached: ${signalsLastHour} signals/hour`,
        ruleId: 'rate-limit-hour'
      };
    }

    return { decision: 'allow', reason: 'Rate limit OK' };
  }

  private async detectAnomaly(signal: NeuralSignal): Promise<number> {
    // AI-based anomaly detection
    // في الإنتاج سنستخدم ML model
    // هنا نستخدم كشف بسيط

    let anomalyScore = 0;

    // 1. التحقق من timestamp (يجب أن يكون قريباً من الوقت الحالي)
    const timeDiff = Math.abs(Date.now() - signal.timestamp);
    if (timeDiff > 300000) { // > 5 minutes
      anomalyScore += 0.3;
    }

    // 2. التحقق من حجم payload
    const payloadSize = JSON.stringify(signal.payload).length;
    if (payloadSize > 500000) { // > 500KB
      anomalyScore += 0.2;
    }

    // 3. التحقق من نمط الإشارات
    const history = this.signalHistory.get(signal.sourceNode) || [];
    if (history.length > 0) {
      const avgInterval = history.length > 1 
        ? (history[history.length - 1] - history[0]) / (history.length - 1)
        : 0;
      
      const lastInterval = Date.now() - history[history.length - 1];
      
      if (avgInterval > 0 && Math.abs(lastInterval - avgInterval) > avgInterval * 3) {
        anomalyScore += 0.3;
      }
    }

    return Math.min(anomalyScore, 1.0);
  }

  private recordSignal(signal: NeuralSignal): void {
    const history = this.signalHistory.get(signal.sourceNode) || [];
    history.push(Date.now());
    
    // الاحتفاظ بآخر 1000 signal فقط
    if (history.length > 1000) {
      history.shift();
    }
    
    this.signalHistory.set(signal.sourceNode, history);
  }

  private blockSignal(signal: NeuralSignal, reason: string): FirewallAction {
    this.emit('signal:blocked', { signal, reason });
    return {
      decision: 'block',
      reason
    };
  }

  private logThreat(threat: ThreatDetection): void {
    this.threatLog.push(threat);
    
    // الاحتفاظ بآخر 10000 threat فقط
    if (this.threatLog.length > 10000) {
      this.threatLog.shift();
    }

    this.emit('threat:detected', threat);
    
    console.log(`[Firewall] ⚠️  Threat detected: ${threat.threatType} from ${threat.sourceNode} (severity: ${threat.severity})`);
  }

  private async incrementSuspiciousActivity(nodeName: string): Promise<void> {
    try {
      const node = await db.select()
        .from(neuralNodes)
        .where(eq(neuralNodes.nodeName, nodeName))
        .limit(1);

      if (node.length > 0) {
        const count = node[0].suspiciousActivityCount + 1;
        
        await db.update(neuralNodes)
          .set({
            suspiciousActivityCount: count,
            blockedSignals: node[0].blockedSignals + 1
          })
          .where(eq(neuralNodes.nodeName, nodeName));

        // Auto-block if too many suspicious activities
        if (count > 10) {
          await this.blockNode(nodeName, 'Too many suspicious activities');
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * مراقبة التهديدات كل دقيقة
   */
  private startThreatMonitoring(): void {
    setInterval(() => {
      const stats = this.getFirewallStats();
      
      if (stats.threats.critical > 0 || stats.threats.high > 5) {
        console.log('[Firewall] ⚠️  High threat activity detected!');
        this.emit('threat:alert', stats);
      }

    }, 60000); // 1 minute
  }
}

// ============= SINGLETON INSTANCE =============

let firewallInstance: NeuralFirewall | null = null;

export function initializeFirewall(): NeuralFirewall {
  if (!firewallInstance) {
    firewallInstance = new NeuralFirewall();
    console.log('[Firewall] ✅ Neural Firewall initialized');
  }
  return firewallInstance;
}

export function getFirewall(): NeuralFirewall {
  if (!firewallInstance) {
    throw new Error('[Firewall] Not initialized. Call initializeFirewall() first.');
  }
  return firewallInstance;
}
