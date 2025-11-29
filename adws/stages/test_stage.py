"""
Test Stage - Runs tests in the worktree.

Can be skipped if no test files exist.
"""

import os
import glob

from stages.base_stage import BaseStage
from orchestrator.stage_interface import StageContext, StageResult


class TestStage(BaseStage):
    """Test stage that runs tests."""

    @property
    def name(self) -> str:
        return "test"

    @property
    def display_name(self) -> str:
        return "Testing"

    @property
    def dependencies(self) -> list[str]:
        return ["build"]

    def preconditions(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Test stage requires worktree to exist."""
        exists, error = self.check_worktree_exists(ctx)
        if not exists:
            return False, error
        return True, None

    def should_skip(self, ctx: StageContext) -> tuple[bool, str | None]:
        """Skip tests if no test files exist in worktree."""
        worktree_path = ctx.state.get("worktree_path")
        if not worktree_path:
            return False, None

        # Check for common test patterns
        test_patterns = [
            "**/*test*.py",
            "**/*spec*.py",
            "**/test_*.py",
            "**/*_test.py",
            "**/tests/**/*.py",
            "**/*.test.ts",
            "**/*.test.js",
            "**/*.spec.ts",
            "**/*.spec.js",
        ]

        for pattern in test_patterns:
            matches = glob.glob(os.path.join(worktree_path, pattern), recursive=True)
            if matches:
                return False, None  # Found tests, don't skip

        ctx.logger.info("No test files found in worktree, skipping test stage")
        return True, "No test files found in worktree"

    def execute(self, ctx: StageContext) -> StageResult:
        """Execute test phase by running adw_test_iso.py."""
        ctx.logger.info(f"Starting test stage for ADW {ctx.adw_id}")

        # Build args: <issue_number> <adw_id>
        args = [str(ctx.issue_number), ctx.adw_id]

        # Add skip-e2e if configured
        if ctx.config.get("skip_e2e", False):
            args.append("--skip-e2e")

        return self.run_script(ctx, "adw_test_iso.py", args)

    def on_failure(self, ctx: StageContext, error: Exception) -> None:
        """Test failures may be non-critical depending on config."""
        ctx.logger.warning(f"Test stage failed: {error}")
        # Tests often fail but we may want to continue
        # The orchestrator config determines if we continue
