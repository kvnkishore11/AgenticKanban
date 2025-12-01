"""Tests for worktree_ops module."""

import os
import tempfile
import pytest
from unittest.mock import Mock

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.worktree_ops import setup_worktree_environment


class TestSetupWorktreeEnvironment:
    """Tests for setup_worktree_environment function."""

    def test_creates_ports_env_with_all_required_vars(self):
        """Should create .ports.env with all required port variables."""
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_logger = Mock()
            websocket_port = 8501
            frontend_port = 9201

            # Execute
            setup_worktree_environment(tmpdir, websocket_port, frontend_port, mock_logger)

            # Read the created file
            ports_env_path = os.path.join(tmpdir, ".ports.env")
            assert os.path.exists(ports_env_path)

            with open(ports_env_path, "r") as f:
                content = f.read()

            # Assert all required variables are present
            assert f"WEBSOCKET_PORT={websocket_port}" in content
            assert f"FRONTEND_PORT={frontend_port}" in content
            assert f"ADW_PORT={websocket_port}" in content
            assert f"VITE_ADW_PORT={websocket_port}" in content
            assert f"VITE_BACKEND_URL=http://localhost:{websocket_port}" in content

    def test_logs_port_configuration(self):
        """Should log the port configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_logger = Mock()
            websocket_port = 8502
            frontend_port = 9202

            # Execute
            setup_worktree_environment(tmpdir, websocket_port, frontend_port, mock_logger)

            # Assert logging occurred
            mock_logger.info.assert_called_once()
            log_message = mock_logger.info.call_args[0][0]
            assert "8502" in log_message
            assert "9202" in log_message

    def test_no_duplicate_vite_backend_url(self):
        """Should not have duplicate VITE_BACKEND_URL entries."""
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_logger = Mock()

            # Execute
            setup_worktree_environment(tmpdir, 8501, 9201, mock_logger)

            # Read and check for duplicates
            ports_env_path = os.path.join(tmpdir, ".ports.env")
            with open(ports_env_path, "r") as f:
                lines = f.readlines()

            vite_backend_url_count = sum(1 for line in lines if line.startswith("VITE_BACKEND_URL="))
            assert vite_backend_url_count == 1, "Should have exactly one VITE_BACKEND_URL entry"

            vite_adw_port_count = sum(1 for line in lines if line.startswith("VITE_ADW_PORT="))
            assert vite_adw_port_count == 1, "Should have exactly one VITE_ADW_PORT entry"
