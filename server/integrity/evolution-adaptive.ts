/**
 * Phase Ω.7: Adaptive Evolution System
 * 
 * Smart code improvement engine that:
 * 1. Learns from repair patterns in knowledge-registry.json
 * 2. Detects similar patterns across the codebase
 * 3. Generates safe improvement suggestions
 * 4. Applies improvements with validation
 * 
 * 🧬 Safe, intelligent, autonomous evolution
 */

import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { evolutionSuggestions, evolutionPatterns } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface KnowledgeEntry {
  file: string;
  date: string;
  verified: boolean;
  summary: string;
  repairType: string;
  successRate: number;
}

interface EvolutionResult {
  suggestions: any[];
  patternsDetected: number;
  filesScanned: number;
  confidenceAvg: number;
}

/**
 * Main adaptive evolution function
 * Analyzes knowledge and generates improvement suggestions
 */
export async function runAdaptiveEvolution(): Promise<EvolutionResult> {
  console.log('🧬 [Adaptive Evolution] Starting intelligent pattern analysis...');
  
  const registryPath = path.resolve('./server/integrity/knowledge-registry.json');
  
  if (!fs.existsSync(registryPath)) {
    console.log('⚠️ [Adaptive Evolution] No knowledge registry found - nothing to learn from');
    return { suggestions: [], patternsDetected: 0, filesScanned: 0, confidenceAvg: 0 };
  }

  const knowledge: KnowledgeEntry[] = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  if (knowledge.length === 0) {
    console.log('📚 [Adaptive Evolution] Knowledge registry empty - no patterns to apply');
    return { suggestions: [], patternsDetected: 0, filesScanned: 0, confidenceAvg: 0 };
  }

  console.log(`📖 [Adaptive Evolution] Analyzing ${knowledge.length} learned lessons...`);

  // Extract patterns from learned lessons
  const patterns = await extractPatternsFromKnowledge(knowledge);
  console.log(`🔍 [Adaptive Evolution] Extracted ${patterns.length} improvement patterns`);

  // Scan codebase for similar patterns
  const filesScanned = await scanCodebaseForPatterns(patterns);
  console.log(`📊 [Adaptive Evolution] Scanned ${filesScanned} files`);

  // Get all generated suggestions
  const suggestions = await db.select().from(evolutionSuggestions).where(eq(evolutionSuggestions.status, 'pending'));

  const confidenceAvg = suggestions.length > 0 
    ? suggestions.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / suggestions.length 
    : 0;

  console.log(`✨ [Adaptive Evolution] Generated ${suggestions.length} improvement suggestions`);
  console.log(`📈 [Adaptive Evolution] Average confidence: ${confidenceAvg.toFixed(1)}%`);

  return {
    suggestions: suggestions.map(s => ({ id: s.id, pattern: s.patternDetected, files: s.filesCount })),
    patternsDetected: patterns.length,
    filesScanned,
    confidenceAvg
  };
}

/**
 * Extract improvement patterns from learned lessons
 */
async function extractPatternsFromKnowledge(knowledge: KnowledgeEntry[]): Promise<string[]> {
  const patterns: Set<string> = new Set();

  for (const lesson of knowledge) {
    // Only learn from verified lessons with good success rates
    if (!lesson.verified || lesson.successRate < 60) {
      console.log(`⏭️ [Adaptive Evolution] Skipping unverified/low-success lesson: ${lesson.file}`);
      continue;
    }

    const summary = lesson.summary.toLowerCase();

    // Detect anti-patterns from lesson summaries
    if (summary.includes('mock') || summary.includes('fake')) {
      patterns.add('mock_data_antipattern');
      await ensurePatternExists('mock_data_antipattern', {
        type: 'antipattern',
        description: 'Avoid using mock or fake data - use real implementations',
        detectionRules: ['mock', 'fake', 'MOCK', 'FAKE', 'mock_'],
        fileExtensions: ['.ts', '.js', '.py'],
        priority: 90
      });
    }

    if (summary.includes('simulation') || summary.includes('stub')) {
      patterns.add('simulation_antipattern');
      await ensurePatternExists('simulation_antipattern', {
        type: 'antipattern',
        description: 'Avoid SIMULATION flags - use real test runners and actual execution',
        detectionRules: ['SIMULATION', 'STUB', 'stub_', 'simulation_'],
        fileExtensions: ['.ts', '.js', '.py'],
        priority: 85
      });
    }

    if (summary.includes('template') || summary.includes('placeholder')) {
      patterns.add('template_replacement');
      await ensurePatternExists('template_replacement', {
        type: 'improvement_opportunity',
        description: 'Replace templates and placeholders with real implementations',
        detectionRules: ['TEMPLATE', 'PLACEHOLDER', 'TODO:', 'FIXME:'],
        fileExtensions: ['.ts', '.js', '.py'],
        priority: 70
      });
    }
  }

  return Array.from(patterns);
}

/**
 * Ensure pattern exists in database
 */
