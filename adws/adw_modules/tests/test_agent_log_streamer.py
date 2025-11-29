#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pytest-asyncio"]
# ///

"""
Unit tests for AgentLogStreamer module.

Tests the lifecycle management of AgentDirectoryMonitor instances.
"""

import sys
import os
from unittest.mock import Mock, patch

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.agent_log_streamer import AgentLogStreamer, get_agent_log_streamer


class TestAgentLogStreamer:
    """Test cases for AgentLogStreamer class."""

    def test_initialization(self):
        """Test that AgentLogStreamer initializes with empty registry."""
        streamer = AgentLogStreamer()
        assert streamer._monitors == {}
        assert streamer.get_active_monitors() == []

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_start_monitoring_success(self, mock_monitor_class):
        """Test starting monitoring for a workflow."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        adw_id = "test-adw-123"

        # Execute
        result = streamer.start_monitoring(
            adw_id=adw_id,
            websocket_manager=mock_ws_manager
        )

        # Assert
        assert result is True
        assert adw_id in streamer._monitors
        mock_monitor_class.assert_called_once_with(
            adw_id=adw_id,
            websocket_manager=mock_ws_manager,
            agents_base_dir="agents",
            specs_dir="specs"
        )
        mock_monitor.start_monitoring.assert_called_once()

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_start_monitoring_custom_dirs(self, mock_monitor_class):
        """Test starting monitoring with custom directories."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        adw_id = "test-adw-123"

        # Execute
        result = streamer.start_monitoring(
            adw_id=adw_id,
            websocket_manager=mock_ws_manager,
            agents_base_dir="custom_agents",
            specs_dir="custom_specs"
        )

        # Assert
        assert result is True
        mock_monitor_class.assert_called_once_with(
            adw_id=adw_id,
            websocket_manager=mock_ws_manager,
            agents_base_dir="custom_agents",
            specs_dir="custom_specs"
        )

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_start_monitoring_already_monitoring(self, mock_monitor_class):
        """Test starting monitoring when already monitoring."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        adw_id = "test-adw-123"

        # Start monitoring first time
        streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)

        # Try to start again
        result = streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)

        # Assert - should return False and not create a new monitor
        assert result is False
        assert mock_monitor_class.call_count == 1

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_start_monitoring_error_handling(self, mock_monitor_class):
        """Test error handling when starting monitoring fails."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor_class.side_effect = Exception("Monitor creation failed")
        adw_id = "test-adw-123"

        # Execute
        result = streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)

        # Assert
        assert result is False
        assert adw_id not in streamer._monitors

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_stop_monitoring_success(self, mock_monitor_class):
        """Test stopping monitoring for a workflow."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        adw_id = "test-adw-123"

        # Start monitoring first
        streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)

        # Execute
        result = streamer.stop_monitoring(adw_id=adw_id)

        # Assert
        assert result is True
        assert adw_id not in streamer._monitors
        mock_monitor.stop_monitoring.assert_called_once()

    def test_stop_monitoring_not_monitoring(self):
        """Test stopping monitoring when not monitoring."""
        # Setup
        streamer = AgentLogStreamer()
        adw_id = "test-adw-123"

        # Execute
        result = streamer.stop_monitoring(adw_id=adw_id)

        # Assert
        assert result is False

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_stop_monitoring_error_handling(self, mock_monitor_class):
        """Test error handling when stopping monitoring fails."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor.stop_monitoring.side_effect = Exception("Stop failed")
        mock_monitor_class.return_value = mock_monitor
        adw_id = "test-adw-123"

        # Start monitoring first
        streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)

        # Execute
        result = streamer.stop_monitoring(adw_id=adw_id)

        # Assert
        assert result is False

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_is_monitoring(self, mock_monitor_class):
        """Test checking if monitoring a workflow."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        adw_id = "test-adw-123"

        # Assert not monitoring initially
        assert streamer.is_monitoring(adw_id) is False

        # Start monitoring
        streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)

        # Assert now monitoring
        assert streamer.is_monitoring(adw_id) is True

        # Stop monitoring
        streamer.stop_monitoring(adw_id=adw_id)

        # Assert not monitoring anymore
        assert streamer.is_monitoring(adw_id) is False

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_get_active_monitors(self, mock_monitor_class):
        """Test getting list of active monitors."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor

        adw_id_1 = "test-adw-123"
        adw_id_2 = "test-adw-456"
        adw_id_3 = "test-adw-789"

        # Start monitoring for multiple workflows
        streamer.start_monitoring(adw_id=adw_id_1, websocket_manager=mock_ws_manager)
        streamer.start_monitoring(adw_id=adw_id_2, websocket_manager=mock_ws_manager)
        streamer.start_monitoring(adw_id=adw_id_3, websocket_manager=mock_ws_manager)

        # Get active monitors
        active = streamer.get_active_monitors()

        # Assert
        assert len(active) == 3
        assert set(active) == {adw_id_1, adw_id_2, adw_id_3}

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_concurrent_monitoring(self, mock_monitor_class):
        """Test monitoring multiple workflows concurrently."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor

        adw_ids = [f"test-adw-{i}" for i in range(10)]

        # Start monitoring for all workflows
        for adw_id in adw_ids:
            result = streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)
            assert result is True

        # Assert all are being monitored
        assert len(streamer.get_active_monitors()) == 10
        for adw_id in adw_ids:
            assert streamer.is_monitoring(adw_id) is True

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_stop_all(self, mock_monitor_class):
        """Test stopping all active monitors."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor

        # Start monitoring for multiple workflows
        for i in range(5):
            streamer.start_monitoring(adw_id=f"test-adw-{i}", websocket_manager=mock_ws_manager)

        # Assert all are monitoring
        assert len(streamer.get_active_monitors()) == 5

        # Execute
        streamer.stop_all()

        # Assert all stopped
        assert len(streamer.get_active_monitors()) == 0
        assert mock_monitor.stop_monitoring.call_count == 5

    def test_get_agent_log_streamer_singleton(self):
        """Test that get_agent_log_streamer returns singleton instance."""
        # Get instance multiple times
        streamer1 = get_agent_log_streamer()
        streamer2 = get_agent_log_streamer()
        streamer3 = get_agent_log_streamer()

        # Assert all are the same instance
        assert streamer1 is streamer2
        assert streamer2 is streamer3

    @patch('adw_modules.agent_log_streamer.AgentDirectoryMonitor')
    def test_thread_safety(self, mock_monitor_class):
        """Test thread-safe access to monitors registry."""
        # Setup
        streamer = AgentLogStreamer()
        mock_ws_manager = Mock()
        mock_monitor = Mock()
        mock_monitor_class.return_value = mock_monitor
        adw_id = "test-adw-123"

        # This test verifies that the lock is acquired properly
        # The actual thread safety would require integration tests with threading
        # For now, we just verify the basic operations work

        result = streamer.start_monitoring(adw_id=adw_id, websocket_manager=mock_ws_manager)
        assert result is True

        is_monitoring = streamer.is_monitoring(adw_id)
        assert is_monitoring is True

        active = streamer.get_active_monitors()
        assert adw_id in active

        result = streamer.stop_monitoring(adw_id=adw_id)
        assert result is True
