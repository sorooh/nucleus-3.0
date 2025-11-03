/**
 * Orchestrator - منسّق العمليات التنفيذية
 * Phase 5.1 → 7.0: Assisted Execution Layer
 * 
 * ينسّق بين Patch Generator, Validator, Code Executor
 */

import { EventEmitter } from 'events';
import { patchGenerator } from '../patch-generator';
import { validator } from '../validator';
import { codeExecutor } from '../code-executor';
import { buildMonitor } from '../build-monitor';

interface OrchestratorStatus {
  isActive: boolean;
  patchGenerator: any;
  validator: any;
  codeExecutor: any;
  buildMonitor: any;
}

export class Orchestrator extends EventEmitter {
  private isActive: boolean = false;

  constructor() {
    super();
    console.log('🎭 [Orchestrator] Initializing execution orchestrator...');
  }

  /**
   * تفعيل كل الأنظمة
   */
  async activate(): Promise<void> {
    console.log('🎭 [Orchestrator] Activating all execution systems...');

    await patchGenerator.activate();
    await validator.activate();
    await codeExecutor.activate();
    await buildMonitor.activate();

    this.isActive = true;
    console.log('✅ [Orchestrator] All execution systems activated');
    this.emit('activated');
  }

  /**
   * تعطيل كل الأنظمة
   */
  async deactivate(): Promise<void> {
    console.log('🎭 [Orchestrator] Deactivating all execution systems...');

    patchGenerator.deactivate();
    validator.deactivate();
    codeExecutor.deactivate();
    buildMonitor.deactivate();

    this.isActive = false;
    this.emit('deactivated');
  }

  /**
   * معالجة مشكلة من البداية للنهاية
   * Issue → Patch → Validate → Queue for Approval
   */
  async processIssue(issue: any): Promise<any> {
    if (!this.isActive) {
      throw new Error('Orchestrator is not active');
    }

    console.log(`🎭 [Orchestrator] Processing issue: ${issue.id}`);
    this.emit('issue-processing-started', issue.id);

    try {
      // 1. توليد Patch
      const patch = await patchGenerator.generatePatch({ issue });
      console.log(`✅ [Orchestrator] Patch generated: ${patch.id}`);

      // 2. التحقق من الـPatch
      const validationResult = await validator.validatePatch({
        patchId: patch.id,
        patchContent: patch.patchContent,
        affectedFiles: patch.affectedFiles
      });
      console.log(`✅ [Orchestrator] Validation completed: ${validationResult.passed ? 'PASSED' : 'FAILED'} (${validationResult.score}/100)`);

      // 3. إذا نجح التحقق، إضافته لطابور الموافقة
      if (validationResult.passed) {
        this.emit('patch-ready-for-approval', {
          patch,
          validationResult
        });
        
        return {
          success: true,
          patch,
          validationResult,
          status: 'pending_approval'
        };
      } else {
        this.emit('patch-validation-failed', {
          patch,
          validationResult
        });

        return {
          success: false,
          patch,
          validationResult,
          status: 'validation_failed'
        };
      }

    } catch (error: any) {
      console.error(`❌ [Orchestrator] Error processing issue:`, error);
      this.emit('issue-processing-error', { issueId: issue.id, error });
      
      return {
        success: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * تنفيذ patch معتمد
   */
  async executePatch(patchId: string, patchContent: string, affectedFiles: string[], approvedBy: string): Promise<any> {
    if (!this.isActive) {
      throw new Error('Orchestrator is not active');
    }

    console.log(`🎭 [Orchestrator] Executing approved patch: ${patchId}`);
    
    const result = await codeExecutor.executePatch({
      patchId,
      patchContent,
      affectedFiles,
      approvedBy
    });

    return result;
  }

  /**
   * الحصول على الحالة الكاملة
   */
  getStatus(): OrchestratorStatus {
    return {
      isActive: this.isActive,
      patchGenerator: patchGenerator.getStatus(),
      validator: validator.getStatus(),
      codeExecutor: codeExecutor.getStatus(),
      buildMonitor: buildMonitor.getStatus()
    };
  }
}

// Export singleton instance
export const orchestrator = new Orchestrator();
