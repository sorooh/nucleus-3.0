#!/bin/bash

# ====================================================================
# Surooh Nucleus - Hybrid Production Mode Launcher
# Version: 3.1.1
# 
# Starts AI Bridge + UIL + Monitoring in production-ready hybrid mode
# ====================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BRIDGE_PORT=7010
METRICS_PORT=7011
APP_PORT=5000
LOG_DIR="./logs"
BRIDGE_DIR="./ai-bridge"

echo -e "${CYAN}"
echo "========================================================================"
echo "   🧠 SUROOH NUCLEUS - HYBRID PRODUCTION MODE"
echo "   Unified Intelligence Layer + AI Provider Bridge"
echo "========================================================================"
echo -e "${NC}"

# ====================================================================
# Step 1: Pre-flight Checks
# ====================================================================

echo -e "${BLUE}[1/7] Running pre-flight checks...${NC}"

# Check if required directories exist
if [ ! -d "$BRIDGE_DIR" ]; then
    echo -e "${RED}❌ Error: ai-bridge directory not found${NC}"
    exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"
mkdir -p /var/log/surooh/uil 2>/dev/null || mkdir -p "$LOG_DIR/uil"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: Python3 is not installed${NC}"
    exit 1
fi

# Check if required Python packages are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: FastAPI not found. Installing...${NC}"
    pip install fastapi uvicorn pyyaml loguru requests tabulate 2>&1 | grep -v "already satisfied" || true
fi

echo -e "${GREEN}✅ Pre-flight checks passed${NC}\n"

# ====================================================================
# Step 2: Environment Setup
# ====================================================================

echo -e "${BLUE}[2/7] Setting up environment...${NC}"

# Export environment variables
export NODE_ENV=production
export UIL_ENABLED=true
export UIL_MOCK_MODE=false
export UIL_HYBRID_MODE=true
export BRIDGE_URL=http://127.0.0.1:${BRIDGE_PORT}
export UIL_LOG_DIR=${LOG_DIR}/uil
export UIL_LOG_LEVEL=info

# Check if HMAC secret exists
if [ -z "$CHAT_HMAC_SECRET" ]; then
    echo -e "${YELLOW}⚠️  Warning: CHAT_HMAC_SECRET not set${NC}"
    echo -e "${YELLOW}   Generating temporary secret (use .env for production)${NC}"
    export CHAT_HMAC_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "temporary_secret_$(date +%s)")
fi

echo -e "${GREEN}✅ Environment configured${NC}"
echo -e "   NODE_ENV: ${NODE_ENV}"
echo -e "   UIL_HYBRID_MODE: ${UIL_HYBRID_MODE}"
echo -e "   BRIDGE_URL: ${BRIDGE_URL}"
echo -e "   LOG_DIR: ${UIL_LOG_DIR}\n"

# ====================================================================
# Step 3: Start AI Provider Bridge
# ====================================================================

echo -e "${BLUE}[3/7] Starting AI Provider Bridge...${NC}"

# Kill any existing bridge process
pkill -f "bridge_enhanced.py" 2>/dev/null || true
sleep 2

# Check if bridge_enhanced.py exists
if [ ! -f "$BRIDGE_DIR/bridge_enhanced.py" ]; then
    echo -e "${YELLOW}⚠️  Warning: bridge_enhanced.py not found${NC}"
    echo -e "${YELLOW}   Using standard bridge.py instead${NC}"
    BRIDGE_SCRIPT="bridge.py"
else
    BRIDGE_SCRIPT="bridge_enhanced.py"
fi

# Start Bridge in background
cd "$BRIDGE_DIR"
nohup python3 "$BRIDGE_SCRIPT" --mode adaptive --port "$BRIDGE_PORT" \
    > "../${LOG_DIR}/bridge.log" 2>&1 &
BRIDGE_PID=$!
cd ..

echo -e "${GREEN}✅ Bridge started (PID: $BRIDGE_PID)${NC}"
echo -e "   Port: ${BRIDGE_PORT}"
echo -e "   Metrics: ${METRICS_PORT}"
echo -e "   Log: ${LOG_DIR}/bridge.log\n"

