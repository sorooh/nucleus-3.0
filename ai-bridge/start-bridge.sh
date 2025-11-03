#!/bin/bash
# Surooh AI Provider Bridge Launcher
# Usage: ./start-bridge.sh [mode] [port]

MODE=${1:-adaptive}
PORT=${2:-7010}

echo "🚀 Starting Surooh AI Provider Bridge..."
echo "   Mode: $MODE"
echo "   Port: $PORT"
echo ""

cd "$(dirname "$0")"

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found!"
    exit 1
fi

# Check required files
if [ ! -f "bridge.py" ]; then
    echo "❌ bridge.py not found!"
    exit 1
fi

if [ ! -f "providers_config.json" ]; then
    echo "❌ providers_config.json not found!"
    exit 1
fi

# Start the bridge
python3 bridge.py --mode "$MODE" --port "$PORT"
