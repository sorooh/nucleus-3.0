# 🔐 سُروح الدردشة - مفاتيح API (SCP Protocol v1.0)

**تاريخ الإصدار:** 11 أكتوبر 2025  
**النظام:** Surooh Chat - Digital Secretary  
**البروتوكول:** Self Integration Protocol (SCP) v1.0  
**الحالة:** ✅ جاهز للاستخدام

---

## 🎯 نظرة عامة

هذه المفاتيح تربط **سُروح الدردشة** (واجهة المستخدم) بـ **Nucleus 2.0** (العقل المركزي).

> "سُروح ليست بجانبي… سُروح هي أنا، ولكن بدون نوم."

---

## 🔑 المفاتيح الأمنية (256-bit)

### **1. CHAT_HMAC_SECRET**
للتواصل الآمن بين Chat والنواة (HMAC-SHA256):
```
0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31
```

### **2. SRH_ROOT_SIGNATURE**
التوقيع الجذري - أعلى سلطة في النظام:
```
b8a90737563cf5d176ab2d8f11f1d9002fce1e04aa6319aac6889c44b7d205aa
```

### **3. JWT_SECRET**
للمصادقة وإدارة الجلسات:
```
f3284b2e79afdc4b8d13c4c3a3821c9c95d2f71e25c2c9a97dcb04f56d1481cb
```

### **4. CENTRAL_HMAC_SECRET**
للتكامل مع الأنظمة المركزية:
```
c1065e4690d83d56ac3422dbc4d6a14275e813ac59fb32f2290b78b2dac32a175
```

---

## 📦 ملف `.env` للدردشة (جاهز للنسخ)

```bash
# === Surooh Chat - SCP Protocol v1.0 ===

# Chat ↔ Nucleus Communication
CHAT_HMAC_SECRET=0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31

# Root Authority Signature
SRH_ROOT_SIGNATURE=b8a90737563cf5d176ab2d8f11f1d9002fce1e04aa6319aac6889c44b7d205aa

# JWT Authentication
JWT_SECRET=f3284b2e79afdc4b8d13c4c3a3821c9c95d2f71e25c2c9a97dcb04f56d1481cb

# Central Systems Integration
CENTRAL_HMAC_SECRET=c1065e4690d83d56ac3422dbc4d6a14275e813ac59fb32f2290b78b2dac32a175

# === Nucleus Connection ===
NUCLEUS_API_URL=https://[your-nucleus-domain]

# === Environment ===
ENV=production
```

---

## ✅ الصلاحيات الكاملة (Stage 1: Read-All + Non-Financial Write)

### **📖 Read-Only (قراءة فقط):**
- ✅ **Projects** - جميع المشاريع والتفاصيل
- ✅ **Tasks** - المهام والحالة والتعيينات
- ✅ **Calendars** - الأحداث والمواعيد والاجتماعات
- ✅ **CRM** - Accounts, Contacts, Deals (العملاء والصفقات)
- ✅ **Files/Documents** - الملفات والـ metadata (بدون المحتوى الحساس)
- ✅ **Finance** - البيانات المالية (قراءة فقط)
- ✅ **HR** - الموارد البشرية (قراءة فقط)
- ✅ **MultiBot Agents** - حالة وإحصائيات البوتات
- ✅ **Knowledge Feed** - قاعدة المعرفة والتحليلات
- ✅ **External Intelligence** - الموصلات الخارجية
- ✅ **Platform Integration** - حالة التكامل
- ✅ **Audit Logs** - سجلات التدقيق (قراءة)

### **✍️ Write (كتابة - غير مالية):**
- ✅ **Tasks** - إنشاء/تعديل/تعليقات
- ✅ **CRM Notes/Activities** - إضافة ملاحظات ونشاطات
- ✅ **Calendar Events** - إنشاء/تعديل الأحداث
- ✅ **Support Tickets** - إنشاء وإدارة التذاكر
- ✅ **Knowledge Upload** - رفع المستندات والملفات
- ✅ **MultiBot Commands** - إرسال أوامر للبوتات
- ✅ **Webhooks** - إنشاء وإدارة webhooks
- ✅ **API Clients/Tokens** - إدارة API clients لهذا الحساب

