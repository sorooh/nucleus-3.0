# 🚀 Surooh AI Provider Bridge - Nucleus 3.0 Integration

## نظرة عامة

جسر ذكي يربط بين **Nucleus 3.0** و **4 مزودي ذكاء اصطناعي** مع **Adaptive Routing** تلقائي:

### 🎯 المزودات المدعومة
- ✅ **OpenAI GPT-4o** - General & Coding (API موجود)
- ✅ **Llama 3.3 70B** via Groq - Analysis & Reasoning (API موجود)
- ✅ **Mistral Large** - Conversation & Multilingual (API موجود)
- ⚠️ **Claude 3.5 Sonnet** - Planning & Foresight (يحتاج رصيد)

### 🔥 الميزات الرئيسية

1. **Adaptive Routing** - اختيار تلقائي للمزود حسب نوع المهمة:
   - `analysis` → Llama (40%) or Claude (35%)
   - `conversation` → Mistral (50%)
   - `summarization` → OpenAI (40%)
   - `planning` → Claude (50%)
   - `coding` → OpenAI (45%)

2. **Auto Committee** - تفعيل تلقائي للتصويت الجماعي عند:
   - انخفاض الثقة (< 58%)
   - المهام الحساسة (pricing, payout, invoice, tax, financial)
   - فشل المزود الأول

3. **Auto Distribution** - بث تلقائي للمعرفة عبر:
   - Unified Knowledge Bus (UKB)
   - جميع منصات سُروح (10+)
   - ذكاء جماعي حي

## 📦 المتطلبات

```bash
# Python packages
pip install pyyaml

# API Keys (في .env أو Environment Variables)
OPENAI_API_KEY=your-openai-api-key-here          # ✅ موجود
GROQ_API_KEY=gsk_...           # ✅ موجود
MISTRAL_API_KEY=...            # ✅ موجود
ANTHROPIC_API_KEY=your-anthropic-api-key-here   # ⚠️ يحتاج رصيد
```

## 🚀 التشغيل السريع

### 1. تشغيل Bridge يدوياً

```bash
cd ai-bridge
python3 bridge.py --mode adaptive --port 7010
```

### 2. تشغيل مع Systemd (دائم)

```bash
# نسخ service file
sudo cp surooh-ai-bridge.service /etc/systemd/system/

# تفعيل وتشغيل
sudo systemctl enable surooh-ai-bridge
sudo systemctl start surooh-ai-bridge

# فحص الحالة
sudo systemctl status surooh-ai-bridge
```

### 3. تشغيل مع Bash Script

```bash
chmod +x start-bridge.sh
./start-bridge.sh adaptive 7010
```

## 🧪 الاختبار

### Test 1: Bridge Health
```bash
curl http://127.0.0.1:7010/health
# Expected: {"status":"ok","mode":"adaptive"}
```

### Test 2: Nucleus → Bridge Health
```bash
curl http://localhost:5000/api/bridge/health
# Expected: {"success":true,"bridge":{"healthy":true,"mode":"adaptive"}}
```

### Test 3: Analysis Task (Llama)
```bash
curl -X POST http://localhost:5000/api/bridge/analyze \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Analyze the benefits of AI in healthcare. Give 3 points."}'
```

### Test 4: Conversation Task (Mistral)
```bash
curl -X POST http://localhost:5000/api/bridge/complete \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Hello! How can you help me?", "taskType": "conversation", "maxTokens": 100}'
```

### Test 5: Planning Task (Claude)
```bash
curl -X POST http://localhost:5000/api/bridge/complete \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Create a 3-month AI startup roadmap", "taskType": "planning", "maxTokens": 200}'
```

### Test 6: Coding Task (OpenAI)
```bash
curl -X POST http://localhost:5000/api/bridge/complete \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Write a Python function to calculate Fibonacci", "taskType": "coding", "maxTokens": 150}'
```

## 📊 Routing Policies

ملف `routing_policies.yaml` يحدد:

```yaml
weights:
  analysis:
    llama: 0.40    # Groq - Free & Fast
    claude: 0.35   # Best analysis
    mistral: 0.15
    openai: 0.10
  
  conversation:
    mistral: 0.50  # Best multilingual
    openai: 0.25
    llama: 0.15
    claude: 0.10
  
  summarization:
    openai: 0.40   # Best summarization
    llama: 0.30
    claude: 0.20
    mistral: 0.10
  
  planning:
    claude: 0.50   # Best strategic thinking
    llama: 0.25
    openai: 0.15
    mistral: 0.10
  
  coding:
    openai: 0.45   # Best code generation
    claude: 0.30
    llama: 0.20
    mistral: 0.05
```

