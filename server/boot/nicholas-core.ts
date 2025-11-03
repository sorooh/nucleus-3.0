// Wire the detection and repair engines into Nicholas' lifecycle
import type { AuditConfig, AuditReport } from "../system/audit-engine/types";
import { SafeAuditEngine } from "../system/audit-engine/core/validator";
import { LieDetectorReport } from "../system/audit-engine/reporting/lie-detector-report";
import { IntelligentRepairEngine } from "../system/audit-engine/core/repair-engine";
import { MultiLayerMonitor } from "../system/audit-engine/monitoring/multi-layer-monitor";
import { signReport, persistAudit } from "../system/audit-engine/reporting/persistence";

export class NicholasCore {
  private audit = new SafeAuditEngine();
  private lieReport = new LieDetectorReport();
  private repair = new IntelligentRepairEngine();
  private monitor = new MultiLayerMonitor();
  private ready = false;
  private wsCallback: ((payload: any) => void) | null = null;

  setWsCallback(callback: (payload: any) => void) {
    this.wsCallback = callback;
  }

  private broadcast(payload: any) {
    if (this.wsCallback) {
      this.wsCallback(payload);
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.monitor.startComprehensiveMonitoring();
      this.ready = true;
      this.broadcast({ type: "NICHOLAS_READY" });
      console.log("✅ Nicholas Core boot: audit+repair engines mounted.");
    } catch (e) {
      console.error("❌ Nicholas initialization failed:", e);
      this.broadcast({ type: "NICHOLAS_SAFE_MODE", error: String(e) });
    }
  }

  isReady() {
    return this.ready;
  }

  async runFullAudit(config: AuditConfig): Promise<AuditReport> {
    // 1) Safe audit (foundation/logic/data/integration)
    const baseReport = await this.audit.runSafeAudit(config);

    // 2) Lie/Fraud/Illusion synthesis (fake UI, fake API, mock DB, etc.)
    const truth = await this.lieReport.generateLieReport();

    // 3) Attempt safe auto-repair for each confirmed issue
    const repairs = [];
    if (truth?.detailedFindings?.length) {
      for (const finding of truth.detailedFindings) {
        if (finding?.isFake || finding?.severity === "CRITICAL") {
          const proposal = await this.repair.proposeSafeFix({
            type: finding.type || "UNKNOWN",
            description: finding.description || "Detected inconsistency",
            evidence: finding.evidence,
            location: finding.endpoint || finding.files || [],
          } as any);
          repairs.push({ finding, proposal });
        }
      }
    }

    // 4) Sign + persist + broadcast
    const signed = await signReport({ ...baseReport, truth, repairs });
    await persistAudit(signed);
    this.broadcast({ type: "AUDIT_COMPLETED", payload: signed });

    return signed;
  }
}

// Singleton for the app
export const Nicholas = new NicholasCore();
