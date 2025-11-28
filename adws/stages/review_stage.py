"""
Review Stage - Reviews implementation against spec.

Can be skipped for patch/chore issue types.
"""

from stages.base_stage import BaseStage
from orchestrator.stage_interface import StageContext, StageResult, StageStatus


class ReviewStage(BaseStage):
    """Review stage that validates implementation."""

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
        """Skip review for patches and chores."""
        issue_class = ctx.state.get("issue_class")

        if issue_class == "/patch":
            ctx.logger.info("Skipping review for patch issue")
            return True, "Patches don't require review"

        if issue_class == "/chore":
            ctx.logger.info("Skipping review for chore issue")
            return True, "Chores don't require review"

        return False, None

    def execute(self, ctx: StageContext) -> StageResult:
        """Execute review phase by running adw_review_iso.py."""
        ctx.logger.info(f"Starting review stage for ADW {ctx.adw_id}")

        # Build args: <issue_number> <adw_id>
        args = [str(ctx.issue_number), ctx.adw_id]

        # Add skip-resolution if configured
        if ctx.config.get("skip_resolution", False):
            args.append("--skip-resolution")

        return self.run_script(ctx, "adw_review_iso.py", args)
