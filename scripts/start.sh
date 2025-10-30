#!/bin/bash

# Source port configuration if exists
[ -f ".ports.env" ] && source .ports.env

# Port configuration with fallbacks
WEBSOCKET_PORT=${PORT:-8002}
CLIENT_PORT=${FRONTEND_PORT:-5173}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Agentic Kanban (Websocket + Frontend)...${NC}"

# Function to kill process on port
kill_port() {
    local port=$1
    local process_name=$2
    
    # Find process using the port
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Found $process_name running on port $port (PID: $pid). Killing it...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
        echo -e "${GREEN}$process_name on port $port has been terminated.${NC}"
    fi
}

# Kill any existing processes on our ports
kill_port $WEBSOCKET_PORT "websocket trigger"
kill_port $CLIENT_PORT "frontend server"

# Get the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Check if .env exists in project root
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}Warning: No .env file found in project root.${NC}"
    echo "Please:"
    echo "  1. Create .env file in project root"
    echo "  2. Add necessary environment variables for ADW workflows"
    echo "  3. Set PORT=8002 for websocket trigger (optional, defaults to 8002)"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down services...${NC}"
    
    # Kill all child processes
    jobs -p | xargs -r kill 2>/dev/null
    
    # Wait for processes to terminate
    wait
    
    echo -e "${GREEN}Services stopped successfully.${NC}"
    exit 0
}

# Trap EXIT, INT, and TERM signals
trap cleanup EXIT INT TERM

# Start websocket trigger
echo -e "${GREEN}Starting websocket trigger...${NC}"
cd "$PROJECT_ROOT"
uv run adws/adw_triggers/trigger_webhook.py &
WEBSOCKET_PID=$!

# Wait for websocket trigger to start
echo "Waiting for websocket trigger to start..."
sleep 3

# Check if websocket trigger is running
if ! kill -0 $WEBSOCKET_PID 2>/dev/null; then
    echo -e "${RED}Websocket trigger failed to start!${NC}"
    exit 1
fi

# Start frontend
echo -e "${GREEN}Starting frontend server...${NC}"
cd "$PROJECT_ROOT"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Frontend failed to start!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Services started successfully!${NC}"
echo -e "${BLUE}Frontend:         http://localhost:$CLIENT_PORT${NC}"
echo -e "${BLUE}Websocket Trigger: http://localhost:$WEBSOCKET_PORT${NC}"
echo -e "${BLUE}Health Check:     http://localhost:$WEBSOCKET_PORT/health${NC}"
echo -e "${BLUE}Webhook Endpoint: http://localhost:$WEBSOCKET_PORT/gh-webhook${NC}"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for user to press Ctrl+C
wait