async function ensurePatternExists(patternName: string, config: any) {
  const existing = await db.select().from(evolutionPatterns).where(eq(evolutionPatterns.patternName, patternName));

  if (existing.length === 0) {
    await db.insert(evolutionPatterns).values({
      patternName,
      patternType: config.type,
      description: config.description,
      detectionRules: config.detectionRules,
      fileExtensions: config.fileExtensions,
      priority: config.priority,
      isActive: 1,
      autoFix: 0, // Manual review by default for safety
    });
    console.log(`✅ [Adaptive Evolution] Pattern registered: ${patternName}`);
  }
}

/**
 * Scan codebase for patterns and generate suggestions
 */
async function scanCodebaseForPatterns(patternNames: string[]): Promise<number> {
  let filesScanned = 0;

  for (const patternName of patternNames) {
    const [pattern] = await db.select().from(evolutionPatterns).where(eq(evolutionPatterns.patternName, patternName));
    
    if (!pattern || !pattern.isActive) continue;

    // Get detection rules
    const rules = (pattern.detectionRules as string[]) || [];
    const extensions = (pattern.fileExtensions as string[]) || ['.ts', '.js'];
    const excludePaths = (pattern.excludePaths as string[]) || [
      'node_modules', 
      '.git', 
      'dist', 
      'build',
      'server/ai',      // Legacy folder - protected
      'modules'         // Legacy folder - protected
    ];

    // Find files with matching patterns
    const targetFiles = findFilesWithPattern(rules, extensions, excludePaths);
    filesScanned += targetFiles.length;

    if (targetFiles.length > 0) {
      // Generate suggestion
      await generateEvolutionSuggestion(pattern, targetFiles);
      
      // Update pattern stats
      await db.update(evolutionPatterns)
        .set({ 
          timesDetected: (pattern.timesDetected || 0) + targetFiles.length,
          updatedAt: new Date()
        })
        .where(eq(evolutionPatterns.id, pattern.id));
    }
  }

  return filesScanned;
}

/**
 * Find files containing specific patterns
 */
function findFilesWithPattern(rules: string[], extensions: string[], excludePaths: string[]): string[] {
  const results: string[] = [];
  const serverDir = path.resolve('./server');

  function scanDirectory(dir: string) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      // Skip excluded paths
      if (excludePaths.some(excluded => fullPath.includes(excluded))) continue;

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else {
        // Check if file has matching extension
        const hasExtension = extensions.some(ext => file.endsWith(ext));
        if (!hasExtension) continue;

        // Check if file contains any of the detection rules
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const hasPattern = rules.some(rule => content.includes(rule));

          if (hasPattern) {
            results.push(fullPath);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  scanDirectory(serverDir);
  return results;
}

/**
 * Generate evolution suggestion for detected pattern
 */
async function generateEvolutionSuggestion(pattern: any, targetFiles: string[]) {
  // Calculate confidence based on pattern success rate and file count
  const baseConfidence = pattern.successRate || 50;
  const fileCountPenalty = Math.min(targetFiles.length * 2, 20); // More files = less confidence
  const confidence = Math.max(30, Math.min(95, baseConfidence - fileCountPenalty));

  // Determine risk level
  let riskLevel = 'low';
  if (targetFiles.length > 10) riskLevel = 'high';
  else if (targetFiles.length > 5) riskLevel = 'medium';

  // Check if similar PENDING suggestion already exists
  const existing = await db.select()
    .from(evolutionSuggestions)
    .where(eq(evolutionSuggestions.patternDetected, pattern.patternName));

  const pendingSuggestion = existing.find(s => s.status === 'pending');
  if (pendingSuggestion) {
    console.log(`⏭️ [Adaptive Evolution] Pending suggestion already exists for ${pattern.patternName}`);
    return;
  }

  // Generate specific changes for each file
  const suggestedChanges = targetFiles.map(file => ({
    file,
    action: 'review_and_replace',
    pattern: pattern.patternName,
    recommendation: pattern.description
  }));

  // Create suggestion
  await db.insert(evolutionSuggestions).values({
    patternDetected: pattern.patternName,
    patternSource: 'knowledge-registry',
    learnedLesson: pattern.description,
    targetFiles: targetFiles,
    filesCount: targetFiles.length,
    improvementType: pattern.patternType,
    suggestedChanges: suggestedChanges,
    estimatedImpact: targetFiles.length > 10 ? 'high' : targetFiles.length > 5 ? 'medium' : 'low',
    confidenceScore: Math.round(confidence),
    riskLevel,
    requiresReview: riskLevel === 'high' ? 1 : 0,
    status: 'pending'
  });

  console.log(`💡 [Adaptive Evolution] Suggestion created: ${pattern.patternName} (${targetFiles.length} files, ${confidence.toFixed(0)}% confidence)`);
}

/**
 * Get evolution suggestions for review
 */
export async function getEvolutionSuggestions(status?: string) {
  if (status) {
    return await db.select().from(evolutionSuggestions).where(eq(evolutionSuggestions.status, status));
  }
  return await db.select().from(evolutionSuggestions);
}

/**
 * Get evolution patterns
 */
export async function getEvolutionPatterns() {
  return await db.select().from(evolutionPatterns);
}
