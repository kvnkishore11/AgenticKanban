"""Data types for merge workflow utilities."""

from dataclasses import dataclass
from typing import Optional, List
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier


@dataclass
class MergeInitContext:
    """Result of merge workflow initialization phase."""
    adw_id: str
    merge_method: str
    state: ADWState
    logger: logging.Logger
    notifier: WebSocketNotifier
    issue_number: Optional[str]
    branch_name: str
    worktree_path: str


@dataclass
class MergeValidationContext:
    """Result of worktree validation phase."""
    is_valid: bool
    worktree_path: str
    branch_name: str
    error: Optional[str]


@dataclass
class MergeConflictContext:
    """Result of conflict detection phase."""
    has_conflicts: bool
    conflict_files: List[str]
    resolved: bool
    error: Optional[str]


@dataclass
class MergeConfigContext:
    """Result of config restoration phase."""
    files_fixed: List[str]
    success: bool
    error: Optional[str]


@dataclass
class MergeTestContext:
    """Result of test validation phase."""
    success: bool
    test_output: Optional[str]
    error: Optional[str]


@dataclass
class MergeResultContext:
    """Result of merge operation phase."""
    success: bool
    original_branch: str
    merge_method: str
    error: Optional[str]


@dataclass
class MergeCleanupContext:
    """Result of cleanup phase."""
    worktree_removed: bool
    branch_deleted: bool
    error: Optional[str]
