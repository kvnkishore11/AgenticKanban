"""
File Tracker Module

Tracks file read and write operations during workflow execution.
Generates git diffs for modified files and prepares data for AI summarization.
"""

import subprocess
from typing import Dict, List, Set, Optional, Any
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class FileTracker:
    """
    Tracks file read and write operations during workflow execution.

    This class monitors file operations (Read, Write, Edit) and generates
    git diffs for modified files. It's designed to be instantiated per
    workflow execution (per adw_id) to ensure proper isolation.

    Attributes:
        adw_id: Workflow execution identifier
        repo_path: Path to git repository root
        _read_files: Set of file paths that have been read
        _modified_files: Set of file paths that have been modified
        _file_diffs: Cache of generated git diffs per file
        _file_summaries: Cache of file summary metadata
    """

    def __init__(self, adw_id: str, repo_path: Optional[str] = None):
        """
        Initialize FileTracker for a specific workflow execution.

        Args:
            adw_id: Workflow execution identifier
            repo_path: Path to git repository root (defaults to current working directory)
        """
        self.adw_id = adw_id
        self.repo_path = Path(repo_path) if repo_path else Path.cwd()
        self._read_files: Set[str] = set()
        self._modified_files: Set[str] = set()
        self._file_diffs: Dict[str, str] = {}
        self._file_summaries: Dict[str, Dict[str, Any]] = {}

        logger.info(f"FileTracker initialized for adw_id={adw_id}, repo_path={self.repo_path}")

    def track_read(self, file_path: str) -> None:
        """
        Track a file read operation.

        Args:
            file_path: Path to the file that was read
        """
        self._read_files.add(file_path)
        logger.debug(f"[{self.adw_id}] Tracked read: {file_path}")

    def track_modified(self, file_path: str) -> None:
        """
        Track a file modification operation.

        Args:
            file_path: Path to the file that was modified
        """
        self._modified_files.add(file_path)
        logger.debug(f"[{self.adw_id}] Tracked modified: {file_path}")

    def get_file_diff(self, file_path: str, timeout: int = 5) -> Optional[str]:
        """
        Generate git diff for a modified file.

        This method uses subprocess to run `git diff` and capture the output.
        Large diffs (>1000 lines) are truncated to prevent memory issues.

        Args:
            file_path: Path to the file to diff
            timeout: Maximum seconds to wait for git command (default: 5)

        Returns:
            Git diff string, or None if diff generation failed
        """
        # Check cache first
        if file_path in self._file_diffs:
            return self._file_diffs[file_path]

        # Verify file exists
        full_path = Path(file_path)
        if not full_path.exists():
            logger.warning(f"[{self.adw_id}] File not found for diff: {file_path}")
            return None

        try:
            # Run git diff command
            result = subprocess.run(
                ["git", "diff", str(file_path)],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.repo_path
            )

            if result.returncode == 0:
                diff = result.stdout

                # Truncate large diffs
                lines = diff.split("\n")
                if len(lines) > 1000:
                    diff = "\n".join(lines[:1000]) + "\n... (truncated, showing first 1000 lines)"
                    logger.warning(f"[{self.adw_id}] Truncated large diff for {file_path}")

                # Cache the diff
                self._file_diffs[file_path] = diff
                logger.debug(f"[{self.adw_id}] Generated diff for {file_path} ({len(lines)} lines)")

                return diff
            else:
                # Git command failed (possibly not a git repo or file not tracked)
                error_msg = result.stderr or "Git diff failed"
                logger.warning(f"[{self.adw_id}] Git diff failed for {file_path}: {error_msg}")
                return None

        except subprocess.TimeoutExpired:
            logger.error(f"[{self.adw_id}] Git diff timed out for {file_path}")
            return "Diff generation timed out"

        except FileNotFoundError:
            logger.error(f"[{self.adw_id}] Git command not found")
            return "Git not installed"

        except Exception as e:
            logger.error(f"[{self.adw_id}] Error generating diff for {file_path}: {str(e)}")
            return f"Error generating diff: {str(e)}"

    def get_tracked_files(self) -> Dict[str, List[str]]:
        """
        Get all tracked files.

        Returns:
            Dictionary with 'read' and 'modified' keys containing lists of file paths
        """
        return {
            "read": sorted(list(self._read_files)),
            "modified": sorted(list(self._modified_files))
        }

    def generate_file_summary(self, file_path: str, diff: Optional[str] = None) -> Dict[str, Any]:
        """
        Prepare file change metadata for AI summarization.

        This method analyzes the diff and extracts statistics like lines added/removed.
        The returned data is used by the SummarizationService to generate human-readable summaries.

        Args:
            file_path: Path to the file
            diff: Git diff string (if not provided, will be generated)

        Returns:
            Dictionary with file change metadata:
                - file_path: Path to the file
                - lines_added: Number of lines added
                - lines_removed: Number of lines deleted
                - diff: Full git diff string
                - timestamp: When the summary was generated
        """
        # Check cache first
        if file_path in self._file_summaries and diff is None:
            return self._file_summaries[file_path]

        # Generate diff if not provided
        if diff is None:
            diff = self.get_file_diff(file_path)

        # Handle missing diff
        if not diff:
            summary_data = {
                "file_path": file_path,
                "lines_added": 0,
                "lines_removed": 0,
                "diff": None,
                "timestamp": datetime.utcnow().isoformat()
            }
            self._file_summaries[file_path] = summary_data
            return summary_data

        # Count added/removed lines (lines starting with + or -, excluding diff markers)
        lines = diff.split("\n")
        lines_added = len([line for line in lines if line.startswith("+") and not line.startswith("+++")])
        lines_removed = len([line for line in lines if line.startswith("-") and not line.startswith("---")])

        summary_data = {
            "file_path": file_path,
            "lines_added": lines_added,
            "lines_removed": lines_removed,
            "diff": diff,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Cache the summary
        self._file_summaries[file_path] = summary_data

        logger.debug(
            f"[{self.adw_id}] Generated summary for {file_path}: "
            f"+{lines_added} -{lines_removed}"
        )

        return summary_data

    def get_statistics(self) -> Dict[str, int]:
        """
        Get tracking statistics.

        Returns:
            Dictionary with file tracking statistics:
                - files_read: Number of files read
                - files_modified: Number of files modified
                - total_files: Total unique files accessed
        """
        return {
            "files_read": len(self._read_files),
            "files_modified": len(self._modified_files),
            "total_files": len(self._read_files | self._modified_files)
        }

    def is_file_tracked(self, file_path: str) -> Dict[str, bool]:
        """
        Check if a file is being tracked.

        Args:
            file_path: Path to check

        Returns:
            Dictionary with 'read' and 'modified' booleans
        """
        return {
            "read": file_path in self._read_files,
            "modified": file_path in self._modified_files
        }

    def clear(self) -> None:
        """
        Clear all tracking data.

        This should be called when workflow execution completes or
        when you need to reset the tracker.
        """
        self._read_files.clear()
        self._modified_files.clear()
        self._file_diffs.clear()
        self._file_summaries.clear()
        logger.info(f"[{self.adw_id}] Cleared all tracking data")

    def export_data(self) -> Dict[str, Any]:
        """
        Export all tracking data for persistence or export.

        Returns:
            Dictionary containing all tracked data:
                - adw_id: Workflow execution ID
                - files_read: List of read files
                - files_modified: List of modified files
                - diffs: Dictionary of file paths to diffs
                - summaries: Dictionary of file paths to summary metadata
                - statistics: File tracking statistics
        """
        return {
            "adw_id": self.adw_id,
            "files": {
                "read": sorted(list(self._read_files)),
                "modified": sorted(list(self._modified_files))
            },
            "diffs": self._file_diffs,
            "summaries": self._file_summaries,
            "statistics": self.get_statistics()
        }
