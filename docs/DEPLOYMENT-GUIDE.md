# Nucleus 3.0 - Deployment Guide

This guide covers all deployment options for Nucleus 3.0 in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Environment Variables](#environment-variables)
5. [Health Checks](#health-checks)
6. [Monitoring & Metrics](#monitoring--metrics)
7. [Scaling](#scaling)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **PostgreSQL Database** (Neon or any PostgreSQL 14+)
- **Redis** (Upstash or self-hosted Redis 7+)
- **At least 1 AI Provider API key** (OpenAI, Claude, Groq, etc.)

### Optional Services

- **Vector Database** (Upstash Vector for embeddings)
- **Kubernetes Cluster** (for K8s deployment)
- **Docker** (for containerized deployment)

---

## Docker Deployment

### 1. Build the Image

```bash
docker build -t nucleus:3.0.0 .
```

### 2. Create Environment File

Create `.env.production`:

```env
NODE_ENV=production
PORT=5000

# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# AI Providers (At least one required)
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GROQ_API_KEY=your-groq-api-key-here
SILICONFLOW_API_KEY=your-siliconflow-api-key-here
MISTRAL_API_KEY=your-mistral-api-key-here
HF_TOKEN=your-huggingface-token-here

# Redis (Required)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Vector DB (Optional)
UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...

# Security (Required)
JWT_SECRET=your-secret-min-32-characters
SESSION_SECRET=your-session-secret-min-32-characters
```

### 3. Run with Docker

```bash
docker run -d \
  --name nucleus-core \
  -p 5000:5000 \
  --env-file .env.production \
  --restart unless-stopped \
  nucleus:3.0.0
```

### 4. Using Docker Compose

```bash
docker-compose up -d
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace nucleus
```

### 2. Create Secrets

```bash
kubectl create secret generic nucleus-secrets \
  --namespace=nucleus \
  --from-literal=database-url="${DATABASE_URL}" \
  --from-literal=openai-api-key="${OPENAI_API_KEY}" \
  --from-literal=anthropic-api-key="${ANTHROPIC_API_KEY}" \
  --from-literal=groq-api-key="${GROQ_API_KEY}" \
  --from-literal=siliconflow-api-key="${SILICONFLOW_API_KEY}" \
  --from-literal=mistral-api-key="${MISTRAL_API_KEY}" \
  --from-literal=hf-token="${HF_TOKEN}" \
  --from-literal=upstash-redis-url="${UPSTASH_REDIS_REST_URL}" \
  --from-literal=upstash-redis-token="${UPSTASH_REDIS_REST_TOKEN}" \
  --from-literal=upstash-vector-url="${UPSTASH_VECTOR_REST_URL}" \
  --from-literal=upstash-vector-token="${UPSTASH_VECTOR_REST_TOKEN}" \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=session-secret="${SESSION_SECRET}"
```

### 3. Deploy Application

```bash
# Apply all manifests
kubectl apply -f k8s/ --namespace=nucleus

# Or apply individually
kubectl apply -f k8s/deployment.yaml --namespace=nucleus
kubectl apply -f k8s/service.yaml --namespace=nucleus
kubectl apply -f k8s/ingress.yaml --namespace=nucleus
kubectl apply -f k8s/hpa.yaml --namespace=nucleus
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n nucleus

# Check services
kubectl get svc -n nucleus

# Check ingress
kubectl get ingress -n nucleus

# View logs
kubectl logs -f deployment/nucleus-core -n nucleus
```

### 5. Update Deployment

```bash
# Build new image
docker build -t nucleus:3.0.1 .

# Push to registry
docker push nucleus:3.0.1

# Update deployment
kubectl set image deployment/nucleus-core nucleus=nucleus:3.0.1 -n nucleus

# Check rollout status
kubectl rollout status deployment/nucleus-core -n nucleus
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | HTTP port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `UPSTASH_REDIS_REST_URL` | Redis REST URL | `https://...` |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST token | `...` |
| `JWT_SECRET` | JWT signing secret | `min-32-chars` |
| `SESSION_SECRET` | Session encryption secret | `min-32-chars` |

### AI Provider Variables (At least one required)

| Variable | Provider | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | OpenAI | GPT-4o, GPT-4o-mini |
| `ANTHROPIC_API_KEY` | Anthropic | Claude 3.5 Sonnet |
| `GROQ_API_KEY` | Groq | Llama 3.3 70B |
| `SILICONFLOW_API_KEY` | SiliconFlow | Hunyuan-A13B |
| `MISTRAL_API_KEY` | Mistral | Mistral Large |
| `HF_TOKEN` | HuggingFace | Falcon 7B |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `UPSTASH_VECTOR_REST_URL` | Vector DB URL | - |
| `UPSTASH_VECTOR_REST_TOKEN` | Vector DB token | - |
| `NEWSAPI_KEY` | News API key | - |

---

## Health Checks

### HTTP Endpoint

```bash
GET /api/ugw/monitoring/health
```

### Response

```json
{
  "status": "healthy",
  "score": 95,
  "checks": {
    "database": { "healthy": true, "latency": 12 },
    "redis": { "healthy": true, "latency": 8 },
    "ai_providers": { "healthy": true, "details": {...} }
  },
  "uptime": 123456,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Quick Health Check

```bash
curl http://localhost:5000/api/ugw/monitoring/health
```

---

## Monitoring & Metrics

### Prometheus Metrics

```bash
GET /api/ugw/monitoring/metrics
```

### Available Metrics

- `nucleus_api_requests_total` - Total API requests
- `nucleus_api_request_duration` - Request duration histogram
- `nucleus_ai_decision_confidence` - AI decision confidence
- `nucleus_rate_limit_exceeded_total` - Rate limit violations
- `nucleus_errors_total` - Total errors by type
- `nucleus_memory_heap_used` - Heap memory usage
- `nucleus_circuit_breaker_state` - Circuit breaker states

### Live Dashboard (WebSocket)

Connect to WebSocket for real-time metrics:

```javascript
const ws = new WebSocket('ws://localhost:5000/api/live/dashboard');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(message.type, message.data);
});

// Subscribe to specific topics
ws.send(JSON.stringify({
  action: 'subscribe',
  topics: ['metrics_update', 'health_status', 'error_event']
}));
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

Nucleus 3.0 is designed for horizontal scaling:

1. **Stateless Design**: All state stored in Redis/PostgreSQL
2. **Load Balancing**: Use nginx/HAProxy/K8s Service
3. **Session Sharing**: Sessions stored in Redis
4. **Rate Limiting**: Shared across instances via Redis

### Kubernetes Auto-scaling

The included `k8s/hpa.yaml` provides:

- **Min Replicas**: 3
- **Max Replicas**: 10
- **CPU Target**: 70%
- **Memory Target**: 80%

```bash
# Check HPA status
kubectl get hpa -n nucleus

# Manually scale
kubectl scale deployment/nucleus-core --replicas=5 -n nucleus
```

### Resource Recommendations

**Development**:
- CPU: 250m requests, 500m limits
- Memory: 512Mi requests, 1Gi limits

**Production**:
- CPU: 500m requests, 1000m limits
- Memory: 1Gi requests, 2Gi limits

---

## Security Best Practices

### 1. Secret Management

- **Never** commit secrets to git
- Use Kubernetes Secrets or environment variables
- Rotate secrets regularly
- Use separate secrets per environment

### 2. Network Security

```yaml
# Restrict ingress
networkPolicies:
  - from:
    - namespaceSelector:
        matchLabels:
          name: production
```

### 3. Container Security

- Run as non-root user (UID 1001)
- Drop all capabilities
- Read-only root filesystem
- Security scanning with Trivy

```bash
# Scan image
trivy image nucleus:3.0.0
```

### 4. TLS/SSL

- Always use HTTPS in production
- Configure cert-manager for automatic certificates
- Update `k8s/ingress.yaml` with your domain

### 5. Rate Limiting

Rate limiting is enabled by default:

```typescript
// Customize in config
{
  security: {
    rateLimiting: {
      enabled: true,
      failOpen: false, // Fail closed in production
      defaultLimits: {
        rpm: 100,
        rph: 5000,
        rpd: 100000
      }
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### 2. Redis Connection Failed

```bash
# Check Redis connectivity
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping"
```

#### 3. High Memory Usage

```bash
# Check memory stats
curl http://localhost:5000/api/ugw/monitoring/health | jq '.checks.memory_systems'

# Adjust memory limits in config
{
  memory: {
    maxSize: 50000,
    cleanupInterval: 1800000 // 30 minutes
  }
}
```

#### 4. AI Provider Timeouts

```bash
# Check provider status
curl http://localhost:5000/api/ugw/monitoring/health | jq '.checks.ai_providers'

# Adjust timeouts
{
  ai: {
    providers: {
      openai: {
        timeout: 30000, // 30 seconds
        maxRetries: 3
      }
    }
  }
}
```

#### 5. Circuit Breaker Open

```bash
# Check circuit status
curl http://localhost:5000/api/ugw/monitoring/stats

# Reset circuit manually (use with caution)
POST /api/ugw/monitoring/reset-circuit
{
  "circuitName": "ai_provider_openai"
}
```

### Logs Analysis

```bash
# Docker logs
docker logs -f nucleus-core

# Kubernetes logs
kubectl logs -f deployment/nucleus-core -n nucleus

# Filter errors only
kubectl logs deployment/nucleus-core -n nucleus | grep ERROR

# Export logs
kubectl logs deployment/nucleus-core -n nucleus > nucleus-logs.txt
```

### Performance Tuning

```bash
# Monitor resource usage
kubectl top pods -n nucleus

# Check API latency
curl -w "@curl-format.txt" http://localhost:5000/api/ugw/monitoring/health

# Adjust concurrency
{
  performance: {
    maxConcurrent: 20, // Max parallel AI requests
    queueSize: 200     // Max queued requests
  }
}
```

---

## Production Checklist

- [ ] All environment variables configured
- [ ] Secrets created and secured
- [ ] Database migrations applied
- [ ] Health checks responding
- [ ] Metrics collection enabled
- [ ] Logging configured
- [ ] TLS/SSL certificates installed
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured
- [ ] Auto-scaling tested
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] Security scan passed

---

## Support & Resources

- **Documentation**: `/docs`
- **Health Check**: `/api/ugw/monitoring/health`
- **Metrics**: `/api/ugw/monitoring/metrics`
- **Live Dashboard**: `ws://host/api/live/dashboard`

---

**Nucleus 3.0** - Surooh Intelligence OS  
© 2025 Surooh Empire
