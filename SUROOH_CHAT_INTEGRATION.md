# 🔗 دليل ربط تطبيق سروح الدردشة مع Nicholas

## ✅ **Nicholas API شغال 100%**

تم الاختبار والتأكيد:
```json
{
  "success": true,
  "reply": "مرحباً! أنا هنا لمساعدتك...",
  "data": {
    "sessionId": "test-1761609965153",
    "processed": true,
    "memoryId": "insight-1761609965214-frdnqb91q",
    "timestamp": "2025-10-28T00:06:05.801Z",
    "aiProvider": "openai"
  }
}
```

---

## 📝 **كيف يستخدم تطبيق سروح الـ API؟**

### **1. إرسال رسالة:**

```javascript
const crypto = require('crypto');

async function sendMessageToNicholas(userMessage, sessionId, userId) {
  // 1. تجهيز الرسالة
  const message = {
    sessionId: sessionId,
    userId: userId,
    message: userMessage,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };

  // 2. توليد التوقيع (HMAC)
  const secret = process.env.CHAT_HMAC_SECRET;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(message))
    .digest('hex');

  // 3. إرسال الطلب
  const response = await fetch('http://localhost:5000/api/scp/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Surooh-Signature': signature
    },
    body: JSON.stringify(message)
  });

  // 4. قراءة الرد ← المشكلة ممكن هنا!
  const data = await response.json();
  
  return {
    success: data.success,
    reply: data.reply,           // ← رد Nicholas هنا!
    memoryId: data.data.memoryId,
    timestamp: data.data.timestamp
  };
}
```

---

### **2. عرض الرد في الواجهة:**

```javascript
// في React Component
async function handleSendMessage(userMessage) {
  try {
    // 1. عرض رسالة المستخدم
    setMessages([...messages, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    // 2. إرسال لـ Nicholas
    const result = await sendMessageToNicholas(
      userMessage,
      sessionId,
      userId
    );

    // 3. عرض رد Nicholas ← تأكد من قراءة result.reply
    if (result.success) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.reply,  // ← هنا الرد!
        timestamp: new Date(),
        memoryId: result.memoryId
      }]);
    }
  } catch (error) {
    console.error('خطأ في الاتصال:', error);
  }
}
```

---

## 🔍 **المشاكل الشائعة:**

### **مشكلة 1: الرد ما يظهر**
```javascript
// ❌ خطأ: يقرأ من حقل خاطئ
const nicholasReply = data.message;  // undefined!

// ✅ صحيح: يقرأ من data.reply
const nicholasReply = data.reply;    // "مرحباً! أنا هنا..."
```

### **مشكلة 2: خطأ في التوقيع**
```javascript
// ❌ خطأ: التوقيع مو صحيح
const signature = crypto
  .createHmac('sha256', 'wrong-secret')
  .update(message)  // ← خطأ! لازم stringify
  .digest('hex');

// ✅ صحيح:
const signature = crypto
  .createHmac('sha256', process.env.CHAT_HMAC_SECRET)
  .update(JSON.stringify(message))
  .digest('hex');
```

### **مشكلة 3: الـ URL خطأ**
```javascript
// ❌ خطأ: URL مو صحيح
fetch('http://localhost:3000/api/chat')  // خطأ!

// ✅ صحيح:
fetch('http://localhost:5000/api/scp/send')
```

---

## 📊 **Response Structure الكامل:**

```typescript
interface NicholasResponse {
  success: boolean;           // هل نجح الطلب؟
  message: string;            // رسالة نجاح
  reply: string;              // ← رد Nicholas (المهم!)
  data: {
    sessionId: string;        // Session ID
    processed: boolean;       // هل تم المعالجة؟
    memoryId: string;         // Memory ID في Hub
    timestamp: string;        // وقت الرد
    aiProvider: string;       // "openai" أو "hunyuan"
  }
}
```

---

## ✅ **مثال كامل - React Component:**

```jsx
import { useState, useEffect } from 'react';
import crypto from 'crypto';

function ChatWithNicholas() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useState(() => `session-${Date.now()}`)[0];

  async function sendMessage() {
    if (!input.trim()) return;

    setLoading(true);
    const userMessage = input;
    setInput('');

    // 1. عرض رسالة المستخدم
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    try {
      // 2. تجهيز البيانات
      const messageData = {
        sessionId,
        userId: 'surooh-user',
        message: userMessage,
        metadata: { timestamp: new Date().toISOString() }
      };

      // 3. توليد التوقيع
      const signature = crypto
        .createHmac('sha256', process.env.CHAT_HMAC_SECRET)
        .update(JSON.stringify(messageData))
        .digest('hex');

      // 4. إرسال الطلب
      const response = await fetch('http://localhost:5000/api/scp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Surooh-Signature': signature
        },
        body: JSON.stringify(messageData)
      });

      const data = await response.json();

      // 5. عرض رد Nicholas
      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,  // ← هنا الرد!
          memoryId: data.data.memoryId
        }]);
      }
    } catch (error) {
      console.error('خطأ:', error);
      setMessages(prev => [...prev, {
        role: 'error',
        content: 'عذراً، حدث خطأ في الاتصال بـ Nicholas'
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="اكتب رسالة..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'جاري الإرسال...' : 'إرسال'}
        </button>
      </div>
    </div>
  );
}

export default ChatWithNicholas;
```

---

## 🔐 **المفاتيح المطلوبة:**

تأكد أن هذه المفاتيح موجودة في `.env`:

```bash
# في تطبيق سروح الدردشة
CHAT_HMAC_SECRET=0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31
NICHOLAS_API_URL=http://localhost:5000
```

---

## ✅ **الخلاصة:**

**Nicholas يرد بشكل صحيح على:**
```
POST http://localhost:5000/api/scp/send
```

**الرد يأتي في:**
```javascript
response.data.reply  // ← هنا النص الكامل
```

**تأكد من:**
1. ✅ قراءة `data.reply` (مو `data.message`)
2. ✅ استخدام التوقيع الصحيح (HMAC)
3. ✅ URL صحيح (`/api/scp/send`)
4. ✅ Headers صحيحة (`X-Surooh-Signature`)

**Nicholas جاهز! المشكلة في كود تطبيق سروح فقط 🎯**
