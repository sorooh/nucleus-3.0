# 🚀 Quick Start - نشر أول بوت في 5 دقائق

## ✨ الطريقة السريعة (للمبتدئين)

### 1️⃣ نسخ الملفات
```bash
# انسخ المجلد لمنصتك
cp -r multibot-agents my-first-bot
cd my-first-bot
```

### 2️⃣ إعداد البيئة
```bash
# أنشئ ملف .env
cp .env.sample .env
```

**افتح `.env` وعدّل:**
```env
BOT_UNIT=B2B                              # اسم منصتك
BOT_TYPE=manager                          # manager, support, أو maintenance
BOT_NAME=My First Bot                     # اسم البوت
SRH_SOURCE=B2B                            # مصدر البوت (B2B, B2C, CE, etc.)

CENTRAL_BASE_URL=http://localhost:5000    # عنوان النواة
CENTRAL_WS_URL=ws://localhost:5000        # WebSocket النواة

SRH_HMAC_SECRET=test-secret-123           # نفس المفتاح من النواة
```

### 3️⃣ تشغيل البوت
```bash
npm install
npm start
```

### ✅ النتيجة المتوقعة:
```
🤖 Multibot Agent Starting...
📍 Unit: B2B | Type: manager
🌐 Fetching IP address...
✅ IP detected: 123.45.67.89
📝 UUID generated: abc-123-def-456
💾 Identity saved to bot_identity.json

📡 Connecting to Nucleus Core...
✅ Connected to core: http://localhost:5000

🔐 Authenticating with Control Channel...
✅ [ControlWS] Authenticated: manager (B2B)

🟢 Bot is ACTIVE and ready!
```

---

## 📋 أمثلة سريعة

### مثال 1: Bot Manager لـ B2B
```env
BOT_UNIT=B2B
BOT_TYPE=manager
BOT_NAME=B2B Operations Manager
SRH_SOURCE=B2B
```

### مثال 2: Support Bot لـ Accounting
```env
BOT_UNIT=ACCOUNTING
BOT_TYPE=support
BOT_NAME=Accounting Support Assistant
SRH_SOURCE=Accounting
```

### مثال 3: Maintenance Bot لـ Shipping
```env
BOT_UNIT=SHIPPING
BOT_TYPE=maintenance
BOT_NAME=Shipping System Maintenance
SRH_SOURCE=Shipping
```

---

## 🧪 اختبر الاتصال أولاً

قبل التشغيل، تأكد من الاتصال:
```bash
node test-connection.js
```

يجب أن ترى:
```
✅ BOT_UNIT: B2B
✅ BOT_TYPE: manager
✅ Signature generated: a1b2c3d4...
✅ Nucleus Core is reachable!
🎉 All tests passed!
```

---

## 🔧 استكشاف الأخطاء السريع

### ❌ خطأ: "Cannot connect to Nucleus"
**الحل:**
```bash
# تأكد أن النواة شغالة
curl http://localhost:5000/api/health
```

### ❌ خطأ: "Authentication failed"
**الحل:**
- تأكد أن `SRH_HMAC_SECRET` نفسه في النواة والبوت

### ❌ خطأ: "Permission denied"
**الحل:**
- بعض العمليات تحتاج موافقة يدوية
- افتح Nucleus Dashboard → Agents Monitor
- وافق على الطلب

---

## 📊 مراقبة البوت

### من Dashboard النواة:
1. افتح `http://localhost:5000`
2. توجه لـ **Agents Monitor**
3. شاهد بوتك متصل ✅

### من سطر الأوامر:
```bash
# شاهد سجلات البوت
npm start

# أو استخدم PM2
pm2 logs my-first-bot
```

---

## 🎯 ماذا بعد؟

1. **نشر بوتات إضافية** → اقرأ `DEPLOYMENT.md`
2. **تخصيص السلوك** → عدّل ملفات `manager.js`, `support.js`, `maintenance.js`
3. **إضافة مهام جديدة** → اقرأ `README.md`

---

**🚀 مبروك! بوتك الأول شغال! 🎉**
