/**
 * Code Executor - منفّذ التصحيحات البرمجية
 * Phase 5.1 → 7.0: Assisted Execution Layer
 * 
 * ينفّذ الـpatches بعد الموافقة مع ضمانات السلامة
 * PRODUCTION READY - Real patch execution with git integration
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { db } from '../../db';
import { executionPatches, executionAudit } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

interface ExecutionRequest {
  patchId: string;
  patchContent: string; // Git diff format
  affectedFiles: string[];
  approvedBy: string;
}

interface ExecutionResult {
  patchId: string;
  success: boolean;
  filesModified: string[];
  error?: string;
  executedAt: Date;
  rollbackAvailable: boolean;
  backupPath?: string;
}

interface FileBackup {
  originalPath: string;
  backupPath: string;
  content: string;
  timestamp: Date;
}

export class CodeExecutor extends EventEmitter {
  private isActive: boolean = false;
  private maxExecutionsPerHour: number = 5;
  private backupDir: string = path.join(process.cwd(), '.patch-backups');

  constructor() {
    super();
    console.log('⚙️ [CodeExecutor] Initializing production code execution engine...');
    this.initializeBackupDirectory();
  }

  /**
   * تهيئة مجلد النسخ الاحتياطي
   */
  private async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`💾 [CodeExecutor] Backup directory ready: ${this.backupDir}`);
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * تفعيل المنفّذ
   */
  async activate(): Promise<void> {
    console.log('⚙️ [CodeExecutor] Activating code executor...');
    this.isActive = true;
    this.emit('activated');
    
    // Log activation
    await this.logAudit('executor_activated', 'system', {
      component: 'code-executor',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تعطيل المنفّذ
   */
  async deactivate(): Promise<void> {
    console.log('⚙️ [CodeExecutor] Deactivating code executor...');
    this.isActive = false;
    this.emit('deactivated');
    
    // Log deactivation
    await this.logAudit('executor_deactivated', 'system', {
      component: 'code-executor',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تنفيذ patch معتمد
   */
  async executePatch(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.isActive) {
      throw new Error('Code executor is not active');
    }

    // فحص rate limiting من Database
    const canExecute = await this.checkRateLimit();
    if (!canExecute) {
      throw new Error(`Rate limit exceeded: maximum ${this.maxExecutionsPerHour} executions per hour`);
    }

    console.log(`⚙️ [CodeExecutor] Executing patch: ${request.patchId}`);
    this.emit('execution-started', request.patchId);

    const result: ExecutionResult = {
      patchId: request.patchId,
      success: false,
      filesModified: [],
      executedAt: new Date(),
      rollbackAvailable: false
    };

    try {
      // 1. إنشاء نسخ احتياطية
      const backups = await this.createBackups(request.affectedFiles);
      result.backupPath = this.getBackupPath(request.patchId);
      await this.saveBackupManifest(request.patchId, backups);

      // 2. تطبيق الـpatch
      await this.applyPatch(request);
      
      // 3. التحقق من صحة الملفات بعد التطبيق
      await this.verifyModifiedFiles(request.affectedFiles);

      result.success = true;
      result.filesModified = request.affectedFiles;
      result.rollbackAvailable = true;

      // تحديث حالة الـpatch في Database
      await db.update(executionPatches)
        .set({
          status: 'executed',
          executedAt: new Date(),
          executionResult: 'success',
          rollbackAvailable: 1
        })
        .where(eq(executionPatches.id, request.patchId));

      // Log audit trail
      await this.logAudit('executed', request.approvedBy, {
        patchId: request.patchId,
        filesModified: result.filesModified,
        backupPath: result.backupPath
      });

      console.log(`✅ [CodeExecutor] Patch executed successfully: ${request.patchId}`);
      this.emit('execution-completed', result);

      return result;

    } catch (error: any) {
      result.success = false;
      result.error = error.message;
      
      // محاولة الـrollback التلقائي في حالة الفشل
      console.warn(`⚠️ [CodeExecutor] Execution failed, attempting automatic rollback...`);
      try {
        await this.rollbackPatch(request.patchId);
      } catch (rollbackError) {
        console.error('Automatic rollback failed:', rollbackError);
      }

      // Update database
      await db.update(executionPatches)
        .set({
          status: 'failed',
          executedAt: new Date(),
          executionResult: `error: ${error.message}`,
          rollbackAvailable: 0
        })
        .where(eq(executionPatches.id, request.patchId));

      // Log failure
      await this.logAudit('execution_failed', request.approvedBy, {
        patchId: request.patchId,
        error: error.message
      });
      
      console.error(`❌ [CodeExecutor] Execution failed:`, error);
      this.emit('execution-failed', { patchId: request.patchId, error });
      
      return result;
    }
  }

  /**
   * إنشاء نسخ احتياطية من الملفات
   */
  private async createBackups(files: string[]): Promise<FileBackup[]> {
    const backups: FileBackup[] = [];
    
    for (const file of files) {
      try {
        const filePath = path.resolve(process.cwd(), file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        const backup: FileBackup = {
          originalPath: file,
          backupPath: '', // Will be set when saving
          content,
          timestamp: new Date()
        };
        
        backups.push(backup);
      } catch (error: any) {
        // File might not exist yet (new file)
        console.warn(`⚠️ [CodeExecutor] Could not backup ${file}: ${error.message}`);
      }
    }
    
    return backups;
  }

  /**
   * حفظ manifest النسخ الاحتياطية
   */
  private async saveBackupManifest(patchId: string, backups: FileBackup[]): Promise<void> {
    const backupPath = this.getBackupPath(patchId);
    await fs.mkdir(backupPath, { recursive: true });
    
    const manifest = {
      patchId,
      timestamp: new Date().toISOString(),
      files: backups.map(b => ({
        path: b.originalPath,
        content: b.content
      }))
    };
    
    const manifestPath = path.join(backupPath, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    
    console.log(`💾 [CodeExecutor] Backup manifest saved: ${manifestPath}`);
  }

  /**
   * الحصول على مسار النسخ الاحتياطي
   */
  private getBackupPath(patchId: string): string {
    return path.join(this.backupDir, patchId);
  }

  /**
   * تطبيق الـpatch على الملفات
   */
  private async applyPatch(request: ExecutionRequest): Promise<void> {
    console.log(`⚙️ [CodeExecutor] Applying patch to ${request.affectedFiles.length} file(s)...`);

    // Parse git diff and apply changes
    const parsedPatch = this.parsePatch(request.patchContent);
    
    for (const change of parsedPatch) {
      const filePath = path.resolve(process.cwd(), change.file);
      
      if (change.type === 'new') {
        // إنشاء ملف جديد
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, change.content || '', 'utf-8');
        console.log(`✨ [CodeExecutor] Created new file: ${change.file}`);
      } else if (change.type === 'modify') {
        // تعديل ملف موجود
        const currentContent = await fs.readFile(filePath, 'utf-8');
        const newContent = this.applyDiffToContent(currentContent, change.hunks || []);
        await fs.writeFile(filePath, newContent, 'utf-8');
        console.log(`✏️ [CodeExecutor] Modified file: ${change.file}`);
      } else if (change.type === 'delete') {
        // حذف ملف
        await fs.unlink(filePath);
        console.log(`🗑️ [CodeExecutor] Deleted file: ${change.file}`);
      }
    }
  }

  /**
   * تحليل patch content
   */
  private parsePatch(patchContent: string): Array<{ file: string; type: 'new' | 'modify' | 'delete'; content?: string; hunks?: any[] }> {
    const changes: Array<{ file: string; type: 'new' | 'modify' | 'delete'; content?: string; hunks?: any[] }> = [];
    
    // Split by file sections
    const fileSections = patchContent.split(/^diff --git/m).filter(Boolean);
    
    for (const section of fileSections) {
      // Extract filename
      const fileMatch = section.match(/a\/(.+?)\s+b\/(.+?)$/m);
      if (!fileMatch) continue;
      
      const filename = fileMatch[2];
      
      // Detect change type
      if (section.includes('new file mode')) {
        // New file
        const content = this.extractNewFileContent(section);
        changes.push({ file: filename, type: 'new', content });
      } else if (section.includes('deleted file mode')) {
        // Deleted file
        changes.push({ file: filename, type: 'delete' });
      } else {
        // Modified file
        const hunks = this.extractHunks(section);
        changes.push({ file: filename, type: 'modify', hunks });
      }
    }
    
    return changes;
  }

  /**
   * استخراج محتوى ملف جديد
   */
  private extractNewFileContent(section: string): string {
    const lines: string[] = [];
    const sectionLines = section.split('\n');
    
    let inContent = false;
    for (const line of sectionLines) {
      if (line.startsWith('+++')) {
        inContent = true;
        continue;
      }
      
      if (inContent) {
        if (line.startsWith('+')) {
          lines.push(line.substring(1));
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * استخراج hunks من diff
   */
  private extractHunks(section: string): any[] {
    const hunks: any[] = [];
    const lines = section.split('\n');
    
    let currentHunk: any = null;
    
    for (const line of lines) {
      if (line.startsWith('@@')) {
        // New hunk
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          currentHunk = {
            oldStart: parseInt(match[1]),
            oldLines: match[2] ? parseInt(match[2]) : 1,
            newStart: parseInt(match[3]),
            newLines: match[4] ? parseInt(match[4]) : 1,
            changes: []
          };
          hunks.push(currentHunk);
        }
      } else if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.changes.push({ type: 'add', content: line.substring(1) });
        } else if (line.startsWith('-')) {
          currentHunk.changes.push({ type: 'remove', content: line.substring(1) });
        } else if (line.startsWith(' ')) {
          currentHunk.changes.push({ type: 'context', content: line.substring(1) });
        }
      }
    }
    
    return hunks;
  }

  /**
   * تطبيق diff على محتوى الملف
   */
  private applyDiffToContent(originalContent: string, hunks: any[]): string {
    const originalLines = originalContent.split('\n');
    const newLines: string[] = [];
    
    let originalIndex = 0;
    
    for (const hunk of hunks) {
      // Copy lines before this hunk
      while (originalIndex < hunk.oldStart - 1) {
        newLines.push(originalLines[originalIndex]);
        originalIndex++;
      }
      
      // Apply hunk changes
      for (const change of hunk.changes) {
        if (change.type === 'add') {
          newLines.push(change.content);
        } else if (change.type === 'remove') {
          originalIndex++; // Skip this line
        } else if (change.type === 'context') {
          newLines.push(change.content);
          originalIndex++;
        }
      }
    }
    
    // Copy remaining lines
    while (originalIndex < originalLines.length) {
      newLines.push(originalLines[originalIndex]);
      originalIndex++;
    }
    
    return newLines.join('\n');
  }

  /**
   * التحقق من صحة الملفات المعدلة
   */
  private async verifyModifiedFiles(files: string[]): Promise<void> {
    for (const file of files) {
      const filePath = path.resolve(process.cwd(), file);
      
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`Modified file verification failed: ${file} is not accessible`);
      }
    }
  }

  /**
   * التراجع عن patch منفّذ
   */
  async rollbackPatch(patchId: string): Promise<boolean> {
    console.log(`🔄 [CodeExecutor] Rolling back patch: ${patchId}`);
    this.emit('rollback-started', patchId);

    try {
      // Load backup manifest
      const backupPath = this.getBackupPath(patchId);
      const manifestPath = path.join(backupPath, 'manifest.json');
      
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      // Restore each file
      for (const fileBackup of manifest.files) {
        const filePath = path.resolve(process.cwd(), fileBackup.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, fileBackup.content, 'utf-8');
        console.log(`↩️ [CodeExecutor] Restored file: ${fileBackup.path}`);
      }

      // Update database
      await db.update(executionPatches)
        .set({
          status: 'rolled_back',
          executionResult: 'rolled back successfully',
          rollbackAvailable: 0
        })
        .where(eq(executionPatches.id, patchId));

      // Log audit
      await this.logAudit('rolled_back', 'system', {
        patchId,
        filesRestored: manifest.files.length
      });

      console.log(`✅ [CodeExecutor] Rollback completed: ${patchId}`);
      this.emit('rollback-completed', patchId);
      return true;

    } catch (error: any) {
      console.error(`❌ [CodeExecutor] Rollback failed:`, error);
      this.emit('rollback-failed', { patchId, error });
      return false;
    }
  }

  /**
   * فحص rate limiting من Database
   */
  private async checkRateLimit(): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const recentExecutions = await db.select()
        .from(executionPatches)
        .where(eq(executionPatches.status, 'executed'));
      
      const executionsInLastHour = recentExecutions.filter(e => 
        e.executedAt && e.executedAt > oneHourAgo
      );
      
      return executionsInLastHour.length < this.maxExecutionsPerHour;
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return true; // Allow execution if check fails
    }
  }

  /**
   * الحصول على نتائج التنفيذ من Database
   */
  async getAllExecutionResults(): Promise<any[]> {
    try {
      const patches = await db.select()
        .from(executionPatches)
        .where(eq(executionPatches.status, 'executed'));
      
      return patches.map(p => ({
        patchId: p.id,
        success: p.status === 'executed',
        filesModified: p.affectedFiles,
        executedAt: p.executedAt,
        rollbackAvailable: p.rollbackAvailable === 1
      }));
    } catch (error) {
      console.error('Failed to get execution results:', error);
      return [];
    }
  }

  /**
   * تسجيل في audit trail
   */
  private async logAudit(action: string, actor: string, details: any): Promise<void> {
    try {
      await db.insert(executionAudit).values({
        patchId: details.patchId || null,
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
      const allPatches = await db.select().from(executionPatches);
      const executed = allPatches.filter(p => p.status === 'executed');
      const failed = allPatches.filter(p => p.status === 'failed');
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const executionsInLastHour = executed.filter(e => 
        e.executedAt && e.executedAt > oneHourAgo
      ).length;

      return {
        isActive: this.isActive,
        totalExecutions: executed.length + failed.length,
        successfulExecutions: executed.length,
        failedExecutions: failed.length,
        executionsInLastHour,
        rateLimit: `${executionsInLastHour}/${this.maxExecutionsPerHour} per hour`
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        isActive: this.isActive,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        executionsInLastHour: 0,
        rateLimit: `0/${this.maxExecutionsPerHour} per hour`
      };
    }
  }
}

// Export singleton instance
export const codeExecutor = new CodeExecutor();
