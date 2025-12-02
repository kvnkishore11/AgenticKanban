"""Shared AI Developer Workflow (ADW) operations."""

import glob
import json
import logging
import os
import subprocess
import re
from typing import Tuple, Optional
from adw_modules.data_types import (
    AgentTemplateRequest,
    GitHubIssue,
    AgentPromptResponse,
    IssueClassSlashCommand,
    ADWExtractionResult,
)
from adw_modules.agent import execute_template
from adw_modules.github import ADW_BOT_IDENTIFIER
from adw_modules.state import ADWState
from adw_modules.utils import parse_json
from adw_modules.kanban_mode import is_kanban_mode, get_kanban_output_path


# Branch name pattern: <type>-issue-<number>-adw-<id>-<concise-name>
# Valid types: feat, feature, bug, chore, test, fix, refactor, docs, style, perf, ci
# ADW ID is alphanumeric (hex or any alphanumeric), concise name is lowercase with hyphens
BRANCH_NAME_PATTERN = re.compile(
    r'^(feat|feature|bug|chore|test|fix|refactor|docs|style|perf|ci)-issue-\d+-adw-[a-z0-9]+-[a-z0-9-]+$'
)

# Fallback pattern to extract branch name from LLM output that may contain reasoning
BRANCH_NAME_EXTRACTION_PATTERN = re.compile(
    r'((?:feat|feature|bug|chore|test|fix|refactor|docs|style|perf|ci)-issue-\d+-adw-[a-z0-9]+-[a-z0-9-]+)'
)


def validate_branch_name(branch_name: str) -> bool:
    """Validate that a branch name follows the expected format.

    Args:
        branch_name: The branch name to validate

    Returns:
        True if valid, False otherwise
    """
    if not branch_name:
        return False
    # Check basic format
    if BRANCH_NAME_PATTERN.match(branch_name):
        return True
    # Also check git's basic rules: no spaces, no special chars except -, /, _
    if ' ' in branch_name or '\n' in branch_name or len(branch_name) > 255:
        return False
    return False


def extract_branch_name_from_output(output: str, logger: logging.Logger) -> Optional[str]:
    """Extract a valid branch name from LLM output that may contain reasoning.

    LLMs sometimes include thinking/reasoning before outputting the final answer.
    This function extracts the actual branch name from such output.

    Args:
        output: The raw LLM output
        logger: Logger instance

    Returns:
        Extracted branch name or None if not found
    """
    if not output:
        return None

    # First, try the output as-is (ideal case: LLM followed instructions)
    cleaned = output.strip()
    if validate_branch_name(cleaned):
        return cleaned

    # If output contains newlines or is too long, it likely has reasoning
    # Try to extract the branch name using regex
    match = BRANCH_NAME_EXTRACTION_PATTERN.search(output)
    if match:
        extracted = match.group(1)
        logger.warning(
            f"LLM output contained extra text. Extracted branch name: {extracted}"
        )
        return extracted

    # Last resort: check each line
    for line in output.strip().split('\n'):
        line = line.strip()
        if validate_branch_name(line):
            logger.warning(
                f"Found branch name on separate line: {line}"
            )
            return line

    logger.error(
        f"Could not extract valid branch name from output. "
        f"Output preview: {output[:200]}..."
    )
    return None


def generate_fallback_branch_name(
    issue_number: int,
    adw_id: str,
    issue_type: str,
    logger: logging.Logger
) -> str:
    """Generate a deterministic fallback branch name when LLM fails.

    This ensures the workflow can continue even if LLM branch name generation fails.

    Args:
        issue_number: The issue number
        adw_id: ADW identifier
        issue_type: Issue type (feature, bug, chore, etc.)
        logger: Logger instance

    Returns:
        A valid branch name in format: <type>-issue-<number>-adw-<id>-auto
    """
    # Normalize type to valid prefix
    type_map = {
        "feature": "feat",
        "/feature": "feat",
        "/bug": "bug",
        "/chore": "chore",
        "/fix": "fix",
        "/test": "test",
        "/refactor": "refactor",
        "/docs": "docs",
    }
    branch_type = type_map.get(issue_type.lower(), issue_type.lower().replace("/", ""))

    # Ensure type is valid, default to 'feat' if not
    valid_types = {"feat", "feature", "bug", "chore", "test", "fix", "refactor", "docs", "style", "perf", "ci"}
    if branch_type not in valid_types:
        branch_type = "feat"

    fallback_name = f"{branch_type}-issue-{issue_number}-adw-{adw_id}-auto"
    logger.warning(f"Using fallback branch name: {fallback_name}")
    return fallback_name


