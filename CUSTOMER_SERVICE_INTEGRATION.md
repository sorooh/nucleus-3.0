# 🎯 دليل ربط منصة خدمة العملاء بالنواة المركزية - Nucleus 2.0

## 📋 نظرة عامة

تم تطوير تكامل كامل يربط منصة خدمة العملاء الذكية مع النواة المركزية (Nucleus)، مع:
- ✅ استقبال وتخزين المحادثات المصنفة
- ✅ تأمين كامل بـ HMAC-SHA256 + JWT
- ✅ ربط تلقائي مع Memory Hub للتحليل والتعلم
- ✅ كشف الأنماط المتكررة
- ✅ إحصائيات وتقارير تفصيلية

---

## 🔧 المتطلبات والإعداد

### 1. المتغيرات البيئية (Secrets):

```bash
# في Replit Secrets:
NUCLEUS_JWT_SECRET=your-jwt-secret-here       # خاص بمنصة خدمة العملاء
CUSTOMER_HMAC_SECRET=your-hmac-secret-here    # للتوقيع HMAC
```

### 2. توليد JWT Token:

قبل إرسال الطلبات، تحتاج لتوليد JWT token:

```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { 
    source: 'customer-service-platform',
    timestamp: Date.now()
  },
  process.env.NUCLEUS_JWT_SECRET!,
  { expiresIn: '24h' }
);
```

---

## 📡 API Endpoints المتاحة

### 1️⃣ إرسال محادثة جديدة

```http
POST /api/nucleus/customer/message
Authorization: Bearer <JWT_TOKEN>
X-Signature: <HMAC_SIGNATURE>
Content-Type: application/json

{
  "accountName": "PLUTO",
  "sourceType": "text",
  "originalMessage": "مرحبا، ما وصلني الطلب",
  "classifiedTopic": "تأخير شحن",
  "suggestedReply": "نعتذر عن التأخير، طلبك قيد الشحن.",
  "finalReply": "نعتذر عن التأخير. طلبك قيد الشحن وسيصلك قريباً.",
  "feedback": "approved",
  "messageTimestamp": "2025-10-13T14:30:00Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Conversation recorded successfully",
  "data": {
    "conversationId": "abc-123-xyz",
    "account": "PLUTO",
    "topic": "تأخير شحن",
    "feedback": "approved"
  }
}
```

---

### 2️⃣ تحديث محادثة موجودة (اختياري)

```http
PATCH /api/nucleus/customer/message/:id
Authorization: Bearer <JWT_TOKEN>
X-Signature: <HMAC_SIGNATURE>
Content-Type: application/json

{
  "finalReply": "تم التعديل: نعتذر عن التأخير...",
  "feedback": "edited"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation updated successfully",
  "data": {
    "conversationId": "abc-123-xyz",
    "feedback": "edited",
    "finalReply": "تم التعديل: نعتذر عن التأخير..."
  }
}
```

---

### 3️⃣ الحصول على إحصائيات حساب

```http
GET /api/nucleus/customer/stats/PLUTO
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": "PLUTO",
    "totalConversations": 150,
    "topTopics": [
      { "topic": "تأخير شحن", "count": 45 },
      { "topic": "منتج تالف", "count": 30 },
      { "topic": "استفسار عام", "count": 25 }
    ],
    "feedbackStats": {
      "approved": 120,
      "edited": 20,
      "pending": 10
    },
    "approvalRate": "80.0%"
  }
}
```

---

### 4️⃣ الحصول على إحصائيات عامة

```http
GET /api/nucleus/customer/stats
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConversations": 500,
    "totalAccounts": 5,
    "topAccounts": [
      { "account": "PLUTO", "count": 150 },
      { "account": "MARS", "count": 120 }
    ],
    "topTopics": [
      { "topic": "تأخير شحن", "count": 100 },
      { "topic": "منتج تالف", "count": 80 }
    ]
  }
}
```

---

## 🔐 طريقة التوقيع HMAC

### توليد التوقيع (من جهة منصة خدمة العملاء):

