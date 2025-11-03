/**
 * Build Monitor - مراقب البناء والـDependencies
 * Phase 5.1 → 7.0: Assisted Execution Layer
 * 
 * PRODUCTION READY - Real build monitoring with npm/TypeScript integration
 */

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';
import { db } from '../../db';
import { buildErrors, executionAudit } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

// HONEST: Counter for deterministic error IDs
let errorCounter = 0;

interface BuildError {
  id: string;
  errorType: 'npm' | 'typescript' | 'webpack' | 'dependency';
  errorMessage: string;
  affectedFiles: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: Date;
  autoFixAttempted: boolean;
  autoFixSuccess?: boolean;
}

interface DependencyIssue {
  package: string;
  currentVersion?: string;
  requiredVersion?: string;
  issue: 'missing' | 'outdated' | 'conflict';
}

export class BuildMonitor extends EventEmitter {
  private isActive: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastCheckTimestamp: Date | null = null;

  constructor() {
    super();
    console.log('🔨 [BuildMonitor] Initializing production build monitoring...');
  }

  /**
   * تفعيل المراقب
   */
  async activate(): Promise<void> {
    console.log('🔨 [BuildMonitor] Activating build monitor...');
    this.isActive = true;
    this.emit('activated');
    
    // Start continuous monitoring (every 5 minutes)
    this.startContinuousMonitoring();
    
    // Run initial check
    await this.detectErrors();
    
    // Log activation
    await this.logAudit('monitor_activated', 'system', {
      component: 'build-monitor',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تعطيل المراقب
   */
  deactivate(): void {
    console.log('🔨 [BuildMonitor] Deactivating build monitor...');
    this.isActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.emit('deactivated');
  }

  /**
   * بدء المراقبة المستمرة
   */
  private startContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Check every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      if (this.isActive) {
        console.log('🔨 [BuildMonitor] Running scheduled error detection...');
        await this.detectErrors();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * كشف الأخطاء
   */
  async detectErrors(): Promise<BuildError[]> {
    if (!this.isActive) {
      return [];
    }

    console.log('🔨 [BuildMonitor] Detecting build errors...');
    this.lastCheckTimestamp = new Date();
    
    const detectedErrors: BuildError[] = [];

    try {
      // 1. فحص TypeScript errors
      const tsErrors = await this.checkTypeScriptErrors();
      detectedErrors.push(...tsErrors);

      // 2. فحص npm dependencies
      const depErrors = await this.checkDependencies();
      detectedErrors.push(...depErrors);

      // 3. فحص package.json validity
      const pkgErrors = await this.checkPackageJson();
      detectedErrors.push(...pkgErrors);

      // حفظ الأخطاء في Database
      for (const error of detectedErrors) {
        await this.saveBuildError(error);
      }

      console.log(`🔨 [BuildMonitor] Detection complete: found ${detectedErrors.length} error(s)`);
      this.emit('errors-detected', detectedErrors);

      return detectedErrors;

    } catch (error: any) {
      console.error('❌ [BuildMonitor] Error detection failed:', error);
      this.emit('detection-failed', error);
      return [];
    }
  }

  /**
   * فحص أخطاء TypeScript
   */
  private async checkTypeScriptErrors(): Promise<BuildError[]> {
    const errors: BuildError[] = [];
    
    try {
      // Run tsc --noEmit to check for type errors
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd: process.cwd(),
        timeout: 30000 // 30 seconds timeout
      });

      // If we get here without throwing, there are no errors
      console.log('✅ [BuildMonitor] No TypeScript errors detected');
      
    } catch (error: any) {
      // tsc returns non-zero exit code when there are errors
      const output = error.stdout || error.stderr || '';
      
      // Parse TypeScript errors
      const errorLines = output.split('\n').filter((line: string) => 
        line.includes('error TS')
      );

      for (const line of errorLines) {
        const match = line.match(/(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/);
        
        if (match) {
          const [, file, lineNum, , errorCode, message] = match;
          
          errors.push({
            id: `ts-${Date.now()}-${(errorCounter++).toString(36)}`,
            errorType: 'typescript',
            errorMessage: `${errorCode}: ${message.trim()} (at ${file}:${lineNum})`,
            affectedFiles: [file.trim()],
            severity: this.determineSeverity('typescript', message),
            detectedAt: new Date(),
            autoFixAttempted: false
          });
        }
      }

      if (errors.length > 0) {
        console.log(`⚠️ [BuildMonitor] Found ${errors.length} TypeScript error(s)`);
      }
    }

    return errors;
  }

  /**
   * فحص Dependencies
   */
  private async checkDependencies(): Promise<BuildError[]> {
    const errors: BuildError[] = [];

    try {
      // Check for missing dependencies using npm ls
      const { stdout } = await execAsync('npm ls --depth=0 --json', {
        cwd: process.cwd(),
        timeout: 20000
      });

      const lsResult = JSON.parse(stdout);
      const issues: DependencyIssue[] = [];

      // Check for missing dependencies
      if (lsResult.problems) {
        for (const problem of lsResult.problems) {
          const match = problem.match(/missing:\s+(.+?)@(.+?),\s+required by/);
          if (match) {
            issues.push({
              package: match[1],
              requiredVersion: match[2],
              issue: 'missing'
            });
          }
        }
      }

      // Create error entries
      for (const issue of issues) {
        errors.push({
          id: `dep-${Date.now()}-${(errorCounter++).toString(36)}`,
          errorType: 'dependency',
          errorMessage: `Missing dependency: ${issue.package}@${issue.requiredVersion || '*'}`,
          affectedFiles: ['package.json'],
          severity: 'critical',
          detectedAt: new Date(),
          autoFixAttempted: false
        });
      }

      if (errors.length > 0) {
        console.log(`⚠️ [BuildMonitor] Found ${errors.length} dependency issue(s)`);
      }

    } catch (error: any) {
      console.warn('⚠️ [BuildMonitor] Could not check dependencies:', error.message);
    }

    return errors;
  }

  /**
   * فحص package.json
   */
  private async checkPackageJson(): Promise<BuildError[]> {
    const errors: BuildError[] = [];

    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      // Check for required fields
      const requiredFields = ['name', 'version'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          errors.push({
            id: `pkg-${Date.now()}-${(errorCounter++).toString(36)}`,
            errorType: 'npm',
            errorMessage: `Missing required field in package.json: ${field}`,
            affectedFiles: ['package.json'],
            severity: 'high',
            detectedAt: new Date(),
            autoFixAttempted: false
          });
        }
      }

      // Check for dependency conflicts
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Look for duplicate packages with different versions
      const packageVersions = new Map<string, string[]>();
      for (const [pkg, version] of Object.entries(deps)) {
        if (!packageVersions.has(pkg)) {
          packageVersions.set(pkg, []);
        }
        packageVersions.get(pkg)!.push(version as string);
      }

      const packageEntries = Array.from(packageVersions.entries());
      for (const [pkg, versions] of packageEntries) {
        if (versions.length > 1) {
          errors.push({
            id: `conflict-${Date.now()}-${(errorCounter++).toString(36)}`,
            errorType: 'dependency',
            errorMessage: `Dependency conflict: ${pkg} has multiple versions: ${versions.join(', ')}`,
            affectedFiles: ['package.json'],
            severity: 'high',
            detectedAt: new Date(),
            autoFixAttempted: false
          });
        }
      }

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        errors.push({
          id: `pkg-missing-${Date.now()}`,
          errorType: 'npm',
          errorMessage: 'package.json not found',
          affectedFiles: [],
          severity: 'critical',
          detectedAt: new Date(),
          autoFixAttempted: false
        });
      } else if (error instanceof SyntaxError) {
        errors.push({
          id: `pkg-invalid-${Date.now()}`,
          errorType: 'npm',
          errorMessage: `Invalid JSON in package.json: ${error.message}`,
          affectedFiles: ['package.json'],
          severity: 'critical',
          detectedAt: new Date(),
          autoFixAttempted: false
        });
      }
    }

    return errors;
  }

