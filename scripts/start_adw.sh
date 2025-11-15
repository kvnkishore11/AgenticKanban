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

# Check if WEBSOCKET_PORT is set
if [ -z "$WEBSOCKET_PORT" ]; then
    echo -e "${RED}Error: WEBSOCKET_PORT not defined in .ports.env${NC}"
    exit 1
fi

echo -e "${BLUE}Starting ADW WebSocket Trigger Server on port $WEBSOCKET_PORT...${NC}"

# Kill any existing process on the webhook port
echo -e "${YELLOW}Checking for existing processes on port $WEBSOCKET_PORT...${NC}"
pid=$(lsof -ti:$WEBSOCKET_PORT 2>/dev/null)
if [ ! -z "$pid" ]; then
    echo -e "${YELLOW}Killing existing process (PID: $pid) on port $WEBSOCKET_PORT...${NC}"
    kill -9 $pid 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓ Killed process on port $WEBSOCKET_PORT${NC}"
else
    echo -e "${GREEN}✓ Port $WEBSOCKET_PORT is available${NC}"
fi

# Kill any lingering trigger_websocket processes
echo -e "${YELLOW}Checking for lingering ADW WebSocket processes...${NC}"
pkill -f "trigger_websocket.py" 2>/dev/null && echo -e "${GREEN}✓ Killed lingering WebSocket processes${NC}"

# Change to project root directory
cd "$PROJECT_ROOT"

# Export WEBSOCKET_PORT for the WebSocket server
export WEBSOCKET_PORT=$WEBSOCKET_PORT

# Start the ADW WebSocket trigger server
echo -e "${BLUE}Starting ADW WebSocket server...${NC}"
echo -e "${BLUE}WebSocket endpoint:    ws://localhost:$WEBSOCKET_PORT/ws/trigger${NC}"
echo -e "${BLUE}Health check endpoint: http://localhost:$WEBSOCKET_PORT/health${NC}"
echo -e "${BLUE}ADWs List endpoint:    http://localhost:$WEBSOCKET_PORT/api/adws/list${NC}"
echo ""
echo -e "${YELLOW}Note: This server listens for WebSocket connections from the Kanban frontend.${NC}"
echo ""

uv run adws/adw_triggers/trigger_websocket.py
