"""Base Tool Runner - Abstract base class for review tool runners."""

import asyncio
import json
import shutil
import time
from abc import ABC, abstractmethod
from pathlib import Path

from stages.review_modes import (
    ReviewMode,
    ReviewModeResult,
    ReviewFinding,
    IssueSeverity,
)
from schemas.review_config import ReviewToolConfig


class BaseToolRunner(ABC):
    """Abstract base class for review tool runners.

    Each tool runner wraps an external tool (Bearer, Semgrep, ESLint, etc.)
    and provides a consistent interface for:
    - Checking if the tool is available
    - Running the tool and capturing output
    - Parsing output into ReviewFinding objects
    """

    def __init__(self, config: ReviewToolConfig | None = None):
        self.config = config or ReviewToolConfig()

    @property
    @abstractmethod
    def tool_name(self) -> str:
        """Name of the tool (e.g., 'bearer', 'eslint')."""
        ...

    @property
    @abstractmethod
    def mode(self) -> ReviewMode:
        """The review mode this tool belongs to."""
        ...

    @property
    @abstractmethod
    def command(self) -> str:
        """The command to check for availability (e.g., 'bearer', 'npx eslint')."""
        ...

    def is_available(self) -> bool:
        """Check if the tool is installed and available."""
        cmd = self.command.split()[0]  # Get first part of command
        return shutil.which(cmd) is not None

    @abstractmethod
    def build_command(self, worktree_path: str) -> list[str]:
        """Build the command to run the tool.

        Args:
            worktree_path: Path to the worktree to scan

        Returns:
            List of command arguments
        """
        ...

    @abstractmethod
    def parse_output(self, raw_output: str) -> list[ReviewFinding]:
        """Parse the raw tool output into findings.

        Args:
            raw_output: Raw output from the tool (usually JSON)

        Returns:
            List of ReviewFinding objects
        """
        ...

    async def execute(self, worktree_path: str) -> ReviewModeResult:
        """Execute the tool and return results.

        Args:
            worktree_path: Path to the worktree to scan

        Returns:
            ReviewModeResult with findings
        """
        start_time = time.time()

        # Check if tool is available
        if not self.is_available():
            return ReviewModeResult(
                mode=self.mode,
                success=False,
                tool_name=self.tool_name,
                error=f"{self.tool_name} is not installed or not in PATH",
                duration_ms=0,
            )

        # Build and run command
        try:
            cmd = self.build_command(worktree_path)
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=worktree_path,
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self.config.timeout_seconds,
            )

            raw_output = stdout.decode("utf-8", errors="replace")
            raw_error = stderr.decode("utf-8", errors="replace")

            # Some tools output results even with non-zero exit codes
            # (e.g., ESLint exits 1 when there are lint errors)
            findings = self.parse_output(raw_output)

            duration_ms = int((time.time() - start_time) * 1000)

            # Filter by severity threshold
            findings = self._filter_by_severity(findings)

            # Filter by exclude paths
            findings = self._filter_by_paths(findings)

            return ReviewModeResult(
                mode=self.mode,
                success=True,
                tool_name=self.tool_name,
                findings=findings,
                duration_ms=duration_ms,
                raw_output=raw_output if len(raw_output) < 10000 else raw_output[:10000] + "...",
            )

        except asyncio.TimeoutError:
            return ReviewModeResult(
                mode=self.mode,
                success=False,
                tool_name=self.tool_name,
                error=f"{self.tool_name} timed out after {self.config.timeout_seconds}s",
                duration_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            return ReviewModeResult(
                mode=self.mode,
                success=False,
                tool_name=self.tool_name,
                error=str(e),
                duration_ms=int((time.time() - start_time) * 1000),
            )

    def _filter_by_severity(self, findings: list[ReviewFinding]) -> list[ReviewFinding]:
        """Filter findings by severity threshold."""
        severity_order = ["critical", "high", "medium", "low", "info"]
        threshold = self.config.severity_threshold

        if threshold not in severity_order:
            threshold = "info"  # Include all by default

        threshold_idx = severity_order.index(threshold)

        return [
            f for f in findings
            if severity_order.index(f.severity.value) <= threshold_idx
        ]

    def _filter_by_paths(self, findings: list[ReviewFinding]) -> list[ReviewFinding]:
        """Filter out findings from excluded paths."""
        if not self.config.exclude_paths:
            return findings

        def is_excluded(file_path: str | None) -> bool:
            if not file_path:
                return False
            for pattern in self.config.exclude_paths:
                if pattern in file_path:
                    return True
            return False

        return [f for f in findings if not is_excluded(f.file_path)]

    @staticmethod
    def map_severity(severity_str: str) -> IssueSeverity:
        """Map tool-specific severity strings to IssueSeverity enum."""
        severity_map = {
            # Common patterns
            "critical": IssueSeverity.CRITICAL,
            "high": IssueSeverity.HIGH,
            "medium": IssueSeverity.MEDIUM,
            "moderate": IssueSeverity.MEDIUM,
            "low": IssueSeverity.LOW,
            "info": IssueSeverity.INFO,
            "note": IssueSeverity.INFO,
            "warning": IssueSeverity.MEDIUM,
            "error": IssueSeverity.HIGH,
            # ESLint specific
            "2": IssueSeverity.HIGH,  # error
            "1": IssueSeverity.MEDIUM,  # warning
            "0": IssueSeverity.INFO,  # off
        }
        return severity_map.get(severity_str.lower(), IssueSeverity.MEDIUM)
