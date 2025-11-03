#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Surooh AI Bridge - Prometheus Metrics Exporter
Exposes metrics on port 7011 for monitoring Bridge performance

Metrics exposed:
- bridge_requests_total{provider, task_type, status}
- bridge_request_duration_seconds{provider, task_type}
- bridge_provider_availability{provider}
- bridge_committee_triggers_total
- bridge_distribution_broadcasts_total
"""
import json
import time
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from collections import defaultdict
from threading import Lock

# Thread-safe metrics storage
metrics_lock = Lock()
metrics_data = {
    "requests_total": defaultdict(int),  # {(provider, task_type, status): count}
    "request_duration": defaultdict(list),  # {(provider, task_type): [durations]}
    "provider_availability": {},  # {provider: 1/0}
    "committee_triggers": 0,
    "distribution_broadcasts": 0,
    "last_reset": time.time()
}

def record_request(provider: str, task_type: str, status: str, duration: float):
    """Record a request metric"""
    with metrics_lock:
        key = (provider, task_type, status)
        metrics_data["requests_total"][key] += 1
        metrics_data["request_duration"][(provider, task_type)].append(duration)

def record_provider_health(provider: str, available: bool):
    """Record provider availability"""
    with metrics_lock:
        metrics_data["provider_availability"][provider] = 1 if available else 0

def record_committee_trigger():
    """Record committee mode trigger"""
    with metrics_lock:
        metrics_data["committee_triggers"] += 1

def record_distribution():
    """Record knowledge distribution broadcast"""
    with metrics_lock:
        metrics_data["distribution_broadcasts"] += 1

def format_prometheus_metrics() -> str:
    """Format metrics in Prometheus exposition format"""
    lines = []
    
    with metrics_lock:
        # Requests total
        lines.append("# HELP bridge_requests_total Total number of requests to AI Bridge")
        lines.append("# TYPE bridge_requests_total counter")
        for (provider, task_type, status), count in metrics_data["requests_total"].items():
            lines.append(f'bridge_requests_total{{provider="{provider}",task_type="{task_type}",status="{status}"}} {count}')
        
        # Request duration
        lines.append("\n# HELP bridge_request_duration_seconds Request duration in seconds")
        lines.append("# TYPE bridge_request_duration_seconds histogram")
        for (provider, task_type), durations in metrics_data["request_duration"].items():
            if durations:
                avg = sum(durations) / len(durations)
                p95 = sorted(durations)[int(len(durations) * 0.95)] if len(durations) > 0 else 0
                p99 = sorted(durations)[int(len(durations) * 0.99)] if len(durations) > 0 else 0
                lines.append(f'bridge_request_duration_seconds_avg{{provider="{provider}",task_type="{task_type}"}} {avg:.3f}')
                lines.append(f'bridge_request_duration_seconds_p95{{provider="{provider}",task_type="{task_type}"}} {p95:.3f}')
                lines.append(f'bridge_request_duration_seconds_p99{{provider="{provider}",task_type="{task_type}"}} {p99:.3f}')
        
        # Provider availability
        lines.append("\n# HELP bridge_provider_availability Provider availability (1=up, 0=down)")
        lines.append("# TYPE bridge_provider_availability gauge")
        for provider, available in metrics_data["provider_availability"].items():
            lines.append(f'bridge_provider_availability{{provider="{provider}"}} {available}')
        
        # Committee triggers
        lines.append("\n# HELP bridge_committee_triggers_total Total committee mode activations")
        lines.append("# TYPE bridge_committee_triggers_total counter")
        lines.append(f"bridge_committee_triggers_total {metrics_data['committee_triggers']}")
        
        # Distribution broadcasts
        lines.append("\n# HELP bridge_distribution_broadcasts_total Total knowledge distribution broadcasts")
        lines.append("# TYPE bridge_distribution_broadcasts_total counter")
        lines.append(f"bridge_distribution_broadcasts_total {metrics_data['distribution_broadcasts']}")
        
        # Uptime
        uptime = time.time() - metrics_data["last_reset"]
        lines.append("\n# HELP bridge_uptime_seconds Bridge uptime in seconds")
        lines.append("# TYPE bridge_uptime_seconds gauge")
        lines.append(f"bridge_uptime_seconds {uptime:.0f}")
    
    return "\n".join(lines) + "\n"

class MetricsHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging
    
    def do_GET(self):
        if self.path == "/metrics":
            metrics = format_prometheus_metrics()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4")
            self.end_headers()
            self.wfile.write(metrics.encode("utf-8"))
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Record metrics via POST /record"""
        if self.path == "/record":
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8", "ignore"))
            
            event_type = body.get("type")
            if event_type == "request":
                record_request(
                    body.get("provider", "unknown"),
                    body.get("task_type", "unknown"),
                    body.get("status", "unknown"),
                    body.get("duration", 0.0)
                )
            elif event_type == "provider_health":
                record_provider_health(
                    body.get("provider", "unknown"),
                    body.get("available", True)
                )
            elif event_type == "committee":
                record_committee_trigger()
            elif event_type == "distribution":
                record_distribution()
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"recorded": True}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7011, help="Metrics port")
    args = parser.parse_args()
    
    # Initialize provider availability
    for provider in ["openai", "llama", "mistral", "claude"]:
        metrics_data["provider_availability"][provider] = 1
    
    server = HTTPServer(("0.0.0.0", args.port), MetricsHandler)
    print(f"Prometheus Metrics Exporter running on :{args.port}")
    print(f"Metrics endpoint: http://localhost:{args.port}/metrics")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
