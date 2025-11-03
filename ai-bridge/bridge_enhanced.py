#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Surooh AI Provider Bridge — Enhanced with Dynamic Weights + Fallback Logic
Features:
- Real-time performance tracking
- Dynamic weight adjustment based on latency & success rate
- Provider cooldown after repeated failures
- Task fingerprinting for deduplication
"""
import os, json, time, hashlib, argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import urllib.request, urllib.error
from collections import defaultdict, deque
from threading import Lock
import yaml

CONFIG = json.loads(open("providers_config.json","r",encoding="utf-8").read())
ROUTING_RAW = open("routing_policies.yaml","r",encoding="utf-8").read()
ROUTING = yaml.safe_load(ROUTING_RAW)

# Performance tracking (thread-safe)
perf_lock = Lock()
perf_data = {
    "provider_stats": defaultdict(lambda: {"success": 0, "fail": 0, "latency": deque(maxlen=100)}),
    "provider_cooldown": {},  # {provider: cooldown_until_timestamp}
    "task_cache": {},  # {fingerprint: (result, timestamp)}
    "dynamic_weights": {}  # {task_type: {provider: weight}}
}

COOLDOWN_DURATION = 300  # 5 minutes cooldown after 3 consecutive failures
CACHE_TTL = 3600  # 1 hour cache for identical tasks

def choose_mode():
    return os.environ.get("BRIDGE_MODE", CONFIG.get("default_mode","adaptive")).lower()

def task_fingerprint(prompt: str, task_type: str) -> str:
    """Generate fingerprint for task deduplication"""
    content = f"{task_type}:{prompt[:500]}"
    return hashlib.sha256(content.encode()).hexdigest()

def is_provider_available(provider: str) -> bool:
    """Check if provider is not in cooldown"""
    with perf_lock:
        cooldown_until = perf_data["provider_cooldown"].get(provider, 0)
        return time.time() > cooldown_until

def record_provider_result(provider: str, success: bool, latency: float):
    """Record provider performance and apply cooldown if needed"""
    with perf_lock:
        stats = perf_data["provider_stats"][provider]
        if success:
            stats["success"] += 1
            stats["latency"].append(latency)
            # Clear consecutive failures
            stats["consecutive_fails"] = 0
        else:
            stats["fail"] += 1
            stats["consecutive_fails"] = stats.get("consecutive_fails", 0) + 1
            
            # Apply cooldown after 3 consecutive failures
            if stats["consecutive_fails"] >= 3:
                perf_data["provider_cooldown"][provider] = time.time() + COOLDOWN_DURATION
                print(f"⚠️  Provider {provider} in cooldown for {COOLDOWN_DURATION}s due to repeated failures")

def get_dynamic_weights(task_type: str):
    """Calculate dynamic weights based on real-time performance"""
    with perf_lock:
        # Start with base weights from YAML
        base_weights = ROUTING.get("routing", {}).get("weights", {}).get(task_type, {})
        if not base_weights:
            return {"llama": 0.4, "mistral": 0.3, "openai": 0.2, "claude": 0.1}
        
        dynamic = {}
        for provider, base_weight in base_weights.items():
            stats = perf_data["provider_stats"][provider]
            
            # Skip if in cooldown
            if not is_provider_available(provider):
                dynamic[provider] = 0.0
                continue
            
            # Calculate success rate
            total = stats["success"] + stats["fail"]
            success_rate = stats["success"] / total if total > 0 else 1.0
            
            # Calculate average latency penalty
            latencies = list(stats["latency"])
            avg_latency = sum(latencies) / len(latencies) if latencies else 2.0
            latency_penalty = max(0.5, min(1.5, 3.0 / avg_latency))  # Faster = higher weight
            
            # Adjust weight
            adjusted_weight = base_weight * success_rate * latency_penalty
            dynamic[provider] = max(0.01, adjusted_weight)  # Minimum 0.01
        
        # Normalize to sum to 1.0
        total_weight = sum(dynamic.values())
        if total_weight > 0:
            dynamic = {k: v/total_weight for k, v in dynamic.items()}
        
        perf_data["dynamic_weights"][task_type] = dynamic
        return dynamic

def classify_task(prompt: str):
    """Classify task type based on keywords"""
    if not prompt:
        return "analysis"
    
    prompt_lower = prompt.lower()
    classify_map = ROUTING.get("routing", {}).get("classify_task", {})
    
    for category, keywords in classify_map.items():
        if isinstance(keywords, list):
            for keyword in keywords:
                if keyword.lower() in prompt_lower:
                    return category
    
    return "analysis"

def pick_provider(task_type: str):
    """Select best provider using dynamic weights"""
    weights = get_dynamic_weights(task_type)
    if not weights or sum(weights.values()) == 0:
        # Fallback to any available provider
        for p in CONFIG["providers"].keys():
            if is_provider_available(p):
                return p
        return "openai"  # Ultimate fallback
    
    # Pick provider with highest dynamic weight
    available = {k: v for k, v in weights.items() if is_provider_available(k)}
    if not available:
        return "openai"
    
    provider = max(available.items(), key=lambda x: x[1])[0]
    return provider

def http_json(method, url, headers, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url=url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8","ignore")
        return resp.getcode(), body

def call_openai_compatible(base_url, api_key, model, messages, max_tokens=1024, temperature=0.2):
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type":"application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": temperature}
    return http_json("POST", url, headers, payload)

def call_anthropic(base_url, api_key, model, messages, max_tokens=1024, temperature=0.2):
    url = base_url.rstrip("/") + "/messages"
    headers = {
        "Content-Type":"application/json",
        "x-api-key": api_key or "",
        "anthropic-version":"2023-06-01"
    }
    content = []
    for m in messages:
        role = m.get("role","user")
        if role != "system":
            content.append({"role": role, "content": m.get("content","")})
    payload = {"model": model, "max_tokens": max_tokens, "temperature": temperature, "messages": content}
    return http_json("POST", url, headers, payload)

def provider_call(name, messages, max_tokens=1024, temperature=0.2):
    """Call provider and track performance"""
    start = time.time()
    try:
        p = CONFIG["providers"][name]
        t = p["type"]
        base = p["base_url"]
        api_key = os.environ.get(p.get("api_key_env",""),"")
        model = p["model"]
        
        if t in ("openai-compatible","openai"):
            code, body = call_openai_compatible(base, api_key, model, messages, max_tokens, temperature)
        elif t == "anthropic":
            code, body = call_anthropic(base, api_key, model, messages, max_tokens, temperature)
        else:
            raise RuntimeError(f"Unsupported provider type: {t}")
        
        latency = time.time() - start
        record_provider_result(name, code == 200, latency)
        return code, body
    except Exception as e:
        latency = time.time() - start
        record_provider_result(name, False, latency)
        raise e

def committee(messages, members):
    """Committee with fallback to available providers"""
    available_members = [m for m in members if is_provider_available(m)]
    if not available_members:
        available_members = members  # Force try even if in cooldown
    
    outputs = []
    for m in available_members:
        try:
            code, body = provider_call(m, messages)
            outputs.append((m, code, body))
        except Exception as e:
            outputs.append((m, 0, f'{{"error":"{str(e)}"}}'))
    
    winners = [b for (m,c,b) in outputs if c==200]
    if winners:
        return 200, winners[0]
    
    longest = max((b for (_,_,b) in outputs), key=lambda x: len(x), default='{"error":"no outputs"}')
    return 200, longest

def broadcast_insight(kind, provider, prompt):
    cfg = CONFIG.get("distributor",{})
    if not cfg.get("enabled",False):
        return
    url = cfg["broadcast_url"]
    payload = {"topic":"ai_bridge.insight","kind":kind,"provider":provider,"preview":(prompt or "")[:160]}
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type":"application/json"}
    try:
        req = urllib.request.Request(url=url, data=data, headers=headers, method="POST")
        urllib.request.urlopen(req, timeout=3).read()
    except Exception:
        pass

def record_metrics(provider, task_type, status, duration):
    """Send metrics to exporter"""
    try:
        url = "http://127.0.0.1:7011/record"
        payload = {"type": "request", "provider": provider, "task_type": task_type, "status": status, "duration": duration}
        data = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(url=url, data=data, headers=headers, method="POST")
        urllib.request.urlopen(req, timeout=1).read()
    except:
        pass

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def _send(self, code, body, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        if isinstance(body, (dict,list)):
            self.wfile.write(json.dumps(body).encode("utf-8"))
        else:
            self.wfile.write(body.encode("utf-8") if isinstance(body,str) else body)

    def do_GET(self):
        if self.path.startswith("/health"):
            # Include provider status
            provider_status = {}
            with perf_lock:
                for p in CONFIG["providers"].keys():
                    provider_status[p] = {
                        "available": is_provider_available(p),
                        "stats": dict(perf_data["provider_stats"][p])
                    }
            return self._send(200, {"status":"ok", "mode": choose_mode(), "providers": provider_status})
        
        if self.path.startswith("/stats"):
            with perf_lock:
                return self._send(200, {
                    "provider_stats": {k: dict(v) for k, v in perf_data["provider_stats"].items()},
                    "dynamic_weights": perf_data["dynamic_weights"],
                    "cooldowns": perf_data["provider_cooldown"]
                })
        
        return self._send(404, {"error":"not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length","0"))
        raw = self.rfile.read(length).decode("utf-8","ignore") if length>0 else "{}"
        try:
            body = json.loads(raw)
        except Exception:
            body = {}
        mode = choose_mode()

        if parsed.path == "/v1/chat/completions":
            messages = body.get("messages", [])
            prompt = " ".join([m.get("content","") for m in messages if m.get("role") in ("user","system")])
            kind = classify_task(prompt)
            
            # Check cache
            fp = task_fingerprint(prompt, kind)
            with perf_lock:
                cached = perf_data["task_cache"].get(fp)
                if cached and (time.time() - cached[1]) < CACHE_TTL:
                    print(f"✅ Cache hit for {kind} task")
                    return self._send(200, cached[0], "application/json")

            start_time = time.time()
            if mode in ("hybrid","adaptive"):
                provider = pick_provider(kind)
                try:
                    code, out = provider_call(provider, messages, body.get("max_tokens",1024), body.get("temperature",0.7))
                    duration = time.time() - start_time
                    record_metrics(provider, kind, "success" if code==200 else "error", duration)
                    broadcast_insight(kind, provider, prompt)
                    
                    # Cache result
                    with perf_lock:
                        perf_data["task_cache"][fp] = (out, time.time())
                    
                    # Trigger committee on sensitive or error
                    sensitive = any(s in (body.get("task_id","") + prompt) for s in CONFIG.get("thresholds",{}).get("sensitive_tasks",[]))
                    if code != 200 or sensitive:
                        members = [p for p in CONFIG["providers"].keys() if is_provider_available(p)]
                        if not members:
                            members = list(CONFIG["providers"].keys())
                        code, out = committee(messages, members)
                        record_metrics("committee", kind, "success", time.time() - start_time)
                        broadcast_insight(kind, "committee", prompt)
                    
                    return self._send(code, out, "application/json")
                except Exception as e:
                    duration = time.time() - start_time
                    record_metrics(provider, kind, "error", duration)
                    # Fallback to committee
                    members = [p for p in CONFIG["providers"].keys() if is_provider_available(p) and p != provider]
                    if members:
                        code, out = committee(messages, members)
                        return self._send(code, out, "application/json")
                    return self._send(500, {"error": str(e)})

            elif mode == "committee":
                members = list(CONFIG["providers"].keys())
                code, out = committee(messages, members)
                duration = time.time() - start_time
                record_metrics("committee", kind, "success", duration)
                broadcast_insight(kind, "committee", prompt)
                return self._send(code, out, "application/json")

            return self._send(400, {"error":"invalid mode"})

        if parsed.path == "/v1/anthropic/messages":
            messages = body.get("messages", [])
            try:
                code, out = provider_call("claude", messages, body.get("max_tokens",1024), body.get("temperature",0.7))
                broadcast_insight("anthropic", "claude", "anthropic-call")
                return self._send(code, out, "application/json")
            except Exception as e:
                return self._send(500, {"error": str(e)})

        return self._send(404, {"error":"not found"})

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default=os.environ.get("BRIDGE_MODE","adaptive"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("BRIDGE_PORT","7010")))
    args = ap.parse_args()
    server = HTTPServer(("0.0.0.0", args.port), Handler)
    print(f"🚀 Surooh AI Bridge Enhanced running on :{args.port}")
    print(f"   Mode: {args.mode}")
    print(f"   Features: Dynamic Weights | Provider Cooldown | Task Cache")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
