#!/usr/bin/env python3
"""Test AI Bridge functionality"""
import os
import json

# Set test API key
os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY', '')
os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY', '')
os.environ['MISTRAL_API_KEY'] = os.getenv('MISTRAL_API_KEY', '')
os.environ['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY', '')

from bridge import classify_task, pick_provider, provider_call

# Test 1: Classification
print("=== Test 1: Task Classification ===")
test_cases = [
    ("Analyze the impact of AI", "analysis"),
    ("Hello, how are you?", "conversation"),
    ("Summarize this document", "summarization"),
    ("Plan a marketing strategy", "planning"),
    ("Write a Python function", "coding"),
]

for prompt, expected in test_cases:
    result = classify_task(prompt)
    status = "✅" if result == expected else "❌"
    print(f"{status} '{prompt}' → {result} (expected: {expected})")

# Test 2: Provider Selection
print("\n=== Test 2: Provider Selection ===")
for task_type in ["analysis", "conversation", "summarization", "planning", "coding"]:
    provider = pick_provider(task_type)
    print(f"✓ {task_type}: {provider}")

# Test 3: Actual API Call (OpenAI only if key available)
if os.getenv('OPENAI_API_KEY'):
    print("\n=== Test 3: OpenAI Provider Call ===")
    try:
        messages = [{"role": "user", "content": "Say 'Hello World' in one sentence."}]
        code, body = provider_call("openai", messages, max_tokens=20)
        print(f"Status Code: {code}")
        if code == 200:
            data = json.loads(body)
            if 'choices' in data:
                print(f"✅ Response: {data['choices'][0]['message']['content']}")
        else:
            print(f"❌ Error: {body[:200]}")
    except Exception as e:
        print(f"❌ Exception: {e}")
else:
    print("\n⚠️ Test 3: Skipped (No OPENAI_API_KEY)")

print("\n=== All Tests Complete ===")
