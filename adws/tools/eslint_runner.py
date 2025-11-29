"""ESLint Runner - JavaScript/TypeScript code quality and linting.

ESLint is the standard linting tool for JavaScript and TypeScript:
- Code quality issues
- Style enforcement
- Potential bugs

Installation:
    npm install -g eslint
    # or use npx eslint (built into npm)

Usage:
    npx eslint . --format json
"""

import json
import shutil
from tools.base_runner import BaseToolRunner
from stages.review_modes import ReviewMode, ReviewFinding, IssueSeverity
from schemas.review_config import ReviewToolConfig


class ESLintRunner(BaseToolRunner):
    """Runner for ESLint JavaScript/TypeScript linter."""

    def __init__(self, config: ReviewToolConfig | None = None):
        super().__init__(config)

    @property
    def tool_name(self) -> str:
        return "eslint"

    @property
    def mode(self) -> ReviewMode:
        return ReviewMode.CODE_QUALITY

    @property
    def command(self) -> str:
        return "npx"

    def is_available(self) -> bool:
        """Check if npx and eslint are available."""
        return shutil.which("npx") is not None

    def build_command(self, worktree_path: str) -> list[str]:
        """Build ESLint command."""
        cmd = [
            "npx",
            "eslint",
            worktree_path,
            "--format", "json",
            "--no-error-on-unmatched-pattern",  # Don't fail if no JS/TS files
        ]

        # Add extensions to check
        cmd.extend(["--ext", ".js,.jsx,.ts,.tsx,.vue,.mjs,.cjs"])

        # Add default ignore patterns
        default_ignores = [
            "**/node_modules/**",
            "**/dist/**",
            "**/build/**",
            "**/.next/**",
            "**/coverage/**",
        ]

        ignores = default_ignores + (self.config.exclude_paths or [])
        for pattern in ignores:
            cmd.extend(["--ignore-pattern", pattern])

        return cmd

    def parse_output(self, raw_output: str) -> list[ReviewFinding]:
        """Parse ESLint JSON output into findings."""
        findings = []

        if not raw_output.strip():
            return findings

        try:
            data = json.loads(raw_output)
        except json.JSONDecodeError:
            # ESLint may output errors before JSON
            import re
            json_match = re.search(r'\[[\s\S]*\]', raw_output)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    return findings
            else:
                return findings

        # ESLint outputs an array of file results
        for file_result in data:
            file_path = file_result.get("filePath")

            for message in file_result.get("messages", []):
                finding = self._parse_message(message, file_path)
                if finding:
                    findings.append(finding)

        return findings

    def _parse_message(self, message: dict, file_path: str) -> ReviewFinding | None:
        """Parse a single ESLint message."""
        if not message:
            return None

        # Severity: 1 = warning, 2 = error
        severity_num = message.get("severity", 1)
        severity = IssueSeverity.HIGH if severity_num == 2 else IssueSeverity.MEDIUM

        # Rule and message
        rule_id = message.get("ruleId", "")
        msg = message.get("message", "ESLint issue")

        # Category from rule
        category = self._category_from_rule(rule_id)

        # Location
        line = message.get("line")
        column = message.get("column")
        message.get("endLine")
        message.get("endColumn")

        # Code snippet (ESLint doesn't include this directly)
        code_snippet = None

        # Suggestion for fix
        fix = message.get("fix")
        suggestions = message.get("suggestions", [])

        recommendation = None
        if fix:
            recommendation = "Auto-fix available"
        elif suggestions:
            recommendation = f"Suggestions available: {len(suggestions)}"

        return ReviewFinding(
            severity=severity,
            category=category,
            message=msg,
            file_path=file_path,
            line_number=int(line) if line else None,
            column=int(column) if column else None,
            rule_id=f"eslint/{rule_id}" if rule_id else None,
            tool=self.tool_name,
            recommendation=recommendation,
            code_snippet=code_snippet,
        )

    @staticmethod
    def _category_from_rule(rule_id: str) -> str:
        """Derive category from ESLint rule ID."""
        if not rule_id:
            return "code_quality"

        rule_lower = rule_id.lower()

        # Common ESLint rule patterns
        if "unused" in rule_lower:
            return "unused_code"
        if "no-console" in rule_lower:
            return "debugging"
        if "prefer-const" in rule_lower or "no-var" in rule_lower:
            return "best_practices"
        if "indent" in rule_lower or "semi" in rule_lower or "quotes" in rule_lower:
            return "formatting"
        if "type" in rule_lower:
            return "typescript"
        if "react" in rule_lower:
            return "react"
        if "vue" in rule_lower:
            return "vue"
        if "import" in rule_lower:
            return "imports"
        if "security" in rule_lower or "eval" in rule_lower:
            return "security"
        if "complexity" in rule_lower:
            return "complexity"
        if "deprecated" in rule_lower:
            return "deprecated"

        return "code_quality"
