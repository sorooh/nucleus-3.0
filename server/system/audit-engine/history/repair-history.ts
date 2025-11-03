// RepairHistory — signed repair log + trust score calculation

import crypto from "crypto";

export type RepairLogEntry = {
  id?: string;
  timestamp?: Date;
  programmerId: string;
  nucleus?: string;
  problemId?: string;
  action: "FIXED" | "FAILED" | "ROLLED_BACK" | "DEFERRAL";
  description?: string;
  signature?: { algorithm: string; value: string };
};

export type ProgrammerReport = {
  programmer: string;
  totalProblems: number;
  fixedProblems: number;
  repeatedMistakes: string[];
  trustScore: number; // 0..1
  recentActivity: RepairLogEntry[];
};

export class RepairHistory {
  private repairLog: RepairLogEntry[] = [];

  async logRepairAction(entry: RepairLogEntry): Promise<void> {
    const full: RepairLogEntry = {
      ...entry,
      id: entry.id || `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    };
    full.signature = await this.signEntry(full);
    this.repairLog.push(full);
    // TODO: persist to DB/append-only log
  }

  async getProgrammerReport(programmerId: string): Promise<ProgrammerReport> {
    const list = this.repairLog.filter(e => e.programmerId === programmerId);
    const fixed = list.filter(e => e.action === "FIXED").length;
    const repeated = this.findRepeatedMistakes(list);
    const trust = this.calculateTrustScore(list);
    return {
      programmer: programmerId,
      totalProblems: list.length,
      fixedProblems: fixed,
      repeatedMistakes: repeated,
      trustScore: trust,
      recentActivity: list.slice(-10),
    };
  }

  private findRepeatedMistakes(entries: RepairLogEntry[]): string[] {
    const counter: Record<string, number> = {};
    for (const e of entries) {
      const key = `${e.nucleus || "core"}:${e.action}`;
      counter[key] = (counter[key] ?? 0) + 1;
    }
    return Object.entries(counter)
      .filter(([, c]) => c >= 3)
      .map(([k]) => k);
  }

  private calculateTrustScore(entries: RepairLogEntry[]): number {
    if (entries.length === 0) return 1.0;
    const fixed = entries.filter(e => e.action === "FIXED").length;
    const failed = entries.filter(e => e.action === "FAILED" || e.action === "ROLLED_BACK").length;
    const deferrals = entries.filter(e => e.action === "DEFERRAL").length;

    // base: fixed rate
    let score = fixed / entries.length;
    // penalties
    score -= failed * 0.05;
    score -= deferrals * 0.02;

    return Math.max(0, Math.min(1, score));
  }

  private async signEntry(e: RepairLogEntry) {
    const stamp = JSON.stringify({ ...e, signature: undefined });
    const sha256 = crypto.createHash("sha256").update(stamp).digest("hex");
    return { algorithm: "SHA-256", value: sha256 };
  }
}
