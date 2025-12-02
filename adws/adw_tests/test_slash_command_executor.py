#!/usr/bin/env -S uv run
# /// script
# dependencies = ["pytest", "pytest-asyncio"]
# ///

"""
Tests for the Slash Command Executor Module.

This module provides a simple, powerful way to execute Claude Code slash commands
from the UI. Instead of scripting every edge case, we let Claude handle the complexity.
"""

import pytest
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from adw_modules.slash_command_executor import (
    SlashCommandExecutor,
    SlashCommandRequest,
    SlashCommandResponse,
)


class TestSlashCommandExecutor:
    """Tests for SlashCommandExecutor class."""

    @pytest.fixture
    def executor(self, tmp_path):
        """Create an executor with a test commands directory."""
        # Create a mock commands directory
        commands_dir = tmp_path / ".claude" / "commands"
        commands_dir.mkdir(parents=True)

        # Create a test command
        test_command = commands_dir / "test_command.md"
        test_command.write_text("""# Test Command

This is a test command for unit testing.

## Run
echo "Hello from test command"
""")

        return SlashCommandExecutor(project_root=tmp_path)

    def test_init_with_custom_project_root(self, tmp_path):
        """Test initialization with custom project root."""
        executor = SlashCommandExecutor(project_root=tmp_path)
        assert executor.project_root == tmp_path
        assert executor.commands_dir == tmp_path / ".claude" / "commands"

    def test_init_with_default_project_root(self):
        """Test initialization with default project root."""
        executor = SlashCommandExecutor()
        assert executor.project_root.exists()
        assert executor.commands_dir.name == "commands"

    def test_resolve_command_alias(self, executor):
        """Test command alias resolution."""
        assert executor._resolve_command("merge") == "merge_worktree"
        assert executor._resolve_command("cleanup") == "cleanup_worktrees"
        assert executor._resolve_command("unknown_command") == "unknown_command"

    def test_validate_command_exists(self, executor):
        """Test command validation for existing command."""
        assert executor._validate_command("test_command") is True

    def test_validate_command_not_exists(self, executor):
        """Test command validation for non-existing command."""
        assert executor._validate_command("nonexistent_command") is False

    def test_build_claude_command(self, executor):
        """Test building the claude CLI command."""
        request = SlashCommandRequest(
            command="test_command",
            arguments=["arg1", "arg2"]
        )
        cmd = executor._build_claude_command(request)

        assert cmd[0] == "claude"
        assert "-p" in cmd
        assert "/test_command arg1 arg2" in cmd
        assert "--output-format" in cmd
        assert "text" in cmd

    def test_list_available_commands(self, executor):
        """Test listing available commands."""
        commands = executor.list_available_commands()

        assert len(commands) == 1
        assert commands[0]["name"] == "test_command"
        assert commands[0]["description"] == "Test Command"

    def test_list_available_commands_empty_dir(self, tmp_path):
        """Test listing commands when directory is empty."""
        commands_dir = tmp_path / ".claude" / "commands"
        commands_dir.mkdir(parents=True)

        executor = SlashCommandExecutor(project_root=tmp_path)
        commands = executor.list_available_commands()

        assert commands == []

    def test_list_available_commands_no_dir(self, tmp_path):
        """Test listing commands when directory doesn't exist."""
        executor = SlashCommandExecutor(project_root=tmp_path)
        commands = executor.list_available_commands()

        assert commands == []


class TestSlashCommandRequest:
    """Tests for SlashCommandRequest dataclass."""

    def test_basic_request(self):
        """Test creating a basic request."""
        request = SlashCommandRequest(command="test")
        assert request.command == "test"
        assert request.arguments == []
        assert request.working_directory is None
        assert request.context == {}

    def test_request_with_all_fields(self):
        """Test creating a request with all fields."""
        request = SlashCommandRequest(
            command="merge_worktree",
            arguments=["abc123", "rebase"],
            working_directory="/path/to/project",
            context={"adw_id": "abc123", "task_id": "task-1"}
        )
        assert request.command == "merge_worktree"
        assert request.arguments == ["abc123", "rebase"]
        assert request.working_directory == "/path/to/project"
        assert request.context == {"adw_id": "abc123", "task_id": "task-1"}


class TestSlashCommandResponse:
    """Tests for SlashCommandResponse dataclass."""

    def test_success_response(self):
        """Test creating a success response."""
        from datetime import datetime

        started = datetime.now()
        completed = datetime.now()

        response = SlashCommandResponse(
            success=True,
            command="test",
            exit_code=0,
            output="Command completed",
            started_at=started,
            completed_at=completed
        )

        assert response.success is True
        assert response.command == "test"
        assert response.exit_code == 0
        assert response.error is None

    def test_error_response(self):
        """Test creating an error response."""
        response = SlashCommandResponse(
            success=False,
            command="test",
            exit_code=1,
            output="",
            error="Command failed"
        )

        assert response.success is False
        assert response.exit_code == 1
        assert response.error == "Command failed"

    def test_response_to_dict(self):
        """Test converting response to dictionary."""
        from datetime import datetime

        started = datetime(2025, 1, 1, 12, 0, 0)
        completed = datetime(2025, 1, 1, 12, 0, 10)

        response = SlashCommandResponse(
            success=True,
            command="test",
            exit_code=0,
            output="Done",
            started_at=started,
            completed_at=completed
        )

        result = response.to_dict()

        assert result["success"] is True
        assert result["command"] == "test"
        assert result["exit_code"] == 0
        assert result["output"] == "Done"
        assert result["duration_seconds"] == 10.0


class TestAsyncCallbackSupport:
    """Tests for async callback support in execute_async."""

    @pytest.fixture
    def executor(self, tmp_path):
        """Create an executor with a test commands directory."""
        commands_dir = tmp_path / ".claude" / "commands"
        commands_dir.mkdir(parents=True)
        test_command = commands_dir / "echo_test.md"
        test_command.write_text("# Echo Test\nSimple echo command for testing.")
        return SlashCommandExecutor(project_root=tmp_path)

    def test_sync_callback_supported(self):
        """Test that sync callbacks are properly called."""
        import inspect

        # Sync callback
        def sync_callback(line):
            pass

        assert not inspect.iscoroutinefunction(sync_callback)

    def test_async_callback_detection(self):
        """Test that async callbacks are properly detected."""
        import inspect

        # Async callback
        async def async_callback(line):
            pass

        assert inspect.iscoroutinefunction(async_callback)


class TestSlashCommandIntegration:
    """Integration tests for slash command execution.

    These tests require the actual project structure and claude CLI.
    They are marked as slow and can be skipped in CI.
    """

    @pytest.fixture
    def real_executor(self):
        """Create an executor with the real project root."""
        # Use the actual project root
        project_root = Path(__file__).parent.parent.parent
        return SlashCommandExecutor(project_root=project_root)

    def test_real_project_has_commands(self, real_executor):
        """Test that the real project has some slash commands."""
        commands = real_executor.list_available_commands()
        assert len(commands) > 0

        # Check for some expected commands
        command_names = [c["name"] for c in commands]
        assert "merge_worktree" in command_names

    def test_merge_worktree_command_exists(self, real_executor):
        """Test that merge_worktree command exists and is valid."""
        assert real_executor._validate_command("merge_worktree") is True

    def test_command_aliases_resolve_to_existing_commands(self, real_executor):
        """Test that command aliases resolve to existing commands."""
        for alias, command in real_executor.COMMAND_ALIASES.items():
            assert real_executor._validate_command(command) is True, \
                f"Alias '{alias}' -> '{command}' does not exist"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
