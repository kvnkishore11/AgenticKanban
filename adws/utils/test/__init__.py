"""Test workflow utilities package."""

from .types import (
    TestInitContext,
    TestValidationContext,
    UnitTestContext,
    E2ETestContext,
    TestIssueContext,
    TestSummaryContext,
)

from .initialization import (
    parse_cli_arguments,
    initialize_test_workflow,
)

from .validation import (
    validate_test_environment,
    validate_test_worktree,
    post_test_start_message,
)

from .unit_tests import (
    run_tests,
    parse_test_results,
    format_test_results_comment,
    run_unit_tests_with_resolution,
    post_unit_test_results,
    AGENT_TESTER,
    MAX_TEST_RETRY_ATTEMPTS,
)

from .e2e_tests import (
    run_e2e_tests,
    parse_e2e_test_results,
    run_e2e_tests_with_resolution,
    AGENT_E2E_TESTER,
    MAX_E2E_TEST_RETRY_ATTEMPTS,
)

from .resolution import (
    resolve_failed_tests,
    resolve_failed_e2e_tests,
)

from .summary import (
    post_comprehensive_test_summary,
    calculate_total_failures,
)

from .commit import (
    fetch_issue_for_test_commit,
    create_test_commit,
)

from .finalization import (
    validate_repo_access,
    finalize_test_workflow,
)

from .discovery import (
    DiscoveredTests,
    discover_adw_tests,
    get_adw_test_paths,
    ensure_adw_test_dirs,
    has_adw_tests,
    discover_issue_e2e_tests,
    discover_all_e2e_tests,
)

__all__ = [
    # Types
    "TestInitContext",
    "TestValidationContext",
    "UnitTestContext",
    "E2ETestContext",
    "TestIssueContext",
    "TestSummaryContext",
    # Initialization
    "parse_cli_arguments",
    "initialize_test_workflow",
    # Validation
    "validate_test_environment",
    "validate_test_worktree",
    "post_test_start_message",
    # Unit tests
    "run_tests",
    "parse_test_results",
    "format_test_results_comment",
    "run_unit_tests_with_resolution",
    "post_unit_test_results",
    "AGENT_TESTER",
    "MAX_TEST_RETRY_ATTEMPTS",
    # E2E tests
    "run_e2e_tests",
    "parse_e2e_test_results",
    "run_e2e_tests_with_resolution",
    "AGENT_E2E_TESTER",
    "MAX_E2E_TEST_RETRY_ATTEMPTS",
    # Resolution
    "resolve_failed_tests",
    "resolve_failed_e2e_tests",
    # Summary
    "post_comprehensive_test_summary",
    "calculate_total_failures",
    # Commit
    "fetch_issue_for_test_commit",
    "create_test_commit",
    # Finalization
    "validate_repo_access",
    "finalize_test_workflow",
    # Discovery
    "DiscoveredTests",
    "discover_adw_tests",
    "get_adw_test_paths",
    "ensure_adw_test_dirs",
    "has_adw_tests",
    "discover_issue_e2e_tests",
    "discover_all_e2e_tests",
]
