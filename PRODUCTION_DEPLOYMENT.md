# Nicholas 3.2 - Production Deployment Guide
**Supreme Sovereign Reference - Surooh Empire**

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Security Configuration](#security-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Health Monitoring](#health-monitoring)
7. [Rollback Plan](#rollback-plan)

---

## 🔧 Prerequisites

### System Requirements
- **Node.js**: v18+ or v20+
- **PostgreSQL**: v14+ (Neon recommended)
- **Redis**: Upstash Redis for rate limiting & caching
- **Vector Database**: Upstash Vector for embeddings
- **Python**: v3.11+ for Core Dispatcher
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 10GB disk space

### Required Accounts & Services
1. **Neon Database** - PostgreSQL hosting
   - Sign up: https://neon.tech
   - Create production database
   - Note connection string

2. **Upstash** - Redis & Vector
   - Sign up: https://upstash.com
   - Create Redis database
   - Create Vector index (dimension: 1536 for OpenAI embeddings)

3. **AI Providers** - API Keys needed:
   - OpenAI (GPT-4o, text-embedding-3-small)
   - Anthropic (Claude 3.5 Sonnet)
   - SiliconFlow (Hunyuan-A13B)
   - Groq (Llama 3.3 70B)
   - Mistral AI (Mistral Large)
   - HuggingFace (Falcon 7B)

---

## 🔐 Environment Setup

### 1. Create Production `.env` File

```bash
# === Core Configuration ===
NODE_ENV=production
PORT=5000

# === Database (PostgreSQL - Neon) ===
DATABASE_URL=postgresql://user:password@host.neon.tech/nicholas_prod?sslmode=require
PGHOST=host.neon.tech
PGPORT=5432
PGUSER=your_user
PGPASSWORD=your_password
PGDATABASE=nicholas_prod

# === Redis (Upstash) ===
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# === Vector Database (Upstash) ===
UPSTASH_VECTOR_REST_URL=https://your-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your_vector_token

# === Security Secrets ===
JWT_SECRET=<generate-strong-random-secret-64-chars>
SESSION_SECRET=<generate-strong-random-secret-64-chars>

# Federation Gateway HMAC Secrets (auto-generated per node)
CENTRAL_HMAC_SECRET=<generated-by-system>
CHAT_HMAC_SECRET=<generated-by-system>
CUSTOMER_HMAC_SECRET=<generated-by-system>
SRH_HMAC_SECRET=<generated-by-system>

# === AI Provider API Keys ===
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SILICONFLOW_API_KEY=sk-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
HF_TOKEN=hf_...

# === Nicholas-Specific Secrets ===
NUCLEUS_JWT_SECRET=<generate-strong-random-secret-64-chars>
SRH_ROOT_SIGNATURE=<generate-strong-signature>

# === Optional - For specific platforms ===
NEWSAPI_KEY=<if-using-news-features>
```

### 2. Generate Strong Secrets

```bash
# Generate 64-character random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Run multiple times for different secrets:
# - JWT_SECRET
# - SESSION_SECRET  
# - NUCLEUS_JWT_SECRET
```

---

## 🗄️ Database Migration

### 1. Backup Current Data (if migrating)
```bash
# Export existing data
pg_dump $SOURCE_DATABASE_URL > nicholas_backup_$(date +%Y%m%d).sql

# Optional: Export to JSON
npm run export-data
```

### 2. Create Production Database Schema
```bash
# Push schema to production database
npm run db:push --force

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

### 3. Verify Critical Tables
Ensure these federation tables exist:
```sql
-- Check federation tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'federation_%';

-- Expected tables:
-- federation_nodes
-- federation_sync_logs
-- federation_auth_tokens
-- federation_secret_vault
-- federation_audit_log
```

---

## 🛡️ Security Configuration

### 1. Federation Security Setup

**Triple-Layer Security enabled:**
- ✅ JWT Authentication (nodeId-based claims, 1-year expiry)
- ✅ HMAC-SHA256 (payload integrity with timestamp validation)
- ⏸️ RSA-SHA256 Code Signing (optional - requires SIDE implementation)

**Security Headers Required:**
```typescript
{
  "Authorization": "Bearer <JWT>",
  "X-Surooh-KeyId": "<credential-id>",
  "X-Surooh-Timestamp": "<unix-timestamp>",
  "X-Surooh-Signature": "<HMAC-SHA256>",
  "X-Surooh-CodeSig": "<RSA-SHA256>" // optional
}
```

### 2. Rate Limiting Configuration

Located in `server/unified-gateway/redis-rate-limiter.ts`:

```typescript
// Production recommended limits
const RATE_LIMITS = {
  // Tier 1: Public endpoints
  public: {
    windowMs: 60000,        // 1 minute
    maxRequests: 100        // 100 requests per minute
  },
  
  // Tier 2: Authenticated endpoints
  authenticated: {
    windowMs: 60000,
    maxRequests: 500        // 500 requests per minute
  },
  
  // Tier 3: Critical operations
  critical: {
    windowMs: 60000,
    maxRequests: 50         // 50 requests per minute
  }
};
```

### 3. CORS Configuration

Update `server/index.ts`:
```typescript
app.use(cors({
  origin: [
    'https://nicholas.surooh.ai',
    'https://side.surooh.ai',
    'https://codemaster.surooh.ai',
    'https://designer.surooh.ai'
    // Add other trusted Surooh domains
  ],
  credentials: true
}));
```

---

## 🚀 Deployment Steps

### Option A: Replit Deployment (Recommended)

1. **Configure Replit Secrets**
   - Go to Tools → Secrets
   - Add all environment variables from `.env`
   - Never commit secrets to code

2. **Configure Autoscale Settings**
   - Go to Settings → Resources
   - Enable Autoscale
   - Set min instances: 1
   - Set max instances: 5 (adjust based on load)

3. **Deploy**
   ```bash
   # Replit auto-deploys on push to main branch
   git add .
   git commit -m "Production deployment - Nicholas 3.2"
   git push origin main
   ```

4. **Verify Deployment**
   - Check deployment logs
   - Test health endpoint: `https://your-app.replit.app/health`

### Option B: VPS/Cloud Deployment

#### Using PM2 (Recommended for VPS)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Create PM2 Ecosystem File** (`ecosystem.config.js`)
   ```javascript
   module.exports = {
     apps: [{
       name: 'nicholas-3.2',
       script: 'npm',
       args: 'run dev',
       instances: 2,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       }
     }]
   };
   ```

3. **Start Application**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

#### Using Docker

1. **Create `Dockerfile`**
   ```dockerfile
   FROM node:20-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 5000
   
   CMD ["npm", "start"]
   ```

2. **Build and Run**
   ```bash
   docker build -t nicholas-3.2 .
   docker run -d -p 5000:5000 --env-file .env nicholas-3.2
   ```

---

## 📊 Health Monitoring

### 1. Health Check Endpoint

Test system health:
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T21:45:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "vector": "connected"
  }
}
```

### 2. Federation Audit Monitoring

Monitor security events:
```sql
-- Check recent authentication failures
SELECT 
  event_type,
  failure_reason,
  COUNT(*) as count
