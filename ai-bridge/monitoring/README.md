# 📊 Monitoring System - AI Provider Bridge

## نظرة عامة

نظام مراقبة شامل لـ AI Provider Bridge يوفر:
- 📈 Prometheus metrics collection
- 📊 Performance analytics
- 🚨 Alerting on anomalies
- 📁 Log aggregation

---

## 🗂️ هيكل المجلد

```
monitoring/
├── logs/                           # Log files
│   ├── bridge-access.log          # HTTP access logs
│   ├── bridge-error.log           # Error logs
│   └── metrics.log                # Metrics collection logs
├── metrics/                        # Metrics storage
│   ├── provider_latency.csv       # Latency data by provider
│   ├── routing_decisions.json     # Routing decisions log
│   └── daily_stats.json           # Daily aggregated stats
├── dashboards/                     # Grafana dashboards
│   └── ai-bridge-dashboard.json   # Main dashboard
└── alerts/                         # Alert configurations
    └── prometheus-rules.yaml      # Prometheus alert rules
```

---

## 📈 Available Metrics

### Request Metrics
```prometheus
# Total requests by provider, task type, status
bridge_requests_total{provider="openai",task_type="analysis",status="success"} 142

# Request duration (avg, p95, p99)
bridge_request_duration_seconds_avg{provider="llama",task_type="analysis"} 1.234
bridge_request_duration_seconds_p95{provider="llama",task_type="analysis"} 2.456
bridge_request_duration_seconds_p99{provider="llama",task_type="analysis"} 3.789
```

### Provider Health
```prometheus
# Provider availability (1=up, 0=down)
bridge_provider_availability{provider="openai"} 1
bridge_provider_availability{provider="claude"} 0
```

### Committee & Distribution
```prometheus
# Committee mode activations
bridge_committee_triggers_total 12

# Knowledge distribution broadcasts
bridge_distribution_broadcasts_total 45
```

### System Metrics
```prometheus
# Bridge uptime in seconds
bridge_uptime_seconds 86400
```

---

## 🔍 Querying Metrics

### Prometheus Queries

**Average latency by provider:**
```promql
avg(bridge_request_duration_seconds_avg) by (provider)
```

**Success rate by task type:**
```promql
sum(bridge_requests_total{status="success"}) by (task_type) 
/ 
sum(bridge_requests_total) by (task_type) * 100
```

**Requests per minute:**
```promql
rate(bridge_requests_total[1m]) * 60
```

**Provider downtime:**
```promql
bridge_provider_availability == 0
```

---

## 📊 Grafana Dashboard

### Setup

1. **Import dashboard:**
```bash
# Copy dashboard JSON
cp dashboards/ai-bridge-dashboard.json /var/lib/grafana/dashboards/

# Or import via Grafana UI
# Dashboards → Import → Upload JSON
```

2. **Configure data source:**
- Add Prometheus as data source
- URL: `http://localhost:9090`
- Access: Server (default)

### Dashboard Panels

1. **Overview**
   - Total requests (counter)
   - Active providers (gauge)
   - Committee activations (graph)

2. **Performance**
   - Average latency by provider (graph)
   - P95/P99 latency (heatmap)
   - Request rate (graph)

3. **Providers**
   - Provider availability (status map)
   - Requests per provider (bar chart)
   - Error rate per provider (graph)

4. **Task Distribution**
   - Requests by task type (pie chart)
   - Routing decisions (sankey diagram)

---

## 🚨 Alerts

### Prometheus Alert Rules

```yaml
# alerts/prometheus-rules.yaml
groups:
  - name: ai_bridge_alerts
    interval: 30s
    rules:
      # Bridge down
      - alert: BridgeDown
        expr: up{job="ai-bridge"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "AI Bridge is down"
          description: "Bridge has been down for more than 1 minute"
      
      # High latency
      - alert: HighLatency
        expr: bridge_request_duration_seconds_avg > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "Average latency is {{ $value }}s (threshold: 5s)"
      
      # Provider down
      - alert: ProviderDown
        expr: bridge_provider_availability == 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "AI Provider down"
          description: "Provider {{ $labels.provider }} is unavailable"
      
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(bridge_requests_total{status="error"}[5m])) 
          / 
          sum(rate(bridge_requests_total[5m])) > 0.1
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      # Committee overuse
      - alert: FrequentCommittee
        expr: rate(bridge_committee_triggers_total[10m]) > 0.5
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Frequent committee activation"
          description: "Committee triggered {{ $value }} times/min"
```