def save_workflow_output_for_kanban(
    state: ADWState,
    filename: str,
    content: str,
    logger: logging.Logger,
    description: str = "workflow output"
) -> bool:
    """Save workflow output to kanban-friendly location when in kanban mode.

    Args:
        state: ADW state object
        filename: Name of output file
        content: Content to save
        logger: Logger instance
        description: Description of what's being saved

    Returns:
        True if saved successfully or not in kanban mode, False on error
    """
    if not is_kanban_mode(state):
        return True  # Not in kanban mode, nothing to do

    try:
        output_file = get_kanban_output_path(state, filename)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info(f"Saved {description} to kanban output: {output_file}")
        return True
    except Exception as e:
        logger.warning(f"Failed to save {description} to kanban output: {e}")
        return False


def create_github_issue_from_kanban_data(issue_json: dict, issue_number: str) -> GitHubIssue:
    """Create a GitHubIssue object from Kanban-provided issue data.

    This function converts Kanban issue data to GitHubIssue format, handling
    differences in field names and structures between Kanban and GitHub.
    """
    from datetime import datetime
    from adw_modules.data_types import GitHubUser, GitHubLabel
    from adw_modules.kanban_mode import format_body_with_images

    # Extract basic fields with fallbacks
    title = issue_json.get("title") or issue_json.get("summary") or f"Issue {issue_number}"
    body = issue_json.get("body") or issue_json.get("description") or ""

    # Format body with images if present
    if "images" in issue_json and issue_json["images"]:
        body = format_body_with_images(body, issue_json["images"])

    # Create default GitHubUser for author
    default_author = GitHubUser(
        login="kanban-user",
        id="0",
        name="Kanban User"
    )

    # Convert string labels to GitHubLabel objects
    labels = []
    label_data = issue_json.get("labels", [])
    if isinstance(label_data, list):
        for i, label in enumerate(label_data):
            if isinstance(label, str):
                labels.append(GitHubLabel(
                    id=str(i),
                    name=label,
                    color="ffffff",  # Default white color
                    description=f"Label from Kanban: {label}"
                ))
            elif isinstance(label, dict):
                labels.append(GitHubLabel(
                    id=label.get("id", str(i)),
                    name=label.get("name", "unknown"),
                    color=label.get("color", "ffffff"),
                    description=label.get("description", "")
                ))

    # Parse datetime fields
    created_at_str = issue_json.get("created_at") or issue_json.get("createdAt") or "2024-01-01T00:00:00Z"
    updated_at_str = issue_json.get("updated_at") or issue_json.get("updatedAt") or "2024-01-01T00:00:00Z"

    # Convert to datetime objects
    try:
        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        created_at = datetime.fromisoformat("2024-01-01T00:00:00+00:00")

    try:
        updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        updated_at = datetime.fromisoformat("2024-01-01T00:00:00+00:00")

    # Create minimal GitHubIssue object with required fields
    github_issue_data = {
        "number": int(issue_number) if issue_number.isdigit() else 0,
        "title": title,
        "body": body,
        "state": "open",  # Default state for Kanban issues
        "author": default_author,
        "url": f"https://github.com/unknown/kanban-issue-{issue_number}",  # Placeholder URL
        "labels": labels,
        "assignees": [],
        "created_at": created_at,
        "updated_at": updated_at,
    }

    return GitHubIssue(**github_issue_data)


# Agent name constants
AGENT_PLANNER = "sdlc_planner"
AGENT_IMPLEMENTOR = "sdlc_implementor"
AGENT_CLASSIFIER = "issue_classifier"
AGENT_BRANCH_GENERATOR = "branch_generator"
AGENT_PR_CREATOR = "pr_creator"

# Available ADW workflows for runtime validation
AVAILABLE_ADW_WORKFLOWS = [
    # Isolated workflows (all workflows are now iso-based)
    "adw_plan_iso",
    "adw_patch_iso",
    "adw_build_iso",
    "adw_test_iso",
    "adw_review_iso",
    "adw_document_iso",
    "adw_ship_iso",
    "adw_merge_iso",  # Merge workflow for merging ADW worktree to main
    "adw_sdlc_ZTE_iso",  # Zero Touch Execution workflow
    "adw_plan_build_iso",
    "adw_plan_build_test_iso",
    "adw_plan_build_test_review_iso",
    "adw_plan_build_document_iso",
    "adw_plan_build_review_iso",
    "adw_sdlc_iso",
    # Orchestrator-based dynamic multi-stage workflow
    "adw_orchestrator",
]


