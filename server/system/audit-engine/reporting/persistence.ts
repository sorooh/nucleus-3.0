import crypto from "crypto";
import type { AuditReport } from "../types";

export async function signReport(report: AuditReport): Promise<AuditReport> {
  const stamp = JSON.stringify(report);
  const sha256 = crypto.createHash("sha256").update(stamp).digest("hex");
  
  return {
    ...report,
    signature: {
      algorithm: "SHA-256",
      value: sha256
    },
    signedAt: new Date()
  };
}

export async function persistAudit(report: AuditReport): Promise<void> {
  console.log("🧾 Persisting audit report:", report?.signature?.value);
}
