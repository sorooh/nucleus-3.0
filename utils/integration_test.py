#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Surooh Academy - Integration Test (Professional Edition)
Author: Surooh Holding Group
Usage:
  1) Set environment variables (or .env loaded by your runner):
     BASE_URL, JWT_TOKEN, HMAC_SECRET
     Optional:
       CORE_HEALTH, ACADEMY_HEALTH
  2) Run:
     python utils/integration_test.py
"""

import os
import sys
import time
import hmac
import json
import hashlib
import random
import string
import requests
from datetime import datetime

try:
    from colorama import init as colorama_init, Fore, Style
    from tabulate import tabulate
except ImportError:
    print("Installing required packages... (colorama, tabulate, requests)")
    os.system(f"{sys.executable} -m pip install --quiet colorama tabulate requests")
    from colorama import init as colorama_init, Fore, Style
    from tabulate import tabulate

colorama_init(autoreset=True)

# ============ Config ============
BASE_URL       = os.getenv("BASE_URL", "http://localhost:8000")  # Gateway / Core Edge
JWT_TOKEN      = os.getenv("JWT_TOKEN", "REPLACE_ME_JWT")
HMAC_SECRET    = os.getenv("HMAC_SECRET", "REPLACE_ME_HMAC")

# Health endpoints (override if separate)
CORE_HEALTH    = os.getenv("CORE_HEALTH",     f"{BASE_URL}/health")
ACADEMY_HEALTH = os.getenv("ACADEMY_HEALTH",  f"{BASE_URL}/health")

# Gateway contract (can be adjusted if your routes differ)
ROUTES = {
    "tenant_create": f"{BASE_URL}/api/tenants",            # POST {name, slug}
    "memory_ingest": f"{BASE_URL}/api/memory/ingest",      # POST {uri|content, type}
    "bot_create":    f"{BASE_URL}/api/academy/bots",       # POST {type, name}
    "bot_get":       f"{BASE_URL}/api/academy/bots",       # GET  /:id
    "train_start":   f"{BASE_URL}/api/academy/train",      # POST {bot_id, dataset_ref}
}

TIMEOUT = 30  # seconds for HTTP calls

# ============ Helpers ============
def sign_payload(payload, secret):
    if not isinstance(payload, str):
        payload = json.dumps(payload, separators=(',', ':'))
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

def auth_headers(payload=None):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {JWT_TOKEN}",
    }
    if payload is not None:
        headers["X-SRH-SIGNATURE"] = sign_payload(payload, HMAC_SECRET)
    return headers

def random_slug(prefix="tenant"):
    sfx = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}-{sfx}"

def http_post(url, payload):
    return requests.post(url, headers=auth_headers(payload), data=json.dumps(payload), timeout=TIMEOUT)

def http_get(url):
    return requests.get(url, headers=auth_headers(), timeout=TIMEOUT)

# ============ Pretty Printing ============
def banner(title):
    line = "═" * 60
    print(Fore.CYAN + f"╔{line}╗")
    print(Fore.CYAN + f"║{title.center(60)}║")
    print(Fore.CYAN + f"╚{line}╝\n" + Style.RESET_ALL)

def step_row(table, name, ok, elapsed, details):
    status = (Fore.GREEN + "✅ OK") if ok else (Fore.RED + "❌ FAIL")
    table.append([name, status, f"{elapsed:.2f}", details])

def summarize(table, started_at):
    ok_count = sum(1 for r in table if "✅" in r[1])
    total = len(table)
    overall = Fore.GREEN + "✅ SUCCESS" if ok_count == total else Fore.RED + "❌ PARTIAL"
    print()
    print(tabulate(table, headers=["Step", "Status", "Time (s)", "Details"], tablefmt="fancy_grid"))
    print()
    print(Fore.CYAN + "─" * 60)
    print(f"Overall Result: {overall}  {Fore.WHITE}({ok_count}/{total} passed)")
    print(Fore.CYAN + "─" * 60 + Style.RESET_ALL)
    print(Fore.CYAN + f"Total Time: {time.time()-started_at:.2f} s\n")

# ============ Main Flow ============
def main():
    banner("Surooh Academy Integration Test")
    results = []
    t0 = time.time()

    # 1) Health Check – Core
    s = time.time()
    ok, detail = False, ""
    try:
        r = http_get(CORE_HEALTH)
        ok = (r.status_code == 200 and "ok" in r.text.lower())
        detail = "Core alive" if ok else f"HTTP {r.status_code}: {r.text[:120]}"
    except Exception as e:
        detail = f"Error: {e}"
    step_row(results, "Health Check (Core)", ok, time.time()-s, detail)

    # 2) Health Check – Academy
    s = time.time()
    ok2, detail2 = False, ""
    try:
        r = http_get(ACADEMY_HEALTH)
        ok2 = (r.status_code == 200 and "ok" in r.text.lower())
        detail2 = "Academy alive" if ok2 else f"HTTP {r.status_code}: {r.text[:120]}"
    except Exception as e:
        detail2 = f"Error: {e}"
    step_row(results, "Health Check (Academy)", ok2, time.time()-s, detail2)

    # Early exit if both down
    if not (ok or ok2):
        summarize(results, t0)
        sys.exit(1)

    # 3) Tenant Creation
    s = time.time()
    tenant_id = None
    payload = {"name": "Test Tenant", "slug": random_slug("su-test"), "status": "active"}
    try:
        r = http_post(ROUTES["tenant_create"], payload)
        if r.status_code in (200, 201):
            data = r.json() if r.headers.get("content-type","").startswith("application/json") else {}
            tenant_id = data.get("id") or data.get("tenant_id")
            ok = bool(tenant_id)
            detail = f"ID: {tenant_id or 'N/A'}"
        else:
            ok = False
            detail = f"HTTP {r.status_code}: {r.text[:120]}"
    except Exception as e:
        ok, detail = False, f"Error: {e}"
    step_row(results, "Tenant Creation", ok, time.time()-s, detail)

    # 4) Knowledge Upload (inline content)
    s = time.time()
    knowledge_ok = False
    payload = {
        "type": "json",
        "content": {"policy": "Surooh Constitution", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()+"Z"}
    }
    try:
        r = http_post(ROUTES["memory_ingest"], payload)
        knowledge_ok = (r.status_code in (200, 201, 202))
        detail = "policy.json ingested" if knowledge_ok else f"HTTP {r.status_code}: {r.text[:120]}"
    except Exception as e:
        detail = f"Error: {e}"
    step_row(results, "Knowledge Upload", knowledge_ok, time.time()-s, detail)

    # 5) Bot Creation
    s = time.time()
    bot_id = None
    payload = {"type": "professor", "name": "professor_aurora"}
    try:
        r = http_post(ROUTES["bot_create"], payload)
        if r.status_code in (200, 201):
            data = r.json() if r.headers.get("content-type","").startswith("application/json") else {}
            bot_id = data.get("id") or data.get("bot_id")
            ok = bool(bot_id)
            detail = f"Bot ID: {bot_id or 'N/A'}"
        else:
            ok = False
            detail = f"HTTP {r.status_code}: {r.text[:120]}"
    except Exception as e:
        ok, detail = False, f"Error: {e}"
    step_row(results, "Bot Creation", ok, time.time()-s, detail)

    # 6) Training Start (if bot exists)
    s = time.time()
    train_ok = False
    score = None
    if bot_id:
        payload = {"bot_id": bot_id, "dataset_ref": "intro-dataset"}
        try:
            r = http_post(ROUTES["train_start"], payload)
            if r.status_code in (200, 201, 202):
                if r.headers.get("content-type","").startswith("application/json"):
                    data = r.json()
                    score = data.get("score")
                train_ok = True
                detail = f"Score: {score if score is not None else 'started'}"
            else:
                detail = f"HTTP {r.status_code}: {r.text[:120]}"
        except Exception as e:
            detail = f"Error: {e}"
    else:
        detail = "Skipped: no bot_id"
    step_row(results, "Training Start", train_ok, time.time()-s, detail)

    summarize(results, t0)

if __name__ == "__main__":
    main()