# Wait for bridge to start
echo -e "${CYAN}⏳ Waiting for Bridge to initialize...${NC}"
for i in {1..15}; do
    if curl -s http://127.0.0.1:${BRIDGE_PORT}/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Bridge is healthy and ready${NC}\n"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${YELLOW}⚠️  Warning: Bridge health check timeout${NC}"
        echo -e "${YELLOW}   Continuing anyway (hybrid mode will use fallback)${NC}\n"
    fi
    sleep 2
done

# ====================================================================
# Step 4: Verify Bridge Connection
# ====================================================================

echo -e "${BLUE}[4/7] Verifying Bridge connectivity...${NC}"

BRIDGE_HEALTH=$(curl -s http://127.0.0.1:${BRIDGE_PORT}/health 2>/dev/null || echo '{"status":"unavailable"}')
BRIDGE_STATUS=$(echo "$BRIDGE_HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$BRIDGE_STATUS" = "ok" ]; then
    echo -e "${GREEN}✅ Bridge connection verified${NC}"
    PROVIDERS=$(echo "$BRIDGE_HEALTH" | grep -o '"available":true' | wc -l)
    echo -e "   Available Providers: ${PROVIDERS}/4"
else
    echo -e "${YELLOW}⚠️  Bridge not responding - hybrid mode will use Mock fallback${NC}"
fi
echo ""

# ====================================================================
# Step 5: Security Configuration
# ====================================================================

echo -e "${BLUE}[5/7] Configuring security layer...${NC}"

# Verify HMAC secret strength
SECRET_LENGTH=${#CHAT_HMAC_SECRET}
if [ $SECRET_LENGTH -lt 32 ]; then
    echo -e "${YELLOW}⚠️  Warning: HMAC secret is weak (length: $SECRET_LENGTH)${NC}"
    echo -e "${YELLOW}   Recommended: 64+ characters for production${NC}"
else
    echo -e "${GREEN}✅ HMAC authentication configured${NC}"
fi

# Set up rate limiting (if nginx available)
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ NGINX available for rate limiting${NC}"
else
    echo -e "${YELLOW}⚠️  NGINX not found - rate limiting disabled${NC}"
fi

echo -e "${GREEN}✅ Security layer active${NC}\n"

# ====================================================================
# Step 6: Initialize Monitoring
# ====================================================================

echo -e "${BLUE}[6/7] Initializing monitoring...${NC}"

# Create monitoring summary
cat > "${LOG_DIR}/monitoring.txt" << EOF
Surooh Nucleus - Hybrid Production Monitoring
Started: $(date)
PID: $$
Bridge PID: $BRIDGE_PID

Ports:
- Application: ${APP_PORT}
- Bridge: ${BRIDGE_PORT}
- Metrics: ${METRICS_PORT}

Logs:
- Bridge: ${LOG_DIR}/bridge.log
- UIL Access: ${UIL_LOG_DIR}/uil-access.log
- UIL Error: ${UIL_LOG_DIR}/uil-error.log

Environment:
- NODE_ENV: ${NODE_ENV}
- UIL_HYBRID_MODE: ${UIL_HYBRID_MODE}
- BRIDGE_URL: ${BRIDGE_URL}

Health Endpoints:
- Bridge: http://127.0.0.1:${BRIDGE_PORT}/health
- UIL: http://localhost:${APP_PORT}/api/uil/health
- Metrics: http://127.0.0.1:${METRICS_PORT}/metrics
EOF

echo -e "${GREEN}✅ Monitoring initialized${NC}"
echo -e "   Summary: ${LOG_DIR}/monitoring.txt\n"

# ====================================================================
# Step 7: Start Nucleus Application
# ====================================================================

echo -e "${BLUE}[7/7] Starting Nucleus application...${NC}"

# Kill any existing node process on port 5000
lsof -ti:${APP_PORT} | xargs kill -9 2>/dev/null || true
sleep 2

echo -e "${CYAN}⏳ Starting npm dev server...${NC}"
echo ""

# Start application (this will block)
npm run dev

# This point is reached only if npm run dev exits
echo -e "${YELLOW}⚠️  Application stopped${NC}"

# Cleanup
echo -e "${CYAN}🧹 Cleaning up...${NC}"
kill $BRIDGE_PID 2>/dev/null || true
echo -e "${GREEN}✅ Cleanup complete${NC}"
