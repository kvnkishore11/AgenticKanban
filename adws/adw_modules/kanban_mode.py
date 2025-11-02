"""Kanban mode detection and utilities for ADW workflows.

This module provides utilities to detect when ADW is operating in kanban-only mode
and handle conditional operations based on the data source.
"""

import os
import logging
from typing import Optional, Dict, Any, List
from adw_modules.state import ADWState


def is_kanban_mode(state: ADWState) -> bool:
    """Check if ADW is operating in kanban mode.

    Args:
        state: ADW state object

    Returns:
        True if operating in kanban mode, False otherwise
    """
    return state.get("data_source") == "kanban"


def is_git_available() -> bool:
    """Check if git is available and we're in a git repository.

    Returns:
        True if git is available and current directory is a git repo, False otherwise
    """
    try:
        import subprocess
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def get_issue_data_safe(state: ADWState, issue_number: str, repo_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get issue data safely, preferring kanban data when available.

    Args:
        state: ADW state object
        issue_number: GitHub issue number (fallback if kanban data unavailable)
        repo_path: Repository path (used for GitHub API calls if needed)

    Returns:
        Issue data dict or None if unavailable
    """
    logger = logging.getLogger(__name__)

    # First, try to get kanban data from state
    issue_json = state.get("issue_json")
    if issue_json:
        logger.info("Using kanban-provided issue data")
        return issue_json

    # If we're in kanban mode but don't have issue data, return None
    if is_kanban_mode(state):
        logger.warning("Kanban mode enabled but no issue_json provided")
        return None

    # Fall back to GitHub API if not in kanban mode
    logger.info("Falling back to GitHub API for issue data")
    try:
        from adw_modules.github import fetch_issue
        return fetch_issue(issue_number, repo_path)
    except Exception as e:
        logger.error(f"Failed to fetch issue from GitHub: {e}")
        return None


def git_operation_safe(operation_name: str, state: ADWState, operation_func, *args, **kwargs):
    """Execute a git operation safely, skipping if in kanban mode.

    Args:
        operation_name: Name of the operation (for logging)
        state: ADW state object
        operation_func: Function to call for the git operation
        *args, **kwargs: Arguments to pass to the operation function

    Returns:
        Result of operation_func if executed, None if skipped
    """
    logger = logging.getLogger(__name__)

    if is_kanban_mode(state):
        logger.info(f"Skipping git operation '{operation_name}' - kanban mode enabled")
        return None

    if not is_git_available():
        logger.warning(f"Skipping git operation '{operation_name}' - git not available")
        return None

    try:
        logger.info(f"Executing git operation: {operation_name}")
        return operation_func(*args, **kwargs)
    except Exception as e:
        logger.error(f"Git operation '{operation_name}' failed: {e}")
        if is_kanban_mode(state):
            logger.info("Continuing in kanban mode despite git operation failure")
            return None
        raise


def github_operation_safe(operation_name: str, state: ADWState, operation_func, *args, **kwargs):
    """Execute a GitHub operation safely, skipping if in kanban mode.

    Args:
        operation_name: Name of the operation (for logging)
        state: ADW state object
        operation_func: Function to call for the GitHub operation
        *args, **kwargs: Arguments to pass to the operation function

    Returns:
        Result of operation_func if executed, None if skipped
    """
    logger = logging.getLogger(__name__)

    if is_kanban_mode(state):
        logger.info(f"Skipping GitHub operation '{operation_name}' - kanban mode enabled")
        return None

    try:
        logger.info(f"Executing GitHub operation: {operation_name}")
        return operation_func(*args, **kwargs)
    except Exception as e:
        logger.error(f"GitHub operation '{operation_name}' failed: {e}")
        if is_kanban_mode(state):
            logger.info("Continuing in kanban mode despite GitHub operation failure")
            return None
        raise


def log_mode_status(state: ADWState, logger: Optional[logging.Logger] = None) -> None:
    """Log the current operation mode (kanban vs GitHub).

    Args:
        state: ADW state object
        logger: Optional logger instance
    """
    if logger is None:
        logger = logging.getLogger(__name__)

    data_source = state.get("data_source", "github")
    has_issue_json = bool(state.get("issue_json"))
    git_available = is_git_available()

    logger.info(f"ADW Operation Mode: {data_source}")
    if data_source == "kanban":
        logger.info(f"  - Issue data from kanban: {'✓' if has_issue_json else '✗'}")
        logger.info(f"  - Git operations: {'disabled' if data_source == 'kanban' else 'enabled'}")
        logger.info("  - GitHub operations: disabled")
    else:
        logger.info(f"  - Git available: {'✓' if git_available else '✗'}")
        logger.info("  - GitHub operations: enabled")


def format_image_to_markdown(image: Dict[str, Any]) -> str:
    """Convert an image object to markdown format compatible with Claude Code.

    Args:
        image: Image object with data and optional annotations

    Returns:
        Markdown formatted string for the image
    """
    logger = logging.getLogger(__name__)

    try:
        # Check if image has base64 data
        if "data" in image:
            # Extract mime type and data
            data = image["data"]
            mime_type = image.get("type", "image/png")

            # Handle data URLs
            if data.startswith("data:"):
                # Data is already in data URL format
                image_url = data
            else:
                # Assume it's raw base64 and construct data URL
                image_url = f"data:{mime_type};base64,{data}"

            # Generate markdown with alt text
            alt_text = image.get("name", "Image")
            markdown = f"![{alt_text}]({image_url})"

        elif "url" in image:
            # Image has a URL reference
            alt_text = image.get("name", "Image")
            markdown = f"![{alt_text}]({image['url']})"

        else:
            logger.warning("Image has no data or url field, skipping")
            return ""

        # Add annotation as a comment if present
        if "annotations" in image and image["annotations"]:
            annotations_text = "\n".join([
                f"<!-- Annotation: {ann} -->"
                for ann in image["annotations"]
                if ann.strip()
            ])
            if annotations_text:
                markdown = f"{markdown}\n{annotations_text}"

        return markdown

    except Exception as e:
        logger.error(f"Failed to format image to markdown: {e}")
        return ""


def format_body_with_images(body: str, images: List[Dict[str, Any]]) -> str:
    """Format the issue body with embedded images in markdown format.

    Args:
        body: Original issue body text
        images: List of image objects with data and annotations

    Returns:
        Body text with images embedded as markdown
    """
    logger = logging.getLogger(__name__)

    if not images:
        return body

    try:
        # Start with the original body
        formatted_body = body

        # Add a section for images
        formatted_body += "\n\n## Attached Images\n\n"

        # Convert each image to markdown
        for i, image in enumerate(images):
            markdown_image = format_image_to_markdown(image)
            if markdown_image:
                formatted_body += f"{markdown_image}\n\n"

        logger.info(f"Successfully formatted {len(images)} images in body")
        return formatted_body

    except Exception as e:
        logger.error(f"Failed to format body with images: {e}")
        return body  # Return original body on error


def extract_images_from_kanban_data(kanban_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract and validate images from kanban data.

    Args:
        kanban_data: Raw kanban data that may contain images

    Returns:
        List of validated image objects
    """
    logger = logging.getLogger(__name__)

    if not kanban_data or "images" not in kanban_data:
        return []

    images = kanban_data.get("images", [])
    if not isinstance(images, list):
        logger.warning("Images field is not a list, skipping")
        return []

    validated_images = []
    for image in images:
        if not isinstance(image, dict):
            logger.warning("Image is not a dictionary, skipping")
            continue

        # Ensure image has required fields
        if "data" not in image and "url" not in image:
            logger.warning("Image has no data or url field, skipping")
            continue

        validated_images.append(image)

    logger.info(f"Extracted {len(validated_images)} valid images from kanban data")
    return validated_images


def create_kanban_issue_from_data(issue_json: Dict[str, Any], issue_number: str) -> Dict[str, Any]:
    """Create a standardized issue object from kanban data.

    Args:
        issue_json: Raw kanban issue data
        issue_number: Issue number/ID

    Returns:
        Standardized issue object compatible with GitHub issue format
    """
    from datetime import datetime

    # Ensure we have basic required fields for GitHubIssue model
    standardized = {
        "number": issue_number,  # Keep as string for test compatibility
        "title": issue_json.get("title", f"Issue {issue_number}"),
        "body": issue_json.get("description", issue_json.get("body", "")),
        "state": "open",
        "author": {"login": "kanban-user"},  # Required field, was "user"
        "assignees": [],
        "labels": [],
        "milestone": None,
        "comments": [],
        "created_at": datetime.now(),  # Required field
        "updated_at": datetime.now(),  # Required field
        "closed_at": None,
        "url": f"#kanban-issue-{issue_number}",  # Required field, was "html_url"
        "kanban_source": True  # Flag to identify kanban-sourced issues
    }

    # Extract and format images if present
    if "images" in issue_json and issue_json["images"]:
        body_with_images = format_body_with_images(
            standardized["body"],
            issue_json["images"]
        )
        standardized["body"] = body_with_images
        # Store original images data for reference
        standardized["images"] = issue_json["images"]

    # Map additional fields if available
    if "labels" in issue_json:
        # Ensure labels have proper structure for GitHubLabel model
        labels = []
        for label in issue_json["labels"]:
            if isinstance(label, str):
                labels.append({"id": "1", "name": label, "color": "0e8a16", "description": None})
            elif isinstance(label, dict) and "name" in label:
                # Ensure required fields for GitHubLabel
                label_obj = {
                    "id": label.get("id", "1"),
                    "name": label["name"],
                    "color": label.get("color", "0e8a16"),
                    "description": label.get("description")
                }
                labels.append(label_obj)
        standardized["labels"] = labels

    # Handle work item type from kanban data
    if "workItemType" in issue_json:
        work_type = issue_json["workItemType"]
        type_label = {
            "id": "2",
            "name": f"type:{work_type}",
            "color": "0e8a16",
            "description": f"Type: {work_type}"
        }
        standardized["labels"].append(type_label)

    if "assignees" in issue_json:
        standardized["assignees"] = issue_json["assignees"]
    if "state" in issue_json:
        standardized["state"] = issue_json["state"]

    return standardized


def should_skip_worktree_operations(state: ADWState) -> bool:
    """Check if worktree operations should be skipped.

    Args:
        state: ADW state object

    Returns:
        True if worktree operations should be skipped
    """
    # Skip worktree operations only if git is not available
    # Kanban mode can still use worktrees for isolated environments
    return not is_git_available()


def get_kanban_output_path(state: ADWState, filename: str) -> str:
    """Get output path for kanban mode files.

    Args:
        state: ADW state object
        filename: Name of the output file

    Returns:
        Full path for the output file
    """
    adw_id = state.get("adw_id")
    if not adw_id:
        raise ValueError("ADW ID required for kanban output path")

    # Use agents directory for kanban output
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    output_dir = os.path.join(project_root, "agents", adw_id, "kanban_output")
    os.makedirs(output_dir, exist_ok=True)

    return os.path.join(output_dir, filename)


def create_fallback_issue(issue_number: str, kanban_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create a fallback GitHub-compatible issue object when no GitHub data is available.

    This function creates a minimal issue structure that's compatible with GitHubIssue model
    when GitHub API calls fail or when operating in pure kanban mode.

    Args:
        issue_number: Issue number or ID
        kanban_data: Optional kanban ticket data to populate fields

    Returns:
        GitHub-compatible issue object with fallback values
    """
    logger = logging.getLogger(__name__)
    from datetime import datetime

    # Base fallback issue structure with all required GitHubIssue fields
    fallback_issue = {
        "number": int(issue_number) if str(issue_number).isdigit() else 0,
        "title": f"Kanban Issue #{issue_number}",
        "body": "This issue was created from kanban data. Original GitHub issue not found.",
        "state": "open",
        "author": {"login": "kanban-system"},  # Required field
        "assignees": [],
        "labels": [],
        "milestone": None,
        "comments": [],
        "created_at": datetime.now(),  # Required field
        "updated_at": datetime.now(),  # Required field
        "closed_at": None,
        "url": f"#kanban-fallback-{issue_number}",  # Required field
        "kanban_source": True,
        "fallback": True  # Flag to indicate this is a fallback issue
    }

    # Populate from kanban data if available
    if kanban_data:
        # Map common kanban fields to GitHub issue format
        if "title" in kanban_data:
            fallback_issue["title"] = str(kanban_data["title"]).strip()

        if "description" in kanban_data:
            fallback_issue["body"] = str(kanban_data["description"]).strip()
        elif "body" in kanban_data:
            fallback_issue["body"] = str(kanban_data["body"]).strip()

        # Handle work item type
        if "workItemType" in kanban_data:
            work_type = kanban_data["workItemType"]
            fallback_issue["labels"] = [{"id": "1", "name": f"type:{work_type}", "color": "0e8a16", "description": f"Type: {work_type}"}]

        # Handle stage/status
        if "stage" in kanban_data:
            stage = kanban_data["stage"]
            if stage.lower() in ["done", "completed", "closed"]:
                fallback_issue["state"] = "closed"
            else:
                fallback_issue["state"] = "open"

        # Handle assignees if available
        if "assignees" in kanban_data and kanban_data["assignees"]:
            fallback_issue["assignees"] = [
                {"login": assignee} if isinstance(assignee, str) else assignee
                for assignee in kanban_data["assignees"]
            ]

        # Preserve additional kanban metadata
        if "metadata" in kanban_data:
            fallback_issue["kanban_metadata"] = kanban_data["metadata"]

        # Store original kanban data for reference
        fallback_issue["original_kanban_data"] = kanban_data

        logger.info(f"Created fallback issue from kanban data: {fallback_issue['title']}")
    else:
        logger.info(f"Created minimal fallback issue for #{issue_number}")

    return fallback_issue


def get_or_create_fallback_issue(issue_number: str, state: ADWState) -> Optional[Dict[str, Any]]:
    """Get issue data with fallback creation if no GitHub data available.

    This function combines the existing safe issue retrieval with fallback creation
    to ensure ADW workflows can proceed even without GitHub connectivity.

    Args:
        issue_number: GitHub issue number or kanban ticket ID
        state: ADW state object

    Returns:
        Issue data dict or None if all methods fail
    """
    logger = logging.getLogger(__name__)

    # First try the existing safe method
    issue_data = get_issue_data_safe(state, issue_number)
    if issue_data:
        return issue_data

    # If that fails, create a fallback using kanban data from state
    logger.warning(f"No issue data available for #{issue_number}, creating fallback")

    kanban_data = state.get("issue_json")
    fallback_issue = create_fallback_issue(issue_number, kanban_data)

    # Store the fallback issue in state for future use
    state.update(issue_json=fallback_issue)

    logger.info(f"Created and stored fallback issue for #{issue_number}")
    return fallback_issue