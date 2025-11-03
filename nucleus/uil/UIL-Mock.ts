/**
 * UIL Mock Mode - For Development & Testing Without Bridge
 * Nucleus 3.1.1
 */

import type { UILRequest, UILResponse } from './UIL';
import { randomUUID } from 'crypto';

/**
 * Mock responses for different task types
 */
const MOCK_RESPONSES: Record<string, string> = {
  analysis: `تحليل البيانات المقدمة:

**النقاط الرئيسية:**
1. النمو الإيجابي: ارتفاع بنسبة 15% في الإيرادات
2. تحسن الربحية: ارتفاع 18% في صافي الربح
3. توصية: مراقبة نمو المصاريف التشغيلية

**التوصيات:**
- الحفاظ على الزخم الحالي
- تحسين كفاءة التكاليف
- توسيع قاعدة الإيرادات`,

  conversation: `مرحباً بك! 👋

يسعدني مساعدتك. فاتورتك الأخيرة قد تكون أعلى للأسباب التالية:
1. خدمات إضافية تم استخدامها
2. تجديد الاشتراك السنوي
3. رسوم معاملات إضافية

هل تريد مراجعة تفاصيل الفاتورة معاً؟`,

  summarization: `ملخص الحملة التسويقية:

الحملة حققت نتائج ممتازة بعائد استثمار 250% وتحويلات فعالة بنسبة 2.8%، مع وصول واسع لـ 2.5 مليون مستخدم وتفاعل قوي بمعدل نقر 5%.`,

  planning: `خطة تقييم واختيار المورّد:

**المرحلة 1: التحليل الأولي** (أسبوع 1-2)
- جمع عروض الأسعار من 5-7 موردين
- مراجعة شهادات الجودة والاستدامة

**المرحلة 2: التقييم الفني** (أسبوع 3-4)
- فحص عينات المواد الخام
- تقييم معايير الجودة
- مراجعة سجل التسليم

**المرحلة 3: التفاوض والاختيار** (أسبوع 5-6)
- التفاوض على الأسعار والشروط
- مراجعة العقود القانونية
- اختيار المورد الأفضل

**المرحلة 4: التنفيذ** (أسبوع 7-8)
- إبرام العقد النهائي
- إعداد خطة التوريد
- بدء التعاون التجريبي`,

  coding: `\`\`\`typescript
function validateEmail(email: string): boolean {
  try {
    // Regex pattern for email validation
    const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
    
    // Check if email matches pattern
    if (!emailRegex.test(email)) {
      return false;
    }
    
    // Additional validation
    if (email.length > 254) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Email validation error:', error);
    return false;
  }
}

// Example usage:
console.log(validateEmail('user@example.com')); // true
console.log(validateEmail('invalid.email'));     // false
\`\`\``,
};

/**
 * Mock provider selection based on task type
 */
function getMockProvider(taskType: string): string {
  const providers: Record<string, string> = {
    analysis: 'llama',
    conversation: 'mistral',
    summarization: 'openai',
    planning: 'claude',
    coding: 'openai',
  };
  
  return providers[taskType] || 'openai';
}

/**
 * Generate mock UIL response
 */
export function generateMockResponse(request: UILRequest): UILResponse {
  const taskType = request.taskType || 'conversation';
  const provider = getMockProvider(taskType);
  const traceId = randomUUID();
  
  // Simulate latency (500-2000ms)
  const latency = Math.floor(Math.random() * 1500) + 500;
  
  // Get mock response for task type
  let output = MOCK_RESPONSES[taskType] || MOCK_RESPONSES.conversation;
  
  // Add prompt-specific context
  if (request.prompt) {
    const promptLower = request.prompt.toLowerCase();
    
    // Customize response based on keywords
    if (promptLower.includes('sales') || promptLower.includes('مبيعات')) {
      output = `📊 تحليل المبيعات:\n\n${output}`;
    } else if (promptLower.includes('customer') || promptLower.includes('عميل')) {
      output = `👤 دعم العملاء:\n\n${output}`;
    } else if (promptLower.includes('code') || promptLower.includes('function')) {
      output = MOCK_RESPONSES.coding;
    }
  }
  
  return {
    output,
    provider,
    traceId,
    latency_ms: latency,
    timestamp: new Date().toISOString(),
    taskType: taskType as any,
  };
}

/**
 * Mock health check
 */
export function getMockHealth() {
  return {
    healthy: true,
    bridge: {
      status: 'ok',
      mode: 'mock',
      providers: {
        openai: { available: true },
        llama: { available: true },
        mistral: { available: true },
        claude: { available: true },
      },
    },
  };
}

/**
 * Mock statistics
 */
export function getMockStats() {
  return {
    mode: 'mock',
    requests_total: 127,
    success_rate: 100.0,
    avg_latency_ms: 1234,
    provider_stats: {
      openai: { requests: 45, success: 45, avg_latency: 1100 },
      llama: { requests: 35, success: 35, avg_latency: 1500 },
      mistral: { requests: 30, success: 30, avg_latency: 1200 },
      claude: { requests: 17, success: 17, avg_latency: 1000 },
    },
  };
}
