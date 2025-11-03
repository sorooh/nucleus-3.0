/**
 * SYSTEM PULSE LAYER - Built from Absolute Zero
 * 
 * مراقب نبض سُروح - System Mood Tracker
 * Mother Brain's heartbeat and mood sensor
 * 
 * Purpose: Monitor system health, detect stress, and adjust operations
 * Features:
 * - Real-time system mood tracking
 * - Load and stress level calculation
 * - Automatic recommendations
 * - Performance metrics collection
 */

import { EventEmitter } from 'events';

// ============= Types & Interfaces =============

export type SystemMood = 'Stable' | 'Healthy' | 'Medium' | 'Stressed' | 'Critical';
export type StressLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type Recommendation = 'normal_operations' | 'limit_learning' | 'suspend_non_critical' | 'emergency_mode';

export interface PulseData {
  source: string;
  systemLoad: number;      // 0-1 (percentage as decimal)
  errors: number;
  responseTime: number;     // milliseconds
  ordersVolume?: number;
  customerfeedback?: number; // -1 to 1
  timestamp: number;
}

export interface SystemPulse {
  mood: SystemMood;
  loadIndex: number;        // 0-1
  stressLevel: StressLevel;
  recommendation: Recommendation;
  timestamp: number;
  sources: string[];
  metrics: {
    avgLoad: number;
    avgErrors: number;
    avgResponseTime: number;
    totalData: number;
  };
}

export interface PulseHistory {
  timestamp: number;
  mood: SystemMood;
  loadIndex: number;
  stressLevel: StressLevel;
}

// ============= Pulse Monitor =============

export class PulseMonitor extends EventEmitter {
  private active: boolean = false;
  private pulseData: Map<string, PulseData[]> = new Map();
  private currentPulse: SystemPulse | null = null;
  private pulseHistory: PulseHistory[] = [];
  private collectionInterval: NodeJS.Timeout | null = null;
  private maxHistorySize: number = 288; // 24 hours at 5-min intervals

  constructor() {
    super();
    console.log('[PulseMonitor] Initialized (from absolute zero)');
  }

  // ============= Activation =============

  activate(collectionIntervalMs: number = 5 * 60 * 1000): void {
    if (this.active) {
      console.log('[PulseMonitor] Already active');
      return;
    }

    this.active = true;
    
    // Start periodic pulse calculation
    this.collectionInterval = setInterval(() => {
      this.calculatePulse();
    }, collectionIntervalMs);

    // Calculate initial pulse
    this.calculatePulse();

    this.emit('activated');
    console.log(`💓 Pulse Monitor activated - Tracking system heartbeat every ${collectionIntervalMs / 1000}s`);
  }

  deactivate(): void {
    if (!this.active) return;

    this.active = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    this.emit('deactivated');
    console.log('[PulseMonitor] Deactivated');
  }

  // ============= Data Collection =============

  reportPulseData(data: Omit<PulseData, 'timestamp'>): void {
    if (!this.active) {
      console.warn('[PulseMonitor] Not active, ignoring pulse data');
      return;
    }

    const pulseData: PulseData = {
      ...data,
      timestamp: Date.now()
    };

    // Store data by source
    if (!this.pulseData.has(data.source)) {
      this.pulseData.set(data.source, []);
    }

    const sourceData = this.pulseData.get(data.source)!;
    sourceData.push(pulseData);

    // Keep only last 100 data points per source
    if (sourceData.length > 100) {
      sourceData.shift();
    }

    this.emit('pulse-data-received', { data: pulseData });
  }

  // ============= Pulse Calculation =============

  private calculatePulse(): void {
    // Get all recent data (last 5 minutes)
    const recentTime = Date.now() - 5 * 60 * 1000;
    const allRecentData: PulseData[] = [];

    for (const sourceData of Array.from(this.pulseData.values())) {
      const recent = sourceData.filter((d: PulseData) => d.timestamp > recentTime);
      allRecentData.push(...recent);
    }

    if (allRecentData.length === 0) {
      // No data - assume stable
      this.currentPulse = {
        mood: 'Stable',
        loadIndex: 0,
        stressLevel: 'Low',
        recommendation: 'normal_operations',
        timestamp: Date.now(),
        sources: [],
        metrics: {
          avgLoad: 0,
          avgErrors: 0,
          avgResponseTime: 0,
          totalData: 0
        }
      };
      
      this.addToHistory(this.currentPulse);
      this.emit('pulse-calculated', { pulse: this.currentPulse });
      return;
    }

    // Calculate metrics
    const avgLoad = allRecentData.reduce((sum, d) => sum + d.systemLoad, 0) / allRecentData.length;
    const avgErrors = allRecentData.reduce((sum, d) => sum + d.errors, 0) / allRecentData.length;
    const avgResponseTime = allRecentData.reduce((sum, d) => sum + d.responseTime, 0) / allRecentData.length;

    // Calculate load index (0-1)
    const loadIndex = this.calculateLoadIndex(avgLoad, avgErrors, avgResponseTime);

    // Determine mood and stress
    const mood = this.determineMood(loadIndex);
    const stressLevel = this.determineStressLevel(loadIndex);
    const recommendation = this.generateRecommendation(mood, stressLevel);

    // Get unique sources
    const sources = Array.from(new Set(allRecentData.map(d => d.source)));

    this.currentPulse = {
      mood,
      loadIndex,
      stressLevel,
      recommendation,
      timestamp: Date.now(),
      sources,
      metrics: {
        avgLoad,
        avgErrors,
        avgResponseTime,
        totalData: allRecentData.length
      }
    };

    this.addToHistory(this.currentPulse);
    this.emit('pulse-calculated', { pulse: this.currentPulse });
    this.broadcastRecommendation(recommendation);

    console.log(`[PulseMonitor] Pulse: ${mood} (Load: ${(loadIndex * 100).toFixed(1)}%, Stress: ${stressLevel})`);
  }

