# 🌐 Nicholas 3.2 Federation API - Complete Guide

## 📋 نظرة عامة

نظام Federation في Nicholas 3.2 يسمح للعقد الفيدرالية (مثل Surooh SIDE) بالاتصال والمزامنة مع النواة الأم. هذا الدليل يشرح كيفية تسجيل عقدة جديدة والتكامل معها.

---

## 🔐 المصادقة والأمان

### نظام المصادقة
Nicholas 3.2 يوفر نظام مصادقة متعدد الطبقات:

1. **JWT Token**: يُنشأ تلقائياً عند التسجيل، صالح لمدة 365 يوم
2. **HMAC Secret**: للتوقيع الآمن على الرسائل (SHA-256)
3. **Governance Engine**: يتحقق من كل طلب عبر CPE + TAG

### الحصول على الـ Credentials

**مهم جداً:** عند تسجيل العقدة للمرة الأولى، ستحصل على:
- `authToken` - JWT Token للمصادقة
- `hmacSecret` - HMAC Secret للتوقيع
- `codeSignature` - Surooh DNA Signature

**لن يتم عرض هذه المفاتيح مرة أخرى!** احفظها بشكل آمن في متغيرات البيئة.

---

## 🚀 تسجيل عقدة جديدة

### 1. Endpoint التسجيل

```
POST /api/federation/register
Content-Type: application/json
```

### 2. Request Body

```json
{
  "nodeId": "side-node-1",
  "nodeName": "Surooh SIDE - Main Development Nucleus",
  "arabicName": "سِيدا - النواة التطويرية الأم",
  "nodeType": "development",
  "organizationId": "surooh-holding",
  "nucleusLevel": "main",
  "nodeUrl": "https://side.sorooh.ai",
  "wsUrl": "wss://side.sorooh.ai/federation",
  "permissions": [
    "code:sync",
    "knowledge:share",
    "protocol:update"
  ],
  "allowedEndpoints": [
    "/api/federation/sync/*",
    "/api/federation/heartbeat"
  ],
  "capabilities": {
    "code_sync": true,
    "knowledge_sharing": true,
    "ai_bridge": true,
    "protocol_updates": true
  },
  "sideVersion": "1.0.0",
  "tags": ["production", "critical", "development"]
}
```

### 3. Response

```json
{
  "success": true,
  "message": "Node registered successfully",
  "node": {
    "id": "uuid-here",
    "nodeId": "side-node-1",
    "nodeName": "Surooh SIDE - Main Development Nucleus",
    "nodeType": "development",
    "status": "pending",
    "registeredAt": "2025-10-26T20:30:00.000Z"
  },
  "credentials": {
    "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "hmacSecret": "a3f9d8c7b6e5a4d3c2b1a0f9e8d7c6b5...",
    "codeSignature": "SUROOH-DNA-e8d7c6b5a4d3c2b1...",
    "note": "CRITICAL: Store these securely. They will not be shown again."
  },
  "traceId": "a1b2c3d4e5f6"
}
```

---

## 🌊 استخدام Federation APIs

### عرض جميع العقد المسجلة

```bash
GET /api/federation/nodes
```

#### Query Parameters (Optional)
- `status`: pending | active | syncing | offline | suspended
- `nodeType`: development | accounting | legal | design | medical

