#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///

"""
Agent Log Streamer - Lifecycle management for AgentDirectoryMonitor instances.

This module provides a high-level API for starting and stopping agent directory
monitoring for active workflows. It manages a registry of active monitors and
ensures proper cleanup when workflows complete.

Usage:
    from adw_modules.agent_log_streamer import AgentLogStreamer
    from server.core.websocket_manager import WebSocketManager

    # Initialize streamer
    streamer = AgentLogStreamer()

    # Start monitoring for a workflow
    ws_manager = WebSocketManager()
    streamer.start_monitoring(adw_id="adw-abc123", websocket_manager=ws_manager)

    # Stop monitoring when workflow completes
    streamer.stop_monitoring(adw_id="adw-abc123")
"""

import logging
import threading
from typing import Dict, Optional

from .agent_directory_monitor import AgentDirectoryMonitor


logger = logging.getLogger(__name__)


class AgentLogStreamer:
    """
    Manages lifecycle of AgentDirectoryMonitor instances for active workflows.

    This class provides a centralized registry for tracking active monitors
    and ensures thread-safe access for concurrent workflow monitoring.
    """

    def __init__(self):
        """Initialize the agent log streamer with empty registry."""
        self._monitors: Dict[str, AgentDirectoryMonitor] = {}
        self._lock = threading.Lock()
        logger.info("AgentLogStreamer initialized")

    def start_monitoring(
        self,
        adw_id: str,
        websocket_manager,
        agents_base_dir: str = "agents",
        specs_dir: str = "specs"
    ) -> bool:
        """
        Start monitoring agent directory for a specific workflow.

        Args:
            adw_id: ADW ID to monitor
            websocket_manager: WebSocketManager instance for broadcasting events
            agents_base_dir: Base directory for agents (default: "agents")
            specs_dir: Directory containing spec files (default: "specs")

        Returns:
            True if monitoring started successfully, False if already monitoring
        """
        with self._lock:
            # Check if already monitoring
            if adw_id in self._monitors:
                logger.warning(f"Already monitoring {adw_id}")
                return False

            try:
                # Create and start monitor
                monitor = AgentDirectoryMonitor(
                    adw_id=adw_id,
                    websocket_manager=websocket_manager,
                    agents_base_dir=agents_base_dir,
                    specs_dir=specs_dir
                )

                monitor.start_monitoring()

                # Register monitor
                self._monitors[adw_id] = monitor

                logger.info(f"Started monitoring for {adw_id}")
                return True

            except Exception as e:
                logger.error(f"Failed to start monitoring for {adw_id}: {e}")
                return False

    def stop_monitoring(self, adw_id: str) -> bool:
        """
        Stop monitoring agent directory for a specific workflow.

        Args:
            adw_id: ADW ID to stop monitoring

        Returns:
            True if monitoring stopped successfully, False if not monitoring
        """
        with self._lock:
            monitor = self._monitors.get(adw_id)

            if not monitor:
                logger.warning(f"Not monitoring {adw_id}")
                return False

            try:
                # Stop monitor
                monitor.stop_monitoring()

                # Unregister monitor
                del self._monitors[adw_id]

                logger.info(f"Stopped monitoring for {adw_id}")
                return True

            except Exception as e:
                logger.error(f"Failed to stop monitoring for {adw_id}: {e}")
                return False

    def is_monitoring(self, adw_id: str) -> bool:
        """
        Check if currently monitoring a specific workflow.

        Args:
            adw_id: ADW ID to check

        Returns:
            True if currently monitoring, False otherwise
        """
        with self._lock:
            return adw_id in self._monitors

    def get_active_monitors(self) -> list:
        """
        Get list of ADW IDs currently being monitored.

        Returns:
            List of active ADW IDs
        """
        with self._lock:
            return list(self._monitors.keys())

    def stop_all(self) -> None:
        """
        Stop all active monitors (cleanup on shutdown).
        """
        with self._lock:
            adw_ids = list(self._monitors.keys())

        for adw_id in adw_ids:
            self.stop_monitoring(adw_id)

        logger.info("Stopped all agent monitors")


# Global singleton instance
_agent_log_streamer: Optional[AgentLogStreamer] = None
_streamer_lock = threading.Lock()


def get_agent_log_streamer() -> AgentLogStreamer:
    """
    Get the global AgentLogStreamer singleton instance.

    Returns:
        AgentLogStreamer instance
    """
    global _agent_log_streamer

    with _streamer_lock:
        if _agent_log_streamer is None:
            _agent_log_streamer = AgentLogStreamer()

        return _agent_log_streamer
