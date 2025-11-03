# 🔐 سروح الدردشة - دليل التشغيل الكامل

**تاريخ:** 11 أكتوبر 2025  
**الحالة:** ✅ جاهز للربط

---

## 🎯 نظرة سريعة

سروح الدردشة تحتاج للاتصال بـ **Nucleus 2.0** عبر SCP Protocol.  
**كل المفاتيح موجودة في Replit Secrets** - جاهزة للاستخدام!

---

## 📋 المفاتيح المطلوبة (موجودة في Replit Secrets)

### **في Nucleus Core (موجود):**
```bash
CHAT_HMAC_SECRET      # ✅ موجود في Replit Secrets
SRH_ROOT_SIGNATURE    # ✅ موجود في Replit Secrets
JWT_SECRET            # ✅ موجود في Replit Secrets
CENTRAL_HMAC_SECRET   # ✅ موجود في Replit Secrets
SRH_HMAC_SECRET       # ✅ موجود في Replit Secrets
```

### **كيف توصل للمفاتيح؟**

#### **الطريقة الأولى: من Replit UI**
1. افتح Replit Workspace
2. اضغط **Tools** → **Secrets**
3. شوف المفاتيح الخمسة أعلاه
4. انسخهم واحد واحد

#### **الطريقة الثانية: من الكود (Recommended)**
```javascript
// في server-side code
const chatHmacSecret = process.env.CHAT_HMAC_SECRET;
const srhRootSignature = process.env.SRH_ROOT_SIGNATURE;
const jwtSecret = process.env.JWT_SECRET;
const centralHmacSecret = process.env.CENTRAL_HMAC_SECRET;

console.log('Keys loaded:', {
  chat: chatHmacSecret ? '✅' : '❌',
  root: srhRootSignature ? '✅' : '❌',
  jwt: jwtSecret ? '✅' : '❌',
  central: centralHmacSecret ? '✅' : '❌'
});
```

---

## 🌐 Base URL Configuration

### **Nucleus Core URL:**
```bash
# Development (local)
NUCLEUS_API_URL=http://localhost:5000

# Production (Replit)
NUCLEUS_API_URL=https://[your-repl-name].[username].repl.co

# Custom Domain (إذا موجود)
NUCLEUS_API_URL=https://nucleus.surooh.group
```

### **كيف تحصل على Production URL؟**
```bash
# في Nucleus Core project
echo $REPLIT_DEV_DOMAIN
# أو
echo https://$REPL_SLUG.$REPL_OWNER.repl.co
```

---

## 📦 ملف .env لسروح الدردشة

### **انسخ هذا الملف:**

```bash
# ==========================================
# سروح الدردشة - Environment Variables
# ==========================================

# === SCP Protocol Configuration ===
CHAT_HMAC_SECRET=[انسخ من Replit Secrets]
SRH_ROOT_SIGNATURE=[انسخ من Replit Secrets]
JWT_SECRET=[انسخ من Replit Secrets]
CENTRAL_HMAC_SECRET=[انسخ من Replit Secrets]

# === Nucleus Connection ===
NUCLEUS_API_URL=https://[your-nucleus-url]

# === Server Configuration ===
PORT=3000
NODE_ENV=production

# === Optional: Database (if Chat has its own) ===
# DATABASE_URL=[chat-database-url]

# === Optional: Session ===
# SESSION_SECRET=[generate-new-secret]
```

---

## 🔧 خطوات التشغيل (5 دقائق)

### **1. جهّز مشروع سروح الدردشة**
```bash
# في Chat project
touch .env
```

### **2. افتح Nucleus Secrets**
```bash
# في Nucleus project
# اذهب لـ Tools → Secrets
# أو استخدم هذا الأمر (في Nucleus):
cat > get-secrets.js << 'EOF'
console.log('=== Nucleus Secrets ===');
console.log('CHAT_HMAC_SECRET:', process.env.CHAT_HMAC_SECRET);
console.log('SRH_ROOT_SIGNATURE:', process.env.SRH_ROOT_SIGNATURE);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('CENTRAL_HMAC_SECRET:', process.env.CENTRAL_HMAC_SECRET);
EOF

node get-secrets.js
```

### **3. انسخ المفاتيح لـ Chat .env**
```bash
# في Chat project
# الصق المفاتيح من الخطوة السابقة
nano .env
```

### **4. حدّث NUCLEUS_API_URL**
```bash
# في Chat .env
NUCLEUS_API_URL=https://nucleus-2-0.yourname.repl.co
```

### **5. اختبر الاتصال**
```bash
# في Chat project
node test-connection.js
```

---

## ✅ Test Connection Script

أنشئ هذا الملف في Chat project:

```javascript
// test-connection.js
const crypto = require('crypto');
require('dotenv').config();

const NUCLEUS_URL = process.env.NUCLEUS_API_URL;
const CHAT_HMAC = process.env.CHAT_HMAC_SECRET;

console.log('🔍 Testing Nucleus Connection...\n');

// Test 1: Health Check
async function testHealth() {
  try {
    const res = await fetch(`${NUCLEUS_URL}/api/scp/status`);
    const data = await res.json();
    console.log('✅ Health Check:', data.success ? 'OK' : 'FAILED');
    return data.success;
  } catch (err) {
    console.log('❌ Health Check FAILED:', err.message);
    return false;
  }
}

// Test 2: HMAC Authentication
async function testAuth() {
  try {
    const body = { sessionId: 'test-001', message: 'مرحباً' };
    const signature = crypto
      .createHmac('sha256', CHAT_HMAC)
      .update(JSON.stringify(body))
      .digest('hex');

    const res = await fetch(`${NUCLEUS_URL}/api/scp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Surooh-Signature': signature
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('✅ HMAC Auth:', data.success ? 'OK' : 'FAILED');
    console.log('📨 Response:', data.data?.reply || data.error);
    return data.success;
  } catch (err) {
    console.log('❌ HMAC Auth FAILED:', err.message);
    return false;
  }
}