def format_issue_message(
    adw_id: str, agent_name: str, message: str, session_id: Optional[str] = None
) -> str:
    """Format a message for issue comments with ADW tracking and bot identifier."""
    # Always include ADW_BOT_IDENTIFIER to prevent webhook loops
    if session_id:
        return f"{ADW_BOT_IDENTIFIER} {adw_id}_{agent_name}_{session_id}: {message}"
    return f"{ADW_BOT_IDENTIFIER} {adw_id}_{agent_name}: {message}"


def extract_adw_info(text: str, temp_adw_id: str) -> ADWExtractionResult:
    """Extract ADW workflow, ID, and model_set from text using classify_adw agent.
    Returns ADWExtractionResult with workflow_command, adw_id, and model_set."""

    # Use classify_adw to extract structured info
    request = AgentTemplateRequest(
        agent_name="adw_classifier",
        slash_command="/classify_adw",
        args=[text],
        adw_id=temp_adw_id,
    )

    try:
        response = execute_template(request)  # No logger available in this function

        if not response.success:
            print(f"Failed to classify ADW: {response.output}")
            return ADWExtractionResult()  # Empty result

        # Parse JSON response using utility that handles markdown
        try:
            data = parse_json(response.output, dict)
            adw_command = data.get("adw_slash_command", "").replace(
                "/", ""
            )  # Remove slash
            adw_id = data.get("adw_id")
            model_set = data.get("model_set", "base")  # Default to "base"

            # Validate command
            if adw_command and adw_command in AVAILABLE_ADW_WORKFLOWS:
                return ADWExtractionResult(
                    workflow_command=adw_command,
                    adw_id=adw_id,
                    model_set=model_set
                )

            return ADWExtractionResult()  # Empty result

        except ValueError as e:
            print(f"Failed to parse classify_adw response: {e}")
            return ADWExtractionResult()  # Empty result

    except Exception as e:
        print(f"Error calling classify_adw: {e}")
        return ADWExtractionResult()  # Empty result


def classify_issue(
    issue: GitHubIssue, adw_id: str, logger: logging.Logger
) -> Tuple[Optional[IssueClassSlashCommand], Optional[str]]:
    """Classify GitHub issue and return appropriate slash command.
    Returns (command, error_message) tuple."""

    # Use the classify_issue slash command template with minimal payload
    # Only include the essential fields: number, title, body
    minimal_issue_json = issue.model_dump_json(
        by_alias=True, include={"number", "title", "body"}
    )

    request = AgentTemplateRequest(
        agent_name=AGENT_CLASSIFIER,
        slash_command="/classify_issue",
        args=[minimal_issue_json],
        adw_id=adw_id,
    )

    logger.debug(f"Classifying issue: {issue.title}")

    response = execute_template(request)

    logger.debug(
        f"Classification response: {response.model_dump_json(indent=2, by_alias=True)}"
    )

    if not response.success:
        return None, response.output

    # Extract the classification from the response
    output = response.output.strip()

    # Look for the classification pattern in the output
    # Claude might add explanation, so we need to extract just the command
    classification_match = re.search(r"(/chore|/bug|/feature|0)", output)

    if classification_match:
        issue_command = classification_match.group(1)
    else:
        issue_command = output

    if issue_command == "0":
        return None, f"No command selected: {response.output}"

    if issue_command not in ["/chore", "/bug", "/feature"]:
        return None, f"Invalid command selected: {response.output}"

    return issue_command, None  # type: ignore


