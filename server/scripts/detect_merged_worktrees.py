#!/usr/bin/env python3
"""
Script to detect merged worktrees and update their status in the database.

This script:
1. Queries the database for ADWs with branch names
2. Checks which branches have been merged into main
3. Updates the status of merged ADWs to 'completed' and stage to 'ready-to-merge'
4. Logs the update activity for audit trail
"""

import os
import sqlite3
import subprocess
import logging
from pathlib import Path
from typing import List, Tuple, Optional
from datetime import datetime, timezone
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_project_root() -> Path:
    """Get the main project root directory (not worktree)."""
    current_file = Path(__file__).resolve()
    current_root = current_file.parent.parent.parent

    # Check if we're in a worktree
    path_parts = current_root.parts
    if 'trees' in path_parts:
        # Navigate to main project root
        trees_index = path_parts.index('trees')
        main_project_root = Path(*path_parts[:trees_index])
        logger.info(f"Detected worktree. Main project root: {main_project_root}")
        return main_project_root
    else:
        logger.info(f"Detected main project. Using root: {current_root}")
        return current_root


def get_db_path() -> Path:
    """Get the database path."""
    project_root = get_project_root()
    return project_root / "adws" / "database" / "agentickanban.db"


def get_merged_branches(project_root: Path, base_branch: str = "main") -> List[str]:
    """
    Get list of branches that have been merged into the base branch.

    Args:
        project_root: Path to the git repository root
        base_branch: The base branch to check merges against (default: main)

    Returns:
        List of branch names that have been merged
    """
    try:
        result = subprocess.run(
            ["git", "branch", "--merged", base_branch],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            check=True
        )

        branches = []
        for line in result.stdout.strip().split('\n'):
            branch = line.strip().lstrip('* ')
            if branch and branch != base_branch:
                branches.append(branch)

        logger.info(f"Found {len(branches)} branches merged into {base_branch}")
        return branches

    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to get merged branches: {e}")
        return []


def get_adws_with_branches(db_path: Path) -> List[Tuple[str, str, str, str]]:
    """
    Get ADWs that have branch names and are not yet completed.

    Args:
        db_path: Path to the SQLite database

    Returns:
        List of tuples (adw_id, branch_name, current_stage, status)
    """
    if not db_path.exists():
        logger.error(f"Database not found at {db_path}")
        return []

    try:
        conn = sqlite3.connect(str(db_path), timeout=5.0)
        cursor = conn.cursor()

        # Get ADWs with branch names that are NOT already completed
        cursor.execute("""
            SELECT adw_id, branch_name, current_stage, status
            FROM adw_states
            WHERE branch_name IS NOT NULL
            AND branch_name != ''
            AND deleted_at IS NULL
            AND status != 'completed'
        """)

        results = cursor.fetchall()
        conn.close()

        logger.info(f"Found {len(results)} ADWs with branches not yet completed")
        return results

    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
        return []


def update_adw_to_completed(
    db_path: Path,
    adw_id: str,
    branch_name: str,
    old_stage: str,
    old_status: str
) -> bool:
    """
    Update an ADW to completed status.

    Args:
        db_path: Path to the SQLite database
        adw_id: The ADW ID to update
        branch_name: The branch name (for logging)
        old_stage: Previous stage value
        old_status: Previous status value

    Returns:
        True if successful, False otherwise
    """
    try:
        conn = sqlite3.connect(str(db_path), timeout=5.0)
        cursor = conn.cursor()

        # Update the ADW state
        cursor.execute("""
            UPDATE adw_states
            SET current_stage = 'ready-to-merge',
                status = 'completed',
                completed_at = ?
            WHERE adw_id = ?
        """, (datetime.now(timezone.utc).isoformat(), adw_id))

        # Log the activity (stage change will be logged by trigger, but add explicit log)
        cursor.execute("""
            INSERT INTO adw_activity_logs (adw_id, event_type, field_changed, old_value, new_value, event_data)
            VALUES (?, 'workflow_completed', 'status', ?, 'completed', ?)
        """, (
            adw_id,
            old_status,
            json.dumps({
                "reason": "branch_merged_to_main",
                "branch_name": branch_name,
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "previous_stage": old_stage
            })
        ))

        conn.commit()
        conn.close()

        logger.info(f"Updated ADW {adw_id} ({branch_name}) to completed")
        return True

    except sqlite3.Error as e:
        logger.error(f"Failed to update ADW {adw_id}: {e}")
        return False


def detect_and_update_merged_worktrees(dry_run: bool = False) -> dict:
    """
    Main function to detect merged worktrees and update their status.

    Args:
        dry_run: If True, only report what would be updated without making changes

    Returns:
        Dictionary with statistics
    """
    stats = {
        "total_adws_with_branches": 0,
        "merged_branches_found": 0,
        "adws_updated": 0,
        "adws_already_completed": 0,
        "errors": 0
    }

    project_root = get_project_root()
    db_path = get_db_path()

    if not db_path.exists():
        logger.error(f"Database not found at {db_path}")
        return stats

    # Get merged branches from git
    merged_branches = get_merged_branches(project_root)
    merged_branches_set = set(merged_branches)

    # Get ADWs with branches that are not completed
    adws_with_branches = get_adws_with_branches(db_path)
    stats["total_adws_with_branches"] = len(adws_with_branches)

    # Find ADWs whose branches have been merged
    for adw_id, branch_name, current_stage, status in adws_with_branches:
        if branch_name in merged_branches_set:
            stats["merged_branches_found"] += 1

            if dry_run:
                logger.info(f"[DRY RUN] Would update ADW {adw_id} ({branch_name}): {current_stage}/{status} -> ready-to-merge/completed")
            else:
                if update_adw_to_completed(db_path, adw_id, branch_name, current_stage, status):
                    stats["adws_updated"] += 1
                else:
                    stats["errors"] += 1

    return stats


def main():
    """Main entry point for the script."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Detect merged worktrees and update their status in the database"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only report what would be updated without making changes"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("=" * 60)
    logger.info("Merged Worktree Detection")
    logger.info("=" * 60)

    stats = detect_and_update_merged_worktrees(dry_run=args.dry_run)

    # Print summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("Summary")
    logger.info("=" * 60)
    logger.info(f"ADWs with branches (not completed): {stats['total_adws_with_branches']}")
    logger.info(f"Merged branches found:              {stats['merged_branches_found']}")
    logger.info(f"ADWs updated:                       {stats['adws_updated']}")
    logger.info(f"Errors:                             {stats['errors']}")
    logger.info("=" * 60)

    if args.dry_run:
        logger.info("DRY RUN - No changes made to database")
    else:
        logger.info("Detection complete!")

    # Exit with error code if there were errors
    import sys
    sys.exit(1 if stats['errors'] > 0 else 0)


if __name__ == "__main__":
    main()
