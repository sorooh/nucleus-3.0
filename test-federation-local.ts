/**
 * اختبار الاتصال المحلي بين SIDE و Nicholas
 * 
 * هذا السكريبت يختبر:
 * 1. التسجيل (Registration)
 * 2. التفعيل (Activation)
 * 3. Heartbeat
 * 4. WebSocket Connection
 */

import { SIDEConnector } from './client/side-connector';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// قراءة تهيئة SIDE node
const configPath = path.join(__dirname, 'config', 'side-node.json');
const sideConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// عنوان Nicholas المحلي
const NICHOLAS_URL = 'http://localhost:5000';

async function testFederationConnection() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 اختبار الاتصال المحلي - SIDE ↔️ Nicholas');
  console.log('═══════════════════════════════════════════════════════\n');

  const connector = new SIDEConnector(NICHOLAS_URL, sideConfig);
  const testResults: any = {
    startTime: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    // Test 1: التسجيل
    console.log('📝 Test 1: تسجيل SIDE مع Nicholas');
    console.log('─────────────────────────────────────────────────────');
    
    const registrationResult = await connector.register();
    
    const test1 = {
      name: 'Registration',
      passed: registrationResult.success === true,
      details: registrationResult
    };
    testResults.tests.push(test1);
    
    if (!test1.passed) {
      console.error('❌ فشل التسجيل!');
      console.error('السبب:', registrationResult.error || registrationResult.message);
      throw new Error('Registration failed');
    }
    
    console.log('✅ Test 1 نجح!\n');
    
    // حفظ أو تحميل البيانات الاعتمادية
    const credentialsPath = path.join(__dirname, 'side-credentials.json');
    const credentials = connector.getCredentials();
    if (credentials) {
      console.log('💾 حفظ البيانات الاعتمادية...');
      fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
      console.log('✅ تم الحفظ في: side-credentials.json\n');
    } else if (fs.existsSync(credentialsPath)) {
      console.log('📂 تحميل البيانات الاعتمادية من الملف...');
      const savedCreds = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      // تعيين credentials يدوياً (hack للاختبار)
      (connector as any).credentials = savedCreds;
      console.log('✅ تم التحميل بنجاح\n');
    }

    // Test 2: التفعيل
    console.log('⚡ Test 2: تفعيل العقدة');
    console.log('─────────────────────────────────────────────────────');
    
    try {
      const activationResult = await connector.activate();
      const test2 = {
        name: 'Activation',
        passed: activationResult.success === true,
        details: activationResult
      };
      testResults.tests.push(test2);
      console.log('✅ Test 2 نجح!\n');
    } catch (error: any) {
      const test2 = {
        name: 'Activation',
        passed: false,
        error: error.message
      };
      testResults.tests.push(test2);
      console.log('⚠️  Test 2 فشل (قد يكون طبيعي إذا العقدة مفعلة مسبقاً)\n');
    }

    // Test 3: Heartbeat
    console.log('💓 Test 3: إرسال Heartbeat');
    console.log('─────────────────────────────────────────────────────');
    
    const heartbeatResult = await connector.sendHeartbeat(100);
    const test3 = {
      name: 'Heartbeat',
      passed: heartbeatResult.success === true,
      details: heartbeatResult
    };
    testResults.tests.push(test3);
    
    if (test3.passed) {
      console.log('✅ Test 3 نجح!\n');
    } else {
      console.log('❌ Test 3 فشل!\n');
    }

    // Test 4: WebSocket Connection
    console.log('🔌 Test 4: اتصال WebSocket');
    console.log('─────────────────────────────────────────────────────');
    
    try {
      await connector.connectWebSocket();
      
      // انتظار 2 ثانية لاستقبال الرسائل
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // إرسال رسالة تجريبية
      console.log('📤 إرسال رسالة تجريبية...');
      connector.sendWebSocketMessage('ping', { 
        message: 'Hello from SIDE!',
        timestamp: new Date().toISOString()
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const test4 = {
        name: 'WebSocket',
        passed: connector.getConnectionStatus().isConnected,
        details: connector.getConnectionStatus()
      };
      testResults.tests.push(test4);
      
      console.log('✅ Test 4 نجح!\n');
      
      // قطع الاتصال
      console.log('🔌 قطع اتصال WebSocket...');
      connector.disconnect();
      
    } catch (error: any) {
      const test4 = {
        name: 'WebSocket',
        passed: false,
        error: error.message
      };
      testResults.tests.push(test4);
      console.log('❌ Test 4 فشل:', error.message, '\n');
    }

    // النتائج النهائية
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ملخص النتائج');
    console.log('═══════════════════════════════════════════════════════');
    
    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter((t: any) => t.passed).length;
    testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
    testResults.endTime = new Date().toISOString();
    
    console.log(`✅ نجح: ${testResults.summary.passed}/${testResults.summary.total}`);
    console.log(`❌ فشل: ${testResults.summary.failed}/${testResults.summary.total}`);
    
    testResults.tests.forEach((test: any, index: number) => {
      const icon = test.passed ? '✅' : '❌';
      console.log(`${icon} Test ${index + 1} (${test.name}): ${test.passed ? 'نجح' : 'فشل'}`);
    });
    
    // حفظ التقرير
    const reportPath = path.join(__dirname, 'federation-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n💾 تم حفظ التقرير الكامل في: ${reportPath}`);
    
    // حالة الاتصال النهائية
    const status = connector.getConnectionStatus();
    console.log('\n📡 حالة الاتصال النهائية:');
    console.log(`   Node ID: ${status.nodeId}`);
    console.log(`   Nicholas URL: ${status.nicholasUrl}`);
    console.log(`   Has Credentials: ${status.hasCredentials ? 'نعم ✅' : 'لا ❌'}`);
    console.log(`   Is Connected: ${status.isConnected ? 'نعم ✅' : 'لا ❌'}`);
    
    console.log('\n═══════════════════════════════════════════════════════');
    
    if (testResults.summary.failed === 0) {
      console.log('🎉 كل الاختبارات نجحت! SIDE متصل بنجاح مع Nicholas!');
    } else {
      console.log('⚠️  بعض الاختبارات فشلت. راجع التقرير للتفاصيل.');
    }
    
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(testResults.summary.failed === 0 ? 0 : 1);
    
  } catch (error: any) {
    console.error('\n❌ خطأ عام في الاختبار:', error.message);
    testResults.error = error.message;
    testResults.endTime = new Date().toISOString();
    
    const reportPath = path.join(__dirname, 'federation-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    process.exit(1);
  }
}

// تشغيل الاختبار
testFederationConnection();