def build_plan(
    issue: GitHubIssue,
    command: str,
    adw_id: str,
    logger: logging.Logger,
    working_dir: Optional[str] = None,
    state: Optional[ADWState] = None,
) -> AgentPromptResponse:
    """Build implementation plan for the issue using the specified command.

    Args:
        issue: GitHub issue object
        command: Slash command to execute
        adw_id: ADW instance ID
        logger: Logger instance
        working_dir: Working directory
        state: Optional ADW state for kanban mode detection

    Returns:
        Agent response with the plan
    """
    # Use minimal payload like classify_issue does
    minimal_issue_json = issue.model_dump_json(
        by_alias=True, include={"number", "title", "body"}
    )

    # Build args list
    args = [str(issue.number), adw_id, minimal_issue_json]

    # Add clarification context if available from state
    # Note: Clarification data is nested inside issue_json.metadata (from frontend via kanban)
    if state:
        # Get the metadata object where clarification data lives
        issue_json = state.get("issue_json", {})
        metadata = issue_json.get("metadata", {}) if isinstance(issue_json, dict) else {}

        # Check if clarification is approved (check both camelCase and snake_case keys)
        clarification_status = metadata.get("clarification_status", metadata.get("clarificationStatus"))
        is_approved = clarification_status == "approved"

        # Check both snake_case and camelCase keys for history
        clarification_history = metadata.get("clarificationHistory", metadata.get("clarification_history", []))

        # Also get the current clarification result if available
        clarification_result = metadata.get("clarificationResult", metadata.get("clarification_result"))

        if is_approved and clarification_history:
            # Get the latest clarification result
            latest = clarification_history[-1]
            if latest.get("result"):
                clarification_json = json.dumps(latest["result"])
                args.append(clarification_json)
                logger.info("Including approved clarification context in planning")
        elif is_approved and clarification_result:
            # Fallback to current clarification result if no history but approved
            clarification_json = json.dumps(clarification_result)
            args.append(clarification_json)
            logger.info("Including approved clarification result in planning")

    issue_plan_template_request = AgentTemplateRequest(
        agent_name=AGENT_PLANNER,
        slash_command=command,
        args=args,
        adw_id=adw_id,
        working_dir=working_dir,
    )

    logger.debug(
        f"issue_plan_template_request: {issue_plan_template_request.model_dump_json(indent=2, by_alias=True)}"
    )

    issue_plan_response = execute_template(issue_plan_template_request)

    logger.debug(
        f"issue_plan_response: {issue_plan_response.model_dump_json(indent=2, by_alias=True)}"
    )

    # Save plan to kanban output directory if in kanban mode
    if state and is_kanban_mode(state) and issue_plan_response.success:
        try:
            plan_output_file = get_kanban_output_path(state, f"plan_{command.replace('/', '')}.md")
            with open(plan_output_file, "w", encoding="utf-8") as f:
                f.write(f"# Implementation Plan - {command}\n\n")
                f.write(f"**Issue**: {issue.title}\n\n")
                f.write(f"**ADW ID**: {adw_id}\n\n")
                f.write(f"**Generated**: {issue_plan_response.timestamp}\n\n")
                f.write("## Plan\n\n")
                f.write(issue_plan_response.output)
            logger.info(f"Plan saved to kanban output: {plan_output_file}")
        except Exception as e:
            logger.warning(f"Failed to save plan to kanban output: {e}")

    return issue_plan_response


def implement_plan(
    plan_file: str,
    adw_id: str,
    logger: logging.Logger,
    agent_name: Optional[str] = None,
    working_dir: Optional[str] = None,
) -> AgentPromptResponse:
    """Implement the plan using the /implement command."""
    # Use provided agent_name or default to AGENT_IMPLEMENTOR
    implementor_name = agent_name or AGENT_IMPLEMENTOR

    implement_template_request = AgentTemplateRequest(
        agent_name=implementor_name,
        slash_command="/implement",
        args=[plan_file],
        adw_id=adw_id,
        working_dir=working_dir,
    )

    logger.debug(
        f"implement_template_request: {implement_template_request.model_dump_json(indent=2, by_alias=True)}"
    )

    implement_response = execute_template(implement_template_request)

    logger.debug(
        f"implement_response: {implement_response.model_dump_json(indent=2, by_alias=True)}"
    )

    return implement_response


# Agent name for merge operations
AGENT_MERGER = "merger"


def execute_merge_workflow(
    adw_id: str,
    merge_method: str,
    logger: logging.Logger,
    working_dir: Optional[str] = None,
) -> AgentPromptResponse:
    """Execute the merge workflow using the /merge_execute command.

    This uses the agent pattern to allow Claude to handle errors,
    fix issues, and retry within the same context.

    Args:
        adw_id: ADW identifier for the worktree to merge
        merge_method: Merge strategy (squash, merge, rebase)
        logger: Logger instance
        working_dir: Working directory for execution

    Returns:
        AgentPromptResponse with merge results
    """
    merge_template_request = AgentTemplateRequest(
        agent_name=AGENT_MERGER,
        slash_command="/merge_execute",
        args=[adw_id, merge_method],
        adw_id=adw_id,
        working_dir=working_dir,
    )

    logger.info(f"Executing agent-based merge for {adw_id} using {merge_method} method")
    logger.debug(
        f"merge_template_request: {merge_template_request.model_dump_json(indent=2, by_alias=True)}"
    )

    merge_response = execute_template(merge_template_request)

    logger.debug(
        f"merge_response: {merge_response.model_dump_json(indent=2, by_alias=True)}"
    )

    return merge_response


