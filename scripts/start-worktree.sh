#!/bin/bash

#############################################################################
# start-worktree.sh
#
# Enhanced worktree startup script that:
# - Validates worktree and configuration
# - Starts WebSocket server and frontend using .ports.env as source of truth
# - Verifies WebSocket server connection
# - Automatically opens browser to frontend
#
# Usage: ./scripts/start-worktree.sh <adw_id>
# Example: ./scripts/start-worktree.sh fb756a56
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

#############################################################################
# Helper Functions
#############################################################################

print_error() {
    echo -e "${RED}✗ Error: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to check if a port is listening
check_port() {
    local port=$1
    local max_attempts=${2:-30}  # Default 30 attempts (30 seconds)
    local attempt=1

    print_info "Waiting for port $port to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    return 1
}

# Function to verify WebSocket connection
verify_websocket() {
    local port=$1
    local max_attempts=5
    local attempt=1

    print_info "Verifying WebSocket server on port $port..."

    while [ $attempt -le $max_attempts ]; do
        # Try to connect using curl with timeout
        if curl -s -f --max-time 2 "http://localhost:$port/health" >/dev/null 2>&1; then
            print_success "WebSocket server is healthy!"
            return 0
        fi

        # If health endpoint doesn't exist, just check if port responds
        if nc -z localhost $port 2>/dev/null; then
            print_success "WebSocket port $port is accepting connections"
            return 0
        fi

        sleep 1
        attempt=$((attempt + 1))
    done

    print_warning "Could not verify WebSocket health endpoint (this may be normal)"
    return 0  # Don't fail - port check is sufficient
}

#############################################################################
# Main Script
#############################################################################

print_header "Agentic Kanban Worktree Launcher"

# Check if ADW ID is provided
if [ $# -eq 0 ]; then
    print_error "ADW ID is required"
    echo ""
    echo "Usage: $0 <adw_id>"
    echo ""
    echo "Available worktrees:"
    if [ -d "$REPO_ROOT/trees" ]; then
        ls -1 "$REPO_ROOT/trees/" 2>/dev/null | sed 's/^/  - /' || echo "  (none)"
    else
        echo "  (none)"
    fi
    echo ""
    exit 1
fi

ADW_ID="$1"

# Validate ADW ID format (8 alphanumeric characters)
if [[ ! $ADW_ID =~ ^[a-zA-Z0-9]{8}$ ]]; then
    print_error "ADW ID must be exactly 8 alphanumeric characters"
    echo "  Received: '$ADW_ID'"
    exit 1
fi

print_success "ADW ID: $ADW_ID"

# Define worktree path
WORKTREE_PATH="$REPO_ROOT/trees/$ADW_ID"
PORTS_ENV_FILE="$WORKTREE_PATH/.ports.env"

# Validate worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    print_error "Worktree does not exist: $WORKTREE_PATH"
    echo ""
    echo "Available worktrees:"
    if [ -d "$REPO_ROOT/trees" ]; then
        ls -1 "$REPO_ROOT/trees/" 2>/dev/null | sed 's/^/  - /' || echo "  (none)"
    else
        echo "  (none)"
    fi
    echo ""
    echo "To create a worktree, run:"
    echo "  cd $REPO_ROOT/adws"
    echo "  uv run adw_plan_iso.py <issue-number> $ADW_ID"
    echo ""
    exit 1
fi

print_success "Worktree found: $WORKTREE_PATH"

# Validate .ports.env exists
if [ ! -f "$PORTS_ENV_FILE" ]; then
    print_error ".ports.env file not found: $PORTS_ENV_FILE"
    echo ""
    echo "The worktree is missing its port configuration file."
    echo "This file should be created automatically when the worktree is set up."
    echo ""
    exit 1
fi

print_success "Port configuration found: .ports.env"

# Source the .ports.env file
print_info "Reading port configuration..."
source "$PORTS_ENV_FILE"

# Validate required environment variables
if [ -z "$WEBSOCKET_PORT" ]; then
    print_error "WEBSOCKET_PORT not set in $PORTS_ENV_FILE"
    exit 1
fi

if [ -z "$FRONTEND_PORT" ]; then
    print_error "FRONTEND_PORT not set in $PORTS_ENV_FILE"
    exit 1
fi

# Display configuration
print_header "Configuration"
echo -e "  Worktree Path:   ${GREEN}$WORKTREE_PATH${NC}"
echo -e "  WebSocket Port:  ${GREEN}$WEBSOCKET_PORT${NC}"
echo -e "  Frontend Port:   ${GREEN}$FRONTEND_PORT${NC}"
echo -e "  WebSocket URL:   ${BLUE}http://localhost:$WEBSOCKET_PORT${NC}"
echo -e "  Frontend URL:    ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  WebSocket WS:    ${BLUE}ws://localhost:$WEBSOCKET_PORT/ws/trigger${NC}"

# Start the applications
print_header "Starting Applications"

print_info "Launching WebSocket server and frontend..."
echo ""

# Change to repo root and call existing start.sh
cd "$REPO_ROOT"

# Start the apps in background using existing start.sh
"$REPO_ROOT/scripts/start.sh" "$ADW_ID" &
START_PID=$!

# Give the start script a moment to begin
sleep 2

# Check if start.sh is still running
if ! ps -p $START_PID > /dev/null 2>&1; then
    print_error "Start script exited unexpectedly"
    exit 1
fi

print_success "Start script launched (PID: $START_PID)"

# Wait for WebSocket server to be ready
print_header "Verifying WebSocket Server"

if check_port $WEBSOCKET_PORT 30; then
    print_success "WebSocket server is listening on port $WEBSOCKET_PORT"
    verify_websocket $WEBSOCKET_PORT
else
    print_error "WebSocket server failed to start on port $WEBSOCKET_PORT after 30 seconds"
    print_warning "The application may still be starting. Check manually."
fi

# Wait for frontend to be ready
print_header "Verifying Frontend"

if check_port $FRONTEND_PORT 30; then
    print_success "Frontend is listening on port $FRONTEND_PORT"
else
    print_error "Frontend failed to start on port $FRONTEND_PORT after 30 seconds"
    print_warning "The application may still be starting. Check manually."
fi

# Open browser
print_header "Opening Browser"

FRONTEND_URL="http://localhost:$FRONTEND_PORT"
print_info "Opening browser to $FRONTEND_URL"

# Detect OS and open browser accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$FRONTEND_URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &> /dev/null; then
        xdg-open "$FRONTEND_URL"
    elif command -v gnome-open &> /dev/null; then
        gnome-open "$FRONTEND_URL"
    else
        print_warning "Could not detect browser launcher. Please open manually:"
        echo "  $FRONTEND_URL"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start "$FRONTEND_URL"
else
    print_warning "Unknown OS. Please open browser manually to:"
    echo "  $FRONTEND_URL"
fi

print_success "Browser opened"

# Final summary
print_header "Startup Complete"

echo -e "${GREEN}✓ Worktree $ADW_ID is running!${NC}"
echo ""
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  WebSocket: http://localhost:$WEBSOCKET_PORT"
echo "  WebSocket: ws://localhost:$WEBSOCKET_PORT/ws/trigger"
echo ""
echo -e "${YELLOW}Note: The apps are running in the background.${NC}"
echo "      Check the start.sh terminal for logs."
echo "      Press Ctrl+C in that terminal to stop."
echo ""
