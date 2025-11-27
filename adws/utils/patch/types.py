"""Data types for patch workflow utilities."""

from dataclasses import dataclass
from typing import Optional
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.data_types import GitHubIssue


@dataclass
class PatchInitContext:
    """Result of patch workflow initialization phase."""
    issue_number: str
    adw_id: str
    state: ADWState
    logger: logging.Logger
    notifier: WebSocketNotifier


@dataclass
class PatchEnvContext:
    """Result of environment validation phase."""
    github_repo_url: Optional[str]
    is_valid: bool


@dataclass
class PatchIssueContext:
    """Result of issue fetching phase."""
    issue: GitHubIssue
    is_fallback: bool


@dataclass
class PatchBranchContext:
    """Result of branch resolution phase."""
    branch_name: str
    is_existing: bool
    issue_command: str


@dataclass
class PatchWorktreeContext:
    """Result of worktree setup phase."""
    worktree_path: str
    websocket_port: int
    frontend_port: int
    is_existing: bool


@dataclass
class PatchContentContext:
    """Result of patch content extraction phase."""
    patch_content: str
    source_description: str
    is_kanban_mode: bool


@dataclass
class PatchResultContext:
    """Result of patch implementation phase."""
    patch_file: str
    patch_number: int
    patch_reason: str
    success: bool
