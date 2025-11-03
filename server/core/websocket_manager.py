"""
WebSocket Manager for Real-Time Event Broadcasting

Provides infrastructure for broadcasting structured events to connected clients
in real-time. Inspired by multi-agent-orchestration app's WebSocket implementation.

Event Types:
- agent_log: Structured log events from agent execution
- system_log: System-level log messages
- agent_summary_update: Agent status and progress summaries
- chat_stream: Real-time chat/output streaming

Features:
- Connection management with metadata tracking
- Broadcast methods for different event types
- Structured event payloads with timestamps
- Error handling and connection cleanup
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
            client_info: Optional metadata about the client (user_id, session_id, etc.)

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
