/**
 * Nicholas 3.2 - Federation Load Testing
 * اختبار الأداء تحت الضغط
 */

import axios from 'axios';
import crypto from 'crypto';

const NICHOLAS_URL = 'http://localhost:5000';
const TEST_CONFIG = {
  // عدد الطلبات المتزامنة
  concurrentRequests: 50,
  // عدد الدفعات
  batches: 10,
  // التأخير بين الدفعات (ms)
  batchDelay: 1000
};

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Map<string, number>;
  startTime: number;
  endTime: number;
  duration: number;
}

class FederationLoadTester {
  private results: LoadTestResult = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    requestsPerSecond: 0,
    errors: new Map(),
    startTime: 0,
    endTime: 0,
    duration: 0
  };

  private responseTimes: number[] = [];

  /**
   * تسجيل عقدة جديدة
   */
  async registerNode(nodeId: string): Promise<any> {
    const response = await axios.post(`${NICHOLAS_URL}/api/federation/register`, {
      nodeId: `load-test-${nodeId}`,
      nodeName: `Load Test Node ${nodeId}`,
      arabicName: `عقدة اختبار ${nodeId}`,
      nodeType: 'development',
      organizationId: 'surooh-holding',
      nucleusLevel: 'main',
      nodeUrl: `https://test-${nodeId}.surooh.ai`,
      apiVersion: 'v1'
    });
    return response.data;
  }

  /**
   * إنشاء HMAC signature
   */
  createHmacSignature(secret: string, payload: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `v1=${hmac.digest('hex')}`;
  }

  /**
   * إرسال heartbeat
   */
  async sendHeartbeat(credentials: any): Promise<number> {
    const timestamp = Date.now();
    const bodyHash = crypto.createHash('sha256')
      .update(JSON.stringify({ nodeId: credentials.nodeId }))
      .digest('hex');
    
    const hmacPayload = `POST\n/api/federation/heartbeat\n${bodyHash}\n${timestamp}`;
    const hmacSignature = this.createHmacSignature(credentials.credentials.hmacSecret, hmacPayload);
    
    const startTime = Date.now();
    
    try {
      await axios.post(
        `${NICHOLAS_URL}/api/federation/heartbeat`,
        { nodeId: credentials.nodeId },
        {
          headers: {
            'Authorization': `Bearer ${credentials.credentials.authToken}`,
            'X-Surooh-KeyId': credentials.credentials.keyId,
            'X-Surooh-Timestamp': timestamp.toString(),
            'X-Surooh-Signature': hmacSignature,
            'X-Surooh-CodeSig': credentials.credentials.codeSignature
          }
        }
      );
      
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      this.results.successfulRequests++;
      
      return responseTime;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      this.results.failedRequests++;
      
      const errorKey = error.response?.data?.message || error.message;
      this.results.errors.set(errorKey, (this.results.errors.get(errorKey) || 0) + 1);
      
      return responseTime;
    }
  }

  /**
   * اختبار دفعة واحدة من الطلبات
   */
  async runBatch(batchNumber: number, credentials: any[]): Promise<void> {
    console.log(`\n📦 دفعة ${batchNumber}: ${credentials.length} طلب متزامن...`);
    
    const promises = credentials.map(cred => this.sendHeartbeat(cred));
    const responseTimes = await Promise.all(promises);
    
    const avgBatchTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(`   ⏱️  متوسط وقت الاستجابة: ${avgBatchTime.toFixed(2)}ms`);
  }

  /**
   * تنفيذ اختبار الضغط الكامل
   */
  async runLoadTest(): Promise<LoadTestResult> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🚀 Nicholas 3.2 - Federation Load Testing');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`📊 إعدادات الاختبار:`);
    console.log(`   • طلبات متزامنة: ${TEST_CONFIG.concurrentRequests}`);
    console.log(`   • عدد الدفعات: ${TEST_CONFIG.batches}`);
    console.log(`   • إجمالي الطلبات: ${TEST_CONFIG.concurrentRequests * TEST_CONFIG.batches}`);
    
    // 1. تسجيل العقد
    console.log(`\n📝 الخطوة 1: تسجيل ${TEST_CONFIG.concurrentRequests} عقدة...`);
    const nodeCredentials: any[] = [];
    
    for (let i = 0; i < TEST_CONFIG.concurrentRequests; i++) {
      try {
        const creds = await this.registerNode(`${Date.now()}-${i}`);
        nodeCredentials.push(creds);
      } catch (error: any) {
        if (error.response?.status === 409) {
          // Node already exists - that's ok
          continue;
        }
        console.log(`   ⚠️  خطأ في تسجيل العقدة ${i}: ${error.message}`);
      }
    }
    
    console.log(`✅ تم تسجيل ${nodeCredentials.length} عقدة بنجاح`);
    
    if (nodeCredentials.length === 0) {
      console.log('❌ لا توجد عقد مسجلة - فشل الاختبار');
      return this.results;
    }
    
    // 2. اختبار الضغط
    console.log(`\n🔥 الخطوة 2: اختبار الضغط - ${TEST_CONFIG.batches} دفعة...`);
    this.results.startTime = Date.now();
    
    for (let batch = 1; batch <= TEST_CONFIG.batches; batch++) {
      await this.runBatch(batch, nodeCredentials);
      
      // تأخير بين الدفعات
      if (batch < TEST_CONFIG.batches) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.batchDelay));
      }
    }
    
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;
    
    // 3. حساب الإحصائيات
    this.calculateStatistics();
    
    // 4. عرض النتائج
    this.displayResults();
    
    return this.results;
  }

  /**
   * حساب الإحصائيات
   */
  calculateStatistics(): void {
    this.results.totalRequests = this.results.successfulRequests + this.results.failedRequests;
    
    if (this.responseTimes.length > 0) {
      this.results.averageResponseTime = 
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      this.results.minResponseTime = Math.min(...this.responseTimes);
      this.results.maxResponseTime = Math.max(...this.responseTimes);
    }
    
    if (this.results.duration > 0) {
      this.results.requestsPerSecond = 
        (this.results.totalRequests / this.results.duration) * 1000;
    }
  }

  /**
   * عرض النتائج
   */
  displayResults(): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 نتائج اختبار الضغط');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📈 إحصائيات الطلبات:');
    console.log(`   • إجمالي الطلبات: ${this.results.totalRequests}`);
    console.log(`   • ناجح: ${this.results.successfulRequests} ✅`);
    console.log(`   • فاشل: ${this.results.failedRequests} ❌`);
    console.log(`   • نسبة النجاح: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);
    
    console.log('\n⏱️  الأداء:');
    console.log(`   • متوسط وقت الاستجابة: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`   • أسرع استجابة: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`   • أبطأ استجابة: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`   • الطلبات في الثانية: ${this.results.requestsPerSecond.toFixed(2)} req/s`);
    console.log(`   • المدة الإجمالية: ${(this.results.duration / 1000).toFixed(2)}s`);
    
    if (this.results.errors.size > 0) {
      console.log('\n❌ الأخطاء:');
      this.results.errors.forEach((count, error) => {
        console.log(`   • ${error}: ${count} مرة`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    
    // تقييم الأداء
    this.evaluatePerformance();
  }

  /**
   * تقييم الأداء
   */
  evaluatePerformance(): void {
    console.log('\n🎯 تقييم الأداء:\n');
    
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    const avgTime = this.results.averageResponseTime;
    
    if (successRate >= 99 && avgTime < 100) {
      console.log('🌟 ممتاز! النظام يعمل بأداء عالي جداً');
      console.log('   ✓ نسبة نجاح عالية (>99%)');
      console.log('   ✓ استجابة سريعة (<100ms)');
    } else if (successRate >= 95 && avgTime < 200) {
      console.log('✅ جيد جداً! النظام يعمل بشكل مستقر');
      console.log('   ✓ نسبة نجاح جيدة (>95%)');
      console.log('   ✓ استجابة معقولة (<200ms)');
    } else if (successRate >= 90 && avgTime < 500) {
      console.log('⚠️  مقبول - يحتاج تحسين');
      console.log('   ! نسبة النجاح يمكن تحسينها');
      console.log('   ! وقت الاستجابة يمكن تحسينه');
    } else {
      console.log('❌ ضعيف - يحتاج تحسين عاجل');
      if (successRate < 90) {
        console.log('   ! نسبة فشل عالية جداً');
      }
      if (avgTime >= 500) {
        console.log('   ! وقت استجابة بطيء جداً');
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n');
  }
}

// تشغيل الاختبار
async function main() {
  const tester = new FederationLoadTester();
  
  try {
    await tester.runLoadTest();
  } catch (error) {
    console.error('\n❌ خطأ عام في الاختبار:', error);
  }
}

main();
