#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pytest-asyncio"]
# ///

"""
Unit tests for AgentDirectoryMonitor module.

Tests Claude Code JSONL format parsing and WebSocket broadcasting.
"""

import sys
import os
from unittest.mock import Mock, patch, AsyncMock
import pytest

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.agent_directory_monitor import AgentDirectoryMonitor


class TestAgentDirectoryMonitorJSONLParsing:
    """Test cases for Claude Code JSONL format parsing."""

    @pytest.fixture
    def mock_ws_manager(self):
        """Create a mock WebSocket manager with async broadcast methods."""
        manager = Mock()
        manager.broadcast_text_block = AsyncMock()
        manager.broadcast_tool_use_pre = AsyncMock()
        manager.broadcast_tool_use_post = AsyncMock()
        manager.broadcast_thinking_block = AsyncMock()
        manager.broadcast_agent_log = AsyncMock()
        manager.broadcast_file_changed = AsyncMock()
        return manager

    @pytest.fixture
    def monitor(self, mock_ws_manager, tmp_path):
        """Create an AgentDirectoryMonitor instance for testing."""
        monitor = AgentDirectoryMonitor(
            adw_id="test-adw-123",
            websocket_manager=mock_ws_manager,
            agents_base_dir=str(tmp_path / "agents"),
            specs_dir=str(tmp_path / "specs")
        )
        return monitor

    def test_parse_jsonl_line_valid(self, monitor):
        """Test parsing valid JSONL line."""
        line = '{"type": "assistant", "message": {"content": []}}'
        result = monitor._parse_jsonl_line(line)
        assert result == {"type": "assistant", "message": {"content": []}}

    def test_parse_jsonl_line_invalid(self, monitor):
        """Test parsing invalid JSONL line returns None."""
        line = 'not valid json'
        result = monitor._parse_jsonl_line(line)
        assert result is None

    def test_handle_assistant_message_text_block(self, monitor, mock_ws_manager):
        """Test handling assistant message with text content."""
        event = {
            "type": "assistant",
            "message": {
                "content": [
                    {"type": "text", "text": "I'll create a plan to resolve this."}
                ],
                "model": "claude-sonnet-4-5-20250929"
            },
            "session_id": "test-session-123"
        }

        monitor._handle_assistant_message(event)

        # Wait for async broadcast to be called
        mock_ws_manager.broadcast_text_block.assert_called_once_with(
            adw_id="test-adw-123",
            content="I'll create a plan to resolve this.",
            sequence=None
        )

    def test_handle_assistant_message_tool_use(self, monitor, mock_ws_manager):
        """Test handling assistant message with tool_use content."""
        event = {
            "type": "assistant",
            "message": {
                "content": [
                    {
                        "type": "tool_use",
                        "id": "toolu_01Qub48FWpXJu2uw1C6HacBM",
                        "name": "Read",
                        "input": {"file_path": "/path/to/file.js"}
                    }
                ],
                "model": "claude-sonnet-4-5-20250929"
            },
            "session_id": "test-session-123"
        }

        monitor._handle_assistant_message(event)

        mock_ws_manager.broadcast_tool_use_pre.assert_called_once_with(
            adw_id="test-adw-123",
            tool_name="Read",
            tool_input={"file_path": "/path/to/file.js"},
            tool_use_id="toolu_01Qub48FWpXJu2uw1C6HacBM"
        )

    def test_handle_assistant_message_thinking_block(self, monitor, mock_ws_manager):
        """Test handling assistant message with thinking content."""
        event = {
            "type": "assistant",
            "message": {
                "content": [
                    {
                        "type": "thinking",
                        "thinking": "Let me analyze the code structure first."
                    }
                ]
            },
            "session_id": "test-session-123"
        }

        monitor._handle_assistant_message(event)

        mock_ws_manager.broadcast_thinking_block.assert_called_once_with(
            adw_id="test-adw-123",
            content="Let me analyze the code structure first.",
            reasoning_type="thinking",
            duration_ms=None,
            sequence=None
        )

    def test_handle_assistant_message_mixed_content(self, monitor, mock_ws_manager):
        """Test handling assistant message with multiple content blocks."""
        event = {
            "type": "assistant",
            "message": {
                "content": [
                    {"type": "text", "text": "Let me read the file."},
                    {
                        "type": "tool_use",
                        "id": "toolu_123",
                        "name": "Read",
                        "input": {"file_path": "/test.js"}
                    }
                ]
            },
            "session_id": "test-session-123"
        }

        monitor._handle_assistant_message(event)

        # Both should be called
        mock_ws_manager.broadcast_text_block.assert_called_once()
        mock_ws_manager.broadcast_tool_use_pre.assert_called_once()

    def test_handle_user_message_tool_result(self, monitor, mock_ws_manager):
        """Test handling user message with tool_result content."""
        event = {
            "type": "user",
            "message": {
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": "toolu_01Qub48FWpXJu2uw1C6HacBM",
                        "content": "File contents here..."
                    }
                ]
            },
            "session_id": "test-session-123",
            "tool_use_result": {"type": "text"}
        }

        monitor._handle_user_message(event)

        mock_ws_manager.broadcast_tool_use_post.assert_called_once()
        call_args = mock_ws_manager.broadcast_tool_use_post.call_args
        assert call_args.kwargs["adw_id"] == "test-adw-123"
        assert call_args.kwargs["tool_use_id"] == "toolu_01Qub48FWpXJu2uw1C6HacBM"
        assert call_args.kwargs["status"] == "success"

    def test_handle_user_message_tool_result_truncation(self, monitor, mock_ws_manager):
        """Test that long tool results are truncated."""
        long_content = "x" * 3000  # Longer than 2000 char limit
        event = {
            "type": "user",
            "message": {
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": "toolu_123",
                        "content": long_content
                    }
                ]
            }
        }

        monitor._handle_user_message(event)

        call_args = mock_ws_manager.broadcast_tool_use_post.call_args
        output = call_args.kwargs["tool_output"]
        assert len(output) < len(long_content)
        assert "... [truncated]" in output

    def test_handle_user_message_string_tool_use_result(self, monitor, mock_ws_manager):
        """Test handling user message with string tool_use_result (error case)."""
        # This simulates the real-world case where tool_use_result is a string error message
        event = {
            "type": "user",
            "message": {
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": "toolu_01Jq3u76bWJoK9yBM9tQK5Zn",
                        "content": "<tool_use_error>File does not exist.</tool_use_error>",
                        "is_error": True
                    }
                ]
            },
            "session_id": "test-session-123",
            "tool_use_result": "Error: File does not exist. Did you mean .env?"  # String, not dict
        }

        # Should not raise an error
        monitor._handle_user_message(event)

        mock_ws_manager.broadcast_tool_use_post.assert_called_once()
        call_args = mock_ws_manager.broadcast_tool_use_post.call_args
        # tool_name should be empty since tool_use_result is a string
        assert call_args.kwargs["tool_name"] == ""
        assert call_args.kwargs["tool_use_id"] == "toolu_01Jq3u76bWJoK9yBM9tQK5Zn"

    def test_handle_user_message_list_content(self, monitor, mock_ws_manager):
        """Test handling tool_result with list content (convert to JSON string)."""
        event = {
            "type": "user",
            "message": {
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": "toolu_123",
                        "content": [{"type": "text", "text": "result1"}, {"type": "text", "text": "result2"}]
                    }
                ]
            }
        }

        # Should not raise an error
        monitor._handle_user_message(event)

        call_args = mock_ws_manager.broadcast_tool_use_post.call_args
        output = call_args.kwargs["tool_output"]
        assert isinstance(output, str)
        assert "result1" in output  # JSON string should contain the content

    def test_handle_system_message_init(self, monitor, mock_ws_manager):
        """Test handling system init message."""
        event = {
            "type": "system",
            "subtype": "init",
            "model": "claude-sonnet-4-5-20250929",
            "tools": ["Read", "Write", "Edit", "Bash"],
            "session_id": "test-session-123"
        }

        monitor._handle_system_message(event)

        mock_ws_manager.broadcast_agent_log.assert_called_once()
        call_args = mock_ws_manager.broadcast_agent_log.call_args
        log_data = call_args.args[0] if call_args.args else call_args.kwargs
        assert log_data["adw_id"] == "test-adw-123"
        assert "initialized" in log_data["message"]
        assert "model: claude-sonnet-4-5-20250929" in log_data["message"]
        assert "tools: 4" in log_data["message"]
        assert log_data["level"] == "INFO"

    def test_handle_system_message_hook_response(self, monitor, mock_ws_manager):
        """Test handling system hook_response message."""
        event = {
            "type": "system",
            "subtype": "hook_response",
            "hook_name": "SessionStart:startup",
            "exit_code": 0,
            "stderr": "",
            "session_id": "test-session-123"
        }

        monitor._handle_system_message(event)

        mock_ws_manager.broadcast_agent_log.assert_called_once()
        call_args = mock_ws_manager.broadcast_agent_log.call_args
        log_data = call_args.args[0] if call_args.args else call_args.kwargs
        assert "Hook 'SessionStart:startup' executed" in log_data["message"]
        assert log_data["level"] == "INFO"

    def test_handle_system_message_hook_response_with_error(self, monitor, mock_ws_manager):
        """Test handling system hook_response message with error."""
        event = {
            "type": "system",
            "subtype": "hook_response",
            "hook_name": "SessionStart:startup",
            "exit_code": 1,
            "stderr": "Connection refused",
            "session_id": "test-session-123"
        }

        monitor._handle_system_message(event)

        mock_ws_manager.broadcast_agent_log.assert_called_once()
        call_args = mock_ws_manager.broadcast_agent_log.call_args
        log_data = call_args.args[0] if call_args.args else call_args.kwargs
        assert log_data["level"] == "ERROR"
        assert "Connection refused" in log_data["message"]

    def test_handle_system_message_error(self, monitor, mock_ws_manager):
        """Test handling system error message."""
        event = {
            "type": "system",
            "subtype": "error",
            "message": "Rate limit exceeded",
            "session_id": "test-session-123"
        }

        monitor._handle_system_message(event)

        mock_ws_manager.broadcast_agent_log.assert_called_once()
        call_args = mock_ws_manager.broadcast_agent_log.call_args
        log_data = call_args.args[0] if call_args.args else call_args.kwargs
        assert log_data["level"] == "ERROR"
        assert "Rate limit exceeded" in log_data["message"]

    def test_broadcast_jsonl_event_routes_assistant(self, monitor, mock_ws_manager):
        """Test that _broadcast_jsonl_event routes assistant messages correctly."""
        event = {
            "type": "assistant",
            "message": {
                "content": [
                    {"type": "text", "text": "Hello"}
                ]
            }
        }

        with patch.object(monitor, '_handle_assistant_message') as mock_handler:
            monitor._broadcast_jsonl_event(event)
            mock_handler.assert_called_once_with(event)

    def test_broadcast_jsonl_event_routes_user(self, monitor, mock_ws_manager):
        """Test that _broadcast_jsonl_event routes user messages correctly."""
        event = {
            "type": "user",
            "message": {
                "content": [
                    {"type": "tool_result", "tool_use_id": "123", "content": "ok"}
                ]
            }
        }

        with patch.object(monitor, '_handle_user_message') as mock_handler:
            monitor._broadcast_jsonl_event(event)
            mock_handler.assert_called_once_with(event)

    def test_broadcast_jsonl_event_routes_system(self, monitor, mock_ws_manager):
        """Test that _broadcast_jsonl_event routes system messages correctly."""
        event = {
            "type": "system",
            "subtype": "init"
        }

        with patch.object(monitor, '_handle_system_message') as mock_handler:
            monitor._broadcast_jsonl_event(event)
            mock_handler.assert_called_once_with(event)

    def test_broadcast_jsonl_event_backwards_compatible_thinking_block(self, monitor, mock_ws_manager):
        """Test backwards compatibility for direct thinking_block events."""
        event = {
            "type": "thinking_block",
            "content": "Analyzing code...",
            "reasoning_type": "planning"
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_thinking_block.assert_called_once_with(
            adw_id="test-adw-123",
            content="Analyzing code...",
            reasoning_type="planning",
            duration_ms=None,
            sequence=None
        )

    def test_broadcast_jsonl_event_backwards_compatible_tool_use_pre(self, monitor, mock_ws_manager):
        """Test backwards compatibility for direct tool_use_pre events."""
        event = {
            "type": "tool_use_pre",
            "tool_name": "Read",
            "tool_input": {"file_path": "/test.js"},
            "tool_use_id": "123"
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_tool_use_pre.assert_called_once()

    def test_broadcast_jsonl_event_backwards_compatible_tool_use_post(self, monitor, mock_ws_manager):
        """Test backwards compatibility for direct tool_use_post events."""
        event = {
            "type": "tool_use_post",
            "tool_name": "Read",
            "tool_output": "File contents",
            "status": "success"
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_tool_use_post.assert_called_once()

    def test_broadcast_jsonl_event_backwards_compatible_text_block(self, monitor, mock_ws_manager):
        """Test backwards compatibility for direct text_block events."""
        event = {
            "type": "text_block",
            "content": "Response text"
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_text_block.assert_called_once()

    def test_broadcast_jsonl_event_backwards_compatible_file_changed(self, monitor, mock_ws_manager):
        """Test backwards compatibility for direct file_changed events."""
        event = {
            "type": "file_changed",
            "file_path": "/test.js",
            "operation": "modify"
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_file_changed.assert_called_once()

    def test_handle_assistant_message_empty_content(self, monitor, mock_ws_manager):
        """Test handling assistant message with empty content array."""
        event = {
            "type": "assistant",
            "message": {
                "content": []
            }
        }

        # Should not raise error
        monitor._handle_assistant_message(event)

        # No broadcasts should be made
        mock_ws_manager.broadcast_text_block.assert_not_called()
        mock_ws_manager.broadcast_tool_use_pre.assert_not_called()
        mock_ws_manager.broadcast_thinking_block.assert_not_called()

    def test_handle_assistant_message_no_message_key(self, monitor, mock_ws_manager):
        """Test handling assistant message without message key."""
        event = {
            "type": "assistant"
        }

        # Should not raise error
        monitor._handle_assistant_message(event)

        # No broadcasts should be made
        mock_ws_manager.broadcast_text_block.assert_not_called()

    def test_handle_user_message_no_tool_result(self, monitor, mock_ws_manager):
        """Test handling user message without tool_result."""
        event = {
            "type": "user",
            "message": {
                "content": [
                    {"type": "text", "text": "User input"}
                ]
            }
        }

        # Should not raise error
        monitor._handle_user_message(event)

        # No tool_use_post broadcast should be made
        mock_ws_manager.broadcast_tool_use_post.assert_not_called()


class TestAgentDirectoryMonitorRealWorldExamples:
    """Test with real-world JSONL examples from Claude Code."""

    @pytest.fixture
    def mock_ws_manager(self):
        """Create a mock WebSocket manager."""
        manager = Mock()
        manager.broadcast_text_block = AsyncMock()
        manager.broadcast_tool_use_pre = AsyncMock()
        manager.broadcast_tool_use_post = AsyncMock()
        manager.broadcast_thinking_block = AsyncMock()
        manager.broadcast_agent_log = AsyncMock()
        return manager

    @pytest.fixture
    def monitor(self, mock_ws_manager, tmp_path):
        """Create an AgentDirectoryMonitor instance."""
        return AgentDirectoryMonitor(
            adw_id="test-adw-123",
            websocket_manager=mock_ws_manager,
            agents_base_dir=str(tmp_path / "agents"),
            specs_dir=str(tmp_path / "specs")
        )

    def test_real_world_init_event(self, monitor, mock_ws_manager):
        """Test parsing a real init event from Claude Code."""
        event = {
            "type": "system",
            "subtype": "init",
            "cwd": "/Users/test/project",
            "session_id": "e2277643-d9d8-462b-b1c3-61e9e897d704",
            "tools": ["Task", "Bash", "Glob", "Grep", "Read", "Edit", "Write"],
            "model": "claude-sonnet-4-5-20250929",
            "permissionMode": "bypassPermissions",
            "claude_code_version": "2.0.53"
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_agent_log.assert_called_once()
        call_args = mock_ws_manager.broadcast_agent_log.call_args
        log_data = call_args.args[0] if call_args.args else call_args.kwargs
        assert "claude-sonnet-4-5-20250929" in log_data["message"]
        assert "tools: 7" in log_data["message"]

    def test_real_world_assistant_with_tool(self, monitor, mock_ws_manager):
        """Test parsing a real assistant message with tool use."""
        event = {
            "type": "assistant",
            "message": {
                "model": "claude-sonnet-4-5-20250929",
                "id": "msg_01WFzjMHjYzaqpqewJrW591y",
                "type": "message",
                "role": "assistant",
                "content": [
                    {
                        "type": "tool_use",
                        "id": "toolu_01Qub48FWpXJu2uw1C6HacBM",
                        "name": "Read",
                        "input": {
                            "file_path": "/Users/test/project/README.md"
                        }
                    }
                ],
                "stop_reason": "tool_use",
                "usage": {
                    "input_tokens": 3,
                    "output_tokens": 212
                }
            },
            "session_id": "e2277643-d9d8-462b-b1c3-61e9e897d704",
            "uuid": "ddcffc74-3dd3-499c-b301-6875716403da"
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_tool_use_pre.assert_called_once_with(
            adw_id="test-adw-123",
            tool_name="Read",
            tool_input={"file_path": "/Users/test/project/README.md"},
            tool_use_id="toolu_01Qub48FWpXJu2uw1C6HacBM"
        )

    def test_real_world_user_tool_result(self, monitor, mock_ws_manager):
        """Test parsing a real user message with tool result."""
        event = {
            "type": "user",
            "message": {
                "role": "user",
                "content": [
                    {
                        "tool_use_id": "toolu_01Qub48FWpXJu2uw1C6HacBM",
                        "type": "tool_result",
                        "content": "# Project Title\n\nProject description..."
                    }
                ]
            },
            "session_id": "e2277643-d9d8-462b-b1c3-61e9e897d704",
            "uuid": "98512f1a-45af-483c-a4f5-116148abc217",
            "tool_use_result": {
                "type": "text",
                "file": {
                    "filePath": "/Users/test/project/README.md"
                }
            }
        }

        monitor._broadcast_jsonl_event(event)

        mock_ws_manager.broadcast_tool_use_post.assert_called_once()
        call_args = mock_ws_manager.broadcast_tool_use_post.call_args
        assert call_args.kwargs["tool_use_id"] == "toolu_01Qub48FWpXJu2uw1C6HacBM"
        assert call_args.kwargs["status"] == "success"
        assert "Project Title" in call_args.kwargs["tool_output"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
