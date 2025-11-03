# 🧠 UIL Integration Guide - Unified Intelligence Layer

## نظرة عامة

**UIL (Unified Intelligence Layer)** هي بوابة الذكاء الموحدة لجميع وحدات Surooh Smart Core. توفر واجهة آمنة ومُحسّنة للوصول إلى AI Provider Bridge.

---

## 🎯 الاستخدام السريع

### في TypeScript/Node.js

```typescript
import { UIL_complete, UIL_analyze, UIL_chat } from '../nucleus/uil/UIL';

// طلب عام
const result = await UIL_complete({
  taskType: "analysis",
  prompt: "Analyze quarterly revenue trends",
  meta: { module: "accounting", userId: "123" }
});

console.log(result.output);        // النتيجة من AI
console.log(result.provider);      // المزود المُستخدم (openai, llama, etc)
console.log(result.latency_ms);    // زمن الاستجابة
console.log(result.traceId);       // معرف التتبع
```

### عبر REST API

```bash
# طلب عام
curl -X POST http://localhost:5000/api/uil/complete \
  -H 'Content-Type: application/json' \
  -d '{
    "taskType": "conversation",
    "prompt": "مرحباً! كيف يمكنني مساعدتك؟",
    "meta": {"module": "support"}
  }'

# تحليل
curl -X POST http://localhost:5000/api/uil/analyze \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Analyze sales data for Q3 2025"}'

# محادثة
curl -X POST http://localhost:5000/api/uil/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Hello, how are you?"}'

# تلخيص
curl -X POST http://localhost:5000/api/uil/summarize \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Summarize this long document..."}'

# تخطيط
curl -X POST http://localhost:5000/api/uil/plan \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Create a marketing roadmap for Q1 2026"}'

# برمجة
curl -X POST http://localhost:5000/api/uil/code \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Write a Python function to calculate Fibonacci"}'
```

---

## 📊 أنواع المهام (Task Types)

| Task Type | الاستخدام | المزود الأمثل | Temperature | Max Tokens |
|-----------|-----------|----------------|-------------|------------|
| `analysis` | تحليل البيانات، التقارير | Llama (40%) | 0.5 | 1024 |
| `conversation` | المحادثة، الدعم الفني | Mistral (50%) | 0.8 | 512 |
| `summarization` | التلخيص | OpenAI (40%) | 0.3 | 512 |
| `planning` | التخطيط الاستراتيجي | Claude (50%) | 0.6 | 1536 |
| `coding` | كتابة الكود | OpenAI (45%) | 0.2 | 2048 |

---

## 🔧 الوظائف المُحسّنة

### 1. UIL_analyze
```typescript
import { UIL_analyze } from '../nucleus/uil/UIL';

const result = await UIL_analyze(
  "Analyze customer behavior patterns from last month's data",
  { module: "analytics", region: "MENA" }
);
```

### 2. UIL_chat
```typescript
import { UIL_chat } from '../nucleus/uil/UIL';

const result = await UIL_chat(
  "مرحباً! أحتاج مساعدة في فهم الفاتورة",
  { module: "support", lang: "ar" }
);
```

### 3. UIL_summarize
```typescript
import { UIL_summarize } from '../nucleus/uil/UIL';

const result = await UIL_summarize(
  "Please summarize this 10-page report: ...",
  { module: "reporting", format: "bullet-points" }
);
```

### 4. UIL_plan
```typescript
import { UIL_plan } from '../nucleus/uil/UIL';

const result = await UIL_plan(
  "Create a 6-month digital transformation roadmap",
  { module: "strategy", budget: 500000 }
);
```

### 5. UIL_code
```typescript
import { UIL_code } from '../nucleus/uil/UIL';

const result = await UIL_code(
  "Write a TypeScript function to validate email addresses with regex",
  { module: "development", framework: "express" }
);
```

---

## 🏥 Health Check

```typescript
import { UIL_health } from '../nucleus/uil/UIL';

const health = await UIL_health();
console.log(health.healthy);      // true/false
console.log(health.bridge);       // معلومات البريدج
console.log(health.error);        // رسالة الخطأ (إن وُجد)
```

```bash
curl http://localhost:5000/api/uil/health
```

**Response:**
```json
{
  "healthy": true,
  "bridge": {
    "status": "ok",
    "mode": "adaptive",
    "providers": {
      "openai": { "available": true },
      "llama": { "available": true },
      "mistral": { "available": true },
      "claude": { "available": false }
    }
  }
}
```

---

## 📈 Statistics

