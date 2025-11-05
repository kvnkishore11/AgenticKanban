"""
WebSocket Client for ADW Workflows

This module provides a simple HTTP-based client for ADW workflows to send
status updates, progress reports, and logs to the WebSocket server.

Since workflows run as separate processes, they cannot directly access the
WebSocket server's connection manager. Instead, they POST messages to an
HTTP endpoint on the WebSocket server, which then broadcasts them to
connected WebSocket clients.

Usage:
    from adw_modules.websocket_client import WebSocketNotifier

    # Initialize notifier
    notifier = WebSocketNotifier(adw_id="your-adw-id")

    # Send status updates
    notifier.notify_start(workflow_name="adw_plan_iso")
    notifier.notify_progress(workflow_name="adw_plan_iso", percent=25, step="Reading spec")
    notifier.notify_log(workflow_name="adw_plan_iso", message="Creating plan...")
    notifier.notify_complete(workflow_name="adw_plan_iso", message="Plan created successfully")

    # Or send error
    notifier.notify_error(workflow_name="adw_plan_iso", error="Failed to read spec")
"""

import os
import requests
from datetime import datetime
from typing import Optional, Literal
import logging


class WebSocketNotifier:
    """Client for sending workflow updates to WebSocket server via HTTP."""

    def __init__(self, adw_id: str, server_url: Optional[str] = None):
        """
        Initialize WebSocket notifier.

        Args:
            adw_id: ADW ID for the workflow
            server_url: WebSocket server URL (default: http://localhost:8500)
        """
        self.adw_id = adw_id

        # Get server URL from environment or use default
        if server_url is None:
            port = os.getenv("WEBSOCKET_PORT", "8500")
            server_url = f"http://localhost:{port}"

        self.server_url = server_url.rstrip("/")
        self.endpoint = f"{self.server_url}/api/workflow-updates"

        # Setup logger
        self.logger = logging.getLogger(f"WebSocketNotifier-{adw_id}")

        # Disable notifications if environment variable is set
        self.enabled = os.getenv("DISABLE_WEBSOCKET_NOTIFICATIONS", "false").lower() != "true"

        if not self.enabled:
            self.logger.info("WebSocket notifications disabled via environment variable")

    def _send_message(
        self,
        message_type: str,
        data: dict,
        timeout: int = 2
    ) -> bool:
        """
        Send a message to the WebSocket server.

        Args:
            message_type: Type of message (status_update, workflow_log, etc.)
            data: Message data
            timeout: Request timeout in seconds

        Returns:
            True if message sent successfully, False otherwise
        """
        if not self.enabled:
            return False

        try:
            payload = {
                "type": message_type,
                "data": data
            }

            response = requests.post(
                self.endpoint,
                json=payload,
                timeout=timeout,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                self.logger.debug(f"Sent {message_type} to WebSocket server")
                return True
            else:
                self.logger.warning(
                    f"Failed to send {message_type}: HTTP {response.status_code} - {response.text}"
                )
                return False

        except requests.exceptions.ConnectionError:
            # Silently ignore connection errors - WebSocket server may not be running
            # This is common in testing environments or when running workflows standalone
            self.logger.debug(f"WebSocket server not available at {self.endpoint}")
            return False
        except requests.exceptions.Timeout:
            self.logger.warning(f"Timeout sending {message_type} to WebSocket server")
            return False
        except Exception as e:
            self.logger.error(f"Error sending {message_type}: {str(e)}")
            return False

    def send_status_update(
        self,
        workflow_name: str,
        status: Literal["started", "in_progress", "completed", "failed"],
        message: str,
        progress_percent: Optional[int] = None,
        current_step: Optional[str] = None
    ) -> bool:
        """
        Send a status update message.

        Args:
            workflow_name: Name of the workflow
            status: Current status
            message: Human-readable status message
            progress_percent: Optional progress percentage (0-100)
            current_step: Optional current step description

        Returns:
            True if sent successfully
        """
        data = {
            "adw_id": self.adw_id,
            "workflow_name": workflow_name,
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "progress_percent": progress_percent,
            "current_step": current_step
        }

        return self._send_message("status_update", data)

    def send_log(
        self,
        workflow_name: str,
        message: str,
        level: Literal["INFO", "SUCCESS", "ERROR", "WARNING"] = "INFO"
    ) -> bool:
        """
        Send a log message.

        Args:
            workflow_name: Name of the workflow
            message: Log message
            level: Log level

        Returns:
            True if sent successfully
        """
        data = {
            "adw_id": self.adw_id,
            "workflow_name": workflow_name,
            "message": message,
            "level": level,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        return self._send_message("workflow_log", data)

    # Convenience methods for common workflow events

    def notify_start(self, workflow_name: str, message: Optional[str] = None) -> bool:
        """
        Notify that workflow has started.

        Args:
            workflow_name: Name of the workflow
            message: Optional custom message

        Returns:
            True if sent successfully
        """
        msg = message or f"Workflow {workflow_name} started"
        return self.send_status_update(
            workflow_name=workflow_name,
            status="started",
            message=msg,
            progress_percent=0,
            current_step="Initializing"
        )

    def notify_progress(
        self,
        workflow_name: str,
        percent: int,
        step: str,
        message: Optional[str] = None
    ) -> bool:
        """
        Notify workflow progress.

        Args:
            workflow_name: Name of the workflow
            percent: Progress percentage (0-100)
            step: Current step description
            message: Optional custom message

        Returns:
            True if sent successfully
        """
        msg = message or f"Progress: {percent}% - {step}"
        return self.send_status_update(
            workflow_name=workflow_name,
            status="in_progress",
            message=msg,
            progress_percent=percent,
            current_step=step
        )

    def notify_complete(
        self,
        workflow_name: str,
        message: Optional[str] = None,
        final_step: Optional[str] = None
    ) -> bool:
        """
        Notify workflow completion.

        Args:
            workflow_name: Name of the workflow
            message: Optional custom message
            final_step: Optional final step description

        Returns:
            True if sent successfully
        """
        msg = message or f"Workflow {workflow_name} completed successfully"
        return self.send_status_update(
            workflow_name=workflow_name,
            status="completed",
            message=msg,
            progress_percent=100,
            current_step=final_step or "Complete"
        )

    def notify_error(
        self,
        workflow_name: str,
        error: str,
        current_step: Optional[str] = None
    ) -> bool:
        """
        Notify workflow error.

        Args:
            workflow_name: Name of the workflow
            error: Error message
            current_step: Optional step where error occurred

        Returns:
            True if sent successfully
        """
        # Send both status update and error log
        self.send_log(workflow_name, f"ERROR: {error}", level="ERROR")

        return self.send_status_update(
            workflow_name=workflow_name,
            status="failed",
            message=f"Workflow failed: {error}",
            current_step=current_step or "Error"
        )

    def notify_log(
        self,
        workflow_name: str,
        message: str,
        level: Literal["INFO", "SUCCESS", "ERROR", "WARNING"] = "INFO"
    ) -> bool:
        """
        Send a log message (alias for send_log for convenience).

        Args:
            workflow_name: Name of the workflow
            message: Log message
            level: Log level

        Returns:
            True if sent successfully
        """
        return self.send_log(workflow_name, message, level)

    def notify_stage_transition(
        self,
        workflow_name: str,
        from_stage: str,
        to_stage: str,
        message: Optional[str] = None
    ) -> bool:
        """
        Notify stage transition in composite workflows.

        Args:
            workflow_name: Name of the workflow
            from_stage: Previous stage
            to_stage: New stage
            message: Optional custom message

        Returns:
            True if sent successfully
        """
        msg = message or f"Transitioning from {from_stage} to {to_stage}"
        self.send_log(workflow_name, msg, level="INFO")

        return self.send_status_update(
            workflow_name=workflow_name,
            status="in_progress",
            message=msg,
            current_step=f"Stage: {to_stage}"
        )

    # ===== Granular Agent State Update Methods =====

    def send_agent_state_update(
        self,
        event_type: str,
        data: dict,
        timeout: int = 2
    ) -> bool:
        """
        Send a granular agent state update to the new agent state streaming endpoint.

        Args:
            event_type: Type of event (state_change, log_entry, file_operation, thinking, tool_execution)
            data: Event-specific payload
            timeout: Request timeout in seconds

        Returns:
            True if sent successfully
        """
        if not self.enabled:
            return False

        try:
            endpoint = f"{self.server_url}/api/agent-state-update"
            payload = {
                "adw_id": self.adw_id,
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }

            response = requests.post(
                endpoint,
                json=payload,
                timeout=timeout,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                self.logger.debug(f"Sent agent state update ({event_type}) to WebSocket server")
                return True
            else:
                self.logger.warning(
                    f"Failed to send agent state update: HTTP {response.status_code} - {response.text}"
                )
                return False

        except requests.exceptions.ConnectionError:
            self.logger.debug(f"WebSocket server not available at {self.server_url}")
            return False
        except requests.exceptions.Timeout:
            self.logger.warning(f"Timeout sending agent state update to WebSocket server")
            return False
        except Exception as e:
            self.logger.error(f"Error sending agent state update: {str(e)}")
            return False

    def send_agent_log_entry(
        self,
        message: str,
        level: Literal["INFO", "WARNING", "ERROR", "DEBUG", "SUCCESS"] = "INFO",
        details: Optional[str] = None,
        context: Optional[dict] = None
    ) -> bool:
        """
        Send a detailed log entry with context.

        Args:
            message: Log message
            level: Log level
            details: Additional details
            context: Contextual data

        Returns:
            True if sent successfully
        """
        data = {
            "message": message,
            "level": level,
            "details": details,
            "context": context or {},
            "event_category": "system",
            "type": "log_entry"
        }

        return self.send_agent_state_update("log_entry", data)

    def send_file_operation(
        self,
        file_path: str,
        operation: Literal["read", "write", "modify", "delete"],
        diff: Optional[str] = None,
        summary: Optional[str] = None,
        lines_added: int = 0,
        lines_removed: int = 0
    ) -> bool:
        """
        Send a file operation notification.

        Args:
            file_path: Path to the file
            operation: Type of operation
            diff: Git diff of changes
            summary: AI-generated summary
            lines_added: Number of lines added
            lines_removed: Number of lines removed

        Returns:
            True if sent successfully
        """
        data = {
            "file_path": file_path,
            "operation": operation,
            "diff": diff,
            "summary": summary,
            "lines_added": lines_added,
            "lines_removed": lines_removed
        }

        return self.send_agent_state_update("file_operation", data)

    def send_agent_thinking(
        self,
        content: str,
        duration_ms: Optional[int] = None,
        sequence: Optional[int] = None
    ) -> bool:
        """
        Send a Claude Code thinking block.

        Args:
            content: Thinking content
            duration_ms: Duration in milliseconds
            sequence: Sequence number

        Returns:
            True if sent successfully
        """
        data = {
            "content": content,
            "duration_ms": duration_ms,
            "sequence": sequence
        }

        return self.send_agent_state_update("thinking", data)

    def send_tool_execution(
        self,
        tool_name: str,
        phase: Literal["pre", "post"],
        tool_use_id: Optional[str] = None,
        input_data: Optional[dict] = None,
        output: Optional[str] = None,
        duration_ms: Optional[int] = None,
        success: bool = True,
        error: Optional[str] = None
    ) -> bool:
        """
        Send a tool execution event (pre or post).

        Args:
            tool_name: Name of the tool
            phase: Execution phase (pre or post)
            tool_use_id: Unique tool use identifier
            input_data: Tool input parameters
            output: Tool output
            duration_ms: Execution duration
            success: Whether execution was successful
            error: Error message if failed

        Returns:
            True if sent successfully
        """
        event_type = f"tool_execution_{phase}"

        data = {
            "tool_name": tool_name,
            "tool_use_id": tool_use_id,
            "input": input_data,
            "output": output,
            "duration_ms": duration_ms,
            "success": success,
            "error": error
        }

        return self.send_agent_state_update(event_type, data)

    def send_text_block(
        self,
        content: str,
        sequence: Optional[int] = None
    ) -> bool:
        """
        Send a text block from Claude.

        Args:
            content: Text content
            sequence: Sequence number

        Returns:
            True if sent successfully
        """
        data = {
            "content": content,
            "sequence": sequence
        }

        return self.send_agent_state_update("text_block", data)
