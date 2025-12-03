"""
Merge Stage - Merges worktree changes to main branch.

This is the final stage that completes the workflow.
"""

from stages.base_stage import BaseStage
from orchestrator.stage_interface import StageContext, StageResult


class MergeStage(BaseStage):
    """Merge stage that merges changes to main."""

    @property
    def name(self) -> str:
        return "merge"

    @property
    def display_name(self) -> str:
        return "Merging"

    @property
    def dependencies(self) -> list[str]:
        return ["build"]  # Minimum requirement is build

    def preconditions(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Merge stage requires worktree and branch to exist."""
        exists, error = self.check_worktree_exists(ctx)
        if not exists:
            return False, error

        # Check branch name exists
        branch_name = ctx.state.get("branch_name")
        if not branch_name:
            return False, "No branch name in state"

        return True, None

    def execute(self, ctx: StageContext) -> StageResult:
        """Execute merge phase by running adw_merge_iso.py."""
        ctx.logger.info(f"Starting merge stage for ADW {ctx.adw_id}")

        # Merge script takes: <adw_id> [model]
        args = [ctx.adw_id]

        # Add model preference if specified in config
        if ctx.config and 'model' in ctx.config:
            model = ctx.config['model']
            ctx.logger.info(f"Using model preference: {model}")
            args.append(f"--model={model}")

        return self.run_script(ctx, "adw_merge_iso.py", args)
