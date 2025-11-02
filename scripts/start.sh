#!/bin/bash

# Parse arguments
ADWID=""
if [ $# -gt 0 ]; then
    ADWID=$1
    # Validate ADWID format (8 alphanumeric characters)
    if [[ ! $ADWID =~ ^[a-zA-Z0-9]{8}$ ]]; then
        echo "Error: ADWID must be exactly 8 alphanumeric characters"
        echo "Usage: $0 [ADWID]"
        echo "  ADWID: 8-character identifier for worktree project"
        echo "  No argument: start main project"
        exit 1
    fi
fi

# Determine project directory
if [ -n "$ADWID" ]; then
    PROJECT_DIR="trees/$ADWID"
    if [ ! -d "$PROJECT_DIR" ]; then
        echo "Error: Worktree directory '$PROJECT_DIR' does not exist"
        exit 1
    fi
    echo "Starting worktree project: $ADWID"
else
    PROJECT_DIR="."
    echo "Starting main project"
fi

# Source port configuration if exists
if [ -f "$PROJECT_DIR/.ports.env" ]; then
    source "$PROJECT_DIR/.ports.env"
elif [ -f ".ports.env" ]; then
    source ".ports.env"
fi

# Port configuration with fallbacks
WEBSOCKET_PORT=${BACKEND_PORT:-8002}
CLIENT_PORT=${FRONTEND_PORT:-5173}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

if [ -n "$ADWID" ]; then
    echo -e "${BLUE}Starting Agentic Kanban Worktree ($ADWID) - Websocket + Frontend...${NC}"
else
    echo -e "${BLUE}Starting Agentic Kanban (Main Project) - Websocket + Frontend...${NC}"
fi

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

# Get the script's directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -n "$ADWID" ]; then
    PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )/trees/$ADWID"
else
    PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
fi

# Check if .env exists in project root
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}Warning: No .env file found in $PROJECT_ROOT.${NC}"
    echo "Please:"
    echo "  1. Create .env file in $PROJECT_ROOT"
    echo "  2. Add necessary environment variables for ADW workflows"
    echo "  3. Set BACKEND_PORT for websocket trigger (optional, defaults to 8002)"
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

# Start REST API server
echo -e "${GREEN}Starting REST API server on port $WEBSOCKET_PORT...${NC}"
cd "$PROJECT_ROOT/app/server"
export BACKEND_PORT=$WEBSOCKET_PORT
export FRONTEND_PORT=$CLIENT_PORT
/Users/kvnkishore/anaconda3/bin/python server.py &
API_SERVER_PID=$!

# Wait for API server to start
echo "Waiting for REST API server to start..."
sleep 3

# Check if API server is running
if ! kill -0 $API_SERVER_PID 2>/dev/null; then
    echo -e "${RED}REST API server failed to start!${NC}"
    exit 1
fi

# Start websocket trigger
echo -e "${GREEN}Starting websocket trigger on port $((WEBSOCKET_PORT + 1))...${NC}"
cd "$PROJECT_ROOT"
export BACKEND_PORT=$((WEBSOCKET_PORT + 1))
uv run adws/adw_triggers/trigger_websocket.py &
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
echo -e "${GREEN}Starting frontend server on port $CLIENT_PORT...${NC}"
cd "$PROJECT_ROOT"
export FRONTEND_PORT=$CLIENT_PORT
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
if [ -n "$ADWID" ]; then
    echo -e "${BLUE}Worktree Project: $ADWID${NC}"
fi
echo -e "${BLUE}Frontend:          http://localhost:$CLIENT_PORT${NC}"
echo -e "${BLUE}REST API:          http://localhost:$WEBSOCKET_PORT${NC}"
echo -e "${BLUE}API Health Check:  http://localhost:$WEBSOCKET_PORT/health${NC}"
echo -e "${BLUE}ADWs List:         http://localhost:$WEBSOCKET_PORT/api/adws/list${NC}"
echo -e "${BLUE}Websocket Trigger: http://localhost:$((WEBSOCKET_PORT + 1))${NC}"
echo -e "${BLUE}Websocket Health:  http://localhost:$((WEBSOCKET_PORT + 1))/health${NC}"
echo -e "${BLUE}Webhook Endpoint:  http://localhost:$((WEBSOCKET_PORT + 1))/gh-webhook${NC}"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for user to press Ctrl+C
wait