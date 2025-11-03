# 🚀 Surooh AI Bridge - Production Deployment Guide

## نظرة عامة

دليل شامل لنشر AI Provider Bridge في بيئات الإنتاج باستخدام:
- ✅ **NGINX** - Reverse Proxy + Rate Limiting
- ✅ **Systemd** - Process Management
- ✅ **Prometheus** - Metrics & Monitoring
- ✅ **Kubernetes** - Container Orchestration (اختياري)

---

## 📋 المتطلبات

### System Requirements
```bash
# OS
Ubuntu 20.04+ / RHEL 8+ / Debian 11+

# Software
Python 3.11+
NGINX 1.18+
systemd 245+

# Resources (per instance)
CPU: 1 core minimum (2+ recommended)
RAM: 512MB minimum (1GB+ recommended)
Disk: 500MB minimum
```

### API Keys
```bash
### Environment Variables

```bash
# API Keys (replace with your actual keys)
OPENAI_API_KEY=your-openai-api-key-here
PORT=3000
NODE_ENV=production

ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

---

## 🔧 الطريقة 1: NGINX + Systemd (Production)

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install NGINX
sudo apt install -y nginx

# Install PyYAML
pip3 install pyyaml
```

### Step 2: Setup AI Bridge

```bash
# Create directory
sudo mkdir -p /opt/surooh/ai-bridge
cd /opt/surooh/ai-bridge

# Copy files
sudo cp bridge.py providers_config.json routing_policies.yaml ./
sudo cp bridge_metrics.py ./

# Set permissions
sudo chown -R $USER:$USER /opt/surooh/ai-bridge
chmod +x bridge.py bridge_metrics.py
```

### Step 3: Configure Environment

```bash
# Create environment file
sudo nano /etc/environment.d/surooh-ai-bridge.conf

# Add API keys
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
BRIDGE_MODE=adaptive
BRIDGE_PORT=7010
```

### Step 4: Install Systemd Services

```bash
# Bridge service
sudo cp surooh-ai-bridge.service /etc/systemd/system/
sudo cp surooh-metrics.service /etc/systemd/system/

# Update WorkingDirectory paths in service files if needed
sudo nano /etc/systemd/system/surooh-ai-bridge.service
sudo nano /etc/systemd/system/surooh-metrics.service

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable surooh-ai-bridge
sudo systemctl enable surooh-metrics

# Start services
sudo systemctl start surooh-ai-bridge
sudo systemctl start surooh-metrics

# Check status
sudo systemctl status surooh-ai-bridge
sudo systemctl status surooh-metrics
```

### Step 5: Configure NGINX

```bash
# Create log directory
sudo mkdir -p /var/log/nginx
sudo mkdir -p /var/cache/nginx/ai-bridge

# Copy NGINX config
sudo cp nginx-ai-bridge.conf /etc/nginx/sites-available/ai-bridge

# Enable site
sudo ln -s /etc/nginx/sites-available/ai-bridge /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

### Step 6: Verify Installation

```bash
# Test Bridge directly
curl http://127.0.0.1:7010/health

# Test through NGINX
curl http://localhost:8080/health

# Test Metrics
curl http://127.0.0.1:7011/metrics

# View logs
sudo journalctl -u surooh-ai-bridge -f
sudo journalctl -u surooh-metrics -f
tail -f /var/log/nginx/ai-bridge-access.log
```

---

## ☸️ الطريقة 2: Kubernetes Deployment

### Step 1: Prepare Cluster

```bash
# Ensure kubectl is configured
kubectl cluster-info

# Create namespace
kubectl create namespace surooh-intelligence
```

### Step 2: Create ConfigMap for Code

```bash
# Create ConfigMap with Python code
kubectl create configmap ai-bridge-code \
  --from-file=bridge.py=bridge.py \
  --from-file=bridge_metrics.py=bridge_metrics.py \
  -n surooh-intelligence
```

### Step 3: Update Secrets

```bash
# Edit kubernetes/deployment.yaml
nano kubernetes/deployment.yaml

# Replace REPLACE_WITH_ACTUAL_KEY with real API keys
# Or create secret separately:
kubectl create secret generic ai-bridge-secrets \
  --from-literal=OPENAI_API_KEY=your-openai-api-key-here \
  --from-literal=GROQ_API_KEY=gsk_... \
  --from-literal=MISTRAL_API_KEY=... \
  --from-literal=ANTHROPIC_API_KEY=your-anthropic-api-key-here \
  -n surooh-intelligence
```

### Step 4: Deploy

```bash
# Apply all manifests
kubectl apply -f kubernetes/deployment.yaml

# Check deployment
kubectl get pods -n surooh-intelligence
kubectl get svc -n surooh-intelligence
kubectl get hpa -n surooh-intelligence

# View logs
kubectl logs -f deployment/ai-bridge -n surooh-intelligence -c bridge
kubectl logs -f deployment/ai-bridge -n surooh-intelligence -c metrics
```

### Step 5: Port Forward (for testing)

```bash
# Forward bridge port
kubectl port-forward -n surooh-intelligence svc/ai-bridge-service 7010:7010

# Forward metrics port
kubectl port-forward -n surooh-intelligence svc/ai-bridge-service 7011:7011

# Test
curl http://localhost:7010/health
curl http://localhost:7011/metrics
```

### Step 6: Expose Service (Production)

