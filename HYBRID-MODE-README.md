# 🚀 Hybrid Production Mode - Surooh Nucleus

## Overview

**Hybrid Production Mode** combines the reliability of real AI providers with intelligent fallback mechanisms, creating a production-ready system that:

- ✅ Uses **real AI Provider Bridge** for optimal performance
- ✅ Falls back to **Mock Mode** if providers fail
- ✅ Provides **self-healing** capabilities
- ✅ Ensures **zero downtime** for critical operations
- ✅ Logs everything for **full audit trail**

---

## 🎯 Quick Start

### Start Hybrid Mode

```bash
./hybrid-start.sh
```

This will:
1. ✅ Run pre-flight checks
2. ✅ Configure environment
3. ✅ Start AI Provider Bridge (port 7010)
4. ✅ Verify connectivity
5. ✅ Configure security (HMAC)
6. ✅ Initialize monitoring
7. ✅ Start Nucleus application (port 5000)

### Check Status

```bash
./hybrid-status.sh
```

### Stop All Services

```bash
./hybrid-stop.sh
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Surooh Nucleus                       │
│                     (Port 5000)                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ REST API /api/uil/*
                  │
┌─────────────────▼───────────────────────────────────────┐
│          Unified Intelligence Layer (UIL)               │
│              HMAC Authentication                        │
│              Trace ID Tracking                          │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               │ Primary                  │ Fallback
               ▼                          ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│   AI Provider Bridge     │   │     Mock Engine         │
│      (Port 7010)         │   │   (UIL-Mock.ts)         │
│                          │   │                         │
│  • OpenAI   (GPT-4o)    │   │  • Simulated Responses  │
│  • Llama    (Groq)      │   │  • 500-2000ms Latency   │
│  • Mistral  (API)       │   │  • Arabic/English       │
│  • Claude   (Anthropic) │   │  • Task-specific        │
└──────────────────────────┘   └─────────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
BRIDGE_URL=http://127.0.0.1:7010
CHAT_HMAC_SECRET=<64-char-secret>

# Hybrid Mode
UIL_HYBRID_MODE=true
UIL_ENABLED=true
NODE_ENV=production

# Logging
UIL_LOG_DIR=./logs/uil
UIL_LOG_LEVEL=info

# AI Provider API Keys
OPENAI_API_KEY=your-openai-api-key-here
GROQ_API_KEY=your-groq-api-key-here
MISTRAL_API_KEY=your-mistral-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### Generate HMAC Secret

```bash
openssl rand -hex 64
```

---

## 📈 Monitoring

### Health Checks

```bash
# Bridge Health
curl http://127.0.0.1:7010/health

# UIL Health
curl http://localhost:5000/api/uil/health

# Full Status
./hybrid-status.sh
```

### Logs

```bash
# Bridge Logs
tail -f ./logs/bridge.log

# UIL Access Logs
tail -f ./logs/uil/uil-access.log

# UIL Error Logs
tail -f ./logs/uil/uil-error.log

# Monitoring Summary
cat ./logs/monitoring.txt
```

### Performance Metrics

```bash
# View statistics
curl http://localhost:5000/api/uil/stats

# Prometheus metrics (if enabled)
curl http://127.0.0.1:7011/metrics
```

---

## 🧪 Testing

### Quick API Test

```bash
# Chat Test
curl -X POST http://localhost:5000/api/uil/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"مرحباً! كيف حالك؟","meta":{"module":"test"}}'

# Analysis Test
curl -X POST http://localhost:5000/api/uil/analyze \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Analyze Q3 2025 sales data","meta":{"module":"accounting"}}'
```

### Integration Tests

```bash
# Run all 10 scenarios
npx tsx nucleus/uil/integration-tests.ts
```

Expected output:
```
✅ Passed: 10/10
📊 Avg Response Time: 1200-1800ms
📡 Providers: OpenAI (5), Llama (3), Mistral (2)
```

---

## 🔐 Security Features

### HMAC Authentication
Every request between UIL and Bridge is signed with HMAC SHA256:

```typescript
signature = HMAC-SHA256(requestBody, CHAT_HMAC_SECRET)
```

### Trace ID Tracking
Every request gets a unique UUID for end-to-end tracking:

```typescript
X-Trace-Id: 550e8400-e29b-41d4-a716-446655440000
```

### Rate Limiting
NGINX configuration (if enabled):
- **20 requests/minute** per module
- **Burst**: 5 requests
- **429 Too Many Requests** on limit

---

## 🚨 Troubleshooting

### Bridge Won't Start

```bash
# Check if port is in use
lsof -ti:7010

