"""
Review Stage - Comprehensive code quality and security review.

Review is NEVER skipped by default. Only skip when explicitly configured via:
1. Task metadata: skip_review: true
2. Orchestrator config: skip_review: true

Supports multiple review modes:
- UI validation (Playwright-based visual verification)
- Code quality (ESLint, Ruff)
- Security (Bearer CLI, Semgrep)
- Documentation review
- Comprehensive (all of the above)
"""

from stages.base_stage import BaseStage
from orchestrator.stage_interface import StageContext, StageResult


class ReviewStage(BaseStage):
    """Review stage that validates implementation with comprehensive quality checks."""

    @property
    def name(self) -> str:
        return "review"

    @property
    def display_name(self) -> str:
        return "Reviewing"

    @property
    def dependencies(self) -> list[str]:
        return ["build"]  # Can run after build, test is optional

    def preconditions(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Review stage requires worktree to exist."""
        exists, error = self.check_worktree_exists(ctx)
        if not exists:
            return False, error
        return True, None

    def should_skip(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Only skip if explicitly configured via task metadata or orchestrator config.

        Review is NEVER automatically skipped based on issue type (chore, patch, etc.).
        This ensures all changes receive quality and security review.

        To skip review, explicitly set skip_review: true in:
        1. Task metadata (issue_json.metadata.skip_review)
        2. Orchestrator config (ctx.config.skip_review)
        """
        # Check for explicit skip flag in task metadata
        issue_json = ctx.state.get("issue_json", {})
        # Defensive: ensure issue_json is a dict (mocks might return non-dict values)
        if isinstance(issue_json, dict):
            metadata = issue_json.get("metadata", {})
            skip_review = metadata.get("skip_review", False) if isinstance(metadata, dict) else False
        else:
            skip_review = False

        if skip_review:
            ctx.logger.info("Review explicitly skipped via task metadata (skip_review: true)")
            return True, "Review skipped per task configuration"

        # Check for skip in orchestrator config
        if ctx.config.get("skip_review", False):
            ctx.logger.info("Review skipped via orchestrator config (skip_review: true)")
            return True, "Review skipped per workflow configuration"

        # Log that review will run (helpful for debugging)
        issue_class = ctx.state.get("issue_class", "unknown")
        ctx.logger.info(f"Review will run for issue_class={issue_class} (review is never auto-skipped)")

        return False, None

    def execute(self, ctx: StageContext) -> StageResult:
        """Execute review phase by running adw_review_iso.py."""
        ctx.logger.info(f"Starting review stage for ADW {ctx.adw_id}")

        # Build args: <issue_number> <adw_id>
        args = [str(ctx.issue_number), ctx.adw_id]

        # Add skip-resolution if configured
        if ctx.config.get("skip_resolution", False):
            args.append("--skip-resolution")

        # Add model preference if specified in config
        if ctx.config and 'model' in ctx.config:
            model = ctx.config['model']
            ctx.logger.info(f"Using model preference: {model}")
            args.append(f"--model={model}")

        return self.run_script(ctx, "adw_review_iso.py", args)