```typescript
import crypto from 'crypto';

function generateHMACSignature(payload: any, secret: string): string {
  const body = JSON.stringify(payload);
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return signature;
}

// مثال:
const payload = {
  account_name: "PLUTO",
  source_type: "text",
  original_message: "...",
  // ... باقي البيانات
};

const signature = generateHMACSignature(
  payload, 
  process.env.CUSTOMER_HMAC_SECRET
);

// أرسل الـ signature في header
headers['X-Signature'] = signature;
```

---

## 🔥 أمثلة عملية كاملة

### مثال 1: إرسال محادثة كاملة

```typescript
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

async function sendConversation() {
  // 1. توليد JWT Token
  const token = jwt.sign(
    { source: 'customer-service', timestamp: Date.now() },
    process.env.NUCLEUS_JWT_SECRET!,
    { expiresIn: '24h' }
  );

  // 2. تحضير البيانات
  const payload = {
    accountName: "PLUTO",
    sourceType: "text",
    originalMessage: "وصلني المنتج تالف!",
    classifiedTopic: "منتج تالف",
    suggestedReply: "نعتذر عن الإزعاج. أرسل صورة وسنقوم بالإجراء المناسب.",
    finalReply: "نعتذر عن الإزعاج. أرسل صورة للمنتج وسنبدأ إجراءات الاسترجاع.",
    feedback: "approved",
    messageTimestamp: new Date().toISOString()
  };

  // 3. توليد HMAC Signature
  const signature = crypto
    .createHmac('sha256', process.env.CUSTOMER_HMAC_SECRET!)
    .update(JSON.stringify(payload))
    .digest('hex');

  // 4. إرسال الطلب
  try {
    const response = await axios.post(
      'https://your-nucleus.replit.app/api/nucleus/customer/message',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Signature': signature,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Success:', response.data);
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}
```

---

### مثال 2: البحث عن الأنماط المتكررة

```typescript
async function checkPatterns(accountName: string) {
  const token = jwt.sign(
    { source: 'customer-service', timestamp: Date.now() },
    process.env.NUCLEUS_JWT_SECRET!,
    { expiresIn: '24h' }
  );

  try {
    const response = await axios.get(
      `https://your-nucleus.replit.app/api/nucleus/customer/stats/${accountName}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const { topTopics } = response.data.data;
    
    // تحليل الأنماط المتكررة
    topTopics.forEach((topic: any) => {
      if (topic.count >= 10) {
        console.log(`⚠️ نمط متكرر: ${topic.topic} (${topic.count} مرة)`);
        console.log('   → يحتاج لحل جذري أو تحسين في العملية');
      }
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}
```

---

## 🧠 كيف يعمل التكامل مع Nucleus؟

### 1. التخزين في قاعدة البيانات:

جميع المحادثات تُخزن في جدول `customer_conversations`:

```sql
SELECT 
  account_name, 
  classified_topic, 
  feedback, 
  COUNT(*) as count
FROM customer_conversations
GROUP BY account_name, classified_topic, feedback
ORDER BY count DESC;
```

### 2. التسجيل في Memory Hub:

كل محادثة تُسجل تلقائياً في Memory Hub بـ:

```typescript
{
  type: 'pattern',
  description: '💬 [PLUTO] تأخير شحن',
  confidence: 0.8,
  sources: ['customer-service-platform'],
  evidence: {
    conversationId: '...',
    account: 'PLUTO',
    topic: 'تأخير شحن',
    // ... باقي البيانات
  }
}
```

### 3. كشف الأنماط المتكررة:

إذا تكرر نفس الموضوع **3 مرات أو أكثر** لنفس الحساب:

```typescript
{
  type: 'pattern',
  description: '🔁 نمط متكرر: تأخير شحن في PLUTO',
  confidence: 0.9,
  sources: ['customer-service-platform'],
  evidence: {
    account: 'PLUTO',
    topic: 'تأخير شحن',
    occurrences: 5,
    suggestion: 'قد تحتاج هذه المشكلة لحل جذري أو تحسين في العملية'
  }
}
```

---

## ⚠️ معالجة الأخطاء

### الأخطاء الشائعة:

#### 1. **خطأ في JWT Token**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```
**الحل:** تحقق من NUCLEUS_JWT_SECRET وصلاحية التوكن

#### 2. **خطأ في HMAC Signature**
```json
{
  "success": false,
  "message": "Invalid signature"
}
```
**الحل:** تحقق من CUSTOMER_HMAC_SECRET والتوقيع الصحيح

#### 3. **بيانات ناقصة**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [...]
}
```
**الحل:** تحقق من جميع الحقول المطلوبة

### Best Practices:

```typescript
async function safeConversationSend(payload: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendConversation(payload);
      return result;
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed`);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts`);
      }
      
      // انتظار قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## 📊 ماذا يحصل داخل Nucleus؟

