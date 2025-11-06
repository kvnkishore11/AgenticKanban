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

# Check if FRONTEND_PORT is set
if [ -z "$FRONTEND_PORT" ]; then
    echo -e "${RED}Error: FRONTEND_PORT not defined in .ports.env${NC}"
    exit 1
fi

echo -e "${BLUE}Starting Frontend Server on port $FRONTEND_PORT...${NC}"

# Kill any existing process on the frontend port
echo -e "${YELLOW}Checking for existing processes on port $FRONTEND_PORT...${NC}"
pid=$(lsof -ti:$FRONTEND_PORT 2>/dev/null)
if [ ! -z "$pid" ]; then
    echo -e "${YELLOW}Killing existing process (PID: $pid) on port $FRONTEND_PORT...${NC}"
    kill -9 $pid 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓ Killed process on port $FRONTEND_PORT${NC}"
else
    echo -e "${GREEN}✓ Port $FRONTEND_PORT is available${NC}"
fi

# Kill any lingering vite processes
echo -e "${YELLOW}Checking for lingering vite processes...${NC}"
pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✓ Killed lingering vite processes${NC}"

# Change to project root directory
cd "$PROJECT_ROOT"

# Auto-restart configuration
MAX_RESTART_ATTEMPTS=5
RESTART_DELAY=3
restart_count=0
last_restart_time=0

# Function to start the dev server with monitoring
start_dev_server() {
    echo -e "${BLUE}Starting Vite dev server (Attempt $((restart_count + 1))/${MAX_RESTART_ATTEMPTS})...${NC}"
    npm run dev &
    DEV_SERVER_PID=$!
    echo -e "${GREEN}✓ Dev server started with PID: $DEV_SERVER_PID${NC}"
}

# Function to check if process is running
is_process_running() {
    kill -0 $DEV_SERVER_PID 2>/dev/null
    return $?
}

# Trap signals for graceful shutdown
trap 'echo -e "${YELLOW}Shutting down dev server...${NC}"; kill $DEV_SERVER_PID 2>/dev/null; exit 0' SIGINT SIGTERM

# Start the dev server initially
start_dev_server

# Monitor the process and auto-restart if it crashes
while true; do
    sleep 5

    # Check if the process is still running
    if ! is_process_running; then
        current_time=$(date +%s)
        time_since_last_restart=$((current_time - last_restart_time))

        # Reset restart count if it's been more than 60 seconds since last restart
        if [ $time_since_last_restart -gt 60 ]; then
            restart_count=0
        fi

        echo -e "${RED}✗ Dev server process stopped unexpectedly!${NC}"

        # Check if we've exceeded max restart attempts
        if [ $restart_count -ge $MAX_RESTART_ATTEMPTS ]; then
            echo -e "${RED}Error: Max restart attempts ($MAX_RESTART_ATTEMPTS) reached. Exiting.${NC}"
            exit 1
        fi

        restart_count=$((restart_count + 1))
        last_restart_time=$current_time

        echo -e "${YELLOW}Waiting ${RESTART_DELAY} seconds before restarting...${NC}"
        sleep $RESTART_DELAY

        # Clean up any lingering processes
        pkill -f "vite" 2>/dev/null

        # Restart the server
        start_dev_server
    fi
done