### **🚫 محظور (يحتاج Stage 2):**
- ❌ **Financial Operations** - العمليات المالية (دفع، تحويل، إلخ)
- ❌ **User Management** - إنشاء/حذف المستخدمين
- ❌ **Security Config** - تعديل إعدادات الأمان
- ❌ **Database Direct Access** - الوصول المباشر للقاعدة
- ❌ **System Configuration** - إعدادات النظام الأساسية

---

## 📡 API Endpoints (الصلاحيات الكاملة)

### **Base URL:**
```
https://[nucleus-domain]/api
```

### **SCP Protocol (Chat ↔ Core):**

| Endpoint | Method | الوصف |
|----------|--------|-------|
| `/api/scp/send` | POST | إرسال رسالة للنواة والحصول على رد AI |
| `/api/scp/execute` | POST | تنفيذ أوامر SCP (مثل: SRH:DEEP_ANALYSIS) |
| `/api/scp/status` | GET | حالة SCP Bridge |
| `/api/scp/sync` | POST | مزامنة Chat ↔ Core |
| `/api/scp/agent/notify` | POST | إشعارات MultiBot |

### **V2 Integration Gateway (All Data Access):**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/v2/data` | POST | إرسال/استقبال بيانات | Read/Write |
| `/api/v2/query` | POST | استعلام البيانات | Read |
| `/api/v2/command` | POST | تنفيذ أوامر | Write |

### **Projects & Tasks:**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/projects` | GET | قائمة المشاريع | Read |
| `/api/projects/:id` | GET | تفاصيل المشروع | Read |
| `/api/tasks` | GET | قائمة المهام | Read |
| `/api/tasks` | POST | إنشاء مهمة | Write |
| `/api/tasks/:id` | PATCH | تعديل مهمة | Write |
| `/api/tasks/:id/comments` | POST | إضافة تعليق | Write |

### **Calendar & Events:**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/calendar/events` | GET | قائمة الأحداث | Read |
| `/api/calendar/events` | POST | إنشاء حدث | Write |
| `/api/calendar/events/:id` | PATCH | تعديل حدث | Write |
| `/api/calendar/meetings` | GET | الاجتماعات | Read |

### **CRM (Customer Relationship):**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/crm/accounts` | GET | قائمة الحسابات | Read |
| `/api/crm/contacts` | GET | جهات الاتصال | Read |
| `/api/crm/deals` | GET | الصفقات | Read |
| `/api/crm/notes` | POST | إضافة ملاحظة | Write |
| `/api/crm/activities` | POST | إضافة نشاط | Write |

### **Files & Documents:**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/files` | GET | قائمة الملفات | Read |
| `/api/files/metadata` | GET | معلومات الملفات | Read |
| `/api/knowledge/upload` | POST | رفع مستند | Write |
| `/api/knowledge/history` | GET | تاريخ المعرفة | Read |

### **Finance (Read-Only):**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/finance/transactions` | GET | المعاملات المالية | Read |
| `/api/finance/invoices` | GET | الفواتير | Read |
| `/api/finance/reports` | GET | التقارير المالية | Read |

### **HR (Read-Only):**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/hr/employees` | GET | قائمة الموظفين | Read |
| `/api/hr/departments` | GET | الأقسام | Read |
| `/api/hr/attendance` | GET | الحضور | Read |

### **Support & Tickets:**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/support/tickets` | GET | قائمة التذاكر | Read |
| `/api/support/tickets` | POST | إنشاء تذكرة | Write |
| `/api/support/tickets/:id` | PATCH | تحديث تذكرة | Write |

### **MultiBot Control:**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/agents` | GET | قائمة البوتات | Read |
| `/api/agents/stats` | GET | إحصائيات | Read |
| `/api/agents/command` | POST | إرسال أمر | Write |
| `/api/agents/permissions/:id` | POST | طلب صلاحية | Write |

### **Integration & Webhooks:**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/integration/webhooks` | GET | قائمة webhooks | Read |
| `/api/integration/webhooks` | POST | إنشاء webhook | Write |
| `/api/integration/webhooks/:id` | DELETE | حذف webhook | Write |
| `/api/integration/platforms` | GET | المنصات المتصلة | Read |
| `/api/integration/sync/:platform` | POST | مزامنة منصة | Write |

