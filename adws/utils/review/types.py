"""Data types for review workflow utilities."""

from dataclasses import dataclass
from typing import List
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from adw_modules.state import ADWState
from adw_modules.data_types import ReviewResult


@dataclass
class ReviewInitContext:
    """Result of review workflow initialization phase."""
    issue_number: str
    adw_id: str
    state: ADWState
    logger: logging.Logger
    skip_resolution: bool


@dataclass
class ReviewSpecContext:
    """Result of spec file finding phase."""
    spec_file: str
    worktree_path: str


@dataclass
class ReviewExecutionContext:
    """Result of review execution phase."""
    review_result: ReviewResult
    blocker_count: int
    attempt_number: int


@dataclass
class ReviewResolutionContext:
    """Result of blocker resolution phase."""
    blocker_issues: List
    resolved_count: int