def generate_branch_name(
    issue: GitHubIssue,
    issue_class: IssueClassSlashCommand,
    adw_id: str,
    logger: logging.Logger,
) -> Tuple[Optional[str], Optional[str]]:
    """Generate a git branch name for the issue.

    Returns (branch_name, error_message) tuple.
    Uses fallback branch name if LLM generation fails to ensure workflow continues.
    """
    # Remove the leading slash from issue_class for the branch name
    issue_type = issue_class.replace("/", "")

    # Use minimal payload like classify_issue does
    minimal_issue_json = issue.model_dump_json(
        by_alias=True, include={"number", "title", "body"}
    )

    request = AgentTemplateRequest(
        agent_name=AGENT_BRANCH_GENERATOR,
        slash_command="/generate_branch_name",
        args=[issue_type, adw_id, minimal_issue_json],
        adw_id=adw_id,
    )

    try:
        response = execute_template(request)

        if not response.success:
            logger.warning(f"LLM branch generation failed: {response.output}. Using fallback.")
            fallback = generate_fallback_branch_name(issue.number, adw_id, issue_class, logger)
            return fallback, None

        # Extract and validate branch name from LLM output
        # LLMs may include reasoning/thinking before the actual branch name
        branch_name = extract_branch_name_from_output(response.output, logger)

        if not branch_name:
            # LLM gave output but we couldn't extract valid branch name
            # Use fallback instead of failing the entire workflow
            logger.warning(
                f"Could not extract valid branch name from LLM output. "
                f"Raw output: {response.output[:200]}. Using fallback."
            )
            fallback = generate_fallback_branch_name(issue.number, adw_id, issue_class, logger)
            return fallback, None

        logger.info(f"Generated branch name: {branch_name}")
        return branch_name, None

    except Exception as e:
        # Any exception during branch name generation should not stop the workflow
        logger.warning(f"Exception during branch name generation: {e}. Using fallback.")
        fallback = generate_fallback_branch_name(issue.number, adw_id, issue_class, logger)
        return fallback, None


def create_commit(
    agent_name: str,
    issue: GitHubIssue,
    issue_class: IssueClassSlashCommand,
    adw_id: str,
    logger: logging.Logger,
    working_dir: str,
) -> Tuple[Optional[str], Optional[str]]:
    """Create a git commit with a properly formatted message.
    Returns (commit_message, error_message) tuple."""
    # Remove the leading slash from issue_class
    issue_type = issue_class.replace("/", "")

    # Create unique committer agent name by suffixing '_committer'
    unique_agent_name = f"{agent_name}_committer"

    # Use minimal payload like classify_issue does
    minimal_issue_json = issue.model_dump_json(
        by_alias=True, include={"number", "title", "body"}
    )

    request = AgentTemplateRequest(
        agent_name=unique_agent_name,
        slash_command="/commit",
        args=[agent_name, issue_type, minimal_issue_json],
        adw_id=adw_id,
        working_dir=working_dir,
    )

    response = execute_template(request)

    if not response.success:
        return None, response.output

    commit_message = response.output.strip()
    logger.info(f"Created commit message: {commit_message}")
    return commit_message, None


def create_pull_request(
    branch_name: str,
    issue: Optional[GitHubIssue],
    state: ADWState,
    logger: logging.Logger,
    working_dir: str,
) -> Tuple[Optional[str], Optional[str]]:
    """Create a pull request for the implemented changes.
    Returns (pr_url, error_message) tuple."""

    # Get plan file from state (may be None for test runs)
    plan_file = state.get("plan_file") or "No plan file (test run)"
    adw_id = state.get("adw_id")

    # If we don't have issue data, try to construct minimal data
    if not issue:
        issue_data = state.get("issue", {})
        issue_json = json.dumps(issue_data) if issue_data else "{}"
    elif isinstance(issue, dict):
        # Try to reconstruct as GitHubIssue model which handles datetime serialization
        from adw_modules.data_types import GitHubIssue

        try:
            issue_model = GitHubIssue(**issue)
            # Use minimal payload like classify_issue does
            issue_json = issue_model.model_dump_json(
                by_alias=True, include={"number", "title", "body"}
            )
        except Exception:
            # Fallback: use json.dumps with default str converter for datetime
            issue_json = json.dumps(issue, default=str)
    else:
        # Use minimal payload like classify_issue does
        issue_json = issue.model_dump_json(
            by_alias=True, include={"number", "title", "body"}
        )

    request = AgentTemplateRequest(
        agent_name=AGENT_PR_CREATOR,
        slash_command="/pull_request",
        args=[branch_name, issue_json, plan_file, adw_id],
        adw_id=adw_id,
        working_dir=working_dir,
    )

    response = execute_template(request)

    if not response.success:
        return None, response.output

    pr_url = response.output.strip()
    logger.info(f"Created pull request: {pr_url}")
    return pr_url, None


