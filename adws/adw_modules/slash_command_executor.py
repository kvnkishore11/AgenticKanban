"""
Slash Command Executor Module

A generic executor that runs Claude Code slash commands from the UI.
This provides a simple interface for the UI to trigger any slash command
without needing complex workflow-specific logic.

The key insight: let Claude handle the complexity, don't try to script everything.
"""

import subprocess
import asyncio
import inspect
import json
import logging
import os
from pathlib import Path
from typing import Optional, Callable, Any, Union
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


def _get_clean_env() -> dict:
    """
    Get a clean environment for subprocess that excludes ANTHROPIC_API_KEY.

    This ensures Claude Code uses its own authentication (e.g., Claude Max subscription)
    instead of any API key that might be set in the parent process's environment.
    """
    env = os.environ.copy()
    # Remove ANTHROPIC_API_KEY so Claude Code uses its own auth
    env.pop('ANTHROPIC_API_KEY', None)
    return env


@dataclass
class SlashCommandRequest:
    """Request to execute a slash command."""
    command: str  # e.g., "merge_worktree", "cleanup_worktrees"
    arguments: list[str] = field(default_factory=list)  # e.g., ["8250f1e2", "rebase"]
    working_directory: Optional[str] = None  # defaults to project root
    context: dict = field(default_factory=dict)  # additional context (adw_id, task_id, etc.)


@dataclass
class SlashCommandResponse:
    """Response from slash command execution."""
    success: bool
    command: str
    exit_code: int
    output: str
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "command": self.command,
            "exit_code": self.exit_code,
            "output": self.output,
            "error": self.error,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": (self.completed_at - self.started_at).total_seconds()
                if self.started_at and self.completed_at else None
        }