```typescript
import { UIL_stats } from '../nucleus/uil/UIL';

const stats = await UIL_stats();
console.log(stats.provider_stats);
console.log(stats.dynamic_weights);
```

```bash
curl http://localhost:5000/api/uil/stats
```

---

## 🔐 الأمان

### HMAC Authentication
كل طلب يُوقّع بـ HMAC SHA256 باستخدام `CHAT_HMAC_SECRET`:

```typescript
// يحدث تلقائياً داخل UIL.ts
const signature = crypto.createHmac("sha256", HMAC_SECRET)
  .update(requestBody)
  .digest("hex");

headers["X-SRH-Signature"] = signature;
```

### Trace IDs
كل طلب يحصل على معرف فريد للتتبع:

```typescript
const traceId = crypto.randomUUID();
headers["X-Trace-Id"] = traceId;
```

---

## ⚙️ المتغيرات البيئية

```bash
# Required
BRIDGE_URL=http://127.0.0.1:7010
CHAT_HMAC_SECRET=<your_secret_key>

# Optional
UIL_ENABLED=true                      # تفعيل UIL (default: true)
UIL_LOG_LEVEL=info                    # مستوى السجلات (debug, info, warn, error)
UIL_LOG_DIR=/var/log/surooh/uil       # مجلد السجلات
```

---

## 📁 Logging

### Access Logs
`/var/log/surooh/uil/uil-access.log`

```json
{
  "timestamp": "2025-01-19T21:30:45.123Z",
  "level": "info",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "module": "accounting",
  "taskType": "analysis",
  "provider": "llama",
  "latency_ms": 1234,
  "status": "success",
  "message": "UIL analysis completed via llama",
  "meta": { "outputLength": 567 }
}
```

### Error Logs
`/var/log/surooh/uil/uil-error.log`

```json
{
  "timestamp": "2025-01-19T21:31:15.456Z",
  "level": "error",
  "traceId": "660e9500-f30c-52e5-b827-557766551111",
  "module": "support",
  "taskType": "conversation",
  "provider": "mistral",
  "status": "retry",
  "message": "Bridge connection failed - service may be unavailable",
  "meta": { "retryable": true }
}
```

---

## 🔄 Retry Logic

UIL يدعم إعادة المحاولة التلقائية:

```typescript
try {
  const result = await UIL_complete({ taskType: "analysis", prompt: "..." });
} catch (error: UILError) {
  if (error.retryable) {
    // يمكن إعادة المحاولة (503 Service Unavailable)
    console.log("Retrying...");
  } else {
    // خطأ دائم (500 Internal Error)
    console.error("Failed permanently:", error.error);
  }
}
```

---

## 📊 Integration Examples

### Example 1: Accounting Module

```typescript
// في وحدة المحاسبة
import { UIL_analyze } from '../nucleus/uil/UIL';

async function analyzeProfitLoss(month: string) {
  const result = await UIL_analyze(
    `Analyze profit & loss for ${month}. Identify key trends and anomalies.`,
    { module: "accounting", report: "P&L", month }
  );

  return {
    analysis: result.output,
    provider: result.provider,
    generatedAt: result.timestamp
  };
}
```

### Example 2: Support Module

```typescript
// في وحدة الدعم الفني
import { UIL_chat } from '../nucleus/uil/UIL';

async function respondToCustomer(customerMessage: string, lang: string) {
  const result = await UIL_chat(
    customerMessage,
    { module: "support", lang, customerId: "12345" }
  );

  return {
    response: result.output,
    confidence: result.provider === "mistral" ? "high" : "medium"
  };
}
```

### Example 3: Procurement Module

```typescript
// في وحدة المشتريات
import { UIL_plan } from '../nucleus/uil/UIL';

async function evaluateSuppliers(suppliersData: any[]) {
  const prompt = `
    Evaluate these suppliers and rank them by:
    1. Price competitiveness
    2. Delivery reliability
    3. Quality standards
    
    Data: ${JSON.stringify(suppliersData)}
  `;

  const result = await UIL_plan(prompt, {
    module: "procurement",
    action: "supplier_evaluation"
  });

  return parseSupplierRanking(result.output);
}
```

### Example 4: Marketing Module

```typescript
// في وحدة التسويق
import { UIL_summarize, UIL_code } from '../nucleus/uil/UIL';

async function generateCampaignSummary(campaignData: any) {
  const summary = await UIL_summarize(
    `Summarize this marketing campaign performance: ${JSON.stringify(campaignData)}`,
    { module: "marketing", campaign: campaignData.id }
  );

  return summary.output;
}

async function generateEmailTemplate() {
  const code = await UIL_code(
    "Generate an HTML email template for a promotional campaign",
    { module: "marketing", format: "html" }
  );

  return code.output;
}
```

