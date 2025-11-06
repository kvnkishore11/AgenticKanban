"""
WebSocket Manager for Real-Time Event Broadcasting

Provides infrastructure for broadcasting structured events to connected clients
in real-time. Inspired by multi-agent-orchestration app's WebSocket implementation.

Event Types:
- agent_log: Structured log events from agent execution
- system_log: System-level log messages
- agent_summary_update: Agent status and progress summaries
- chat_stream: Real-time chat/output streaming
- thinking_block: Claude Code thinking blocks
- tool_use_pre/post: Pre and post tool execution events
- file_changed: File operation notifications
- text_block: Claude text responses
- summary_update: AI-generated summaries
- workflow_phase_transition: Phase transitions (plan → build → test → review → document)
- agent_output_chunk: Raw output streaming from agents/{adw_id} directories
- screenshot_available: Screenshot availability notifications
- spec_created: Specification file creation notifications
- heartbeat: Connection health monitoring

Features:
- Connection management with metadata tracking (user agent, remote address)
- Broadcast methods for different event types
- Structured event payloads with timestamps
- Error handling and connection cleanup
- Heartbeat mechanism for connection health monitoring
- ADW-specific subscriptions for targeted broadcasting
- Client-specific messaging and error delivery
- Connection metadata tracking and subscription management
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts events to all connected clients.

    This class provides infrastructure for real-time communication with frontend
    clients, enabling live log streaming, status updates, and agent summaries.
    """

    def __init__(self):
        """Initialize the WebSocket manager with empty connection list."""
        self.active_connections: List[Dict[str, Any]] = []
        self.connection_counter = 0
        logger.info("WebSocketManager initialized")

    async def connect(self, websocket: WebSocket, client_info: Optional[Dict[str, Any]] = None):
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: FastAPI WebSocket instance
            client_info: Optional metadata about the client (user_agent, remote_address, etc.)

        Returns:
            connection_id: Unique identifier for this connection
        """
        await websocket.accept()

        self.connection_counter += 1
        connection_id = f"conn_{self.connection_counter}_{datetime.utcnow().timestamp()}"

        connection_data = {
            'id': connection_id,
            'websocket': websocket,
            'connected_at': datetime.utcnow().isoformat() + 'Z',
            'client_info': client_info or {},
            'last_activity': datetime.utcnow().isoformat() + 'Z'
            # Note: 'subscribed_adw_ids' is added dynamically via subscribe_to_adw()
            # When not present, connection receives all events (broadcast to all)
        }

        self.active_connections.append(connection_data)

        logger.info(f"WebSocket connected: {connection_id} (Total connections: {len(self.active_connections)})")

        # Send connection acknowledgment
        await self._send_to_connection(connection_data, {
            'type': 'connection_ack',
            'data': {
                'connection_id': connection_id,
                'connected_at': connection_data['connected_at'],
                'message': 'Connected to AgenticKanban WebSocket server'
            }
        })

        return connection_id

    def disconnect(self, websocket: WebSocket):
        """
        Remove a WebSocket connection from active connections.

        Args:
            websocket: FastAPI WebSocket instance to disconnect
        """
        for connection in self.active_connections:
            if connection['websocket'] == websocket:
                connection_id = connection['id']
                self.active_connections.remove(connection)
                logger.info(f"WebSocket disconnected: {connection_id} (Total connections: {len(self.active_connections)})")
                break

    async def broadcast_agent_log(
        self,
        adw_id: str,
        event_category: str,
        event_type: str,
        message: str,
        summary: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        level: str = 'INFO',
        current_step: Optional[str] = None
    ):
        """
        Broadcast an agent log event to all connected clients.

        Args:
            adw_id: ADW workflow identifier
            event_category: Category of event (hook, response, status)
            event_type: Type of event (PreToolUse, ToolUseBlock, TextBlock, ThinkingBlock)
            message: Main log message
            summary: Optional 15-word AI-generated summary
            payload: Optional event metadata (tool names, parameters, file changes)
            level: Log level (INFO, SUCCESS, WARNING, ERROR, DEBUG)
            current_step: Optional current workflow step
        """
        event = {
            'type': 'agent_log',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'event_category': event_category,
                'event_type': event_type,
                'level': level,
                'message': message,
                'summary': summary,
                'current_step': current_step,
                'payload': payload or {}
            }
        }

        await self._broadcast(event)

    async def broadcast_system_log(
        self,
        message: str,
        level: str = 'INFO',
        details: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Broadcast a system-level log message to all connected clients.

        Args:
            message: Log message
            level: Log level (INFO, WARNING, ERROR, SUCCESS)
            details: Optional additional details
            context: Optional context information
        """
        event = {
            'type': 'system_log',
            'data': {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'level': level,
                'message': message,
                'details': details,
                'context': context or {}
            }
        }

        await self._broadcast(event)

    async def broadcast_agent_summary_update(
        self,
        adw_id: str,
        status: str,
        progress_percent: Optional[float] = None,
        current_step: Optional[str] = None,
        workflow_name: Optional[str] = None,
        message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Broadcast an agent status/summary update to all connected clients.

        Args:
            adw_id: ADW workflow identifier
            status: Workflow status (started, in_progress, completed, failed)
            progress_percent: Optional progress percentage (0-100)
            current_step: Optional current workflow step
            workflow_name: Optional workflow name
            message: Optional status message
            metadata: Optional additional metadata
        """
        event = {
            'type': 'agent_summary_update',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'status': status,
                'progress_percent': progress_percent,
                'current_step': current_step,
                'workflow_name': workflow_name,
                'message': message,
                'metadata': metadata or {}
            }
        }

        await self._broadcast(event)

    async def broadcast_chat_stream(
        self,
        adw_id: str,
        content: str,
        stream_type: str = 'text',
        is_complete: bool = False
    ):
        """
        Broadcast a chat/output stream chunk to all connected clients.

        Args:
            adw_id: ADW workflow identifier
            content: Content to stream
            stream_type: Type of content (text, code, markdown)
            is_complete: Whether this is the final chunk
        """
        event = {
            'type': 'chat_stream',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'content': content,
                'stream_type': stream_type,
                'is_complete': is_complete
            }
        }

        await self._broadcast(event)

    async def _broadcast(self, event: Dict[str, Any]):
        """
        Internal method to broadcast an event to all active connections.

        Args:
            event: Event dictionary to broadcast
        """
        if not self.active_connections:
            logger.debug(f"No active connections to broadcast {event['type']} event")
            return

        disconnected = []

        for connection in self.active_connections:
            try:
                success = await self._send_to_connection(connection, event)
                if not success:
                    disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting to connection {connection['id']}: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            try:
                self.disconnect(connection['websocket'])
            except Exception as e:
                logger.error(f"Error disconnecting {connection['id']}: {e}")

        logger.debug(f"Broadcasted {event['type']} to {len(self.active_connections)} connections")

    async def _send_to_connection(self, connection: Dict[str, Any], event: Dict[str, Any]) -> bool:
        """
        Send an event to a specific connection.

        Args:
            connection: Connection data dictionary
            event: Event to send

        Returns:
            bool: True if successful, False if connection is broken
        """
        try:
            websocket = connection['websocket']
            message = json.dumps(event)
            await websocket.send_text(message)

            # Update last activity timestamp
            connection['last_activity'] = datetime.utcnow().isoformat() + 'Z'

            return True
        except WebSocketDisconnect:
            logger.warning(f"Connection {connection['id']} disconnected during send")
            return False
        except Exception as e:
            logger.error(f"Error sending to connection {connection['id']}: {e}")
            return False

    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)

    def get_connection_info(self) -> List[Dict[str, Any]]:
        """
        Get information about all active connections.

        Returns:
            List of connection metadata (without WebSocket objects)
        """
        return [
            {
                'id': conn['id'],
                'connected_at': conn['connected_at'],
                'last_activity': conn['last_activity'],
                'client_info': conn['client_info']
            }
            for conn in self.active_connections
        ]

    async def ping_all(self):
        """
        Send ping messages to all connections to check health.
        Useful for keepalive and detecting stale connections.
        """
        event = {
            'type': 'ping',
            'data': {
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
        }
        await self._broadcast(event)

    # ===== New Granular Streaming Methods =====

    async def broadcast_thinking_block(
        self,
        adw_id: str,
        content: str,
        duration_ms: Optional[int] = None,
        sequence: Optional[int] = None
    ):
        """
        Broadcast a thinking block event (Claude's internal reasoning).

        Args:
            adw_id: ADW workflow identifier
            content: Thinking content from Claude
            duration_ms: Optional duration of thinking in milliseconds
            sequence: Optional sequence number for ordering
        """
        event = {
            'type': 'thinking_block',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'content': content,
                'duration_ms': duration_ms,
                'sequence': sequence
            }
        }

        await self._broadcast(event)

    async def broadcast_tool_use_pre(
        self,
        adw_id: str,
        tool_name: str,
        input_data: Dict[str, Any],
        tool_use_id: Optional[str] = None
    ):
        """
        Broadcast a pre-tool execution event.

        Args:
            adw_id: ADW workflow identifier
            tool_name: Name of the tool about to be executed
            input_data: Input parameters for the tool
            tool_use_id: Unique identifier for this tool use
        """
        event = {
            'type': 'tool_use_pre',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'tool_name': tool_name,
                'input': input_data,
                'tool_use_id': tool_use_id
            }
        }

        await self._broadcast(event)

    async def broadcast_tool_use_post(
        self,
        adw_id: str,
        tool_name: str,
        tool_use_id: Optional[str],
        output: Any,
        duration_ms: int,
        success: bool = True,
        error: Optional[str] = None
    ):
        """
        Broadcast a post-tool execution event.

        Args:
            adw_id: ADW workflow identifier
            tool_name: Name of the tool that was executed
            tool_use_id: Unique identifier for this tool use
            output: Output from the tool
            duration_ms: Execution duration in milliseconds
            success: Whether execution was successful
            error: Error message if execution failed
        """
        event = {
            'type': 'tool_use_post',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'tool_name': tool_name,
                'tool_use_id': tool_use_id,
                'output': str(output) if output else None,
                'duration_ms': duration_ms,
                'success': success,
                'error': error
            }
        }

        await self._broadcast(event)

    async def broadcast_file_changed(
        self,
        adw_id: str,
        file_path: str,
        operation: str,
        diff: Optional[str] = None,
        summary: Optional[str] = None,
        lines_added: int = 0,
        lines_removed: int = 0
    ):
        """
        Broadcast a file change event.

        Args:
            adw_id: ADW workflow identifier
            file_path: Path to the file that changed
            operation: Operation type ('read', 'modified', 'created', 'deleted')
            diff: Git diff of the changes
            summary: AI-generated summary of the change
            lines_added: Number of lines added
            lines_removed: Number of lines removed
        """
        event = {
            'type': 'file_changed',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'file_path': file_path,
                'operation': operation,
                'diff': diff,
                'summary': summary,
                'lines_added': lines_added,
                'lines_removed': lines_removed
            }
        }

        await self._broadcast(event)

    async def broadcast_summary_update(
        self,
        adw_id: str,
        summary_type: str,
        content: str,
        related_file: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Broadcast an AI-generated summary update.

        Args:
            adw_id: ADW workflow identifier
            summary_type: Type of summary ('file_change', 'tool_use', 'session')
            content: Summary content
            related_file: Optional related file path
            metadata: Optional metadata about summary generation
        """
        event = {
            'type': 'summary_update',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'summary_type': summary_type,
                'content': content,
                'related_file': related_file,
                'metadata': metadata or {}
            }
        }

        await self._broadcast(event)

    async def broadcast_text_block(
        self,
        adw_id: str,
        content: str,
        sequence: Optional[int] = None
    ):
        """
        Broadcast a text block event (Claude's text response).

        Args:
            adw_id: ADW workflow identifier
            content: Text content from Claude
            sequence: Optional sequence number for ordering
        """
        event = {
            'type': 'text_block',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'content': content,
                'sequence': sequence
            }
        }

        await self._broadcast(event)

    # ===== Enhanced Agent Directory Streaming Methods =====

    async def broadcast_heartbeat(self):
        """
        Broadcast a heartbeat/ping event for connection health monitoring.

        This method sends periodic heartbeat events to all connected clients
        to maintain connection health and detect stale connections.
        """
        event = {
            'type': 'heartbeat',
            'data': {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'active_connections': len(self.active_connections),
                'server_status': 'healthy'
            }
        }

        await self._broadcast(event)
        logger.debug(f"Broadcasted heartbeat to {len(self.active_connections)} connections")

    async def broadcast_workflow_phase_transition(
        self,
        adw_id: str,
        phase_from: Optional[str],
        phase_to: str,
        workflow_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Broadcast a workflow phase transition event (plan → build → test → review → document).

        Args:
            adw_id: ADW workflow identifier
            phase_from: Previous phase name (None if starting)
            phase_to: New phase name
            workflow_name: Optional workflow name (e.g., 'adw_sdlc_iso')
            metadata: Optional metadata about the transition
        """
        event = {
            'type': 'workflow_phase_transition',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'phase_from': phase_from,
                'phase_to': phase_to,
                'workflow_name': workflow_name,
                'metadata': metadata or {}
            }
        }

        await self._broadcast(event)
        logger.info(f"Broadcasted phase transition for {adw_id}: {phase_from} → {phase_to}")

    async def broadcast_agent_output_chunk(
        self,
        adw_id: str,
        agent_role: str,
        content: str,
        line_number: Optional[int] = None,
        total_lines: Optional[int] = None,
        is_complete: bool = False
    ):
        """
        Broadcast a chunk from agent's raw_output.jsonl file.

        Args:
            adw_id: ADW workflow identifier
            agent_role: Agent role (planner, implementor, tester, reviewer, documenter)
            content: Content chunk from raw_output.jsonl
            line_number: Optional line number in the file
            total_lines: Optional total lines in the file
            is_complete: Whether this is the last chunk
        """
        event = {
            'type': 'agent_output_chunk',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'agent_role': agent_role,
                'content': content,
                'line_number': line_number,
                'total_lines': total_lines,
                'is_complete': is_complete
            }
        }

        await self._broadcast(event)

    async def broadcast_screenshot_available(
        self,
        adw_id: str,
        screenshot_path: str,
        screenshot_type: str = 'review',
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Broadcast a notification that a screenshot is available.

        Args:
            adw_id: ADW workflow identifier
            screenshot_path: Path to the screenshot file (relative to agents/{adw_id})
            screenshot_type: Type of screenshot (review, error, comparison)
            metadata: Optional metadata (dimensions, file size, etc.)
        """
        event = {
            'type': 'screenshot_available',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'screenshot_path': screenshot_path,
                'screenshot_type': screenshot_type,
                'metadata': metadata or {}
            }
        }

        await self._broadcast(event)
        logger.info(f"Broadcasted screenshot availability for {adw_id}: {screenshot_path}")

    async def broadcast_spec_created(
        self,
        adw_id: str,
        spec_path: str,
        spec_type: str = 'plan',
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Broadcast a notification that a specification file has been created.

        Args:
            adw_id: ADW workflow identifier
            spec_path: Path to the spec file (relative to repository root)
            spec_type: Type of spec (plan, patch, review)
            metadata: Optional metadata (file size, line count, etc.)
        """
        event = {
            'type': 'spec_created',
            'data': {
                'adw_id': adw_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'spec_path': spec_path,
                'spec_type': spec_type,
                'metadata': metadata or {}
            }
        }

        await self._broadcast(event)
        logger.info(f"Broadcasted spec creation for {adw_id}: {spec_path}")

    # ===== Enhanced Connection Management =====

    def subscribe_to_adw(self, connection_id: str, adw_id: str):
        """
        Subscribe a connection to receive events for a specific ADW ID.

        Args:
            connection_id: Connection identifier
            adw_id: ADW workflow identifier to subscribe to
        """
        for connection in self.active_connections:
            if connection['id'] == connection_id:
                if 'subscribed_adw_ids' not in connection:
                    connection['subscribed_adw_ids'] = set()
                connection['subscribed_adw_ids'].add(adw_id)
                logger.info(f"Connection {connection_id} subscribed to ADW {adw_id}")
                return True
        logger.warning(f"Connection {connection_id} not found for ADW subscription")
        return False

    def unsubscribe_from_adw(self, connection_id: str, adw_id: str):
        """
        Unsubscribe a connection from receiving events for a specific ADW ID.

        Args:
            connection_id: Connection identifier
            adw_id: ADW workflow identifier to unsubscribe from
        """
        for connection in self.active_connections:
            if connection['id'] == connection_id:
                if 'subscribed_adw_ids' in connection and adw_id in connection['subscribed_adw_ids']:
                    connection['subscribed_adw_ids'].remove(adw_id)
                    logger.info(f"Connection {connection_id} unsubscribed from ADW {adw_id}")
                return True
        return False

    def get_subscribers(self, adw_id: str) -> List[Dict[str, Any]]:
        """
        Get all connections subscribed to a specific ADW ID.

        Args:
            adw_id: ADW workflow identifier

        Returns:
            List of connection data dictionaries subscribed to the ADW
        """
        subscribers = []
        for connection in self.active_connections:
            # If connection has no subscriptions, they receive all events
            if 'subscribed_adw_ids' not in connection:
                subscribers.append(connection)
            # If connection is subscribed to this ADW, include them
            elif adw_id in connection['subscribed_adw_ids']:
                subscribers.append(connection)
        return subscribers

    async def send_to_client_by_id(self, connection_id: str, event: Dict[str, Any]) -> bool:
        """
        Send an event to a specific client connection.

        Args:
            connection_id: Connection identifier
            event: Event to send

        Returns:
            True if sent successfully, False otherwise
        """
        for connection in self.active_connections:
            if connection['id'] == connection_id:
                return await self._send_to_connection(connection, event)
        logger.warning(f"Connection {connection_id} not found for direct message")
        return False

    async def send_error_to_client(
        self,
        connection_id: str,
        error_code: str,
        error_message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Send an error message to a specific client.

        Args:
            connection_id: Connection identifier
            error_code: Error code identifier
            error_message: Human-readable error message
            details: Optional error details
        """
        event = {
            'type': 'error',
            'data': {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'error_code': error_code,
                'error_message': error_message,
                'details': details or {}
            }
        }

        success = await self.send_to_client_by_id(connection_id, event)
        if success:
            logger.info(f"Sent error to client {connection_id}: {error_code}")
        else:
            logger.error(f"Failed to send error to client {connection_id}")
