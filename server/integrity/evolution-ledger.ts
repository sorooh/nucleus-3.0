/**
 * Phase Ω.8: Evolution Ledger
 * 
 * Permanent record of all evolution cycles:
 * - Tracks every evolution decision
 * - Records predictions and adaptations
 * - Maintains complete audit trail
 * 
 * 📗 Complete history of Nicholas's growth
 */

import fs from 'fs';
import path from 'path';

const ledgerPath = path.resolve('./server/integrity/evolution-ledger.log');

interface EvolutionReport {
  cycleNumber: number;
  evolution?: {
    suggestions?: any[];
    patternsDetected?: number;
    filesScanned?: number;
  };
  prediction?: {
    predictions?: string[];
    riskPatterns?: any[];
    confidenceScore?: number;
  };
  learning?: {
    newLearnings?: number;
    totalLearnings?: number;
    knowledgeGrowth?: number;
  };
  repair?: {
    repaired?: any[];
  };
  autonomy?: {
    score?: number;
  };
}

/**
 * Log evolution cycle to permanent ledger
 */
export async function logEvolutionCycle(report: EvolutionReport): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    const entry = [
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '🧬 [Evolution Ledger Entry]',
      `📅 Timestamp: ${timestamp}`,
      `🔢 Cycle #${report.cycleNumber}`,
      '',
      '📊 Evolution Stats:',
      `   🧬 Suggestions Generated: ${report.evolution?.suggestions?.length ?? 0}`,
      `   🔍 Patterns Detected: ${report.evolution?.patternsDetected ?? 0}`,
      `   📁 Files Scanned: ${report.evolution?.filesScanned ?? 0}`,
      '',
      '🔮 Prediction Stats:',
      `   ⚠️  Files at Risk: ${report.prediction?.predictions?.length ?? 0}`,
      `   🎯 Risk Patterns: ${report.prediction?.riskPatterns?.length ?? 0}`,
      `   📈 Confidence: ${report.prediction?.confidenceScore ?? 0}%`,
      '',
      '📚 Learning Stats:',
      `   ✨ New Learnings: ${report.learning?.newLearnings ?? 0}`,
      `   🧠 Total Knowledge: ${report.learning?.totalLearnings ?? 0}`,
      `   📈 Growth Rate: ${(report.learning?.knowledgeGrowth ?? 0).toFixed(1)}%`,
      '',
      '🔧 Repair Stats:',
      `   ✅ Repaired Modules: ${report.repair?.repaired?.length ?? 0}`,
      '',
      '🎯 System Health:',
      `   💯 Autonomy Score: ${(report.autonomy?.score ?? 0).toFixed(1)}%`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ''
    ].join('\n');

    // Append to ledger file
    fs.appendFileSync(ledgerPath, entry, 'utf8');
    
    console.log('📗 [Evolution Ledger] Cycle recorded successfully.');
    console.log(`📂 [Evolution Ledger] Location: ${ledgerPath}`);
  } catch (error) {
    console.error('❌ [Evolution Ledger] Failed to record cycle:', error);
  }
}

/**
 * Get evolution ledger summary
 */
export function getEvolutionLedgerSummary(): {
  totalCycles: number;
  ledgerSize: number;
  lastUpdate: Date | null;
} {
  try {
    if (!fs.existsSync(ledgerPath)) {
      return { totalCycles: 0, ledgerSize: 0, lastUpdate: null };
    }

    const content = fs.readFileSync(ledgerPath, 'utf8');
    const cycles = (content.match(/Cycle #/g) || []).length;
    const stats = fs.statSync(ledgerPath);

    return {
      totalCycles: cycles,
      ledgerSize: stats.size,
      lastUpdate: stats.mtime
    };
  } catch (error) {
    return { totalCycles: 0, ledgerSize: 0, lastUpdate: null };
  }
}

/**
 * Read recent ledger entries
 */
export function getRecentLedgerEntries(count: number = 5): string {
  try {
    if (!fs.existsSync(ledgerPath)) {
      return 'No ledger entries found yet.';
    }

    const content = fs.readFileSync(ledgerPath, 'utf8');
    const entries = content.split('🧬 [Evolution Ledger Entry]').slice(-count);
    
    return entries.join('🧬 [Evolution Ledger Entry]');
  } catch (error) {
    return 'Failed to read ledger entries.';
  }
}
