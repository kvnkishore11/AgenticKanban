"""Patch content extraction from multiple sources (GitHub and Kanban).

This module provides a unified interface for extracting patch request content
from both GitHub issues/comments and Kanban task data, allowing ADW patch
workflows to operate independently of the data source.
"""

import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime

from adw_modules.data_types import GitHubIssue
from adw_modules.state import ADWState
from adw_modules.kanban_mode import (
    is_kanban_mode,
    format_body_with_images,
    extract_images_from_kanban_data,
)


class PatchContentResult:
    """Result of patch content extraction."""

    def __init__(
        self,
        content: Optional[str] = None,
        source_type: str = "unknown",
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.content = content
        self.source_type = source_type  # 'github_comment', 'github_issue', 'kanban_task'
        self.timestamp = timestamp or datetime.now()
        self.metadata = metadata or {}

    def is_valid(self) -> bool:
        """Check if the result contains valid patch content."""
        return self.content is not None and len(self.content.strip()) > 0


def extract_patch_content_from_github(
    issue: GitHubIssue,
    logger: logging.Logger,
) -> PatchContentResult:
    """Extract patch content from GitHub issue comments or body.

    Searches for 'adw_patch' keyword in:
    1. Latest comment containing the keyword (highest priority)
    2. Issue body containing the keyword

    Args:
        issue: GitHub issue object
        logger: Logger instance

    Returns:
        PatchContentResult with extracted content or None
    """
    from adw_modules.github import find_keyword_from_comment

    # First, check for the latest comment containing 'adw_patch'
    keyword_comment = find_keyword_from_comment("adw_patch", issue)

    if keyword_comment:
        logger.info(
            f"Found 'adw_patch' in comment (created at {keyword_comment.created_at})"
        )
        return PatchContentResult(
            content=keyword_comment.body,
            source_type="github_comment",
            timestamp=keyword_comment.created_at,
            metadata={
                "comment_id": keyword_comment.id,
                "author": keyword_comment.author.get("login", "unknown"),
            },
        )

    # Check if 'adw_patch' is in the issue body
    if "adw_patch" in issue.body:
        logger.info("Found 'adw_patch' in issue body")
        content = f"Issue #{issue.number}: {issue.title}\n\n{issue.body}"
        return PatchContentResult(
            content=content,
            source_type="github_issue",
            timestamp=issue.updated_at,
            metadata={
                "issue_number": issue.number,
                "author": issue.author.get("login", "unknown"),
            },
        )

    # No 'adw_patch' keyword found
    logger.warning("No 'adw_patch' keyword found in GitHub issue or comments")
    return PatchContentResult()


def extract_patch_content_from_kanban(
    state: ADWState,
    logger: logging.Logger,
) -> PatchContentResult:
    """Extract patch content from kanban task data.

    In kanban mode, patch content is derived from task metadata without
    requiring the 'adw_patch' keyword. The content includes:
    - Task title
    - Task description
    - Attached images (formatted as markdown)

    Args:
        state: ADW state containing kanban task data in issue_json
        logger: Logger instance

    Returns:
        PatchContentResult with formatted kanban task content
    """
    issue_json = state.get("issue_json")

    if not issue_json:
        logger.warning("No kanban task data (issue_json) found in state")
        return PatchContentResult()

    # Check if there's a specific patch request field
    if "patch_request" in issue_json:
        logger.info("Found explicit patch_request in kanban data")
        return PatchContentResult(
            content=issue_json["patch_request"],
            source_type="kanban_task",
            metadata={"explicit_patch_request": True},
        )

    # Otherwise, format the kanban task data as a patch request
    try:
        # Extract basic fields
        title = issue_json.get("title", "Kanban Task")
        description = issue_json.get("description", issue_json.get("body", ""))

        # Build patch request content
        patch_content_parts = []

        # Add title
        patch_content_parts.append(f"# {title}\n")

        # Add description
        if description:
            patch_content_parts.append(f"## Description\n{description}\n")

        # Add images if present
        images = extract_images_from_kanban_data(issue_json)
        if images:
            formatted_body = format_body_with_images("", images)
            if formatted_body:
                patch_content_parts.append(formatted_body)

        # Add work item type if present
        if "workItemType" in issue_json:
            work_type = issue_json["workItemType"]
            patch_content_parts.append(f"\n**Work Item Type**: {work_type}\n")

        # Add any additional context from metadata
        if "patch_reason" in issue_json:
            patch_content_parts.append(
                f"\n**Patch Reason**: {issue_json['patch_reason']}\n"
            )

        patch_content = "\n".join(patch_content_parts)

        logger.info("Formatted kanban task data as patch request")
        return PatchContentResult(
            content=patch_content,
            source_type="kanban_task",
            metadata={
                "task_id": issue_json.get("id"),
                "work_type": issue_json.get("workItemType"),
                "has_images": len(images) > 0,
            },
        )

    except Exception as e:
        logger.error(f"Failed to extract patch content from kanban data: {e}")
        return PatchContentResult()


def get_patch_content(
    state: ADWState,
    issue: Optional[GitHubIssue],
    logger: logging.Logger,
) -> Tuple[Optional[str], str, Optional[str]]:
    """Unified patch content extraction supporting both GitHub and Kanban modes.

    This function automatically detects the operation mode (GitHub vs Kanban)
    and routes to the appropriate extraction function.

    Args:
        state: ADW state object
        issue: Optional GitHub issue object (required for GitHub mode)
        logger: Logger instance

    Returns:
        Tuple of (patch_content, source_description, error_message)
        - patch_content: The extracted patch request content
        - source_description: Human-readable description of the source
        - error_message: Error message if extraction failed, None otherwise
    """
    # Detect mode
    in_kanban_mode = is_kanban_mode(state)

    if in_kanban_mode:
        logger.info("Operating in kanban mode - extracting patch content from task data")
        result = extract_patch_content_from_kanban(state, logger)

        if result.is_valid():
            source_desc = f"Kanban task (extracted at {result.timestamp.isoformat()})"
            return result.content, source_desc, None
        else:
            error_msg = (
                "No patch content found in kanban task data. "
                "Ensure the task has a description or explicit patch_request field."
            )
            return None, "", error_msg

    else:
        logger.info("Operating in GitHub mode - searching for 'adw_patch' keyword")

        if not issue:
            error_msg = "GitHub mode requires a valid issue object"
            return None, "", error_msg

        result = extract_patch_content_from_github(issue, logger)

        if result.is_valid():
            if result.source_type == "github_comment":
                source_desc = f"GitHub comment by {result.metadata.get('author', 'unknown')}"
            else:
                source_desc = f"GitHub issue #{result.metadata.get('issue_number', '?')}"
            return result.content, source_desc, None
        else:
            error_msg = (
                "No 'adw_patch' keyword found in GitHub issue body or comments. "
                "Add 'adw_patch' to an issue comment or the issue body to trigger patch workflow."
            )
            return None, "", error_msg


def format_patch_request_from_kanban(
    title: str,
    description: str,
    images: Optional[list] = None,
    work_type: Optional[str] = None,
    patch_reason: Optional[str] = None,
) -> str:
    """Format a patch request from kanban task components.

    This is a utility function for creating well-formatted patch requests
    when components are provided separately (e.g., from UI forms).

    Args:
        title: Task title
        description: Task description
        images: Optional list of image data
        work_type: Optional work item type
        patch_reason: Optional reason for the patch

    Returns:
        Formatted patch request string
    """
    parts = []

    # Title
    parts.append(f"# {title}\n")

    # Description
    if description:
        parts.append(f"## Description\n{description}\n")

    # Images
    if images:
        formatted_images = format_body_with_images("", images)
        if formatted_images:
            parts.append(formatted_images)

    # Work type
    if work_type:
        parts.append(f"\n**Work Item Type**: {work_type}\n")

    # Patch reason
    if patch_reason:
        parts.append(f"\n**Patch Reason**: {patch_reason}\n")

    return "\n".join(parts)
