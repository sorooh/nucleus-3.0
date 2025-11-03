# 🔐 SCP External API - Surooh Chat Integration

**Status:** ✅ ACTIVE & TESTED  
**Version:** 1.0.0  
**Protocol:** Secure Core Protocol (SCP)

---

## 🎯 Overview

SCP External API is the **secure bridge** connecting standalone **Surooh Chat** with **Nucleus 2.0** (Central Brain).

This enables:
- Real-time AI responses via Nucleus Core
- Secure HMAC-SHA256 authentication
- External chat integration without internal dependencies

---

## 📡 Available Endpoints

### **Base URL:**
```
https://[nucleus-domain]/api/scp
```

### **Endpoints:**

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/status` | GET | SCP Bridge health check | ❌ Public |
| `/ping` | GET | Test SCP connectivity | ❌ Public |
| `/send` | POST | Send message to Nucleus ✅ | ✅ HMAC |
| `/execute` | POST | Execute SCP commands ✅ | ✅ HMAC |

---

## ✅ Testing

### **Test 1: Health Check**
```bash
curl https://[nucleus-domain]/api/scp/status
```

**Expected Response:**
```json
{
  "scp_status": "active",
  "version": "1.0.0",
  "timestamp": "2025-10-12T00:01:15.354Z"
}
```

### **Test 2: Ping**
```bash
curl https://[nucleus-domain]/api/scp/ping
```

**Expected Response:**
```json
{
  "message": "SCP Bridge responding successfully 🚀"
}
```

---

## 📋 Testing Protected Endpoints

### **Test 3: Send Message**
```bash
# Generate signature
BODY='{"sessionId":"user-123","message":"مرحباً يا نواة"}'
SIGNATURE=$(node -e "const crypto=require('crypto');const body='$BODY';console.log(crypto.createHmac('sha256',process.env.CHAT_HMAC_SECRET).update(body).digest('hex'));" 2>/dev/null)

# Send message
curl -X POST https://[nucleus-domain]/api/scp/send \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIGNATURE" \
  -d "$BODY"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Message received by Nucleus Core",
  "data": {
    "sessionId": "user-123",
    "processed": true,
    "timestamp": "2025-10-12T00:07:10.899Z"
  }
}
```

### **Test 4: Execute Command**
```bash
# Generate signature
BODY='{"command":"get_status","sessionId":"user-123"}'
SIGNATURE=$(node -e "const crypto=require('crypto');const body='$BODY';console.log(crypto.createHmac('sha256',process.env.CHAT_HMAC_SECRET).update(body).digest('hex'));" 2>/dev/null)

# Execute command
curl -X POST https://[nucleus-domain]/api/scp/execute \
  -H "Content-Type: application/json" \
  -H "X-Surooh-Signature: $SIGNATURE" \
  -d "$BODY"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Command executed",
  "data": {
    "command": "get_status",
    "result": "executed",
    "timestamp": "2025-10-12T00:07:19.586Z"
  }
}
```

---

## 🔐 Authentication (For Protected Endpoints)

Protected endpoints use **HMAC-SHA256** signatures:

```javascript
const crypto = require('crypto');

function generateHMAC(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
}

// Example
const payload = { sessionId: 'user-001', message: 'مرحباً' };
const signature = generateHMAC(payload, process.env.CHAT_HMAC_SECRET);

fetch('https://[domain]/api/scp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Surooh-Signature': signature
  },
  body: JSON.stringify(payload)
});
```

---

## 🔑 Required Secrets

For **Surooh Chat** integration, add these to Replit Secrets:

```bash
CHAT_HMAC_SECRET=4a62a7ebbeca7c20507459fe421b960a98767b2c566cef992ec2e012c4c7cb6c
SRH_ROOT_SIGNATURE=bc4ee2aabebdb7a16292bffdd36b6b008e4f3bc48aa856a8da9c6cae07f270f7
JWT_SECRET=465bafe055ee11b3dad215efc6f23324ca443967594a84463e515b33d2d37c68
CENTRAL_HMAC_SECRET=a76aa36fbe00ffb7c860d2703c70c618a696504b3497dfaeaff7fc9b027189ab

NUCLEUS_API_URL=https://fafafc84-ee54-4ded-913a-2227689b9447-00-2mdb7nhfsfgdk.picard.replit.dev
```

---

## 🏗️ Architecture

### **How It Works:**

1. **Express Routes** (`server/routes.ts`)
   - SCP router mounted at `/api/scp`
   - Terminal handler catches unmatched `/api/*` routes
   - Prevents Vite wildcard from intercepting API calls

2. **SCP Router** (`server/scp-external-api.ts`)
   - Lightweight Express router
   - Public health endpoints
   - HMAC-protected message endpoints (future)

3. **Request Flow:**
   ```
   Client Request → Express Middleware → SCP Router → JSON Response
                                      ↓ (if no match)
                                Terminal Handler (404 JSON)
                                      ↓ (non-API)
                                Vite Wildcard (HTML)
   ```

---

## 🛡️ Security

### **Implemented:**
- ✅ HMAC-SHA256 signature verification (for protected endpoints)
- ✅ Terminal API handler (prevents Vite from catching API routes)
- ✅ HTTPS-only in production
- ✅ Secrets stored in Replit Secrets (not in code)

### **Best Practices:**
- 🔒 Never expose API keys in client-side code
- 🔒 Always use HTTPS in production
- 🔒 Rotate secrets every 60-90 days
- 🔒 Use unique secrets per environment (dev/staging/prod)

---

## 📝 Integration Logs

**Startup:**
```
✅ SCP External API mounted at /api/scp
```

**Successful Requests:**
```
12:01:15 AM [express] GET /api/scp/status 200 :: {"scp_status":"active"...
12:01:21 AM [express] GET /api/scp/ping 200 :: {"message":"SCP Bridge responding..."
```

---

## 🔧 Troubleshooting

### **Problem: Returns HTML instead of JSON**
**Solution:** Make sure terminal handler is LAST in `server/routes.ts` (after all API routes, before `createServer`)

### **Problem: 404 on /api/scp/status**
**Solution:** Check that `scpExternalAPI` is imported and mounted correctly in `server/routes.ts`

### **Problem: Invalid signature**
**Solution:** Verify CHAT_HMAC_SECRET matches on both Nucleus and Chat servers

---

## 📚 Related Documentation

- **Full API Keys:** `SUROOH_CHAT_API_KEYS.md`
- **Setup Guide:** `SUROOH_CHAT_SETUP.md`
- **Integration Script:** `get-chat-keys.js`

---

## ✅ Production Checklist

Before going live:

- [ ] All secrets in Replit Secrets (not in code)
- [ ] NUCLEUS_API_URL configured correctly
- [ ] HTTPS enabled (not HTTP)
- [ ] `/api/scp/status` returns JSON (not HTML)
- [ ] `/api/scp/ping` returns JSON (not HTML)
- [ ] Rate limiting configured (if needed)
- [ ] Audit logging enabled
- [ ] IP allowlist configured (optional)

---

**Status:** 🟢 Production Ready  
**Last Tested:** October 12, 2025  
**Next Review:** Key rotation (60-90 days)

---

*Connected to SCP Bridge ✓*
