#!/bin/bash

# ====================================================================
# Surooh Nucleus - Hybrid Mode Shutdown Script
# Version: 3.1.1
# ====================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "========================================================================"
echo "   🛑 SUROOH NUCLEUS - HYBRID MODE SHUTDOWN"
echo "========================================================================"
echo -e "${NC}"

echo -e "${YELLOW}Stopping all Nucleus services...${NC}\n"

# Stop Bridge
echo -e "${CYAN}[1/3] Stopping AI Provider Bridge...${NC}"
pkill -f "bridge_enhanced.py" 2>/dev/null && echo -e "${GREEN}✅ Bridge stopped${NC}" || echo -e "${YELLOW}⚠️  No bridge process found${NC}"

# Stop Node application
echo -e "${CYAN}[2/3] Stopping Nucleus application...${NC}"
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✅ Application stopped${NC}" || echo -e "${YELLOW}⚠️  No application process found${NC}"

# Stop any remaining processes
echo -e "${CYAN}[3/3] Cleaning up remaining processes...${NC}"
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo -e "${CYAN}📊 Check logs in: ./logs/${NC}"
echo ""
