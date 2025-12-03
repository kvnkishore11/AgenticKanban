"""
Plan Stage - Creates worktree and generates implementation plan.

This is the entry-point stage that sets up the isolated environment.
"""

from stages.base_stage import BaseStage
from orchestrator.stage_interface import StageContext, StageResult


class PlanStage(BaseStage):
    """Planning stage that creates worktree and generates plan."""

    @property
    def name(self) -> str:
        return "plan"

    @property
    def display_name(self) -> str:
        return "Planning"

    def preconditions(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Plan stage can always run - it creates the worktree."""
        # Check issue number is present
        if not ctx.issue_number:
            return False, "Issue number is required for planning"
        return True, None

    def execute(self, ctx: StageContext) -> StageResult:
        """Execute planning phase by running adw_plan_iso.py."""
        ctx.logger.info(f"Starting plan stage for issue {ctx.issue_number}")

        # Build args: <issue_number> <adw_id> [model]
        args = [str(ctx.issue_number), ctx.adw_id]

        # Add model preference if specified in config
        if ctx.config and 'model' in ctx.config:
            model = ctx.config['model']
            ctx.logger.info(f"Using model preference: {model}")
            args.append(f"--model={model}")

        return self.run_script(ctx, "adw_plan_iso.py", args)
