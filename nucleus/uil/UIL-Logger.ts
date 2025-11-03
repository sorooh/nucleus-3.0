/**
 * UIL Logger - Centralized logging for Unified Intelligence Layer
 * Nucleus 3.1.1
 */

import fs from "fs";
import path from "path";

const LOG_DIR = process.env.UIL_LOG_DIR || "/var/log/surooh/uil";
const LOG_LEVEL = process.env.UIL_LOG_LEVEL || "info";

// Ensure log directory exists
function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    console.error(`Failed to create log directory ${LOG_DIR}:`, error);
  }
}

ensureLogDir();

interface UILLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  traceId?: string;
  module?: string;
  taskType?: string;
  provider?: string;
  latency_ms?: number;
  status?: "success" | "error" | "retry";
  message: string;
  meta?: Record<string, any>;
}

/**
 * Write log entry to file
 */
function writeLog(entry: UILLogEntry, logType: "access" | "error") {
  const filename = logType === "access" ? "uil-access.log" : "uil-error.log";
  const filepath = path.join(LOG_DIR, filename);
  const logLine = JSON.stringify(entry) + "\n";

  try {
    fs.appendFileSync(filepath, logLine, { encoding: "utf-8" });
  } catch (error) {
    console.error(`Failed to write to ${filename}:`, error);
  }
}

/**
 * Log successful UIL request
 */
export function logUILAccess(data: {
  traceId: string;
  module?: string;
  taskType: string;
  provider: string;
  latency_ms: number;
  outputLength: number;
}) {
  const entry: UILLogEntry = {
    timestamp: new Date().toISOString(),
    level: "info",
    traceId: data.traceId,
    module: data.module || "unknown",
    taskType: data.taskType,
    provider: data.provider,
    latency_ms: data.latency_ms,
    status: "success",
    message: `UIL ${data.taskType} completed via ${data.provider}`,
    meta: {
      outputLength: data.outputLength
    }
  };

  writeLog(entry, "access");
  
  if (LOG_LEVEL === "debug") {
    console.log(`[UIL-ACCESS] ${entry.message} (${data.latency_ms}ms)`);
  }
}

/**
 * Log failed UIL request
 */
export function logUILError(data: {
  traceId: string;
  module?: string;
  taskType?: string;
  provider?: string;
  error: string;
  retryable: boolean;
}) {
  const entry: UILLogEntry = {
    timestamp: new Date().toISOString(),
    level: "error",
    traceId: data.traceId,
    module: data.module || "unknown",
    taskType: data.taskType,
    provider: data.provider,
    status: data.retryable ? "retry" : "error",
    message: data.error,
    meta: {
      retryable: data.retryable
    }
  };

  writeLog(entry, "error");
  
  console.error(`[UIL-ERROR] ${entry.message} [${data.traceId}]`);
}

/**
 * Log warning
 */
export function logUILWarning(message: string, meta?: Record<string, any>) {
  const entry: UILLogEntry = {
    timestamp: new Date().toISOString(),
    level: "warn",
    message,
    meta
  };

  writeLog(entry, "error");
  
  if (LOG_LEVEL === "debug" || LOG_LEVEL === "warn") {
    console.warn(`[UIL-WARN] ${message}`);
  }
}

/**
 * Log info
 */
export function logUILInfo(message: string, meta?: Record<string, any>) {
  const entry: UILLogEntry = {
    timestamp: new Date().toISOString(),
    level: "info",
    message,
    meta
  };

  if (LOG_LEVEL === "debug" || LOG_LEVEL === "info") {
    console.log(`[UIL-INFO] ${message}`);
  }
}

/**
 * Rotate logs (should be called periodically via cron)
 */
export function rotateUILLogs() {
  const accessLog = path.join(LOG_DIR, "uil-access.log");
  const errorLog = path.join(LOG_DIR, "uil-error.log");
  const timestamp = new Date().toISOString().split('T')[0];

  try {
    if (fs.existsSync(accessLog)) {
      const rotatedAccess = path.join(LOG_DIR, `uil-access.${timestamp}.log`);
      fs.renameSync(accessLog, rotatedAccess);
    }

    if (fs.existsSync(errorLog)) {
      const rotatedError = path.join(LOG_DIR, `uil-error.${timestamp}.log`);
      fs.renameSync(errorLog, rotatedError);
    }

    logUILInfo("Logs rotated successfully");
  } catch (error: any) {
    console.error("Failed to rotate logs:", error.message);
  }
}

/**
 * Get log statistics
 */
export function getUILLogStats(): {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  topProviders: Record<string, number>;
} {
  const accessLog = path.join(LOG_DIR, "uil-access.log");
  
  try {
    if (!fs.existsSync(accessLog)) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        topProviders: {}
      };
    }

    const logs = fs.readFileSync(accessLog, "utf-8")
      .split("\n")
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(entry => entry !== null);

    const totalRequests = logs.length;
    const successCount = logs.filter(l => l.status === "success").length;
    const totalLatency = logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0);
    const avgLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;

    const providers: Record<string, number> = {};
    logs.forEach(l => {
      if (l.provider) {
        providers[l.provider] = (providers[l.provider] || 0) + 1;
      }
    });

    return {
      totalRequests,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      avgLatency: Math.round(avgLatency),
      topProviders: providers
    };

  } catch (error) {
    console.error("Failed to read log stats:", error);
    return {
      totalRequests: 0,
      successRate: 0,
      avgLatency: 0,
      topProviders: {}
    };
  }
}
