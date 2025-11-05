"""
Tests for FileTracker module

Tests file tracking, git diff generation, and summary data preparation.
"""

import pytest
import subprocess
from pathlib import Path
from server.modules.file_tracker import FileTracker


@pytest.fixture
def temp_git_repo(tmp_path):
    """Create a temporary git repository for testing"""
    repo_path = tmp_path / "test_repo"
    repo_path.mkdir()

    # Initialize git repo
    subprocess.run(["git", "init"], cwd=repo_path, check=True, capture_output=True)
    subprocess.run(
        ["git", "config", "user.email", "test@example.com"],
        cwd=repo_path,
        check=True,
        capture_output=True
    )
    subprocess.run(
        ["git", "config", "user.name", "Test User"],
        cwd=repo_path,
        check=True,
        capture_output=True
    )

    # Create and commit an initial file
    test_file = repo_path / "test.py"
    test_file.write_text("def hello():\n    print('Hello')\n")

    subprocess.run(["git", "add", "."], cwd=repo_path, check=True, capture_output=True)
    subprocess.run(
        ["git", "commit", "-m", "Initial commit"],
        cwd=repo_path,
        check=True,
        capture_output=True
    )

    return repo_path


class TestFileTrackerBasic:
    """Basic file tracking functionality tests"""

    def test_initialization(self):
        """Test FileTracker initialization"""
        tracker = FileTracker(adw_id="test123")

        assert tracker.adw_id == "test123"
        assert tracker.repo_path == Path.cwd()
        assert len(tracker._read_files) == 0
        assert len(tracker._modified_files) == 0

    def test_initialization_with_repo_path(self, tmp_path):
        """Test FileTracker initialization with custom repo path"""
        tracker = FileTracker(adw_id="test123", repo_path=str(tmp_path))

        assert tracker.adw_id == "test123"
        assert tracker.repo_path == tmp_path

    def test_track_read_file(self):
        """Test tracking read operations"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/file.py")

        tracked = tracker.get_tracked_files()
        assert "/path/to/file.py" in tracked["read"]
        assert "/path/to/file.py" not in tracked["modified"]

    def test_track_multiple_read_files(self):
        """Test tracking multiple read operations"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/file1.py")
        tracker.track_read("/path/to/file2.py")
        tracker.track_read("/path/to/file3.py")

        tracked = tracker.get_tracked_files()
        assert len(tracked["read"]) == 3
        assert "/path/to/file1.py" in tracked["read"]
        assert "/path/to/file2.py" in tracked["read"]
        assert "/path/to/file3.py" in tracked["read"]

    def test_track_modified_file(self):
        """Test tracking modified operations"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_modified("/path/to/file.py")

        tracked = tracker.get_tracked_files()
        assert "/path/to/file.py" in tracked["modified"]
        assert "/path/to/file.py" not in tracked["read"]

    def test_track_read_and_modified(self):
        """Test tracking both read and modified operations on same file"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/file.py")
        tracker.track_modified("/path/to/file.py")

        tracked = tracker.get_tracked_files()
        assert "/path/to/file.py" in tracked["read"]
        assert "/path/to/file.py" in tracked["modified"]

    def test_track_duplicate_reads(self):
        """Test that duplicate reads don't create duplicate entries"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/file.py")
        tracker.track_read("/path/to/file.py")
        tracker.track_read("/path/to/file.py")

        tracked = tracker.get_tracked_files()
        assert len(tracked["read"]) == 1
        assert "/path/to/file.py" in tracked["read"]


class TestGitDiffGeneration:
    """Git diff generation tests"""

    def test_git_diff_for_modified_file(self, temp_git_repo):
        """Test generating git diff for a modified file"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        # Modify the test file
        test_file = temp_git_repo / "test.py"
        test_file.write_text("def hello():\n    print('Hello, World!')\n")

        # Track modification and generate diff
        tracker.track_modified(str(test_file))
        diff = tracker.get_file_diff(str(test_file))

        assert diff is not None
        assert "-    print('Hello')" in diff
        assert "+    print('Hello, World!')" in diff

    def test_git_diff_for_unmodified_file(self, temp_git_repo):
        """Test generating git diff for an unmodified file"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        test_file = temp_git_repo / "test.py"
        diff = tracker.get_file_diff(str(test_file))

        # Should return empty diff for unmodified file
        assert diff == ""

    def test_git_diff_for_nonexistent_file(self, temp_git_repo):
        """Test generating git diff for a file that doesn't exist"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        diff = tracker.get_file_diff(str(temp_git_repo / "nonexistent.py"))

        assert diff is None

    def test_git_diff_caching(self, temp_git_repo):
        """Test that git diffs are cached"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        # Modify file
        test_file = temp_git_repo / "test.py"
        test_file.write_text("def hello():\n    print('Hello, World!')\n")

        # Generate diff twice
        diff1 = tracker.get_file_diff(str(test_file))
        diff2 = tracker.get_file_diff(str(test_file))

        # Should be identical (from cache)
        assert diff1 == diff2
        assert str(test_file) in tracker._file_diffs

    def test_git_diff_truncation(self, temp_git_repo):
        """Test that large diffs are truncated"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        # Create a file with many lines
        test_file = temp_git_repo / "large.py"
        content = "\n".join([f"line{i} = {i}" for i in range(2000)])
        test_file.write_text(content)

        # Add to git
        subprocess.run(["git", "add", "."], cwd=temp_git_repo, check=True, capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", "Add large file"],
            cwd=temp_git_repo,
            check=True,
            capture_output=True
        )

        # Modify all lines
        modified_content = "\n".join([f"modified_line{i} = {i}" for i in range(2000)])
        test_file.write_text(modified_content)

        # Generate diff
        diff = tracker.get_file_diff(str(test_file))

        assert diff is not None
        assert "truncated" in diff.lower()


