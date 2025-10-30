#!/bin/bash

# Start WebSocket Server for ADW Integration
# This script launches the ADW WebSocket trigger server

echo "Starting ADW WebSocket trigger server..."

# Run the WebSocket server using uv
uv run start-websocket.py

echo "WebSocket server stopped."