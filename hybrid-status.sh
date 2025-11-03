#!/bin/bash

# ====================================================================
# Surooh Nucleus - Hybrid Mode Status Check
# Version: 3.1.1
# ====================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "========================================================================"
echo "   📊 SUROOH NUCLEUS - HYBRID MODE STATUS"
echo "========================================================================"
echo -e "${NC}\n"

# Check Bridge
echo -e "${BLUE}[Bridge Status]${NC}"
BRIDGE_HEALTH=$(curl -s http://127.0.0.1:7010/health 2>/dev/null || echo '{"status":"down"}')
BRIDGE_STATUS=$(echo "$BRIDGE_HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "down")

if [ "$BRIDGE_STATUS" = "ok" ]; then
    echo -e "${GREEN}✅ Bridge: Running${NC}"
    echo -e "   URL: http://127.0.0.1:7010"
    echo -e "   Health: $BRIDGE_HEALTH"
else
    echo -e "${RED}❌ Bridge: Not responding${NC}"
    echo -e "   Expected URL: http://127.0.0.1:7010/health"
fi
echo ""

# Check UIL
echo -e "${BLUE}[UIL Status]${NC}"
UIL_HEALTH=$(curl -s http://localhost:5000/api/uil/health 2>/dev/null || echo '{"healthy":false}')
UIL_STATUS=$(echo "$UIL_HEALTH" | grep -o '"healthy":[^,}]*' | cut -d':' -f2 2>/dev/null || echo "false")

if [ "$UIL_STATUS" = "true" ]; then
    echo -e "${GREEN}✅ UIL: Healthy${NC}"
    echo -e "   URL: http://localhost:5000/api/uil"
    echo -e "   Health: $UIL_HEALTH"
else
    echo -e "${RED}❌ UIL: Not healthy${NC}"
    echo -e "   Health: $UIL_HEALTH"
fi
echo ""

# Check Application
echo -e "${BLUE}[Application Status]${NC}"
APP_RUNNING=$(lsof -ti:5000 2>/dev/null | wc -l)
if [ "$APP_RUNNING" -gt 0 ]; then
    echo -e "${GREEN}✅ Application: Running on port 5000${NC}"
    APP_PID=$(lsof -ti:5000 2>/dev/null | head -1)
    echo -e "   PID: $APP_PID"
else
    echo -e "${RED}❌ Application: Not running${NC}"
fi
echo ""

# Check Logs
echo -e "${BLUE}[Recent Logs]${NC}"
if [ -f "./logs/bridge.log" ]; then
    echo -e "${CYAN}Bridge Log (last 3 lines):${NC}"
    tail -3 ./logs/bridge.log 2>/dev/null | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  No bridge log found${NC}"
fi
echo ""

if [ -f "./logs/uil/uil-error.log" ]; then
    ERROR_COUNT=$(wc -l < ./logs/uil/uil-error.log 2>/dev/null || echo 0)
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  UIL Errors: $ERROR_COUNT${NC}"
        echo -e "${CYAN}Latest error:${NC}"
        tail -1 ./logs/uil/uil-error.log 2>/dev/null | sed 's/^/   /'
    else
        echo -e "${GREEN}✅ No UIL errors${NC}"
    fi
else
    echo -e "${CYAN}ℹ️  No UIL error log yet${NC}"
fi
echo ""

# System Resources
echo -e "${BLUE}[System Resources]${NC}"
if command -v free &> /dev/null; then
    MEMORY=$(free -h | grep Mem | awk '{print $3 "/" $2}')
    echo -e "   Memory: $MEMORY"
fi

if [ "$APP_RUNNING" -gt 0 ]; then
    CPU=$(ps aux | grep $APP_PID | grep -v grep | awk '{print $3}' 2>/dev/null || echo "N/A")
    echo -e "   CPU (App): ${CPU}%"
fi
echo ""

# Summary
echo -e "${CYAN}========================================================================"
echo -e "   SUMMARY"
echo -e "========================================================================${NC}"

SERVICES_OK=0
SERVICES_TOTAL=3

[ "$BRIDGE_STATUS" = "ok" ] && ((SERVICES_OK++))
[ "$UIL_STATUS" = "true" ] && ((SERVICES_OK++))
[ "$APP_RUNNING" -gt 0 ] && ((SERVICES_OK++))

if [ $SERVICES_OK -eq $SERVICES_TOTAL ]; then
    echo -e "${GREEN}✅ All systems operational ($SERVICES_OK/$SERVICES_TOTAL)${NC}"
elif [ $SERVICES_OK -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Partial operation ($SERVICES_OK/$SERVICES_TOTAL services)${NC}"
else
    echo -e "${RED}❌ System down (0/$SERVICES_TOTAL services)${NC}"
fi

echo ""
