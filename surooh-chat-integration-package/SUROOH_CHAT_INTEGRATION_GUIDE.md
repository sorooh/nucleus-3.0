# 🔗 دليل ربط سروح Chat مع Nucleus 2.0

## 📋 نظرة عامة

هذا الدليل يشرح كيفية ربط **سروح Chat** (تطبيق منفصل) مع **Nucleus 2.0 Core Brain** لتخزين المحادثات واستخدام الصلاحيات الكاملة.

---

## ✅ التحقق من الجاهزية

### **1. Nucleus Core جاهز ✅**

```bash
# Test integration (already verified)
node test-surooh-chat-integration.mjs
```

**النتيجة:**
- ✅ SCP API يعمل على `/api/scp/execute`
- ✅ Memory Hub يخزن ويسترجع البيانات
- ✅ HMAC Authentication مفعّل
- ✅ All capability commands tested

### **2. Secrets مطلوبة**

سروح Chat تحتاج هذا الـ secret:

```env
CHAT_HMAC_SECRET=<same-value-as-nucleus>
```

**الحصول على القيمة:**
```bash
# في Nucleus Core
echo $CHAT_HMAC_SECRET
```

---

## 🔐 Authentication

### **HMAC-SHA256 Signature**

كل request لازم يحتوي على:

```javascript
const crypto = require('crypto');

function generateSignature(requestBody, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(requestBody))
    .digest('hex');
}

// Example
const body = {
  command: "store_insight",
  params: { ... },
  sessionId: "chat-123"
};

const signature = generateSignature(body, process.env.CHAT_HMAC_SECRET);
```

---

## 📡 API Integration

### **Endpoint**

```
POST https://<nucleus-url>/api/scp/execute
```

### **Headers**

```javascript
{
  'Content-Type': 'application/json',
  'X-Surooh-Signature': '<hmac-signature>'
}
```

### **Request Body**

```json
{
  "command": "<command_name>",
  "params": {
    // command-specific parameters
  },
  "sessionId": "<unique-session-id>"
}
```

---

## 💬 تخزين المحادثات

### **1. تخزين رسالة المستخدم**

```javascript
const userMessage = {
  command: "store_insight",
  params: {
    pattern: "كيف حالك يا نواة؟",
    evidence: JSON.stringify({
      sessionId: "chat-abc-123",
      userId: "user-456",
      messageType: "user_question",
      timestamp: new Date().toISOString()
    }),
    type: "conversation",
    sources: ["surooh-chat"],
    confidence: 1.0
  },
  sessionId: "chat-abc-123"
};

const signature = generateSignature(userMessage, CHAT_HMAC_SECRET);

await fetch('https://nucleus.surooh.ai/api/scp/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Surooh-Signature': signature
  },
  body: JSON.stringify(userMessage)
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "memoryId": "insight-1760357156910-06jzaeavt",
    "pattern": "كيف حالك يا نواة؟",
    "stored": true
  },
  "executedBy": "Surooh Chat",
  "timestamp": "2025-10-13T12:05:56.910Z"
}
```

### **2. تخزين رد البوت**

```javascript
const botResponse = {
  command: "store_insight",
  params: {
    pattern: "أنا بخير، شكراً! كيف بقدر ساعدك؟",
    evidence: JSON.stringify({
      sessionId: "chat-abc-123",
      userId: "user-456",
      messageType: "bot_response",
      timestamp: new Date().toISOString()
    }),
    type: "conversation",
    sources: ["surooh-chat"],
    confidence: 1.0
  },
  sessionId: "chat-abc-123"
};
```

---

## 🔍 استرجاع المحادثات

### **1. Query بالكلمات المفتاحية**

