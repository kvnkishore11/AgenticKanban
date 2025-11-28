"""
Build Stage - Implements the plan in the worktree.

Requires plan stage to have completed first.
"""

from stages.base_stage import BaseStage
from orchestrator.stage_interface import StageContext, StageResult, StageStatus


class BuildStage(BaseStage):
    """Build stage that implements the plan."""

    @property
    def name(self) -> str:
        return "build"

    @property
    def display_name(self) -> str:
        return "Building"

    @property
    def dependencies(self) -> list[str]:
        return ["plan"]

    def preconditions(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Build stage requires worktree and plan to exist."""
        # Check worktree exists
        exists, error = self.check_worktree_exists(ctx)
        if not exists:
            return False, error

        # Check plan exists
        exists, error = self.check_plan_exists(ctx)
        if not exists:
            return False, error

        return True, None

    def execute(self, ctx: StageContext) -> StageResult:
        """Execute build phase by running adw_build_iso.py."""
        ctx.logger.info(f"Starting build stage for ADW {ctx.adw_id}")

        # Notify stage transition
        if ctx.notifier:
            ctx.notifier.notify_stage_transition(
                workflow_name="orchestrator",
                from_stage="plan",
                to_stage="build",
                message=f"Building implementation for ADW {ctx.adw_id}"
            )

        # Build args: <issue_number> <adw_id>
        args = [str(ctx.issue_number), ctx.adw_id]

        return self.run_script(ctx, "adw_build_iso.py", args)