  /**
   * تحديد شدة الخطأ
   */
  private determineSeverity(errorType: string, message: string): 'critical' | 'high' | 'medium' | 'low' {
    // Critical patterns
    if (
      message.includes('Cannot find module') ||
      message.includes('is not defined') ||
      message.includes('Type \'undefined\'') ||
      errorType === 'dependency'
    ) {
      return 'critical';
    }

    // High severity
    if (
      message.includes('Type \'any\'') ||
      message.includes('implicitly has an \'any\' type') ||
      message.includes('is not assignable')
    ) {
      return 'high';
    }

    // Medium severity
    if (
      message.includes('is declared but') ||
      message.includes('never used')
    ) {
      return 'medium';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * حفظ خطأ البناء في Database
   */
  private async saveBuildError(error: BuildError): Promise<void> {
    try {
      await db.insert(buildErrors).values({
        errorType: error.errorType,
        errorMessage: error.errorMessage,
        affectedFiles: error.affectedFiles,
        severity: error.severity,
        status: 'detected',
        autoFixAttempted: error.autoFixAttempted ? 1 : 0,
        autoFixSuccess: error.autoFixSuccess !== undefined ? (error.autoFixSuccess ? 1 : 0) : null
      });

      console.log(`💾 [BuildMonitor] Error saved to database: ${error.id}`);
    } catch (dbError) {
      console.error('Failed to save build error to database:', dbError);
    }
  }

  /**
   * الحصول على كل الأخطاء من Database
   */
  async getAllErrors(): Promise<any[]> {
    try {
      const errors = await db.select()
        .from(buildErrors)
        .orderBy(buildErrors.detectedAt);
      
      return errors;
    } catch (error) {
      console.error('Failed to get build errors:', error);
      return [];
    }
  }

  /**
   * الحصول على الأخطاء النشطة
   */
  async getActiveErrors(): Promise<any[]> {
    try {
      const errors = await db.select()
        .from(buildErrors)
        .where(eq(buildErrors.status, 'detected'));
      
      return errors;
    } catch (error) {
      console.error('Failed to get active errors:', error);
      return [];
    }
  }

  /**
   * تسجيل في audit trail
   */
  private async logAudit(action: string, actor: string, details: any): Promise<void> {
    try {
      await db.insert(executionAudit).values({
        patchId: null,
        action,
        actor,
        details,
        signature: null
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }

  /**
   * الحصول على الحالة
   */
  async getStatus() {
    try {
      const allErrors = await this.getAllErrors();
      const activeErrors = await this.getActiveErrors();
      
      const criticalErrors = activeErrors.filter(e => e.severity === 'critical').length;
      const highErrors = activeErrors.filter(e => e.severity === 'high').length;

      return {
        isActive: this.isActive,
        lastCheck: this.lastCheckTimestamp?.toISOString() || null,
        totalErrors: allErrors.length,
        activeErrors: activeErrors.length,
        criticalErrors,
        highErrors,
        byType: {
          typescript: activeErrors.filter(e => e.errorType === 'typescript').length,
          npm: activeErrors.filter(e => e.errorType === 'npm').length,
          dependency: activeErrors.filter(e => e.errorType === 'dependency').length,
          webpack: activeErrors.filter(e => e.errorType === 'webpack').length
        }
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        isActive: this.isActive,
        lastCheck: this.lastCheckTimestamp?.toISOString() || null,
        totalErrors: 0,
        activeErrors: 0,
        criticalErrors: 0,
        highErrors: 0,
        byType: {
          typescript: 0,
          npm: 0,
          dependency: 0,
          webpack: 0
        }
      };
    }
  }
}

export const buildMonitor = new BuildMonitor();
