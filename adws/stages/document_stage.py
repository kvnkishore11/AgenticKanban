"""
Document Stage - Generates documentation for the implementation.

Can be skipped if no code changes were made.
"""

import subprocess

from stages.base_stage import BaseStage
from orchestrator.stage_interface import StageContext, StageResult


class DocumentStage(BaseStage):
    """Document stage that generates documentation."""

    @property
    def name(self) -> str:
        return "document"

    @property
    def display_name(self) -> str:
        return "Documenting"

    @property
    def dependencies(self) -> list[str]:
        return ["build"]  # Can run after build

    def preconditions(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Document stage requires worktree to exist."""
        exists, error = self.check_worktree_exists(ctx)
        if not exists:
            return False, error
        return True, None

    def should_skip(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Skip documentation if no code changes detected."""
        worktree_path = ctx.state.get("worktree_path")
        if not worktree_path:
            return False, None

        try:
            # Check if there are any changes in the worktree
            result = subprocess.run(
                ["git", "diff", "--stat", "HEAD~1"],
                cwd=worktree_path,
                capture_output=True,
                text=True,
            )

            if not result.stdout.strip():
                ctx.logger.info("No code changes detected, skipping documentation")
                return True, "No code changes to document"

        except Exception as e:
            ctx.logger.debug(f"Could not check for changes: {e}")

        return False, None

    def execute(self, ctx: StageContext) -> StageResult:
        """Execute document phase by running adw_document_iso.py."""
        ctx.logger.info(f"Starting document stage for ADW {ctx.adw_id}")

        # Build args: <issue_number> <adw_id> [model]
        args = [str(ctx.issue_number), ctx.adw_id]

        # Add model preference if specified in config
        if ctx.config and 'model' in ctx.config:
            model = ctx.config['model']
            ctx.logger.info(f"Using model preference: {model}")
            args.append(f"--model={model}")

        return self.run_script(ctx, "adw_document_iso.py", args)
