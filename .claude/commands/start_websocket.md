# Start WebSocket Server

Starts the ADW WebSocket trigger server to enable real-time communication between the Kanban application and ADW workflows.

## Usage

Run this command to start the WebSocket server:

```bash
uv run start-websocket.py
```

## What it does

- Launches the ADW WebSocket trigger server from `adws/adw_triggers/trigger_websocket.py`
- Enables real-time communication for workflow triggering
- Provides WebSocket endpoint at `ws://localhost:8002/ws/trigger`
- Includes health check endpoint at `http://localhost:8002/health`

## Requirements

- All dependencies are automatically managed by uv
- FastAPI, uvicorn, python-dotenv, and websockets packages
- Proper environment configuration in `.env` file

## Server Features

- Real-time workflow triggering
- Connection management for multiple clients
- Status updates and progress tracking
- Ticket notification handling
- Health monitoring and diagnostics

Press Ctrl+C to stop the server gracefully.