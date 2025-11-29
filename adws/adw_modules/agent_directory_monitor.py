#!/usr/bin/env -S uv run
# /// script
# dependencies = ["watchdog"]
# ///

"""
Agent Directory Monitor - Monitor agents/{adw_id} for real-time changes

This module monitors the agents/{adw_id} directory structure for real-time file changes
and broadcasts structured events via WebSocket. It watches:

- adw_state.json for state changes
- raw_output.jsonl files for agent output streaming
- execution.log files for detailed logs
- review_img/ directory for screenshots
- specs/ directory for spec files

The monitor uses the watchdog library for efficient file system monitoring and parses
JSONL files to extract structured events (thinking blocks, tool usage, file changes, etc.).

Usage:
    from adw_modules.agent_directory_monitor import AgentDirectoryMonitor
    from adw_modules.websocket_manager import get_websocket_manager

    # Initialize monitor
    ws_manager = get_websocket_manager()
    monitor = AgentDirectoryMonitor(
        adw_id="adw-abc123",
        websocket_manager=ws_manager
    )

    # Start monitoring in background
    monitor.start_monitoring()

    # Stop monitoring when done
    monitor.stop_monitoring()
"""

import asyncio
import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Optional, Dict, Any, Set
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class AgentDirectoryMonitor:
    """
    Monitor agents/{adw_id} directory for real-time changes.

    Watches various files and directories within the agent workspace and broadcasts
    structured events to WebSocket clients for real-time visibility into agent operations.
    """

    def __init__(
        self,
        adw_id: str,
        websocket_manager,
        agents_base_dir: str = "agents",
        specs_dir: str = "specs"
    ):
        """
        Initialize the agent directory monitor.

        Args:
            adw_id: ADW ID to monitor
            websocket_manager: WebSocketManager instance for broadcasting events
            agents_base_dir: Base directory for agents (default: "agents")
            specs_dir: Directory containing spec files (default: "specs")
        """
        self.adw_id = adw_id
        self.ws_manager = websocket_manager
        self.agents_base_dir = agents_base_dir
        self.specs_dir = specs_dir
        self.logger = logging.getLogger(f"AgentDirectoryMonitor-{adw_id}")

        # Paths
        self.agent_dir = os.path.join(agents_base_dir, adw_id)
        self.state_file = os.path.join(self.agent_dir, "adw_state.json")

        # Monitoring state
        self.observer: Optional[Observer] = None
        self.is_monitoring = False
        self.file_positions: Dict[str, int] = {}  # Track file read positions for tailing
        self.seen_screenshots: Set[str] = set()  # Track already-seen screenshots
        self.seen_specs: Set[str] = set()  # Track already-seen specs
        self.previous_state: Optional[Dict[str, Any]] = None  # Track previous ADW state

        # Tracked raw_output.jsonl files (discovered dynamically)
        self.tracked_jsonl_files: Set[str] = set()

        # Store the main event loop for thread-safe async calls
        self.loop = None

    def _run_async(self, coro):
        """Helper to run async coroutines from sync context (thread-safe)."""
        if self.loop is None:
            self.logger.error("Event loop not set - cannot broadcast events")
            return

        try:
            # Use run_coroutine_threadsafe for thread-safe async execution
            future = asyncio.run_coroutine_threadsafe(coro, self.loop)
            # Don't block waiting for result - fire and forget
            # But add error logging callback
            def log_error(fut):
                try:
                    fut.result(timeout=0.1)
                except Exception as e:
                    self.logger.error(f"Async broadcast failed: {e}")
            future.add_done_callback(log_error)
        except Exception as e:
            self.logger.error(f"Failed to schedule async operation: {e}")

    def start_monitoring(self):
        """Start monitoring the agent directory."""
        if self.is_monitoring:
            self.logger.warning("Monitor already running")
            return

        # Capture the main event loop for thread-safe async calls
        try:
            self.loop = asyncio.get_running_loop()
            self.logger.info(f"Captured running event loop for thread-safe broadcasts")
        except RuntimeError:
            # No running loop - try to get the current event loop
            try:
                self.loop = asyncio.get_event_loop()
                self.logger.info(f"Using current event loop for broadcasts")
            except RuntimeError:
                self.logger.warning("No event loop available - broadcasts will fail")
                self.loop = None

        # Check if agent directory exists
        if not os.path.exists(self.agent_dir):
            self.logger.warning(f"Agent directory does not exist yet: {self.agent_dir}")
            # We'll still start monitoring - directory may be created later
            os.makedirs(self.agent_dir, exist_ok=True)

        self.logger.info(f"Starting agent directory monitor for {self.adw_id}")
        self.is_monitoring = True

        # Set up file system observer
        event_handler = AgentDirectoryEventHandler(self)
        self.observer = Observer()
        self.observer.schedule(event_handler, self.agent_dir, recursive=True)

        # Also watch specs directory if it exists
        if os.path.exists(self.specs_dir):
            self.observer.schedule(event_handler, self.specs_dir, recursive=False)

        self.observer.start()

        # Start background polling thread for file tailing
        # (watchdog events may not catch all appends to files)
        self.polling_thread = threading.Thread(target=self._polling_loop, daemon=True)
        self.polling_thread.start()

        self.logger.info("Agent directory monitor started")

    def stop_monitoring(self):
        """Stop monitoring the agent directory."""
        if not self.is_monitoring:
            return

        self.logger.info(f"Stopping agent directory monitor for {self.adw_id}")
        self.is_monitoring = False

        if self.observer:
            self.observer.stop()
            self.observer.join(timeout=5)
            self.observer = None

        self.logger.info("Agent directory monitor stopped")

    def _polling_loop(self):
        """Background polling loop for tailing files."""
        while self.is_monitoring:
            try:
                # Monitor adw_state.json
                self._check_state_changes()

                # Discover and tail raw_output.jsonl files dynamically
                self._discover_and_tail_jsonl_files()

                # Discover and tail execution.log files dynamically
                self._discover_and_tail_execution_logs()

                # Check for new screenshots
                self._check_screenshots()

                # Check for new specs
                self._check_specs()

                # Sleep between polls
                time.sleep(1)  # Poll every second

            except Exception as e:
                self.logger.error(f"Error in polling loop: {e}")
                time.sleep(5)  # Back off on errors

    def _check_state_changes(self):
        """Check for changes in adw_state.json."""
        if not os.path.exists(self.state_file):
            return

        try:
            with open(self.state_file, 'r') as f:
                current_state = json.load(f)

            # Check if state changed
            if self.previous_state is None:
                # First time reading state
                self.previous_state = current_state
                self.logger.info(f"Initial state loaded for {self.adw_id}")
                # Broadcast initial state
                self._broadcast_state_change(current_state, changed_fields=list(current_state.keys()))
            elif current_state != self.previous_state:
                # State changed - find what changed
                changed_fields = self._find_changed_fields(self.previous_state, current_state)
                self.logger.info(f"State changed for {self.adw_id}: {changed_fields}")
                self.previous_state = current_state
                self._broadcast_state_change(current_state, changed_fields)

        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSON in {self.state_file}: {e}")
        except Exception as e:
            self.logger.error(f"Error checking state changes: {e}")

    def _find_changed_fields(self, old_state: dict, new_state: dict) -> list:
        """Find which fields changed between two states."""
        changed = []
        all_keys = set(old_state.keys()) | set(new_state.keys())

        for key in all_keys:
            old_val = old_state.get(key)
            new_val = new_state.get(key)
            if old_val != new_val:
                changed.append(key)

        return changed

    def _broadcast_state_change(self, state: dict, changed_fields: list):
        """Broadcast state change via WebSocket."""
        try:
            self._run_async(self.ws_manager.broadcast_agent_updated(
                self.adw_id,
                {
                    "state": state,
                    "changed_fields": changed_fields
                }
            ))
        except Exception as e:
            self.logger.error(f"Error broadcasting state change: {e}")

    def _discover_and_tail_jsonl_files(self):
        """Discover and tail all raw_output.jsonl files in agent subdirectories."""
        if not os.path.exists(self.agent_dir):
            return

        try:
            # Scan for raw_output.jsonl files in all subdirectories
            for subdir in os.listdir(self.agent_dir):
                subdir_path = os.path.join(self.agent_dir, subdir)
                if not os.path.isdir(subdir_path):
                    continue

                jsonl_path = os.path.join(subdir_path, "raw_output.jsonl")
                if os.path.exists(jsonl_path):
                    # Track newly discovered files
                    if jsonl_path not in self.tracked_jsonl_files:
                        self.tracked_jsonl_files.add(jsonl_path)
                        self.logger.info(f"Discovered JSONL file: {jsonl_path}")

                    # Tail the file
                    self._tail_jsonl_file(jsonl_path)

        except Exception as e:
            self.logger.error(f"Error discovering JSONL files: {e}")

    def _tail_jsonl_file(self, jsonl_path: str):
        """Tail a specific raw_output.jsonl file."""
        if not os.path.exists(jsonl_path):
            return

        try:
            # Get current file position
            current_pos = self.file_positions.get(jsonl_path, 0)

            with open(jsonl_path, 'r') as f:
                # Seek to last known position
                f.seek(current_pos)

                # Read new lines
                for line in f:
                    line = line.strip()
                    if not line:
                        continue

                    # Parse JSONL line
                    event = self._parse_jsonl_line(line)
                    if event:
                        self._broadcast_jsonl_event(event)

                # Update file position
                self.file_positions[jsonl_path] = f.tell()

        except Exception as e:
            self.logger.error(f"Error tailing {jsonl_path}: {e}")

    def _parse_jsonl_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse a JSONL line and extract structured event data."""
        try:
            event = json.loads(line)
            return event
        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSONL line: {e}")
            return None

    def _broadcast_jsonl_event(self, event: dict):
        """
        Broadcast a parsed JSONL event via WebSocket.

        Handles Claude Code's raw_output.jsonl format which uses nested structures:
        - {"type": "assistant", "message": {"content": [{"type": "text", ...}, {"type": "tool_use", ...}]}}
        - {"type": "user", "message": {"content": [{"type": "tool_result", ...}]}}
        - {"type": "system", "subtype": "init|hook_response", ...}
        """
        try:
            # Ensure event is a dict, not a string or other type
            if not isinstance(event, dict):
                self.logger.warning(f"Skipping non-dict event: {type(event)}")
                return

            event_type = event.get("type")

            # Handle Claude Code's nested message format
            if event_type == "assistant":
                self._handle_assistant_message(event)
            elif event_type == "user":
                self._handle_user_message(event)
            elif event_type == "system":
                self._handle_system_message(event)
            # Also handle direct event types for backward compatibility
            elif event_type == "thinking_block":
                self._run_async(self.ws_manager.broadcast_thinking_block(
                    adw_id=self.adw_id,
                    content=event.get("content", ""),
                    reasoning_type=event.get("reasoning_type"),
                    duration_ms=event.get("duration_ms"),
                    sequence=event.get("sequence")
                ))
            elif event_type == "tool_use_pre":
                self._run_async(self.ws_manager.broadcast_tool_use_pre(
                    adw_id=self.adw_id,
                    tool_name=event.get("tool_name", ""),
                    tool_input=event.get("tool_input"),
                    tool_use_id=event.get("tool_use_id")
                ))
            elif event_type == "tool_use_post":
                self._run_async(self.ws_manager.broadcast_tool_use_post(
                    adw_id=self.adw_id,
                    tool_name=event.get("tool_name", ""),
                    tool_output=event.get("tool_output"),
                    status=event.get("status", "success"),
                    error=event.get("error"),
                    tool_use_id=event.get("tool_use_id"),
                    duration_ms=event.get("duration_ms")
                ))
            elif event_type == "file_changed":
                self._run_async(self.ws_manager.broadcast_file_changed(
                    adw_id=self.adw_id,
                    file_path=event.get("file_path", ""),
                    operation=event.get("operation", "modify"),
                    diff=event.get("diff"),
                    summary=event.get("summary"),
                    lines_added=event.get("lines_added", 0),
                    lines_removed=event.get("lines_removed", 0)
                ))
            elif event_type == "text_block":
                self._run_async(self.ws_manager.broadcast_text_block(
                    adw_id=self.adw_id,
                    content=event.get("content", ""),
                    sequence=event.get("sequence")
                ))
            else:
                self.logger.debug(f"Unknown JSONL event type: {event_type}")

        except Exception as e:
            self.logger.error(f"Error broadcasting JSONL event: {e}")

    def _handle_assistant_message(self, event: dict):
        """
        Handle assistant message events from Claude Code.

        Format:
        {
            "type": "assistant",
            "message": {
                "content": [
                    {"type": "text", "text": "..."},
                    {"type": "tool_use", "id": "...", "name": "...", "input": {...}},
                    {"type": "thinking", "thinking": "..."}
                ],
                "model": "...",
                "usage": {...}
            },
            "session_id": "...",
            "uuid": "..."
        }
        """
        message = event.get("message", {})
        content_blocks = message.get("content", [])
        session_id = event.get("session_id")
        model = message.get("model")

        for block in content_blocks:
            if not isinstance(block, dict):
                continue

            block_type = block.get("type")

            if block_type == "text":
                # Text response from the agent
                text_content = block.get("text", "")
                if text_content:
                    self._run_async(self.ws_manager.broadcast_text_block(
                        adw_id=self.adw_id,
                        content=text_content,
                        sequence=None
                    ))

            elif block_type == "tool_use":
                # Agent is calling a tool
                tool_name = block.get("name", "")
                tool_input = block.get("input", {})
                tool_use_id = block.get("id", "")

                self._run_async(self.ws_manager.broadcast_tool_use_pre(
                    adw_id=self.adw_id,
                    tool_name=tool_name,
                    tool_input=tool_input,
                    tool_use_id=tool_use_id
                ))

            elif block_type == "thinking":
                # Agent's thinking/reasoning block
                thinking_content = block.get("thinking", "")
                if thinking_content:
                    self._run_async(self.ws_manager.broadcast_thinking_block(
                        adw_id=self.adw_id,
                        content=thinking_content,
                        reasoning_type="thinking",
                        duration_ms=None,
                        sequence=None
                    ))

    def _handle_user_message(self, event: dict):
        """
        Handle user message events from Claude Code (typically tool results).

        Format:
        {
            "type": "user",
            "message": {
                "content": [
                    {"type": "tool_result", "tool_use_id": "...", "content": "..."}
                ]
            },
            "session_id": "...",
            "uuid": "...",
            "tool_use_result": {...}
        }
        """
        message = event.get("message", {})
        content_blocks = message.get("content", [])
        tool_use_result = event.get("tool_use_result", {})

        for block in content_blocks:
            if not isinstance(block, dict):
                continue

            block_type = block.get("type")

            if block_type == "tool_result":
                # Tool has completed execution
                tool_use_id = block.get("tool_use_id", "")
                result_content = block.get("content", "")

                # Try to get tool name from tool_use_result if available
                tool_name = ""
                if tool_use_result and isinstance(tool_use_result, dict):
                    tool_name = tool_use_result.get("type", "")

                # Truncate result content if very long (for UI display)
                # Handle case where content is a list (convert to string)
                if isinstance(result_content, list):
                    result_content = json.dumps(result_content)
                elif not isinstance(result_content, str):
                    result_content = str(result_content)

                output_preview = result_content
                if len(result_content) > 2000:
                    output_preview = result_content[:2000] + "... [truncated]"

                self._run_async(self.ws_manager.broadcast_tool_use_post(
                    adw_id=self.adw_id,
                    tool_name=tool_name,
                    tool_output=output_preview,
                    status="success",
                    error=None,
                    tool_use_id=tool_use_id,
                    duration_ms=None
                ))

    def _handle_system_message(self, event: dict):
        """
        Handle system message events from Claude Code.

        Format:
        {
            "type": "system",
            "subtype": "init" | "hook_response" | "error",
            "session_id": "...",
            ...
        }
        """
        subtype = event.get("subtype", "")
        session_id = event.get("session_id", "")

        if subtype == "init":
            # Session initialization - broadcast as agent log
            model = event.get("model", "unknown")
            tools = event.get("tools", [])
            tool_count = len(tools) if isinstance(tools, list) else 0

            self._run_async(self.ws_manager.broadcast_agent_log({
                "adw_id": self.adw_id,
                "message": f"Agent session initialized (model: {model}, tools: {tool_count})",
                "level": "INFO",
                "source": "raw_output.jsonl",
                "session_id": session_id
            }))

        elif subtype == "hook_response":
            # Hook response - usually startup hooks
            hook_name = event.get("hook_name", "")
            exit_code = event.get("exit_code", 0)
            stderr = event.get("stderr", "")

            level = "ERROR" if exit_code != 0 or stderr else "INFO"
            message = f"Hook '{hook_name}' executed"
            if stderr:
                message += f": {stderr[:200]}"

            self._run_async(self.ws_manager.broadcast_agent_log({
                "adw_id": self.adw_id,
                "message": message,
                "level": level,
                "source": "raw_output.jsonl",
                "session_id": session_id
            }))

        elif subtype == "error":
            # Error event
            error_msg = event.get("message", event.get("error", "Unknown error"))

            self._run_async(self.ws_manager.broadcast_agent_log({
                "adw_id": self.adw_id,
                "message": f"Agent error: {error_msg}",
                "level": "ERROR",
                "source": "raw_output.jsonl",
                "session_id": session_id
            }))

    def _discover_and_tail_execution_logs(self):
        """Discover and tail all execution.log files in agent subdirectories."""
        if not os.path.exists(self.agent_dir):
            return

        try:
            # Scan for execution.log files in all subdirectories
            for subdir in os.listdir(self.agent_dir):
                subdir_path = os.path.join(self.agent_dir, subdir)
                if not os.path.isdir(subdir_path):
                    continue

                log_path = os.path.join(subdir_path, "execution.log")
                if os.path.exists(log_path):
                    self._tail_execution_log_file(log_path, subdir)

        except Exception as e:
            self.logger.error(f"Error discovering execution logs: {e}")

    def _tail_execution_log_file(self, log_path: str, agent_role: str):
        """Tail a specific execution.log file."""
        if not os.path.exists(log_path):
            return

        try:
            # Get current file position
            current_pos = self.file_positions.get(log_path, 0)

            with open(log_path, 'r') as f:
                # Seek to last known position
                f.seek(current_pos)

                # Read new lines
                for line in f:
                    line = line.strip()
                    if not line:
                        continue

                    # Parse log line and broadcast
                    self._broadcast_log_line(line, agent_role)

                # Update file position
                self.file_positions[log_path] = f.tell()

        except Exception as e:
            self.logger.error(f"Error tailing {log_path}: {e}")

    def _broadcast_log_line(self, line: str, agent_role: str):
        """Broadcast a log line via WebSocket."""
        try:
            # Try to parse log level from line
            level = "INFO"
            if "ERROR" in line or "FAILED" in line:
                level = "ERROR"
            elif "WARNING" in line or "WARN" in line:
                level = "WARNING"
            elif "SUCCESS" in line:
                level = "SUCCESS"

            self._run_async(self.ws_manager.broadcast_agent_log({
                "adw_id": self.adw_id,
                "agent_role": agent_role,
                "message": line,
                "level": level,
                "source": "execution.log"
            }))

        except Exception as e:
            self.logger.error(f"Error broadcasting log line: {e}")

    def _check_screenshots(self):
        """Check for new screenshots in any review_img directories."""
        if not os.path.exists(self.agent_dir):
            return

        try:
            # Search for review_img directories in all agent subdirectories
            for subdir in os.listdir(self.agent_dir):
                subdir_path = os.path.join(self.agent_dir, subdir)
                if not os.path.isdir(subdir_path):
                    continue

                screenshots_dir = os.path.join(subdir_path, "review_img")
                if not os.path.exists(screenshots_dir):
                    continue

                # Find all image files
                for ext in [".png", ".jpg", ".jpeg", ".gif"]:
                    for screenshot_path in Path(screenshots_dir).glob(f"*{ext}"):
                        screenshot_str = str(screenshot_path)

                        # Check if we've already seen this screenshot
                        if screenshot_str in self.seen_screenshots:
                            continue

                        # New screenshot found
                        self.seen_screenshots.add(screenshot_str)
                        self.logger.info(f"New screenshot detected: {screenshot_path.name}")

                        # Broadcast screenshot available event
                        self._broadcast_screenshot(screenshot_str)

        except Exception as e:
            self.logger.error(f"Error checking screenshots: {e}")

    def _broadcast_screenshot(self, screenshot_path: str):
        """Broadcast screenshot available event."""
        try:
            # Get relative path from agent directory
            rel_path = os.path.relpath(screenshot_path, self.agent_dir)

            # Get file metadata
            stat = os.stat(screenshot_path)
            metadata = {
                "file_size": stat.st_size,
                "created_at": stat.st_ctime,
                "file_name": os.path.basename(screenshot_path)
            }

            self._run_async(self.ws_manager.broadcast_screenshot_available(
                adw_id=self.adw_id,
                screenshot_path=rel_path,
                screenshot_type="review",
                metadata=metadata
            ))

        except Exception as e:
            self.logger.error(f"Error broadcasting screenshot: {e}")

    def _check_specs(self):
        """Check for new spec files in specs directory."""
        if not os.path.exists(self.specs_dir):
            return

        try:
            # Look for spec files matching this ADW ID
            for spec_path in Path(self.specs_dir).glob(f"*{self.adw_id}*.md"):
                spec_str = str(spec_path)

                # Check if we've already seen this spec
                if spec_str in self.seen_specs:
                    continue

                # New spec found
                self.seen_specs.add(spec_str)
                self.logger.info(f"New spec detected: {spec_path.name}")

                # Broadcast spec created event
                self._broadcast_spec(spec_str)

        except Exception as e:
            self.logger.error(f"Error checking specs: {e}")

    def _broadcast_spec(self, spec_path: str):
        """Broadcast spec created event."""
        try:
            # Get relative path from repository root
            rel_path = os.path.relpath(spec_path)

            # Determine spec type from filename or content
            spec_type = "plan"
            if "patch" in spec_path.lower():
                spec_type = "patch"
            elif "review" in spec_path.lower():
                spec_type = "review"

            # Get file metadata
            stat = os.stat(spec_path)
            metadata = {
                "file_size": stat.st_size,
                "created_at": stat.st_ctime,
                "file_name": os.path.basename(spec_path)
            }

            self._run_async(self.ws_manager.broadcast_spec_created(
                adw_id=self.adw_id,
                spec_path=rel_path,
                spec_type=spec_type,
                metadata=metadata
            ))

        except Exception as e:
            self.logger.error(f"Error broadcasting spec: {e}")


class AgentDirectoryEventHandler(FileSystemEventHandler):
    """
    Watchdog event handler for agent directory changes.

    Handles file system events (creation, modification) and triggers
    appropriate monitoring actions.
    """

    def __init__(self, monitor: AgentDirectoryMonitor):
        """
        Initialize the event handler.

        Args:
            monitor: AgentDirectoryMonitor instance
        """
        super().__init__()
        self.monitor = monitor
        self.logger = monitor.logger

    def on_modified(self, event):
        """Handle file modification events."""
        if event.is_directory:
            return

        # Log file modification
        self.logger.debug(f"File modified: {event.src_path}")

        # Note: The polling loop handles most file tailing
        # This event handler is mainly for detecting new files quickly

    def on_created(self, event):
        """Handle file creation events."""
        if event.is_directory:
            return

        self.logger.info(f"File created: {event.src_path}")

        # If it's a new raw_output.jsonl or execution.log, we'll pick it up in polling loop
        # If it's a screenshot or spec, we'll detect it in the polling checks
