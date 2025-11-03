# 🚀 SCP Capabilities System - Complete Guide

## 📋 Overview

The **SCP Capabilities System** grants **Surooh Chat** full administrative access to Nucleus 2.0 Core Brain. This system enables Surooh Chat to act as a super-admin proxy that can:

- 🤖 **Build & Manage Bots** - Create, deploy, update, and delete bots across all platforms
- 🔗 **Integrate Projects** - Connect platforms, configure integrations, diagnose problems
- 🔧 **Fix Issues** - Automated problem diagnosis and resolution
- 💾 **Memory Access** - Full read/write access to Memory Hub insights
- 🧠 **AI Integration** - Execute AI thoughts, learn patterns (future enhancement)
- ⚙️ **System Control** - Monitor status, restart connectors, manage operations

---

## 🏗️ Architecture

### **System Design**

```
Surooh Chat
    ↓ (HMAC-SHA256)
[/api/scp/execute] ← SCP External API
    ↓
[executeCapability] ← Capability Router
    ↓
┌──────────────────┬──────────────┬─────────────┬──────────────┐
│   Bot Builder    │   Project    │   System    │   Memory     │
│   Commands       │   Commands   │   Control   │   Access     │
└──────────────────┴──────────────┴─────────────┴──────────────┘
         ↓                ↓              ↓             ↓
    [Memory Hub] ← Stores all command execution history
```

### **Security Model**

- **Authentication**: HMAC-SHA256 with `CHAT_HMAC_SECRET`
- **Capability-Based**: Each command routed to appropriate handler
- **Audit Logging**: IP, timestamp, command name (no sensitive data)
- **Admin Access**: `admin.full` capability grants all permissions

---

## 🔐 Authentication

### **HMAC Signature Generation**

```javascript
const crypto = require('crypto');
const body = JSON.stringify(requestBody);
const signature = crypto
  .createHmac('sha256', process.env.CHAT_HMAC_SECRET)
  .update(body)
  .digest('hex');
```

### **Request Format**

```bash
POST /api/scp/execute
Content-Type: application/json
X-Surooh-Signature: <hmac-signature>

{
  "command": "<command_name>",
  "params": { ... },
  "sessionId": "<session-id>"
}
```

---

## 🤖 Bot Builder Commands

### **1. Create Bot**

```json
{
  "command": "create_bot",
  "params": {
    "name": "Support Assistant",
    "platform": "b2b",
    "botType": "support",
    "capabilities": ["chat", "learn"]
  },
  "sessionId": "session-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Bot creation initiated",
    "config": { ... },
    "instructions": "Use the MultiBot template with provided config"
  },
  "executedBy": "Surooh Chat"
}
```

### **2. Deploy Bot**

```json
{
  "command": "deploy_bot",
  "params": {
    "botId": "bot-abc-123",
    "platform": "b2b",
    "url": "https://b2b.surooh.ai/bot/bot-abc-123"
  }
}
```

### **3. Update Bot**

```json
{
  "command": "update_bot",
  "params": {
    "botId": "bot-abc-123",
    "changes": {
      "capabilities": ["chat", "learn", "execute"]
    }
  }
}
```

### **4. Delete Bot**

```json
{
  "command": "delete_bot",
  "params": {
    "botId": "bot-abc-123"
  }
}
```

### **5. List Bots**

```json
{
  "command": "list_bots",
  "params": {}
}
```

---

## 🔗 Project Integration Commands

### **1. Connect Platform**

```json
{
  "command": "connect_platform",
  "params": {
    "platform": "b2c",
    "config": {
      "apiUrl": "https://b2c.surooh.ai",
      "endpoints": ["sync", "notify", "query"]
    }
  }
}
```

### **2. Configure Integration**

```json
{
  "command": "configure_integration",
  "params": {
    "platform": "b2b",
    "integration": "payment_gateway",
    "config": { ... }
  }
}
```

### **3. Fix Issue**

```json
{
  "command": "fix_issue",
  "params": {
    "issue": "Database connection timeout",
    "platform": "b2b",
    "solution": "Increased connection pool size to 50"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issue": "Database connection timeout",
    "solution": "Increased connection pool size to 50",
    "platform": "b2b",
    "fixedAt": "2025-10-12T01:55:00.000Z"
  },
  "executedBy": "Surooh Chat"
}
```

### **4. Diagnose Problem**

```json
{
  "command": "diagnose_problem",
  "params": {
    "description": "Users unable to login on mobile app"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "problem": "Users unable to login on mobile app",
    "analysis": "Problem analyzed through Memory Hub patterns",
    "recommendations": [
      "Check connector status",
      "Review error logs",
      "Verify integration configuration"
    ]
  }
}
```

---

## ⚙️ System Control Commands

### **1. Get System Status**

```json
{
  "command": "get_system_status",
  "params": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nucleus": "active",
    "memoryHub": "active",
    "status": "All systems operational"
  },
  "executedBy": "Surooh Chat"
}
```

### **2. Restart Connector**

```json
{
  "command": "restart_connector",
  "params": {
    "connectorId": "newsapi"
  }
}
```

---

## 💾 Memory Hub Commands

### **1. Store Insight**

```json
{
  "command": "store_insight",
  "params": {
    "pattern": "User requested dark mode feature",
    "evidence": "session-abc-123",
    "type": "feature_request",
    "sources": ["surooh-chat"],
    "confidence": 1.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "memoryId": "insight-1760234190168-4qy3ygcqi",
    "pattern": "User requested dark mode feature",
    "stored": true
  },
  "executedBy": "Surooh Chat"
}
```

