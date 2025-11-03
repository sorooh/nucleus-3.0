# 🧠 SCP Memory Storage System

## Overview

Surooh Chat Integration Protocol (SCP) now stores all conversations in **Memory Hub** (المخ) for persistent storage and retrieval.

---

## 📥 Message Storage

### **Endpoint:** `POST /api/scp/send`

**Authentication:** HMAC-SHA256 with `CHAT_HMAC_SECRET`

**Request:**
```json
{
  "sessionId": "session-123",
  "message": "مرحباً يا نواة!",
  "userId": "ahmad",
  "metadata": {
    "platform": "web",
    "deviceInfo": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message received and stored in Memory Hub",
  "data": {
    "sessionId": "session-123",
    "processed": true,
    "memoryId": "insight-1760233019603-qm6ryqmye",
    "timestamp": "2025-10-12T01:36:59.603Z"
  }
}
```

**Memory Hub Storage:**
- Type: `pattern`
- Description: `💬 **سُروح Chat (userId)**: message`
- Confidence: `1.0`
- Sources: `['surooh-chat']`
- Evidence: Full conversation context (sessionId, userId, message, metadata, IP, user agent, timestamp)

---

## 🔍 Message Search

### **Endpoint:** `POST /api/scp/search`

**Authentication:** HMAC-SHA256 with `CHAT_HMAC_SECRET`

**Request:**
```json
{
  "query": "مرحباً",           // Optional: search in message text
  "sessionId": "session-123",   // Optional: filter by session
  "userId": "ahmad",            // Optional: filter by user
  "limit": 50                   // Optional: default 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1,
    "messages": [
      {
        "id": "insight-1760233019603-qm6ryqmye",
        "message": "مرحباً يا نواة!",
        "userId": "ahmad",
        "sessionId": "session-123",
        "metadata": {},
        "timestamp": "2025-10-12T01:36:59.603Z"
      }
    ]
  }
}
```

---

## 📊 Detailed Logging

Every `/send` request logs:

```
================================================================================
📨 [SCP/SEND] NEW MESSAGE FROM SUROOH CHAT
================================================================================
🕐 Timestamp: 2025-10-12T01:36:59.602Z
👤 User ID: ahmad
💬 Session ID: working-test
📝 Message: 🎉 اختبار النظام الكامل! يا نواة هل تسمعني؟
🔍 Full Request Body: {
  "sessionId": "working-test",
  "message": "🎉 اختبار النظام الكامل! يا نواة هل تسمعني؟",
  "userId": "ahmad"
}
🌐 IP Address: 127.0.0.1
🔧 User Agent: curl/8.14.1
================================================================================
[MemoryHub] Insight recorded: pattern → 💬 **سُروح Chat (ahmad)**: ...
🧠 [Memory Hub] Chat message stored: insight-1760233019603-qm6ryqmye
✅ [SCP/SEND] Response sent: {...}
```

Every `/search` request logs:

```
================================================================================
🔍 [SCP/SEARCH] SEARCH REQUEST FROM SUROOH CHAT
================================================================================
📝 Query: مرحباً
💬 Session ID: session-123
👤 User ID: ahmad
📊 Limit: 50
================================================================================
✅ [SCP/SEARCH] Found 3 messages
```

---

## 🔐 HMAC Authentication

Same as other SCP endpoints:

```javascript
const crypto = require('crypto');
const body = JSON.stringify(requestBody);
const signature = crypto
  .createHmac('sha256', process.env.CHAT_HMAC_SECRET)
  .update(body)
  .digest('hex');

// Include in header
headers['X-Surooh-Signature'] = signature;
```

---

## 🧪 Testing

```bash
# Send message
BODY='{"sessionId":"test-001","message":"Hello Nucleus!","userId":"ahmad"}'
SIG=$(node -e "const crypto=require('crypto');const body='$BODY';console.log(crypto.createHmac('sha256',process.env.CHAT_HMAC_SECRET).update(body).digest('hex'));")

curl -X POST http://localhost:5000/api/scp/send \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIG" \
  -d "$BODY"

# Search messages
BODY='{"sessionId":"test-001"}'
SIG=$(node -e "const crypto=require('crypto');const body='$BODY';console.log(crypto.createHmac('sha256',process.env.CHAT_HMAC_SECRET).update(body).digest('hex'));")

curl -X POST http://localhost:5000/api/scp/search \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIG" \
  -d "$BODY"
```

---

## 📂 Files

- **API Implementation:** `server/scp-external-api.ts`
- **Memory Hub:** `nucleus/core/memory-hub.ts`
- **Types:** `nucleus/types/memory.ts`

---

## ✅ Status

**All systems operational:**
- ✅ Message storage in Memory Hub
- ✅ Search with filtering (sessionId, userId, query)
- ✅ Detailed 80-char banner logging
- ✅ HMAC authentication
- ✅ Complete conversation history retrieval

---

**Last Updated:** October 12, 2025
