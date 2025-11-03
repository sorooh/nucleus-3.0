#!/bin/bash

# UIL Mock Mode Test Script
# Tests UIL API endpoints in mock mode without Bridge

echo "=========================================="
echo "   UIL MOCK MODE TEST"
echo "   Testing UIL without Bridge"
echo "=========================================="
echo ""

export UIL_MOCK_MODE=true

echo "✅ Mock Mode Enabled"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
URL="http://localhost:5000/api/uil"

echo -e "${BLUE}Test 1: Health Check${NC}"
curl -s -X GET "$URL/health" | jq .
echo ""

echo -e "${BLUE}Test 2: UIL Analyze (تحليل)${NC}"
curl -s -X POST "$URL/analyze" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"حلل بيانات المبيعات للربع الثالث","meta":{"module":"accounting"}}' | jq .
echo ""

echo -e "${BLUE}Test 3: UIL Chat (محادثة)${NC}"
curl -s -X POST "$URL/chat" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"مرحباً! كيف يمكنني مساعدتك؟","meta":{"module":"support"}}' | jq .
echo ""

echo -e "${BLUE}Test 4: UIL Summarize (تلخيص)${NC}"
curl -s -X POST "$URL/summarize" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"لخص الحملة التسويقية","meta":{"module":"marketing"}}' | jq .
echo ""

echo -e "${BLUE}Test 5: UIL Plan (تخطيط)${NC}"
curl -s -X POST "$URL/plan" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"ضع خطة لاختيار مورد جديد","meta":{"module":"procurement"}}' | jq .
echo ""

echo -e "${BLUE}Test 6: UIL Code (برمجة)${NC}"
curl -s -X POST "$URL/code" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"اكتب دالة للتحقق من البريد الإلكتروني","meta":{"module":"development"}}' | jq .
echo ""

echo -e "${BLUE}Test 7: Statistics${NC}"
curl -s -X GET "$URL/stats" | jq .
echo ""

echo "=========================================="
echo -e "${GREEN}✅ All Mock Mode Tests Complete${NC}"
echo "=========================================="