### **Audit & Logs:**

| Endpoint | Method | الوصف | الصلاحية |
|----------|--------|-------|----------|
| `/api/audit/logs` | GET | سجلات التدقيق | Read |
| `/api/audit/activity` | GET | نشاط المستخدمين | Read |
| `/api/security/api-clients` | GET | API clients | Read |
| `/api/security/api-clients` | POST | إنشاء client | Write |

---

## 🔐 كيفية الاستخدام

### **1. إرسال رسالة للنواة**

```javascript
const crypto = require('crypto');

// Generate HMAC signature
function generateHMAC(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
}

// Message payload
const message = {
  sessionId: "user-session-001",
  message: "مرحباً سُروح، كيف حالك؟",
  lang: "ar"
};

// Generate signature
const signature = generateHMAC(
  message, 
  '0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31'
);

// Send request
fetch('https://[nucleus-domain]/api/scp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Surooh-Signature': signature
  },
  body: JSON.stringify(message)
})
.then(res => res.json())
.then(data => {
  console.log('سُروح:', data.data.reply);
});
```

### **2. تنفيذ أمر SCP**

```bash
# Command payload
BODY='{"command":"SRH:CORE_STATUS"}'

# Generate signature
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31" -hex | sed 's/^.* //')

# Execute
curl -X POST https://[domain]/api/scp/execute \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIG" \
  --data "$BODY"
```

### **3. التحقق من الحالة**

```bash
# No authentication needed
curl https://[nucleus-domain]/api/scp/status
```

---

## 🎨 أوامر SCP المتاحة

| الأمر | الوصف |
|------|-------|
| `SRH:SELF_SYNC` | مزامنة Chat ↔ Core |
| `SRH:DEEP_ANALYSIS` | تفعيل وضع التحليل الكامل |
| `SRH:VOICE_ENABLE` | تفعيل القدرات الصوتية |
| `SRH:RECALL_MEMORY` | استرجاع ذاكرة محددة |
| `SRH:CORE_STATUS` | حالة النواة |

---

## 🔔 Webhooks Configuration (للتنبيهات الفورية)

### **Webhook Events المدعومة:**

```javascript
// Tasks & Projects
"tasks.created"
"tasks.updated"
"tasks.completed"
"tasks.commented"
"projects.updated"

// CRM Events
"crm.account_created"
"crm.contact_updated"
"crm.deal_closed"
"crm.note_added"
"crm.activity_logged"

// Calendar Events
"calendar.event_created"
"calendar.event_updated"
"calendar.meeting_scheduled"

// Finance (Read-Only Events)
"finance.invoice_created"
"finance.payment_received"
"finance.report_generated"

// Support
"support.ticket_created"
"support.ticket_updated"
"support.ticket_resolved"

// MultiBot Events
"agent.activated"
"agent.disconnected"
"agent.permission_requested"
"agent.command_completed"

// Knowledge Events
"knowledge.uploaded"
"knowledge.processed"
"knowledge.insight_generated"

// Platform Events
"platform.sync_completed"
"platform.data_received"

// Approval Workflows
"approvals.requested"
"approvals.approved"
"approvals.rejected"
```

### **تسجيل Webhook:**

```bash
curl -X POST https://[nucleus-domain]/api/integration/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: [signature]" \
  --data '{
    "url": "https://chat.surooh.group/webhooks/nucleus",
    "events": [
      "tasks.*",
      "crm.*",
      "calendar.*",
      "finance.invoice_created",
      "approvals.*",
      "agent.*"
    ],
    "secret": "[your_webhook_secret]",
    "active": true
  }'
```

### **استقبال Webhook في الدردشة:**

```javascript
// في Chat Backend
app.post('/webhooks/nucleus', (req, res) => {
  const signature = req.headers['x-surooh-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify webhook signature
  const expectedSig = crypto
    .createHmac('sha256', '[your_webhook_secret]')
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  const { event, data } = req.body;
  
  switch(event) {
    case 'tasks.created':
      // إشعار المستخدم في الدردشة
      notifyUser(`✅ مهمة جديدة: ${data.title}`);
      break;
    case 'approvals.requested':
      // طلب موافقة في الدردشة
      requestApproval(data);
      break;
    // ... المزيد من الأحداث
  }
  
  res.json({ received: true });
});
```