// Run Tests
(async () => {
  const health = await testHealth();
  if (!health) {
    console.log('\n⚠️ Nucleus غير متصل - تحقق من NUCLEUS_API_URL');
    process.exit(1);
  }

  const auth = await testAuth();
  if (!auth) {
    console.log('\n⚠️ فشل التوثيق - تحقق من CHAT_HMAC_SECRET');
    process.exit(1);
  }

  console.log('\n🎉 كل شي تمام! Chat جاهز للربط مع Nucleus');
})();
```

---

## 🔐 Security Checklist

قبل Production:

- [ ] **كل المفاتيح في Replit Secrets** (مش في .env files)
- [ ] **HTTPS only** - ما تستخدم HTTP أبداً
- [ ] **NUCLEUS_API_URL صحيح** - بدون trailing slash
- [ ] **Test connection passed** - الاختبار نجح
- [ ] **.env في .gitignore** - ما ينرفع على Git
- [ ] **Environment = production** في Chat

---

## 🚀 Integration Example (Chat Backend)

```javascript
// chat-backend/nucleus-client.js
const crypto = require('crypto');

class NucleusClient {
  constructor() {
    this.baseUrl = process.env.NUCLEUS_API_URL;
    this.hmacSecret = process.env.CHAT_HMAC_SECRET;
  }

  generateSignature(body) {
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(JSON.stringify(body))
      .digest('hex');
  }

  async sendMessage(sessionId, message, lang = 'ar') {
    const body = { sessionId, message, lang };
    const signature = this.generateSignature(body);

    const response = await fetch(`${this.baseUrl}/api/scp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Surooh-Signature': signature
      },
      body: JSON.stringify(body)
    });

    return await response.json();
  }

  async executeCommand(command) {
    const body = { command };
    const signature = this.generateSignature(body);

    const response = await fetch(`${this.baseUrl}/api/scp/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Surooh-Signature': signature
      },
      body: JSON.stringify(body)
    });

    return await response.json();
  }
}

module.exports = new NucleusClient();
```

### **Usage:**
```javascript
const nucleus = require('./nucleus-client');

// Send message to Nucleus
app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  
  const response = await nucleus.sendMessage(sessionId, message);
  
  res.json({
    reply: response.data.reply,
    mode: response.data.mode
  });
});

// Execute SCP command
app.post('/command', async (req, res) => {
  const { command } = req.body;
  
  const response = await nucleus.executeCommand(command);
  
  res.json(response);
});
```

---

## 📡 Available Endpoints

### **من Chat لـ Nucleus:**

| Endpoint | Method | الوصف |
|----------|--------|-------|
| `/api/scp/send` | POST | إرسال رسالة للنواة |
| `/api/scp/execute` | POST | تنفيذ أمر SCP |
| `/api/scp/status` | GET | حالة النواة |
| `/api/scp/sync` | POST | مزامنة البيانات |

### **Full API Access (50+ endpoints):**
راجع **SUROOH_CHAT_API_KEYS.md** للتفاصيل الكاملة:
- Projects & Tasks
- CRM & Calendar
- Finance (Read-only)
- HR (Read-only)
- Support & Tickets
- MultiBot Control
- Webhooks & Integration

---

## 🔄 Environment Variables Reference

| Variable | مصدر | استخدام |
|----------|------|---------|
| `CHAT_HMAC_SECRET` | Nucleus Secrets | HMAC authentication |
| `SRH_ROOT_SIGNATURE` | Nucleus Secrets | Root authority |
| `JWT_SECRET` | Nucleus Secrets | JWT tokens |
| `CENTRAL_HMAC_SECRET` | Nucleus Secrets | Central integration |
| `NUCLEUS_API_URL` | Manual config | Nucleus base URL |
| `PORT` | Chat config | Chat server port |
| `NODE_ENV` | Chat config | Environment |

---

## ⚠️ Troubleshooting

### **مشكلة: "Invalid signature"**
```bash
# تأكد من:
1. CHAT_HMAC_SECRET صحيح (من Nucleus Secrets)
2. Body متطابق 100% (نفس الـ JSON.stringify)
3. مافي spaces زيادة
```

### **مشكلة: "Connection refused"**
```bash
# تأكد من:
1. Nucleus Core شغال (running)
2. NUCLEUS_API_URL صحيح
3. HTTPS (مش HTTP) في production
```

### **مشكلة: "Rate limit exceeded"**
```bash
# استخدم:
1. Webhooks بدل polling
2. Caching للبيانات
3. انتظر دقيقة وحاول مرة ثانية
```

---

## 📞 الدعم

- **Nucleus Status:** `GET /api/scp/status`
- **Health Check:** `GET /api/health`
- **Documentation:** `SUROOH_CHAT_API_KEYS.md`

---

## ✅ Final Checklist

قبل ما تشغّل Production:

1. [ ] كل المفاتيح منسوخة من Replit Secrets
2. [ ] NUCLEUS_API_URL محدّث
3. [ ] Test connection نجح
4. [ ] .env في .gitignore
5. [ ] HTTPS مفعّل
6. [ ] Error logging شغال
7. [ ] Webhook configured (اختياري)

**بعدها: 🚀 Chat جاهز للتشغيل!**

---

*آخر تحديث: 11 أكتوبر 2025*  
*الحالة: ✅ Production Ready*
