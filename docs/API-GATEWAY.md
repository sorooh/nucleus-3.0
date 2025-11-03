# Nucleus API Gateway Documentation

## Overview

Nucleus API Gateway is a secure, professional-grade gateway for external platforms (CodeMaster, Designer Pro) to communicate with Nucleus 3.0's intelligence layer.

## Architecture

```
External Platform (CodeMaster/Designer)
         │
         ▼
  [HMAC Authentication]
         │
         ▼
  [Rate Limiting Check]
         │
         ▼
  [Endpoint Authorization]
         │
         ▼
   Nucleus UIL/APIs
```

## Authentication

### HMAC SHA-256 Signature

All requests must include the following headers:

```typescript
{
  "x-api-key": "your_platform_api_key",
  "x-platform-id": "codemaster" | "designer",
  "x-timestamp": "1234567890123", // Unix timestamp in ms
  "x-signature": "hmac_sha256_signature"
}
```

### Generating Signature

```typescript
const data = JSON.stringify(requestBody) + timestamp;
const signature = crypto
  .createHmac('sha256', HMAC_SECRET)
  .update(data)
  .digest('hex');
```

### Example Request (Node.js)

```typescript
import crypto from 'crypto';

const PLATFORM_ID = 'codemaster';
const API_KEY = process.env.CODEMASTER_API_KEY;
const HMAC_SECRET = process.env.CODEMASTER_HMAC_SECRET;
const NUCLEUS_URL = 'https://nucleus.replit.app';

async function callNucleus(endpoint: string, body: any) {
  const timestamp = Date.now().toString();
  const data = JSON.stringify(body) + timestamp;
  const signature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(data)
    .digest('hex');
  
  const response = await fetch(`${NUCLEUS_URL}/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-platform-id': PLATFORM_ID,
      'x-timestamp': timestamp,
      'x-signature': signature
    },
    body: JSON.stringify(body)
  });
  
  return await response.json();
}

