"""Tests for merge workflow conflict detection and resolution module."""

from unittest.mock import patch, MagicMock, mock_open
import subprocess

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from utils.merge.conflicts import (
    check_merge_conflicts,
    invoke_claude_for_conflicts,
    report_conflicts_for_resolution,
    resolve_conflicts_with_claude,
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


class TestReportConflictsForResolution:
    """Tests for report_conflicts_for_resolution function.

    This function reports conflicts for manual resolution by the calling
    Claude Code session. It does NOT spawn a new Claude Code process.
    """

    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.path.exists')
    @patch('builtins.open', new_callable=mock_open, read_data='<<<<<<< HEAD\nfoo\n=======\nbar\n>>>>>>> branch')
    def test_reports_conflicts_with_markers(self, mock_file, mock_exists, mock_root, mock_logger):
        """Test that conflicts with markers are reported correctly."""
        mock_root.return_value = "/repo"
        mock_exists.return_value = True

        success, error = report_conflicts_for_resolution(
            "test1234", "feature/test", ["file1.py"], mock_logger
        )

        # Should always return False since conflicts require manual resolution
        assert success is False
        assert "file1.py" in error
        assert "conflict markers" in error or "require" in error.lower()
        mock_logger.info.assert_called()

    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.path.exists')
    def test_reports_missing_files(self, mock_exists, mock_root, mock_logger):
        """Test that missing files are reported."""
        mock_root.return_value = "/repo"
        mock_exists.return_value = False

        success, error = report_conflicts_for_resolution(
            "test1234", "feature/test", ["missing.py"], mock_logger
        )

        assert success is False
        assert "missing.py" in error

    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.path.exists')
    @patch('builtins.open', new_callable=mock_open, read_data='normal content')
    def test_reports_conflicts_without_markers(self, mock_file, mock_exists, mock_root, mock_logger):
        """Test reporting conflicts when file exists but has no markers."""
        mock_root.return_value = "/repo"
        mock_exists.return_value = True

        success, error = report_conflicts_for_resolution(
            "test1234", "feature/test", ["file.py"], mock_logger
        )

        assert success is False
        assert "file.py" in error

    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.path.exists')
    @patch('builtins.open', new_callable=mock_open, read_data='content')
    def test_reports_multiple_conflicts(self, mock_file, mock_exists, mock_root, mock_logger):
        """Test reporting multiple conflicting files."""
        mock_root.return_value = "/repo"
        mock_exists.return_value = True

        success, error = report_conflicts_for_resolution(
            "test1234", "feature/test", ["file1.py", "file2.py", "file3.py"], mock_logger
        )

        assert success is False
        assert "file1.py" in error
        assert "file2.py" in error
        assert "file3.py" in error
        assert "3 file(s)" in error


class TestResolveConflictsWithClaude:
    """Tests for resolve_conflicts_with_claude function.

    This function spawns Claude Code to automatically resolve conflicts.
    """

    @patch('utils.merge.conflicts.check_merge_conflicts')
    @patch('utils.merge.conflicts.prompt_claude_code')
    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.makedirs')
    def test_successful_resolution(self, mock_makedirs, mock_root, mock_prompt, mock_check, mock_logger):
        """Test successful conflict resolution with Claude Code."""
        mock_root.return_value = "/repo"
        # Mock successful Claude Code response
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.output = "Conflicts resolved successfully"
        mock_prompt.return_value = mock_response
        # Mock that conflicts are resolved after Claude runs
        mock_check.return_value = (False, [])

        success, error = resolve_conflicts_with_claude(
            "test1234", "feature/test", ["file1.py"], mock_logger
        )

        assert success is True
        assert error is None
        mock_prompt.assert_called_once()
        mock_logger.info.assert_called()

    @patch('utils.merge.conflicts.prompt_claude_code')
    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.makedirs')
    def test_claude_failure(self, mock_makedirs, mock_root, mock_prompt, mock_logger):
        """Test when Claude Code fails to run."""
        mock_root.return_value = "/repo"
        # Mock failed Claude Code response
        mock_response = MagicMock()
        mock_response.success = False
        mock_response.output = "Claude Code error"
        mock_prompt.return_value = mock_response

        success, error = resolve_conflicts_with_claude(
            "test1234", "feature/test", ["file1.py"], mock_logger
        )

        assert success is False
        assert "Claude Code failed" in error
        mock_logger.error.assert_called()

    @patch('utils.merge.conflicts.check_merge_conflicts')
    @patch('utils.merge.conflicts.prompt_claude_code')
    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.makedirs')
    def test_conflicts_remain_after_resolution(self, mock_makedirs, mock_root, mock_prompt, mock_check, mock_logger):
        """Test when Claude runs but conflicts still remain."""
        mock_root.return_value = "/repo"
        # Mock successful Claude Code response
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.output = "Attempted resolution"
        mock_prompt.return_value = mock_response
        # Mock that conflicts still exist after Claude runs
        mock_check.return_value = (True, ["file1.py"])

        success, error = resolve_conflicts_with_claude(
            "test1234", "feature/test", ["file1.py"], mock_logger
        )

        assert success is False
        assert "still have conflicts" in error
        mock_logger.error.assert_called()

    @patch('utils.merge.conflicts.check_merge_conflicts')
    @patch('utils.merge.conflicts.prompt_claude_code')
    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.makedirs')
    def test_multiple_files_resolved(self, mock_makedirs, mock_root, mock_prompt, mock_check, mock_logger):
        """Test resolution of multiple conflicting files."""
        mock_root.return_value = "/repo"
        mock_response = MagicMock()
        mock_response.success = True
        mock_prompt.return_value = mock_response
        mock_check.return_value = (False, [])

        success, error = resolve_conflicts_with_claude(
            "test1234", "feature/test", ["file1.py", "file2.py", "file3.py"], mock_logger
        )

        assert success is True
        assert error is None
        # Verify the prompt includes all files
        call_args = mock_prompt.call_args
        request = call_args[0][0]
        assert "file1.py" in request.prompt
        assert "file2.py" in request.prompt
        assert "file3.py" in request.prompt


class TestInvokeClaudeForConflicts:
    """Tests for invoke_claude_for_conflicts (alias for resolve_conflicts_with_claude)."""

    @patch('utils.merge.conflicts.check_merge_conflicts')
    @patch('utils.merge.conflicts.prompt_claude_code')
    @patch('utils.merge.conflicts.get_main_repo_root')
    @patch('os.makedirs')
    def test_alias_works(self, mock_makedirs, mock_root, mock_prompt, mock_check, mock_logger):
        """Test that invoke_claude_for_conflicts is an alias for resolve_conflicts_with_claude."""
        mock_root.return_value = "/repo"
        mock_response = MagicMock()
        mock_response.success = True
        mock_prompt.return_value = mock_response
        mock_check.return_value = (False, [])

        # invoke_claude_for_conflicts should now resolve conflicts with Claude
        success, error = invoke_claude_for_conflicts(
            "test1234", "feature/test", ["file.py"], mock_logger
        )

        # Should return success when Claude resolves conflicts
        assert success is True
        assert error is None
        mock_prompt.assert_called_once()


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
    def test_conflicts_resolved_successfully(self, mock_check, mock_invoke, mock_logger):
        """Test when conflicts are detected and resolved by Claude Code."""
        mock_check.return_value = (True, ["file1.py"])
        mock_invoke.return_value = (True, None)  # Claude resolved conflicts

        result = detect_and_resolve_conflicts(
            "test1234", "feature/test", "/repo", mock_logger
        )

        assert result.has_conflicts is True
        assert result.conflict_files == ["file1.py"]
        assert result.resolved is True
        assert result.error is None

    @patch('utils.merge.conflicts.invoke_claude_for_conflicts')
    @patch('utils.merge.conflicts.check_merge_conflicts')
    def test_conflicts_resolution_failed(self, mock_check, mock_invoke, mock_logger):
        """Test when conflicts are detected but Claude fails to resolve them."""
        mock_check.return_value = (True, ["file1.py"])
        mock_invoke.return_value = (False, "Claude Code failed to resolve conflicts")

        result = detect_and_resolve_conflicts(
            "test1234", "feature/test", "/repo", mock_logger
        )

        assert result.has_conflicts is True
        assert result.conflict_files == ["file1.py"]
        assert result.resolved is False
        assert "failed" in result.error.lower()
