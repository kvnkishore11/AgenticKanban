"""
Review Modes - Multi-mode review system for comprehensive code quality checks.

Supports:
- UI_VALIDATION: Visual verification via Playwright screenshots
- CODE_QUALITY: ESLint, Ruff, and other linting tools
- SECURITY: Bearer CLI, Semgrep for vulnerability scanning
- DOCUMENTATION: Documentation completeness checks
- COMPREHENSIVE: All of the above
"""

from enum import Enum
from typing import Protocol, runtime_checkable
from dataclasses import dataclass, field
from datetime import datetime


class ReviewMode(Enum):
    """Review mode types."""
    UI_VALIDATION = "ui"           # Visual verification via Playwright
    CODE_QUALITY = "code"          # Code quality and style (ESLint, Ruff)
    SECURITY = "security"          # Security vulnerabilities (Bearer, Semgrep)
    DOCUMENTATION = "docs"         # Documentation completeness
    COMPREHENSIVE = "comprehensive" # All of the above


class IssueSeverity(Enum):
    """Severity levels for review findings."""
    CRITICAL = "critical"  # Must fix before merge
    HIGH = "high"          # Should fix before merge
    MEDIUM = "medium"      # Recommended to fix
    LOW = "low"            # Nice to fix
    INFO = "info"          # Informational only


@dataclass
class ReviewFinding:
    """A single finding from a review tool."""
    severity: IssueSeverity
    category: str  # e.g., "sql_injection", "unused_variable", "missing_docstring"
    message: str
    file_path: str | None = None
    line_number: int | None = None
    column: int | None = None
    rule_id: str | None = None  # e.g., "bearer/sql_injection", "eslint/no-unused-vars"
    tool: str = ""  # e.g., "bearer", "eslint", "ruff"
    recommendation: str | None = None
    code_snippet: str | None = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "severity": self.severity.value,
            "category": self.category,
            "message": self.message,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "column": self.column,
            "rule_id": self.rule_id,
            "tool": self.tool,
            "recommendation": self.recommendation,
            "code_snippet": self.code_snippet,
        }


@dataclass
class ReviewModeResult:
    """Result from executing a single review mode."""
    mode: ReviewMode
    success: bool
    tool_name: str
    findings: list[ReviewFinding] = field(default_factory=list)
    duration_ms: int = 0
    error: str | None = None
    raw_output: str | None = None

    @property
    def finding_counts(self) -> dict[str, int]:
        """Count findings by severity."""
        counts = {s.value: 0 for s in IssueSeverity}
        for finding in self.findings:
            counts[finding.severity.value] += 1
        return counts

    @property
    def has_blockers(self) -> bool:
        """Check if there are any blocking issues (critical or high)."""
        return any(f.severity in (IssueSeverity.CRITICAL, IssueSeverity.HIGH) for f in self.findings)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "mode": self.mode.value,
            "success": self.success,
            "tool": self.tool_name,
            "findings": [f.to_dict() for f in self.findings],
            "duration_ms": self.duration_ms,
            "error": self.error,
            "summary": self.finding_counts,
            "has_blockers": self.has_blockers,
        }


@dataclass
class ComprehensiveReviewResult:
    """Aggregated result from all review modes."""
    review_id: str
    adw_id: str
    success: bool
    modes_executed: list[ReviewMode]
    mode_results: list[ReviewModeResult] = field(default_factory=list)
    total_duration_ms: int = 0
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None

    @property
    def all_findings(self) -> list[ReviewFinding]:
        """Get all findings from all modes."""
        findings = []
        for result in self.mode_results:
            findings.extend(result.findings)
        return findings

    @property
    def total_finding_counts(self) -> dict[str, int]:
        """Count all findings by severity."""
        counts = {s.value: 0 for s in IssueSeverity}
        for finding in self.all_findings:
            counts[finding.severity.value] += 1
        return counts

    @property
    def has_blockers(self) -> bool:
        """Check if any mode has blocking issues."""
        return any(r.has_blockers for r in self.mode_results)

    @property
    def summary(self) -> str:
        """Generate a human-readable summary."""
        counts = self.total_finding_counts
        total = sum(counts.values())
        blockers = counts["critical"] + counts["high"]

        if total == 0:
            return "Review completed with no issues found"
        elif blockers > 0:
            return f"Review found {blockers} blocking issues ({counts['critical']} critical, {counts['high']} high)"
        else:
            return f"Review completed with {total} findings ({counts['medium']} medium, {counts['low']} low)"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "review_id": self.review_id,
            "adw_id": self.adw_id,
            "success": self.success,
            "summary": self.summary,
            "modes_executed": [m.value for m in self.modes_executed],
            "results": [r.to_dict() for r in self.mode_results],
            "total_findings": self.total_finding_counts,
            "has_blockers": self.has_blockers,
            "total_duration_ms": self.total_duration_ms,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error,
        }


@runtime_checkable
class ReviewModeHandler(Protocol):
    """Protocol for review mode handlers.

    Each handler implements a specific review mode (security, code quality, etc.).
    """

    @property
    def mode(self) -> ReviewMode:
        """The review mode this handler implements."""
        ...

    @property
    def tool_name(self) -> str:
        """The name of the tool used by this handler."""
        ...

    def is_available(self) -> bool:
        """Check if the required tools are installed and available."""
        ...

    async def execute(self, worktree_path: str, config: dict) -> ReviewModeResult:
        """Execute this review mode.

        Args:
            worktree_path: Path to the worktree to review
            config: Tool-specific configuration

        Returns:
            ReviewModeResult with findings
        """
        ...

    def parse_output(self, raw_output: str) -> list[ReviewFinding]:
        """Parse the raw tool output into findings.

        Args:
            raw_output: Raw output from the tool (usually JSON)

        Returns:
            List of ReviewFinding objects
        """
        ...


def get_modes_for_comprehensive() -> list[ReviewMode]:
    """Get all modes that should run for comprehensive review."""
    return [
        ReviewMode.SECURITY,
        ReviewMode.CODE_QUALITY,
        ReviewMode.UI_VALIDATION,
        ReviewMode.DOCUMENTATION,
    ]


def resolve_modes(mode_names: list[str]) -> list[ReviewMode]:
    """Resolve mode names to ReviewMode enums.

    Args:
        mode_names: List of mode names (e.g., ["ui", "code", "comprehensive"])

    Returns:
        List of unique ReviewMode enums to execute
    """
    modes = set()

    for name in mode_names:
        name_lower = name.lower().strip()

        if name_lower == "comprehensive" or name_lower == "all":
            modes.update(get_modes_for_comprehensive())
        else:
            try:
                # Try to find by value
                for mode in ReviewMode:
                    if mode.value == name_lower:
                        modes.add(mode)
                        break
                else:
                    # Try to find by name
                    modes.add(ReviewMode[name_lower.upper()])
            except (KeyError, ValueError):
                # Unknown mode, skip
                pass

    return list(modes)
