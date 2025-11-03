/**
 * Phase Ω.8: Predictive Adaptation
 * 
 * Intelligent prediction system that:
 * 1. Analyzes patterns from past errors
 * 2. Predicts where problems will occur next
 * 3. Identifies files likely to need attention
 * 
 * 🔮 Prevents problems before they happen
 */

import fs from 'fs';
import path from 'path';

interface KnowledgeEntry {
  file: string;
  date: string;
  verified: boolean;
  summary: string;
  repairType: string;
  successRate: number;
}

interface PredictionResult {
  predictions: string[];
  riskPatterns: { pattern: string; count: number; risk: string }[];
  totalFilesAtRisk: number;
  confidenceScore: number;
}

/**
 * Main predictive adaptation function
 * Analyzes knowledge and predicts future issues
 */
export async function runPredictiveAdaptation(): Promise<PredictionResult> {
  console.log('🔮 [Predictive] Starting intelligent prediction analysis...');
  
  const registryPath = path.resolve('./server/integrity/knowledge-registry.json');
  
  if (!fs.existsSync(registryPath)) {
    console.log('⚠️ [Predictive] No knowledge base found - cannot predict without history');
    return { predictions: [], riskPatterns: [], totalFilesAtRisk: 0, confidenceScore: 0 };
  }

  const knowledge: KnowledgeEntry[] = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  if (knowledge.length === 0) {
    console.log('📚 [Predictive] Knowledge registry empty - no patterns to predict from');
    return { predictions: [], riskPatterns: [], totalFilesAtRisk: 0, confidenceScore: 0 };
  }

  console.log(`📖 [Predictive] Analyzing ${knowledge.length} historical patterns...`);

  // Extract risk keywords from learned lessons
  const riskKeywords = ['mock', 'SIMULATION', 'fake', 'TODO', 'FIXME', 'stub', 'template', 'placeholder'];
  const patternCounts: Record<string, number> = {};

  // Analyze frequency of each pattern in past errors
  for (const entry of knowledge) {
    const text = entry.summary.toLowerCase();
    for (const keyword of riskKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        patternCounts[keyword] = (patternCounts[keyword] ?? 0) + 1;
      }
    }
  }

  // Sort patterns by frequency (highest risk first)
  const sortedPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern, count]) => ({
      pattern,
      count,
      risk: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low'
    }));

  console.log(`🧠 [Predictive] Detected ${sortedPatterns.length} recurring risk patterns`);

  // Predict files at risk based on most common patterns
  const predictions: string[] = [];
  const scanPatterns = sortedPatterns.slice(0, 3); // Focus on top 3 patterns

  for (const { pattern, count, risk } of scanPatterns) {
    console.log(`🔍 [Predictive] Scanning for pattern '${pattern}' (frequency: ${count}, risk: ${risk})`);
    
    const filesWithPattern = findFilesContainingPattern('./server', pattern, [
      'node_modules',
      '.git',
      'dist',
      'build',
      'server/ai',      // Legacy - protected
      'modules'         // Legacy - protected
    ]);

    for (const file of filesWithPattern) {
      if (!predictions.includes(file)) {
        predictions.push(file);
      }
    }
  }

  // Calculate confidence score based on knowledge base size and pattern clarity
  const confidenceScore = Math.min(95, 50 + (knowledge.length * 5) + (sortedPatterns.length * 3));

  console.log(`🔮 [Predictive] ${predictions.length} files predicted to need attention soon`);
  console.log(`📈 [Predictive] Prediction confidence: ${confidenceScore.toFixed(1)}%`);

  return {
    predictions,
    riskPatterns: sortedPatterns,
    totalFilesAtRisk: predictions.length,
    confidenceScore: Math.round(confidenceScore)
  };
}

/**
 * Find files containing specific pattern
 */
function findFilesContainingPattern(
  dir: string, 
  pattern: string,
  excludePaths: string[] = []
): string[] {
  const results: string[] = [];

  function scanDirectory(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;

    try {
      const files = fs.readdirSync(currentDir);

      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        
        // Skip excluded paths
        if (excludePaths.some(excluded => fullPath.includes(excluded))) continue;

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(pattern)) {
              results.push(fullPath);
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  scanDirectory(dir);
  return results;
}

/**
 * Get prediction summary for reporting
 */
export function getPredictionSummary(prediction: PredictionResult): string {
  if (prediction.totalFilesAtRisk === 0) {
    return 'No immediate risks predicted - system is stable';
  }

  const topPattern = prediction.riskPatterns[0];
  return `${prediction.totalFilesAtRisk} files at risk (top pattern: '${topPattern.pattern}', ${prediction.confidenceScore}% confidence)`;
}
