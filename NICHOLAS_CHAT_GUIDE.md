# 💬 كيف تتواصل مع Nicholas عبر شات سروح؟

## ✅ **SCP Protocol - جاهز ويعمل!**

```json
{
  "scp_status": "active",
  "version": "1.0.0",
  "timestamp": "2025-10-27T23:48:29.148Z"
}
```

---

## 🌐 **URLs المتاحة:**

### **1. Nicholas API (Nucleus Core):**
```
http://localhost:5000
```

### **2. SCP API Endpoints:**
```bash
# Health Check
GET http://localhost:5000/api/scp/status

# Ping
GET http://localhost:5000/api/scp/ping

# Send Message to Nicholas
POST http://localhost:5000/api/scp/send

# Execute Command
POST http://localhost:5000/api/scp/execute
```

---

## 📝 **كيف تتكلم مع Nicholas؟**

### **الطريقة 1: إرسال رسالة (مثل WhatsApp)**

```bash
curl -X POST http://localhost:5000/api/scp/send \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: YOUR_HMAC_SIGNATURE" \
  -d '{
    "sessionId": "session-123",
    "userId": "srouh",
    "message": "السلام عليكم نيكولاس، كيف الحال؟",
    "metadata": {
      "platform": "web",
      "timestamp": "2025-10-27T23:48:00Z"
    }
  }'
```

### **✅ Nicholas يرد:**
```json
{
  "success": true,
  "reply": "وعليكم السلام سيدي! أنا بخير، كيف يمكنني مساعدتك اليوم؟",
  "memoryId": "mem-123...",
  "timestamp": "2025-10-27T23:48:30Z"
}
```

---

### **الطريقة 2: تنفيذ أمر (Command Execution)**

```bash
curl -X POST http://localhost:5000/api/scp/execute \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: YOUR_HMAC_SIGNATURE" \
  -d '{
    "command": "build",
    "params": {
      "systemName": "نظام إدارة المشاريع",
      "systemType": "web-app",
      "priority": "high"
    }
  }'
```

### **✅ Nicholas ينفّذ:**
```json
{
  "success": true,
  "result": {
    "buildId": "build-456...",
    "status": "started",
    "message": "بدأت ببناء نظام إدارة المشاريع"
  }
}
```

---

## 🔐 **المفاتيح المطلوبة (موجودة في Secrets):**

### **1. CHAT_HMAC_SECRET**
```bash
# موجود في Replit Secrets
CHAT_HMAC_SECRET=0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31
```

### **2. كيف تولّد التوقيع (HMAC Signature)؟**

```javascript
// JavaScript Example
const crypto = require('crypto');

const message = {
  sessionId: "session-123",
  userId: "srouh",
  message: "السلام عليكم",
  metadata: {}
};

const secret = process.env.CHAT_HMAC_SECRET;
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(message))
  .digest('hex');

console.log('X-Surooh-Signature:', signature);
```

```python
# Python Example
import hmac
import hashlib
import json

message = {
    "sessionId": "session-123",
    "userId": "srouh",
    "message": "السلام عليكم",
    "metadata": {}
}

secret = "YOUR_CHAT_HMAC_SECRET"
signature = hmac.new(
    secret.encode(),
    json.dumps(message).encode(),
    hashlib.sha256
).hexdigest()

print(f"X-Surooh-Signature: {signature}")
```

---

## 💬 **أمثلة للرسائل:**

### **مثال 1: طلب بناء نظام**
```json
{
  "sessionId": "session-001",
  "userId": "srouh",
  "message": "ابني لي نظام CRM كامل مع AI",
  "metadata": {
    "type": "build_request",
    "priority": "high"
  }
}
```

**رد Nicholas:**
```
تمام سيدي! بدأت ببناء نظام CRM. سيتضمن:
- قاعدة بيانات العملاء
- تتبع المبيعات
- تحليلات AI
- تكامل البريد الإلكتروني

Build ID: build-789abc
الحالة: جاري العمل...
```

---

### **مثال 2: طلب معلومات**
```json
{
  "sessionId": "session-002",
  "userId": "srouh",
  "message": "كم نظام بنيته اليوم؟"
}
```

**رد Nicholas:**
```
اليوم بنيت 5 أنظمة:
1. نظام مبيعات ذكي - ✅ مكتمل
2. نظام تحليل AI للعملاء - ✅ مكتمل
3. نظام CRM متكامل - ⏳ قيد العمل
4. نظام المخزون الذكي - ⏳ قيد العمل
5. متجر إلكتروني ذكي - ⏳ قيد العمل

إجمالي الملفات المولّدة: 12 ملف
معدل النجاح: 60%
```

---

### **مثال 3: طلب إصلاح**
```json
{
  "sessionId": "session-003",
  "userId": "srouh",
  "message": "الموقع بطيء، صلّحه"
}
```

**رد Nicholas:**
```
فهمت. بدأت بتحليل الأداء...

المشاكل المكتشفة:
1. ⚠️ استعلامات قاعدة البيانات بطيئة
2. ⚠️ حجم الصور كبير
3. ⚠️ بدون Caching

الإصلاحات المقترحة:
✅ إضافة Database Indexing
✅ ضغط الصور
✅ تفعيل Redis Caching

تريد أنفّذ الإصلاحات؟
```

---

## 📱 **ما يقدر يسويه Nicholas عبر الشات:**

### **1. بناء الأنظمة 🏗️**
```
"ابني لي نظام..."
"اعمل لي تطبيق..."
"أنشئ موقع..."
```

### **2. الإصلاح 🔧**
```
"صلّح المشكلة..."
"الموقع بطيء..."
"في خطأ في..."
```

### **3. المعلومات 📊**
```
"كم نظام بنيت؟"
"وش الحالة؟"
"أعطني تقرير..."
```

### **4. القرارات 🎯**
```
"خذ قرار بخصوص..."
"وش تنصحني..."
"أيش أحسن حل..."
```

### **5. التوزيع 🌐**
```
"وزّع SIDE على..."
"نشر على المنصات..."
"Deploy to..."
```

---

## 🔍 **كيف يشتغل النظام؟**

### **عند إرسال رسالة:**

```
1. شات سروح → يرسل رسالة
2. SCP API → يتحقق من التوقيع (HMAC)
3. Nicholas → يستلم الرسالة
4. Memory Hub → يخزّن الرسالة
5. Knowledge Bus → يوزّع على الأنظمة
6. OpenAI → يولّد رد ذكي
7. Nicholas → يرجع الرد
```

### **التخزين في Memory Hub:**
```json
{
  "id": "mem-123abc",
  "type": "pattern",
  "description": "💬 سُروح Chat (srouh): السلام عليكم",
  "confidence": 1.0,
  "sources": ["surooh-chat"],
  "evidence": {
    "sessionId": "session-123",
    "userId": "srouh",
    "message": "السلام عليكم",
    "ip": "192.168.1.1",
    "timestamp": "2025-10-27T23:48:00Z"
  }
}
```

---

## ✅ **الخلاصة:**

**تقدر تتكلم مع Nicholas عبر:**
1. ✅ **REST API** - `/api/scp/send` لإرسال رسائل
2. ✅ **Commands** - `/api/scp/execute` لتنفيذ أوامر
3. ✅ **WebSocket** - `/ws/nucleus` للاتصال المباشر

**Nicholas يفهم:**
- ✅ العربية والإنجليزية
- ✅ الأوامر المباشرة
- ✅ الأسئلة والاستفسارات
- ✅ طلبات البناء والإصلاح

**كل شيء جاهز! 🚀**