#### Response
```json
{
  "success": true,
  "nodes": [
    {
      "id": "uuid",
      "nodeId": "side-node-1",
      "nodeName": "Surooh SIDE - Main",
      "arabicName": "سِيدا - النواة الأم",
      "nodeType": "development",
      "status": "active",
      "health": 100,
      "lastHeartbeat": "2025-10-26T20:35:00.000Z",
      "lastSync": "2025-10-26T20:34:30.000Z",
      "sideVersion": "1.0.0",
      "syncProtocol": "realtime",
      "registeredAt": "2025-10-26T20:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

### تفعيل العقدة

```bash
POST /api/federation/activate
Authorization: Bearer <auth_token>
X-Node-ID: side-node-1
```

#### Response
```json
{
  "success": true,
  "message": "Node activated successfully",
  "node": {
    "nodeId": "side-node-1",
    "status": "active",
    "activatedAt": "2025-10-26T20:35:00.000Z"
  }
}
```

---

### إرسال Heartbeat

```bash
POST /api/federation/heartbeat
Authorization: Bearer <auth_token>
X-Node-ID: side-node-1
Content-Type: application/json
```

#### Request Body
```json
{
  "health": 100,
  "sideVersion": "1.0.1",
  "capabilities": {
    "code_sync": true,
    "knowledge_sharing": true,
    "ai_bridge": true
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Heartbeat received",
  "node": {
    "nodeId": "side-node-1",
    "status": "active",
    "health": 100,
    "lastHeartbeat": "2025-10-26T20:40:00.000Z"
  }
}
```

---

### مزامنة البيانات

```bash
POST /api/federation/sync
Authorization: Bearer <auth_token>
X-Node-ID: side-node-1
Content-Type: application/json
```

#### Request Body
```json
{
  "syncType": "code",
  "payload": {
    "files": [
      {
        "path": "/src/components/Button.tsx",
        "content": "...",
        "signature": "SUROOH-DNA-..."
      }
    ]
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "syncLog": {
    "id": "sync-uuid",
    "syncType": "code",
    "status": "success",
    "itemsProcessed": 1
  }
}
```

---

### عرض سجلات المزامنة

```bash
GET /api/federation/sync/logs?limit=50
Authorization: Bearer <auth_token>
X-Node-ID: side-node-1
```

#### Response
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-uuid",
      "nodeId": "side-node-1",
      "syncType": "code",
      "direction": "incoming",
      "status": "success",
      "itemsProcessed": 10,
      "itemsFailed": 0,
      "startedAt": "2025-10-26T20:30:00.000Z",
      "completedAt": "2025-10-26T20:30:05.000Z"
    }
  ],
  "total": 1
}
```

---

## 📡 WebSocket - المزامنة اللحظية

### الاتصال بـ Federation WebSocket

```
wss://nicholas.sorooh.ai/ws/federation
```

### 1. المصادقة

بعد الاتصال، أرسل رسالة مصادقة:

```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "timestamp": "2025-10-26T20:30:00.000Z"
}
```

#### Response
```json
{
  "type": "ack",
  "payload": {
    "authenticated": true,
    "nodeId": "side-node-1",
    "message": "Connected to Nicholas 3.2 Federation Hub"
  },
  "timestamp": "2025-10-26T20:30:00.000Z"
}
```

---

### 2. إرسال Heartbeat

```json
{
  "type": "heartbeat",
  "payload": {
    "health": 100
  },
  "timestamp": "2025-10-26T20:35:00.000Z"
}
```

#### Response
```json
{
  "type": "ack",
  "payload": {
    "heartbeat": "received"
  },
  "timestamp": "2025-10-26T20:35:00.000Z"
}
```

---

### 3. مزامنة البيانات

```json
{
  "type": "sync",
  "payload": {
    "syncType": "knowledge",
    "data": [
      {
        "title": "New Learning Pattern",
        "content": "..."
      }
    ]
  },
  "timestamp": "2025-10-26T20:36:00.000Z"
}
```

#### Response
```json
{
  "type": "ack",
  "payload": {
    "syncType": "knowledge",
    "status": "completed"
  },
  "timestamp": "2025-10-26T20:36:01.000Z"
}
```

---

### 4. استقبال Broadcast

عندما ترسل عقدة أخرى رسالة broadcast، ستستقبل:

```json
{
  "type": "broadcast",
  "payload": {
    "message": "New protocol update available",
    "version": "1.1.0"
  },
  "timestamp": "2025-10-26T20:37:00.000Z"
}
```

---

## 🛡️ الحوكمة والأمان

### Governance Engine Integration

كل طلب يمر عبر Governance Engine (CPE + TAG):

1. **تسجيل عقدة جديدة**: يتطلب موافقة Governance
2. **تفعيل عقدة**: يتحقق من الصلاحيات
3. **المزامنة**: يتحقق من نوع البيانات والصلاحيات
4. **Broadcast**: يتحقق من إذن البث

### أمثلة على القرارات

```javascript
// عند التسجيل
const decision = governanceEngine.submitDecision(
  'federation-system',
  'register_node',
  {
    nodeId: 'side-node-1',
    nodeType: 'development',
    organizationId: 'surooh-holding'
  }
);
// decision.status: 'approved' | 'rejected' | 'pending'
```

---

## 📊 Node Types

### أنواع العقد المدعومة

| Node Type | الوصف | الأولوية |
|-----------|-------|----------|
| `development` | سِيدا - التطوير الموحد | عالية جداً |
| `accounting` | المحاسبة والمالية | عالية |
| `legal` | القانونية والعقود | عالية |
| `procurement` | المشتريات والموردين | متوسطة |
| `design` | التصميم والإبداع | متوسطة |
| `medical` | الطبية والصحية | متوسطة |

---

## 🔄 Sync Protocols

### أنواع المزامنة

1. **realtime**: مزامنة لحظية عبر WebSocket
2. **periodic**: مزامنة دورية كل X دقائق
3. **manual**: مزامنة يدوية فقط

---

## ❌ معالجة الأخطاء

### أخطاء شائعة

#### 1. Invalid Authentication Token
```json
{
  "success": false,
  "error": "Invalid authentication token"
}
```
**الحل**: تحقق من صحة الـ token وتاريخ انتهاء صلاحيته

#### 2. Node Already Registered
```json
{
  "success": false,
  "error": "Node already registered",
  "traceId": "xyz123"
}
```
**الحل**: استخدم nodeId مختلف أو احذف العقدة القديمة

#### 3. Governance Rejected
```json
{
  "success": false,
  "error": "Registration rejected by governance engine",
  "reason": "Unauthorized node type"
}
```
**الحل**: تحقق من صلاحيات العقدة ونوعها

#### 4. WebSocket Auth Timeout
```json
{
  "type": "error",
  "payload": {
    "error": "Authentication timeout"
  }
}
```
**الحل**: أرسل رسالة مصادقة خلال 30 ثانية من الاتصال

---

## 📝 أمثلة كاملة

### مثال Node.js - تسجيل SIDE

```javascript
const axios = require('axios');
const WebSocket = require('ws');

// 1. تسجيل العقدة
async function registerNode() {
  const response = await axios.post('https://nicholas.sorooh.ai/api/federation/register', {
    nodeId: 'side-node-1',
    nodeName: 'Surooh SIDE - Main',
    arabicName: 'سِيدا - النواة الأم',
    nodeType: 'development',
    organizationId: 'surooh-holding',
    nucleusLevel: 'main',
    nodeUrl: 'https://side.sorooh.ai',
    wsUrl: 'wss://side.sorooh.ai/federation',
    permissions: ['code:sync', 'knowledge:share'],
    allowedEndpoints: ['/api/federation/sync/*'],
    capabilities: {
      code_sync: true,
      knowledge_sharing: true
    },
    sideVersion: '1.0.0',
    tags: ['production']
  });

  // احفظ الـ credentials
  const { authToken, hmacSecret, codeSignature } = response.data.credentials;
  
  // احفظها في متغيرات البيئة
  process.env.FEDERATION_AUTH_TOKEN = authToken;
  process.env.FEDERATION_HMAC_SECRET = hmacSecret;
  process.env.FEDERATION_CODE_SIGNATURE = codeSignature;

  return response.data;
}

// 2. تفعيل العقدة
async function activateNode(authToken, nodeId) {
  const response = await axios.post(
    'https://nicholas.sorooh.ai/api/federation/activate',
    {},
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Node-ID': nodeId
      }
    }
  );

  return response.data;
}

// 3. الاتصال بـ WebSocket
function connectWebSocket(authToken) {
  const ws = new WebSocket('wss://nicholas.sorooh.ai/ws/federation');

  ws.on('open', () => {
    // إرسال المصادقة
    ws.send(JSON.stringify({
      type: 'auth',
      token: authToken,
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Received:', message);

    if (message.type === 'ack' && message.payload.authenticated) {
      console.log('✅ Connected to Nicholas 3.2 Federation Hub');
      
      // إرسال heartbeat كل 30 ثانية
      setInterval(() => {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          payload: { health: 100 },
          timestamp: new Date().toISOString()
        }));
      }, 30000);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Disconnected from Nicholas 3.2');
  });

  return ws;
}

// الاستخدام
(async () => {
  // 1. تسجيل
  const registration = await registerNode();
  console.log('✅ Node registered:', registration.node.nodeId);

  // 2. تفعيل
  const activation = await activateNode(
    process.env.FEDERATION_AUTH_TOKEN,
    'side-node-1'
  );
  console.log('✅ Node activated:', activation.node.status);

  // 3. اتصال WebSocket
  const ws = connectWebSocket(process.env.FEDERATION_AUTH_TOKEN);
})();
```

---

## 🎯 الخلاصة

Nicholas 3.2 Federation System يوفر:

✅ **تسجيل آمن** للعقد الفيدرالية  
✅ **مصادقة متعددة الطبقات** (JWT + HMAC + Governance)  
✅ **مزامنة لحظية** عبر WebSocket  
✅ **Heartbeat monitoring** للعقد المتصلة  
✅ **Broadcast capabilities** لنشر المعرفة  
✅ **Governance integration** لضمان الأمان  
✅ **Audit logging** لتتبع جميع العمليات  

---

## 📞 الدعم

للدعم التقني أو الاستفسارات:
- **Email**: support@sorooh.ai
- **Documentation**: https://docs.sorooh.ai/federation

---

**© 2025 Surooh Holding Group B.V. - All Rights Reserved**
