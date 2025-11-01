#!/usr/bin/env -S uv run
# /// script
# dependencies = ["fastapi", "uvicorn", "python-dotenv", "websockets"]
# ///

"""
WebSocket Trigger - AI Developer Workflow (ADW)

FastAPI WebSocket server that receives workflow trigger requests from kanban apps
and triggers ADW workflows. Supports real-time communication with status updates
and maintains connection state for multiple concurrent clients.

Usage: uv run trigger_websocket.py [--port PORT] [--help]

Environment Requirements:
- BACKEND_PORT: Server port (default: 8002)
- All workflow requirements (GITHUB_PAT, CLAUDE_CODE_PATH, etc.)
"""

import argparse
import asyncio
import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import uvicorn

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adw_modules.utils import make_adw_id, setup_logger, get_safe_subprocess_env
from adw_modules.workflow_ops import extract_adw_info, AVAILABLE_ADW_WORKFLOWS
from adw_modules.state import ADWState
from adw_triggers.websocket_models import (
    WorkflowTriggerRequest,
    WorkflowTriggerResponse,
    WorkflowStatusUpdate,
    WebSocketError,
    HealthCheckResponse,
    TicketNotification,
    TicketNotificationResponse,
)

# Load environment variables from current working directory
# This ensures we load from the worktree's .env when running in worktree mode
load_dotenv(dotenv_path=os.path.join(os.getcwd(), '.env'), override=False)

# Configuration
DEFAULT_PORT = 8002
WEBSOCKET_PORT = int(os.getenv("BACKEND_PORT", str(DEFAULT_PORT)))

# Dependent workflows that require existing worktrees
# These cannot be triggered directly without an ADW ID
DEPENDENT_WORKFLOWS = [
    "adw_build_iso",
    "adw_test_iso",
    "adw_review_iso",
    "adw_document_iso",
    "adw_ship_iso",
]

# Workflows that require issue_number as a mandatory parameter
# Most ADW workflows require issue_number to properly identify the GitHub issue
WORKFLOWS_REQUIRING_ISSUE_NUMBER = [
    "adw_plan_iso",
    "adw_patch_iso",
    "adw_build_iso",
    "adw_test_iso",
    "adw_review_iso",
    "adw_document_iso",
    "adw_ship_iso",
    "adw_sdlc_ZTE_iso",
    "adw_plan_build_iso",
    "adw_plan_build_test_iso",
    "adw_plan_build_test_review_iso",
    "adw_plan_build_document_iso",
    "adw_plan_build_review_iso",
    "adw_sdlc_iso",
]

# Global state
active_connections: Set[WebSocket] = set()
total_workflows_triggered = 0
server_start_time = time.time()

# Create FastAPI app
app = FastAPI(
    title="ADW WebSocket Trigger",
    description="WebSocket server for ADW workflow triggering from kanban apps"
)

print(f"Starting ADW WebSocket Trigger on port {WEBSOCKET_PORT}")


