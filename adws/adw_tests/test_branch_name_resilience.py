"""Tests for branch name resilience - ensuring ADW never fails due to branch naming."""

import pytest
from unittest.mock import Mock, patch
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adw_modules.workflow_ops import (
    validate_branch_name,
    extract_branch_name_from_output,
    generate_fallback_branch_name,
    generate_branch_name,
    BRANCH_NAME_PATTERN,
)


class TestBranchNamePattern:
    """Tests for branch name regex patterns."""

    def test_accepts_feat_prefix(self):
        """Should accept 'feat' prefix."""
        assert validate_branch_name("feat-issue-123-adw-abc123-user-login")

    def test_accepts_feature_prefix(self):
        """Should accept 'feature' prefix (common LLM output)."""
        assert validate_branch_name("feature-issue-123-adw-abc123-user-login")

    def test_accepts_bug_prefix(self):
        """Should accept 'bug' prefix."""
        assert validate_branch_name("bug-issue-456-adw-def456-fix-crash")

    def test_accepts_chore_prefix(self):
        """Should accept 'chore' prefix."""
        assert validate_branch_name("chore-issue-789-adw-ghi789-update-deps")

    def test_accepts_fix_prefix(self):
        """Should accept 'fix' prefix."""
        assert validate_branch_name("fix-issue-101-adw-jkl101-memory-leak")

    def test_rejects_invalid_prefix(self):
        """Should reject invalid prefixes."""
        assert not validate_branch_name("invalid-issue-123-adw-abc123-test")

    def test_rejects_missing_issue_number(self):
        """Should reject branch names without issue number."""
        assert not validate_branch_name("feat-adw-abc123-test")

    def test_rejects_spaces(self):
        """Should reject branch names with spaces."""
        assert not validate_branch_name("feat-issue-123-adw-abc123-test name")


class TestExtractBranchNameFromOutput:
    """Tests for extracting branch names from LLM output."""

    def test_extracts_clean_output(self):
        """Should extract branch name from clean LLM output."""
        logger = Mock()
        result = extract_branch_name_from_output(
            "feat-issue-123-adw-abc123-user-profile",
            logger
        )
        assert result == "feat-issue-123-adw-abc123-user-profile"

    def test_extracts_from_output_with_feature_prefix(self):
        """Should extract branch name with 'feature' prefix."""
        logger = Mock()
        result = extract_branch_name_from_output(
            "feature-issue-32-adw-b78aa835-execution-control-pause-resume",
            logger
        )
        assert result == "feature-issue-32-adw-b78aa835-execution-control-pause-resume"

    def test_extracts_from_output_with_reasoning(self):
        """Should extract branch name from output with LLM reasoning."""
        logger = Mock()
        output = """I'll create a branch name for this issue.

Based on the issue type and content, here's the branch name:

feat-issue-999-adw-test1234-add-dark-mode

This follows the required format."""
        result = extract_branch_name_from_output(output, logger)
        assert result == "feat-issue-999-adw-test1234-add-dark-mode"

    def test_returns_none_for_invalid_output(self):
        """Should return None for output without valid branch name."""
        logger = Mock()
        result = extract_branch_name_from_output(
            "This is not a valid branch name at all",
            logger
        )
        assert result is None
        logger.error.assert_called()


class TestGenerateFallbackBranchName:
    """Tests for fallback branch name generation."""

    def test_generates_valid_fallback(self):
        """Should generate a valid fallback branch name."""
        logger = Mock()
        result = generate_fallback_branch_name(123, "abc123", "/feature", logger)
        assert result == "feat-issue-123-adw-abc123-auto"
        assert validate_branch_name(result)

    def test_normalizes_feature_to_feat(self):
        """Should normalize 'feature' to 'feat'."""
        logger = Mock()
        result = generate_fallback_branch_name(456, "def456", "feature", logger)
        assert result == "feat-issue-456-adw-def456-auto"

    def test_handles_slash_prefixed_types(self):
        """Should handle slash-prefixed issue types."""
        logger = Mock()

        # /bug -> bug
        result = generate_fallback_branch_name(1, "id1", "/bug", logger)
        assert result == "bug-issue-1-adw-id1-auto"

        # /chore -> chore
        result = generate_fallback_branch_name(2, "id2", "/chore", logger)
        assert result == "chore-issue-2-adw-id2-auto"

    def test_defaults_to_feat_for_unknown_type(self):
        """Should default to 'feat' for unknown issue types."""
        logger = Mock()
        result = generate_fallback_branch_name(999, "xyz", "unknown_type", logger)
        assert result == "feat-issue-999-adw-xyz-auto"

    def test_logs_warning(self):
        """Should log warning when generating fallback."""
        logger = Mock()
        generate_fallback_branch_name(123, "abc", "/feature", logger)
        logger.warning.assert_called()


class TestGenerateBranchNameResilience:
    """Tests ensuring generate_branch_name never fails."""

    @patch('adw_modules.workflow_ops.execute_template')
    def test_returns_fallback_on_llm_failure(self, mock_execute):
        """Should return fallback when LLM execution fails."""
        mock_execute.return_value = Mock(success=False, output="API error")

        mock_issue = Mock()
        mock_issue.number = 123
        mock_issue.model_dump_json = Mock(return_value='{"number": 123, "title": "Test", "body": ""}')

        logger = Mock()

        result, error = generate_branch_name(mock_issue, "/feature", "test123", logger)

        # Should return fallback, not error
        assert result is not None
        assert error is None
        assert "test123" in result
        assert validate_branch_name(result)

    @patch('adw_modules.workflow_ops.execute_template')
    def test_returns_fallback_on_invalid_llm_output(self, mock_execute):
        """Should return fallback when LLM gives invalid output."""
        mock_execute.return_value = Mock(
            success=True,
            output="This is not a valid branch name"
        )

        mock_issue = Mock()
        mock_issue.number = 456
        mock_issue.model_dump_json = Mock(return_value='{"number": 456, "title": "Test", "body": ""}')

        logger = Mock()

        result, error = generate_branch_name(mock_issue, "/bug", "bug456", logger)

        # Should return fallback, not error
        assert result is not None
        assert error is None
        assert validate_branch_name(result)

    @patch('adw_modules.workflow_ops.execute_template')
    def test_returns_fallback_on_exception(self, mock_execute):
        """Should return fallback when exception occurs."""
        mock_execute.side_effect = Exception("Network error")

        mock_issue = Mock()
        mock_issue.number = 789
        mock_issue.model_dump_json = Mock(return_value='{"number": 789, "title": "Test", "body": ""}')

        logger = Mock()

        result, error = generate_branch_name(mock_issue, "/chore", "chore789", logger)

        # Should return fallback, not raise exception
        assert result is not None
        assert error is None
        assert validate_branch_name(result)

    @patch('adw_modules.workflow_ops.execute_template')
    def test_uses_valid_llm_output_when_available(self, mock_execute):
        """Should use valid LLM output when provided."""
        mock_execute.return_value = Mock(
            success=True,
            output="feat-issue-999-adw-xyz999-user-auth"
        )

        mock_issue = Mock()
        mock_issue.number = 999
        mock_issue.model_dump_json = Mock(return_value='{"number": 999, "title": "Test", "body": ""}')

        logger = Mock()

        result, error = generate_branch_name(mock_issue, "/feature", "xyz999", logger)

        assert result == "feat-issue-999-adw-xyz999-user-auth"
        assert error is None