// Usage
const result = await callNucleus('/gateway/code/generate', {
  prompt: 'Create a React component for a login form',
  language: 'typescript',
  context: {
    framework: 'react',
    styling: 'tailwind'
  }
});
```

## Rate Limits

### CodeMaster Platform
- **Per Minute:** 100 requests
- **Per Hour:** 1,000 requests

### Designer Pro Platform
- **Per Minute:** 80 requests
- **Per Hour:** 800 requests

### Rate Limit Headers

Every response includes rate limit information:

```json
{
  "success": true,
  "data": {...},
  "rateLimit": {
    "remaining": {
      "perMinute": 95,
      "perHour": 998
    }
  }
}
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "remaining": {
    "perMinute": 0,
    "perHour": 450
  }
}
```

## Endpoints

### Health Check

```http
GET /api/gateway/health
```

No authentication required.

**Response:**
```json
{
  "success": true,
  "service": "Nucleus API Gateway",
  "status": "operational",
  "timestamp": "2025-10-24T..."
}
```

### Platform Info

```http
GET /api/gateway/platform/info
```

Requires authentication.

**Response:**
```json
{
  "success": true,
  "platform": {
    "id": "codemaster",
    "name": "CodeMaster Platform",
    "active": true,
    "allowedEndpoints": [
      "/api/uil/*",
      "/api/gateway/code/*"
    ],
    "rateLimit": {
      "limits": {
        "requestsPerMinute": 100,
        "requestsPerHour": 1000
      },
      "remaining": {
        "perMinute": 95,
        "perHour": 998
      }
    }
  }
}
```

### Code Generation (CodeMaster only)

```http
POST /api/gateway/code/generate
```

**Request Body:**
```json
{
  "prompt": "Create a React component",
  "language": "typescript",
  "context": {
    "framework": "react",
    "styling": "tailwind"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code generation request received",
  "data": {
    "prompt": "...",
    "language": "typescript",
    "status": "processing"
  }
}
```

### Design Generation (Designer only)

```http
POST /api/gateway/design/generate
```

**Request Body:**
```json
{
  "prompt": "Create a modern dashboard UI",
  "style": "modern",
  "components": ["header", "sidebar", "main"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Design generation request received",
  "data": {
    "prompt": "...",
    "style": "modern",
    "status": "processing"
  }
}
```

### UIL Endpoints (All platforms)

All platforms have access to UIL endpoints:

```http
POST /api/uil/analyze
POST /api/uil/plan
POST /api/uil/code
POST /api/uil/summarize
POST /api/uil/chat
```

See [UIL Documentation](./UIL-INTEGRATION.md) for details.

## Error Responses

### Missing Headers

```json
{
  "success": false,
  "error": "Missing authentication headers",
  "required": [
    "x-api-key",
    "x-signature",
    "x-timestamp",
    "x-platform-id"
  ]
}
```

### Invalid Signature

```json
{
  "success": false,
  "error": "Invalid signature"
}
```

### Endpoint Not Allowed

```json
{
  "success": false,
  "error": "Endpoint not allowed for this platform",
  "endpoint": "/api/some/endpoint"
}
```

### Platform Inactive

```json
{
  "success": false,
  "error": "Platform is inactive",
  "platformId": "codemaster"
}
```

## Security Best Practices

### 1. Keep Secrets Safe

```bash
# .env file (never commit!)
CODEMASTER_API_KEY=your_api_key_here
CODEMASTER_HMAC_SECRET=your_hmac_secret_here
NUCLEUS_URL=https://nucleus.replit.app
```

### 2. Timestamp Validation

Requests older than 5 minutes are rejected to prevent replay attacks.

### 3. HTTPS Only

In production, always use HTTPS to encrypt all communication.

### 4. Rotate Keys Regularly

Rotate API keys and HMAC secrets periodically.

### 5. Monitor Rate Limits

Track your usage to avoid hitting rate limits:

```typescript
const result = await callNucleus('/some/endpoint', {...});
console.log('Remaining requests:', result.rateLimit.remaining);
```

## Platform Registration

### CodeMaster Platform

```typescript
{
  id: 'codemaster',
  name: 'CodeMaster Platform',
  allowedEndpoints: [
    '/api/uil/*',
    '/api/gateway/code/*',
    '/api/intelligence/analyze',
    '/api/memory/retrieve'
  ],
  rateLimit: {
    requestsPerMinute: 100,
    requestsPerHour: 1000
  }
}
```

### Designer Pro Platform

```typescript
{
  id: 'designer',
  name: 'Designer Pro Platform',
  allowedEndpoints: [
    '/api/uil/*',
    '/api/gateway/design/*',
    '/api/intelligence/analyze',
    '/api/memory/retrieve'
  ],
  rateLimit: {
    requestsPerMinute: 80,
    requestsPerHour: 800
  }
}
```

## Admin Endpoints

### List All Platforms

```http
GET /api/gateway/admin/platforms
```

**Note:** In production, this should be protected with admin authentication.

**Response:**
```json
{
  "success": true,
  "platforms": [
    {
      "id": "codemaster",
      "name": "CodeMaster Platform",
      "active": true,
      "createdAt": "2025-10-24T...",
      "rateLimit": {
        "requestsPerMinute": 100,
        "requestsPerHour": 1000
      }
    },
    {
      "id": "designer",
      "name": "Designer Pro Platform",
      "active": true,
      "createdAt": "2025-10-24T...",
      "rateLimit": {
        "requestsPerMinute": 80,
        "requestsPerHour": 800
      }
    }
  ]
}
```

## Testing

### Test with cURL

```bash
# Health check (no auth)
curl https://nucleus.replit.app/api/gateway/health

# Authenticated request
TIMESTAMP=$(date +%s000)
BODY='{"prompt":"test"}'
SIGNATURE=$(echo -n "${BODY}${TIMESTAMP}" | openssl dgst -sha256 -hmac "${HMAC_SECRET}" | cut -d' ' -f2)

curl -X POST https://nucleus.replit.app/api/gateway/code/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -H "x-platform-id: codemaster" \
  -H "x-timestamp: ${TIMESTAMP}" \
  -H "x-signature: ${SIGNATURE}" \
  -d "${BODY}"
```

## Next Steps

1. **CodeMaster Platform:** Use this gateway to connect CodeMaster IDE
2. **Designer Pro:** Use this gateway to connect Designer platform
3. **Custom Platforms:** Contact admin to register new platforms

## Support

For issues or questions:
- Check logs in Nucleus dashboard
- Review rate limit headers
- Verify HMAC signature generation
- Ensure timestamps are current (< 5 minutes old)
