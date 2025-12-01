#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load ports from .ports.env
if [ -f "$PROJECT_ROOT/.ports.env" ]; then
    echo -e "${BLUE}Loading port configuration from .ports.env...${NC}"
    export $(grep -v '^#' "$PROJECT_ROOT/.ports.env" | xargs)
else
    echo -e "${RED}Error: .ports.env file not found!${NC}"
    exit 1
fi

# Check if ADW_PORT is set, fallback to WEBSOCKET_PORT if not
if [ -z "$ADW_PORT" ]; then
    if [ -z "$WEBSOCKET_PORT" ]; then
        echo -e "${RED}Error: Neither ADW_PORT nor WEBSOCKET_PORT defined in .ports.env${NC}"
        exit 1
    fi
    echo -e "${YELLOW}ADW_PORT not defined, using WEBSOCKET_PORT ($WEBSOCKET_PORT)${NC}"
    ADW_PORT=$WEBSOCKET_PORT
fi

echo -e "${BLUE}Starting ADW WebSocket Trigger Server on port $ADW_PORT...${NC}"

# Kill any existing process on the webhook port
echo -e "${YELLOW}Checking for existing processes on port $ADW_PORT...${NC}"
pid=$(lsof -ti:$ADW_PORT 2>/dev/null)
if [ ! -z "$pid" ]; then
    echo -e "${YELLOW}Killing existing process (PID: $pid) on port $ADW_PORT...${NC}"
    kill -9 $pid 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓ Killed process on port $ADW_PORT${NC}"
else
    echo -e "${GREEN}✓ Port $ADW_PORT is available${NC}"
fi

# Kill any lingering trigger_websocket processes
echo -e "${YELLOW}Checking for lingering ADW WebSocket processes...${NC}"
pkill -f "trigger_websocket.py" 2>/dev/null && echo -e "${GREEN}✓ Killed lingering WebSocket processes${NC}"

# Change to project root directory
cd "$PROJECT_ROOT"

# Export ADW_PORT for the WebSocket server
export ADW_PORT=$ADW_PORT

# Start the ADW WebSocket trigger server
echo -e "${BLUE}Starting ADW WebSocket server...${NC}"
echo -e "${BLUE}WebSocket endpoint:    ws://localhost:$ADW_PORT/ws/trigger${NC}"
echo -e "${BLUE}Health check endpoint: http://localhost:$ADW_PORT/health${NC}"
echo -e "${BLUE}ADWs List endpoint:    http://localhost:$ADW_PORT/api/adws/list${NC}"
echo ""
echo -e "${YELLOW}Note: This server listens for WebSocket connections from the Kanban frontend.${NC}"
echo ""

uv run adws/adw_triggers/trigger_websocket.py
