// LiarAlerts — immediate notifications to developers on fake data detection

type Alert = {
  to: string;                 // dev email or handle
  subject: string;
  message: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  actions?: { text: string; url: string }[];
};

export class LiarAlerts {
  async sendImmediateAlert(problem: {
    id?: string;
    nucleus?: string;
    description?: string;
    severity?: string;
    evidence?: string[] | string;
    affectedFiles?: string[];
  }, programmer: string): Promise<void> {
    const alert: Alert = {
      to: programmer,
      subject: "🚨 Fake/Illusionary Data Detected",
      message: this.createAlertMessage(problem),
      urgency: problem.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
      actions: [
        { text: "Open Problem", url: `/audit/problems/${problem.id || ""}` },
        { text: "Repair Guide", url: `/repair-guide/${problem?.id || "generic"}` },
      ],
    };
    await this.sendAlert(alert);
  }

  private createAlertMessage(p: any) {
    const files = Array.isArray(p?.affectedFiles) ? p.affectedFiles.join(", ") : "N/A";
    const ev = Array.isArray(p?.evidence) ? p.evidence.join("\n- ") : (p?.evidence || "N/A");
    return [
      "A fake/demo pattern was detected in your code:",
      "",
      `• Nucleus:    ${p?.nucleus || "N/A"}`,
      `• Files:      ${files}`,
      `• Severity:   ${p?.severity || "N/A"}`,
      `• Problem:    ${p?.description || "N/A"}`,
      "",
      "Evidence:",
      `- ${ev}`,
      "",
      "Actions required:",
      "1) Fix the problem honestly using real data flows.",
      "2) Re-run the audit before submitting.",
      "3) Ensure no static/mock responses remain in production paths.",
    ].join("\n");
  }

  // ── Real alert system: WebSocket broadcast + console log
  private async sendAlert(alert: Alert) {
    console.log("📣 LiarAlert =>", alert.to, alert.subject);
    
    // Broadcast to WebSocket clients (real-time dashboard notifications)
    try {
      const { wsBus } = await import('../../../transport/ws-bus');
      wsBus.broadcast({
        type: 'LIAR_ALERT',
        alert: {
          to: alert.to,
          subject: alert.subject,
          message: alert.message,
          urgency: alert.urgency,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Failed to broadcast alert via WebSocket:', error);
    }

    // TODO: Add email/Slack integration here when API keys are configured
    // Environment variables needed: ALERT_EMAIL or SLACK_WEBHOOK_URL
    if (process.env.ALERT_EMAIL) {
      // Send email via nodemailer or similar
      console.log(`Would send email to: ${process.env.ALERT_EMAIL}`);
    }
    
    if (process.env.SLACK_WEBHOOK_URL) {
      // Send Slack notification
      console.log(`Would send Slack notification to webhook`);
    }
  }
}