```bash
# Option A: LoadBalancer (cloud providers)
kubectl patch svc ai-bridge-service -n surooh-intelligence -p '{"spec":{"type":"LoadBalancer"}}'

# Option B: Ingress (recommended)
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-bridge-ingress
  namespace: surooh-intelligence
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "20"
spec:
  rules:
  - host: ai-bridge.surooh.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ai-bridge-service
            port:
              number: 7010
EOF
```

---

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
# Add to prometheus.yml
scrape_configs:
  - job_name: 'ai-bridge'
    static_configs:
      - targets: ['localhost:7011']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard

```bash
# Import dashboard JSON (create separately)
# Key metrics to monitor:
# - bridge_requests_total
# - bridge_request_duration_seconds_avg
# - bridge_provider_availability
# - bridge_committee_triggers_total
```

### Alerts (Prometheus AlertManager)

```yaml
groups:
  - name: ai_bridge_alerts
    rules:
      - alert: BridgeDown
        expr: up{job="ai-bridge"} == 0
        for: 1m
        annotations:
          summary: "AI Bridge is down"
      
      - alert: HighLatency
        expr: bridge_request_duration_seconds_avg > 5
        for: 5m
        annotations:
          summary: "AI Bridge latency > 5s"
      
      - alert: ProviderDown
        expr: bridge_provider_availability == 0
        for: 2m
        annotations:
          summary: "AI Provider {{ $labels.provider }} is down"
```

---

## 🔒 Security Hardening

### 1. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 8080/tcp  # NGINX
sudo ufw deny 7010/tcp   # Block direct Bridge access
sudo ufw deny 7011/tcp   # Block direct Metrics access
sudo ufw enable
```

### 2. API Key Rotation

```bash
# Use environment file or secrets manager
# Rotate keys monthly
# Use different keys per environment (dev/staging/prod)
```

### 3. Rate Limiting

```nginx
# Already configured in nginx-ai-bridge.conf
# Adjust limits based on usage:
limit_req_zone $binary_remote_addr zone=bridge_general:10m rate=20r/m;
```

### 4. TLS/SSL (Production)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d ai-bridge.surooh.local

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 🧪 Testing & Validation

### Health Checks

```bash
# Bridge health
curl http://localhost:8080/health

# Metrics
curl http://localhost:7011/metrics

# End-to-end test
curl -X POST http://localhost:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Test"}],"max_tokens":10}'
```

### Load Testing

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Run load test (20 req/min for 1 minute)
hey -n 20 -c 1 -q 1 -m POST \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Test"}]}' \
  http://localhost:8080/v1/chat/completions
```

---

## 🔧 Troubleshooting

### Issue: Bridge won't start

```bash
# Check logs
sudo journalctl -u surooh-ai-bridge -n 50

# Check Python version
python3 --version

# Check dependencies
pip3 list | grep pyyaml

# Restart service
sudo systemctl restart surooh-ai-bridge
```

### Issue: 502 Bad Gateway

```bash
# Check if Bridge is running
sudo systemctl status surooh-ai-bridge

# Check NGINX upstream
sudo nginx -t
sudo tail -f /var/log/nginx/ai-bridge-error.log

# Check firewall
sudo ufw status
```

### Issue: High latency

```bash
# Check metrics
curl http://localhost:7011/metrics | grep duration

# Check provider health
curl http://localhost:8080/health

# Increase resources (Kubernetes)
kubectl scale deployment ai-bridge --replicas=4 -n surooh-intelligence
```

---

## 📈 Scaling Guidelines

### Vertical Scaling (Single Instance)
- **Light load** (< 100 req/hour): 1 CPU, 512MB RAM
- **Medium load** (100-500 req/hour): 2 CPU, 1GB RAM
- **Heavy load** (> 500 req/hour): 4 CPU, 2GB RAM

### Horizontal Scaling (Multiple Instances)
```bash
# Systemd (manual load balancing)
# Run multiple instances on different ports
# Use NGINX upstream round-robin

# Kubernetes (auto-scaling)
# HPA already configured in deployment.yaml
kubectl get hpa -n surooh-intelligence
```

---

## 📝 Maintenance

### Daily Tasks
```bash
# Check service status
sudo systemctl status surooh-ai-bridge

# Check logs for errors
sudo journalctl -u surooh-ai-bridge --since today | grep ERROR
```

### Weekly Tasks
```bash
# Rotate logs
sudo logrotate /etc/logrotate.d/nginx

# Check disk usage
df -h /var/log/nginx
```

### Monthly Tasks
```bash
# Update dependencies
pip3 install --upgrade pyyaml

# Rotate API keys
# Update secrets and restart services

# Review metrics and optimize
curl http://localhost:7011/metrics > monthly-metrics.txt
```

---

## 🎯 Performance Tuning

### NGINX Optimization

```nginx
# In nginx.conf
worker_processes auto;
worker_rlimit_nofile 100000;

events {
    worker_connections 4096;
    use epoll;
}

http {
    keepalive_timeout 65;
    keepalive_requests 100;
}
```

### Python Optimization

```python
# Use uvloop for better performance
pip install uvloop

# In bridge.py (future enhancement)
import uvloop
uvloop.install()
```

---

**Production Checklist:**

- [ ] API keys stored securely
- [ ] Services enabled and running
- [ ] NGINX configured with rate limiting
- [ ] Firewall rules applied
- [ ] Monitoring setup (Prometheus)
- [ ] Alerts configured
- [ ] Backups scheduled
- [ ] Documentation updated
- [ ] Team trained on operations

---

**Surooh Empire - AI Provider Bridge**
Production Deployment Guide v1.0
