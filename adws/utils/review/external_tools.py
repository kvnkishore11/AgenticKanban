"""External tool review integration.

This module integrates the external review tools (Bearer, Semgrep, ESLint, Ruff)
into the existing review workflow. It runs alongside the AI-based review to provide
comprehensive code quality and security analysis.
"""

import sys
import os
import asyncio
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.review_v2 import ReviewOrchestrator
from schemas.review_config import ReviewConfig
from stages.review_modes import ComprehensiveReviewResult

from .types import ReviewInitContext, ReviewSpecContext


def load_review_config_from_metadata(init_ctx: ReviewInitContext) -> ReviewConfig:
    """Load review configuration from task metadata.

    Args:
        init_ctx: Review initialization context

    Returns:
        ReviewConfig instance
    """
    # Default config - comprehensive review
    config = ReviewConfig()

    # Check for task-level configuration
    state = init_ctx.state or {}
    issue_json = state.get("issue_json", {})
    metadata = issue_json.get("metadata", {})

    # Check for review configuration in metadata
    review_config_data = metadata.get("review_config", {})
    if review_config_data:
        try:
            config = ReviewConfig.from_dict(review_config_data)
            init_ctx.logger.info(f"Loaded review config from metadata: {config.modes}")
        except Exception as e:
            init_ctx.logger.warning(f"Failed to parse review config from metadata: {e}")

    # Check for skip_review flag
    if metadata.get("skip_review", False):
        config.skip_review = True
        init_ctx.logger.info("Review skip requested via metadata")

    return config


async def run_external_tools_review(
    init_ctx: ReviewInitContext,
    spec_ctx: ReviewSpecContext,
    config: Optional[ReviewConfig] = None,
) -> ComprehensiveReviewResult:
    """Run external code quality and security tools.

    This runs Bearer, Semgrep, ESLint, and Ruff in parallel to analyze the
    codebase for security vulnerabilities and code quality issues.

    Args:
        init_ctx: Review initialization context
        spec_ctx: Spec file context
        config: Optional review configuration (loaded from metadata if not provided)

    Returns:
        ComprehensiveReviewResult from external tools
    """
    # Load config from metadata if not provided
    if config is None:
        config = load_review_config_from_metadata(init_ctx)

    # Skip if configured
    if config.skip_review:
        init_ctx.logger.info("External tools review skipped per configuration")
        return ComprehensiveReviewResult(
            review_id=f"{init_ctx.adw_id}-skipped",
            adw_id=init_ctx.adw_id,
            success=True,
            modes_executed=[],
            mode_results=[],
        )

    # Create orchestrator
    orchestrator = ReviewOrchestrator(
        adw_id=init_ctx.adw_id,
        worktree_path=spec_ctx.worktree_path,
        config=config,
        logger=init_ctx.logger,
        output_dir=os.path.join(spec_ctx.worktree_path, "..", "review_results"),
    )

    # Execute the review
    init_ctx.logger.info("Starting external tools review...")
    result = await orchestrator.execute()

    init_ctx.logger.info(f"External tools review completed: {result.summary}")

    return result


def run_external_tools_review_sync(
    init_ctx: ReviewInitContext,
    spec_ctx: ReviewSpecContext,
    config: Optional[ReviewConfig] = None,
) -> ComprehensiveReviewResult:
    """Synchronous wrapper for run_external_tools_review.

    Args:
        init_ctx: Review initialization context
        spec_ctx: Spec file context
        config: Optional review configuration

    Returns:
        ComprehensiveReviewResult from external tools
    """
    return asyncio.run(run_external_tools_review(init_ctx, spec_ctx, config))


def format_external_review_comment(result: ComprehensiveReviewResult) -> str:
    """Format external review results as a GitHub comment.

    Args:
        result: ComprehensiveReviewResult

    Returns:
        Formatted markdown string
    """
    lines = [
        "## External Tools Review Results",
        "",
        f"**Status:** {'PASSED' if result.success else 'FAILED'}",
        f"**Duration:** {result.total_duration_ms}ms",
        "",
        "### Summary",
        "",
        result.summary,
        "",
    ]

    # Add finding counts
    counts = result.total_finding_counts
    if sum(counts.values()) > 0:
        lines.extend([
            "### Finding Counts",
            "",
            "| Severity | Count |",
            "|----------|-------|",
        ])
        for severity in ["critical", "high", "medium", "low", "info"]:
            count = counts.get(severity, 0)
            if count > 0:
                emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢", "info": "ℹ️"}.get(severity, "")
                lines.append(f"| {emoji} {severity.capitalize()} | {count} |")
        lines.append("")

    # Add top findings (limited for comment size)
    if result.all_findings:
        lines.extend([
            "### Top Findings",
            "",
        ])

        # Show top 10 most severe findings
        sorted_findings = sorted(
            result.all_findings,
            key=lambda f: ["critical", "high", "medium", "low", "info"].index(f.severity.value)
        )[:10]

        for f in sorted_findings:
            emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢", "info": "ℹ️"}.get(f.severity.value, "")
            location = f"`{f.file_path}:{f.line_number}`" if f.file_path and f.line_number else ""
            lines.append(f"- {emoji} **{f.tool}/{f.category}**: {f.message}")
            if location:
                lines.append(f"  - {location}")

        if len(result.all_findings) > 10:
            lines.append(f"\n*...and {len(result.all_findings) - 10} more findings*")

    # Add error if present
    if result.error:
        lines.extend([
            "",
            "### Error",
            "",
            f"```\n{result.error}\n```",
        ])

    return "\n".join(lines)


def should_fail_review(result: ComprehensiveReviewResult) -> tuple[bool, str]:
    """Determine if the review should fail based on findings.

    Args:
        result: ComprehensiveReviewResult

    Returns:
        Tuple of (should_fail, reason)
    """
    if result.has_blockers:
        critical = result.total_finding_counts.get("critical", 0)
        high = result.total_finding_counts.get("high", 0)
        return True, f"Review found {critical} critical and {high} high severity issues"

    return False, ""
