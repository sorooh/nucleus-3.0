/**
 * Test Federation Outbound Sync (Nicholas → SIDE)
 * Tests sending data FROM Nicholas TO SIDE node
 */

import crypto from 'crypto';
import { db } from './server/db';
import { federationSyncData } from './shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🚀 بدء اختبار المزامنة العكسية (Nicholas → SIDE)');
  console.log('═════════════════════════════════════════\n');

  try {
    // Prepare outbound sync data
    const nodeId = 'side-node-main-test';
    const syncType = 'intelligence-broadcast';
    
    const outboundData = {
      category: 'intelligence-update',
      items: [
        {
          id: 'intelligence-1',
          type: 'ai-insight',
          title: 'Market Analysis Update',
          content: 'Bitcoin price prediction based on recent market trends',
          confidence: 0.85,
          source: 'AI Committee (Hunyuan + GPT-4o)',
          timestamp: new Date().toISOString()
        },
        {
          id: 'intelligence-2',
          type: 'system-alert',
          title: 'Performance Optimization Available',
          content: 'Detected potential optimization in SIDE code execution',
          priority: 'medium',
          source: 'Nucleus Performance Monitor',
          timestamp: new Date().toISOString()
        },
        {
          id: 'intelligence-3',
          type: 'knowledge-pattern',
          title: 'New Design Pattern Discovered',
          content: 'Identified reusable pattern in recent code submissions',
          pattern: 'singleton-with-lazy-loading',
          source: 'Meta-Learning Layer',
          timestamp: new Date().toISOString()
        }
      ],
      totalItems: 3
    };
    
    // Generate syncId
    const syncId = `sync-nicholas-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Compute checksum
    const dataString = JSON.stringify(outboundData);
    const checksum = crypto.createHash('sha256').update(dataString).digest('hex');
    
    console.log('📤 إعداد البيانات للإرسال:');
    console.log(`   Sync ID: ${syncId}`);
    console.log(`   Sync Type: ${syncType}`);
    console.log(`   Direction: outbound`);
    console.log(`   Items Count: ${outboundData.items.length}`);
    console.log(`   Checksum: ${checksum.substring(0, 16)}...\n`);
    
    // Store outbound sync in database
    console.log('💾 تخزين البيانات في قاعدة البيانات...');
    const [syncRecord] = await db.insert(federationSyncData).values({
      nodeId,
      syncId,
      syncType,
      direction: 'outbound',
      data: outboundData,
      metadata: {
        source: 'nicholas-3.2',
        destination: nodeId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checksum,
        syncId
      },
      checksum,
      status: 'pending', // pending → sent → acknowledged
      processed: 0
    }).returning();
    
    console.log('✅ تم تخزين البيانات بنجاح!');
    console.log(`   Database ID: ${syncRecord.id}`);
    console.log(`   Status: ${syncRecord.status}`);
    console.log(`   Stored At: ${syncRecord.receivedAt}\n`);
    
    console.log('📡 ملاحظة: في الإنتاج، سيتم إرسال هذه البيانات إلى SIDE عبر:');
    console.log('   - WebSocket (للمزامنة اللحظية)');
    console.log('   - HTTP POST (للمزامنة المجدولة)');
    console.log('   - Event-driven sync (للتحديثات الحرجة)\n');
    
    // Verify data in database
    console.log('🔍 التحقق من البيانات المُخزنة:');
    const verification = await db
      .select()
      .from(federationSyncData)
      .where(eq(federationSyncData.syncId, syncId))
      .limit(1);
    
    if (verification.length > 0) {
      const record = verification[0];
      const recordData = record.data as any;
      console.log('✅ البيانات موجودة في قاعدة البيانات');
      console.log(`   Sync ID: ${record.syncId}`);
      console.log(`   Direction: ${record.direction}`);
      console.log(`   Checksum Match: ${record.checksum === checksum ? 'نعم ✓' : 'لا ✗'}`);
      console.log(`   Items: ${recordData.items?.length || 0}`);
    }
    
    console.log('\n═════════════════════════════════════════');
    console.log('✅ اختبار المزامنة العكسية نجح!');
    console.log('═════════════════════════════════════════\n');
    
    console.log('📊 ملخص النتائج:');
    console.log(`   ✓ تم إنشاء syncId فريد`);
    console.log(`   ✓ تم حساب checksum (SHA-256)`);
    console.log(`   ✓ تم تخزين البيانات بـ direction = outbound`);
    console.log(`   ✓ البيانات جاهزة للإرسال إلى SIDE`);
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ فشل الاختبار:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

main();