```javascript
const queryRequest = {
  command: "query_memory",
  params: {
    query: "كيف حالك",
    limit: 10
  },
  sessionId: "chat-abc-123"
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "كيف حالك",
    "matches": 1,
    "results": [
      {
        "id": "insight-1760357156910-06jzaeavt",
        "description": "كيف حالك يا نواة؟",
        "type": "conversation",
        "sources": ["surooh-chat"],
        "confidence": 1,
        "timestamp": 1760357156910
      }
    ]
  }
}
```

### **2. Search بالـ Filter**

```javascript
const searchRequest = {
  command: "search_insights",
  params: {
    filter: {
      sources: ["surooh-chat"],
      type: "conversation"
    },
    limit: 20
  },
  sessionId: "chat-abc-123"
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "insights": [
      { "id": "...", "description": "...", ... }
    ]
  }
}
```

---

## 🤖 تنفيذ الأوامر

سروح Chat تقدر تنفذ أي أمر من الـ SCP Capabilities:

### **1. إنشاء بوت جديد**

```javascript
const createBotRequest = {
  command: "create_bot",
  params: {
    name: "Support Assistant",
    platform: "b2b",
    botType: "support",
    capabilities: ["chat", "learn"]
  },
  sessionId: "chat-abc-123"
};
```

### **2. إصلاح مشكلة**

```javascript
const fixIssueRequest = {
  command: "fix_issue",
  params: {
    issue: "Database connection timeout",
    platform: "b2b",
    solution: "Increased connection pool to 50"
  },
  sessionId: "chat-abc-123"
};
```

### **3. حالة النظام**

```javascript
const statusRequest = {
  command: "get_system_status",
  params: {},
  sessionId: "chat-abc-123"
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nucleus": "active",
    "memoryHub": "active",
    "status": "All systems operational"
  }
}
```

---

## 🔧 Implementation في سروح Chat

### **مثال Node.js/Express**

```javascript
import crypto from 'crypto';
import fetch from 'node-fetch';

const NUCLEUS_URL = process.env.NUCLEUS_URL;
const CHAT_HMAC_SECRET = process.env.CHAT_HMAC_SECRET;

class NucleusClient {
  constructor() {
    this.nucleusUrl = NUCLEUS_URL;
    this.secret = CHAT_HMAC_SECRET;
  }

  generateSignature(body) {
    return crypto
      .createHmac('sha256', this.secret)
      .update(JSON.stringify(body))
      .digest('hex');
  }

  async executeCommand(command, params, sessionId) {
    const body = { command, params: params || {}, sessionId };
    const signature = this.generateSignature(body);

    const response = await fetch(`${this.nucleusUrl}/api/scp/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Surooh-Signature': signature
      },
      body: JSON.stringify(body)
    });

    return await response.json();
  }

  async storeMessage(sessionId, userId, message, messageType) {
    return this.executeCommand('store_insight', {
      pattern: message,
      evidence: JSON.stringify({
        sessionId,
        userId,
        messageType,
        timestamp: new Date().toISOString()
      }),
      type: 'conversation',
      sources: ['surooh-chat'],
      confidence: 1.0
    }, sessionId);
  }

  async queryMemory(sessionId, query, limit = 10) {
    return this.executeCommand('query_memory', {
      query,
      limit
    }, sessionId);
  }
}

// Usage
const nucleusClient = new NucleusClient();

// Store user message
await nucleusClient.storeMessage(
  'session-123',
  'user-456',
  'كيف حالك؟',
  'user_question'
);

// Query memory
const results = await nucleusClient.queryMemory(
  'session-123',
  'كيف حالك'
);
```

### **مثال Python**

```python
import hmac
import hashlib
import json
import requests
from datetime import datetime

