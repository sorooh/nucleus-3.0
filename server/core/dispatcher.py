#!/usr/bin/env python3
"""
Phase Ω.5 - Real Core Dispatcher
Executes real tasks without mock data
"""
import subprocess
import json
import shlex
import sys

ALLOWED_TASKS = {
    "analyze": "python3 -m tools.analyze",
    "build": "python3 -m tools.build",
    "deploy": "python3 -m tools.deploy",
}


def run_task(task: str, args: dict):
    """Execute real task with actual subprocess execution"""
    if task not in ALLOWED_TASKS:
        return {"ok": False, "error": f"Task not allowed: {task}"}

    cmd = f"{ALLOWED_TASKS[task]} '{json.dumps(args)}'"
    try:
        proc = subprocess.run(
            shlex.split(cmd),
            capture_output=True,
            text=True,
            timeout=300
        )
        return {
            "ok": proc.returncode == 0,
            "exit": proc.returncode,
            "stdout": proc.stdout[-4000:],
            "stderr": proc.stderr[-4000:]
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "Timeout after 300 seconds"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"ok": False, "error": "Usage: dispatcher.py <task> <args_json>"}))
        sys.exit(1)
    
    task_name = sys.argv[1]
    task_args = json.loads(sys.argv[2])
    result = run_task(task_name, task_args)
    print(json.dumps(result))