FROM federation_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND success = true
  AND failure_reason IS NOT NULL
GROUP BY event_type, failure_reason
ORDER BY count DESC;

-- Check suspicious activity
SELECT 
  ip_address,
  COUNT(*) as failed_attempts
FROM federation_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND success = true
  AND failure_reason IS NOT NULL
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY failed_attempts DESC;
```

### 3. Performance Monitoring

Key metrics to track:
- **Response Time**: Average < 500ms
- **Throughput**: > 30 req/s under normal load
- **Error Rate**: < 1%
- **CPU Usage**: < 70%
- **Memory Usage**: < 80%

---

## 🔄 Rollback Plan

### Quick Rollback Steps

1. **Stop Current Deployment**
   ```bash
   # PM2
   pm2 stop nicholas-3.2
   
   # Docker
   docker stop <container-id>
   ```

2. **Restore Database**
   ```bash
   # Restore from backup
   psql $DATABASE_URL < nicholas_backup_YYYYMMDD.sql
   ```

3. **Deploy Previous Version**
   ```bash
   git checkout <previous-commit-hash>
   npm install
   npm run db:push
   pm2 restart nicholas-3.2
   ```

4. **Verify Rollback**
   ```bash
   curl https://your-domain.com/health
   ```

---

## 📝 Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database schema migrated successfully
- [ ] Federation security tested (JWT + HMAC)
- [ ] Rate limiting verified
- [ ] Health endpoint responding
- [ ] CORS configured correctly
- [ ] Audit logging working
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place
- [ ] Rollback plan tested

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: Database connection fails
```bash
# Solution: Check connection string
psql $DATABASE_URL -c "SELECT 1"
```

**Issue**: Redis connection fails
```bash
# Solution: Test Redis connection
curl $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

**Issue**: High error rate in federation
```bash
# Solution: Check audit logs for patterns
tail -f /tmp/logs/Start_application_*.log | grep "Federation"
```

---

## 📞 Support

For production issues:
1. Check audit logs: `SELECT * FROM federation_audit_log ORDER BY created_at DESC LIMIT 100`
2. Check system health: `/health` endpoint
3. Review error logs: Application logs + Database logs
4. Contact Surooh DevOps team

---

**Deployment completed successfully!** 🎉

Nicholas 3.2 is now the Supreme Sovereign Reference for the Surooh Empire.
