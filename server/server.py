#!/usr/bin/env python3
"""
FastAPI server for ADW management and workflow automation.
"""
import os
import json
import logging
import uvicorn
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import API routes
from api import adws, stage_logs, merge, file_operations, agent_state_stream, clarification

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
        "http://localhost:9205",  # Additional frontend port for testing
        "http://localhost:9201",  # Additional frontend port
        "http://localhost:9202",  # Additional frontend port
        "http://localhost:9203",  # Additional frontend port
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
app.include_router(agent_state_stream.router, prefix="/api")
app.include_router(clarification.router, prefix="/api")

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
async def websocket_endpoint(websocket: WebSocket, user_agent: str = None):
    """
    WebSocket endpoint for real-time event broadcasting.
    Clients connect here to receive live updates about workflow execution.
    Supports ping/pong for connection health monitoring and ADW subscriptions.
    """
    connection_id = None
    try:
        # Extract client metadata
        client_info = {
            "user_agent": websocket.headers.get("user-agent", "Unknown"),
            "remote_address": websocket.client.host if websocket.client else None,
        }

        # Accept connection and register with manager
        connection_id = await ws_manager.connect(websocket, client_info)

        # Keep connection alive and listen for messages
        while True:
            try:
                # Receive messages from client (for ping/pong, subscriptions, etc.)
                data = await websocket.receive_text()

                # Parse client message
                try:
                    message = json.loads(data)
                    message_type = message.get("type")

                    if message_type == "ping":
                        # Respond to ping with pong
                        await websocket.send_json({
                            "type": "pong",
                            "data": {
                                "timestamp": datetime.utcnow().isoformat() + "Z"
                            }
                        })
                    elif message_type == "subscribe":
                        # Subscribe to specific ADW ID
                        adw_id = message.get("adw_id")
                        if adw_id:
                            ws_manager.subscribe_to_adw(connection_id, adw_id)
                            await websocket.send_json({
                                "type": "subscription_ack",
                                "data": {
                                    "adw_id": adw_id,
                                    "status": "subscribed",
                                    "timestamp": datetime.utcnow().isoformat() + "Z"
                                }
                            })
                    elif message_type == "unsubscribe":
                        # Unsubscribe from specific ADW ID
                        adw_id = message.get("adw_id")
                        if adw_id:
                            ws_manager.unsubscribe_from_adw(connection_id, adw_id)
                            await websocket.send_json({
                                "type": "subscription_ack",
                                "data": {
                                    "adw_id": adw_id,
                                    "status": "unsubscribed",
                                    "timestamp": datetime.utcnow().isoformat() + "Z"
                                }
                            })
                    else:
                        # Unknown message type
                        logger.warning(f"Unknown message type from client {connection_id}: {message_type}")

                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from client {connection_id}: {data}")
                except Exception as e:
                    logger.error(f"Error processing message from client {connection_id}: {e}")
                    await ws_manager.send_error_to_client(
                        connection_id,
                        "message_processing_error",
                        f"Error processing message: {str(e)}"
                    )

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error receiving WebSocket message: {e}")
                break

    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
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
