# 🔐 Nucleus 2.0 API Access - Surooh Automation (Stage 1)

**Date:** October 11, 2025  
**Requested by:** Surooh Automation  
**Approved by:** Nucleus Core Team  
**Status:** ✅ APPROVED & PROVISIONED

---

## 📋 Platform Information

### **Platform Name:**
**Nucleus 2.0** - Surooh Empire Core Brain

### **Environment:**
Production

### **Base API URL:**
```
https://[your-nucleus-domain]/api
```

### **API Documentation:**
- V2 Integration Gateway: `/api/v2/*`
- MultiBot Control: `/api/agents/*`
- Knowledge Feed: `/api/knowledge/*`
- External Intelligence: `/api/connectors/*`
- Platform Integration: `/api/integration/*`

---

## 🔑 Service Account Credentials

### **Service Account:**
```
Email: automation@surooh.group
Account Type: API Service Account
```

### **Authentication Method: HMAC-SHA256 + JWT**

**Primary Authentication:** HMAC-SHA256 Signatures  
**Secondary:** JWT Bearer Tokens (when needed)

### **API Keys (256-bit):**

```bash
# Central Integration Key
CENTRAL_HMAC_SECRET=c1065e4690d83d56ac3422dbc4d6a14275e813ac59fb32f2290b78b2dac32a175

# JWT Authentication
JWT_SECRET=f3284b2e79afdc4b8d13c4c3a3821c9c95d2f71e25c2c9a97dcb04f56d1481cb

# SCP Protocol (Chat Integration)
CHAT_HMAC_SECRET=0764630b0cd8db065922b48f4214352e38b16d61389a0ee16170c7caa0d50e31
SRH_ROOT_SIGNATURE=b8a90737563cf5d176ab2d8f11f1d9002fce1e04aa6319aac6889c44b7d205aa
```

---

## ✅ Stage 1 Permissions (GRANTED)

### **Read-Only Access:**
- ✅ MultiBot Agents (status, stats, commands)
- ✅ Knowledge Feed (history, analytics)
- ✅ External Intelligence (connectors, data)
- ✅ Platform Integration (status, exchanges)
- ✅ System Health & Metrics
- ✅ Audit Logs (read-only)

### **Write Access (Non-Financial):**
- ✅ MultiBot Commands (execute, permission requests)
- ✅ Knowledge Feed (upload documents, manage sources)
- ✅ External Connectors (enable/disable, configure)
- ✅ Platform Integration (trigger sync, manage webhooks)

### **Restricted (Requires Stage 2 Approval):**
- ❌ Financial Operations
- ❌ User Management (create/delete users)
- ❌ Security Configuration
- ❌ Database Direct Access

---

## 🔐 Authentication Implementation

### **HMAC-SHA256 Signature (Primary Method)**

**Step 1: Generate Signature**
```javascript
const crypto = require('crypto');

function generateHMAC(body, secret) {
  const rawBody = JSON.stringify(body);
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
}

// Example
const payload = {
  action: "get_agents_status",
  filters: { platform: "B2B", status: "active" }
};

const signature = generateHMAC(
  payload, 
  'c1065e4690d83d56ac3422dbc4d6a14275e813ac59fb32f2290b78b2dac32a175'
);
```

**Step 2: Send Request**
```bash
curl -X POST https://[domain]/api/v2/data \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: [generated_signature]" \
  --data '{"action":"get_agents_status","filters":{"platform":"B2B"}}'
```

### **JWT Bearer (Secondary Method)**
```bash
curl https://[domain]/api/agents \
  -H "Authorization: Bearer [jwt_token]"
```

---

## 📡 Available Endpoints

### **V2 Integration Gateway** (`/api/v2/*`)
```http
POST /api/v2/data          # Send data to Nucleus
POST /api/v2/command       # Execute commands
GET  /api/v2/query         # Query system data
```
**Auth:** HMAC-SHA256 (X-Surooh-Signature header)

### **MultiBot Control** (`/api/agents/*`)
```http
GET  /api/agents           # List all agents
GET  /api/agents/stats     # Agent statistics
POST /api/agents/command   # Send command to agent
POST /api/agents/permissions/:id  # Request permissions
```
**Auth:** HMAC-SHA256 (platform-specific secrets)

### **Knowledge Feed** (`/api/knowledge/*`)
```http
POST /api/knowledge/upload     # Upload document
GET  /api/knowledge/history    # Knowledge history
GET  /api/knowledge/analytics  # Analytics data
```
**Auth:** JWT Bearer (requires session)

### **External Intelligence** (`/api/connectors/*`)
```http
GET  /api/connectors/status    # Connector status
POST /api/connectors/trigger   # Manual trigger
GET  /api/connectors/data      # Fetch collected data
```
**Auth:** JWT Bearer

### **Platform Integration** (`/api/integration/*`)
```http
GET  /api/integration/status      # Integration status
GET  /api/integration/platforms   # List platforms
POST /api/integration/sync/:platform  # Trigger sync
GET  /api/integration/exchanges   # Data exchanges
```
**Auth:** HMAC-SHA256

