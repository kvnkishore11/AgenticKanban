"""Semgrep Runner - Code pattern and security scanning.

Semgrep is an open-source static analysis tool that:
- Finds bugs and security vulnerabilities
- Supports custom rules
- Works with many languages

Installation:
    pip install semgrep
    # or
    brew install semgrep

Usage:
    semgrep scan --config auto --json
"""

import json
from tools.base_runner import BaseToolRunner
from stages.review_modes import ReviewMode, ReviewFinding, IssueSeverity
from schemas.review_config import ReviewToolConfig


class SemgrepRunner(BaseToolRunner):
    """Runner for Semgrep security scanner."""

    def __init__(self, config: ReviewToolConfig | None = None):
        super().__init__(config)

    @property
    def tool_name(self) -> str:
        return "semgrep"

    @property
    def mode(self) -> ReviewMode:
        return ReviewMode.SECURITY

    @property
    def command(self) -> str:
        return "semgrep"

    def build_command(self, worktree_path: str) -> list[str]:
        """Build Semgrep scan command."""
        cmd = [
            "semgrep",
            "scan",
            worktree_path,
            "--json",
            "--config", "auto",  # Use recommended rules
            "--metrics=off",  # Don't send telemetry
        ]

        # Add custom rules/configs if specified
        if self.config.custom_rules:
            for rule in self.config.custom_rules:
                cmd.extend(["--config", rule])

        # Add exclusions
        default_exclusions = [
            "node_modules",
            "venv",
            ".git",
            "dist",
            "build",
            "__pycache__",
        ]

        exclusions = default_exclusions + (self.config.exclude_paths or [])
        for exclusion in exclusions:
            cmd.extend(["--exclude", exclusion])

        return cmd

    def parse_output(self, raw_output: str) -> list[ReviewFinding]:
        """Parse Semgrep JSON output into findings."""
        findings = []

        if not raw_output.strip():
            return findings

        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError:
            return findings

        # Semgrep puts results under "results" key
        for result in data.get("results", []):
            finding = self._parse_result(result)
            if finding:
                findings.append(finding)

        return findings

    def _parse_result(self, result: dict) -> ReviewFinding | None:
        """Parse a single Semgrep result."""
        if not result:
            return None

        # Extract check/rule info
        check_id = result.get("check_id", "")
        extra = result.get("extra", {})

        # Severity
        severity_str = extra.get("severity", "WARNING")
        severity = self._map_semgrep_severity(severity_str)

        # Location
        file_path = result.get("path")
        start = result.get("start", {})
        end = result.get("end", {})

        line_number = start.get("line")
        column = start.get("col")

        # Message
        message = extra.get("message", result.get("message", "Semgrep finding"))

        # Category from check_id
        category = self._category_from_check_id(check_id)

        # Metadata for recommendation
        metadata = extra.get("metadata", {})
        recommendation = None

        if metadata.get("cwe"):
            recommendation = f"CWE: {metadata['cwe']}"
        if metadata.get("owasp"):
            recommendation = f"OWASP: {metadata['owasp']}"
        if metadata.get("references"):
            refs = metadata["references"]
            if isinstance(refs, list) and refs:
                recommendation = refs[0]

        # Code snippet
        code_snippet = extra.get("lines")

        return ReviewFinding(
            severity=severity,
            category=category,
            message=message,
            file_path=file_path,
            line_number=int(line_number) if line_number else None,
            column=int(column) if column else None,
            rule_id=f"semgrep/{check_id}" if check_id else None,
            tool=self.tool_name,
            recommendation=recommendation,
            code_snippet=code_snippet,
        )

    @staticmethod
    def _map_semgrep_severity(severity: str) -> IssueSeverity:
        """Map Semgrep severity to IssueSeverity."""
        severity_map = {
            "ERROR": IssueSeverity.HIGH,
            "WARNING": IssueSeverity.MEDIUM,
            "INFO": IssueSeverity.INFO,
            "EXPERIMENT": IssueSeverity.LOW,
            "INVENTORY": IssueSeverity.INFO,
        }
        return severity_map.get(severity.upper(), IssueSeverity.MEDIUM)

    @staticmethod
    def _category_from_check_id(check_id: str) -> str:
        """Derive category from check ID."""
        if not check_id:
            return "security"

        check_lower = check_id.lower()

        # Common patterns in Semgrep rule IDs
        if "sql" in check_lower:
            return "sql_injection"
        if "xss" in check_lower:
            return "xss"
        if "injection" in check_lower:
            return "injection"
        if "auth" in check_lower:
            return "authentication"
        if "crypto" in check_lower:
            return "cryptography"
        if "cookie" in check_lower or "session" in check_lower:
            return "session_management"
        if "path" in check_lower or "traversal" in check_lower:
            return "path_traversal"
        if "command" in check_lower or "exec" in check_lower:
            return "command_injection"
        if "deserial" in check_lower:
            return "deserialization"
        if "csrf" in check_lower:
            return "csrf"
        if "ssrf" in check_lower:
            return "ssrf"
        if "hardcoded" in check_lower or "secret" in check_lower:
            return "hardcoded_secrets"
        if "log" in check_lower:
            return "logging"
        if "error" in check_lower:
            return "error_handling"

        return "security"