class SlashCommandExecutor:
    """
    Executes Claude Code slash commands.

    This is intentionally simple - the complexity lives in the slash commands themselves,
    which are executed by Claude Code and can handle edge cases intelligently.
    """

    # Map of common UI actions to slash commands
    COMMAND_ALIASES = {
        "merge": "merge_worktree",
        "cleanup": "cleanup_worktrees",
        "install": "install_worktree",
        "test": "test",
        "test_e2e": "test_e2e",
    }

    def __init__(self, project_root: Optional[Path] = None):
        """
        Initialize the executor.

        Args:
            project_root: Root directory of the project. Defaults to parent of adws/.
        """
        if project_root:
            self.project_root = Path(project_root)
        else:
            # Default: go up from adws/adw_modules/ to project root
            self.project_root = Path(__file__).parent.parent.parent

        self.commands_dir = self.project_root / ".claude" / "commands"
        logger.info(f"SlashCommandExecutor initialized with project_root: {self.project_root}")

    def _resolve_command(self, command: str) -> str:
        """Resolve command aliases to actual command names."""
        return self.COMMAND_ALIASES.get(command, command)

    def _validate_command(self, command: str) -> bool:
        """Check if a slash command exists."""
        command_file = self.commands_dir / f"{command}.md"
        return command_file.exists()

    def _build_claude_command(self, request: SlashCommandRequest) -> list[str]:
        """Build the claude CLI command to execute."""
        command_name = self._resolve_command(request.command)

        # Build the slash command string
        slash_command = f"/{command_name}"
        if request.arguments:
            slash_command += " " + " ".join(request.arguments)

        # Use claude CLI with the slash command as prompt
        # The -p flag runs in non-interactive mode with the given prompt
        cmd = [
            "claude",
            "-p",
            slash_command,
            "--output-format", "text"  # Get plain text output
        ]

        return cmd

    async def execute_async(
        self,
        request: SlashCommandRequest,
        on_output: Optional[Callable[[str], None]] = None,
        timeout: int = 600  # 10 minutes default
    ) -> SlashCommandResponse:
        """
        Execute a slash command asynchronously with streaming output.

        Args:
            request: The command request
            on_output: Callback for streaming output lines
            timeout: Maximum execution time in seconds

        Returns:
            SlashCommandResponse with execution results
        """
        command_name = self._resolve_command(request.command)

        # Validate command exists
        if not self._validate_command(command_name):
            return SlashCommandResponse(
                success=False,
                command=command_name,
                exit_code=-1,
                output="",
                error=f"Command '/{command_name}' not found in {self.commands_dir}"
            )

        started_at = datetime.now()
        cmd = self._build_claude_command(request)
        working_dir = request.working_directory or str(self.project_root)

        logger.info(f"Executing slash command: {' '.join(cmd)} in {working_dir}")

        try:
            # Use clean environment without ANTHROPIC_API_KEY so Claude Code
            # uses its own authentication (e.g., Claude Max subscription)
            clean_env = _get_clean_env()

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=working_dir,
                env=clean_env
            )

            output_lines = []

            # Stream stdout
            async def read_stream(stream, is_stderr=False):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    decoded = line.decode('utf-8', errors='replace').rstrip()
                    output_lines.append(decoded)
                    if on_output:
                        # Support both sync and async callbacks
                        if inspect.iscoroutinefunction(on_output):
                            await on_output(decoded)
                        else:
                            on_output(decoded)
                    if is_stderr:
                        logger.warning(f"[stderr] {decoded}")
                    else:
                        logger.debug(f"[stdout] {decoded}")

            # Read both streams concurrently with timeout
            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        read_stream(process.stdout),
                        read_stream(process.stderr, is_stderr=True)
                    ),
                    timeout=timeout
                )
                await process.wait()
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return SlashCommandResponse(
                    success=False,
                    command=command_name,
                    exit_code=-1,
                    output="\n".join(output_lines),
                    error=f"Command timed out after {timeout} seconds",
                    started_at=started_at,
                    completed_at=datetime.now()
                )

            completed_at = datetime.now()
            exit_code = process.returncode

            return SlashCommandResponse(
                success=exit_code == 0,
                command=command_name,
                exit_code=exit_code,
                output="\n".join(output_lines),
                error=None if exit_code == 0 else f"Command exited with code {exit_code}",
                started_at=started_at,
                completed_at=completed_at
            )

        except FileNotFoundError:
            return SlashCommandResponse(
                success=False,
                command=command_name,
                exit_code=-1,
                output="",
                error="Claude CLI not found. Make sure 'claude' is installed and in PATH.",
                started_at=started_at,
                completed_at=datetime.now()
            )
        except Exception as e:
            logger.exception(f"Error executing slash command: {e}")
            return SlashCommandResponse(
                success=False,
                command=command_name,
                exit_code=-1,
                output="",
                error=str(e),
                started_at=started_at,
                completed_at=datetime.now()
            )

    def execute_sync(
        self,
        request: SlashCommandRequest,
        timeout: int = 600
    ) -> SlashCommandResponse:
        """
        Execute a slash command synchronously.

        Args:
            request: The command request
            timeout: Maximum execution time in seconds

        Returns:
            SlashCommandResponse with execution results
        """
        command_name = self._resolve_command(request.command)

        # Validate command exists
        if not self._validate_command(command_name):
            return SlashCommandResponse(
                success=False,
                command=command_name,
                exit_code=-1,
                output="",
                error=f"Command '/{command_name}' not found in {self.commands_dir}"
            )

        started_at = datetime.now()
        cmd = self._build_claude_command(request)
        working_dir = request.working_directory or str(self.project_root)

        logger.info(f"Executing slash command (sync): {' '.join(cmd)} in {working_dir}")

        try:
            # Use clean environment without ANTHROPIC_API_KEY so Claude Code
            # uses its own authentication (e.g., Claude Max subscription)
            clean_env = _get_clean_env()

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=working_dir,
                timeout=timeout,
                env=clean_env
            )

            completed_at = datetime.now()

            return SlashCommandResponse(
                success=result.returncode == 0,
                command=command_name,
                exit_code=result.returncode,
                output=result.stdout + result.stderr,
                error=None if result.returncode == 0 else f"Command exited with code {result.returncode}",
                started_at=started_at,
                completed_at=completed_at
            )

        except subprocess.TimeoutExpired:
            return SlashCommandResponse(
                success=False,
                command=command_name,
                exit_code=-1,
                output="",
                error=f"Command timed out after {timeout} seconds",
                started_at=started_at,
                completed_at=datetime.now()
            )
        except FileNotFoundError:
            return SlashCommandResponse(
                success=False,
                command=command_name,
                exit_code=-1,
                output="",
                error="Claude CLI not found. Make sure 'claude' is installed and in PATH.",
                started_at=started_at,
                completed_at=datetime.now()
            )
        except Exception as e:
            logger.exception(f"Error executing slash command: {e}")
            return SlashCommandResponse(
                success=False,
                command=command_name,
                exit_code=-1,
                output="",
                error=str(e),
                started_at=started_at,
                completed_at=datetime.now()
            )

    def list_available_commands(self) -> list[dict]:
        """List all available slash commands."""
        commands = []

        if not self.commands_dir.exists():
            return commands

        for cmd_file in self.commands_dir.glob("*.md"):
            command_name = cmd_file.stem

            # Read first few lines to get description
            try:
                with open(cmd_file, 'r') as f:
                    lines = f.readlines()[:10]
                    # Look for a description in the header
                    description = ""
                    for line in lines:
                        if line.startswith("# "):
                            description = line[2:].strip()
                            break

                    commands.append({
                        "name": command_name,
                        "description": description,
                        "file": str(cmd_file.relative_to(self.project_root))
                    })
            except Exception as e:
                logger.warning(f"Could not read command file {cmd_file}: {e}")

        return sorted(commands, key=lambda x: x["name"])


# Convenience function for quick execution
async def execute_slash_command(
    command: str,
    arguments: list[str] = None,
    working_directory: str = None,
    on_output: Callable[[str], None] = None,
    timeout: int = 600
) -> SlashCommandResponse:
    """
    Convenience function to execute a slash command.

    Args:
        command: Command name (e.g., "merge_worktree")
        arguments: Command arguments (e.g., ["8250f1e2", "rebase"])
        working_directory: Working directory for execution
        on_output: Callback for streaming output
        timeout: Timeout in seconds

    Returns:
        SlashCommandResponse
    """
    executor = SlashCommandExecutor()
    request = SlashCommandRequest(
        command=command,
        arguments=arguments or [],
        working_directory=working_directory
    )
    return await executor.execute_async(request, on_output=on_output, timeout=timeout)
