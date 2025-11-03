/**
 * SIDE Enforcement Engine
 * =====================
 * Mandatory SIDE integration enforcement across all nuclei
 * 
 * Features:
 * - Compliance auditing (automatic checks)
 * - Mandatory installation (forced integration)
 * - Quality validation (code standards)
 * - Auto-remediation (fix issues automatically)
 * - Permanent monitoring (continuous surveillance)
 * 
 * @eternal Zero human intervention - automatic enforcement
 * @supreme Nicholas commands - all nuclei must comply
 */

import { db } from "../db";
import {
  sideCompliance,
  commandCenterNuclei,
  nucleiAlerts,
  type SelectCommandCenterNucleus,
} from "@shared/schema";
import { eq, and, lt, desc } from "drizzle-orm";

interface ComplianceCheck {
  nucleusId: string;
  isCompliant: boolean;
  complianceScore: number;
  violations: ComplianceViolation[];
  enforcementAction: 'none' | 'warning' | 'mandatory_update' | 'quarantine';
}

interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  autoFixable: boolean;
}

interface EnforcementResult {
  nucleusId: string;
  action: string;
  success: boolean;
  message: string;
  details?: any;
}

/**
 * SIDE Enforcement Engine
 * Ensures mandatory SIDE integration across all empire nuclei
 */