---

## 🚨 Error Handling

```typescript
import { UIL_complete, type UILError } from '../nucleus/uil/UIL';

try {
  const result = await UIL_complete({
    taskType: "analysis",
    prompt: "Analyze data..."
  });
  
  console.log("Success:", result.output);

} catch (error) {
  const uilError = error as UILError;
  
  console.error("Error:", uilError.error);
  console.error("Trace ID:", uilError.traceId);
  console.error("Retryable:", uilError.retryable);
  
  if (uilError.retryable) {
    // يمكن إعادة المحاولة بعد فترة
    setTimeout(() => {
      // retry logic
    }, 5000);
  } else {
    // خطأ دائم - استخدم fallback
    return fallbackResponse();
  }
}
```

---

## 📊 Monitoring

### Prometheus Metrics (via Bridge)

```promql
# إجمالي الطلبات
sum(bridge_requests_total{caller="SuroohNucleus"})

# معدل النجاح
sum(bridge_requests_total{status="success"}) / sum(bridge_requests_total) * 100

# متوسط زمن الاستجابة
avg(bridge_request_duration_seconds_avg)

# الطلبات حسب الوحدة
sum(bridge_requests_total) by (task_type)
```

### Log Analysis

```bash
# عدد الطلبات الناجحة اليوم
grep "success" /var/log/surooh/uil/uil-access.log | wc -l

# متوسط زمن الاستجابة
grep "latency_ms" /var/log/surooh/uil/uil-access.log | \
  jq -r '.latency_ms' | awk '{sum+=$1; n++} END {print sum/n}'

# أكثر الوحدات استخداماً
grep "module" /var/log/surooh/uil/uil-access.log | \
  jq -r '.module' | sort | uniq -c | sort -rn
```

---

## 🎯 Best Practices

### 1. دائماً حدد نوع المهمة بدقة
```typescript
// ✅ جيد
await UIL_complete({ taskType: "analysis", prompt: "Analyze sales..." });

// ❌ سيء
await UIL_complete({ taskType: "conversation", prompt: "Analyze sales..." });
```

### 2. أضف metadata مفيد
```typescript
// ✅ جيد
await UIL_analyze("...", {
  module: "accounting",
  userId: "123",
  action: "monthly_report"
});

// ❌ سيء
await UIL_analyze("...");  // لا توجد معلومات للتتبع
```

### 3. تعامل مع الأخطاء بشكل صحيح
```typescript
// ✅ جيد
try {
  const result = await UIL_complete({...});
} catch (error: UILError) {
  if (error.retryable) {
    // إعادة المحاولة
  } else {
    // fallback
  }
}

// ❌ سيء
const result = await UIL_complete({...});  // بدون try-catch
```

### 4. استخدم الوظائف المُحسّنة
```typescript
// ✅ جيد
await UIL_analyze("...");  // محسّن للتحليل

// ❌ مقبول لكن أقل كفاءة
await UIL_complete({ taskType: "analysis", prompt: "..." });
```

---

## 🔄 Migration Guide

### من AI Committee إلى UIL

**قبل:**
```typescript
import { aiCommittee } from '../nucleus/intelligence/ai-committee';

const result = await aiCommittee.analyze("Analyze data...");
```

**بعد:**
```typescript
import { UIL_analyze } from '../nucleus/uil/UIL';

const result = await UIL_analyze("Analyze data...", { module: "myModule" });
```

### من Bridge Client مباشرة إلى UIL

**قبل:**
```typescript
import { bridgeClient } from '../nucleus/intelligence/bridge-client';

const result = await bridgeClient.complete("Analyze data...", {
  taskType: "analysis"
});
```

**بعد:**
```typescript
import { UIL_analyze } from '../nucleus/uil/UIL';

const result = await UIL_analyze("Analyze data...");
```

---

## 📞 Support

### Issues
إذا واجهت مشكلة:
1. تحقق من `/var/log/surooh/uil/uil-error.log`
2. تحقق من `curl http://localhost:5000/api/uil/health`
3. تحقق من `curl http://localhost:7010/health`

### Configuration
تأكد من:
```bash
echo $BRIDGE_URL          # يجب أن يكون http://127.0.0.1:7010
echo $CHAT_HMAC_SECRET    # يجب أن لا يكون فارغاً
echo $UIL_ENABLED         # يجب أن يكون true أو غير موجود
```

---

**Surooh Empire - Unified Intelligence Layer**  
**Nucleus 3.1.1 - Production Ready**
