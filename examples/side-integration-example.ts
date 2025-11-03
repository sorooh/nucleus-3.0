/**
 * مثال عملي - كيفية استخدام SIDE Connector للاتصال بـ Nicholas 3.2
 * 
 * هذا المثال يوضح:
 * 1. التسجيل مع Nicholas
 * 2. حفظ Credentials
 * 3. إرسال Heartbeat
 * 4. الاتصال بـ WebSocket
 */

import { SIDEConnector, SIDENodeConfig } from '../client/side-connector';
import * as fs from 'fs';
import * as path from 'path';

// ===== الخطوة 1: إعداد بيانات العقدة =====
const nodeConfig: SIDENodeConfig = {
  // معلومات العقدة الأساسية
  nodeId: 'side-node-main',
  nodeName: 'Surooh SIDE - Main Development Node',
  arabicName: 'سِيدا - النواة الأم للتطوير',
  nodeType: 'development',
  
  // معلومات المؤسسة
  organizationId: 'surooh-holding',
  nucleusLevel: 'main',
  
  // عنوان SIDE (استبدله بعنوان Replit الخاص بك)
  nodeUrl: 'https://YOUR-SIDE-REPLIT.replit.dev',
  
  // الصلاحيات المطلوبة
  permissions: [
    'code:sync',
    'knowledge:share',
    'protocol:update',
    'ai:assist'
  ],
  
  // Endpoints المسموح بها
  allowedEndpoints: [
    '/api/federation/*',
    '/api/knowledge/*'
  ],
  
  // القدرات التقنية
  capabilities: {
    ai_models: true,
    code_generation: true,
    knowledge_sync: true,
    realtime_sync: true
  },
  
  // النسخة
  sideVersion: '1.0.0',
  
  // التصنيفات
  tags: ['development', 'main', 'surooh']
};

// ===== الخطوة 2: إنشاء Connector =====
// استبدل هذا بعنوان Nicholas الخاص بك
const NICHOLAS_URL = 'https://YOUR-NICHOLAS-REPLIT.replit.dev';
const connector = new SIDEConnector(NICHOLAS_URL, nodeConfig);

// ملف لحفظ Credentials (احفظه بشكل آمن!)
const CREDENTIALS_FILE = path.join(__dirname, '../.side-credentials.json');

// ===== الخطوة 3: وظائف مساعدة =====

/**
 * حفظ Credentials في ملف محلي
 */
function saveCredentials(credentials: any) {
  fs.writeFileSync(
    CREDENTIALS_FILE,
    JSON.stringify(credentials, null, 2),
    'utf-8'
  );
  console.log(`💾 تم حفظ Credentials في: ${CREDENTIALS_FILE}`);
  console.log('⚠️  تحذير: احفظ هذا الملف بشكل آمن ولا تشاركه!');
}

/**
 * تحميل Credentials من ملف محلي
 */
function loadCredentials(): any | null {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

// ===== الخطوة 4: السيناريو الرئيسي =====

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 SIDE Connector - Nicholas 3.2 Integration Example');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // التحقق من وجود credentials محفوظة
    const savedCredentials = loadCredentials();
    
    if (!savedCredentials) {
      console.log('📝 لم يتم العثور على credentials محفوظة');
      console.log('🔄 بدء عملية التسجيل الجديدة...\n');
      
      // === التسجيل ===
      const registrationResult = await connector.register();
      
      if (!registrationResult.success) {
        console.error('❌ فشل التسجيل:', registrationResult.error);
        process.exit(1);
      }
      
      // حفظ Credentials
      if (registrationResult.credentials) {
        saveCredentials({
          ...registrationResult.credentials,
          nodeId: nodeConfig.nodeId,
          registeredAt: new Date().toISOString()
        });
        console.log('');
      }
    } else {
      console.log('✅ تم العثور على credentials محفوظة');
      console.log(`📝 Node ID: ${savedCredentials.nodeId}`);
      console.log(`🔑 Key ID: ${savedCredentials.keyId}\n`);
      
      // تحميل credentials في connector
      (connector as any).credentials = {
        keyId: savedCredentials.keyId,
        authToken: savedCredentials.authToken,
        hmacSecret: savedCredentials.hmacSecret,
        codeSignature: savedCredentials.codeSignature
      };
    }
    
    // === اختبار الاتصال - Heartbeat ===
    console.log('💓 اختبار الاتصال - إرسال Heartbeat...');
    const heartbeatResult = await connector.sendHeartbeat(100);
    console.log('✅ Heartbeat ناجح:', heartbeatResult.message);
    console.log(`📊 Status: ${heartbeatResult.node.status}`);
    console.log(`❤️  Health: ${heartbeatResult.node.health}%\n`);
    
    // === اختبار التفعيل (اختياري) ===
    console.log('🔓 اختبار التفعيل...');
    try {
      const activationResult = await connector.activate();
      console.log('✅ تم التفعيل:', activationResult.message);
    } catch (error: any) {
      if (error.response?.status === 200) {
        console.log('✅ العقدة مفعلة مسبقاً');
      } else {
        console.log('⚠️  التفعيل:', error.response?.data?.message || error.message);
      }
    }
    console.log('');
    
    // === اختبار WebSocket (اختياري) ===
    console.log('🔌 اختبار WebSocket (اختياري)...');
    try {
      await connector.connectWebSocket();
      console.log('✅ WebSocket متصل بنجاح!');
      
      // انتظر قليلاً لاستقبال رسائل
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // إغلاق الاتصال
      connector.disconnect();
      console.log('🔌 تم قطع الاتصال بـ WebSocket');
    } catch (error: any) {
      console.log('⚠️  WebSocket:', error.message);
      console.log('   (WebSocket اختياري - النظام يعمل بدونه)');
    }
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 اكتمل الاختبار بنجاح!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📌 الخطوات التالية:');
    console.log('   1. تحقق من Nicholas audit logs');
    console.log('   2. ابدأ المزامنة الدورية للبيانات');
    console.log('   3. اختبر knowledge sharing');
    console.log('   4. جهّز للنشر السحابي\n');
    
  } catch (error: any) {
    console.error('\n❌ خطأ:', error.message);
    if (error.response) {
      console.error('📄 Response:', error.response.data);
    }
    process.exit(1);
  }
}

// ===== تشغيل المثال =====
if (require.main === module) {
  main().catch(console.error);
}

// ===== إعادة تصدير للاستخدام كـ library =====
export { connector, nodeConfig };
