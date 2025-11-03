import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { integrityLearnings } from '@shared/schema';

const registryPath = path.resolve('./server/integrity/knowledge-registry.json');

export interface LearningEntry {
  file: string;
  date: string;
  verified: boolean;
  summary: string;
  repairType: 'template_replacement' | 'manual_fix' | 'auto_generated';
  successRate: number;
}

export interface LearningResult {
  totalLearnings: number;
  newLearnings: number;
  knowledgeGrowth: number;
  insights: string[];
}

/**
 * Phase Ω.6 - Learning Engine
 * Records repair results and learns from them for future evolution
 */
export async function learnFromRepair(repair: any, verification: any): Promise<LearningResult> {
  console.log('📚 [Learning Engine] Analyzing repair results for learning...');
  
  let knowledge: LearningEntry[] = [];
  
  // Load existing knowledge registry
  if (fs.existsSync(registryPath)) {
    try {
      knowledge = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️ [Learning Engine] Failed to load registry, starting fresh');
      knowledge = [];
    }
  }

  const newLearnings: LearningEntry[] = [];
  const insights: string[] = [];

  // Learn from each repaired module
  for (const file of repair.repaired) {
    const verified = verification.verified.includes(file);
    const summary = extractLesson(file, verified);
    
    const entry: LearningEntry = {
      file,
      date: new Date().toISOString(),
      verified,
      summary,
      repairType: 'template_replacement',
      successRate: verified ? 100 : 0
    };

    knowledge.push(entry);
    newLearnings.push(entry);
    
    console.log(`📚 [Learning Engine] ✓ Logged learning entry for ${file}`);
    console.log(`   Lesson: ${summary}`);

    // Generate insights
    if (verified) {
      insights.push(`Successfully repaired ${path.basename(file)} - ${summary}`);
    } else {
      insights.push(`Failed to verify ${path.basename(file)} - needs manual review`);
    }

    // Save to database
    try {
      await db.insert(integrityLearnings).values({
        modulePath: file,
        lessonLearned: summary,
        repairType: 'template_replacement',
        wasSuccessful: verified ? 1 : 0,
        verificationPassed: verified ? 1 : 0,
        impact: verified ? 'high' : 'low',
        applicability: getDomain(file),
      });
    } catch (error) {
      console.warn('⚠️ [Learning Engine] Failed to save to database:', error);
    }
  }

  // Save updated registry to file
  fs.writeFileSync(registryPath, JSON.stringify(knowledge, null, 2), 'utf8');

  // Calculate knowledge growth correctly:
  // - If no new learnings were added, growth is 0%
  // - Otherwise, growth = (new / total) * 100
  const knowledgeGrowth = newLearnings.length > 0 
    ? (newLearnings.length / knowledge.length) * 100 
    : 0;

  console.log('📚 [Learning Engine] Learning complete:');
  console.log(`   Total Knowledge: ${knowledge.length} entries`);
  console.log(`   New Learnings: ${newLearnings.length}`);
  console.log(`   Knowledge Growth: ${knowledgeGrowth.toFixed(1)}%`);
  console.log(`   Insights Generated: ${insights.length}`);

  return {
    totalLearnings: knowledge.length,
    newLearnings: newLearnings.length,
    knowledgeGrowth,
    insights
  };
}

/**
 * Extract lesson learned from repair
 */
function extractLesson(file: string, verified: boolean): string {
  const fileName = path.basename(file);
  
  if (fileName.includes('dispatcher')) {
    return 'Avoid mock_results; use real subprocess execution for authentic task handling';
  }
  
  if (fileName.includes('sandbox') || fileName.includes('executor')) {
    return 'Avoid SIMULATION flags; use real test runners (pytest/jest) for accurate validation';
  }
  
  if (fileName.includes('api') || fileName.includes('routes')) {
    return 'Ensure API endpoints return real database data, not static mock responses';
  }
  
  if (fileName.includes('service')) {
    return 'Services must implement actual business logic, not placeholder functions';
  }

  if (verified) {
    return `Successfully fixed ${fileName} - replaced fake implementation with real code`;
  }
  
  return `General integrity improvement attempted for ${fileName}`;
}

/**
 * Determine domain/applicability of lesson
 */
function getDomain(file: string): string {
  if (file.includes('server/core')) return 'core_systems';
  if (file.includes('server/evolution')) return 'evolution_systems';
  if (file.includes('server/integrity')) return 'integrity_systems';
  if (file.includes('server/api')) return 'api_layer';
  if (file.includes('client')) return 'frontend';
  return 'general';
}

/**
 * Get learning statistics
 */
export async function getLearningStats() {
  try {
    const allLearnings = await db.select().from(integrityLearnings);
    
    const successfulRepairs = allLearnings.filter(l => l.wasSuccessful).length;
    const totalRepairs = allLearnings.length;
    const successRate = totalRepairs > 0 ? (successfulRepairs / totalRepairs) * 100 : 0;
    
    const domainCounts: Record<string, number> = {};
    allLearnings.forEach(l => {
      domainCounts[l.applicability] = (domainCounts[l.applicability] || 0) + 1;
    });

    return {
      totalLearnings: totalRepairs,
      successfulRepairs,
      successRate: successRate.toFixed(1),
      domains: domainCounts,
      recentLearnings: allLearnings.slice(-5)
    };
  } catch (error) {
    console.error('❌ [Learning Engine] Failed to get stats:', error);
    return null;
  }
}