## 🔧 الإعدادات

### providers_config.json

```json
{
  "distributor": {
    "enabled": true,
    "broadcast_url": "http://localhost:5000/api/distributor/broadcast"
  },
  "default_mode": "adaptive",
  "thresholds": {
    "low_confidence": 0.62,
    "committee_trigger": 0.58,
    "sensitive_tasks": [
      "pricing.update",
      "payout.execute",
      "invoice.post",
      "financial",
      "payment"
    ]
  },
  "providers": {
    "llama": {
      "base_url": "https://api.groq.com/openai/v1",
      "model": "llama-3.3-70b-versatile"
    },
    "mistral": {
      "base_url": "https://api.mistral.ai/v1",
      "model": "mistral-large-latest"
    },
    "openai": {
      "base_url": "https://api.openai.com/v1",
      "model": "gpt-4o"
    },
    "claude": {
      "base_url": "https://api.anthropic.com/v1",
      "model": "claude-3-5-sonnet-20241022"
    }
  }
}
```

## 🔗 Nucleus Integration

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bridge/health` | GET | فحص حالة البريدج |
| `/api/bridge/complete` | POST | طلب عام (adaptive routing) |
| `/api/bridge/analyze` | POST | تحليل (يختار أفضل مزود) |
| `/api/bridge/claude` | POST | استدعاء Claude مباشرة |

### Usage from Nucleus

```typescript
import { bridgeClient } from '../nucleus/intelligence/bridge-client';

// Adaptive routing
const result = await bridgeClient.complete(
  "Analyze AI trends in 2025",
  {
    taskType: 'analysis',
    maxTokens: 500,
    temperature: 0.7
  }
);

// Direct Claude call
const claude = await bridgeClient.completeClaude(
  "Plan a strategic roadmap",
  { maxTokens: 1000 }
);
```

## 🔒 الأمان

- ✅ API Keys تُخزن في Environment Variables
- ✅ لا توجد مفاتيح في الكود
- ✅ HMAC توقيع داخلي اختياري
- ✅ Timeout محدد (60 seconds)

## 🐛 Troubleshooting

### المشكلة: `fetch failed`
```bash
# تأكد أن Bridge يعمل
ps aux | grep bridge.py
curl http://127.0.0.1:7010/health

# أعد تشغيل Bridge
pkill -f bridge.py
cd ai-bridge && python3 bridge.py --mode adaptive --port 7010 &
```

### المشكلة: `401 Unauthorized`
```bash
# تأكد من API Keys
echo $OPENAI_API_KEY
echo $GROQ_API_KEY
echo $MISTRAL_API_KEY
echo $ANTHROPIC_API_KEY
```

### المشكلة: `PyYAML not found`
```bash
# ثبّت PyYAML
pip install pyyaml
```

## 📈 الأداء

- **Latency**: ~1-3 seconds (حسب المزود)
- **Throughput**: ~10-20 requests/min
- **Cache**: يدعم Redis للتسريع
- **Fallback**: Committee mode عند فشل المزود

## 🎓 أمثلة متقدمة

### Sensitive Task (يفعّل Committee تلقائياً)
```bash
curl -X POST http://localhost:5000/api/bridge/complete \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Calculate invoice total for customer pricing update", "taskId": "pricing.update"}'
```

### Custom Temperature
```bash
curl -X POST http://localhost:5000/api/bridge/complete \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Be creative and write a story", "temperature": 0.9, "maxTokens": 500}'
```

## 📝 الملفات

```
ai-bridge/
├── bridge.py                    # البريدج الرئيسي (FIXED)
├── providers_config.json        # إعدادات المزودين
├── routing_policies.yaml        # سياسات التوجيه
├── start-bridge.sh              # سكربت التشغيل
├── surooh-ai-bridge.service     # Systemd service
├── test_bridge.py               # اختبارات
├── README.md                    # توثيق
└── README_FINAL.md              # هذا الملف
```

## ✅ الحالة الحالية

- ✅ Bridge يعمل بنجاح
- ✅ Adaptive routing يعمل
- ✅ OpenAI, Llama, Mistral tested & working
- ⚠️ Claude يحتاج رصيد
- ✅ Nucleus integration complete
- ✅ Auto distribution ready

## 🚀 الخطوات التالية

1. إضافة رصيد لـ Claude
2. اختبار Committee mode مع جميع المزودين
3. تفعيل Auto Distribution
4. مراقبة الأداء والتحسين

---

**Surooh Empire - Intelligence OS**
Nucleus 3.0 + AI Provider Bridge
