"""
Review Configuration Schema - Pydantic models for review stage configuration.

Supports:
- Per-tool configuration (enable/disable, severity thresholds, custom rules)
- Mode selection (ui, code, security, docs, comprehensive)
- Failure thresholds (fail on blockers, max issues)
- UI validation settings
- AI review settings
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class ReviewToolConfig:
    """Configuration for an individual review tool."""

    enabled: bool = True
    severity_threshold: Literal["critical", "high", "medium", "low", "info"] = "warning"
    custom_rules: list[str] | None = None
    exclude_paths: list[str] | None = None
    timeout_seconds: int = 300  # 5 minutes default

    def to_dict(self) -> dict:
        return {
            "enabled": self.enabled,
            "severity_threshold": self.severity_threshold,
            "custom_rules": self.custom_rules,
            "exclude_paths": self.exclude_paths,
            "timeout_seconds": self.timeout_seconds,
        }


@dataclass
class UIValidationConfig:
    """Configuration for UI validation mode."""

    enabled: bool = True
    screenshot_count: int = 5
    viewport_width: int = 1280
    viewport_height: int = 720
    wait_for_load_ms: int = 3000
    routes_to_check: list[str] | None = None  # None = auto-detect
    check_console_errors: bool = True
    check_network_errors: bool = True

    def to_dict(self) -> dict:
        return {
            "enabled": self.enabled,
            "screenshot_count": self.screenshot_count,
            "viewport_width": self.viewport_width,
            "viewport_height": self.viewport_height,
            "wait_for_load_ms": self.wait_for_load_ms,
            "routes_to_check": self.routes_to_check,
            "check_console_errors": self.check_console_errors,
            "check_network_errors": self.check_network_errors,
        }


@dataclass
class AIReviewConfig:
    """Configuration for AI-powered code review."""

    enabled: bool = True
    provider: Literal["claude", "pr-agent"] = "claude"
    focus_areas: list[str] | None = None  # e.g., ["security", "performance", "readability"]
    max_files: int = 50  # Limit files to review for performance
    include_suggestions: bool = True
    include_summary: bool = True

    def to_dict(self) -> dict:
        return {
            "enabled": self.enabled,
            "provider": self.provider,
            "focus_areas": self.focus_areas,
            "max_files": self.max_files,
            "include_suggestions": self.include_suggestions,
            "include_summary": self.include_summary,
        }


@dataclass
class ReviewConfig:
    """Complete review stage configuration.

    This configuration controls how the review stage behaves:
    - Which modes to run (ui, code, security, docs, or comprehensive)
    - Tool-specific settings (Bearer, Semgrep, ESLint, Ruff)
    - Failure conditions (when to fail the review)
    - UI validation settings
    - AI review settings
    """

    # Skip controls - review never skips by default!
    skip_review: bool = False  # Only skip if explicitly set to True
    skip_on_no_changes: bool = False  # Skip if git diff is empty

    # Mode selection
    modes: list[str] = field(default_factory=lambda: ["comprehensive"])

    # Tool configurations
    tools: dict[str, ReviewToolConfig] = field(default_factory=lambda: {
        "bearer": ReviewToolConfig(enabled=True),
        "semgrep": ReviewToolConfig(enabled=True),
        "eslint": ReviewToolConfig(enabled=True),
        "ruff": ReviewToolConfig(enabled=True),
    })

    # Failure thresholds
    fail_on_critical: bool = True  # Fail review if critical issues found
    fail_on_high: bool = True  # Fail review if high severity issues found
    fail_on_security_critical: bool = True  # Always fail on critical security issues
    max_issues_before_fail: int = 100  # Fail if total issues exceed this

    # UI validation
    ui_validation: UIValidationConfig = field(default_factory=UIValidationConfig)

    # AI review
    ai_review: AIReviewConfig = field(default_factory=AIReviewConfig)

    # Output settings
    generate_report: bool = True
    report_format: Literal["json", "markdown", "both"] = "both"
    save_screenshots: bool = True

    def to_dict(self) -> dict:
        return {
            "skip_review": self.skip_review,
            "skip_on_no_changes": self.skip_on_no_changes,
            "modes": self.modes,
            "tools": {k: v.to_dict() for k, v in self.tools.items()},
            "fail_on_critical": self.fail_on_critical,
            "fail_on_high": self.fail_on_high,
            "fail_on_security_critical": self.fail_on_security_critical,
            "max_issues_before_fail": self.max_issues_before_fail,
            "ui_validation": self.ui_validation.to_dict(),
            "ai_review": self.ai_review.to_dict(),
            "generate_report": self.generate_report,
            "report_format": self.report_format,
            "save_screenshots": self.save_screenshots,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ReviewConfig":
        """Create ReviewConfig from dictionary."""
        config = cls()

        # Simple fields
        if "skip_review" in data:
            config.skip_review = data["skip_review"]
        if "skip_on_no_changes" in data:
            config.skip_on_no_changes = data["skip_on_no_changes"]
        if "modes" in data:
            config.modes = data["modes"]
        if "fail_on_critical" in data:
            config.fail_on_critical = data["fail_on_critical"]
        if "fail_on_high" in data:
            config.fail_on_high = data["fail_on_high"]
        if "fail_on_security_critical" in data:
            config.fail_on_security_critical = data["fail_on_security_critical"]
        if "max_issues_before_fail" in data:
            config.max_issues_before_fail = data["max_issues_before_fail"]
        if "generate_report" in data:
            config.generate_report = data["generate_report"]
        if "report_format" in data:
            config.report_format = data["report_format"]
        if "save_screenshots" in data:
            config.save_screenshots = data["save_screenshots"]

        # Tool configurations
        if "tools" in data:
            for tool_name, tool_data in data["tools"].items():
                if isinstance(tool_data, dict):
                    config.tools[tool_name] = ReviewToolConfig(
                        enabled=tool_data.get("enabled", True),
                        severity_threshold=tool_data.get("severity_threshold", "warning"),
                        custom_rules=tool_data.get("custom_rules"),
                        exclude_paths=tool_data.get("exclude_paths"),
                        timeout_seconds=tool_data.get("timeout_seconds", 300),
                    )

        # UI validation config
        if "ui_validation" in data and isinstance(data["ui_validation"], dict):
            ui_data = data["ui_validation"]
            config.ui_validation = UIValidationConfig(
                enabled=ui_data.get("enabled", True),
                screenshot_count=ui_data.get("screenshot_count", 5),
                viewport_width=ui_data.get("viewport_width", 1280),
                viewport_height=ui_data.get("viewport_height", 720),
                wait_for_load_ms=ui_data.get("wait_for_load_ms", 3000),
                routes_to_check=ui_data.get("routes_to_check"),
                check_console_errors=ui_data.get("check_console_errors", True),
                check_network_errors=ui_data.get("check_network_errors", True),
            )

        # AI review config
        if "ai_review" in data and isinstance(data["ai_review"], dict):
            ai_data = data["ai_review"]
            config.ai_review = AIReviewConfig(
                enabled=ai_data.get("enabled", True),
                provider=ai_data.get("provider", "claude"),
                focus_areas=ai_data.get("focus_areas"),
                max_files=ai_data.get("max_files", 50),
                include_suggestions=ai_data.get("include_suggestions", True),
                include_summary=ai_data.get("include_summary", True),
            )

        return config

    @classmethod
    def minimal(cls) -> "ReviewConfig":
        """Create a minimal review config (code quality only, no UI/AI)."""
        return cls(
            modes=["code"],
            ui_validation=UIValidationConfig(enabled=False),
            ai_review=AIReviewConfig(enabled=False),
        )

    @classmethod
    def security_focused(cls) -> "ReviewConfig":
        """Create a security-focused review config."""
        return cls(
            modes=["security"],
            tools={
                "bearer": ReviewToolConfig(enabled=True),
                "semgrep": ReviewToolConfig(enabled=True),
                "eslint": ReviewToolConfig(enabled=False),
                "ruff": ReviewToolConfig(enabled=False),
            },
            fail_on_security_critical=True,
            fail_on_high=True,
        )

    @classmethod
    def quick(cls) -> "ReviewConfig":
        """Create a quick review config (just ESLint/Ruff, no security scan)."""
        return cls(
            modes=["code"],
            tools={
                "bearer": ReviewToolConfig(enabled=False),
                "semgrep": ReviewToolConfig(enabled=False),
                "eslint": ReviewToolConfig(enabled=True),
                "ruff": ReviewToolConfig(enabled=True),
            },
            ui_validation=UIValidationConfig(enabled=False),
            ai_review=AIReviewConfig(enabled=False),
            fail_on_critical=True,
            fail_on_high=False,
        )
