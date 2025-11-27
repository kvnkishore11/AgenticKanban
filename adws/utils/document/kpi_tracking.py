"""KPI tracking utilities for document workflow."""

import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.data_types import AgentTemplateRequest, GitHubIssue, GitHubUser
from adw_modules.agent import execute_template
from adw_modules.workflow_ops import format_issue_message, create_commit
from adw_modules.github import make_issue_comment

from .types import DocumentInitContext


def track_kpis(ctx: DocumentInitContext) -> None:
    """Track agentic KPIs - never fails the main workflow.

    Args:
        ctx: Document initialization context
    """
    try:
        ctx.logger.info("Tracking agentic KPIs...")
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(ctx.adw_id, "ops", "📊 Updating agentic KPIs"),
        )

        # Execute the track_agentic_kpis prompt
        kpi_request = AgentTemplateRequest(
            agent_name="kpi_tracker",
            slash_command="/track_agentic_kpis",
            args=[json.dumps(ctx.state.data, indent=2)],
            adw_id=ctx.adw_id,
            working_dir=ctx.worktree_path,
        )

        try:
            kpi_response = execute_template(kpi_request)

            if kpi_response.success:
                ctx.logger.info("Successfully updated agentic KPIs")

                # Commit the KPI changes
                try:
                    commit_msg, error = create_commit(
                        "kpi_tracker",
                        GitHubIssue(
                            number=int(ctx.issue_number),
                            title="Update agentic KPIs",
                            body="Tracking ADW performance metrics",
                            state="open",
                            author=GitHubUser(login="system"),
                            created_at=datetime.now(),
                            updated_at=datetime.now(),
                            url="",
                        ),
                        "/chore",
                        ctx.adw_id,
                        ctx.logger,
                        ctx.worktree_path,
                    )
                    if commit_msg and not error:
                        ctx.logger.info(f"Committed KPI update: {commit_msg}")
                        make_issue_comment(
                            ctx.issue_number,
                            format_issue_message(
                                ctx.adw_id, "kpi_tracker", "✅ Agentic KPIs updated"
                            ),
                        )
                    elif error:
                        ctx.logger.warning(f"Failed to create KPI commit: {error}")
                except Exception as e:
                    ctx.logger.warning(f"Failed to commit KPI update: {e}")
            else:
                ctx.logger.warning("Failed to update agentic KPIs - continuing anyway")
                make_issue_comment(
                    ctx.issue_number,
                    format_issue_message(
                        ctx.adw_id,
                        "kpi_tracker",
                        "⚠️ Failed to update agentic KPIs - continuing anyway",
                    ),
                )
        except Exception as e:
            ctx.logger.warning(f"Error executing KPI template: {e}")
            make_issue_comment(
                ctx.issue_number,
                format_issue_message(
                    ctx.adw_id,
                    "kpi_tracker",
                    "⚠️ Error tracking agentic KPIs - continuing anyway",
                ),
            )
    except Exception as outer_e:
        # Catch-all to ensure we never fail the main workflow
        ctx.logger.warning(f"Unexpected error in track_kpis: {outer_e}")
        try:
            make_issue_comment(
                ctx.issue_number,
                format_issue_message(
                    ctx.adw_id,
                    "kpi_tracker",
                    "⚠️ Top level error tracking agentic KPIs - continuing anyway",
                ),
            )
        except Exception:
            # Even comment posting failed - just log and continue
            pass
