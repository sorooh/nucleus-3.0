# Surooh MultiBot Agent v2.0

## 📋 نظرة عامة

نظام بوتات متخصصة تعمل **تحت سيطرة Nucleus Core** بالكامل. **لا شيء يتم بدون إذن النواة!**

### 🤖 البوتات:
- **Manager Bot** 👔 → إدارة العمليات (بعد موافقة النواة)
- **Support Bot** 💬 → دعم فني تلقائي (بعد موافقة النواة)
- **Maintenance Bot** 🛠️ → صيانة النظام (**يطلب إذن دائماً**)

---

## 🔐 Command & Control Protocol

### القاعدة الذهبية:
```
البوت يطلب → النواة توافق/ترفض → البوت ينفذ
```

### WebSocket Control Channel:
```
wss://nucleus.replit.app/ws/control
```

### أنواع الأوامر من النواة:
- `START_BOT` - تفعيل البوت
- `STOP_BOT` - إيقاف البوت
- `RESTART_BOT` - إعادة تشغيل
- `GET_STATUS` - طلب الحالة
- `EXECUTE_TASK` - تنفيذ مهمة محددة
- `EMERGENCY_SHUTDOWN` - إيقاف طارئ

### طلب الإذن (خصوصاً Maintenance):
```javascript
// البوت يطلب إذن
{
  "type": "PERMISSION_REQUEST",
  "action": "MEMORY_CLEANUP",
  "details": { ... },
  "signature": "hmac_sha256"
}

// النواة ترد
{
  "type": "PERMISSION_RESPONSE",
  "approved": true,  // أو false
  "reason": "..."
}
```

---

## 🚀 التثبيت السريع

### 1️⃣ إنشاء Replit جديد
```bash
# اختر Node.js Template
```

### 2️⃣ رفع الملفات
ارفع جميع الملفات إلى Replit الجديد

### 3️⃣ إعداد البيئة
انسخ `.env.sample` إلى `.env`:
```bash
cp .env.sample .env
```

املأ القيم في `.env`:
```env
CENTRAL_BASE_URL=https://your-nucleus.replit.app
CENTRAL_WS_URL=wss://your-nucleus.replit.app
BOT_UNIT=ACCOUNTING
SRH_HMAC_SECRET=your_secret_from_nucleus
SRH_SOURCE=Accounting
BOT_NAME=Accounting Manager Bot
BOT_TYPE=manager
```

### 4️⃣ تثبيت الحزم
```bash
npm install
```

### 5️⃣ التشغيل
```bash
npm run dev
```

---

## 📡 البروتوكول الأمني

### 1️⃣ **التوقيعات (HMAC-SHA256)**
كل رسالة موقّعة:
```javascript
signature = HMAC_SHA256(message, SRH_HMAC_SECRET)
```

### 2️⃣ **المصادقة (JWT)**
```
Authorization: Bearer <JWT_TOKEN>
```

### 3️⃣ **التحقق من الهوية**
- UUID فريد لكل بوت
- IP Address تلقائي
- تخزين محلي في `bot_identity.json`

---

## 🛠️ Maintenance Bot - طلب الإذن

### أمثلة على الصيانة التلقائية:

#### 1️⃣ Memory Cleanup
```
Memory > 80% → طلب إذن → النواة توافق → تنفيذ
```

#### 2️⃣ Service Restart
```
Uptime > 24h → طلب إذن → النواة توافق → إعادة تشغيل
```

#### 3️⃣ Cache Cleanup
```
Cache كبير → طلب إذن → النواة توافق → تنظيف
```

**بدون موافقة النواة = لا صيانة!** 🔒

---

## 📊 المراقبة

### في Nucleus Dashboard
`/agents` → عرض جميع البوتات:
- حالة الاتصال (active/disconnected)
- آخر نبضة
- IP Address
- UUID
- طلبات الإذن المعلقة

### في سُروح Chat
تظهر تلقائياً:
```
📡 ManagerBot من ACCOUNTING تم تفعيله ✅
🖥️ IP: 37.60.228.253 | UUID: abc-123

🔐 MaintenanceBot يطلب إذن: MEMORY_CLEANUP
⏳ في انتظار موافقة النواة...

✅ الإذن مُنح - تنفيذ الصيانة

⚠️ SupportBot فقد الاتصال بالنواة
🕒 آخر نبضة: 2025-10-11T15:45Z

🟢 SupportBot عاد للعمل ✅
```

---

## 🔧 التخصيص لكل منصة

### B2B Platform
```env
SRH_UNIT_ID=B2B
BOT_NAME=B2B Manager Bot
```

### B2C Platform
```env
SRH_UNIT_ID=B2C
BOT_NAME=B2C Manager Bot
```

### Shipping Platform
```env
SRH_UNIT_ID=SHIPPING
BOT_NAME=Shipping Manager Bot
```

---

## 🚨 الأوامر الطارئة

### Emergency Shutdown
النواة تقدر توقف أي بوت فوراً:
```javascript
{
  "type": "EMERGENCY_SHUTDOWN",
  "reason": "Security breach detected",
  "signature": "nucleus_signature"
}
```

البوت يوقف **فوراً** بدون سؤال!

---

## 📝 الملفات

### ملفات التمبلت:
- `index.js` - نقطة البداية
- `control-channel.js` - **WebSocket Control Protocol** 🆕
- `manager.js` - Manager Bot (مع Command Handlers)
- `support.js` - Support Bot (مع Command Handlers)
- `maintenance.js` - Maintenance Bot (**طلب الإذن دائماً**) 🆕
- `identity.js` - إدارة الهوية
- `core-client.js` - التواصل مع النواة

### ملفات تُنشأ تلقائياً:
- `bot_identity.json` - هوية البوت (UUID, IP, تاريخ التفعيل)

---

## 🛡️ الأمان

✅ **Command Verification** - كل أمر موقّع من النواة  
✅ **Permission System** - Maintenance تطلب إذن دائماً  
✅ **HMAC-SHA256** - توقيعات آمنة  
✅ **JWT Authentication** - مصادقة قوية  
✅ **Emergency Shutdown** - إيقاف فوري عند الخطر  

---

## 🔄 دورة الحياة الكاملة

```
1. Bot يشتغل → يتصل بـ Control Channel
2. Bot يُعرّف نفسه → النواة تتحقق
3. Bot ينتظر الأوامر → WebSocket active
4. النواة ترسل أمر → Bot يتحقق من التوقيع
5. Bot ينفذ → يرسل ACK للنواة
6. (Maintenance) → يطلب إذن قبل أي شي
7. النواة توافق/ترفض → Bot ينفذ أو يلغي
```

---

## 📞 الدعم

للدعم: تواصل مع فريق Surooh Empire

**Remember: البوتات عبيد للنواة - ما يعملوا شي بدون إذنها!** 👑