# Kill existing process
pkill -f bridge_enhanced.py

# Check Python dependencies
pip install fastapi uvicorn pyyaml loguru requests tabulate

# Restart
./hybrid-start.sh
```

### UIL Not Connecting to Bridge

```bash
# Verify Bridge is running
curl http://127.0.0.1:7010/health

# Check HMAC secret
echo $CHAT_HMAC_SECRET

# Check logs
tail -f ./logs/uil/uil-error.log
```

### High Error Rate

```bash
# Check error logs
grep "error" ./logs/uil/uil-error.log | tail -20

# Check provider status
curl http://127.0.0.1:7010/health | jq '.providers'

# Verify API keys
echo $OPENAI_API_KEY | cut -c1-10
```

---

## 📊 Performance Benchmarks

| Metric | Target | Typical | Excellent |
|--------|--------|---------|-----------|
| Avg Latency | < 3s | 1.2-1.8s | < 1s |
| Success Rate | > 95% | 98-99% | 99.9% |
| Bridge Uptime | > 99% | 99.5% | 99.9% |
| Fallback Rate | < 5% | 2-3% | < 1% |

---

## 🔄 Deployment Modes

### Development
```bash
export NODE_ENV=development
export UIL_MOCK_MODE=true
npm run dev
```

### Hybrid (Recommended)
```bash
./hybrid-start.sh
```

### Production
```bash
export NODE_ENV=production
export UIL_HYBRID_MODE=false
# Ensure Bridge is always running
./hybrid-start.sh
```

---

## 📁 File Structure

```
.
├── hybrid-start.sh              # Start hybrid mode
├── hybrid-stop.sh               # Stop all services
├── hybrid-status.sh             # Check status
├── HYBRID-MODE-README.md        # This file
├── nucleus/uil/
│   ├── UIL.ts                   # Core UIL module
│   ├── UIL-Mock.ts              # Mock engine
│   ├── UIL-Logger.ts            # Logging system
│   ├── integration-tests.ts     # 10 test scenarios
│   └── test-uil.ts              # Unit tests
├── server/
│   └── uil-routes.ts            # REST API endpoints
├── ai-bridge/
│   ├── bridge_enhanced.py       # Enhanced bridge
│   └── bridge_metrics.py        # Prometheus metrics
└── logs/
    ├── bridge.log               # Bridge logs
    ├── monitoring.txt           # Monitoring summary
    └── uil/
        ├── uil-access.log       # Access logs
        └── uil-error.log        # Error logs
```

---

## 🎯 Best Practices

### 1. Always Use Hybrid Mode in Production
```bash
export UIL_HYBRID_MODE=true
```

### 2. Monitor Logs Regularly
```bash
# Set up log rotation
./hybrid-status.sh | tee -a ./logs/daily-status.log
```

### 3. Secure Your Secrets
```bash
# Use .env file (never commit)
echo "CHAT_HMAC_SECRET=$(openssl rand -hex 64)" >> .env
```

### 4. Test Before Deploying
```bash
# Always run integration tests
npx tsx nucleus/uil/integration-tests.ts
```

### 5. Monitor Performance
```bash
# Check stats regularly
curl http://localhost:5000/api/uil/stats
```

---

## 🏁 Success Criteria

Your system is production-ready when:

- ✅ `./hybrid-status.sh` shows all services operational
- ✅ Integration tests pass 10/10
- ✅ Average latency < 2 seconds
- ✅ Error rate < 1%
- ✅ HMAC secret is 64+ characters
- ✅ All API keys configured
- ✅ Logs are being written
- ✅ Bridge responds within 3 seconds

---

**Surooh Empire - Hybrid Production Mode**  
**Nucleus 3.1.1 - Enterprise Ready** 🚀