class NucleusClient:
    def __init__(self, nucleus_url, secret):
        self.nucleus_url = nucleus_url
        self.secret = secret
    
    def generate_signature(self, body):
        message = json.dumps(body, separators=(',', ':')).encode()
        signature = hmac.new(
            self.secret.encode(),
            message,
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def execute_command(self, command, params, session_id):
        body = {
            "command": command,
            "params": params or {},
            "sessionId": session_id
        }
        signature = self.generate_signature(body)
        
        response = requests.post(
            f"{self.nucleus_url}/api/scp/execute",
            headers={
                "Content-Type": "application/json",
                "X-Surooh-Signature": signature
            },
            json=body
        )
        return response.json()
    
    def store_message(self, session_id, user_id, message, message_type):
        return self.execute_command('store_insight', {
            "pattern": message,
            "evidence": json.dumps({
                "sessionId": session_id,
                "userId": user_id,
                "messageType": message_type,
                "timestamp": datetime.utcnow().isoformat()
            }),
            "type": "conversation",
            "sources": ["surooh-chat"],
            "confidence": 1.0
        }, session_id)

# Usage
nucleus = NucleusClient(
    nucleus_url="https://nucleus.surooh.ai",
    secret=os.getenv("CHAT_HMAC_SECRET")
)

result = nucleus.store_message(
    session_id="session-123",
    user_id="user-456",
    message="كيف حالك؟",
    message_type="user_question"
)
```

---

## 📊 Best Practices

### **1. Session Management**

- استخدم session ID فريد لكل محادثة
- خزّن الـ session ID في database سروح Chat
- استخدم نفس الـ session ID لكل الرسائل في نفس المحادثة

### **2. Error Handling**

```javascript
async function safeExecuteCommand(command, params, sessionId) {
  try {
    const result = await nucleusClient.executeCommand(command, params, sessionId);
    
    if (!result.success) {
      console.error('Command failed:', result.error);
      // Handle error
    }
    
    return result;
  } catch (error) {
    console.error('Network error:', error);
    // Retry logic or fallback
  }
}
```

### **3. Batch Operations**

```javascript
// Store multiple messages
async function storeChatHistory(sessionId, messages) {
  const promises = messages.map(msg => 
    nucleusClient.storeMessage(
      sessionId,
      msg.userId,
      msg.text,
      msg.type
    )
  );
  
  await Promise.all(promises);
}
```

---

## 🧪 Testing

### **1. Test Connection**

```bash
# Run integration test
node test-surooh-chat-integration.mjs
```

### **2. Verify Storage**

```javascript
// In Surooh Chat
const result = await nucleusClient.executeCommand('search_insights', {
  filter: {
    sources: ['surooh-chat']
  },
  limit: 100
}, 'test-session');

console.log(`Total stored: ${result.data.total}`);
```

### **3. Test Commands**

```javascript
// Test system status
const status = await nucleusClient.executeCommand(
  'get_system_status',
  {},
  'test-session'
);

console.log('Nucleus status:', status.data.status);
```

---

## 🔒 Security

### **1. Secret Management**

- ✅ خزّن `CHAT_HMAC_SECRET` في environment variables
- ✅ لا تكتب الـ secret في الكود
- ✅ استخدم نفس القيمة الموجودة في Nucleus

### **2. Signature Validation**

- ✅ وّلد signature جديد لكل request
- ✅ استخدم `JSON.stringify()` قبل التوقيع
- ✅ أرسل الـ signature في header `X-Surooh-Signature`

### **3. HTTPS Only**

```javascript
// Production only
const NUCLEUS_URL = 'https://nucleus.surooh.ai'; // Not http://
```

---

## 📞 Support

للمساعدة:
1. اختبر باستخدام `test-surooh-chat-integration.mjs`
2. راجع الـ logs في Nucleus Core
3. تأكد من `CHAT_HMAC_SECRET` صحيح

---

## ✅ Checklist

قبل الـ production:

- [ ] `CHAT_HMAC_SECRET` مضبوط
- [ ] HMAC signature يعمل صح
- [ ] Test integration نجح
- [ ] Error handling جاهز
- [ ] HTTPS enabled في production
- [ ] Session management جاهز
- [ ] Logging configured

---

**Status:** ✅ Ready for Integration  
**Version:** 1.0.0  
**Last Updated:** October 13, 2025
