"""
Agent State Streaming API

Provides endpoints for:
1. Receiving agent state updates from ADW workflows
2. Broadcasting state changes to WebSocket clients
3. Retrieving current agent state snapshots
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from api.adws import get_agents_directory, read_adw_state

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


# ===== Request/Response Models =====

class AgentStateUpdateRequest(BaseModel):
    """Request model for agent state updates from ADW workflows."""
    adw_id: str = Field(..., description="ADW workflow identifier")
    event_type: str = Field(..., description="Type of state event (state_change, log_entry, file_operation, thinking, tool_execution)")
    data: Dict[str, Any] = Field(..., description="Event-specific payload data")
    timestamp: Optional[str] = Field(None, description="Event timestamp (ISO 8601)")


class AgentLogEntryRequest(BaseModel):
    """Request model for streaming individual log entries."""
    adw_id: str
    level: str = Field(default="INFO", description="Log level (INFO, WARNING, ERROR, DEBUG)")
    message: str = Field(..., description="Log message")
    details: Optional[str] = Field(None, description="Additional log details")
    context: Optional[Dict[str, Any]] = Field(None, description="Contextual data")


class FileOperationRequest(BaseModel):
    """Request model for file operation notifications."""
    adw_id: str
    file_path: str = Field(..., description="Path to the file")
    operation: str = Field(..., description="Operation type (read, write, modify, delete)")
    diff: Optional[str] = Field(None, description="Git diff of changes")
    summary: Optional[str] = Field(None, description="AI-generated summary")
    lines_added: int = Field(default=0, description="Number of lines added")
    lines_removed: int = Field(default=0, description="Number of lines removed")


class AgentThinkingRequest(BaseModel):
    """Request model for Claude Code thinking blocks."""
    adw_id: str
    content: str = Field(..., description="Thinking content")
    duration_ms: Optional[int] = Field(None, description="Duration in milliseconds")
    sequence: Optional[int] = Field(None, description="Sequence number")


class ToolExecutionRequest(BaseModel):
    """Request model for tool execution events."""
    adw_id: str
    tool_name: str = Field(..., description="Name of the tool")
    tool_use_id: Optional[str] = Field(None, description="Unique tool use ID")
    phase: str = Field(..., description="Execution phase (pre, post)")
    input_data: Optional[Dict[str, Any]] = Field(None, description="Tool input parameters")
    output: Optional[Any] = Field(None, description="Tool output")
    duration_ms: Optional[int] = Field(None, description="Execution duration")
    success: bool = Field(default=True, description="Execution success status")
    error: Optional[str] = Field(None, description="Error message if failed")


# ===== API Endpoints =====

@router.post("/agent-state-update")
async def receive_agent_state_update(request: Request, update: AgentStateUpdateRequest):
    """
    Receive agent state updates from ADW workflows and broadcast to WebSocket clients.

    This is the main endpoint for ADW workflows to push state changes in real-time.

    Args:
        request: FastAPI request (to access app.state.ws_manager)
        update: Agent state update payload

    Returns:
        Success confirmation with timestamp
    """
    try:
        ws_manager = request.app.state.ws_manager

        # Add server-side timestamp if not provided
        if not update.timestamp:
            update.timestamp = datetime.utcnow().isoformat() + 'Z'

        # Route to appropriate WebSocket broadcast method based on event type
        if update.event_type == "state_change":
            # Full agent state change (from adw_state.json)
            await ws_manager.broadcast_agent_summary_update(
                adw_id=update.adw_id,
                status=update.data.get("status", "in_progress"),
                progress_percent=update.data.get("progress_percent"),
                current_step=update.data.get("current_step"),
                workflow_name=update.data.get("workflow_name"),
                message=update.data.get("message"),
                metadata=update.data
            )
        elif update.event_type == "log_entry":
            # Individual log entry
            await ws_manager.broadcast_agent_log(
                adw_id=update.adw_id,
                event_category=update.data.get("event_category", "system"),
                event_type=update.data.get("type", "log"),
                message=update.data.get("message", ""),
                summary=update.data.get("summary"),
                payload=update.data.get("payload"),
                level=update.data.get("level", "INFO"),
                current_step=update.data.get("current_step")
            )
        elif update.event_type == "file_operation":
            # File operation notification
            await ws_manager.broadcast_file_changed(
                adw_id=update.adw_id,
                file_path=update.data.get("file_path", ""),
                operation=update.data.get("operation", "modified"),
                diff=update.data.get("diff"),
                summary=update.data.get("summary"),
                lines_added=update.data.get("lines_added", 0),
                lines_removed=update.data.get("lines_removed", 0)
            )
        elif update.event_type == "thinking":
            # Claude Code thinking block
            await ws_manager.broadcast_thinking_block(
                adw_id=update.adw_id,
                content=update.data.get("content", ""),
                duration_ms=update.data.get("duration_ms"),
                sequence=update.data.get("sequence")
            )
        elif update.event_type == "tool_execution_pre":
            # Pre-tool execution
            await ws_manager.broadcast_tool_use_pre(
                adw_id=update.adw_id,
                tool_name=update.data.get("tool_name", ""),
                input_data=update.data.get("input", {}),
                tool_use_id=update.data.get("tool_use_id")
            )
        elif update.event_type == "tool_execution_post":
            # Post-tool execution
            await ws_manager.broadcast_tool_use_post(
                adw_id=update.adw_id,
                tool_name=update.data.get("tool_name", ""),
                tool_use_id=update.data.get("tool_use_id"),
                output=update.data.get("output"),
                duration_ms=update.data.get("duration_ms", 0),
                success=update.data.get("success", True),
                error=update.data.get("error")
            )
        elif update.event_type == "text_block":
            # Text block from Claude
            await ws_manager.broadcast_text_block(
                adw_id=update.adw_id,
                content=update.data.get("content", ""),
                sequence=update.data.get("sequence")
            )
        else:
            # Unknown event type - broadcast as generic agent log
            logger.warning(f"Unknown event type: {update.event_type}")
            await ws_manager.broadcast_agent_log(
                adw_id=update.adw_id,
                event_category="system",
                event_type=update.event_type,
                message=str(update.data),
                level="INFO"
            )

        logger.info(f"Broadcasted agent state update: {update.adw_id} - {update.event_type}")

        return {
            "status": "success",
            "message": "Agent state update broadcasted",
            "adw_id": update.adw_id,
            "event_type": update.event_type,
            "timestamp": update.timestamp
        }

    except Exception as e:
        logger.error(f"Error broadcasting agent state update: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to broadcast agent state update: {str(e)}"
        )


@router.post("/agent-log-entry")
async def receive_agent_log_entry(request: Request, log: AgentLogEntryRequest):
    """
    Receive and broadcast individual agent log entries.

    Args:
        request: FastAPI request
        log: Log entry payload

    Returns:
        Success confirmation
    """
    try:
        ws_manager = request.app.state.ws_manager

        await ws_manager.broadcast_agent_log(
            adw_id=log.adw_id,
            event_category="system",
            event_type="log_entry",
            message=log.message,
            summary=log.details,
            payload=log.context or {},
            level=log.level
        )

        logger.debug(f"Broadcasted log entry for {log.adw_id}: {log.message}")

        return {
            "status": "success",
            "message": "Log entry broadcasted",
            "adw_id": log.adw_id
        }

    except Exception as e:
        logger.error(f"Error broadcasting log entry: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to broadcast log entry: {str(e)}"
        )


@router.post("/file-operation")
async def receive_file_operation(request: Request, file_op: FileOperationRequest):
    """
    Receive and broadcast file operation notifications.

    Args:
        request: FastAPI request
        file_op: File operation payload

    Returns:
        Success confirmation
    """
    try:
        ws_manager = request.app.state.ws_manager

        await ws_manager.broadcast_file_changed(
            adw_id=file_op.adw_id,
            file_path=file_op.file_path,
            operation=file_op.operation,
            diff=file_op.diff,
            summary=file_op.summary,
            lines_added=file_op.lines_added,
            lines_removed=file_op.lines_removed
        )

        logger.debug(f"Broadcasted file operation for {file_op.adw_id}: {file_op.file_path}")

        return {
            "status": "success",
            "message": "File operation broadcasted",
            "adw_id": file_op.adw_id,
            "file_path": file_op.file_path
        }

    except Exception as e:
        logger.error(f"Error broadcasting file operation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to broadcast file operation: {str(e)}"
        )


@router.post("/agent-thinking")
async def receive_agent_thinking(request: Request, thinking: AgentThinkingRequest):
    """
    Receive and broadcast Claude Code thinking blocks.

    Args:
        request: FastAPI request
        thinking: Thinking block payload

    Returns:
        Success confirmation
    """
    try:
        ws_manager = request.app.state.ws_manager

        await ws_manager.broadcast_thinking_block(
            adw_id=thinking.adw_id,
            content=thinking.content,
            duration_ms=thinking.duration_ms,
            sequence=thinking.sequence
        )

        logger.debug(f"Broadcasted thinking block for {thinking.adw_id}")

        return {
            "status": "success",
            "message": "Thinking block broadcasted",
            "adw_id": thinking.adw_id
        }

    except Exception as e:
        logger.error(f"Error broadcasting thinking block: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to broadcast thinking block: {str(e)}"
        )


@router.post("/tool-execution")
async def receive_tool_execution(request: Request, tool_exec: ToolExecutionRequest):
    """
    Receive and broadcast tool execution events (pre/post).

    Args:
        request: FastAPI request
        tool_exec: Tool execution payload

    Returns:
        Success confirmation
    """
    try:
        ws_manager = request.app.state.ws_manager

        if tool_exec.phase == "pre":
            await ws_manager.broadcast_tool_use_pre(
                adw_id=tool_exec.adw_id,
                tool_name=tool_exec.tool_name,
                input_data=tool_exec.input_data or {},
                tool_use_id=tool_exec.tool_use_id
            )
        elif tool_exec.phase == "post":
            await ws_manager.broadcast_tool_use_post(
                adw_id=tool_exec.adw_id,
                tool_name=tool_exec.tool_name,
                tool_use_id=tool_exec.tool_use_id,
                output=tool_exec.output,
                duration_ms=tool_exec.duration_ms or 0,
                success=tool_exec.success,
                error=tool_exec.error
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid phase: {tool_exec.phase}. Must be 'pre' or 'post'"
            )

        logger.debug(f"Broadcasted tool execution ({tool_exec.phase}) for {tool_exec.adw_id}: {tool_exec.tool_name}")

        return {
            "status": "success",
            "message": f"Tool execution ({tool_exec.phase}) broadcasted",
            "adw_id": tool_exec.adw_id,
            "tool_name": tool_exec.tool_name
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error broadcasting tool execution: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to broadcast tool execution: {str(e)}"
        )


@router.get("/agent-state/{adw_id}")
async def get_agent_state_snapshot(adw_id: str):
    """
    Get current agent state snapshot from adw_state.json.

    This provides a fallback REST endpoint for getting the current state
    when WebSocket is unavailable or for initial state loading.

    Args:
        adw_id: ADW workflow identifier

    Returns:
        Current agent state data from adw_state.json
    """
    # Validate ADW ID format
    if len(adw_id) != 8 or not adw_id.isalnum():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ADW ID format: {adw_id}. Must be 8 alphanumeric characters."
        )

    try:
        agents_dir = get_agents_directory()
        adw_dir = agents_dir / adw_id

        if not adw_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"ADW ID '{adw_id}' not found"
            )

        state_data = read_adw_state(adw_dir)
        if state_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"adw_state.json not found or invalid for ADW ID '{adw_id}'"
            )

        return {
            "adw_id": adw_id,
            "state": state_data,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent state snapshot for {adw_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
