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

# Start the frontend server
echo -e "${BLUE}Starting Vite dev server...${NC}"
npm run dev
