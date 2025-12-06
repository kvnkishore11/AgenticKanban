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

# Use environment variable first (from wt script), fallback to .ports.env
if [ -z "$FRONTEND_PORT" ]; then
    if [ -f "$PROJECT_ROOT/.ports.env" ]; then
        echo -e "${BLUE}Loading port configuration from .ports.env...${NC}"
        export $(grep -v '^#' "$PROJECT_ROOT/.ports.env" | xargs)
    else
        echo -e "${YELLOW}Warning: No FRONTEND_PORT set and no .ports.env found${NC}"
        FRONTEND_PORT=5173
    fi
else
    echo -e "${BLUE}Using FRONTEND_PORT from environment: $FRONTEND_PORT${NC}"
fi

# Ensure FRONTEND_PORT is set (final fallback)
FRONTEND_PORT=${FRONTEND_PORT:-5173}

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

# Change to project root directory
cd "$PROJECT_ROOT"

# Start the dev server
echo -e "${BLUE}Starting Vite dev server...${NC}"
echo -e "${GREEN}✓ Frontend server will be available at http://localhost:$FRONTEND_PORT${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start Vite in foreground (no background process, no monitoring)
npm run dev
