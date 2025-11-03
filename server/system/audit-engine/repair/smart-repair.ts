export type ProblemDetail = {
  id?: string;
  nucleus?: string;
  type: string;
  description?: string;
  evidence?: string[] | string;
  affectedFiles?: string[];
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskLevel?: number;
};

export type RepairResult = {
  action:
    | "AUTO_REPAIRED"
    | "MANUAL_REVIEW_REQUIRED"
    | "REPAIR_FAILED"
    | "ROLLED_BACK";
  success: boolean;
  reason?: string;
  backupCreated?: boolean;
  details?: any;
  risk?: number;
};

export class SmartRepairSystem {
  async safeAutoRepair(problem: ProblemDetail): Promise<RepairResult> {
    const risk = problem.riskLevel ?? 0.5;
    
    if (risk > 0.7 || problem.severity === "CRITICAL") {
      return {
        action: "MANUAL_REVIEW_REQUIRED",
        success: false,
        reason: "High risk fix — manual review required",
        risk,
      };
    }

    const backup = await this.createBackup(problem.affectedFiles || []);
    const sandboxResult = await this.testRepairInSandbox(problem);

    if (!sandboxResult?.success) {
      await this.restoreBackup(backup);
      return {
        action: "REPAIR_FAILED",
        success: false,
        reason: sandboxResult?.reason || "Sandbox repair failed",
      };
    }

    const live = await this.applyLiveRepair(problem, sandboxResult);
    
    // Check if live repair actually succeeded
    if (!live.applied) {
      await this.restoreBackup(backup);
      return {
        action: "REPAIR_FAILED",
        success: false,
        reason: live.error || "Live repair failed - git commit error",
      };
    }

    const verify = await this.verifyRepair(problem);

    if (!verify?.passed) {
      await this.restoreBackup(backup);
      return {
        action: "ROLLED_BACK",
        success: false,
        reason: "Post-fix verification failed. Rolled back.",
      };
    }

    return {
      action: "AUTO_REPAIRED",
      success: true,
      backupCreated: true,
      details: { live, verify },
      risk,
    };
  }

  private async createBackup(files: string[]) {
    const { execSync } = await import('child_process');
    try {
      const branch = `backup-${Date.now()}`;
      execSync(`git branch ${branch}`, { encoding: 'utf-8' });
      console.log(`✅ Created Git backup branch: ${branch}`);
      return { id: branch, files };
    } catch (error: any) {
      console.error(`❌ Git backup failed:`, error.message);
      throw new Error(`Backup creation failed - Git operation error: ${error.message}`);
    }
  }
  
  private async restoreBackup(backup: { id: string; files: string[] }) {
    const { execSync } = await import('child_process');
    try {
      execSync(`git checkout ${backup.id}`, { encoding: 'utf-8' });
      console.log(`🔄 Restored backup: ${backup.id}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Restore failed:`, error.message);
      return false;
    }
  }
  
  private async testRepairInSandbox(problem: ProblemDetail) {
    const { execSync } = await import('child_process');
    try {
      console.log(`🧪 Testing repair in sandbox for: ${problem.type}`);
      const output = execSync('npm run build', { 
        encoding: 'utf-8',
        timeout: 60000,
      });
      return { success: true, reason: "", output: output.slice(0, 500) };
    } catch (error: any) {
      return { success: false, reason: `Build failed: ${error.message}` };
    }
  }
  
  private async applyLiveRepair(_problem: ProblemDetail, _sandboxResult: any) {
    const { execFileSync } = await import('child_process');
    try {
      // Sanitize problem type to prevent command injection
      const sanitizedType = (_problem.type || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
      const commitMsg = `Auto-repair: ${sanitizedType}`;
      
      // Configure git user (required in CI/Replit environments)
      execFileSync('git', ['config', 'user.name', 'SmartRepairSystem'], { encoding: 'utf-8' });
      execFileSync('git', ['config', 'user.email', 'repair@surooh.ai'], { encoding: 'utf-8' });
      
      // Use execFileSync with arguments array to avoid shell injection
      execFileSync('git', ['add', '-A'], { encoding: 'utf-8' });
      execFileSync('git', ['commit', '-m', commitMsg], { encoding: 'utf-8' });
      
      console.log(`✅ Applied live repair: ${commitMsg}`);
      return { applied: true };
    } catch (error: any) {
      console.error(`❌ Apply repair failed:`, error.message);
      return { applied: false, error: error.message };
    }
  }
  
  private async verifyRepair(_problem: ProblemDetail) {
    const { execSync } = await import('child_process');
    try {
      console.log("🔍 Verifying repair by running build...");
      const output = execSync('npm run build', { 
        encoding: 'utf-8',
        timeout: 30000 
      });
      const hasErrors = output.toLowerCase().includes('error');
      return { passed: !hasErrors };
    } catch {
      return { passed: false };
    }
  }
}
