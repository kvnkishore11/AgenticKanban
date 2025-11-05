#!/usr/bin/env python3
"""
FastAPI server for ADW management and workflow automation.
"""
import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import API routes
from api import adws, stage_logs, merge, file_operations

# Import WebSocket manager
from core.websocket_manager import WebSocketManager

app = FastAPI(
    title="ADW Management API",
    description="API for managing Agent-Driven Workflows (ADWs)",
    version="1.0.0"
)

# Initialize WebSocket manager
ws_manager = WebSocketManager()

# Store ws_manager in app state for access from routes
app.state.ws_manager = ws_manager

# Configure CORS to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server default
        f"http://localhost:{os.getenv('FRONTEND_PORT', '9204')}",  # Frontend port from env
        "http://localhost:3000",  # Alternative frontend port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(adws.router, prefix="/api")
app.include_router(stage_logs.router)
app.include_router(merge.router, prefix="/api")
app.include_router(file_operations.router)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ADW Management API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time event broadcasting.
    Clients connect here to receive live updates about workflow execution.
    """
    connection_id = None
    try:
        # Accept connection and register with manager
        connection_id = await ws_manager.connect(websocket)

        # Keep connection alive and listen for messages
        while True:
            try:
                # Receive messages from client (for ping/pong, etc.)
                data = await websocket.receive_text()
                # Echo back for now (can be extended for client commands)
                # Client messages are currently just for keepalive
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error receiving WebSocket message: {e}")
                break

    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        # Clean up connection
        if connection_id:
            ws_manager.disconnect(websocket)

def main():
    """Main entry point for the server."""
    port = int(os.getenv("BACKEND_PORT", "9104"))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")

    print(f"Starting ADW Management API server on {host}:{port}")
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
