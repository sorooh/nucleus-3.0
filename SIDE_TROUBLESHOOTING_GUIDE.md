# 🔧 SIDE Troubleshooting Guide - Nicholas Federation

## ❌ المشكلة: لم يتم العثور على العقدة المُسجّلة

**Kid المُتوقع**: `side-1761516317868-0oujq`
**الحالة**: ❌ غير موجود في سجلات Nicholas

---

## 🔍 ما وجده Nicholas

### العُقد المُسجّلة فعلياً:

1. **side-local-test** 
   - Key ID: `kid-side-local-test-1761514321954`
   - Status: ⚠️ pending
   - المشكلة: فشل في المصادقة (HMAC + CodeSig failures)

2. **side-test-final**
   - Status: ⚠️ pending
   - No heartbeat sent

3. **side-test-1** 
   - Status: ✅ **active**
   - Last heartbeat: 20:34:23 ✅

---

## 🛠️ خطوات الإصلاح

### الخطوة 1: التحقق من التسجيل

```bash
# هل سجّلت العقدة فعلاً؟
# تحقق من استجابة /api/federation/register

# يجب أن تحصل على:
{
  "success": true,
  "credentials": {
    "keyId": "kid-...",
    "authToken": "eyJ...",
    "hmacSecret": "abc123...",
    "codeSignature": "sha256:..."
  }
}
```

**⚠️ مهم**: احفظ الـ credentials فوراً - لن تظهر مرة أخرى!

---

### الخطوة 2: التحقق من HMAC Signature

**المشكلة الشائعة**: خطأ في بناء payload

**الطريقة الصحيحة**:
```typescript
const timestamp = Date.now().toString();
const bodyStr = JSON.stringify(body);
const bodySha256 = crypto.createHash('sha256').update(bodyStr).digest('hex');

// ⚠️ IMPORTANT: Format must be exact!
const payload = `POST\n/api/federation/heartbeat\n${bodySha256}\n${timestamp}`;

const signature = crypto
  .createHmac('sha256', hmacSecret)
  .update(payload)
  .digest('hex');

const hmacHeader = `v1=${signature}`;
```

**تحقق من**:
- ✅ Method بحروف كبيرة (`POST` not `post`)
- ✅ URL path كامل (`/api/federation/heartbeat`)
- ✅ Body SHA256 بصيغة hex
- ✅ Timestamp بنفس القيمة في header وpayload
- ✅ فواصل `\n` بين كل جزء

---

### الخطوة 3: التحقق من Code Signature

```typescript
// في الوقت الحالي - استخدم القيمة المُسجّلة:
const codeSigHeader = credentials.codeSignature;

// Headers:
{
  'X-Surooh-CodeSig': codeSigHeader
}
```

---

### الخطوة 4: التحقق من Headers الكاملة

```typescript
const headers = {
  'Authorization': `Bearer ${credentials.authToken}`,
  'X-Surooh-KeyId': credentials.keyId,
  'X-Surooh-Timestamp': timestamp.toString(),
  'X-Surooh-Signature': `v1=${signature}`,
  'X-Surooh-CodeSig': credentials.codeSignature,
  'Content-Type': 'application/json'
};
```

**تحقق من**:
- ✅ Authorization يبدأ بـ `Bearer `
- ✅ Timestamp رقم (not string with quotes)
- ✅ Signature يبدأ بـ `v1=`
- ✅ KeyId صحيح

---

### الخطوة 5: اختبار بسيط

