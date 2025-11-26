"""Data types for plan workflow utilities."""

from dataclasses import dataclass
from typing import Optional
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.data_types import GitHubIssue, IssueClassSlashCommand


@dataclass
class InitContext:
    """Result of ADW initialization phase."""
    issue_number: str
    adw_id: str
    state: ADWState
    logger: logging.Logger
    notifier: WebSocketNotifier


@dataclass
class EnvContext:
    """Result of environment validation phase."""
    github_repo_url: Optional[str]
    skip_worktree: bool


@dataclass
class WorktreeContext:
    """Result of worktree setup phase."""
    worktree_path: Optional[str]
    websocket_port: int
    frontend_port: int
    is_valid: bool


@dataclass
class IssueContext:
    """Result of issue fetching and classification phase."""
    issue: GitHubIssue
    issue_command: IssueClassSlashCommand


@dataclass
class PlanContext:
    """Result of plan building phase."""
    plan_file_path: str