### 1. استقبال المحادثة:
```
POST /api/nucleus/customer/message
  ↓
✅ JWT Verification
  ↓
✅ HMAC Signature Verification
  ↓
💾 Save to Database (customer_conversations)
  ↓
🧠 Record in Memory Hub
  ↓
🔍 Analyze Patterns (if count >= 3)
  ↓
✅ Return Success Response
```

### 2. التعلم الذاتي:

Nucleus يتعلم تلقائياً من المحادثات:
- 📈 تحديد المواضيع الأكثر تكراراً
- 🔁 كشف الأنماط المتكررة
- 📊 توليد إحصائيات وتقارير
- 🎯 اقتراحات للتحسين

---

## 🚀 النشر والإنتاج

### Checklist قبل النشر:

- [ ] إضافة `CUSTOMER_HMAC_SECRET` في Secrets
- [ ] التحقق من `NUCLEUS_JWT_SECRET` موجود
- [ ] اختبار إرسال محادثة
- [ ] اختبار تحديث محادثة
- [ ] التحقق من الإحصائيات
- [ ] مراقبة Memory Hub للأنماط

### اختبار سريع:

```bash
# 1. اختبار Health Check
curl https://your-nucleus.replit.app/api/health

# 2. اختبار إرسال محادثة (بعد توليد JWT + HMAC)
curl -X POST https://your-nucleus.replit.app/api/nucleus/customer/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Signature: YOUR_HMAC_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{
    "account_name": "TEST",
    "source_type": "text",
    "original_message": "test message",
    "classified_topic": "test",
    "suggested_reply": "test reply",
    "final_reply": "test final reply",
    "feedback": "approved",
    "messageTimestamp": "2025-10-13T14:00:00Z"
  }'
```

---

## 📞 المكونات التقنية

### الملفات الرئيسية:

```
server/integrations/customer-service/
├── CustomerServiceAdapter.ts     # معالجة البيانات والتحليل
├── CustomerServiceAPI.ts         # API Endpoints
└── (docs coming soon)

shared/schema.ts
└── customerConversations table  # Database schema

server/routes.ts
└── /api/nucleus/customer/*      # Route registration
```

### Database Schema:

```typescript
export const customerConversations = pgTable("customer_conversations", {
  id: varchar("id").primaryKey(),
  accountName: text("account_name").notNull(),
  sourceType: text("source_type").notNull(),
  originalMessage: text("original_message").notNull(),
  classifiedTopic: text("classified_topic").notNull(),
  suggestedReply: text("suggested_reply").notNull(),
  finalReply: text("final_reply").notNull(),
  feedback: text("feedback").notNull().default('pending'),
  messageTimestamp: timestamp("message_timestamp").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

## ✅ خلاصة سريعة

```typescript
// 1️⃣ توليد JWT Token
const token = jwt.sign({ source: 'customer-service' }, NUCLEUS_JWT_SECRET, { expiresIn: '24h' });

// 2️⃣ توليد HMAC Signature
const signature = crypto.createHmac('sha256', CUSTOMER_HMAC_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// 3️⃣ إرسال الطلب
await axios.post('https://nucleus.replit.app/api/nucleus/customer/message', payload, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Signature': signature
  }
});

// ✅ تم! النواة ستحفظ، تحلل، وتتعلم تلقائياً
```

---

**🎉 التكامل جاهز للاستخدام! النواة المركزية الآن متصلة بمنصة خدمة العملاء!**
