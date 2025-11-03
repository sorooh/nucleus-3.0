#!/bin/bash

echo "============================================="
echo "🧪 Testing Governance API - Phase 9.9"
echo "============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:5000/api/federation"

# Test authentication headers (using the test node credentials)
NODE_ID="side-node-main-test"
JWT_TOKEN="test-jwt-token"
HMAC_SIGNATURE="test-hmac"
RSA_SIGNATURE="test-rsa"

echo "🔐 Test Node: $NODE_ID"
echo ""

# Test 1: POST /governance - Analyze a decision
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: POST /governance - Analyze Decision"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/governance" \
  -H "Content-Type: application/json" \
  -H "x-node-id: $NODE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-hmac-signature: $HMAC_SIGNATURE" \
  -H "x-rsa-signature: $RSA_SIGNATURE" \
  -d '{
    "node": "side-node-test",
    "decision": "financial_transaction",
    "payload": {
      "amount": 5000,
      "currency": "USD",
      "to_account": "ACC-12345",
      "from_account": "ACC-67890",
      "description": "Payment for services"
    },
    "confidence": 0.85,
    "impact": 0.7
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC}: Decision analyzed successfully"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ FAIL${NC}: Failed to analyze decision"
  echo "$RESPONSE"
fi
echo ""

# Test 2: POST /governance - High-risk decision
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: POST /governance - High-Risk Decision"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/governance" \
  -H "Content-Type: application/json" \
  -H "x-node-id: $NODE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-hmac-signature: $HMAC_SIGNATURE" \
  -H "x-rsa-signature: $RSA_SIGNATURE" \
  -d '{
    "node": "side-node-test",
    "decision": "data_deletion",
    "payload": {
      "database": "production_db",
      "table": "users",
      "records_count": 10000,
      "reason": "GDPR compliance"
    },
    "confidence": 0.95,
    "impact": 0.95
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC}: High-risk decision analyzed"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ FAIL${NC}: Failed to analyze high-risk decision"
  echo "$RESPONSE"
fi
echo ""

# Test 3: POST /governance - Ethical decision
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: POST /governance - Ethical Decision"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/governance" \
  -H "Content-Type: application/json" \
  -H "x-node-id: $NODE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-hmac-signature: $HMAC_SIGNATURE" \
  -H "x-rsa-signature: $RSA_SIGNATURE" \
  -d '{
    "node": "side-node-test",
    "decision": "user_data_collection",
    "payload": {
      "data_types": ["location", "browsing_history", "contacts"],
      "purpose": "personalization",
      "consent_obtained": false
    },
    "confidence": 0.6,
    "impact": 0.8
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC}: Ethical decision analyzed"
  echo "$RESPONSE" | jq '.'
  
  # Check if CPE oversight is required
  if echo "$RESPONSE" | grep -q '"requires_cpe":true'; then
    echo -e "${YELLOW}⚠️  CPE Oversight Required${NC}"
  fi
else
  echo -e "${RED}❌ FAIL${NC}: Failed to analyze ethical decision"
  echo "$RESPONSE"
fi
echo ""

# Test 4: GET /governance/stats
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: GET /governance/stats"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X GET "$BASE_URL/governance/stats")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC}: Statistics retrieved successfully"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ FAIL${NC}: Failed to retrieve statistics"
  echo "$RESPONSE"
fi
echo ""

# Test 5: GET /governance/audit
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: GET /governance/audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X GET "$BASE_URL/governance/audit?limit=10")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC}: Audit log retrieved successfully"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ FAIL${NC}: Failed to retrieve audit log"
  echo "$RESPONSE"
fi
echo ""

# Test 6: GET /governance/audit (filter by verdict)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: GET /governance/audit?verdict=APPROVED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X GET "$BASE_URL/governance/audit?verdict=APPROVED&limit=5")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC}: Filtered audit log retrieved"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ FAIL${NC}: Failed to retrieve filtered audit log"
  echo "$RESPONSE"
fi
echo ""

# Test 7: GET /governance/config
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 7: GET /governance/config"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X GET "$BASE_URL/governance/config")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC}: Config retrieved successfully"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ FAIL${NC}: Failed to retrieve config"
  echo "$RESPONSE"
fi
echo ""

# Test 8: Invalid request (missing required fields)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Invalid Request - Missing Fields"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST "$BASE_URL/governance" \
  -H "Content-Type: application/json" \
  -H "x-node-id: $NODE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "x-hmac-signature: $HMAC_SIGNATURE" \
  -H "x-rsa-signature: $RSA_SIGNATURE" \
  -d '{
    "node": "side-node-test"
  }')

if echo "$RESPONSE" | grep -q '"success":false'; then
  echo -e "${GREEN}✅ PASS${NC}: Validation error handled correctly"
  echo "$RESPONSE" | jq '.'
else
  echo -e "${RED}❌ FAIL${NC}: Should have failed validation"
  echo "$RESPONSE"
fi
echo ""

echo "============================================="
echo "✅ Phase 9.9 Governance API Tests Complete"
echo "============================================="
