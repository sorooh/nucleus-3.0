# 🧪 UIL Mock Mode Guide

## Overview

Mock Mode allows you to test UIL functionality **without running AI Provider Bridge**. Perfect for:
- ✅ Development and testing
- ✅ Integration testing without API costs
- ✅ UI/UX development
- ✅ Debugging UIL logic

---

## 🚀 Quick Start

### Enable Mock Mode

```bash
# In terminal
export UIL_MOCK_MODE=true

# Or in .env
UIL_MOCK_MODE=true
```

### Restart Application

```bash
npm run dev
```

---

## 🧪 Testing

### Option 1: Run Test Script

```bash
./test-uil-mock.sh
```

This will test all 7 endpoints:
1. Health Check
2. Analyze (تحليل)
3. Chat (محادثة)
4. Summarize (تلخيص)
5. Plan (تخطيط)
6. Code (برمجة)
7. Statistics

### Option 2: Manual Testing

```bash
# Health Check
curl http://localhost:5000/api/uil/health

# Chat Test
curl -X POST http://localhost:5000/api/uil/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"مرحباً!","meta":{"module":"support"}}'

# Analysis Test
curl -X POST http://localhost:5000/api/uil/analyze \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Analyze sales data","meta":{"module":"accounting"}}'
```

### Option 3: TypeScript Testing

```typescript
// Set environment variable first
process.env.UIL_MOCK_MODE = "true";

import { UIL_chat, UIL_analyze } from './nucleus/uil/UIL';

// Test chat
const chatResult = await UIL_chat("Hello!");
console.log(chatResult);

// Test analysis
const analysisResult = await UIL_analyze("Analyze Q3 data");
console.log(analysisResult);
```

---

## 📊 Mock Responses

### Analysis (تحليل)
```
تحليل البيانات المقدمة:

**النقاط الرئيسية:**
1. النمو الإيجابي: ارتفاع بنسبة 15% في الإيرادات
2. تحسن الربحية: ارتفاع 18% في صافي الربح
3. توصية: مراقبة نمو المصاريف التشغيلية

**التوصيات:**
- الحفاظ على الزخم الحالي
- تحسين كفاءة التكاليف
- توسيع قاعدة الإيرادات
```

### Conversation (محادثة)
```
مرحباً بك! 👋

يسعدني مساعدتك. فاتورتك الأخيرة قد تكون أعلى للأسباب التالية:
1. خدمات إضافية تم استخدامها
2. تجديد الاشتراك السنوي
3. رسوم معاملات إضافية

هل تريد مراجعة تفاصيل الفاتورة معاً؟
```

### Code (برمجة)
```typescript
function validateEmail(email: string): boolean {
  try {
    const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      return false;
    }
    
    if (email.length > 254) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Email validation error:', error);
    return false;
  }
}
```

---

## 🔄 Provider Distribution

Mock Mode simulates adaptive routing:

| Task Type | Mock Provider | Latency |
|-----------|---------------|---------|
| analysis | llama | 500-2000ms |
| conversation | mistral | 500-2000ms |
| summarization | openai | 500-2000ms |
| planning | claude | 500-2000ms |
| coding | openai | 500-2000ms |

---

## 📈 Mock Statistics

```json
{
  "mode": "mock",
  "requests_total": 127,
  "success_rate": 100.0,
  "avg_latency_ms": 1234,
  "provider_stats": {
    "openai": { "requests": 45, "success": 45, "avg_latency": 1100 },
    "llama": { "requests": 35, "success": 35, "avg_latency": 1500 },
    "mistral": { "requests": 30, "success": 30, "avg_latency": 1200 },
    "claude": { "requests": 17, "success": 17, "avg_latency": 1000 }
  }
}
```

---

## 🏥 Mock Health

```json
{
  "healthy": true,
  "bridge": {
    "status": "ok",
    "mode": "mock",
    "providers": {
      "openai": { "available": true },
      "llama": { "available": true },
      "mistral": { "available": true },
      "claude": { "available": true }
    }
  }
}
```

---

## 🔧 Customizing Mock Responses

Edit `nucleus/uil/UIL-Mock.ts` to customize responses:

```typescript
const MOCK_RESPONSES: Record<string, string> = {
  analysis: "Your custom analysis response...",
  conversation: "Your custom conversation response...",
  // ... etc
};
```

---

## ⚠️ Limitations

Mock Mode simulates UIL behavior but:
- ❌ No actual AI inference
- ❌ No real provider selection logic
- ❌ Fixed latency simulation
- ❌ No caching behavior
- ❌ No real error scenarios

**Use Mock Mode for:**
- ✅ UI/UX development
- ✅ Integration testing
- ✅ API contract validation
- ✅ Performance testing (structure)

**Use Real Bridge for:**
- ✅ Production deployment
- ✅ AI quality testing
- ✅ Provider performance comparison
- ✅ Real-world scenarios

---

## 🔄 Switching Between Modes

### To Mock Mode
```bash
export UIL_MOCK_MODE=true
npm run dev
```

### To Real Bridge
```bash
unset UIL_MOCK_MODE
# Start Bridge first
cd ai-bridge
python3 bridge_enhanced.py --mode adaptive --port 7010 &
cd ..
npm run dev
```

---

## 📝 Integration Test with Mock

```bash
# Enable mock mode
export UIL_MOCK_MODE=true

# Run integration tests
npx tsx nucleus/uil/integration-tests.ts
```

Expected output:
```
✅ Passed: 10/10
📊 Avg Response Time: ~1000ms
📡 Provider Distribution: All simulated
```

---

**Surooh Empire - UIL Mock Mode**  
**Perfect for Development & Testing**
