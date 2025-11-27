"""Review execution utilities."""

import sys
import os
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import logging
from adw_modules.data_types import AgentTemplateRequest, ReviewResult
from adw_modules.agent import execute_template
from adw_modules.utils import parse_json
from adw_modules.github import make_issue_comment
from adw_modules.workflow_ops import format_issue_message

from .types import ReviewInitContext, ReviewSpecContext, ReviewExecutionContext

# Agent name constants
AGENT_REVIEWER = "reviewer"

# Maximum number of review retry attempts after resolution
MAX_REVIEW_RETRY_ATTEMPTS = 3


def run_review(
    spec_file: str,
    adw_id: str,
    logger: logging.Logger,
    working_dir: Optional[str] = None,
) -> ReviewResult:
    """Run the review using the /review command.

    Args:
        spec_file: Path to specification file
        adw_id: ADW workflow ID
        logger: Logger instance
        working_dir: Working directory for review execution

    Returns:
        ReviewResult with review summary, issues, and screenshots
    """
    request = AgentTemplateRequest(
        agent_name=AGENT_REVIEWER,
        slash_command="/review",
        args=[adw_id, spec_file, AGENT_REVIEWER],
        adw_id=adw_id,
        working_dir=working_dir,
    )

    logger.debug(f"review_request: {request.model_dump_json(indent=2, by_alias=True)}")

    response = execute_template(request)

    logger.debug(f"review_response: {response.model_dump_json(indent=2, by_alias=True)}")

    if not response.success:
        logger.error(f"Review failed: {response.output}")
        # Return a failed result
        return ReviewResult(
            success=False,
            review_summary=f"Review failed: {response.output}",
            review_issues=[],
            screenshots=[],
            screenshot_urls=[],
        )

    # Parse the review result
    try:
        result = parse_json(response.output, ReviewResult)
        return result
    except Exception as e:
        logger.error(f"Error parsing review result: {e}")
        return ReviewResult(
            success=False,
            review_summary=f"Error parsing review result: {e}",
            review_issues=[],
            screenshots=[],
            screenshot_urls=[],
        )


def execute_review_with_retry(
    init_ctx: ReviewInitContext,
    spec_ctx: ReviewSpecContext
) -> ReviewExecutionContext:
    """Execute review with retry logic for blocker resolution.

    Args:
        init_ctx: Review initialization context
        spec_ctx: Spec file context

    Returns:
        ReviewExecutionContext with final review result
    """
    from .resolution import resolve_blocker_issues

    review_attempt = 0
    review_result = None

    while review_attempt < MAX_REVIEW_RETRY_ATTEMPTS:
        review_attempt += 1

        # Run the review (executing in worktree)
        init_ctx.logger.info(f"Running review (attempt {review_attempt}/{MAX_REVIEW_RETRY_ATTEMPTS})")
        make_issue_comment(
            init_ctx.issue_number,
            format_issue_message(
                init_ctx.adw_id,
                AGENT_REVIEWER,
                f"🔍 Reviewing implementation against spec (attempt {review_attempt}/{MAX_REVIEW_RETRY_ATTEMPTS})..."
            )
        )

        review_result = run_review(
            spec_ctx.spec_file,
            init_ctx.adw_id,
            init_ctx.logger,
            working_dir=spec_ctx.worktree_path
        )

        # Check if we have blocker issues
        blocker_issues = [
            issue for issue in review_result.review_issues
            if issue.issue_severity == "blocker"
        ]

        # If no blockers or skip resolution, we're done
        if not blocker_issues or init_ctx.skip_resolution:
            break

        # If this is the last attempt, don't resolve (just report the blockers)
        if review_attempt >= MAX_REVIEW_RETRY_ATTEMPTS:
            break

        # We have blockers and need to resolve them
        resolve_blocker_issues(
            blocker_issues,
            init_ctx.issue_number,
            init_ctx.adw_id,
            spec_ctx.worktree_path,
            init_ctx.logger
        )

        # We'll retry the review
        init_ctx.logger.info("Retrying review after resolving blockers")
        make_issue_comment(
            init_ctx.issue_number,
            format_issue_message(
                init_ctx.adw_id,
                AGENT_REVIEWER,
                "🔄 Retrying review after resolving blockers..."
            )
        )

    blocker_count = len([
        issue for issue in review_result.review_issues
        if issue.issue_severity == "blocker"
    ]) if review_result else 0

    return ReviewExecutionContext(
        review_result=review_result,
        blocker_count=blocker_count,
        attempt_number=review_attempt
    )
