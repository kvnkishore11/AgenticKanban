"""Type definitions for test workflow utilities."""

from dataclasses import dataclass
from typing import Optional, List
import logging

from adw_modules.state import ADWState
from adw_modules.websocket_client import WebSocketNotifier
from adw_modules.data_types import GitHubIssue, TestResult, E2ETestResult, AgentPromptResponse


@dataclass
class TestInitContext:
    """Context from workflow initialization."""
    adw_id: str
    issue_number: str
    skip_e2e: bool
    state: ADWState
    logger: logging.Logger
    notifier: WebSocketNotifier


@dataclass
class TestValidationContext:
    """Context from worktree validation."""
    worktree_path: str
    websocket_port: str
    frontend_port: str


@dataclass
class UnitTestContext:
    """Context from unit test execution."""
    results: List[TestResult]
    passed_count: int
    failed_count: int
    response: Optional[AgentPromptResponse]


@dataclass
class E2ETestContext:
    """Context from E2E test execution."""
    results: List[E2ETestResult]
    passed_count: int
    failed_count: int


@dataclass
class TestIssueContext:
    """Context for issue data and classification."""
    issue: GitHubIssue
    issue_command: str


@dataclass
class TestSummaryContext:
    """Context for comprehensive test summary."""
    unit_results: List[TestResult]
    e2e_results: List[E2ETestResult]
    total_failures: int