  private calculateLoadIndex(avgLoad: number, avgErrors: number, avgResponseTime: number): number {
    // Weighted calculation
    const loadWeight = 0.4;
    const errorWeight = 0.3;
    const responseWeight = 0.3;

    // Normalize values to 0-1
    const normalizedLoad = Math.min(avgLoad, 1);
    const normalizedErrors = Math.min(avgErrors / 10, 1); // 10 errors = max
    const normalizedResponse = Math.min(avgResponseTime / 1000, 1); // 1000ms = max

    const index = (normalizedLoad * loadWeight) +
                  (normalizedErrors * errorWeight) +
                  (normalizedResponse * responseWeight);

    return Math.min(Math.max(index, 0), 1);
  }

  private determineMood(loadIndex: number): SystemMood {
    if (loadIndex < 0.2) return 'Stable';
    if (loadIndex < 0.4) return 'Healthy';
    if (loadIndex < 0.7) return 'Medium';
    if (loadIndex < 0.9) return 'Stressed';
    return 'Critical';
  }

  private determineStressLevel(loadIndex: number): StressLevel {
    if (loadIndex < 0.3) return 'Low';
    if (loadIndex < 0.6) return 'Medium';
    if (loadIndex < 0.85) return 'High';
    return 'Critical';
  }

  private generateRecommendation(mood: SystemMood, stress: StressLevel): Recommendation {
    if (mood === 'Critical' || stress === 'Critical') {
      return 'emergency_mode';
    }
    if (mood === 'Stressed' || stress === 'High') {
      return 'suspend_non_critical';
    }
    if (mood === 'Medium' || stress === 'Medium') {
      return 'limit_learning';
    }
    return 'normal_operations';
  }

  private broadcastRecommendation(recommendation: Recommendation): void {
    this.emit('recommendation', { recommendation });
    
    // Send to child brains
    this.emit('pulse-signal', {
      signal: this.getSignalFromRecommendation(recommendation),
      recommendation,
      timestamp: Date.now()
    });
  }

  private getSignalFromRecommendation(rec: Recommendation): '🟢' | '🟠' | '🔴' {
    switch (rec) {
      case 'normal_operations': return '🟢';
      case 'limit_learning': return '🟠';
      case 'suspend_non_critical':
      case 'emergency_mode': return '🔴';
    }
  }

  // ============= History Management =============

  private addToHistory(pulse: SystemPulse): void {
    this.pulseHistory.push({
      timestamp: pulse.timestamp,
      mood: pulse.mood,
      loadIndex: pulse.loadIndex,
      stressLevel: pulse.stressLevel
    });

    // Limit history size
    if (this.pulseHistory.length > this.maxHistorySize) {
      this.pulseHistory.shift();
    }
  }

  // ============= Queries =============

  getCurrentPulse(): SystemPulse | null {
    return this.currentPulse;
  }

  getPulseHistory(hours: number = 24): PulseHistory[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.pulseHistory.filter(h => h.timestamp > cutoffTime);
  }

  getAnalytics(): {
    currentMood: SystemMood | 'Unknown';
    currentLoadIndex: number;
    avgLoadIndex: number;
    moodDistribution: Record<SystemMood, number>;
    stressDistribution: Record<StressLevel, number>;
    totalDataPoints: number;
  } {
    if (!this.currentPulse) {
      return {
        currentMood: 'Unknown',
        currentLoadIndex: 0,
        avgLoadIndex: 0,
        moodDistribution: { Stable: 0, Healthy: 0, Medium: 0, Stressed: 0, Critical: 0 },
        stressDistribution: { Low: 0, Medium: 0, High: 0, Critical: 0 },
        totalDataPoints: 0
      };
    }

    const avgLoadIndex = this.pulseHistory.length > 0
      ? this.pulseHistory.reduce((sum, h) => sum + h.loadIndex, 0) / this.pulseHistory.length
      : 0;

    const moodDistribution: Record<SystemMood, number> = {
      Stable: 0, Healthy: 0, Medium: 0, Stressed: 0, Critical: 0
    };

    const stressDistribution: Record<StressLevel, number> = {
      Low: 0, Medium: 0, High: 0, Critical: 0
    };

    this.pulseHistory.forEach(h => {
      moodDistribution[h.mood]++;
      stressDistribution[h.stressLevel]++;
    });

    return {
      currentMood: this.currentPulse.mood,
      currentLoadIndex: this.currentPulse.loadIndex,
      avgLoadIndex,
      moodDistribution,
      stressDistribution,
      totalDataPoints: this.pulseHistory.length
    };
  }

  getStatus(): { active: boolean; currentMood: SystemMood | 'Unknown'; sources: string[]; dataPoints: number } {
    return {
      active: this.active,
      currentMood: this.currentPulse?.mood || 'Unknown',
      sources: this.currentPulse?.sources || [],
      dataPoints: Array.from(this.pulseData.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }

  // ============= Utilities =============

  clearHistory(): void {
    this.pulseHistory = [];
    this.emit('history-cleared');
    console.log('[PulseMonitor] History cleared');
  }

  clearDataSource(source: string): boolean {
    const deleted = this.pulseData.delete(source);
    if (deleted) {
      this.emit('source-cleared', { source });
      console.log(`[PulseMonitor] Data cleared for source: ${source}`);
    }
    return deleted;
  }
}

// Export singleton instance
export const pulseMonitor = new PulseMonitor();