def ensure_plan_exists(state: ADWState, issue_number: str) -> str:
    """Find or error if no plan exists for issue.
    Used by isolated build workflows in standalone mode."""
    # Check if plan file is in state
    if state.get("plan_file"):
        return state.get("plan_file")

    # Check current branch
    from adw_modules.git_ops import get_current_branch

    branch = get_current_branch()

    # Look for plan in branch name
    if f"-{issue_number}-" in branch:
        # Look for plan file
        plans = glob.glob(f"specs/*{issue_number}*.md")
        if plans:
            return plans[0]

    # No plan found
    raise ValueError(
        f"No plan found for issue {issue_number}. Run adw_plan_iso.py first."
    )


def ensure_adw_id(
    issue_number: str,
    adw_id: Optional[str] = None,
    logger: Optional[logging.Logger] = None,
    kanban_data: Optional[dict] = None,
    issue_type: Optional[str] = None,
) -> str:
    """Get ADW ID or create a new one and initialize state.

    Args:
        issue_number: The issue number to find/create ADW ID for
        adw_id: Optional existing ADW ID to use
        logger: Optional logger instance
        kanban_data: Optional kanban issue data for kanban-only workflows
        issue_type: Optional issue type from kanban (feature, bug, chore, patch)

    Returns:
        The ADW ID (existing or newly created)
    """
    # If ADW ID provided, check if state exists
    if adw_id:
        state = ADWState.load(adw_id, logger)
        if state:
            # Update existing state with kanban data if provided
            if kanban_data or issue_type:
                _update_state_with_kanban_data(state, kanban_data, issue_type, logger)
                state.save("ensure_adw_id")
            if logger:
                logger.info(f"Found existing ADW state for ID: {adw_id}")
            else:
                print(f"Found existing ADW state for ID: {adw_id}")
            return adw_id
        # ADW ID provided but no state exists, create state
        state = ADWState(adw_id)
        state.update(adw_id=adw_id, issue_number=issue_number)
        _update_state_with_kanban_data(state, kanban_data, issue_type, logger)
        state.save("ensure_adw_id")
        if logger:
            logger.info(f"Created new ADW state for provided ID: {adw_id}")
        else:
            print(f"Created new ADW state for provided ID: {adw_id}")
        return adw_id

    # No ADW ID provided, create new one with state
    from adw_modules.utils import make_adw_id

    new_adw_id = make_adw_id()
    state = ADWState(new_adw_id)
    state.update(adw_id=new_adw_id, issue_number=issue_number)
    _update_state_with_kanban_data(state, kanban_data, issue_type, logger)
    state.save("ensure_adw_id")
    if logger:
        logger.info(f"Created new ADW ID and state: {new_adw_id}")
    else:
        print(f"Created new ADW ID and state: {new_adw_id}")
    return new_adw_id


def _update_state_with_kanban_data(
    state: ADWState,
    kanban_data: Optional[dict],
    issue_type: Optional[str],
    logger: Optional[logging.Logger],
) -> None:
    """Update ADW state with kanban-specific data and settings.

    Args:
        state: ADW state to update
        kanban_data: Optional kanban issue data
        issue_type: Optional issue type from kanban
        logger: Optional logger instance
    """
    # Set kanban mode if kanban data or issue type provided
    if kanban_data or issue_type:
        state.update(data_source="kanban")
        if logger:
            logger.info("Enabled kanban mode for ADW workflow")

    # Store kanban issue data if provided
    if kanban_data:
        state.update(issue_json=kanban_data)
        if logger:
            logger.info("Stored kanban issue data in ADW state")

    # Store issue classification if provided
    if issue_type:
        # Convert to slash command format
        issue_class = f"/{issue_type}" if not issue_type.startswith("/") else issue_type
        state.update(issue_class=issue_class)
        if logger:
            logger.info(f"Set issue type from kanban: {issue_class}")


def find_existing_branch_for_issue(
    issue_number: str, adw_id: Optional[str] = None, cwd: Optional[str] = None
) -> Optional[str]:
    """Find an existing branch for the given issue number.
    Returns branch name if found, None otherwise."""
    # List all branches
    result = subprocess.run(
        ["git", "branch", "-a"], capture_output=True, text=True, cwd=cwd
    )

    if result.returncode != 0:
        return None

    branches = result.stdout.strip().split("\n")

    # Look for branch with standardized pattern: *-issue-{issue_number}-adw-{adw_id}-*
    for branch in branches:
        branch = branch.strip().replace("* ", "").replace("remotes/origin/", "")
        # Check for the standardized pattern
        if f"-issue-{issue_number}-" in branch:
            if adw_id and f"-adw-{adw_id}-" in branch:
                return branch
            elif not adw_id:
                # Return first match if no adw_id specified
                return branch

    return None