### **2. Query Memory**

```json
{
  "command": "query_memory",
  "params": {
    "query": "dark mode",
    "limit": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "dark mode",
    "matches": 1,
    "results": [
      {
        "id": "insight-1760234190168-4qy3ygcqi",
        "description": "User requested dark mode feature",
        "evidence": "session-abc-123",
        "type": "feature_request",
        "sources": ["surooh-chat"],
        "confidence": 1.0,
        "timestamp": 1760234190168
      }
    ]
  },
  "executedBy": "Surooh Chat"
}
```

### **3. Search Insights**

```json
{
  "command": "search_insights",
  "params": {
    "filter": {
      "sources": ["surooh-chat"],
      "type": "feature_request"
    },
    "limit": 10
  }
}
```

### **4. Record Insight**

```json
{
  "command": "record_insight",
  "params": {
    "description": "System performance degraded during peak hours",
    "evidence": { "cpu": "95%", "memory": "88%" },
    "type": "system_alert",
    "sources": ["monitoring"],
    "confidence": 0.9
  }
}
```

### **5. Get All Insights**

```json
{
  "command": "get_all_insights",
  "params": {
    "limit": 100
  }
}
```

---

## 🧠 AI Integration Commands (Future)

### **1. Execute Thought**

```json
{
  "command": "execute_thought",
  "params": {
    "prompt": "Analyze user behavior patterns from last 30 days",
    "context": {
      "timeframe": "30d",
      "filters": ["active_users"]
    }
  }
}
```

### **2. Learn Pattern**

```json
{
  "command": "learn_pattern",
  "params": {
    "pattern": "Users prefer mobile checkout over desktop",
    "evidence": { "mobile": 75, "desktop": 25 },
    "confidence": 0.85
  }
}
```

---

## 🔧 Capability Routing

The system routes commands based on capability type:

| **Capability Prefix** | **Handler** | **Actions** |
|----------------------|-------------|-------------|
| `bot.*` | Bot Builder | create, deploy, update, delete, list |
| `project.*` | Project Integration | connect, configure, fix, diagnose |
| `system.*` | System Control | restart, get_status |
| `memory.*` | Memory Hub | store, query, search, record |
| `ai.*` | AI Integration | execute_thought, learn_pattern |
| `admin.full` | All Handlers | All commands (super admin) |

### **Admin Full Capability**

Commands with `admin.full` capability are automatically routed based on action prefix:

```javascript
// Action-based routing for admin.full
if (['create', 'deploy', 'update', 'delete', 'list'].includes(actionPrefix)) {
  → handleBotCommand()
}
if (['connect', 'configure', 'fix', 'diagnose'].includes(actionPrefix)) {
  → handleProjectCommand()
}
if (['restart', 'get'].includes(actionPrefix)) {
  → handleSystemCommand()
}
if (['search', 'record', 'store', 'query'].includes(actionPrefix)) {
  → handleMemoryCommand()
}
```

---

## 📊 Response Format

### **Success Response**

```json
{
  "success": true,
  "data": { ... },
  "executedBy": "Surooh Chat",
  "timestamp": "2025-10-12T01:55:00.000Z"
}
```

### **Error Response**

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-10-12T01:55:00.000Z"
}
```

---

## 🔍 Audit Logging

All SCP commands are logged with:

- ✅ Timestamp
- ✅ Session ID
- ✅ Command name
- ✅ IP Address
- ✅ User Agent
- ✅ Execution result (success/error)

**Security Note:** No sensitive data (signatures, request bodies, responses) are logged.

---

## 🧪 Testing

### **Example Test Script**

```bash
#!/bin/bash

# Generate HMAC signature
BODY='{"command":"get_system_status","sessionId":"test-001"}'
SIG=$(node -e "const crypto=require('crypto');const body='$BODY';console.log(crypto.createHmac('sha256',process.env.CHAT_HMAC_SECRET).update(body).digest('hex'));")

# Execute command
curl -X POST http://localhost:5000/api/scp/execute \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIG" \
  -d "$BODY"
```

### **Test Coverage**

✅ Bot Builder: create, deploy, update, delete, list  
✅ Project Integration: connect, configure, fix, diagnose  
✅ System Control: get_status, restart_connector  
✅ Memory Hub: store, query, search, record, get_all  
✅ Security: HMAC verification, null handling, error cases  

---

## 📝 Implementation Files

| **File** | **Purpose** |
|----------|-------------|
| `server/scp-external-api.ts` | External API endpoints, HMAC auth |
| `server/scp-capabilities.ts` | Capability handlers, routing logic |
| `nucleus/core/memory-hub.ts` | Memory Hub integration |

---

## 🚀 Next Steps

1. **AI Integration**: Enhance `execute_thought` and `learn_pattern` commands
2. **Structured Audit Logging**: Centralized logger for compliance
3. **Advanced Capabilities**: Add more domain-specific commands
4. **Performance Monitoring**: Track command execution metrics

---

## 🔒 Security Best Practices

1. **Never log HMAC signatures or request bodies**
2. **Always validate params before accessing nested fields**
3. **Use timing-safe comparison for signature verification**
4. **Maintain capability-based access control**
5. **Audit all command executions with metadata only**

---

## 📞 Support

For issues or questions:
- Check logs: Audit info only, no sensitive data
- Review this documentation
- Contact: Nucleus Core Team

---

**Status:** ✅ **Production Ready** (Architect Verified)  
**Version:** 1.0.0  
**Last Updated:** October 12, 2025