class ConnectionManager:
    """Manages WebSocket connections and broadcasting."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        self.active_connections.discard(websocket)
        print(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending message to client: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        if not self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                disconnected.add(connection)

        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()


def validate_workflow_request(request_data: dict) -> tuple[Optional[WorkflowTriggerRequest], Optional[str]]:
    """Validate incoming workflow trigger request.

    Returns:
        Tuple of (validated_request, error_message)
    """
    try:
        request = WorkflowTriggerRequest(**request_data)

        # Validate workflow exists
        if request.workflow_type not in AVAILABLE_ADW_WORKFLOWS:
            return None, f"Unknown workflow type: {request.workflow_type}"

        # Check dependent workflow constraints
        if request.workflow_type in DEPENDENT_WORKFLOWS and not request.adw_id:
            return None, (
                f"{request.workflow_type} is a dependent workflow that requires an existing ADW ID. "
                f"Provide an ADW ID in your request."
            )

        # Check issue_number requirement for workflows that require it
        # Allow workflows to proceed if issue_type is provided, even without issue_number
        # Also allow workflows to proceed if issue_json is provided (complete Kanban data)
        # Dependent workflows with adw_id can get issue info from existing state
        if (request.workflow_type in WORKFLOWS_REQUIRING_ISSUE_NUMBER and
            not request.issue_number and not request.issue_type and not request.issue_json and
            not (request.workflow_type in DEPENDENT_WORKFLOWS and request.adw_id)):
            return None, (
                f"{request.workflow_type} requires either an issue_number, issue_type, or issue_json parameter. "
                f"Workflows that operate on GitHub issues need an issue number to identify the specific issue to work on, "
                f"or an issue_type (feature/bug/chore/patch) to classify kanban-only tasks, "
                f"or complete issue_json data from Kanban systems. "
                f"For dependent workflows, you can also provide an existing adw_id to use issue info from state. "
                f"Please provide either a valid issue_number, issue_type, issue_json, or adw_id (for dependent workflows) in your request."
            )

        return request, None

    except Exception as e:
        return None, f"Invalid request format: {str(e)}"


async def trigger_workflow(request: WorkflowTriggerRequest, websocket: WebSocket) -> WorkflowTriggerResponse:
    """Trigger an ADW workflow and return response."""
    global total_workflows_triggered

    # Use provided ADW ID or generate a new one
    adw_id = request.adw_id or make_adw_id()

    # Create or update state
    if request.adw_id:
        # Try to load existing state first
        state = ADWState.load(request.adw_id)
        if state:
            # Update model_set and issue_type if state exists
            update_data = {
                "issue_number": request.issue_number,
                "model_set": request.model_set
            }
            # Add issue_type if provided (converts to slash command format)
            if request.issue_type:
                update_data["issue_class"] = f"/{request.issue_type}"
            # Store Kanban-provided issue data if available
            if request.issue_json:
                update_data["issue_json"] = request.issue_json
                update_data["data_source"] = "kanban"
            elif request.issue_type:
                # Set kanban mode if issue_type provided (even without full issue_json)
                update_data["data_source"] = "kanban"
            else:
                update_data["data_source"] = "github"
            state.update(**update_data)
        else:
            # Create new state if it doesn't exist
            state = ADWState(request.adw_id)
            update_data = {
                "adw_id": request.adw_id,
                "issue_number": request.issue_number,
                "model_set": request.model_set,
            }
            # Add issue_type if provided (converts to slash command format)
            if request.issue_type:
                update_data["issue_class"] = f"/{request.issue_type}"
            # Store Kanban-provided issue data if available
            if request.issue_json:
                update_data["issue_json"] = request.issue_json
                update_data["data_source"] = "kanban"
            elif request.issue_type:
                # Set kanban mode if issue_type provided (even without full issue_json)
                update_data["data_source"] = "kanban"
            else:
                update_data["data_source"] = "github"
            state.update(**update_data)
        state.save("websocket_trigger")
    else:
        # Create new state for newly generated ADW ID
        state = ADWState(adw_id)
        update_data = {
            "adw_id": adw_id,
            "issue_number": request.issue_number,
            "model_set": request.model_set
        }
        # Add issue_type if provided (converts to slash command format)
        if request.issue_type:
            update_data["issue_class"] = f"/{request.issue_type}"
        # Store Kanban-provided issue data if available
        if request.issue_json:
            update_data["issue_json"] = request.issue_json
            update_data["data_source"] = "kanban"
        else:
            update_data["data_source"] = "github"
        state.update(**update_data)
        state.save("websocket_trigger")

    # Set up logger
    logger = setup_logger(adw_id, "websocket_trigger")
    data_source = "kanban" if (request.issue_json or request.issue_type) else "github"
    logger.info(
        f"WebSocket trigger request: workflow={request.workflow_type}, "
        f"adw_id={adw_id}, model_set={request.model_set}, data_source={data_source}"
    )

    # Send status update: workflow started
    await send_status_update(
        adw_id,
        request.workflow_type,
        "started",
        f"Starting {request.workflow_type} workflow with ID {adw_id}",
        websocket
    )

    # Build command to run the appropriate workflow
    script_dir = os.path.dirname(os.path.abspath(__file__))
    adws_dir = os.path.dirname(script_dir)
    repo_root = os.path.dirname(adws_dir)  # Go up to repository root
    trigger_script = os.path.join(adws_dir, f"{request.workflow_type}.py")

    # Calculate absolute path to .env file in tac-7 directory
    tac7_dir = repo_root  # .env file is in the tac-7 root directory
    env_file_path = os.path.join(tac7_dir, ".env")

    cmd = ["uv", "run", trigger_script]

    # Build command arguments following ADW workflow conventions:
    # Most workflows expect: <script>.py <issue-number> [adw-id]
    # Validation above ensures issue_number is present for workflows that require it

    # Add issue number if provided (first positional argument)
    if request.issue_number:
        cmd.append(str(request.issue_number))

    # Add ADW ID (second positional argument)
    # Note: For workflows requiring issue_number, this will be the second argument
    # For workflows that don't require issue_number, this will be the first argument
    cmd.append(adw_id)

    print(f"Launching {request.workflow_type} with ADW ID: {adw_id}")
    print(f"Command: {' '.join(cmd)}")
    print(f"Working directory: {repo_root}")
    print(f"Environment file: {env_file_path}")

    # Launch in background using Popen with filtered environment
    try:
        process = subprocess.Popen(
            cmd,
            cwd=repo_root,  # Run from repository root where .claude/commands/ is located
            env=get_safe_subprocess_env(env_file_path),  # Pass .env file path for explicit loading
            start_new_session=True,
        )

        total_workflows_triggered += 1

        logs_path = f"agents/{adw_id}/{request.workflow_type}/"

        print(f"Background process started for ADW ID: {adw_id}")
        print(f"Logs will be written to: {logs_path}execution.log")

        # Send status update: workflow in progress
        await send_status_update(
            adw_id,
            request.workflow_type,
            "in_progress",
            f"Workflow {request.workflow_type} is running in background",
            websocket
        )

        # Return success response
        return WorkflowTriggerResponse(
            status="accepted",
            adw_id=adw_id,
            workflow_name=request.workflow_type,
            message=f"ADW {request.workflow_type} triggered successfully",
            logs_path=logs_path
        )

    except Exception as e:
        logger.error(f"Failed to launch workflow: {e}")

        # Send error status update
        await send_status_update(
            adw_id,
            request.workflow_type,
            "failed",
            f"Failed to start workflow: {str(e)}",
            websocket
        )

        return WorkflowTriggerResponse(
            status="error",
            adw_id=adw_id,
            workflow_name=request.workflow_type,
            message="Failed to trigger workflow",
            logs_path="",
            error=str(e)
        )


async def send_status_update(
    adw_id: str,
    workflow_name: str,
    status: str,
    message: str,
    websocket: WebSocket,
    progress_percent: Optional[int] = None,
    current_step: Optional[str] = None
):
    """Send a status update to the WebSocket client."""
    update = WorkflowStatusUpdate(
        adw_id=adw_id,
        workflow_name=workflow_name,
        status=status,  # type: ignore
        message=message,
        timestamp=datetime.utcnow().isoformat() + "Z",
        progress_percent=progress_percent,
        current_step=current_step
    )

    await manager.send_personal_message({
        "type": "status_update",
        "data": update.model_dump()
    }, websocket)


async def handle_ticket_notification(notification_data: dict, websocket: WebSocket) -> TicketNotificationResponse:
    """Handle incoming ticket notification from kanban client."""
    try:
        # Validate the notification data
        notification = TicketNotification(**notification_data)

        # Log the received notification
        print(f"Received ticket notification: {notification.title} (ID: {notification.id})")

        # Here you could add additional processing like:
        # - Storing the ticket in a database
        # - Triggering specific workflows based on ticket type
        # - Sending notifications to other systems
        # - Updating project management tools

        # For now, we just acknowledge receipt
        response = TicketNotificationResponse(
            status="received",
            ticket_id=notification.id,
            message=f"Ticket notification '{notification.title}' received successfully",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )

        return response

    except Exception as e:
        # Ensure ticket_id is always a valid string for error responses
        # Handle cases where id/ticket_id is null, undefined, empty string, or missing
        # Try both 'id' and 'ticket_id' field names to be robust
        raw_id = notification_data.get("id") or notification_data.get("ticket_id")

        if raw_id is not None and str(raw_id).strip():
            ticket_id = str(raw_id).strip()
        else:
            # Generate a unique error ID when original ID is invalid
            ticket_id = f"error_{int(time.time() * 1000)}"

        # Log detailed error information for debugging
        print(f"Ticket notification processing failed: {e}")
        print(f"Notification data: {notification_data}")
        print(f"Using ticket_id for error response: {ticket_id}")

        # Return error response if validation or processing fails
        error_response = TicketNotificationResponse(
            status="error",
            ticket_id=ticket_id,
            message="Failed to process ticket notification",
            timestamp=datetime.utcnow().isoformat() + "Z",
            error=str(e)
        )
        return error_response


@app.websocket("/ws/trigger")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for receiving workflow trigger requests."""
    await manager.connect(websocket)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                # Parse incoming message
                message = json.loads(data)
                message_type = message.get("type", "unknown")

                if message_type == "trigger_workflow":
                    # Handle workflow trigger request
                    request_data = message.get("data", {})

                    # Validate request
                    validated_request, error = validate_workflow_request(request_data)

                    if error:
                        # Send error response
                        error_response = WebSocketError(
                            error_type="validation_error",
                            message=error
                        )
                        await manager.send_personal_message({
                            "type": "error",
                            "data": error_response.model_dump()
                        }, websocket)
                        continue

                    # Trigger the workflow
                    response = await trigger_workflow(validated_request, websocket)

                    # Send response
                    await manager.send_personal_message({
                        "type": "trigger_response",
                        "data": response.model_dump()
                    }, websocket)

                elif message_type == "ping":
                    # Handle ping/pong for connection keepalive
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat() + "Z"
                    }, websocket)

                elif message_type == "ticket_notification":
                    # Handle ticket notification from kanban client
                    notification_data = message.get("data", {})

                    # Process the ticket notification
                    response = await handle_ticket_notification(notification_data, websocket)

                    # Send response back to client
                    await manager.send_personal_message({
                        "type": "ticket_notification_response",
                        "data": response.model_dump()
                    }, websocket)

                else:
                    # Unknown message type
                    error_response = WebSocketError(
                        error_type="validation_error",
                        message=f"Unknown message type: {message_type}"
                    )
                    await manager.send_personal_message({
                        "type": "error",
                        "data": error_response.model_dump()
                    }, websocket)

            except json.JSONDecodeError:
                # Invalid JSON
                error_response = WebSocketError(
                    error_type="validation_error",
                    message="Invalid JSON format"
                )
                await manager.send_personal_message({
                    "type": "error",
                    "data": error_response.model_dump()
                }, websocket)

            except Exception as e:
                # Other errors
                error_response = WebSocketError(
                    error_type="system_error",
                    message=f"Internal error: {str(e)}"
                )
                await manager.send_personal_message({
                    "type": "error",
                    "data": error_response.model_dump()
                }, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@app.get("/health")
async def health():
    """Health check endpoint - runs comprehensive system health check."""
    try:
        # Run the health check script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # Health check is in adw_tests, not adw_triggers
        health_check_script = os.path.join(
            os.path.dirname(script_dir), "adw_tests", "health_check.py"
        )

        # Run health check with timeout
        result = subprocess.run(
            ["uv", "run", health_check_script],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=os.path.dirname(script_dir),  # Run from adws directory
        )

        # Print the health check output for debugging
        print("=== Health Check Output ===")
        print(result.stdout)
        if result.stderr:
            print("=== Health Check Errors ===")
            print(result.stderr)

        # Parse the output - look for the overall status
        output_lines = result.stdout.strip().split("\n")
        is_healthy = result.returncode == 0

        # Extract key information from output
        warnings = []
        errors = []

        capturing_warnings = False
        capturing_errors = False

        for line in output_lines:
            if "⚠️  Warnings:" in line:
                capturing_warnings = True
                capturing_errors = False
                continue
            elif "❌ Errors:" in line:
                capturing_errors = True
                capturing_warnings = False
                continue
            elif "📝 Next Steps:" in line:
                break

            if capturing_warnings and line.strip().startswith("-"):
                warnings.append(line.strip()[2:])
            elif capturing_errors and line.strip().startswith("-"):
                errors.append(line.strip()[2:])

        # Calculate uptime
        uptime_seconds = time.time() - server_start_time

        response = HealthCheckResponse(
            status="healthy" if is_healthy else "unhealthy",
            service="adw-websocket-trigger",
            active_connections=len(manager.active_connections),
            total_workflows_triggered=total_workflows_triggered,
            uptime_seconds=uptime_seconds,
            health_check={
                "success": is_healthy,
                "warnings": warnings,
                "errors": errors,
                "details": "Run health_check.py directly for full report",
            } if is_healthy else None,
            error=f"Health check failed with {len(errors)} errors" if not is_healthy else None
        )

        return JSONResponse(content=response.model_dump())

    except subprocess.TimeoutExpired:
        response = HealthCheckResponse(
            status="unhealthy",
            service="adw-websocket-trigger",
            active_connections=len(manager.active_connections),
            total_workflows_triggered=total_workflows_triggered,
            uptime_seconds=time.time() - server_start_time,
            error="Health check timed out"
        )
        return JSONResponse(content=response.model_dump())

    except Exception as e:
        response = HealthCheckResponse(
            status="unhealthy",
            service="adw-websocket-trigger",
            active_connections=len(manager.active_connections),
            total_workflows_triggered=total_workflows_triggered,
            uptime_seconds=time.time() - server_start_time,
            error=f"Health check failed: {str(e)}"
        )
        return JSONResponse(content=response.model_dump())


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    print(f"\nReceived signal {signum}, shutting down gracefully...")
    sys.exit(0)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="ADW WebSocket Trigger Server")
    parser.add_argument(
        "--port",
        type=int,
        default=WEBSOCKET_PORT,
        help=f"Port to run the server on (default: {WEBSOCKET_PORT})"
    )
    parser.add_argument(
        "--help-detailed",
        action="store_true",
        help="Show detailed help"
    )

    args = parser.parse_args()

    if args.help_detailed:
        print(__doc__)
        return

    port = args.port

    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print(f"Starting server on http://0.0.0.0:{port}")
    print(f"WebSocket endpoint: ws://localhost:{port}/ws/trigger")
    print(f"Health check: GET http://localhost:{port}/health")
    print("\nPress Ctrl+C to shutdown gracefully")

    try:
        uvicorn.run(app, host="0.0.0.0", port=port)
    except KeyboardInterrupt:
        print("\nShutdown requested by user")
    except Exception as e:
        print(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()