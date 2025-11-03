/**
 * HONESTY AUDITOR - كاشف الوهم والكذب
 * Scans entire codebase for mock data, fake implementations, and simulations
 * 
 * 100% HONESTY ENFORCEMENT
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import * as fs from 'fs';
import * as path from 'path';

interface HonestyIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'mock_data' | 'fake_implementation' | 'simulation' | 'todo' | 'hardcoded';
  file: string;
  line: number;
  code: string;
  explanation: string;
  detectedAt: Date;
}

interface HonestyReport {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<string, number>;
  issues: HonestyIssue[];
  scannedFiles: number;
  scannedAt: Date;
  honestyScore: number; // 0-100
}

/**
 * Patterns that indicate fake/mock implementations
 */
const DISHONESTY_PATTERNS = [
  // Simulation patterns
  { pattern: /setTimeout.*simulate|simulation/gi, severity: 'critical' as const, category: 'simulation' as const, explanation: 'Using setTimeout to simulate async behavior' },
  { pattern: /\/\/\s*simulate|\/\/\s*simulation/gi, severity: 'high' as const, category: 'simulation' as const, explanation: 'Comment indicates simulation' },
  
  // Mock data patterns
  { pattern: /mockData|mock_data|MOCK_/gi, severity: 'critical' as const, category: 'mock_data' as const, explanation: 'Using mock data instead of real data' },
  { pattern: /faker\.|Faker\./g, severity: 'high' as const, category: 'mock_data' as const, explanation: 'Using Faker library for fake data' },
  { pattern: /dummy|placeholder.*data/gi, severity: 'medium' as const, category: 'mock_data' as const, explanation: 'Using dummy/placeholder data' },
  
  // Fake implementations
  { pattern: /\.local\/|localhost:.*fake|fake.*url/gi, severity: 'critical' as const, category: 'fake_implementation' as const, explanation: 'Using fake URLs' },
  { pattern: /return\s+\{\}|return\s+\[\]|return\s+null.*\/\/.*TODO/gi, severity: 'medium' as const, category: 'fake_implementation' as const, explanation: 'Returning empty data with TODO' },
  
  // TODO patterns (not implemented yet)
  { pattern: /\/\/\s*TODO:|\/\*\s*TODO:/gi, severity: 'low' as const, category: 'todo' as const, explanation: 'Feature not implemented yet (TODO)' },
  { pattern: /throw new Error\(['"]Not implemented/gi, severity: 'high' as const, category: 'fake_implementation' as const, explanation: 'Function throws "Not implemented"' },
  
  // Hardcoded values
  { pattern: /Math\.random|Math\.floor.*random/gi, severity: 'medium' as const, category: 'hardcoded' as const, explanation: 'Using random values instead of real data' },
  { pattern: /hardcoded|hard-coded|hard_coded/gi, severity: 'medium' as const, category: 'hardcoded' as const, explanation: 'Comment mentions hardcoded values' },
];

class HonestyAuditor extends EventEmitter {
  private isActive: boolean = false;
  private lastScan: Date | null = null;
  private scanResults: HonestyReport | null = null;

  constructor() {
    super();
    console.log('[Honesty Auditor] 🔍 Initializing...');
  }

  async start() {
    this.isActive = true;
    console.log('[Honesty Auditor] ✅ Activated - Ready to detect dishonesty');
    this.emit('auditor:started');
  }

  async stop() {
    this.isActive = false;
    console.log('[Honesty Auditor] ⏸️ Stopped');
    this.emit('auditor:stopped');
  }

  /**
   * Scan entire codebase for dishonesty
   */
  async scanCodebase(): Promise<HonestyReport> {
    console.log('[Honesty Auditor] 🔍 Starting full codebase scan...');
    const startTime = Date.now();

    const issues: HonestyIssue[] = [];
    let scannedFiles = 0;

    // Directories to scan
    const dirsToScan = [
      'server',
      'client/src',
      'shared',
    ];

    for (const dir of dirsToScan) {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        await this.scanDirectory(dirPath, issues);
        scannedFiles += this.countFiles(dirPath);
      }
    }

    // Calculate statistics
    const report: HonestyReport = {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      byCategory: this.groupByCategory(issues),
      issues,
      scannedFiles,
      scannedAt: new Date(),
      honestyScore: this.calculateHonestyScore(issues, scannedFiles),
    };

    this.scanResults = report;
    this.lastScan = new Date();

    const duration = Date.now() - startTime;
    console.log(`[Honesty Auditor] ✅ Scan completed in ${duration}ms`);
    console.log(`[Honesty Auditor] 📊 Honesty Score: ${report.honestyScore}/100`);
    console.log(`[Honesty Auditor] 🚨 Issues found: ${report.totalIssues}`);
    console.log(`[Honesty Auditor]    - Critical: ${report.critical}`);
    console.log(`[Honesty Auditor]    - High: ${report.high}`);
    console.log(`[Honesty Auditor]    - Medium: ${report.medium}`);
    console.log(`[Honesty Auditor]    - Low: ${report.low}`);

    this.emit('scan:completed', report);

    return report;
  }

  /**
   * Scan directory recursively
   */
  private async scanDirectory(dirPath: string, issues: HonestyIssue[]) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip node_modules, .git, etc.
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, issues);
      } else if (entry.isFile()) {
        // Scan only code files
        if (this.isCodeFile(entry.name)) {
          await this.scanFile(fullPath, issues);
        }
      }
    }
  }

  /**
   * Scan single file for dishonesty patterns
   */
  private async scanFile(filePath: string, issues: HonestyIssue[]) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of DISHONESTY_PATTERNS) {
          const matches = line.match(pattern.pattern);
          if (matches) {
            issues.push({
              id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              severity: pattern.severity,
              category: pattern.category,
              file: path.relative(process.cwd(), filePath),
              line: i + 1,
              code: line.trim(),
              explanation: pattern.explanation,
              detectedAt: new Date(),
            });
          }
        }
      }
    } catch (error) {
      console.error(`[Honesty Auditor] Error scanning ${filePath}:`, error);
    }
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Count files in directory
   */
  private countFiles(dirPath: string): number {
    let count = 0;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          count += this.countFiles(fullPath);
        } else if (this.isCodeFile(entry.name)) {
          count++;
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
    return count;
  }

  /**
   * Group issues by category
   */
  private groupByCategory(issues: HonestyIssue[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const issue of issues) {
      grouped[issue.category] = (grouped[issue.category] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Calculate honesty score (0-100)
   * 100 = perfect honesty, 0 = completely fake
   */
  private calculateHonestyScore(issues: HonestyIssue[], totalFiles: number): number {
    if (totalFiles === 0) return 100;

    // Weight by severity
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
    };

    let penalty = 0;
    for (const issue of issues) {
      penalty += weights[issue.severity];
    }

    // Max penalty = totalFiles * 10 (if every file has critical issue)
    const maxPenalty = totalFiles * 10;
    const score = Math.max(0, 100 - (penalty / maxPenalty) * 100);

    return Math.round(score);
  }

  /**
   * Get last scan results
   */
  getLastScan(): HonestyReport | null {
    return this.scanResults;
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): HonestyIssue[] {
    if (!this.scanResults) return [];
    return this.scanResults.issues.filter(i => i.severity === severity);
  }

  /**
   * Get issues by category
   */
  getIssuesByCategory(category: string): HonestyIssue[] {
    if (!this.scanResults) return [];
    return this.scanResults.issues.filter(i => i.category === category);
  }

  getStatus() {
    return {
      isActive: this.isActive,
      lastScan: this.lastScan,
      honestyScore: this.scanResults?.honestyScore || null,
      totalIssues: this.scanResults?.totalIssues || 0,
    };
  }
}

export const honestyAuditor = new HonestyAuditor();
export default honestyAuditor;
