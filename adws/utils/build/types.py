"""Data types for build workflow utilities."""

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
class BuildInitContext:
    """Result of build workflow initialization phase."""
    issue_number: str
    adw_id: str
    state: ADWState
    logger: logging.Logger
    notifier: WebSocketNotifier


@dataclass
class BuildValidationContext:
    """Result of build validation phase."""
    worktree_path: str
    branch_name: str
    plan_file: str
    websocket_port: str
    frontend_port: str


@dataclass
class BuildIssueContext:
    """Result of issue fetching for build workflow."""
    issue: GitHubIssue
    issue_command: IssueClassSlashCommand
