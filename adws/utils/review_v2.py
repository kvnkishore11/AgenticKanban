"""
Review Orchestrator V2 - Multi-mode review execution with external tools.

This orchestrator coordinates multiple review modes:
- Security scanning (Bearer, Semgrep)
- Code quality (ESLint, Ruff)
- UI validation (Playwright)
- AI review (Claude)

It runs tools in parallel where possible and aggregates results.
"""

import asyncio
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path

from stages.review_modes import (
    ReviewMode,
    ReviewModeResult,
    ComprehensiveReviewResult,
    ReviewFinding,
    IssueSeverity,
    resolve_modes,
    get_modes_for_comprehensive,
)
from schemas.review_config import ReviewConfig, ReviewToolConfig
from tools.bearer_runner import BearerRunner
from tools.semgrep_runner import SemgrepRunner
from tools.eslint_runner import ESLintRunner
from tools.ruff_runner import RuffRunner


class ReviewOrchestrator:
    """Orchestrates multi-mode review execution.

    Usage:
        config = ReviewConfig(modes=["comprehensive"])
        orchestrator = ReviewOrchestrator(
            adw_id="97fa3852",
            worktree_path="/path/to/worktree",
            config=config,
            logger=logger,
        )
        result = await orchestrator.execute()
    """

    def __init__(
        self,
        adw_id: str,
        worktree_path: str,
        config: ReviewConfig | None = None,
        logger: logging.Logger | None = None,
        output_dir: str | None = None,
    ):
        self.adw_id = adw_id
        self.worktree_path = worktree_path
        self.config = config or ReviewConfig()
        self.logger = logger or logging.getLogger(__name__)
        self.output_dir = output_dir or str(Path(worktree_path).parent / "review_results")

        # Ensure output directory exists
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)

        # Initialize runners
        self._init_runners()

    def _init_runners(self):
        """Initialize tool runners based on configuration."""
        self.runners = {}

        # Security tools
        bearer_config = self.config.tools.get("bearer", ReviewToolConfig())
        if bearer_config.enabled:
            self.runners["bearer"] = BearerRunner(bearer_config)

        semgrep_config = self.config.tools.get("semgrep", ReviewToolConfig())
        if semgrep_config.enabled:
            self.runners["semgrep"] = SemgrepRunner(semgrep_config)

        # Code quality tools
        eslint_config = self.config.tools.get("eslint", ReviewToolConfig())
        if eslint_config.enabled:
            self.runners["eslint"] = ESLintRunner(eslint_config)

        ruff_config = self.config.tools.get("ruff", ReviewToolConfig())
        if ruff_config.enabled:
            self.runners["ruff"] = RuffRunner(ruff_config)

    async def execute(self) -> ComprehensiveReviewResult:
        """Execute all configured review modes.

        Returns:
            ComprehensiveReviewResult with all findings
        """
        review_id = f"{self.adw_id}-review-{uuid.uuid4().hex[:8]}"
        started_at = datetime.now()

        self.logger.info(f"Starting review {review_id} for ADW {self.adw_id}")
        self.logger.info(f"Configured modes: {self.config.modes}")

        # Resolve modes to execute
        modes_to_run = resolve_modes(self.config.modes)
        self.logger.info(f"Resolved modes: {[m.value for m in modes_to_run]}")

        # Results collection
        mode_results: list[ReviewModeResult] = []

        # 1. Run external tools in parallel
        tool_results = await self._run_external_tools(modes_to_run)
        mode_results.extend(tool_results)

        # 2. Run AI review if enabled (not in parallel - uses API)
        if self.config.ai_review.enabled and ReviewMode.COMPREHENSIVE in modes_to_run:
            self.logger.info("AI review enabled but not implemented in this version")
            # TODO: Implement AI review integration

        # 3. Run UI validation if applicable
        if (
            self.config.ui_validation.enabled and
            ReviewMode.UI_VALIDATION in modes_to_run
        ):
            self.logger.info("UI validation enabled but not implemented in this version")
            # TODO: Implement UI validation integration

        completed_at = datetime.now()
        duration_ms = int((completed_at - started_at).total_seconds() * 1000)

        # Create comprehensive result
        result = ComprehensiveReviewResult(
            review_id=review_id,
            adw_id=self.adw_id,
            success=all(r.success for r in mode_results) if mode_results else True,
            modes_executed=modes_to_run,
            mode_results=mode_results,
            total_duration_ms=duration_ms,
            started_at=started_at,
            completed_at=completed_at,
        )

        # Log summary
        self.logger.info(f"Review completed: {result.summary}")
        self.logger.info(f"Total findings: {result.total_finding_counts}")

        # Check failure conditions
        should_fail, failure_reason = self._check_failure_conditions(result)
        if should_fail:
            result.success = False
            result.error = failure_reason
            self.logger.warning(f"Review failed: {failure_reason}")

        # Save results
        if self.config.generate_report:
            await self._save_results(result)

        return result

    async def _run_external_tools(
        self,
        modes: list[ReviewMode],
    ) -> list[ReviewModeResult]:
        """Run external tools in parallel.

        Args:
            modes: List of review modes to run

        Returns:
            List of ReviewModeResult from all tools
        """
        tasks = []

        # Determine which runners to use based on modes
        runners_to_run = []

        if ReviewMode.SECURITY in modes or ReviewMode.COMPREHENSIVE in modes:
            if "bearer" in self.runners:
                runners_to_run.append(self.runners["bearer"])
            if "semgrep" in self.runners:
                runners_to_run.append(self.runners["semgrep"])

        if ReviewMode.CODE_QUALITY in modes or ReviewMode.COMPREHENSIVE in modes:
            if "eslint" in self.runners:
                runners_to_run.append(self.runners["eslint"])
            if "ruff" in self.runners:
                runners_to_run.append(self.runners["ruff"])

        # Check availability and create tasks
        for runner in runners_to_run:
            if runner.is_available():
                self.logger.info(f"Running {runner.tool_name}...")
                tasks.append(runner.execute(self.worktree_path))
            else:
                self.logger.warning(f"{runner.tool_name} is not available, skipping")
                # Add a "not available" result
                tasks.append(self._not_available_result(runner))

        if not tasks:
            self.logger.warning("No external tools available to run")
            return []

        # Run all tools in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"Tool error: {result}")
                processed_results.append(ReviewModeResult(
                    mode=runners_to_run[i].mode if i < len(runners_to_run) else ReviewMode.CODE_QUALITY,
                    success=False,
                    tool_name=runners_to_run[i].tool_name if i < len(runners_to_run) else "unknown",
                    error=str(result),
                ))
            else:
                processed_results.append(result)

        return processed_results

    async def _not_available_result(self, runner) -> ReviewModeResult:
        """Create a result for unavailable tool."""
        return ReviewModeResult(
            mode=runner.mode,
            success=False,
            tool_name=runner.tool_name,
            error=f"{runner.tool_name} is not installed",
            duration_ms=0,
        )

    def _check_failure_conditions(
        self,
        result: ComprehensiveReviewResult,
    ) -> tuple[bool, str | None]:
        """Check if review should fail based on configuration.

        Returns:
            Tuple of (should_fail, reason)
        """
        counts = result.total_finding_counts

        # Check critical issues
        if self.config.fail_on_critical and counts.get("critical", 0) > 0:
            return True, f"Found {counts['critical']} critical issues"

        # Check high severity
        if self.config.fail_on_high and counts.get("high", 0) > 0:
            return True, f"Found {counts['high']} high severity issues"

        # Check security critical
        if self.config.fail_on_security_critical:
            security_critical = sum(
                1 for f in result.all_findings
                if f.severity == IssueSeverity.CRITICAL and
                f.tool in ["bearer", "semgrep"]
            )
            if security_critical > 0:
                return True, f"Found {security_critical} critical security issues"

        # Check max issues
        total_issues = sum(counts.values())
        if total_issues > self.config.max_issues_before_fail:
            return True, f"Total issues ({total_issues}) exceeds maximum ({self.config.max_issues_before_fail})"

        return False, None

    async def _save_results(self, result: ComprehensiveReviewResult):
        """Save review results to file."""
        output_path = Path(self.output_dir) / f"review_{result.review_id}.json"

        try:
            with open(output_path, "w") as f:
                json.dump(result.to_dict(), f, indent=2, default=str)
            self.logger.info(f"Review results saved to {output_path}")
        except Exception as e:
            self.logger.error(f"Failed to save review results: {e}")

        # Also save markdown report if configured
        if self.config.report_format in ["markdown", "both"]:
            md_path = Path(self.output_dir) / f"review_{result.review_id}.md"
            try:
                md_content = self._generate_markdown_report(result)
                with open(md_path, "w") as f:
                    f.write(md_content)
                self.logger.info(f"Markdown report saved to {md_path}")
            except Exception as e:
                self.logger.error(f"Failed to save markdown report: {e}")

    def _generate_markdown_report(self, result: ComprehensiveReviewResult) -> str:
        """Generate a markdown report from review results."""
        lines = [
            f"# Review Report - {result.review_id}",
            "",
            f"**ADW ID:** {result.adw_id}",
            f"**Status:** {'PASSED' if result.success else 'FAILED'}",
            f"**Duration:** {result.total_duration_ms}ms",
            f"**Completed:** {result.completed_at.isoformat() if result.completed_at else 'N/A'}",
            "",
            "## Summary",
            "",
            result.summary,
            "",
            "### Finding Counts",
            "",
            "| Severity | Count |",
            "|----------|-------|",
        ]

        for severity, count in result.total_finding_counts.items():
            lines.append(f"| {severity.capitalize()} | {count} |")

        lines.extend([
            "",
            "## Detailed Findings",
            "",
        ])

        # Group findings by tool
        findings_by_tool: dict[str, list[ReviewFinding]] = {}
        for finding in result.all_findings:
            tool = finding.tool or "unknown"
            if tool not in findings_by_tool:
                findings_by_tool[tool] = []
            findings_by_tool[tool].append(finding)

        for tool, findings in sorted(findings_by_tool.items()):
            lines.extend([
                f"### {tool.capitalize()}",
                "",
            ])

            if not findings:
                lines.append("No findings.")
            else:
                for f in findings[:50]:  # Limit to 50 per tool
                    severity_emoji = {
                        "critical": "🔴",
                        "high": "🟠",
                        "medium": "🟡",
                        "low": "🟢",
                        "info": "ℹ️",
                    }.get(f.severity.value, "❓")

                    location = ""
                    if f.file_path:
                        location = f"`{f.file_path}"
                        if f.line_number:
                            location += f":{f.line_number}"
                        location += "`"

                    lines.append(f"- {severity_emoji} **{f.category}**: {f.message}")
                    if location:
                        lines.append(f"  - Location: {location}")
                    if f.recommendation:
                        lines.append(f"  - Recommendation: {f.recommendation}")

                if len(findings) > 50:
                    lines.append(f"  - ... and {len(findings) - 50} more findings")

            lines.append("")

        if result.error:
            lines.extend([
                "## Error",
                "",
                f"```\n{result.error}\n```",
                "",
            ])

        return "\n".join(lines)


async def run_review(
    adw_id: str,
    worktree_path: str,
    config: ReviewConfig | None = None,
    logger: logging.Logger | None = None,
) -> ComprehensiveReviewResult:
    """Convenience function to run a review.

    Args:
        adw_id: The ADW identifier
        worktree_path: Path to the worktree to review
        config: Optional review configuration
        logger: Optional logger

    Returns:
        ComprehensiveReviewResult
    """
    orchestrator = ReviewOrchestrator(
        adw_id=adw_id,
        worktree_path=worktree_path,
        config=config,
        logger=logger,
    )
    return await orchestrator.execute()
