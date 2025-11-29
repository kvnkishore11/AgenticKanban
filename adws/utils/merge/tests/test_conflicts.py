"""Tests for merge workflow conflict detection and resolution module."""

from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.conflicts import (
    check_merge_conflicts,
    invoke_claude_for_conflicts,
    detect_and_resolve_conflicts,
)


class TestCheckMergeConflicts:
    """Tests for check_merge_conflicts function."""

    @patch('subprocess.run')
    def test_no_conflicts(self, mock_run, mock_logger):
        """Test when there are no merge conflicts."""
        mock_run.return_value = MagicMock(
            stdout="",
            returncode=0
        )

        has_conflicts, conflict_files = check_merge_conflicts("/repo", mock_logger)

        assert has_conflicts is False
        assert conflict_files == []

    @patch('subprocess.run')
    def test_with_conflicts(self, mock_run, mock_logger):
        """Test when there are merge conflicts."""
        mock_run.return_value = MagicMock(
            stdout="src/file1.py\nsrc/file2.py\n",
            returncode=0
        )

        has_conflicts, conflict_files = check_merge_conflicts("/repo", mock_logger)

        assert has_conflicts is True
        assert conflict_files == ["src/file1.py", "src/file2.py"]
        mock_logger.warning.assert_called()


class TestInvokeClaudeForConflicts:
    """Tests for invoke_claude_for_conflicts function."""

    @patch('utils.merge.conflicts.check_merge_conflicts')
    @patch('subprocess.run')
    def test_successful_resolution(self, mock_run, mock_check, mock_logger):
        """Test successful conflict resolution with Claude."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Conflicts resolved",
            stderr=""
        )
        mock_check.return_value = (False, [])

        success, error = invoke_claude_for_conflicts(
            "test1234", "feature/test", ["file1.py"], mock_logger
        )

        assert success is True
        assert error is None
        mock_logger.info.assert_called()

    @patch('subprocess.run')
    def test_claude_failure(self, mock_run, mock_logger):
        """Test when Claude Code fails."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="Claude Code error"
        )

        success, error = invoke_claude_for_conflicts(
            "test1234", "feature/test", ["file1.py"], mock_logger
        )

        assert success is False
        assert "Claude Code failed" in error
        mock_logger.error.assert_called()

    @patch('utils.merge.conflicts.check_merge_conflicts')
    @patch('subprocess.run')
    def test_unresolved_conflicts(self, mock_run, mock_check, mock_logger):
        """Test when conflicts remain after Claude resolution."""
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="Attempted resolution",
            stderr=""
        )
        mock_check.return_value = (True, ["file1.py"])

        success, error = invoke_claude_for_conflicts(
            "test1234", "feature/test", ["file1.py"], mock_logger
        )

        assert success is False
        assert "Conflicts still remain" in error


class TestDetectAndResolveConflicts:
    """Tests for detect_and_resolve_conflicts function."""

    @patch('utils.merge.conflicts.check_merge_conflicts')
    def test_no_conflicts_detected(self, mock_check, mock_logger):
        """Test when no conflicts are detected."""
        mock_check.return_value = (False, [])

        result = detect_and_resolve_conflicts(
            "test1234", "feature/test", "/repo", mock_logger
        )

        assert result.has_conflicts is False
        assert result.conflict_files == []
        assert result.resolved is True
        assert result.error is None

    @patch('utils.merge.conflicts.invoke_claude_for_conflicts')
    @patch('utils.merge.conflicts.check_merge_conflicts')
    def test_conflicts_resolved(self, mock_check, mock_invoke, mock_logger):
        """Test when conflicts are detected and resolved."""
        mock_check.return_value = (True, ["file1.py"])
        mock_invoke.return_value = (True, None)

        result = detect_and_resolve_conflicts(
            "test1234", "feature/test", "/repo", mock_logger
        )

        assert result.has_conflicts is True
        assert result.conflict_files == ["file1.py"]
        assert result.resolved is True
        assert result.error is None

    @patch('utils.merge.conflicts.invoke_claude_for_conflicts')
    @patch('utils.merge.conflicts.check_merge_conflicts')
    def test_conflicts_not_resolved(self, mock_check, mock_invoke, mock_logger):
        """Test when conflicts cannot be resolved."""
        mock_check.return_value = (True, ["file1.py"])
        mock_invoke.return_value = (False, "Could not resolve")

        result = detect_and_resolve_conflicts(
            "test1234", "feature/test", "/repo", mock_logger
        )

        assert result.has_conflicts is True
        assert result.conflict_files == ["file1.py"]
        assert result.resolved is False
        assert result.error == "Could not resolve"