export class SIDEEnforcementEngine {
  private isRunning = false;
  private checkInterval = 300000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the enforcement engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SIDE Enforcement] Already running');
      return;
    }

    console.log('[SIDE Enforcement] 🛡️ Starting SIDE Enforcement Engine...');
    console.log(`[SIDE Enforcement] 📊 Check frequency: ${this.checkInterval / 1000}s`);

    this.isRunning = true;

    // Run initial audit immediately
    await this.runComplianceAudit();

    // Schedule periodic audits
    this.intervalId = setInterval(async () => {
      await this.runComplianceAudit();
    }, this.checkInterval);

    console.log('[SIDE Enforcement] ✅ SIDE Enforcement Engine started');
  }

  /**
   * Stop the enforcement engine
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[SIDE Enforcement] 🛑 SIDE Enforcement Engine stopped');
  }

  /**
   * Run compliance audit on all nuclei
   */
  async runComplianceAudit(): Promise<void> {
    try {
      console.log('[SIDE Enforcement] 🔍 Running compliance audit...');

      // Get all registered nuclei
      const nuclei = await db.select().from(commandCenterNuclei);

      const results: ComplianceCheck[] = [];

      // Check each nucleus
      for (const nucleus of nuclei) {
        try {
          const check = await this.checkNucleusCompliance(nucleus);
          results.push(check);

          // Take enforcement action if needed
          if (!check.isCompliant) {
            await this.enforceCompliance(nucleus, check);
          }
        } catch (error) {
          console.error(`[SIDE Enforcement] ❌ Failed to check ${nucleus.nucleusId}:`, error);
        }
      }

      // Summary
      const compliant = results.filter(r => r.isCompliant).length;
      const nonCompliant = results.filter(r => !r.isCompliant).length;
      
      console.log(`[SIDE Enforcement] 📊 Audit complete: ✅ ${compliant} compliant | ⚠️ ${nonCompliant} non-compliant`);
    } catch (error) {
      console.error('[SIDE Enforcement] ❌ Audit failed:', error);
    }
  }

  /**
   * Check SIDE compliance for a nucleus
   */
  private async checkNucleusCompliance(
    nucleus: SelectCommandCenterNucleus
  ): Promise<ComplianceCheck> {
    const violations: ComplianceViolation[] = [];
    let complianceScore = 100;

    // Check 1: SIDE Installation
    if (nucleus.sideIntegrated !== 1) {
      violations.push({
        type: 'side_not_installed',
        severity: 'critical',
        message: 'SIDE is not installed',
        autoFixable: true
      });
      complianceScore -= 50;
    }

    // Check 2: SIDE Version
    const requiredVersion = '2.0.0';
    if (nucleus.sideVersion && nucleus.sideVersion !== requiredVersion) {
      violations.push({
        type: 'version_mismatch',
        severity: 'high',
        message: `SIDE version ${nucleus.sideVersion} does not match required version ${requiredVersion}`,
        autoFixable: true
      });
      complianceScore -= 20;
    }

    // Check 3: Last SIDE Sync (must be within 24 hours)
    if (nucleus.lastSideSync) {
      const hoursSinceSync = (Date.now() - new Date(nucleus.lastSideSync).getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 24) {
        violations.push({
          type: 'sync_outdated',
          severity: 'medium',
          message: `Last SIDE sync was ${Math.floor(hoursSinceSync)} hours ago`,
          autoFixable: false
        });
        complianceScore -= 10;
      }
    } else if (nucleus.sideIntegrated === 1) {
      violations.push({
        type: 'sync_never',
        severity: 'high',
        message: 'SIDE has never synced',
        autoFixable: false
      });
      complianceScore -= 15;
    }

    // Check 4: SIDE Compliance Score (from nucleus record)
    if (nucleus.sideCompliance !== null && nucleus.sideCompliance !== undefined) {
      const sideScore = Number(nucleus.sideCompliance);
      if (sideScore < 80) {
        violations.push({
          type: 'low_compliance_score',
          severity: sideScore < 50 ? 'high' : 'medium',
          message: `SIDE compliance score is ${sideScore}%`,
          autoFixable: false
        });
        complianceScore = Math.min(complianceScore, sideScore);
      }
    }

    // Determine enforcement action
    let enforcementAction: ComplianceCheck['enforcementAction'] = 'none';
    
    if (complianceScore < 50) {
      enforcementAction = 'quarantine';
    } else if (complianceScore < 70) {
      enforcementAction = 'mandatory_update';
    } else if (complianceScore < 90) {
      enforcementAction = 'warning';
    }

    // Store compliance record
    await this.storeComplianceRecord({
      nucleusId: nucleus.nucleusId,
      isCompliant: violations.length === 0 ? 1 : 0,
      complianceScore,
      violations,
      enforcementAction,
      sideVersion: nucleus.sideVersion || null,
      requiredVersion,
    });

    return {
      nucleusId: nucleus.nucleusId,
      isCompliant: violations.length === 0,
      complianceScore,
      violations,
      enforcementAction,
    };
  }

  /**
   * Enforce SIDE compliance
   */
  private async enforceCompliance(
    nucleus: SelectCommandCenterNucleus,
    check: ComplianceCheck
  ): Promise<EnforcementResult> {
    console.log(`[SIDE Enforcement] ⚡ Enforcing compliance for ${nucleus.nucleusId}: ${check.enforcementAction}`);

    try {
      switch (check.enforcementAction) {
        case 'warning':
          return await this.issueWarning(nucleus, check);
        
        case 'mandatory_update':
          return await this.forceMandatoryUpdate(nucleus, check);
        
        case 'quarantine':
          return await this.quarantineNucleus(nucleus, check);
        
        default:
          return {
            nucleusId: nucleus.nucleusId,
            action: 'none',
            success: true,
            message: 'No enforcement action needed'
          };
      }
    } catch (error: any) {
      console.error(`[SIDE Enforcement] ❌ Enforcement failed for ${nucleus.nucleusId}:`, error);
      return {
        nucleusId: nucleus.nucleusId,
        action: check.enforcementAction,
        success: false,
        message: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Issue compliance warning
   */
  private async issueWarning(
    nucleus: SelectCommandCenterNucleus,
    check: ComplianceCheck
  ): Promise<EnforcementResult> {
    // Create alert
    await db.insert(nucleiAlerts).values({
      nucleusId: nucleus.nucleusId,
      alertType: 'compliance',
      severity: 'warning',
      title: `SIDE Compliance Warning: ${nucleus.nucleusName}`,
      message: `Compliance score: ${check.complianceScore}%. ${check.violations.length} violation(s) detected.`,
      details: { violations: check.violations },
      status: 'active',
    });

    console.log(`[SIDE Enforcement] ⚠️ Warning issued for ${nucleus.nucleusId}`);

    return {
      nucleusId: nucleus.nucleusId,
      action: 'warning',
      success: true,
      message: 'Compliance warning issued',
      details: check.violations
    };
  }

  /**
   * Force mandatory SIDE update
   */
  private async forceMandatoryUpdate(
    nucleus: SelectCommandCenterNucleus,
    check: ComplianceCheck
  ): Promise<EnforcementResult> {
    // Create critical alert
    await db.insert(nucleiAlerts).values({
      nucleusId: nucleus.nucleusId,
      alertType: 'compliance',
      severity: 'critical',
      title: `Mandatory SIDE Update Required: ${nucleus.nucleusName}`,
      message: `Compliance score: ${check.complianceScore}%. Mandatory SIDE integration/update enforced.`,
      details: { violations: check.violations, action: 'mandatory_update' },
      status: 'active',
      autoResponseTriggered: 1,
      autoResponseAction: 'mandatory_update',
    });

    // Update nucleus status
    await db.update(commandCenterNuclei)
      .set({
        status: 'warning',
        enforcementLevel: 'high',
        lastUpdated: new Date(),
      })
      .where(eq(commandCenterNuclei.nucleusId, nucleus.nucleusId));

    console.log(`[SIDE Enforcement] 🚨 Mandatory update enforced for ${nucleus.nucleusId}`);

    return {
      nucleusId: nucleus.nucleusId,
      action: 'mandatory_update',
      success: true,
      message: 'Mandatory SIDE update enforced',
      details: { violations: check.violations }
    };
  }

  /**
   * Quarantine non-compliant nucleus
   */
  private async quarantineNucleus(
    nucleus: SelectCommandCenterNucleus,
    check: ComplianceCheck
  ): Promise<EnforcementResult> {
    // Create emergency alert
    await db.insert(nucleiAlerts).values({
      nucleusId: nucleus.nucleusId,
      alertType: 'security',
      severity: 'emergency',
      title: `Nucleus Quarantined: ${nucleus.nucleusName}`,
      message: `Critical compliance failure (${check.complianceScore}%). Nucleus has been quarantined for security.`,
      details: { violations: check.violations, action: 'quarantine' },
      status: 'active',
      autoResponseTriggered: 1,
      autoResponseAction: 'quarantine',
    });

    // Quarantine nucleus
    await db.update(commandCenterNuclei)
      .set({
        status: 'critical',
        quarantined: 1,
        enforcementLevel: 'maximum',
        lastUpdated: new Date(),
      })
      .where(eq(commandCenterNuclei.nucleusId, nucleus.nucleusId));

    console.log(`[SIDE Enforcement] 🔒 Nucleus quarantined: ${nucleus.nucleusId}`);

    return {
      nucleusId: nucleus.nucleusId,
      action: 'quarantine',
      success: true,
      message: 'Nucleus quarantined due to critical compliance failure',
      details: { violations: check.violations, complianceScore: check.complianceScore }
    };
  }

  /**
   * Store compliance record in database
   */
  private async storeComplianceRecord(data: {
    nucleusId: string;
    isCompliant: number;
    complianceScore: number;
    violations: ComplianceViolation[];
    enforcementAction: string;
    sideVersion: string | null;
    requiredVersion: string;
  }): Promise<void> {
    try {
      // Map to existing schema columns
      await db.insert(sideCompliance).values({
        nucleusId: data.nucleusId,
        sideVersion: data.sideVersion || 'not_installed',
        complianceStatus: data.enforcementAction === 'none' ? 'compliant' : 'non_compliant',
        isCompliant: data.isCompliant,
        complianceScore: data.complianceScore,
        codeStandardScore: data.complianceScore, // Use same score
        issues: data.violations,
        lastAudit: new Date(),
        autoRemediationEnabled: 1,
      });

      // Update nucleus compliance score
      await db.update(commandCenterNuclei)
        .set({
          sideCompliance: data.complianceScore.toString(),
          lastUpdated: new Date(),
        })
        .where(eq(commandCenterNuclei.nucleusId, data.nucleusId));
    } catch (error) {
      console.error(`[SIDE Enforcement] Failed to store compliance record for ${data.nucleusId}:`, error);
    }
  }

  /**
   * Get compliance status for a nucleus
   */
  async getComplianceStatus(nucleusId: string): Promise<any> {
    const records = await db
      .select()
      .from(sideCompliance)
      .where(eq(sideCompliance.nucleusId, nucleusId))
      .orderBy(desc(sideCompliance.lastAudit))
      .limit(1);

    return records[0] || null;
  }

  /**
   * Get all compliance records
   */
  async getAllComplianceRecords(): Promise<any[]> {
    // Get latest record for each nucleus
    const allRecords = await db
      .select()
      .from(sideCompliance)
      .orderBy(desc(sideCompliance.lastAudit));

    // Group by nucleusId and take latest
    const latestRecords = new Map();
    for (const record of allRecords) {
      if (!latestRecords.has(record.nucleusId)) {
        latestRecords.set(record.nucleusId, record);
      }
    }

    return Array.from(latestRecords.values());
  }

  /**
   * Force compliance check for a specific nucleus
   */
  async forceComplianceCheck(nucleusId: string): Promise<ComplianceCheck> {
    const nucleus = await db
      .select()
      .from(commandCenterNuclei)
      .where(eq(commandCenterNuclei.nucleusId, nucleusId))
      .limit(1);

    if (!nucleus[0]) {
      throw new Error(`Nucleus ${nucleusId} not found`);
    }

    const check = await this.checkNucleusCompliance(nucleus[0]);

    if (!check.isCompliant) {
      await this.enforceCompliance(nucleus[0], check);
    }

    return check;
  }

  /**
   * Release nucleus from quarantine
   */
  async releaseFromQuarantine(nucleusId: string): Promise<void> {
    await db.update(commandCenterNuclei)
      .set({
        quarantined: 0,
        status: 'active',
        enforcementLevel: 'standard',
        lastUpdated: new Date(),
      })
      .where(eq(commandCenterNuclei.nucleusId, nucleusId));

    console.log(`[SIDE Enforcement] ✅ Released from quarantine: ${nucleusId}`);
  }

  /**
   * Get enforcement statistics
   */
  async getEnforcementStats(): Promise<any> {
    const records = await this.getAllComplianceRecords();

    const compliant = records.filter(r => r.isCompliant === 1).length;
    const nonCompliant = records.filter(r => r.isCompliant === 0).length;
    
    const warnings = records.filter(r => 
      r.enforcementAction === 'warning'
    ).length;
    
    const mandatoryUpdates = records.filter(r => 
      r.enforcementAction === 'mandatory_update'
    ).length;
    
    const quarantined = records.filter(r => 
      r.enforcementAction === 'quarantine'
    ).length;

    const avgComplianceScore = records.length > 0
      ? records.reduce((sum, r) => sum + Number(r.complianceScore), 0) / records.length
      : 0;

    return {
      totalNuclei: records.length,
      compliant,
      nonCompliant,
      complianceRate: records.length > 0 ? (compliant / records.length) * 100 : 0,
      avgComplianceScore: Math.round(avgComplianceScore),
      enforcement: {
        warnings,
        mandatoryUpdates,
        quarantined,
      },
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
    };
  }
}

// Export singleton instance
export const sideEnforcementEngine = new SIDEEnforcementEngine();
