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
if [ -z "$ADW_PORT" ] && [ -z "$WEBSOCKET_PORT" ]; then
    if [ -f "$PROJECT_ROOT/.ports.env" ]; then
        echo -e "${BLUE}Loading port configuration from .ports.env...${NC}"
        export $(grep -v '^#' "$PROJECT_ROOT/.ports.env" | xargs)
    else
        echo -e "${YELLOW}Warning: No ADW_PORT set and no .ports.env found${NC}"
        ADW_PORT=8500
    fi
else
    echo -e "${BLUE}Using ADW_PORT from environment: ${ADW_PORT:-$WEBSOCKET_PORT}${NC}"
fi

# Ensure ADW_PORT is set (fallback chain: ADW_PORT -> WEBSOCKET_PORT -> default)
ADW_PORT=${ADW_PORT:-$WEBSOCKET_PORT}
ADW_PORT=${ADW_PORT:-8500}

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

# Note: We only kill the process on the specific port above to maintain worktree isolation.
# A global pkill would kill trigger_websocket.py processes from other worktrees.

# Change to project root directory
cd "$PROJECT_ROOT"

# Export ADW_PORT for the WebSocket server
export ADW_PORT=$ADW_PORT

# Run JSON to database migration (idempotent - skips already imported ADWs)
# This ensures any existing agents/{adw_id}/ JSON files are synced to the database
if [ "${SKIP_MIGRATION:-false}" != "true" ]; then
    echo -e "${BLUE}Checking for JSON files to migrate...${NC}"
    migration_output=$(uv run server/scripts/migrate_json_to_db.py 2>&1)

    # Extract newly imported count from output (changed from "Successfully imported")
    imported=$(echo "$migration_output" | grep -o "Newly imported:.*[0-9]*" | grep -o "[0-9]*" | tail -1 || echo "0")

    if [ "$imported" -gt 0 ] 2>/dev/null; then
        echo -e "${GREEN}✓ Migrated $imported ADW(s) from JSON to database${NC}"
    else
        echo -e "${GREEN}✓ Database is up to date (no new JSON files to migrate)${NC}"
    fi
fi

# Start the ADW WebSocket trigger server
echo -e "${BLUE}Starting ADW WebSocket server...${NC}"
echo -e "${BLUE}WebSocket endpoint:    ws://localhost:$ADW_PORT/ws/trigger${NC}"
echo -e "${BLUE}Health check endpoint: http://localhost:$ADW_PORT/health${NC}"
echo -e "${BLUE}ADWs List endpoint:    http://localhost:$ADW_PORT/api/adws/list${NC}"
echo ""
echo -e "${YELLOW}Note: This server listens for WebSocket connections from the Kanban frontend.${NC}"
echo ""

uv run adws/adw_triggers/trigger_websocket.py
