"""
Base Stage - Common utilities for stage implementations.

Provides subprocess execution and common patterns used by all stages.
"""

import os
import subprocess
import time
from typing import List, Optional

from orchestrator.stage_interface import Stage, StageContext, StageResult, StageStatus


class BaseStage(Stage):
    """Base class with common utilities for stages.

    Stages inherit from this to get subprocess execution
    and common error handling.
    """

    def get_script_path(self, script_name: str) -> str:
        """Get absolute path to an ADW script.

        Args:
            script_name: Name of the script (e.g., 'adw_plan_iso.py')

        Returns:
            Absolute path to the script
        """
        adws_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(adws_dir, script_name)

    def get_repo_root(self) -> str:
        """Get the repository root directory."""
        adws_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.dirname(adws_dir)

    def run_script(
        self,
        ctx: StageContext,
        script_name: str,
        args: List[str],
        cwd: Optional[str] = None,
    ) -> StageResult:
        """Run an ADW script as a subprocess.

        Args:
            ctx: Stage execution context
            script_name: Name of the script to run
            args: Arguments to pass to the script
            cwd: Working directory (defaults to repo root)

        Returns:
            StageResult with success/failure status
        """
        script_path = self.get_script_path(script_name)
        cmd = ["uv", "run", script_path] + args

        ctx.logger.info(f"Running: {' '.join(cmd)}")

        start_time = time.time()

        try:
            result = subprocess.run(
                cmd,
                cwd=cwd or self.get_repo_root(),
                capture_output=True,
                text=True,
            )

            duration_ms = int((time.time() - start_time) * 1000)

            if result.returncode == 0:
                ctx.logger.info(f"Script completed successfully in {duration_ms}ms")
                return StageResult(
                    status=StageStatus.COMPLETED,
                    message=f"{self.display_name} completed successfully",
                    duration_ms=duration_ms,
                )
            else:
                error_msg = result.stderr or result.stdout or "Unknown error"
                ctx.logger.error(f"Script failed: {error_msg}")
                return StageResult(
                    status=StageStatus.FAILED,
                    message=f"{self.display_name} failed",
                    error=error_msg[:500],  # Truncate long errors
                    duration_ms=duration_ms,
                )

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            ctx.logger.error(f"Exception running script: {e}")
            return StageResult(
                status=StageStatus.FAILED,
                message=f"Exception in {self.display_name}",
                error=str(e),
                duration_ms=duration_ms,
            )

    def check_worktree_exists(self, ctx: StageContext) -> tuple[bool, Optional[str]]:
        """Check if worktree exists for this ADW.

        Returns:
            Tuple of (exists, error_message)
        """
        worktree_path = ctx.state.get("worktree_path")
        if not worktree_path:
            return False, "No worktree path in state"

        if not os.path.exists(worktree_path):
            return False, f"Worktree path does not exist: {worktree_path}"

        return True, None

    def check_plan_exists(self, ctx: StageContext) -> tuple[bool, Optional[str]]:
        """Check if plan file exists for this ADW.

        Returns:
            Tuple of (exists, error_message)
        """
        plan_file = ctx.state.get("plan_file")
        if not plan_file:
            return False, "No plan file in state"

        # Plan file is stored as relative path - resolve relative to worktree
        worktree_path = ctx.state.get("worktree_path")
        if worktree_path and not os.path.isabs(plan_file):
            full_plan_path = os.path.join(worktree_path, plan_file)
        else:
            full_plan_path = plan_file

        if not os.path.exists(full_plan_path):
            return False, f"Plan file does not exist: {plan_file}"

        return True, None
