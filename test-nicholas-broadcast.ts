/**
 * Nicholas Broadcasting Test
 * Tests outbound intelligence broadcast to SIDE nodes
 */

import { broadcastIntelligence, broadcastPendingIntelligence } from './server/federation/intelligence-broadcaster';
import { db } from './server/db';
import { intelligenceData, federationNodes } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  console.log('🎯 Nicholas Broadcasting Test - Outbound Intelligence to SIDE');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  try {
    // Get active SIDE nodes
    console.log('🔍 Checking active SIDE nodes...');
    const nodes = await db
      .select()
      .from(federationNodes)
      .where(eq(federationNodes.status, 'active'));
    
    console.log(`✅ Found ${nodes.length} active node(s):`);
    nodes.forEach(node => {
      console.log(`   - ${node.nodeId} (${node.nodeType}) - Health: ${node.health}%`);
    });
    
    if (nodes.length === 0) {
      console.log('\n⚠️  No active nodes found. Cannot broadcast.');
      return;
    }
    
    // Get pending intelligence
    console.log('\n📊 Checking pending intelligence...');
    const pendingIntel = await db
      .select()
      .from(intelligenceData)
      .where(eq(intelligenceData.broadcastStatus, 'pending'))
      .orderBy(desc(intelligenceData.receivedAt))
      .limit(10);
    
    console.log(`   Found ${pendingIntel.length} pending intelligence item(s)`);
    
    if (pendingIntel.length === 0) {
      console.log('   ℹ️  No pending intelligence to broadcast\n');
      
      // Get latest intelligence for test broadcast
      console.log('📤 Broadcasting latest intelligence for testing...');
      const latestIntel = await db
        .select()
        .from(intelligenceData)
        .orderBy(desc(intelligenceData.receivedAt))
        .limit(1);
      
      if (latestIntel.length === 0) {
        console.log('   ⚠️  No intelligence data available\n');
        return;
      }
      
      const intel = latestIntel[0];
      console.log(`   Intelligence: ${intel.title}`);
      console.log(`   Type: ${intel.intelligenceType} | Priority: ${intel.priority}`);
      console.log(`   Source: ${intel.nodeId}\n`);
      
      console.log('🚀 Initiating broadcast...');
      const result = await broadcastIntelligence(intel.id!);
      
      console.log('\n📈 BROADCAST RESULTS:');
      console.log('════════════════════════════════════════');
      console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
      console.log(`Total Nodes: ${result.totalNodes}`);
      console.log(`Successful: ${result.successCount}`);
      console.log(`Failed: ${result.failCount}`);
      console.log(`Status: ${result.status}`);
      
      if (result.failedNodes.length > 0) {
        console.log('\n⚠️  Failed Nodes:');
        result.failedNodes.forEach((nodeId: string) => {
          console.log(`   - ${nodeId}`);
        });
      }
      
      if (result.success) {
        console.log('\n🎉 Test broadcast completed successfully!');
        console.log(`   Intelligence delivered to ${result.successCount}/${result.totalNodes} nodes`);
      } else {
        console.log('\n⚠️  Broadcast completed with partial failures');
      }
      
    } else {
      // Broadcast all pending intelligence
      console.log('\n🚀 Broadcasting all pending intelligence...');
      const result = await broadcastPendingIntelligence();
      
      console.log('\n📈 BATCH BROADCAST RESULTS:');
      console.log('════════════════════════════════════════');
      console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
      console.log(`Total Intelligence: ${result.total}`);
      console.log(`Successful: ${result.successCount}`);
      console.log(`Partial Failures: ${result.partialCount}`);
      console.log(`Complete Failures: ${result.failCount}`);
      console.log(`Total Node Failures: ${result.totalNodeFailures}`);
      
      if (result.success) {
        console.log('\n🎉 All intelligence broadcast successfully!');
      } else {
        console.log('\n⚠️  Some broadcasts failed or had partial delivery');
      }
    }
    
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('✅ Nicholas Broadcasting Test Complete');
    console.log('════════════════════════════════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('\n❌ Broadcasting Test Failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main().catch(console.error);
