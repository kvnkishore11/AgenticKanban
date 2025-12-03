"""
Clarify Stage - Analyzes task descriptions and generates structured understanding.

This stage runs the clarification workflow to ensure AI understanding matches user intent.
"""

from orchestrator.stage_interface import StageContext, StageResult, StageStatus
from stages.base_stage import BaseStage


class ClarifyStage(BaseStage):
    """
    Stage that analyzes task descriptions for clarification.

    Preconditions:
    - Task description must exist in state (issue_json.body or similar)

    Execution:
    - Runs adw_clarify_iso.py to analyze the task
    - Returns structured understanding

    Post-conditions:
    - Sets clarification_result in state
    - Waits for user approval before allowing workflow to proceed
    """

    @property
    def name(self) -> str:
        """Stage identifier."""
        return "clarify"

    @property
    def display_name(self) -> str:
        """Human-readable stage name."""
        return "Clarify"

    def can_execute(self, ctx: StageContext) -> tuple[bool, str]:
        """
        Check if clarification can be executed.

        Args:
            ctx: Stage execution context

        Returns:
            Tuple of (can_execute, reason)
        """
        # Check for task description
        issue_json = ctx.state.get("issue_json")
        if not issue_json:
            return False, "No issue data in state"

        task_description = issue_json.get("body", "")
        if not task_description or not task_description.strip():
            return False, "Task description is empty"

        return True, "Ready to clarify"

    def execute(self, ctx: StageContext) -> StageResult:
        """
        Execute the clarification stage.

        Args:
            ctx: Stage execution context

        Returns:
            StageResult with clarification results
        """
        ctx.logger.info("Starting clarification stage")

        # Get task description from issue data
        issue_json = ctx.state.get("issue_json", {})
        task_description = issue_json.get("body", "")

        # Check if there's user feedback from a previous attempt
        user_feedback = ctx.state.get("clarification_feedback")

        # Build arguments for clarify script
        args = [ctx.adw_id, task_description]
        if user_feedback:
            args.append(user_feedback)

        # Add model preference if specified in config
        if ctx.config and 'model' in ctx.config:
            model = ctx.config['model']
            ctx.logger.info(f"Using model preference: {model}")
            args.append(f"--model={model}")

        # Run the clarify script
        result = self.run_script(
            ctx,
            script_name="adw_clarify_iso.py",
            args=args,
        )

        # If successful, the clarification result will be in state
        # (saved by the script itself)
        if result.status == StageStatus.COMPLETED:
            ctx.logger.info("Clarification completed - waiting for user approval")
            result.message = "Task clarification completed. Awaiting user approval."

        return result