def find_plan_for_issue(
    issue_number: str, adw_id: Optional[str] = None
) -> Optional[str]:
    """Find plan file for the given issue number and optional adw_id.
    Returns path to plan file if found, None otherwise."""
    import os

    # Get project root
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    agents_dir = os.path.join(project_root, "agents")

    if not os.path.exists(agents_dir):
        return None

    # If adw_id is provided, check specific directory first
    if adw_id:
        plan_path = os.path.join(agents_dir, adw_id, AGENT_PLANNER, "plan.md")
        if os.path.exists(plan_path):
            return plan_path

    # Otherwise, search all agent directories
    for agent_id in os.listdir(agents_dir):
        agent_path = os.path.join(agents_dir, agent_id)
        if os.path.isdir(agent_path):
            plan_path = os.path.join(agent_path, AGENT_PLANNER, "plan.md")
            if os.path.exists(plan_path):
                # Check if this plan is for our issue by reading branch info or checking commits
                # For now, return the first plan found (can be improved)
                return plan_path

    return None


def create_or_find_branch(
    issue_number: str,
    issue: Optional[GitHubIssue],
    state: ADWState,
    logger: logging.Logger,
    cwd: Optional[str] = None,
) -> Tuple[str, Optional[str]]:
    """Create or find a branch for the given issue.

    1. First checks state for existing branch name
    2. Then looks for existing branches matching the issue
    3. If none found, classifies the issue and creates a new branch

    The issue parameter can be None when using Kanban-provided data.
    In that case, the function will create a GitHubIssue object from
    issue_json data stored in the state.

    Returns (branch_name, error_message) tuple.
    """
    # 1. Check state for branch name
    branch_name = state.get("branch_name") or state.get("branch", {}).get("name")
    if branch_name:
        logger.info(f"Found branch in state: {branch_name}")
        # Check if we need to checkout
        from adw_modules.git_ops import get_current_branch

        current = get_current_branch(cwd=cwd)
        if current != branch_name:
            result = subprocess.run(
                ["git", "checkout", branch_name],
                capture_output=True,
                text=True,
                cwd=cwd,
            )
            if result.returncode != 0:
                # Branch might not exist locally, try to create from remote
                result = subprocess.run(
                    ["git", "checkout", "-b", branch_name, f"origin/{branch_name}"],
                    capture_output=True,
                    text=True,
                    cwd=cwd,
                )
                if result.returncode != 0:
                    return "", f"Failed to checkout branch: {result.stderr}"
        return branch_name, None

    # 2. Look for existing branch
    adw_id = state.get("adw_id")
    existing_branch = find_existing_branch_for_issue(issue_number, adw_id, cwd=cwd)
    if existing_branch:
        logger.info(f"Found existing branch: {existing_branch}")
        # Checkout the branch
        result = subprocess.run(
            ["git", "checkout", existing_branch],
            capture_output=True,
            text=True,
            cwd=cwd,
        )
        if result.returncode != 0:
            return "", f"Failed to checkout branch: {result.stderr}"
        state.update(branch_name=existing_branch)
        return existing_branch, None

    # 3. Create new branch - classify issue first
    logger.info("No existing branch found, creating new one")

    # Check if issue_class already exists in state (from WebSocket-provided issue_type)
    issue_command = state.get("issue_class")
    if issue_command:
        logger.info(f"Using existing issue_class from state: {issue_command}")
    else:
        # Classify the issue using GitHub API (requires a valid issue object)
        if not issue:
            return "", "Cannot classify issue: No issue object provided and no issue_class in state"
        logger.info("No issue_class in state, classifying GitHub issue")
        issue_command, error = classify_issue(issue, adw_id, logger)
        if error:
            return "", f"Failed to classify issue: {error}"
        state.update(issue_class=issue_command)

    # Ensure we have an issue object for branch generation
    working_issue = issue
    if not working_issue:
        # Try to create GitHubIssue object from Kanban data in state
        issue_json = state.get("issue_json")
        if issue_json:
            logger.info("Creating GitHubIssue object from Kanban data")
            try:
                working_issue = create_github_issue_from_kanban_data(issue_json, issue_number)
            except Exception as e:
                return "", f"Failed to create issue object from Kanban data: {e}"
        else:
            return "", "No issue object available for branch generation"

    # Generate branch name
    branch_name, error = generate_branch_name(working_issue, issue_command, adw_id, logger)
    if error:
        return "", f"Failed to generate branch name: {error}"

    # Create the branch
    from adw_modules.git_ops import create_branch

    success, error = create_branch(branch_name, cwd=cwd)
    if not success:
        return "", f"Failed to create branch: {error}"

    state.update(branch_name=branch_name)
    logger.info(f"Created and checked out new branch: {branch_name}")

    return branch_name, None


