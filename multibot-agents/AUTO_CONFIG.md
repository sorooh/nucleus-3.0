# 🚀 Auto-Config من Nucleus Core

## طريقة ذكية لإعداد البوت تلقائياً!

بدل ما تعمل `.env` يدوي، خلي البوت ياخذ الإعدادات من النواة تلقائياً! 🎯

---

## الطريقة السريعة (موصى بها)

### 1️⃣ حدد البيئة
```bash
export NUCLEUS_URL=https://your-nucleus.replit.app
export PLATFORM=B2B        # أو B2C, CE, Accounting, Shipping, إلخ
export BOT_TYPE=manager    # أو support, maintenance
```

### 2️⃣ اجلب Config تلقائياً
```bash
npm run fetch-config
```

### 3️⃣ شغل البوت
```bash
npm start
```

**✨ خلاص! البوت جاهز ومتصل بالنواة!**

---

## 🔒 نظام الأمان (Platform-Specific Secrets)

**⚠️ مهم جداً:**
- كل منصة عندها HMAC secret **خاص بها فقط**
- الـ secret يتولد تلقائياً من: `SHA256(platform:masterSeed)`
- حتى لو شخص حصل على secret منصة واحدة، **ما يقدر يستخدمه لمنصة ثانية!**

**كيف يعمل:**
```
B2B Secret     = SHA256("B2B:master-seed")        → abc123...
B2C Secret     = SHA256("B2C:master-seed")        → def456...
Accounting Secret = SHA256("Accounting:master-seed") → ghi789...
```

كل منصة معزولة أمنياً! 🛡️

---

## أمثلة للمنصات المختلفة

### B2B Manager Bot
```bash
NUCLEUS_URL=https://nucleus.replit.app \
PLATFORM=B2B \
BOT_TYPE=manager \
npm run fetch-config

npm start
```

### Accounting Support Bot
```bash
NUCLEUS_URL=https://nucleus.replit.app \
PLATFORM=Accounting \
BOT_TYPE=support \
npm run fetch-config

npm start
```

### Shipping Maintenance Bot
```bash
NUCLEUS_URL=https://nucleus.replit.app \
PLATFORM=Shipping \
BOT_TYPE=maintenance \
npm run fetch-config

npm start
```

---

## API Endpoints المتاحة

### 1. قائمة المنصات
```bash
GET /api/multibot/platforms
```

**Response:**
```json
{
  "success": true,
  "platforms": [
    {
      "id": "B2B",
      "nameAr": "منصة التجارة B2B",
      "botTypes": [
        {
          "id": "manager",
          "nameAr": "مدير العمليات",
          "configUrl": "/api/multibot/config/B2B/manager"
        },
        ...
      ]
    },
    ...
  ]
}
```

### 2. Config لمنصة معينة
```bash
GET /api/multibot/config/:platform/:botType
```

**مثال:**
```bash
curl https://nucleus.replit.app/api/multibot/config/B2B/manager
```

**Response:**
```json
{
  "success": true,
  "platform": "B2B",
  "botType": "manager",
  "platformName": "منصة التجارة B2B",
  "botName": "منصة التجارة B2B - مدير العمليات",
  "nucleusUrl": "https://nucleus.replit.app",
  "envFile": "# ملف .env الكامل جاهز\n...",
  "instructions": {
    "ar": "...",
    "en": "..."
  }
}
```

### 3. التحقق من صحة Config
```bash
POST /api/multibot/validate-config
Content-Type: application/json

{
  "platform": "B2B",
  "botType": "manager",
  "hmacSecret": "your-secret"
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "platform": "valid",
    "botType": "valid",
    "hmacSecret": "valid"
  },
  "canConnect": true
}
```

---

## للمنصات التي تريد Integration تلقائي

### في كود المنصة:
```javascript
import axios from 'axios';
import fs from 'fs';

const NUCLEUS_URL = 'https://nucleus.replit.app';
const PLATFORM = 'B2B';
const BOT_TYPE = 'manager';

async function setupBot() {
  // 1. جلب Config من النواة
  const response = await axios.get(
    `${NUCLEUS_URL}/api/multibot/config/${PLATFORM}/${BOT_TYPE}`
  );
  
  const { envFile } = response.data;
  
  // 2. حفظ .env
  fs.writeFileSync('.env', envFile);
  
  // 3. تشغيل البوت (أو exec spawn)
  console.log('✅ Bot configured and ready!');
}

setupBot();
```

---

## المنصات المدعومة

| Platform | ID | Arabic Name |
|----------|-----|-------------|
| B2B | `B2B` | منصة التجارة B2B |
| B2C | `B2C` | منصة التجارة B2C |
| CE | `CE` | محرك التجارة الإلكترونية |
| Accounting | `Accounting` | نظام المحاسبة |
| Shipping | `Shipping` | نظام الشحن |
| Mail Hub | `MAIL_HUB` | مركز البريد |

## أنواع البوتات

| Bot Type | ID | Arabic Name |
|----------|-----|-------------|
| Manager | `manager` | مدير العمليات |
| Support | `support` | الدعم الفني |
| Maintenance | `maintenance` | الصيانة |

---

## Troubleshooting

### ❌ "Unknown platform"
**السبب:** اسم المنصة غلط

**الحل:**
```bash
# اعرض المنصات المتاحة
curl https://nucleus.replit.app/api/multibot/platforms
```

### ❌ "Cannot connect to Nucleus"
**السبب:** URL النواة غلط أو النواة مش شغالة

**الحل:**
```bash
# تأكد أن النواة شغالة
curl https://nucleus.replit.app/api/health
```

### ❌ "HMAC signature mismatch"
**السبب:** المفتاح السري مش مطابق

**الحل:**
- استخدم `npm run fetch-config` لجلب المفتاح الصحيح تلقائياً
- الـ secret خاص بكل منصة - ما تستخدم secret منصة ثانية!
- تأكد أن `BOT_UNIT` في `.env` يطابق platform name الصحيح

---

## الخلاصة

✅ **بدل:**
```bash
# عمل يدوي
cp .env.sample .env
nano .env  # املأ القيم يدوي
npm start
```

✅ **استخدم:**
```bash
# تلقائي ذكي
NUCLEUS_URL=https://nucleus.replit.app PLATFORM=B2B BOT_TYPE=manager npm run fetch-config
npm start
```

**🚀 أسرع، أذكى، بدون أخطاء!**

---

## 🔐 Security Notice

**Platform-Specific HMAC Secrets:**
Each platform gets a unique HMAC secret derived from a master seed. This means:
- ✅ If one platform's secret is compromised, other platforms remain secure
- ✅ Secrets are automatically generated and managed by Nucleus Core
- ✅ No need to manually configure or rotate secrets per platform
- ✅ Each bot gets the exact secret it needs from the auto-config API

**How it works:**
```typescript
// Server generates platform-specific secret
platformSecret = SHA256(`${platform}:${masterSeed}`)

// Bot receives this exact secret in .env
SRH_HMAC_SECRET=<platform-specific-secret>

// Bot signs requests with platform secret
signature = HMAC-SHA256(platformSecret, payload)

// Server verifies with same platform secret
✅ Match = Authorized ✅
```

**Security Benefits:**
1. **Isolation:** B2B bots can't impersonate B2C bots
2. **Revocation:** Can revoke one platform without affecting others
3. **Traceability:** Each signature identifies the platform
4. **Zero-Config:** Platforms get correct secrets automatically
