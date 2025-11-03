/**
 * Federation Sync Reporter
 * Generates detailed sync reports for audit and monitoring
 */

import fs from 'fs';
import path from 'path';

export interface SyncReport {
  reportId: string;
  timestamp: string;
  phase: string;
  nodeId: string;
  
  // Test Results
  tests: {
    name: string;
    status: 'pass' | 'fail';
    duration: number;
    details: any;
  }[];
  
  // Sync Statistics
  statistics: {
    totalSyncs: number;
    inboundSyncs: number;
    outboundSyncs: number;
    successRate: number;
    averageResponseTime: number;
  };
  
  // Security Validation
  security: {
    jwtVerified: boolean;
    hmacVerified: boolean;
    rsaVerified: boolean;
    checksumVerified: boolean;
    nonceProtection: boolean;
    timestampValidation: boolean;
  };
  
  // Audit Trail
  auditTrail: {
    syncId: string;
    direction: string;
    status: string;
    checksum: string;
    timestamp: string;
  }[];
  
  // Success Indicators
  successIndicators: {
    handshakeActive: boolean;
    syncEndpointWorking: boolean;
    auditLogPresent: boolean;
    checksumMatch: boolean;
    duplicateRejection: boolean;
    nodeStatusActive: boolean;
  };
}

export class SyncReporter {
  private reportsDir: string;
  
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.ensureReportsDirectory();
  }
  
  private ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }
  
  /**
   * Generate sync report
   */
  async generateReport(data: Partial<SyncReport>): Promise<string> {
    const reportId = `report-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const report: SyncReport = {
      reportId,
      timestamp,
      phase: data.phase || 'Phase 9.5',
      nodeId: data.nodeId || 'unknown',
      tests: data.tests || [],
      statistics: data.statistics || {
        totalSyncs: 0,
        inboundSyncs: 0,
        outboundSyncs: 0,
        successRate: 0,
        averageResponseTime: 0
      },
      security: data.security || {
        jwtVerified: false,
        hmacVerified: false,
        rsaVerified: false,
        checksumVerified: false,
        nonceProtection: false,
        timestampValidation: false
      },
      auditTrail: data.auditTrail || [],
      successIndicators: data.successIndicators || {
        handshakeActive: false,
        syncEndpointWorking: false,
        auditLogPresent: false,
        checksumMatch: false,
        duplicateRejection: false,
        nodeStatusActive: false
      }
    };
    
    // Save to file
    const filename = `federation-sync-${timestamp.split('T')[0]}-${reportId}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log(`📊 Report generated: ${filename}`);
    
    return filepath;
  }
  
  /**
   * Generate test summary report
   */
  async generateTestReport(testName: string, results: any): Promise<string> {
    const timestamp = new Date().toISOString();
    const filename = `federation-sync-test-${timestamp.split('T')[0]}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    const report = {
      testName,
      timestamp,
      results,
      summary: {
        totalTests: results.tests?.length || 0,
        passed: results.tests?.filter((t: any) => t.status === 'pass').length || 0,
        failed: results.tests?.filter((t: any) => t.status === 'fail').length || 0,
        successRate: results.statistics?.successRate || 0
      }
    };
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log(`📊 Test report generated: ${filename}`);
    
    return filepath;
  }
  
  /**
   * Read latest report
   */
  getLatestReport(): any | null {
    const files = fs.readdirSync(this.reportsDir)
      .filter(f => f.startsWith('federation-sync-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) return null;
    
    const latestFile = path.join(this.reportsDir, files[0]);
    return JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
  }
}

export const syncReporter = new SyncReporter();