def find_spec_file(state: ADWState, logger: logging.Logger) -> Optional[str]:
    """Find the spec file from state or by examining git diff.

    For isolated workflows, automatically uses worktree_path from state.
    """
    # Get worktree path if in isolated workflow
    worktree_path = state.get("worktree_path")

    # Check if spec file is already in state (from plan phase)
    spec_file = state.get("plan_file")
    if spec_file:
        # If worktree_path exists and spec_file is relative, make it absolute
        if worktree_path and not os.path.isabs(spec_file):
            spec_file = os.path.join(worktree_path, spec_file)

        if os.path.exists(spec_file):
            logger.info(f"Using spec file from state: {spec_file}")
            return spec_file

    # Otherwise, try to find it from git diff
    logger.info("Looking for spec file in git diff")
    result = subprocess.run(
        ["git", "diff", "main", "--name-only"],
        capture_output=True,
        text=True,
        cwd=worktree_path,
    )

    if result.returncode == 0:
        files = result.stdout.strip().split("\n")
        spec_files = [f for f in files if f.startswith("specs/") and f.endswith(".md")]

        if spec_files:
            # Use the first spec file found
            spec_file = spec_files[0]
            if worktree_path:
                spec_file = os.path.join(worktree_path, spec_file)
            logger.info(f"Found spec file: {spec_file}")
            return spec_file

    # If still not found, try to derive from branch name
    branch_name = state.get("branch_name")
    if branch_name:
        # Extract issue number from branch name
        import re

        match = re.search(r"issue-(\d+)", branch_name)
        if match:
            issue_num = match.group(1)
            adw_id = state.get("adw_id")

            # Look for spec files matching the pattern
            import glob

            # Use worktree_path if provided, otherwise current directory
            search_dir = worktree_path if worktree_path else os.getcwd()
            pattern = os.path.join(
                search_dir, f"specs/issue-{issue_num}-adw-{adw_id}*.md"
            )
            spec_files = glob.glob(pattern)

            if spec_files:
                spec_file = spec_files[0]
                logger.info(f"Found spec file by pattern: {spec_file}")
                return spec_file

    logger.warning("No spec file found")
    return None


def create_and_implement_patch(
    adw_id: str,
    review_change_request: str,
    logger: logging.Logger,
    agent_name_planner: str,
    agent_name_implementor: str,
    spec_path: Optional[str] = None,
    issue_screenshots: Optional[str] = None,
    working_dir: Optional[str] = None,
) -> Tuple[Optional[str], AgentPromptResponse]:
    """Create a patch plan and implement it.
    Returns (patch_file_path, implement_response) tuple."""

    # Create patch plan using /patch command
    args = [adw_id, review_change_request]

    # Add optional arguments in the correct order
    if spec_path:
        args.append(spec_path)
    else:
        args.append("")  # Empty string for optional spec_path

    args.append(agent_name_planner)

    if issue_screenshots:
        args.append(issue_screenshots)

    request = AgentTemplateRequest(
        agent_name=agent_name_planner,
        slash_command="/patch",
        args=args,
        adw_id=adw_id,
        working_dir=working_dir,
    )

    logger.debug(
        f"Patch plan request: {request.model_dump_json(indent=2, by_alias=True)}"
    )

    response = execute_template(request)

    logger.debug(
        f"Patch plan response: {response.model_dump_json(indent=2, by_alias=True)}"
    )

    if not response.success:
        logger.error(f"Error creating patch plan: {response.output}")
        # Return None and a failed response
        return None, AgentPromptResponse(
            output=f"Failed to create patch plan: {response.output}", success=False
        )

    # Extract the patch plan file path from the response
    patch_file_path = response.output.strip()

    # Validate that it looks like a file path
    if "specs/patch/" not in patch_file_path or not patch_file_path.endswith(".md"):
        logger.error(f"Invalid patch plan path returned: {patch_file_path}")
        return None, AgentPromptResponse(
            output=f"Invalid patch plan path: {patch_file_path}", success=False
        )

    logger.info(f"Created patch plan: {patch_file_path}")

    # Now implement the patch plan using the provided implementor agent name
    implement_response = implement_plan(
        patch_file_path, adw_id, logger, agent_name_implementor, working_dir=working_dir
    )

    return patch_file_path, implement_response