class TestFileSummaryGeneration:
    """File summary generation tests"""

    def test_generate_summary_with_diff(self, temp_git_repo):
        """Test generating file summary with diff"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        # Modify file
        test_file = temp_git_repo / "test.py"
        test_file.write_text("def hello():\n    print('Hello, World!')\n    return True\n")

        # Generate summary
        summary = tracker.generate_file_summary(str(test_file))

        assert summary["file_path"] == str(test_file)
        assert summary["lines_added"] > 0
        assert summary["lines_removed"] > 0
        assert summary["diff"] is not None
        assert "timestamp" in summary

    def test_generate_summary_without_diff(self, temp_git_repo):
        """Test generating file summary for file without diff"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        test_file = temp_git_repo / "nonexistent.py"

        # Generate summary
        summary = tracker.generate_file_summary(str(test_file))

        assert summary["file_path"] == str(test_file)
        assert summary["lines_added"] == 0
        assert summary["lines_removed"] == 0
        assert summary["diff"] is None

    def test_summary_caching(self, temp_git_repo):
        """Test that summaries are cached"""
        tracker = FileTracker(adw_id="test123", repo_path=str(temp_git_repo))

        # Modify file
        test_file = temp_git_repo / "test.py"
        test_file.write_text("def hello():\n    print('Hello, World!')\n")

        # Generate summary twice
        summary1 = tracker.generate_file_summary(str(test_file))
        summary2 = tracker.generate_file_summary(str(test_file))

        # Should be identical (from cache)
        assert summary1 == summary2
        assert str(test_file) in tracker._file_summaries


class TestStatistics:
    """Statistics and utility method tests"""

    def test_get_statistics_empty(self):
        """Test statistics for empty tracker"""
        tracker = FileTracker(adw_id="test123")
        stats = tracker.get_statistics()

        assert stats["files_read"] == 0
        assert stats["files_modified"] == 0
        assert stats["total_files"] == 0

    def test_get_statistics_with_files(self):
        """Test statistics with tracked files"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/file1.py")
        tracker.track_read("/path/to/file2.py")
        tracker.track_modified("/path/to/file2.py")
        tracker.track_modified("/path/to/file3.py")

        stats = tracker.get_statistics()

        assert stats["files_read"] == 2
        assert stats["files_modified"] == 2
        assert stats["total_files"] == 3  # file1, file2, file3 (file2 counted once)

    def test_is_file_tracked(self):
        """Test checking if file is tracked"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/read.py")
        tracker.track_modified("/path/to/modified.py")

        # Check read file
        result = tracker.is_file_tracked("/path/to/read.py")
        assert result["read"] is True
        assert result["modified"] is False

        # Check modified file
        result = tracker.is_file_tracked("/path/to/modified.py")
        assert result["read"] is False
        assert result["modified"] is True

        # Check untracked file
        result = tracker.is_file_tracked("/path/to/untracked.py")
        assert result["read"] is False
        assert result["modified"] is False

    def test_clear(self):
        """Test clearing all tracking data"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/file1.py")
        tracker.track_modified("/path/to/file2.py")

        # Clear
        tracker.clear()

        # Verify cleared
        tracked = tracker.get_tracked_files()
        assert len(tracked["read"]) == 0
        assert len(tracked["modified"]) == 0

        stats = tracker.get_statistics()
        assert stats["total_files"] == 0

    def test_export_data(self):
        """Test exporting all tracking data"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("/path/to/file1.py")
        tracker.track_modified("/path/to/file2.py")

        # Export data
        data = tracker.export_data()

        assert data["adw_id"] == "test123"
        assert "/path/to/file1.py" in data["files"]["read"]
        assert "/path/to/file2.py" in data["files"]["modified"]
        assert "diffs" in data
        assert "summaries" in data
        assert "statistics" in data
        assert data["statistics"]["files_read"] == 1
        assert data["statistics"]["files_modified"] == 1


class TestThreadSafety:
    """Thread safety tests"""

    def test_concurrent_tracking(self):
        """Test that tracking is safe with concurrent operations"""
        import threading

        tracker = FileTracker(adw_id="test123")

        def track_reads():
            for i in range(100):
                tracker.track_read(f"/path/to/file{i}.py")

        def track_modifications():
            for i in range(100):
                tracker.track_modified(f"/path/to/file{i}.py")

        # Run concurrently
        thread1 = threading.Thread(target=track_reads)
        thread2 = threading.Thread(target=track_modifications)

        thread1.start()
        thread2.start()

        thread1.join()
        thread2.join()

        # Verify all files tracked
        tracked = tracker.get_tracked_files()
        assert len(tracked["read"]) == 100
        assert len(tracked["modified"]) == 100


class TestEdgeCases:
    """Edge case tests"""

    def test_empty_file_path(self):
        """Test tracking empty file path"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("")

        tracked = tracker.get_tracked_files()
        assert "" in tracked["read"]

    def test_special_characters_in_path(self):
        """Test tracking file path with special characters"""
        tracker = FileTracker(adw_id="test123")
        special_path = "/path/to/file with spaces & special@chars.py"
        tracker.track_read(special_path)

        tracked = tracker.get_tracked_files()
        assert special_path in tracked["read"]

    def test_relative_vs_absolute_paths(self):
        """Test tracking both relative and absolute paths"""
        tracker = FileTracker(adw_id="test123")
        tracker.track_read("relative/path/file.py")
        tracker.track_read("/absolute/path/file.py")

        tracked = tracker.get_tracked_files()
        assert "relative/path/file.py" in tracked["read"]
        assert "/absolute/path/file.py" in tracked["read"]
        assert len(tracked["read"]) == 2
