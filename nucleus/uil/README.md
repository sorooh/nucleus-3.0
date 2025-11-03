# 🧠 Unified Intelligence Layer (UIL)

**Central Intelligence Gateway for Surooh Smart Core**  
**Version:** 3.1.1  
**Status:** ✅ Production Ready

---

## 📖 Overview

UIL (Unified Intelligence Layer) is the **single entry point** for all AI-powered features across Surooh modules. It provides:

- ✅ **Centralized Intelligence** - One API for all modules
- ✅ **Adaptive Routing** - Best AI provider selected per task
- ✅ **HMAC Security** - Authenticated requests
- ✅ **Comprehensive Logging** - Full audit trail
- ✅ **Error Resilience** - Automatic retries and fallbacks

---

## 🚀 Quick Start

### TypeScript Usage

```typescript
import { UIL_analyze } from './UIL';

const result = await UIL_analyze(
  "Analyze quarterly sales trends",
  { module: "accounting" }
);

console.log(result.output);      // AI response
console.log(result.provider);    // Provider used
console.log(result.latency_ms);  // Response time
```

### REST API Usage

```bash
curl -X POST http://localhost:5000/api/uil/analyze \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Analyze sales data","meta":{"module":"accounting"}}'
```

---

## 📁 Files

| File | Purpose |
|------|---------|
| `UIL.ts` | Core module with all functions |
| `UIL-Logger.ts` | Logging system |
| `UIL-Integration-Guide.md` | Complete integration guide |
| `UIL-RELEASE.md` | Release notes |
| `test-uil.ts` | Unit tests |
| `integration-tests.ts` | Production scenario tests |
| `README.md` | This file |

---

## 🎯 Functions

### Main Functions

```typescript
UIL_complete(request)   // General-purpose completion
UIL_analyze(prompt)     // Analysis (uses Llama)
UIL_chat(prompt)        // Conversation (uses Mistral)
UIL_summarize(prompt)   // Summarization (uses OpenAI)
UIL_plan(prompt)        // Planning (uses Claude)
UIL_code(prompt)        // Code generation (uses OpenAI)
UIL_health()            // Health check
UIL_stats()             // Statistics
```

---

## 📊 Task Types

| Type | Best For | Provider | Temperature | Tokens |
|------|----------|----------|-------------|--------|
| `analysis` | Data analysis, reports | Llama | 0.5 | 1024 |
| `conversation` | Chat, support | Mistral | 0.8 | 512 |
| `summarization` | Text summarization | OpenAI | 0.3 | 512 |
| `planning` | Strategic planning | Claude | 0.6 | 1536 |
| `coding` | Code generation | OpenAI | 0.2 | 2048 |

---

## 🔐 Security

- **HMAC SHA256** signatures on all requests
- **Trace IDs** for end-to-end tracking
- **Environment variables** for API keys
- **Rate limiting** via NGINX (20 req/min)

---

## 📈 Monitoring

### Logs Location
```
/var/log/surooh/uil/uil-access.log
/var/log/surooh/uil/uil-error.log
```

### Health Check
```bash
curl http://localhost:5000/api/uil/health
```

### Statistics
```bash
curl http://localhost:5000/api/uil/stats
```

---

## 🧪 Testing

### Unit Tests
```bash
npx tsx nucleus/uil/test-uil.ts
```

### Integration Tests (10 scenarios)
```bash
npx tsx nucleus/uil/integration-tests.ts
```

---

## 🔧 Configuration

### Required Environment Variables
```bash
BRIDGE_URL=http://127.0.0.1:7010
CHAT_HMAC_SECRET=<your_secret>
UIL_ENABLED=true
```

### Optional Variables
```bash
UIL_LOG_LEVEL=info
UIL_LOG_DIR=/var/log/surooh/uil
```

---

## 📚 Documentation

- **Integration Guide:** See `UIL-Integration-Guide.md`
- **Release Notes:** See `UIL-RELEASE.md`
- **API Reference:** See `server/uil-routes.ts`

---

## 🐛 Troubleshooting

### Bridge Connection Failed
```bash
# Start Bridge
cd ai-bridge
python3 bridge_enhanced.py --mode adaptive --port 7010 &

# Verify
curl http://127.0.0.1:7010/health
```

### Permission Denied on Logs
```bash
# Fix permissions
sudo mkdir -p /var/log/surooh/uil
sudo chown $USER:$USER /var/log/surooh/uil

# Or use local logs
export UIL_LOG_DIR=./logs
```

---

## 🎯 Integration Examples

### Accounting Module
```typescript
import { UIL_analyze } from '../nucleus/uil/UIL';

async function analyzePL(month: string) {
  return await UIL_analyze(
    `Analyze P&L for ${month}`,
    { module: "accounting", report: "P&L" }
  );
}
```

### Support Module
```typescript
import { UIL_chat } from '../nucleus/uil/UIL';

async function respondToCustomer(message: string) {
  return await UIL_chat(message, {
    module: "support",
    lang: "ar"
  });
}
```

---

## 📊 Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Avg Latency | < 3s | ~1-2s |
| Success Rate | > 95% | ~98% |
| Cache Hit | 15-30% | TBD |

---

## 🔄 Version History

- **3.1.1** (Jan 19, 2025) - Initial release
  - Core UIL module
  - REST API endpoints
  - Logging system
  - Integration tests

---

**Surooh Empire - Unified Intelligence Layer**  
**Nucleus 3.1.1**
