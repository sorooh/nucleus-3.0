import fs from 'fs/promises';
import path from 'path';

const logPath = path.resolve('./server/integrity/integrity-ledger.log');

export async function logIntegrityCycle(report: any) {
  const entry = [
    '🧾 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '📅 [Integrity Ledger Entry]',
    `⏰ Timestamp: ${new Date().toISOString()}`,
    `🕵️  Fake Modules Detected: ${report.honesty.fakeModules.length}`,
    `🧪 Reality Check Failures: ${report.reality.failed.length}`,
    `⚙️  Modules Needing Repair: ${report.enforcement.isolated.length}`,
    `🧠 Autonomy Score: ${report.autonomy.score.toFixed(1)}%`,
    `📊 Total Modules: ${report.autonomy.totalModules}`,
    '',
    '📋 Top Fake Modules:',
    ...report.reality.failed.slice(0, 10).map((f: string) => `   - ${f}`),
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
  ].join('\n');

  await fs.appendFile(logPath, entry, 'utf8');
  console.log('📘 [Ledger] Integrity cycle logged successfully.');
  console.log(`📂 [Ledger] Log file: ${logPath}`);
}