---

## 🔔 Webhooks Configuration

### **Supported Events:**
```javascript
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
"platform.error_occurred"

// Connector Events
"connector.data_fetched"
"connector.error"
```

### **Webhook Registration:**
```bash
POST /api/integration/webhooks
{
  "url": "https://automation.surooh.group/webhooks/nucleus",
  "events": ["agent.*", "knowledge.*", "platform.sync_completed"],
  "secret": "[your_webhook_secret]"
}
```

---

## 🛡️ Security Controls

### **Enforced:**
- ✅ HMAC-SHA256 signature verification on all requests
- ✅ JWT token expiration (24 hours)
- ✅ Rate limiting: 1000 req/hour per service account
- ✅ IP allowlist (configure after provisioning)
- ✅ Audit logs for all API actions
- ✅ Automatic token rotation every 60-90 days

### **IP Allowlist Configuration:**
```bash
POST /api/security/ip-allowlist
{
  "service_account": "automation@surooh.group",
  "ips": [
    "your.automation.ip.1",
    "your.automation.ip.2"
  ]
}
```

### **Key Rotation Schedule:**
- 🔄 Every 60 days: Automatic notification
- 🔄 Every 90 days: Enforced rotation
- 📧 Notification email: automation@surooh.group

---

## 📊 Rate Limits & Quotas

| Endpoint | Rate Limit | Quota |
|----------|-----------|-------|
| `/api/v2/*` | 100 req/min | Unlimited |
| `/api/agents/*` | 200 req/min | Unlimited |
| `/api/knowledge/*` | 50 req/min | 1GB/day upload |
| `/api/connectors/*` | 30 req/min | - |
| `/api/integration/*` | 60 req/min | - |

**Burst allowance:** 2x rate limit for 10 seconds

---

## 🧪 Testing & Sandbox

### **Test Endpoint (No Auth Required):**
```bash
curl https://[domain]/api/health
```

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "message": "Nucleus 2.0 - Central Brain Operational",
  "timestamp": 1728662400000
}
```

### **Signature Verification Test:**
```bash
# Generate test signature
BODY='{"test":"hello"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "c1065e4690d83d56ac3422dbc4d6a14275e813ac59fb32f2290b78b2dac32a175" -hex | sed 's/^.* //')

# Test request
curl -X POST https://[domain]/api/v2/data \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIG" \
  --data "$BODY"
```

---

## 📞 Support & Contact

### **Technical Support:**
- Email: nucleus-support@surooh.group
- Emergency: [contact details]

### **API Status Page:**
- https://status.surooh.group

### **Documentation:**
- Full API Docs: https://docs.surooh.group/nucleus-api
- Integration Guide: https://docs.surooh.group/integration
- Security Best Practices: https://docs.surooh.group/security

---

## ✅ Next Steps for Surooh Automation

### **1. Configure API Client (5 minutes)**
```bash
# .env configuration
NUCLEUS_API_URL=https://[domain]
CENTRAL_HMAC_SECRET=c1065e4690d83d56ac3422dbc4d6a14275e813ac59fb32f2290b78b2dac32a175
JWT_SECRET=f3284b2e79afdc4b8d13c4c3a3821c9c95d2f71e25c2c9a97dcb04f56d1481cb
SERVICE_ACCOUNT=automation@surooh.group
```

### **2. Test Connection (10 minutes)**
- Test health endpoint
- Verify HMAC signature
- Fetch agent status
- Test webhook delivery

### **3. Enable Audit Logs (2 minutes)**
```bash
POST /api/security/audit-logs/enable
{
  "service_account": "automation@surooh.group",
  "log_level": "detailed"
}
```

### **4. Configure IP Allowlist (5 minutes)**
Provide your automation server IPs for allowlist configuration

### **5. Production Readiness Report (30 minutes)**
- Connection verified ✅
- Authentication tested ✅
- Rate limits confirmed ✅
- Webhooks configured ✅
- Audit logs enabled ✅

**Total Setup Time: ~1-2 hours**

---

## 📋 Compliance & Audit

### **Audit Trail:**
All actions by `automation@surooh.group` are logged with:
- Timestamp
- Endpoint accessed
- Request payload (sanitized)
- Response status
- IP address
- Signature verification result

### **Access Review:**
- Monthly: Automated access review report
- Quarterly: Manual compliance check
- Annually: Full security audit

---

## 🚀 Provisioning Status

✅ **Service Account Created:** automation@surooh.group  
✅ **API Keys Generated:** 4 keys (256-bit each)  
✅ **Permissions Granted:** Stage 1 (Read-all + Non-financial write)  
✅ **Rate Limits Configured:** Standard tier  
✅ **Audit Logs Enabled:** Detailed level  
✅ **Webhooks Ready:** Configuration endpoint available  

**Status:** READY FOR INTEGRATION

---

**Contact for Stage 2 approval (financial operations) or questions:**  
📧 nucleus-admin@surooh.group

---

*Provisioned by: Nucleus 2.0 Core Team*  
*Date: October 11, 2025*  
*Valid until: Key rotation (60-90 days)*
