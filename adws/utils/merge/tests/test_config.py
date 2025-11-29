"""Tests for merge workflow config restoration module."""

import json
from unittest.mock import patch, mock_open, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.config import restore_config_files


class TestRestoreConfigFiles:
    """Tests for restore_config_files function."""

    @patch('os.path.exists')
    def test_no_config_files_exist(self, mock_exists, mock_logger):
        """Test when no config files exist."""
        mock_exists.return_value = False

        result = restore_config_files("/repo", mock_logger)

        assert result.success is True
        assert result.files_fixed == []
        assert result.error is None

    @patch('subprocess.run')
    @patch('builtins.open', new_callable=mock_open)
    @patch('os.path.exists')
    def test_mcp_config_fixed(self, mock_exists, mock_file, mock_run, mock_logger):
        """Test fixing .mcp.json with worktree paths."""
        mock_exists.return_value = True
        mock_run.return_value = MagicMock(returncode=0, stdout="")

        config_data = {
            "mcpServers": {
                "playwright": {
                    "args": ["--config", "/trees/test1234/playwright-mcp-config.json"]
                }
            }
        }
        mock_file.return_value.read.return_value = json.dumps(config_data)

        with patch('json.load', return_value=config_data):
            with patch('json.dump'):
                result = restore_config_files("/repo", mock_logger)

        assert result.success is True
        mock_logger.info.assert_called()

    @patch('subprocess.run')
    @patch('builtins.open', new_callable=mock_open)
    @patch('os.path.exists')
    def test_playwright_config_fixed(self, mock_exists, mock_file, mock_run, mock_logger):
        """Test fixing playwright-mcp-config.json with worktree paths."""
        mock_exists.return_value = True
        mock_run.return_value = MagicMock(returncode=0, stdout="")

        playwright_config = {
            "browser": {
                "contextOptions": {
                    "recordVideo": {
                        "dir": "/trees/test1234/videos"
                    }
                }
            }
        }
        mock_file.return_value.read.return_value = json.dumps(playwright_config)

        with patch('json.load', return_value=playwright_config):
            with patch('json.dump'):
                result = restore_config_files("/repo", mock_logger)

        assert result.success is True

    @patch('os.path.exists')
    def test_config_without_worktree_paths(self, mock_exists, mock_logger):
        """Test config files that don't have worktree paths."""
        mock_exists.return_value = True

        config_data = {
            "mcpServers": {
                "playwright": {
                    "args": ["--config", "/repo/playwright-mcp-config.json"]
                }
            }
        }

        with patch('builtins.open', mock_open()):
            with patch('json.load', return_value=config_data):
                result = restore_config_files("/repo", mock_logger)

        assert result.success is True
        # No files should be fixed since there are no worktree paths
        assert '.mcp.json' not in result.files_fixed

    @patch('builtins.open')
    @patch('os.path.exists')
    def test_config_read_error_handled(self, mock_exists, mock_file, mock_logger):
        """Test that config read errors are handled gracefully."""
        mock_exists.return_value = True
        mock_file.side_effect = Exception("Read error")

        result = restore_config_files("/repo", mock_logger)

        assert result.success is True  # Should not fail overall
        mock_logger.warning.assert_called()
