#!/usr/bin/env -S uv run
# /// script
# dependencies = ["fastapi"]
# ///

"""
WebSocket Manager - Robust WebSocket Connection Management

This module provides a comprehensive WebSocket manager for handling WebSocket
connections and broadcasting agent-level events in real-time. It supports:

- Connection management with metadata tracking
- Specific broadcast methods for different event types
- Heartbeat mechanism for connection health monitoring
- Error handling and automatic disconnection cleanup
- Broadcasting to all connected clients with proper JSON formatting

Usage:
    from adw_modules.websocket_manager import get_websocket_manager

    # Get the global manager instance
    ws_manager = get_websocket_manager()

    # Connect a WebSocket
    await ws_manager.connect(websocket, client_id="client-123")

    # Broadcast agent events
    await ws_manager.broadcast_thinking_block(
        adw_id="adw-abc123",
        content="Planning the implementation...",
        reasoning_type="planning"
    )

    await ws_manager.broadcast_tool_use_pre(
        adw_id="adw-abc123",
        tool_name="Read",
        tool_input={"file_path": "src/app.js"}
    )

    # Send heartbeat
    await ws_manager.send_heartbeat()
"""

import logging
import time
from datetime import datetime
from typing import Set, Dict, Any, Optional, List, Literal
from fastapi import WebSocket


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts with enhanced reliability.

    Provides specific broadcast methods for different event types including:
    - Agent lifecycle events (created, updated, deleted, status changes)
    - Agent operations (thinking blocks, tool execution, file changes, text blocks)
    - System events (orchestrator updates, errors, logs)
    - Chat streaming events
    """

    def __init__(self):
        """Initialize the WebSocket manager."""
        self.active_connections: Set[WebSocket] = set()
        self.connection_metadata: Dict[int, Dict[str, Any]] = {}
        self.logger = logging.getLogger("WebSocketManager")

    async def connect(self, websocket: WebSocket, client_id: Optional[str] = None):
        """
        Accept a new WebSocket connection with metadata tracking.

        Args:
            websocket: The WebSocket connection to accept
            client_id: Optional client identifier
        """
        await websocket.accept()
        self.active_connections.add(websocket)

        # Initialize connection metadata
        conn_id = id(websocket)
        self.connection_metadata[conn_id] = {
            "client_id": client_id or f"client_{int(time.time() * 1000)}_{conn_id}",
            "connected_at": time.time(),
            "last_activity": time.time(),
            "message_count": 0
        }

        self.logger.info(
            f"WebSocket connected: {self.connection_metadata[conn_id]['client_id']} "
            f"(Total connections: {len(self.active_connections)})"
        )

    def disconnect(self, websocket: WebSocket):
        """
        Remove a WebSocket connection with cleanup.

        Args:
            websocket: The WebSocket connection to remove
        """
        self.active_connections.discard(websocket)
        conn_id = id(websocket)

        if conn_id in self.connection_metadata:
            metadata = self.connection_metadata[conn_id]
            duration = time.time() - metadata["connected_at"]
            self.logger.info(
                f"WebSocket disconnected: {metadata['client_id']} "
                f"(Duration: {duration:.1f}s, Messages: {metadata['message_count']}, "
                f"Remaining connections: {len(self.active_connections)})"
            )
            del self.connection_metadata[conn_id]

    async def send_to_client(self, websocket: WebSocket, data: dict):
        """
        Send a message to a specific WebSocket connection.

        Args:
            websocket: The WebSocket connection
            data: The data to send (will be JSON serialized)
        """
        try:
            # Update activity timestamp
            conn_id = id(websocket)
            if conn_id in self.connection_metadata:
                self.connection_metadata[conn_id]["last_activity"] = time.time()
                self.connection_metadata[conn_id]["message_count"] += 1

            # Add timestamp if not present
            if "timestamp" not in data:
                data["timestamp"] = datetime.utcnow().isoformat() + "Z"

            await websocket.send_json(data)
        except Exception as e:
            self.logger.error(f"Error sending to client: {e}")
            self.disconnect(websocket)
            raise

    async def broadcast(self, data: dict, exclude: Optional[WebSocket] = None):
        """
        Broadcast a message to all connected clients.

        Args:
            data: The data to broadcast (will be JSON serialized)
            exclude: Optional WebSocket connection to exclude from broadcast
        """
        if not self.active_connections:
            return

        # Add timestamp if not present
        if "timestamp" not in data:
            data["timestamp"] = datetime.utcnow().isoformat() + "Z"

        disconnected = set()
        for connection in self.active_connections:
            if exclude and connection == exclude:
                continue

            try:
                await self.send_to_client(connection, data)
            except Exception as e:
                self.logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

    def get_connection_count(self) -> int:
        """
        Get the number of active connections.

        Returns:
            Number of active connections
        """
        return len(self.active_connections)

    def get_all_client_ids(self) -> List[str]:
        """
        Get all connected client IDs.

        Returns:
            List of client IDs
        """
        return [
            metadata["client_id"]
            for metadata in self.connection_metadata.values()
        ]

    # ===== Agent Event Broadcasting Methods =====

    async def broadcast_agent_created(self, agent_data: dict):
        """
        Broadcast agent created event.

        Args:
            agent_data: Agent information (adw_id, issue_number, workflow_type, etc.)
        """
        await self.broadcast({
            "type": "agent_created",
            "data": agent_data
        })
        self.logger.info(f"Broadcast agent_created: {agent_data.get('adw_id')}")

    async def broadcast_agent_updated(self, agent_id: str, agent_data: dict):
        """
        Broadcast agent updated event.

        Args:
            agent_id: ADW ID of the agent
            agent_data: Updated agent information
        """
        await self.broadcast({
            "type": "agent_updated",
            "data": {
                "adw_id": agent_id,
                **agent_data
            }
        })
        self.logger.debug(f"Broadcast agent_updated: {agent_id}")

    async def broadcast_agent_deleted(self, agent_id: str):
        """
        Broadcast agent deleted event.

        Args:
            agent_id: ADW ID of the deleted agent
        """
        await self.broadcast({
            "type": "agent_deleted",
            "data": {
                "adw_id": agent_id
            }
        })
        self.logger.info(f"Broadcast agent_deleted: {agent_id}")

    async def broadcast_agent_status_change(
        self,
        agent_id: str,
        old_status: str,
        new_status: str,
        message: Optional[str] = None
    ):
        """
        Broadcast agent status change event.

        Args:
            agent_id: ADW ID of the agent
            old_status: Previous status
            new_status: New status
            message: Optional status message
        """
        await self.broadcast({
            "type": "agent_status_change",
            "data": {
                "adw_id": agent_id,
                "old_status": old_status,
                "new_status": new_status,
                "message": message
            }
        })
        self.logger.info(f"Broadcast agent_status_change: {agent_id} ({old_status} → {new_status})")

    async def broadcast_agent_log(self, log_data: dict):
        """
        Broadcast agent log event.

        Args:
            log_data: Log information (adw_id, message, level, timestamp, etc.)
        """
        await self.broadcast({
            "type": "agent_log",
            "data": log_data
        })
        self.logger.debug(f"Broadcast agent_log: {log_data.get('adw_id')}")

    async def broadcast_agent_summary_update(self, agent_id: str, summary: dict):
        """
        Broadcast agent summary update event.

        Args:
            agent_id: ADW ID of the agent
            summary: Summary information
        """
        await self.broadcast({
            "type": "agent_summary_update",
            "data": {
                "adw_id": agent_id,
                "summary": summary
            }
        })
        self.logger.debug(f"Broadcast agent_summary_update: {agent_id}")

    # ===== Detailed Agent Operation Broadcasting =====

    async def broadcast_thinking_block(
        self,
        adw_id: str,
        content: str,
        reasoning_type: Optional[str] = None,
        duration_ms: Optional[int] = None,
        sequence: Optional[int] = None
    ):
        """
        Broadcast thinking block event.

        Args:
            adw_id: ADW ID
            content: Thinking content
            reasoning_type: Type of reasoning (planning, analysis, etc.)
            duration_ms: Duration in milliseconds
            sequence: Sequence number
        """
        await self.broadcast({
            "type": "thinking_block",
            "data": {
                "adw_id": adw_id,
                "content": content,
                "reasoning_type": reasoning_type,
                "duration_ms": duration_ms,
                "sequence": sequence
            }
        })
        self.logger.debug(f"Broadcast thinking_block: {adw_id}")

    async def broadcast_tool_use_pre(
        self,
        adw_id: str,
        tool_name: str,
        tool_input: Optional[dict] = None,
        tool_use_id: Optional[str] = None
    ):
        """
        Broadcast tool use pre-execution event.

        Args:
            adw_id: ADW ID
            tool_name: Name of the tool
            tool_input: Tool input parameters
            tool_use_id: Unique tool use identifier
        """
        await self.broadcast({
            "type": "tool_use_pre",
            "data": {
                "adw_id": adw_id,
                "tool_name": tool_name,
                "tool_input": tool_input,
                "tool_use_id": tool_use_id
            }
        })
        self.logger.debug(f"Broadcast tool_use_pre: {adw_id} - {tool_name}")

    async def broadcast_tool_use_post(
        self,
        adw_id: str,
        tool_name: str,
        tool_output: Optional[str] = None,
        status: str = "success",
        error: Optional[str] = None,
        tool_use_id: Optional[str] = None,
        duration_ms: Optional[int] = None
    ):
        """
        Broadcast tool use post-execution event.

        Args:
            adw_id: ADW ID
            tool_name: Name of the tool
            tool_output: Tool output
            status: Execution status (success, error)
            error: Error message if failed
            tool_use_id: Unique tool use identifier
            duration_ms: Execution duration
        """
        await self.broadcast({
            "type": "tool_use_post",
            "data": {
                "adw_id": adw_id,
                "tool_name": tool_name,
                "tool_output": tool_output,
                "status": status,
                "error": error,
                "tool_use_id": tool_use_id,
                "duration_ms": duration_ms
            }
        })
        self.logger.debug(f"Broadcast tool_use_post: {adw_id} - {tool_name}")

    async def broadcast_file_changed(
        self,
        adw_id: str,
        file_path: str,
        operation: Literal["read", "write", "modify", "delete"],
        diff: Optional[str] = None,
        summary: Optional[str] = None,
        lines_added: int = 0,
        lines_removed: int = 0
    ):
        """
        Broadcast file changed event.

        Args:
            adw_id: ADW ID
            file_path: Path to the file
            operation: Type of operation
            diff: Git diff of changes
            summary: Summary of changes
            lines_added: Number of lines added
            lines_removed: Number of lines removed
        """
        await self.broadcast({
            "type": "file_changed",
            "data": {
                "adw_id": adw_id,
                "file_path": file_path,
                "operation": operation,
                "diff": diff,
                "summary": summary,
                "lines_added": lines_added,
                "lines_removed": lines_removed
            }
        })
        self.logger.debug(f"Broadcast file_changed: {adw_id} - {file_path}")

    async def broadcast_text_block(
        self,
        adw_id: str,
        content: str,
        sequence: Optional[int] = None
    ):
        """
        Broadcast text block event.

        Args:
            adw_id: ADW ID
            content: Text content
            sequence: Sequence number
        """
        await self.broadcast({
            "type": "text_block",
            "data": {
                "adw_id": adw_id,
                "content": content,
                "sequence": sequence
            }
        })
        self.logger.debug(f"Broadcast text_block: {adw_id}")

    # ===== System and Orchestrator Broadcasting =====

    async def broadcast_orchestrator_updated(self, orchestrator_data: dict):
        """
        Broadcast orchestrator updated event.

        Args:
            orchestrator_data: Orchestrator information
        """
        await self.broadcast({
            "type": "orchestrator_updated",
            "data": orchestrator_data
        })
        self.logger.info("Broadcast orchestrator_updated")

    async def broadcast_system_log(self, log_data: dict):
        """
        Broadcast system log event.

        Args:
            log_data: Log information (message, level, etc.)
        """
        await self.broadcast({
            "type": "system_log",
            "data": log_data
        })
        self.logger.debug("Broadcast system_log")

    async def broadcast_error(self, error_message: str, details: Optional[dict] = None):
        """
        Broadcast error event.

        Args:
            error_message: Error message
            details: Optional error details
        """
        await self.broadcast({
            "type": "error",
            "data": {
                "message": error_message,
                "details": details or {}
            }
        })
        self.logger.error(f"Broadcast error: {error_message}")

    # ===== Chat and Streaming Broadcasting =====

    async def broadcast_chat_message(self, message_data: dict):
        """
        Broadcast chat message event.

        Args:
            message_data: Chat message information
        """
        await self.broadcast({
            "type": "chat_message",
            "data": message_data
        })
        self.logger.debug("Broadcast chat_message")

    async def broadcast_chat_stream(
        self,
        orchestrator_agent_id: str,
        chunk: str,
        is_complete: bool = False
    ):
        """
        Broadcast streaming chat chunk.

        Args:
            orchestrator_agent_id: Orchestrator agent ID
            chunk: Text chunk
            is_complete: Whether this is the final chunk
        """
        await self.broadcast({
            "type": "chat_stream",
            "data": {
                "orchestrator_agent_id": orchestrator_agent_id,
                "chunk": chunk,
                "is_complete": is_complete
            }
        })
        self.logger.debug(f"Broadcast chat_stream: {orchestrator_agent_id}")

    async def set_typing_indicator(
        self,
        orchestrator_agent_id: str,
        is_typing: bool
    ):
        """
        Set typing indicator for chat.

        Args:
            orchestrator_agent_id: Orchestrator agent ID
            is_typing: Whether agent is typing
        """
        await self.broadcast({
            "type": "typing_indicator",
            "data": {
                "orchestrator_agent_id": orchestrator_agent_id,
                "is_typing": is_typing
            }
        })
        self.logger.debug(f"Set typing_indicator: {orchestrator_agent_id} - {is_typing}")

    # ===== Screenshot and Spec Broadcasting =====

    async def broadcast_screenshot_available(
        self,
        adw_id: str,
        screenshot_path: str,
        screenshot_type: str = "review",
        metadata: Optional[dict] = None
    ):
        """
        Broadcast screenshot available event.

        Args:
            adw_id: ADW ID
            screenshot_path: Path to screenshot file
            screenshot_type: Type of screenshot (review, error, comparison)
            metadata: Optional metadata
        """
        await self.broadcast({
            "type": "screenshot_available",
            "data": {
                "adw_id": adw_id,
                "screenshot_path": screenshot_path,
                "screenshot_type": screenshot_type,
                "metadata": metadata or {}
            }
        })
        self.logger.info(f"Broadcast screenshot_available: {adw_id} - {screenshot_path}")

    async def broadcast_spec_created(
        self,
        adw_id: str,
        spec_path: str,
        spec_type: str = "plan",
        metadata: Optional[dict] = None
    ):
        """
        Broadcast spec created event.

        Args:
            adw_id: ADW ID
            spec_path: Path to spec file
            spec_type: Type of spec (plan, patch, review)
            metadata: Optional metadata
        """
        await self.broadcast({
            "type": "spec_created",
            "data": {
                "adw_id": adw_id,
                "spec_path": spec_path,
                "spec_type": spec_type,
                "metadata": metadata or {}
            }
        })
        self.logger.info(f"Broadcast spec_created: {adw_id} - {spec_path}")

    # ===== Heartbeat =====

    async def send_heartbeat(self):
        """Send heartbeat to all connected clients."""
        await self.broadcast({
            "type": "heartbeat",
            "data": {
                "active_connections": len(self.active_connections),
                "server_time": datetime.utcnow().isoformat() + "Z"
            }
        })
        self.logger.debug(f"Sent heartbeat to {len(self.active_connections)} clients")


# Global WebSocket manager instance
_ws_manager: Optional[WebSocketManager] = None


def get_websocket_manager() -> WebSocketManager:
    """
    Get the global WebSocket manager instance.

    Returns:
        The global WebSocketManager instance
    """
    global _ws_manager
    if _ws_manager is None:
        _ws_manager = WebSocketManager()
    return _ws_manager