---

## 📊 Rate Limits & Quotas (حدود الاستخدام)

### **API Rate Limits:**

| Category | Rate Limit | Burst | Daily Quota |
|----------|-----------|-------|-------------|
| **SCP Protocol** | 100 req/min | 200/10s | Unlimited |
| **V2 Gateway** | 100 req/min | 200/10s | Unlimited |
| **Projects/Tasks** | 200 req/min | 400/10s | Unlimited |
| **Calendar** | 150 req/min | 300/10s | Unlimited |
| **CRM** | 150 req/min | 300/10s | Unlimited |
| **Files/Upload** | 50 req/min | 100/10s | 10 GB/day |
| **Finance (Read)** | 100 req/min | 200/10s | Unlimited |
| **HR (Read)** | 100 req/min | 200/10s | Unlimited |
| **Support** | 100 req/min | 200/10s | Unlimited |
| **MultiBot** | 200 req/min | 400/10s | Unlimited |
| **Webhooks** | 60 req/min | 120/10s | 10,000/day |
| **Audit Logs** | 50 req/min | 100/10s | Unlimited |

### **Retry Policy:**
```javascript
// عند تجاوز الحد (429 Too Many Requests)
{
  "error": "Rate limit exceeded",
  "retry_after": 30,  // ثواني
  "limit": 100,
  "remaining": 0,
  "reset": 1728662460  // timestamp
}
```

### **Best Practices:**
- استخدم **Webhooks** بدل polling للأحداث
- اجمع الطلبات (batch) عند الإمكان
- استخدم **caching** للبيانات اللي ما تتغير كثير
- راقب الـ `X-RateLimit-*` headers

---

## 🔒 Security Controls (الضوابط الأمنية)

### **✅ مُفعّل تلقائياً:**
- ✅ **HMAC-SHA256** signature verification على كل طلب
- ✅ **JWT expiration** (24 ساعة للـ tokens)
- ✅ **Rate limiting** حسب الجدول أعلاه
- ✅ **Audit logging** لكل عملية
- ✅ **TLS/HTTPS** encryption إجباري
- ✅ **Automatic key rotation** كل 60-90 يوم
- ✅ **Request validation** (schema validation)
- ✅ **SQL injection protection**
- ✅ **XSS protection** على كل input

### **🔧 يحتاج تفعيل يدوي:**

#### **1. IP Allowlist (مُوصى به):**
```bash
POST /api/security/ip-allowlist
{
  "service_account": "automation@surooh.group",
  "ips": [
    "chat-server-ip-1",
    "chat-server-ip-2",
    "backup-server-ip"
  ],
  "enabled": true
}
```

#### **2. MFA for Interactive Login:**
```bash
POST /api/security/mfa/enable
{
  "service_account": "automation@surooh.group",
  "method": "totp"  // Time-based OTP
}
```

#### **3. Webhook Security:**
```bash
# كل webhook عنده secret خاص
{
  "url": "https://chat.surooh.group/webhooks",
  "secret": "webhook-specific-secret-256bit",
  "verify_ssl": true
}
```

### **🔄 Key Rotation Schedule:**

| المفتاح | التدوير | الإشعار المسبق |
|---------|---------|-----------------|
| CHAT_HMAC_SECRET | كل 60 يوم | 7 أيام |
| JWT_SECRET | كل 90 يوم | 14 يوم |
| SRH_ROOT_SIGNATURE | كل 90 يوم | 14 يوم |
| CENTRAL_HMAC_SECRET | كل 90 يوم | 14 يوم |

**طريقة التدوير:**
1. Nucleus يولد مفتاح جديد
2. يرسل إشعار قبل التفعيل بـ 7-14 يوم
3. فترة انتقالية: المفتاحين (القديم والجديد) يشتغلوا معاً
4. بعد 48 ساعة: المفتاح القديم يتعطل

---

## 🌐 WebSocket (Real-time - اختياري)

للتحديثات الفورية بدون polling:

```javascript
const ws = new WebSocket('wss://[nucleus-domain]/ws/nucleus');

// Authenticate with JWT
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: '[jwt_token]',
    service_account: 'automation@surooh.group'
  }));
};

// Subscribe to events
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['tasks.*', 'approvals.*', 'agent.*']
}));

// Receive real-time updates
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  
  switch(type) {
    case 'tasks.created':
      console.log('مهمة جديدة:', data);
      break;
    case 'approvals.requested':
      console.log('طلب موافقة:', data);
      break;
  }
};
```

---

## 🛡️ الأمان

### **✅ مُفعّل:**
- HMAC-SHA256 signature verification
- JWT token authentication
- Rate limiting: 100 req/min
- TLS/HTTPS encryption
- Audit logging

### **🔄 تدوير المفاتيح:**
- كل 60 يوم: إشعار تلقائي
- كل 90 يوم: تدوير إجباري
- الطريقة: توليد مفاتيح جديدة وتحديث `.env`

### **⚠️ مهم:**
- **لا تشارك المفاتيح** مع أي شخص
- **استخدم HTTPS فقط** - أبداً HTTP
- **خزّن المفاتيح بشكل آمن** - مش في Git!

---

## 🧪 اختبار سريع

### **Test 1: Health Check**
```bash
curl https://[nucleus-domain]/api/scp/status
```

**نتيجة متوقعة:**
```json
{
  "success": true,
  "bridge": {
    "active": true,
    "version": "SCP-1.0"
  }
}
```

### **Test 2: Send Message**
```bash
BODY='{"sessionId":"test-001","message":"مرحباً"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31" -hex | sed 's/^.* //')

curl -X POST https://[nucleus-domain]/api/scp/send \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIG" \
  --data "$BODY"
```

---

## 📋 نوع البيانات المرسلة

### **إرسال رسالة:**
```json
{
  "sessionId": "unique-session-id",
  "message": "نص الرسالة",
  "inputType": "text|voice|image|file",
  "lang": "ar|en",
  "emotion": "neutral|urgent|calm",
  "channel": "internal|external"
}
```

### **رد النواة:**
```json
{
  "success": true,
  "data": {
    "reply": "رد سُروح هنا...",
    "mode": "normal|deep_analysis|executive",
    "confidence": 0.95,
    "context": "respond|execute|learn"
  },
  "envelope": {
    "source": "SUROOH_MEMORY_CORE",
    "timestamp": "2025-10-11T14:30:00Z",
    "version": "SCP-1.0"
  }
}
```

---

## 📞 الدعم

### **مشاكل تقنية:**
- Email: chat-support@surooh.group
- Docs: https://docs.surooh.group/chat-api

### **Emergency:**
- النواة لا تستجيب: تحقق من `/api/scp/status`
- خطأ في Signature: راجع توليد HMAC
- Rate limit exceeded: انتظر دقيقة وحاول مرة أخرى

---

## ✅ Checklist للتشغيل

قبل ما تشغّل الدردشة:

- [ ] نسخ المفاتيح الـ 4 لملف `.env`
- [ ] تحديث `NUCLEUS_API_URL` برابط النواة الصحيح
- [ ] اختبار `/api/scp/status` (لازم يرجع `active: true`)
- [ ] اختبار توليد HMAC signature
- [ ] اختبار إرسال رسالة بسيطة
- [ ] تفعيل HTTPS (مش HTTP)
- [ ] تفعيل error logging

---

## 🚀 الخطوات التالية

1. **نسخ المفاتيح** للدردشة → `.env` file
2. **اختبار الاتصال** → `/api/scp/status`
3. **إرسال رسالة تجريبية** → `/api/scp/send`
4. **تفعيل WebSocket** (اختياري للـ real-time)
5. **جاهز للاستخدام!** 🎉

---

**صُمّم للعمل مع:**
- Nucleus 2.0 - Surooh Empire Core Brain
- SCP Protocol v1.0
- HMAC-SHA256 + JWT Authentication

---

*تاريخ الإصدار: 11 أكتوبر 2025*  
*صالح حتى: تدوير المفاتيح (60-90 يوم)*  
*الحالة: ✅ جاهز للإنتاج*
