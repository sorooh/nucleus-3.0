/**
 * Intelligence Dispatcher for SIDE Nodes
 * Sends intelligence data (insights, patterns, alerts) to Nicholas 3.2
 * 
 * Phase 9.6 - Federation Intelligence Layer
 */

import axios from 'axios';
import crypto from 'crypto';

interface IntelligenceData {
  intelligenceType: 'insight' | 'pattern' | 'alert' | 'knowledge';
  category: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  data: any;
  confidence?: number;
  impact?: string;
  suggestedActions?: string[];
  metadata?: Record<string, any>;
  expiresAt?: string;
}

interface IntelligenceDispatcherConfig {
  nicholasUrl: string;
  nodeId: string;
  authToken: string;
  hmacSecret: string;
  keyId: string;
}

/**
 * Calculate checksum for data
 */
function calculateChecksum(data: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Send intelligence to Nicholas 3.2
 */
export async function sendIntelligence(
  config: IntelligenceDispatcherConfig,
  intelligence: IntelligenceData
): Promise<{
  success: boolean;
  intelligenceId?: string;
  message?: string;
  error?: string;
}> {
  try {
    // Prepare payload
    const payload = {
      ...intelligence,
      checksum: calculateChecksum(intelligence.data)
    };
    
    // Generate HMAC signature
    const timestamp = Date.now().toString();
    const fullPath = '/api/federation/intelligence';
    const signatureData = `POST${fullPath}${timestamp}${JSON.stringify(payload)}`;
    const hmacSignature = crypto
      .createHmac('sha256', config.hmacSecret)
      .update(signatureData)
      .digest('hex');
    
    // Generate nonce for replay protection
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${config.authToken}`,
      'Content-Type': 'application/json',
      'X-Surooh-KeyId': config.keyId,
      'X-Surooh-Timestamp': timestamp,
      'X-Surooh-Signature': hmacSignature,
      'X-Surooh-Nonce': nonce
    };
    
    // Send to Nicholas
    const response = await axios.post(
      `${config.nicholasUrl}${fullPath}`,
      payload,
      { headers, timeout: 30000 }
    );
    
    if (response.data.success) {
      console.log(`[Intelligence] ✅ Sent: ${intelligence.intelligenceType} - ${intelligence.title}`);
      return {
        success: true,
        intelligenceId: response.data.intelligenceId,
        message: response.data.message
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Unknown error'
      };
    }
  } catch (error: any) {
    console.error('[Intelligence] Failed to send:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Intelligence Collector - Example usage for SIDE nodes
 * Collects local insights and sends them to Nicholas
 */
export class IntelligenceCollector {
  private config: IntelligenceDispatcherConfig;
  
  constructor(config: IntelligenceDispatcherConfig) {
    this.config = config;
  }
  
  /**
   * Send a code quality insight
   */
  async sendCodeQualityInsight(data: {
    filesAnalyzed: number;
    issuesFound: number;
    severity: string;
    recommendations: string[];
  }): Promise<any> {
    return sendIntelligence(this.config, {
      intelligenceType: 'insight',
      category: 'code-quality',
      priority: data.severity === 'high' ? 'high' : 'medium',
      title: `Code Quality Analysis - ${data.issuesFound} issues found`,
      description: `Analyzed ${data.filesAnalyzed} files`,
      data,
      confidence: 85,
      impact: `${data.issuesFound} code quality issues need attention`,
      suggestedActions: data.recommendations
    });
  }
  
  /**
   * Send a performance insight
   */
  async sendPerformanceInsight(data: {
    metric: string;
    value: number;
    threshold: number;
    trend: string;
  }): Promise<any> {
    const isProblem = data.value > data.threshold;
    
    return sendIntelligence(this.config, {
      intelligenceType: 'alert',
      category: 'performance',
      priority: isProblem ? 'high' : 'low',
      title: `Performance: ${data.metric} ${isProblem ? 'exceeded threshold' : 'normal'}`,
      description: `Current: ${data.value}, Threshold: ${data.threshold}`,
      data,
      confidence: 90,
      impact: isProblem ? 'Performance degradation detected' : 'Performance within normal range',
      suggestedActions: isProblem ? ['Investigate performance bottleneck', 'Scale resources'] : []
    });
  }
  
  /**
   * Send a security alert
   */
  async sendSecurityAlert(data: {
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string;
    affectedSystems: string[];
  }): Promise<any> {
    return sendIntelligence(this.config, {
      intelligenceType: 'alert',
      category: 'security',
      priority: data.severity,
      title: `Security Alert: ${data.alertType}`,
      description: data.details,
      data,
      confidence: 95,
      impact: `Security issue affecting ${data.affectedSystems.length} system(s)`,
      suggestedActions: ['Review security logs', 'Apply security patches', 'Notify security team']
    });
  }
  
  /**
   * Send a pattern detection
   */
  async sendPatternDetection(data: {
    patternType: string;
    frequency: number;
    occurrences: any[];
    recommendation: string;
  }): Promise<any> {
    return sendIntelligence(this.config, {
      intelligenceType: 'pattern',
      category: 'user-behavior',
      priority: 'medium',
      title: `Pattern Detected: ${data.patternType}`,
      description: `Occurred ${data.frequency} times`,
      data,
      confidence: 80,
      impact: 'Recurring pattern identified',
      suggestedActions: [data.recommendation]
    });
  }
}