### Alert Notification

**Slack integration:**
```yaml
# alertmanager.yml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/PATH'
        channel: '#ai-bridge-alerts'
        title: 'AI Bridge Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

**Email integration:**
```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'ops@surooh.com'
        from: 'alerts@surooh.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@surooh.com'
        auth_password: 'APP_PASSWORD'
```

---

## 📁 Log Management

### Log Rotation

```bash
# /etc/logrotate.d/ai-bridge
/opt/surooh/ai-bridge/monitoring/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 runner runner
    sharedscripts
    postrotate
        systemctl reload surooh-ai-bridge > /dev/null 2>&1 || true
    endscript
}
```

### Log Analysis

**Count requests by status:**
```bash
grep "status" monitoring/logs/bridge-access.log | jq .status | sort | uniq -c
```

**Average latency per hour:**
```bash
jq -r '[.duration] | add/length' monitoring/metrics/provider_latency.csv
```

**Top error messages:**
```bash
grep ERROR monitoring/logs/bridge-error.log | cut -d' ' -f4- | sort | uniq -c | sort -rn | head -10
```

---

## 📈 Performance Analytics

### Daily Statistics Collection

```python
# Script to generate daily stats
import json
from datetime import datetime, timedelta

def generate_daily_stats():
    stats = {
        "date": datetime.now().isoformat(),
        "total_requests": 0,
        "by_provider": {},
        "by_task_type": {},
        "avg_latency": 0,
        "committee_triggers": 0,
        "error_rate": 0
    }
    
    # Fetch from Prometheus
    # ...
    
    with open("monitoring/metrics/daily_stats.json", "w") as f:
        json.dump(stats, f, indent=2)
```

### Weekly Report

```bash
# Generate weekly summary
#!/bin/bash
echo "=== AI Bridge Weekly Report ==="
echo "Period: $(date -d '7 days ago' +%Y-%m-%d) to $(date +%Y-%m-%d)"
echo ""
echo "Total Requests: $(curl -s http://localhost:7011/metrics | grep bridge_requests_total | awk '{sum+=$2} END {print sum}')"
echo "Committee Triggers: $(curl -s http://localhost:7011/metrics | grep bridge_committee_triggers_total | awk '{print $2}')"
echo "Average Latency: $(curl -s http://localhost:7011/metrics | grep bridge_request_duration_seconds_avg | awk '{sum+=$2; n++} END {print sum/n}')"
```

---

## 🔧 Setup Instructions

### 1. Create Directories

```bash
cd ai-bridge
mkdir -p monitoring/{logs,metrics,dashboards,alerts}
chmod 755 monitoring monitoring/*
```

### 2. Install Prometheus

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Configure
cat > prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ai-bridge'
    static_configs:
      - targets: ['localhost:7011']
EOF

# Start
./prometheus --config.file=prometheus.yml
```

### 3. Install Grafana

```bash
# Add repository
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -

# Install
sudo apt-get update
sudo apt-get install grafana

# Start
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

### 4. Configure Log Rotation

```bash
sudo cp monitoring/logrotate.conf /etc/logrotate.d/ai-bridge
sudo logrotate -f /etc/logrotate.d/ai-bridge
```

---

## 📊 Sample Dashboard Queries

### Total Requests (Counter)
```promql
sum(bridge_requests_total)
```

### Success Rate (Gauge)
```promql
sum(bridge_requests_total{status="success"}) 
/ 
sum(bridge_requests_total) * 100
```

### Latency Over Time (Graph)
```promql
bridge_request_duration_seconds_avg
```

### Provider Distribution (Pie Chart)
```promql
sum(bridge_requests_total) by (provider)
```

---

## 🎯 Best Practices

1. **Monitor continuously** - Set up alerts for critical metrics
2. **Review weekly** - Generate reports and identify trends
3. **Optimize routing** - Adjust weights based on performance data
4. **Capacity planning** - Track growth and plan scaling
5. **Cost tracking** - Monitor provider usage for billing

---

**Next Steps:**
1. Set up Prometheus scraping
2. Import Grafana dashboard
3. Configure alerts
4. Enable log rotation
5. Schedule daily stats collection

---

**Surooh Empire - AI Bridge Monitoring**
v1.0
