# 🤖 MultiBot Agents - دليل النشر الكامل

## نظرة عامة

نظام MultiBot Agents هو نظام **Command & Control** لربط البوتات الذكية بنواة سُروح المركزية. كل منصة (B2B, B2C, Accounting, Shipping, CE, MAIL_HUB) لها **3 بوتات**:

### أنواع البوتات الثلاثة:

1. **Manager Bot** (`manager`)
   - إدارة العمليات اليومية
   - معالجة الطلبات والأوامر
   - تنسيق العمل بين الأنظمة

2. **Support Bot** (`support`)
   - الرد على الاستفسارات
   - حل المشاكل التقنية
   - دعم المستخدمين

3. **Maintenance Bot** (`maintenance`)
   - صيانة النظام
   - تنظيف الذاكرة
   - تحديث الخدمات
   - **⚠️ يطلب إذن النواة قبل أي عملية صيانة**

---

## 📋 متطلبات النشر

### 1. متطلبات التشغيل
```bash
Node.js >= 18.x
npm >= 9.x
```

### 2. مفاتيح الأمان (من Nucleus Core)
احصل على هذه المفاتيح من `.env` الخاص بـ Nucleus Core:
- `SRH_HMAC_SECRET` - للتوقيعات الرقمية
- `JWT_SECRET` - للمصادقة

---

## 🚀 خطوات النشر

### الخطوة 1: نسخ الملفات
```bash
# انسخ مجلد multibot-agents لكل منصة
cp -r multibot-agents b2b-agents
cp -r multibot-agents accounting-agents
cp -r multibot-agents shipping-agents
# ... إلخ
```

### الخطوة 2: تكوين البوت
```bash
cd b2b-agents
cp .env.sample .env
nano .env
```

**مثال: B2B Manager Bot**
```env
# Bot Identity
BOT_UNIT=B2B
BOT_TYPE=manager
BOT_NAME=B2B Manager Bot
SRH_SOURCE=B2B

# Nucleus Core Connection
CENTRAL_BASE_URL=https://nucleus-core.replit.app
CENTRAL_WS_URL=wss://nucleus-core.replit.app

# Security Keys
SRH_HMAC_SECRET=your-actual-hmac-secret

# Optional Settings
AUTO_DETECT_IP=true
HEARTBEAT_INTERVAL=30000
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=5000
```

### الخطوة 3: تثبيت المكتبات
```bash
npm install
```

### الخطوة 4: تشغيل البوت
```bash
# Development
npm start

# Production (with PM2)
pm2 start index.js --name "b2b-manager"
pm2 save
pm2 startup
```

---

## 🎯 سيناريوهات الاستخدام

### سيناريو 1: نشر بوتات B2B الثلاثة

```bash
# Bot 1: Manager
cd b2b-manager
nano .env  # BOT_TYPE=manager
npm install && npm start

# Bot 2: Support
cd b2b-support
nano .env  # BOT_TYPE=support
npm install && npm start

# Bot 3: Maintenance
cd b2b-maintenance
nano .env  # BOT_TYPE=maintenance
npm install && npm start
```

### سيناريو 2: نشر على Replit

1. **أنشئ Repl جديد** لكل بوت
2. **ارفع الملفات** من `multibot-agents`
3. **أضف Secrets** في Replit:
   - `SRH_HMAC_SECRET`
   - `JWT_SECRET`
4. **عدّل `.replit`**:
```toml
run = "npm start"
```
5. **اضغط Run** ✅

---

## 🔐 Command & Control Protocol

### كيف يعمل النظام؟

```
┌─────────────┐
│   Bot       │
│  (Platform) │
└──────┬──────┘
       │
       │ 1. Request Permission
       ▼
┌─────────────┐
│   Nucleus   │
│    Core     │
└──────┬──────┘
       │
       │ 2. Approve/Deny
       ▼
┌─────────────┐
│   Bot       │
│  Executes   │
└─────────────┘
```

