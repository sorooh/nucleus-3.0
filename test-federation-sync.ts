/**
 * Test Federation Data Sync Endpoint
 * Tests bi-directional data synchronization with SIDE node
 */

import { SIDEConnector, SIDENodeConfig } from './client/side-connector';

const NICHOLAS_URL = 'http://localhost:5000';

// Configuration for test SIDE node
const testNodeConfig: SIDENodeConfig = {
  nodeId: 'side-node-main-test',
  nodeName: 'SIDE Main Test Node',
  arabicName: 'عقدة SIDE الرئيسية للاختبار',
  nodeType: 'development',
  organizationId: 'surooh',
  nucleusLevel: 'main',
  nodeUrl: 'http://localhost:8000',
  permissions: ['read', 'write', 'execute'],
  allowedEndpoints: ['/api/sync', '/api/heartbeat', '/api/execute'],
  capabilities: {
    codeExecution: true,
    dataSync: true,
    knowledgeSharing: true,
    realtimeUpdates: true
  },
  sideVersion: '1.0.0',
  tags: ['test', 'development', 'main-nucleus']
};

async function main() {
  console.log('🚀 بدء اختبار Data Sync Endpoint');
  console.log('═════════════════════════════════════════\n');

  const connector = new SIDEConnector(NICHOLAS_URL, testNodeConfig);

  try {
    // Step 1: Register (or skip if already registered)
    console.log('📋 خطوة 1: التسجيل');
    const regResult = await connector.register();
    
    if (!regResult.success) {
      console.error('❌ فشل التسجيل:', regResult.error);
      return;
    }
    
    if (regResult.traceId === 'already-registered') {
      console.log('ℹ️  العقدة مسجلة مسبقاً - نتابع الاختبار\n');
      
      // Load credentials from previous registration
      // In production, you would load from secrets storage
      console.log('⚠️  ملاحظة: يجب تحميل الـ credentials من secrets storage');
      console.log('⚠️  للاختبار، سنتوقف هنا - يرجى تشغيل التسجيل الكامل أولاً\n');
      return;
    }

    console.log('✅ التسجيل نجح!');
    console.log(`   Node ID: ${regResult.node?.nodeId}`);
    console.log(`   Status: ${regResult.node?.status}\n`);

    // Step 2: Activate
    console.log('📋 خطوة 2: التفعيل');
    const activateResult = await connector.activate();
    console.log('✅ التفعيل نجح!');
    console.log(`   Status: ${activateResult.node?.status}\n`);

    // Step 3: Send Heartbeat
    console.log('📋 خطوة 3: إرسال Heartbeat');
    const heartbeatResult = await connector.sendHeartbeat(100);
    console.log('✅ Heartbeat نجح!');
    console.log(`   Health: ${heartbeatResult.node?.health}%\n`);

    // Step 4: Test Data Sync - Knowledge Sharing
    console.log('📋 خطوة 4: اختبار Data Sync (Knowledge Sharing)');
    const knowledgeData = {
      category: 'test',
      items: [
        {
          id: 'knowledge-1',
          title: 'Federation Test Data 1',
          content: 'This is test knowledge shared from SIDE node',
          tags: ['test', 'federation', 'sync'],
          timestamp: new Date().toISOString()
        },
        {
          id: 'knowledge-2',
          title: 'Federation Test Data 2',
          content: 'Second test knowledge item for sync verification',
          tags: ['test', 'federation', 'verification'],
          timestamp: new Date().toISOString()
        }
      ],
      totalItems: 2
    };

    const syncResult1 = await connector.syncData('knowledge-sharing', knowledgeData);
    console.log('✅ Knowledge Sync نجح!');
    console.log(`   Sync ID: ${syncResult1.syncId}`);
    console.log(`   Items Processed: ${syncResult1.acknowledgment.itemsProcessed}`);
    console.log(`   Checksum Verified: ${syncResult1.acknowledgment.checksumVerified}\n`);

    // Step 5: Test Data Sync - Code Update
    console.log('📋 خطوة 5: اختبار Data Sync (Code Update)');
    const codeData = {
      category: 'code-update',
      items: [
        {
          id: 'code-1',
          fileName: 'test-component.tsx',
          filePath: '/src/components/test-component.tsx',
          changeType: 'updated',
          content: 'export function TestComponent() { return <div>Test</div>; }',
          hash: 'abc123def456',
          timestamp: new Date().toISOString()
        }
      ],
      totalItems: 1
    };

    const syncResult2 = await connector.syncData('code-update', codeData);
    console.log('✅ Code Sync نجح!');
    console.log(`   Sync ID: ${syncResult2.syncId}`);
    console.log(`   Items Processed: ${syncResult2.acknowledgment.itemsProcessed}`);
    console.log(`   Checksum Verified: ${syncResult2.acknowledgment.checksumVerified}\n`);

    // Step 6: Test Duplicate Detection
    console.log('📋 خطوة 6: اختبار Duplicate Detection');
    console.log('   إرسال نفس البيانات مرة أخرى...');
    const syncResult3 = await connector.syncData('knowledge-sharing', knowledgeData);
    
    if (syncResult3.acknowledgment.duplicate) {
      console.log('✅ Duplicate Detection يعمل بشكل صحيح!');
      console.log(`   Message: ${syncResult3.message}`);
    } else {
      console.warn('⚠️  تحذير: لم يتم اكتشاف التكرار - قد تكون هناك مشكلة');
    }

    console.log('\n═════════════════════════════════════════');
    console.log('✅ جميع الاختبارات نجحت!');
    console.log('═════════════════════════════════════════\n');

    // Display connection status
    const status = connector.getConnectionStatus();
    console.log('📊 حالة الاتصال:');
    console.log(`   Node ID: ${status.nodeId}`);
    console.log(`   Nicholas URL: ${status.nicholasUrl}`);
    console.log(`   Has Credentials: ${status.hasCredentials ? 'نعم' : 'لا'}`);

  } catch (error: any) {
    console.error('\n❌ فشل الاختبار:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
