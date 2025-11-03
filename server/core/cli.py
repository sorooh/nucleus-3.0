#!/usr/bin/env python3
"""
🧠 Surooh Core - CLI Interface
واجهة سطر الأوامر لنواة التنفيذ - تستخدم من TypeScript عبر child_process
"""

import sys
import json
import argparse
from typing import Optional
from dispatcher import dispatcher

def dispatch_task(task: str, payload: Optional[str] = None):
    """تنفيذ مهمة عبر Dispatcher"""
    payload_dict = None
    if payload:
        try:
            payload_dict = json.loads(payload)
        except json.JSONDecodeError:
            return {"success": False, "error": "Invalid payload JSON"}
    
    result = dispatcher.dispatch_task(task, payload_dict)
    return result

def health_check():
    """فحص صحة النظام"""
    return dispatcher.health_check()

def main():
    parser = argparse.ArgumentParser(description='Surooh Core CLI')
    parser.add_argument('command', choices=['dispatch', 'health'], help='Command to execute')
    parser.add_argument('--task', help='Task name for dispatch command')
    parser.add_argument('--payload', help='Payload JSON for dispatch command')
    
    args = parser.parse_args()
    
    if args.command == 'dispatch':
        if not args.task:
            print(json.dumps({"success": False, "error": "Task is required"}))
            sys.exit(1)
        
        result = dispatch_task(args.task, args.payload)
        print(json.dumps(result, ensure_ascii=False))
    
    elif args.command == 'health':
        result = health_check()
        print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