### تدفق طلب الإذن:

1. **البوت يطلب إذن**:
```javascript
const approved = await bot.requestPermission('MEMORY_CLEANUP', {
  target: 'cache',
  size: '500MB'
});
```

2. **النواة تفحص الطلب**:
   - ✅ عمليات آمنة → موافقة تلقائية
   - ⏳ عمليات حرجة → انتظار موافقة يدوية

3. **البوت ينفذ فقط بعد الموافقة**:
```javascript
if (approved) {
  await cleanupMemory();
  console.log('✅ Maintenance completed');
} else {
  console.log('❌ Permission denied');
}
```

---

## 🧪 الاختبار

### اختبر الاتصال بالنواة:
```bash
# من داخل مجلد البوت
node test-connection.js
```

### اختبر طلب الإذن:
```bash
# من Nucleus Core Dashboard
curl http://localhost:5000/api/agents
```

يجب أن ترى:
```json
{
  "success": true,
  "agents": [
    {
      "uuid": "abc-123",
      "unit": "B2B",
      "agentType": "manager",
      "status": "active",
      "isOnline": true
    }
  ]
}
```

---

## 📊 المراقبة والصيانة

### Dashboard النواة
افتح `http://your-nucleus-core.replit.app` وتوجه إلى:
- **Agents Monitor** - شاهد جميع البوتات المتصلة
- **Permission Requests** - وافق/ارفض طلبات الصيانة
- **سُروح Chat** - تلقى إشعارات البوتات

### لوحة التحكم PM2
```bash
pm2 monit              # مراقبة مباشرة
pm2 logs b2b-manager   # سجلات البوت
pm2 restart all        # إعادة تشغيل الجميع
```

---

## ⚠️ استكشاف الأخطاء

### المشكلة: البوت لا يتصل

**الحل 1**: تحقق من المفاتيح
```bash
echo $SRH_HMAC_SECRET  # يجب أن تكون مطابقة للنواة
```

**الحل 2**: تحقق من URL النواة
```bash
curl https://your-nucleus-core.replit.app/api/health
```

**الحل 3**: تحقق من Logs
```bash
npm start
# ابحث عن: "[ControlWS] ✅ Authenticated"
```

### المشكلة: Permission Denied

**السبب**: العملية تحتاج موافقة يدوية

**الحل**:
1. افتح Nucleus Dashboard
2. توجه لـ Agents Monitor
3. شاهد Permission Requests
4. اضغط **Approve** ✅

---

## 🔄 التحديثات التلقائية

### تفعيل Auto-Updates (اختياري)
```bash
# في .env
AUTO_UPDATE=true
UPDATE_CHANNEL=stable  # stable, beta, dev
```

البوت سيتحقق من التحديثات كل ساعة ويطلب إذن النواة قبل التحديث.

---

## 📝 ملاحظات مهمة

1. **كل منصة = 3 بوتات منفصلة**
   - B2B → b2b-manager, b2b-support, b2b-maintenance
   - Accounting → accounting-manager, accounting-support, accounting-maintenance
   - ... إلخ

2. **Maintenance Bot دائماً يطلب إذن**
   - حتى عمليات بسيطة مثل cache cleanup
   - النواة تقرر الموافقة/الرفض

3. **Auto-Recovery**
   - 3 محاولات إعادة اتصال تلقائية
   - إشعار النواة بعد الفشل
   - تقرير صيانة شامل

4. **Security First**
   - HMAC signatures لجميع الرسائل
   - JWT tokens للمصادقة
   - IP tracking لكل بوت

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من Logs: `npm start` أو `pm2 logs`
2. افحص Nucleus Dashboard → Agents Monitor
3. تواصل مع سُروح Chat للمساعدة

---

**🚀 الآن أنت جاهز لنشر جيش البوتات الذكية! انطلق يا بطل!** 🎉
