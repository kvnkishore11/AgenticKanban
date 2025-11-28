"""Ruff Runner - Fast Python linter and formatter.

Ruff is an extremely fast Python linter written in Rust:
- 10-100x faster than traditional Python linters
- Replaces Flake8, isort, and many other tools
- Supports auto-fix

Installation:
    pip install ruff
    # or
    brew install ruff

Usage:
    ruff check . --output-format json
"""

import json
from tools.base_runner import BaseToolRunner
from stages.review_modes import ReviewMode, ReviewFinding, IssueSeverity
from schemas.review_config import ReviewToolConfig


class RuffRunner(BaseToolRunner):
    """Runner for Ruff Python linter."""

    def __init__(self, config: ReviewToolConfig | None = None):
        super().__init__(config)

    @property
    def tool_name(self) -> str:
        return "ruff"

    @property
    def mode(self) -> ReviewMode:
        return ReviewMode.CODE_QUALITY

    @property
    def command(self) -> str:
        return "ruff"

    def build_command(self, worktree_path: str) -> list[str]:
        """Build Ruff check command."""
        cmd = [
            "ruff",
            "check",
            worktree_path,
            "--output-format", "json",
        ]

        # Add default exclusions
        default_excludes = [
            "node_modules",
            "venv",
            ".venv",
            "__pycache__",
            ".git",
            "dist",
            "build",
        ]

        excludes = default_excludes + (self.config.exclude_paths or [])
        for exc in excludes:
            cmd.extend(["--exclude", exc])

        # Select specific rules if configured
        if self.config.custom_rules:
            for rule in self.config.custom_rules:
                cmd.extend(["--select", rule])

        return cmd

    def parse_output(self, raw_output: str) -> list[ReviewFinding]:
        """Parse Ruff JSON output into findings."""
        findings = []

        if not raw_output.strip():
            return findings

        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError:
            return findings

        # Ruff outputs an array of issues
        if not isinstance(data, list):
            data = data.get("results", data.get("diagnostics", []))

        for issue in data:
            finding = self._parse_issue(issue)
            if finding:
                findings.append(finding)

        return findings

    def _parse_issue(self, issue: dict) -> ReviewFinding | None:
        """Parse a single Ruff issue."""
        if not issue:
            return None

        # Code and message
        code = issue.get("code", "")
        message = issue.get("message", "Ruff issue")

        # Severity based on code prefix
        severity = self._severity_from_code(code)

        # Category from code
        category = self._category_from_code(code)

        # Location
        location = issue.get("location", {})
        file_path = issue.get("filename")
        line = location.get("row") or issue.get("line")
        column = location.get("column") or issue.get("column")

        # End location
        end_location = issue.get("end_location", {})

        # Fix information
        fix = issue.get("fix")
        recommendation = None
        if fix:
            if fix.get("applicability") == "safe":
                recommendation = "Safe auto-fix available"
            else:
                recommendation = "Auto-fix available (review suggested)"

        # URL for rule documentation
        url = issue.get("url")
        if url and not recommendation:
            recommendation = url

        return ReviewFinding(
            severity=severity,
            category=category,
            message=message,
            file_path=file_path,
            line_number=int(line) if line else None,
            column=int(column) if column else None,
            rule_id=f"ruff/{code}" if code else None,
            tool=self.tool_name,
            recommendation=recommendation,
            code_snippet=None,
        )

    @staticmethod
    def _severity_from_code(code: str) -> IssueSeverity:
        """Determine severity from Ruff code prefix."""
        if not code:
            return IssueSeverity.MEDIUM

        prefix = code[0].upper() if code else ""

        # Severity mapping based on Ruff categories
        high_severity = {"S", "B", "T"}  # Security, Bugbear, flake8-print
        medium_severity = {"E", "W", "F", "C", "N"}  # Errors, Warnings, pyflakes, complexity, naming
        low_severity = {"I", "D", "UP", "ANN"}  # isort, docstrings, pyupgrade, annotations

        if prefix in high_severity:
            return IssueSeverity.HIGH
        if prefix in medium_severity:
            return IssueSeverity.MEDIUM
        if prefix in low_severity:
            return IssueSeverity.LOW

        return IssueSeverity.MEDIUM

    @staticmethod
    def _category_from_code(code: str) -> str:
        """Derive category from Ruff rule code."""
        if not code:
            return "code_quality"

        prefix = code[0:1].upper() if len(code) >= 1 else ""
        prefix2 = code[0:2].upper() if len(code) >= 2 else ""
        prefix3 = code[0:3].upper() if len(code) >= 3 else ""

        # Map Ruff code prefixes to categories
        category_map = {
            "E": "pycodestyle_error",
            "W": "pycodestyle_warning",
            "F": "pyflakes",
            "C": "complexity",
            "N": "naming",
            "D": "docstrings",
            "UP": "modernize",
            "S": "security",
            "B": "bugbear",
            "A": "builtins",
            "COM": "commas",
            "C4": "comprehensions",
            "DTZ": "datetime",
            "T10": "debugging",
            "DJ": "django",
            "EM": "error_messages",
            "EXE": "executable",
            "FA": "future_annotations",
            "ISC": "string_concat",
            "ICN": "import_conventions",
            "G": "logging",
            "INP": "implicit_namespace",
            "PIE": "misc",
            "T20": "print",
            "PYI": "type_stubs",
            "PT": "pytest",
            "Q": "quotes",
            "RSE": "raise",
            "RET": "return",
            "SLF": "self",
            "SIM": "simplify",
            "TID": "tidy_imports",
            "TCH": "type_checking",
            "INT": "gettext",
            "ARG": "unused_arguments",
            "PTH": "pathlib",
            "ERA": "commented_code",
            "PD": "pandas",
            "PGH": "pygrep_hooks",
            "PL": "pylint",
            "TRY": "tryceratops",
            "FLY": "flynt",
            "NPY": "numpy",
            "AIR": "airflow",
            "PERF": "performance",
            "RUF": "ruff",
            "I": "imports",
            "ANN": "annotations",
        }

        # Check longest prefix first
        if prefix3 in category_map:
            return category_map[prefix3]
        if prefix2 in category_map:
            return category_map[prefix2]
        if prefix in category_map:
            return category_map[prefix]

        return "code_quality"
