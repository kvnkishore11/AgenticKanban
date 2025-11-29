"""Documentation generation utilities for document workflow."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.data_types import AgentTemplateRequest
from adw_modules.agent import execute_template
from adw_modules.workflow_ops import format_issue_message
from adw_modules.github import make_issue_comment

from .types import DocumentInitContext, DocumentSpecContext, DocumentResultContext


# Agent name constant
AGENT_DOCUMENTER = "documenter"


def generate_documentation(
    ctx: DocumentInitContext,
    spec_ctx: DocumentSpecContext
) -> DocumentResultContext:
    """Generate documentation using the /document command.

    Args:
        ctx: Document initialization context
        spec_ctx: Spec file context

    Returns:
        DocumentResultContext with generation results

    Raises:
        SystemExit: If documentation generation fails
    """
    ctx.logger.info("Generating documentation")
    make_issue_comment(
        ctx.issue_number,
        format_issue_message(
            ctx.adw_id,
            AGENT_DOCUMENTER,
            "📝 Generating documentation in isolated environment...",
        ),
    )

    request = AgentTemplateRequest(
        agent_name=AGENT_DOCUMENTER,
        slash_command="/document",
        args=[spec_ctx.spec_file],
        adw_id=ctx.adw_id,
        working_dir=ctx.worktree_path,
    )

    ctx.logger.debug(
        f"documentation_request: {request.model_dump_json(indent=2, by_alias=True)}"
    )

    response = execute_template(request)

    ctx.logger.debug(
        f"documentation_response: {response.model_dump_json(indent=2, by_alias=True)}"
    )

    if not response.success:
        ctx.logger.error(f"Documentation generation failed: {response.output}")
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(
                ctx.adw_id,
                AGENT_DOCUMENTER,
                f"❌ Documentation generation failed: {response.output}",
            ),
        )
        sys.exit(1)

    # Parse the agent response - it should return the path to the documentation file created
    doc_file_path = response.output.strip()

    # Check if the agent actually created documentation
    if doc_file_path and doc_file_path != "No documentation needed":
        # Agent created documentation - validate the path exists
        full_path = os.path.join(ctx.worktree_path, doc_file_path)
        if os.path.exists(full_path):
            ctx.logger.info(f"Documentation created at: {doc_file_path}")
            make_issue_comment(
                ctx.issue_number,
                format_issue_message(
                    ctx.adw_id,
                    AGENT_DOCUMENTER,
                    f"✅ Documentation generated successfully\n📁 Location: {doc_file_path}",
                ),
            )
            return DocumentResultContext(
                success=True,
                documentation_created=True,
                documentation_path=doc_file_path,
                error_message=None,
            )
        else:
            ctx.logger.warning(
                f"Agent reported doc file {doc_file_path} but file not found"
            )
            return DocumentResultContext(
                success=True,
                documentation_created=False,
                documentation_path=None,
                error_message=f"Reported file {doc_file_path} not found",
            )
    else:
        # Agent determined no documentation was needed
        ctx.logger.info("Agent determined no documentation changes were needed")
        make_issue_comment(
            ctx.issue_number,
            format_issue_message(
                ctx.adw_id, AGENT_DOCUMENTER, "ℹ️ No documentation changes were needed"
            ),
        )
        return DocumentResultContext(
            success=True,
            documentation_created=False,
            documentation_path=None,
            error_message=None,
        )
