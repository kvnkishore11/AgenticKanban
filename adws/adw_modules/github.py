#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
GitHub Operations Module - AI Developer Workflow (ADW)

This module contains all GitHub-related operations including:
- Issue fetching and manipulation
- Comment posting
- Repository path extraction
- Issue status management
"""

import subprocess
import sys
import os
import json
import logging
from typing import Dict, List, Optional
from .data_types import GitHubIssue, GitHubIssueListItem, GitHubComment
from .kanban_mode import is_kanban_mode, create_kanban_issue_from_data, get_kanban_output_path

# Bot identifier to prevent webhook loops and filter bot comments
ADW_BOT_IDENTIFIER = "[ADW-AGENTS]"


def get_github_env() -> Optional[dict]:
    """Get environment with GitHub token set up. Returns None if no GITHUB_PAT.
    
    Subprocess env behavior:
    - env=None → Inherits parent's environment (default)
    - env={} → Empty environment (no variables)
    - env=custom_dict → Only uses specified variables
    
    So this will work with gh authentication:
    # These are equivalent:
    result = subprocess.run(cmd, capture_output=True, text=True)
    result = subprocess.run(cmd, capture_output=True, text=True, env=None)
    
    But this will NOT work (no PATH, no auth):
    result = subprocess.run(cmd, capture_output=True, text=True, env={})
    """
    github_pat = os.getenv("GITHUB_PAT")
    if not github_pat:
        return None
    
    # Only create minimal env with GitHub token
    env = {
        "GH_TOKEN": github_pat,
        "PATH": os.environ.get("PATH", ""),
    }
    return env


def get_repo_url() -> Optional[str]:
    """Get GitHub repository URL from git remote.

    Returns None gracefully if git is not available or no remote is found,
    supporting kanban mode operation.
    """
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Return None instead of raising exceptions to support kanban mode
        logging.getLogger(__name__).info("Git repository not available - operating in kanban mode")
        return None


def extract_repo_path(github_url: Optional[str]) -> Optional[str]:
    """Extract owner/repo from GitHub URL.

    Args:
        github_url: GitHub URL or None (for kanban mode)

    Returns:
        Repository path or None if URL is None
    """
    if github_url is None:
        return None
    # Handle both https://github.com/owner/repo and https://github.com/owner/repo.git
    return github_url.replace("https://github.com/", "").replace(".git", "")


def fetch_issue(issue_number: str, repo_path: str) -> GitHubIssue:
    """Fetch GitHub issue using gh CLI and return typed model."""
    # Use JSON output for structured data
    cmd = [
        "gh",
        "issue",
        "view",
        issue_number,
        "-R",
        repo_path,
        "--json",
        "number,title,body,state,author,assignees,labels,milestone,comments,createdAt,updatedAt,closedAt,url",
    ]

    # Set up environment with GitHub token if available
    env = get_github_env()

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)

        if result.returncode == 0:
            # Parse JSON response into Pydantic model
            issue_data = json.loads(result.stdout)
            issue = GitHubIssue(**issue_data)

            return issue
        else:
            # Raise exception instead of sys.exit to allow fallback handling
            error_msg = result.stderr.strip() if result.stderr else f"GitHub CLI failed with code {result.returncode}"
            raise RuntimeError(error_msg)
    except FileNotFoundError:
        error_msg = (
            "GitHub CLI (gh) is not installed. "
            "To install: macOS: brew install gh, Linux/Windows: see https://github.com/cli/cli#installation. "
            "After installation, authenticate with: gh auth login"
        )
        raise RuntimeError(error_msg)
    except Exception as e:
        raise RuntimeError(f"Error parsing issue data: {e}")


def fetch_issue_safe(issue_number: str, state=None) -> Optional[GitHubIssue]:
    """Fetch issue data safely, preferring kanban data when available.

    Args:
        issue_number: GitHub issue number
        state: ADW state object (optional, for kanban mode detection)

    Returns:
        GitHubIssue object or None if unavailable
    """
    logger = logging.getLogger(__name__)

    # If we have state and it contains kanban data, use it
    if state and state.get("issue_json"):
        logger.info("Using kanban-provided issue data")
        try:
            issue_data = create_kanban_issue_from_data(state.get("issue_json"), issue_number)
            return GitHubIssue(**issue_data)
        except Exception as e:
            logger.error(f"Failed to create issue from kanban data: {e}")
            return None

    # If we're in kanban mode but don't have issue data, create fallback
    if state and is_kanban_mode(state):
        logger.warning("Kanban mode enabled but no issue_json provided")
        from .kanban_mode import get_or_create_fallback_issue
        fallback_data = get_or_create_fallback_issue(issue_number, state)
        if fallback_data:
            return GitHubIssue(**fallback_data)
        return None

    # Fall back to GitHub API if not in kanban mode
    logger.info("Fetching issue from GitHub API")
    try:
        repo_url = get_repo_url()
        if repo_url is None:
            logger.error("No GitHub repository available - trying fallback")
            # Try to create a fallback even in non-kanban mode if GitHub is unavailable
            if state:
                from .kanban_mode import get_or_create_fallback_issue
                fallback_data = get_or_create_fallback_issue(issue_number, state)
                if fallback_data:
                    return GitHubIssue(**fallback_data)
            return None

        repo_path = extract_repo_path(repo_url)
        if repo_path is None:
            logger.error("Could not extract repository path")
            return None

        return fetch_issue(issue_number, repo_path)
    except Exception as e:
        logger.error(f"Failed to fetch issue from GitHub: {e}")

        # If GitHub issue doesn't exist, automatically switch to kanban mode
        if "Could not resolve to an issue" in str(e) and state:
            logger.info(f"GitHub issue #{issue_number} not found - switching to kanban mode")
            state.update(data_source="kanban")
            state.save("github_fallback")

            # Try fallback creation
            try:
                from .kanban_mode import get_or_create_fallback_issue
                fallback_data = get_or_create_fallback_issue(issue_number, state)
                if fallback_data:
                    logger.info("Successfully created fallback issue for missing GitHub issue")
                    return GitHubIssue(**fallback_data)
            except Exception as fallback_e:
                logger.error(f"Fallback creation also failed: {fallback_e}")

        # Try fallback creation as last resort for other errors
        if state:
            logger.info("Attempting fallback issue creation as last resort")
            try:
                from .kanban_mode import get_or_create_fallback_issue
                fallback_data = get_or_create_fallback_issue(issue_number, state)
                if fallback_data:
                    return GitHubIssue(**fallback_data)
            except Exception as fallback_e:
                logger.error(f"Fallback creation also failed: {fallback_e}")
        return None


def make_issue_comment_safe(issue_id: str, comment: str, state=None) -> bool:
    """Post a comment to GitHub issue safely, skipping if in kanban mode.

    Args:
        issue_id: GitHub issue ID
        comment: Comment text
        state: ADW state object (optional, for kanban mode detection)

    Returns:
        True if comment was posted or saved, False if failed
    """
    logger = logging.getLogger(__name__)

    # If we're in kanban mode, save comment to file instead and skip GitHub entirely
    if state and is_kanban_mode(state):
        logger.debug("Kanban mode - saving comment to file instead of GitHub")
        try:
            import datetime
            comment_file = get_kanban_output_path(state, f"issue_{issue_id}_comments.txt")
            with open(comment_file, "a", encoding="utf-8") as f:
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"\n--- Comment at {timestamp} ---\n")
                f.write(f"{ADW_BOT_IDENTIFIER} {comment}\n")
            logger.debug(f"Comment saved to {comment_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to save comment to file: {e}")
            return False

    # Otherwise, try to post to GitHub
    try:
        make_issue_comment(issue_id, comment)
        logger.info(f"Posted comment to GitHub issue #{issue_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to post GitHub comment: {e}")
        return False


def make_issue_comment(issue_id: str, comment: str) -> None:
    """Post a comment to a GitHub issue using gh CLI.

    This function now automatically detects kanban mode and gracefully handles
    missing GitHub issues by saving comments to files instead.
    """
    # Try to detect kanban mode from current execution context
    import glob
    import os

    logger = logging.getLogger(__name__)

    # Look for ADW state files in the current execution
    agents_dir = os.path.join(os.getcwd(), "agents")
    if os.path.exists(agents_dir):
        # Find the most recent ADW state file
        state_files = glob.glob(os.path.join(agents_dir, "*/adw_state.json"))
        if state_files:
            # Sort by modification time and get the most recent
            most_recent_state = max(state_files, key=os.path.getmtime)
            try:
                import json
                with open(most_recent_state, 'r') as f:
                    state_data = json.load(f)

                # If this ADW is in kanban mode, save to file instead
                if state_data.get("data_source") == "kanban":
                    logger.debug(f"Detected kanban mode for issue #{issue_id}, saving comment to file")
                    try:
                        from .state import ADWState
                        adw_id = state_data.get("adw_id")
                        if adw_id:
                            state = ADWState.load(adw_id)
                            if state:
                                make_issue_comment_safe(issue_id, comment, state)
                                return  # Success, exit early
                    except Exception as e:
                        logger.debug(f"Could not load ADW state for kanban comment: {e}")
            except Exception as e:
                logger.debug(f"Could not read ADW state file: {e}")

    # Get repo information from git remote
    github_repo_url = get_repo_url()
    repo_path = extract_repo_path(github_repo_url)

    # Ensure comment has ADW_BOT_IDENTIFIER to prevent webhook loops
    if not comment.startswith(ADW_BOT_IDENTIFIER):
        comment = f"{ADW_BOT_IDENTIFIER} {comment}"

    # Build command
    cmd = [
        "gh",
        "issue",
        "comment",
        issue_id,
        "-R",
        repo_path,
        "--body",
        comment,
    ]

    # Set up environment with GitHub token if available
    env = get_github_env()

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)

        if result.returncode == 0:
            logger.debug(f"Successfully posted comment to issue #{issue_id}")
        else:
            # Don't raise exceptions for missing GitHub issues - just log and continue
            error_msg = result.stderr.strip() if result.stderr else f"GitHub CLI failed with code {result.returncode}"
            if "Could not resolve to an issue" in error_msg:
                logger.debug(f"GitHub issue #{issue_id} not found - this is expected in kanban mode")
            else:
                logger.warning(f"GitHub comment failed: {error_msg}")
    except Exception as e:
        # Don't raise exceptions - just log and continue gracefully
        logger.debug(f"GitHub comment error (continuing): {e}")


def mark_issue_in_progress(issue_id: str) -> None:
    """Mark issue as in progress by adding label and comment."""
    # Get repo information from git remote
    github_repo_url = get_repo_url()
    repo_path = extract_repo_path(github_repo_url)

    # Add "in_progress" label
    cmd = [
        "gh",
        "issue",
        "edit",
        issue_id,
        "-R",
        repo_path,
        "--add-label",
        "in_progress",
    ]

    # Set up environment with GitHub token if available
    env = get_github_env()

    # Try to add label (may fail if label doesn't exist)
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        print(f"Note: Could not add 'in_progress' label: {result.stderr}")

    # Post comment indicating work has started
    # make_issue_comment(issue_id, "🚧 ADW is working on this issue...")

    # Assign to self (optional)
    cmd = [
        "gh",
        "issue",
        "edit",
        issue_id,
        "-R",
        repo_path,
        "--add-assignee",
        "@me",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode == 0:
        print(f"Assigned issue #{issue_id} to self")


def fetch_open_issues(repo_path: str) -> List[GitHubIssueListItem]:
    """Fetch all open issues from the GitHub repository."""
    try:
        cmd = [
            "gh",
            "issue",
            "list",
            "--repo",
            repo_path,
            "--state",
            "open",
            "--json",
            "number,title,body,labels,createdAt,updatedAt",
            "--limit",
            "1000",
        ]

        # Set up environment with GitHub token if available
        env = get_github_env()

        # DEBUG level - not printing command
        result = subprocess.run(
            cmd, capture_output=True, text=True, check=True, env=env
        )

        issues_data = json.loads(result.stdout)
        issues = [GitHubIssueListItem(**issue_data) for issue_data in issues_data]
        print(f"Fetched {len(issues)} open issues")
        return issues

    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to fetch issues: {e.stderr}", file=sys.stderr)
        return []
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse issues JSON: {e}", file=sys.stderr)
        return []


def fetch_issue_comments(repo_path: str, issue_number: int) -> List[Dict]:
    """Fetch all comments for a specific issue."""
    try:
        cmd = [
            "gh",
            "issue",
            "view",
            str(issue_number),
            "--repo",
            repo_path,
            "--json",
            "comments",
        ]

        # Set up environment with GitHub token if available
        env = get_github_env()

        result = subprocess.run(
            cmd, capture_output=True, text=True, check=True, env=env
        )
        data = json.loads(result.stdout)
        comments = data.get("comments", [])

        # Sort comments by creation time
        comments.sort(key=lambda c: c.get("createdAt", ""))

        # DEBUG level - not printing
        return comments

    except subprocess.CalledProcessError as e:
        print(
            f"ERROR: Failed to fetch comments for issue #{issue_number}: {e.stderr}",
            file=sys.stderr,
        )
        return []
    except json.JSONDecodeError as e:
        print(
            f"ERROR: Failed to parse comments JSON for issue #{issue_number}: {e}",
            file=sys.stderr,
        )
        return []


def find_keyword_from_comment(keyword: str, issue: GitHubIssue) -> Optional[GitHubComment]:
    """Find the latest comment containing a specific keyword.
    
    Args:
        keyword: The keyword to search for in comments
        issue: The GitHub issue containing comments
        
    Returns:
        The latest GitHubComment containing the keyword, or None if not found
    """
    # Sort comments by created_at date (newest first)
    sorted_comments = sorted(issue.comments, key=lambda c: c.created_at, reverse=True)
    
    # Search through sorted comments (newest first)
    for comment in sorted_comments:
        # Skip ADW bot comments to prevent loops
        if ADW_BOT_IDENTIFIER in comment.body:
            continue
            
        if keyword in comment.body:
            return comment
    
    return None
