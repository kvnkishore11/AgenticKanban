"""Bearer CLI Runner - Security and privacy vulnerability scanning.

Bearer is an open-source SAST tool that scans code for:
- Security vulnerabilities (OWASP Top 10)
- Sensitive data exposure
- Privacy compliance issues

Installation:
    curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh | sh

Usage:
    bearer scan . --format json
"""

import json
from tools.base_runner import BaseToolRunner
from stages.review_modes import ReviewMode, ReviewFinding
from schemas.review_config import ReviewToolConfig


class BearerRunner(BaseToolRunner):
    """Runner for Bearer CLI security scanner."""

    def __init__(self, config: ReviewToolConfig | None = None):
        super().__init__(config)

    @property
    def tool_name(self) -> str:
        return "bearer"

    @property
    def mode(self) -> ReviewMode:
        return ReviewMode.SECURITY

    @property
    def command(self) -> str:
        return "bearer"

    def build_command(self, worktree_path: str) -> list[str]:
        """Build Bearer scan command."""
        cmd = [
            "bearer",
            "scan",
            worktree_path,
            "--format", "json",
            "--quiet",  # Reduce noise in output
        ]

        # Add custom rules if configured
        if self.config.custom_rules:
            for rule in self.config.custom_rules:
                cmd.extend(["--only-rule", rule])

        return cmd

    def parse_output(self, raw_output: str) -> list[ReviewFinding]:
        """Parse Bearer JSON output into findings."""
        findings = []

        if not raw_output.strip():
            return findings

        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError:
            # Try to find JSON in output (Bearer sometimes has preamble text)
            import re
            json_match = re.search(r'\{[\s\S]*\}', raw_output)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    return findings
            else:
                return findings

        # Bearer outputs findings under different keys
        for finding_data in data.get("findings", []):
            finding = self._parse_finding(finding_data)
            if finding:
                findings.append(finding)

        # Also check for "high", "medium", etc. keys
        for severity in ["critical", "high", "medium", "low", "warning"]:
            for finding_data in data.get(severity, []):
                finding = self._parse_finding(finding_data, severity)
                if finding:
                    findings.append(finding)

        return findings

    def _parse_finding(
        self,
        finding_data: dict,
        default_severity: str = "medium"
    ) -> ReviewFinding | None:
        """Parse a single Bearer finding."""
        if not finding_data:
            return None

        # Extract severity
        severity_str = finding_data.get("severity", default_severity)
        severity = self.map_severity(severity_str)

        # Extract location
        source = finding_data.get("source", {})
        location = source.get("location", {}) or finding_data.get("location", {})

        file_path = (
            location.get("file") or
            source.get("filename") or
            finding_data.get("filename")
        )

        line_number = (
            location.get("start", {}).get("line") or
            location.get("line") or
            finding_data.get("line_number")
        )

        column = location.get("start", {}).get("column")

        # Extract message and category
        rule_id = finding_data.get("rule_id") or finding_data.get("id", "")
        category = finding_data.get("category") or self._category_from_rule(rule_id)
        message = (
            finding_data.get("title") or
            finding_data.get("description") or
            finding_data.get("message", "Security finding")
        )

        # Extract recommendation
        recommendation = (
            finding_data.get("remediation") or
            finding_data.get("recommendation") or
            finding_data.get("documentation_url")
        )

        # Code snippet
        code_snippet = finding_data.get("code_extract") or source.get("content")

        return ReviewFinding(
            severity=severity,
            category=category,
            message=message,
            file_path=file_path,
            line_number=int(line_number) if line_number else None,
            column=int(column) if column else None,
            rule_id=f"bearer/{rule_id}" if rule_id else None,
            tool=self.tool_name,
            recommendation=recommendation,
            code_snippet=code_snippet,
        )

    @staticmethod
    def _category_from_rule(rule_id: str) -> str:
        """Derive category from rule ID."""
        if not rule_id:
            return "security"

        rule_lower = rule_id.lower()

        if "sql" in rule_lower:
            return "sql_injection"
        if "xss" in rule_lower:
            return "xss"
        if "crypto" in rule_lower or "cipher" in rule_lower:
            return "weak_cryptography"
        if "auth" in rule_lower:
            return "authentication"
        if "session" in rule_lower:
            return "session_management"
        if "path" in rule_lower or "traversal" in rule_lower:
            return "path_traversal"
        if "inject" in rule_lower:
            return "injection"
        if "sensitive" in rule_lower or "data" in rule_lower or "leak" in rule_lower:
            return "data_exposure"
        if "config" in rule_lower:
            return "misconfiguration"

        return "security"
