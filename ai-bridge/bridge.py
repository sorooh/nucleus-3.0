#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Surooh AI Provider Bridge — Adaptive (Hybrid + Committee)
- OpenAI-compatible endpoint: /v1/chat/completions
- Anthropic-compatible endpoint: /v1/anthropic/messages
- Health: /health

Usage:
  python3 bridge.py --mode adaptive --port 7010
"""
import os, json, time, hmac, hashlib, base64, argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import urllib.request, urllib.error

CONFIG = json.loads(open("providers_config.json","r",encoding="utf-8").read())
ROUTING = open("routing_policies.yaml","r",encoding="utf-8").read()

def choose_mode():
    return os.environ.get("BRIDGE_MODE", CONFIG.get("default_mode","adaptive")).lower()

def classify_task(prompt: str):
    def extract(section):
        lines = ROUTING.split("classify_task:")[1].split("weights:")[0].strip().splitlines()
        mapping = {}
        k = None
        for ln in lines:
            if not ln.strip(): continue
            if not ln.startswith(" "):
                continue
            if ln.strip().endswith(":") and not ln.strip().startswith("-"):
                k = ln.strip().split(":")[0]
                mapping[k] = []
            elif "- " in ln and k:
                term = ln.split("- ",1)[1].strip().strip('"').strip("'")
                mapping[k].append(term)
        return mapping
    mapping = extract("classify_task")
    prompt_l = (prompt or "").lower()
    for kind, terms in mapping.items():
        for t in terms:
            if t.lower() in prompt_l:
                return kind
    return "analysis"

def load_weights(kind: str):
    weights_section = ROUTING.split("weights:")[1]
    lines = weights_section.splitlines()
    found = False
    mapping = {}
    current = None
    for ln in lines:
        if ln.strip().endswith(":") and not ln.strip().startswith(("-", "#")):
            sec = ln.strip().split(":")[0]
            if sec == kind:
                current = sec
                found = True
                continue
            else:
                current = None
        elif found and ":" in ln and ln.strip().startswith(("-", " ")):
            if current:
                parts = ln.replace("-", "").strip().split(":")
                if len(parts)==2:
                    prov = parts[0].strip()
                    try:
                        w = float(parts[1].strip())
                        mapping[prov] = w
                    except:
                        pass
        elif found and (not ln.startswith(" ") or ln.strip()=="" ):
            break
    if not mapping:
        mapping = {"llama":0.5,"mistral":0.3,"claude":0.15,"falcon":0.05}
    return mapping

def http_json(method, url, headers, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url=url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8","ignore")
        return resp.getcode(), body

def call_openai_compatible(base_url, api_key, model, messages, max_tokens=1024, temperature=0.2):
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type":"application/json","Authorization": f"Bearer {api_key}"} if api_key else {"Content-Type":"application/json"}
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
        content.append({"role": role, "content": m.get("content","")})
    payload = {"model": model, "max_tokens": max_tokens, "temperature": temperature, "messages": content}
    return http_json("POST", url, headers, payload)

def pick_provider(kind: str):
    weights = load_weights(kind)
    prov = sorted(weights.items(), key=lambda x: x[1], reverse=True)[0][0]
    return prov

def provider_call(name, messages, max_tokens=1024, temperature=0.2):
    p = CONFIG["providers"][name]
    t = p["type"]
    base = p["base_url"]
    api_key = os.environ.get(p.get("api_key_env",""),"")
    model = p["model"]
    if t in ("openai-compatible","openai"):
        return call_openai_compatible(base, api_key, model, messages, max_tokens, temperature)
    elif t == "anthropic":
        return call_anthropic(base, api_key, model, messages, max_tokens, temperature)
    else:
        raise RuntimeError(f"Unsupported provider type: {t}")

def committee(messages, members):
    outputs = []
    for m in members:
        try:
            code, body = provider_call(m, messages)
            outputs.append((m, code, body))
        except Exception as e:
            outputs.append((m, 0, f"error: {e}"))
    winners = [b for (m,c,b) in outputs if c==200]
    if winners:
        return 200, winners[0]
    longest = max((b for (_,_,b) in outputs), key=lambda x: len(x), default="")
    return 200, longest or json.dumps({"error":"no outputs"})

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

class Handler(BaseHTTPRequestHandler):
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
            return self._send(200, {"status":"ok","mode": choose_mode()})
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

            # Adaptive: Hybrid + Committee on triggers
            if mode in ("hybrid","adaptive"):
                provider = pick_provider(kind)
                code, out = provider_call(provider, messages, body.get("max_tokens",1024), body.get("temperature",0.2))
                broadcast_insight(kind, provider, prompt)
                # trigger committee on sensitive or if error
                sensitive = any(s in (body.get("task_id","") + prompt) for s in CONFIG.get("thresholds",{}).get("sensitive_tasks",[]))
                if code != 200 or sensitive:
                    members = list(CONFIG["providers"].keys())
                    code, out = committee(messages, members)
                    broadcast_insight(kind, "committee", prompt)
                return self._send(code, out, "application/json")

            elif mode == "committee":
                members = list(CONFIG["providers"].keys())
                code, out = committee(messages, members)
                broadcast_insight(kind, "committee", prompt)
                return self._send(code, out, "application/json")

            return self._send(400, {"error":"invalid mode"})

        if parsed.path == "/v1/anthropic/messages":
            messages = body.get("messages", [])
            code, out = provider_call("claude", messages, body.get("max_tokens",1024), body.get("temperature",0.2))
            broadcast_insight("anthropic", "claude", "anthropic-call")
            return self._send(code, out, "application/json")

        return self._send(404, {"error":"not found"})

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default=os.environ.get("BRIDGE_MODE","adaptive"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("BRIDGE_PORT","7010")))
    args = ap.parse_args()
    server = HTTPServer(("0.0.0.0", args.port), Handler)
    print(f"Surooh AI Bridge running on :{args.port} | mode={args.mode}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
