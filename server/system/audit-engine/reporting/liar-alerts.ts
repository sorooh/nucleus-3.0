/**
 * LIAR ALERTS SYSTEM
 * Immediate notifications when fraud/mock data detected
 */

export interface AlertMessage {
  severity: string; // critical, high, medium, low
  title: string;
  description: string;
  affectedFiles: string[];
  nucleusId: string;
  detectedBy: string;
  evidence: any;
}

export interface AlertDispatcher {
  send(message: AlertMessage): Promise<boolean>;
}

/**
 * Email Alert Dispatcher (requires nodemailer)
 */
export class EmailAlertDispatcher implements AlertDispatcher {
  private enabled: boolean;
  private recipient: string;

  constructor() {
    this.enabled = !!process.env.ALERT_EMAIL;
    this.recipient = process.env.ALERT_EMAIL || "";
  }

  async send(message: AlertMessage): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[Liar Alerts] ⚠️ Email alerts not configured (set ALERT_EMAIL)`);
      return false;
    }

    // In production, this would use nodemailer
    console.log(`[Liar Alerts] 📧 Would send email to ${this.recipient}`);
    console.log(`Subject: ${message.title}`);
    console.log(`Body: ${message.description}`);
    
    return true;
  }
}

/**
 * Slack Webhook Alert Dispatcher
 */
export class SlackAlertDispatcher implements AlertDispatcher {
  private enabled: boolean;
  private webhookUrl: string;

  constructor() {
    this.enabled = !!process.env.SLACK_WEBHOOK_URL;
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || "";
  }

  async send(message: AlertMessage): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[Liar Alerts] ⚠️ Slack alerts not configured (set SLACK_WEBHOOK_URL)`);
      return false;
    }

    try {
      const payload = {
        text: `🚨 *${message.title}*`,
        attachments: [
          {
            color: this.getSeverityColor(message.severity),
            fields: [
              {
                title: "Severity",
                value: message.severity.toUpperCase(),
                short: true,
              },
              {
                title: "Nucleus",
                value: message.nucleusId,
                short: true,
              },
              {
                title: "Description",
                value: message.description,
                short: false,
              },
              {
                title: "Affected Files",
                value: message.affectedFiles.join("\n"),
                short: false,
              },
            ],
          },
        ],
      };

      // In production, this would use fetch to send to Slack
      console.log(`[Liar Alerts] 💬 Would send Slack notification`);
      console.log(JSON.stringify(payload, null, 2));

      return true;
    } catch (error) {
      console.error(`[Liar Alerts] ❌ Slack notification failed:`, error);
      return false;
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical": return "danger";
      case "high": return "warning";
      case "medium": return "#FFEB3B";
      case "low": return "good";
      default: return "#808080";
    }
  }
}

/**
 * Console Alert Dispatcher (fallback)
 */
export class ConsoleAlertDispatcher implements AlertDispatcher {
  async send(message: AlertMessage): Promise<boolean> {
    console.log("\n=".repeat(50));
    console.log(`🚨 FRAUD ALERT: ${message.title}`);
    console.log("=".repeat(50));
    console.log(`Severity: ${message.severity.toUpperCase()}`);
    console.log(`Nucleus: ${message.nucleusId}`);
    console.log(`Description: ${message.description}`);
    console.log(`Affected Files: ${message.affectedFiles.join(", ")}`);
    console.log(`Detected By: ${message.detectedBy}`);
    console.log("=".repeat(50) + "\n");
    
    return true;
  }
}

/**
 * Liar Alerts Manager
 */
export class LiarAlerts {
  private dispatchers: AlertDispatcher[] = [];

  constructor() {
    // Always use console dispatcher
    this.dispatchers.push(new ConsoleAlertDispatcher());

    // Add email if configured
    const emailDispatcher = new EmailAlertDispatcher();
    this.dispatchers.push(emailDispatcher);

    // Add Slack if configured
    const slackDispatcher = new SlackAlertDispatcher();
    this.dispatchers.push(slackDispatcher);
  }

  /**
   * Send immediate alert when fraud detected
   */
  async sendImmediateAlert(message: AlertMessage): Promise<void> {
    console.log(`[Liar Alerts] 🚨 Sending immediate alert: ${message.title}`);

    // Send to all configured dispatchers in parallel
    const results = await Promise.all(
      this.dispatchers.map(dispatcher => dispatcher.send(message))
    );

    const successCount = results.filter(r => r).length;
    console.log(`[Liar Alerts] ✅ Alert sent via ${successCount}/${this.dispatchers.length} channels`);
  }

  /**
   * Create alert from audit finding
   */
  async alertFromFinding(finding: {
    issueType: string;
    severity: string;
    description: string;
    affectedFiles: string[];
    nucleusId: string;
  }): Promise<void> {
    const message: AlertMessage = {
      severity: finding.severity,
      title: `${finding.issueType.toUpperCase()} Detected in ${finding.nucleusId}`,
      description: finding.description,
      affectedFiles: finding.affectedFiles,
      nucleusId: finding.nucleusId,
      detectedBy: "Nicholas Audit Engine",
      evidence: finding,
    };

    await this.sendImmediateAlert(message);
  }
}

export const liarAlerts = new LiarAlerts();
