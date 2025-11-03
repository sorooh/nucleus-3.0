#!/usr/bin/env tsx
/**
 * Migrate Failed Commits to Issues
 * تحويل الـ commits الفاشلة إلى issues قابلة للتتبع
 */

import { db } from '../db';
import { auditCommits, auditFailures } from '../../shared/schema';
import { sql } from 'drizzle-orm';

async function migrateFailedCommits() {
  console.log('🔄 Starting migration of failed commits to issues...\n');
  
  try {
    // Get all failed commits (score < 60 or status = 'failed')
    const failedCommits = await db
      .select()
      .from(auditCommits)
      .where(
        sql`${auditCommits.auditStatus} = 'failed' 
            OR CAST(${auditCommits.auditScore} AS INTEGER) < 60`
      )
      .orderBy(sql`${auditCommits.createdAt} DESC`);
    
    console.log(`📊 Found ${failedCommits.length} failed commits\n`);
    
    if (failedCommits.length === 0) {
      console.log('✅ No failed commits to migrate');
      return;
    }
    
    let migrated = 0;
    let skipped = 0;
    
    for (const commit of failedCommits) {
      // Check if issue already exists for this commit
      const existing = await db
        .select()
        .from(auditFailures)
        .where(sql`${auditFailures.endpoint} = ${`/commit/${commit.commitHash.substring(0, 7)}`}`)
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`⏭️  Skipped: ${commit.commitHash.substring(0, 7)} (already exists)`);
        skipped++;
        continue;
      }
      
      // Determine nucleus and file from commit
      const filesModified = commit.filesModified as Array<{ path: string }>;
      const primaryFile = filesModified[0]?.path || 'unknown';
      
      const nucleusName = primaryFile.includes('consciousness') ? 'consciousness-layer' :
                          primaryFile.includes('entity') ? 'entity-layer' :
                          primaryFile.includes('evolution') ? 'evolution-engine' :
                          primaryFile.includes('federation') ? 'federation-gateway' :
                          primaryFile.includes('audit') ? 'audit-system' :
                          'nicholas-core';
      
      const moduleType = primaryFile.includes('routes') ? 'api' :
                         primaryFile.includes('index') ? 'service' :
                         primaryFile.includes('.tsx') ? 'component' : 'system';
      
      // Determine failure type
      let failureType: 'mock_data' | 'hardcoded' | 'random_values' = 'mock_data';
      if (commit.mockDataDetected > 0) failureType = 'random_values';
      else if (commit.hardcodedValues > 0) failureType = 'hardcoded';
      
      const auditScore = parseFloat(commit.auditScore);
      const complianceNotes = commit.complianceNotes as Array<{ type: string; message: string }>;
      
      // Create issue
      const [issue] = await db.insert(auditFailures).values({
        // Nucleus & File Info
        nucleusName,
        fileName: primaryFile,
        moduleType,
        
        // Endpoint Info (commit-based issue)
        endpoint: `/commit/${commit.commitHash.substring(0, 7)}`,
        method: 'COMMIT',
        pageUrl: null,
        
        // Failure Details
        failureType,
        failureReason: complianceNotes.map(n => n.message).join('; '),
        expectedDataSource: 'real database queries',
        actualDataSource: commit.mockDataDetected > 0 ? 'Math.random() generation' : 'hardcoded values',
        evidenceSnapshot: {
          commitHash: commit.commitHash,
          auditScore,
          mockDataDetected: commit.mockDataDetected,
          hardcodedValues: commit.hardcodedValues,
          apiIntegrityIssues: commit.apiIntegrityIssues,
          filesModified: filesModified.map((f: any) => f.path)
        },
        severity: auditScore < 30 ? 'critical' : 
                  auditScore < 60 ? 'high' : 'medium',
        
        // Status
        status: 'open',
        affectedFeatures: filesModified.map((f: any) => f.path),
        
        // Testing info
        testedBy: 'migration-script',
        requestPayload: null,
        responsePayload: { 
          commitMessage: commit.commitMessage,
          commitAuthor: commit.commitAuthor,
          commitDate: commit.commitDate
        }
      }).returning();
      
      console.log(`✅ Migrated: ${commit.commitHash.substring(0, 7)} → Issue ${issue.id}`);
      console.log(`   Nucleus: ${nucleusName} | File: ${primaryFile}`);
      console.log(`   Score: ${auditScore}/100 | Severity: ${issue.severity}`);
      console.log('');
      
      migrated++;
    }
    
    console.log('━'.repeat(60));
    console.log(`✅ Migration complete!`);
    console.log(`   • Migrated: ${migrated}`);
    console.log(`   • Skipped: ${skipped}`);
    console.log(`   • Total: ${failedCommits.length}`);
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateFailedCommits()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