```typescript
import crypto from 'crypto';
import axios from 'axios';

// 1. استخدم credentials المحفوظة
const credentials = {
  keyId: 'YOUR_KEY_ID',
  authToken: 'YOUR_JWT',
  hmacSecret: 'YOUR_HMAC_SECRET',
  codeSignature: 'YOUR_CODE_SIG'
};

// 2. بناء الطلب
const timestamp = Date.now();
const body = { health: 100 };
const bodyStr = JSON.stringify(body);
const bodySha256 = crypto.createHash('sha256').update(bodyStr).digest('hex');
const payload = `POST\n/api/federation/heartbeat\n${bodySha256}\n${timestamp}`;
const signature = crypto.createHmac('sha256', credentials.hmacSecret)
  .update(payload)
  .digest('hex');

// 3. إرسال الطلب
try {
  const response = await axios.post(
    'https://YOUR-NICHOLAS-URL/api/federation/heartbeat',
    body,
    {
      headers: {
        'Authorization': `Bearer ${credentials.authToken}`,
        'X-Surooh-KeyId': credentials.keyId,
        'X-Surooh-Timestamp': timestamp.toString(),
        'X-Surooh-Signature': `v1=${signature}`,
        'X-Surooh-CodeSig': credentials.codeSignature,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('✅ Success:', response.data);
} catch (error) {
  console.error('❌ Error:', error.response?.data || error.message);
}
```

---

## 🔍 فحص الأخطاء الشائعة

### خطأ: `invalid_hmac_signature`

**السبب المحتمل**:
1. ❌ Timestamp مختلف بين header وpayload
2. ❌ Body مُعدّل بعد حساب SHA256
3. ❌ HMAC secret خاطئ
4. ❌ Format الـ payload غير صحيح

**الحل**:
```typescript
// تأكد من استخدام نفس timestamp
const timestamp = Date.now();

// تأكد من ترتيب payload
const payload = `${method}\n${path}\n${bodySha256}\n${timestamp}`;
```

---

### خطأ: `invalid_code_signature`

**السبب المحتمل**:
1. ❌ Code signature خاطئ أو غير موجود
2. ❌ Format الـ header غير صحيح

**الحل**:
```typescript
// استخدم القيمة المُسجّلة كما هي
headers['X-Surooh-CodeSig'] = credentials.codeSignature;
```

---

### خطأ: `invalid_jwt_token`

**السبب المحتمل**:
1. ❌ JWT منتهي الصلاحية (> سنة)
2. ❌ JWT غير صحيح
3. ❌ Authorization header غير صحيح

**الحل**:
```typescript
// تأكد من Format
headers['Authorization'] = `Bearer ${credentials.authToken}`;
```

---

### خطأ: `node_not_found`

**السبب المحتمل**:
1. ❌ لم تُسجّل العقدة بعد
2. ❌ nodeId في JWT لا يطابق nodeId في database

**الحل**:
```typescript
// سجّل العقدة أولاً
const response = await axios.post(
  'https://YOUR-NICHOLAS-URL/api/federation/register',
  {
    nodeId: 'side-node-main',
    nodeName: 'SIDE Main Node',
    // ... بقية البيانات
  }
);

// احفظ الـ credentials
console.log('Save these:', response.data.credentials);
```

---

## 📞 طلب المساعدة من Nicholas

إذا استمرت المشكلة، شارك هذه المعلومات:

```typescript
{
  "nodeId": "YOUR_NODE_ID",
  "keyId": "YOUR_KEY_ID",
  "error": "EXACT_ERROR_MESSAGE",
  "timestamp": "WHEN_IT_HAPPENED",
  "payload_sample": {
    "method": "POST",
    "path": "/api/federation/heartbeat",
    "bodySha256": "abc123...",
    "timestamp": "1761516317868"
  }
}
```

Nicholas سيفحص:
- ✅ Audit logs
- ✅ Secret vault
- ✅ Node status
- ✅ HMAC/JWT verification

---

## ✅ علامات النجاح

عند نجاح الاتصال، يجب أن ترى:

### في SIDE:
```json
{
  "success": true,
  "message": "Heartbeat received",
  "node": {
    "nodeId": "side-node-main",
    "status": "active",
    "health": 100
  }
}
```

### في Nicholas Audit Log:
```sql
event_type: 'auth_success'
node_id: 'side-node-main'
endpoint: '/api/federation/heartbeat'
success: true
```

---

**Nicholas 3.2 - Federation Support** 🤝
