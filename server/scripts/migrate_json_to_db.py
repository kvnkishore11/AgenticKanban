#!/usr/bin/env python3
"""
Migration script to import existing JSON-based ADW states into the database.

This script:
1. Scans the agents/ directory for ADW folders
2. Reads adw_state.json files
3. Imports data into the SQLite database
4. Logs migration results
5. Keeps original JSON files intact for backward compatibility
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import get_db_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_project_root() -> Path:
    """Get the project root directory."""
    # From server/scripts/migrate_json_to_db.py -> server/scripts -> server -> (root)
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


def scan_adw_directories(agents_dir: Path) -> List[Path]:
    """
    Scan agents directory for valid ADW folders.

    Args:
        agents_dir: Path to agents directory

    Returns:
        List of paths to ADW directories
    """
    adw_dirs = []

    if not agents_dir.exists():
        logger.warning(f"Agents directory not found: {agents_dir}")
        return adw_dirs

    for item in agents_dir.iterdir():
        if not item.is_dir():
            continue

        # Check if directory name looks like an ADW ID (8 alphanumeric characters)
        adw_id = item.name
        if len(adw_id) == 8 and adw_id.isalnum():
            adw_dirs.append(item)

    logger.info(f"Found {len(adw_dirs)} ADW directories")
    return adw_dirs


def read_adw_state_json(adw_dir: Path) -> Optional[Dict[str, Any]]:
    """
    Read and parse adw_state.json from an ADW directory.

    Args:
        adw_dir: Path to ADW directory

    Returns:
        Parsed JSON data or None if file doesn't exist or is invalid
    """
    state_file = adw_dir / "adw_state.json"

    if not state_file.exists():
        logger.debug(f"adw_state.json not found in {adw_dir.name}")
        return None

    try:
        with open(state_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse adw_state.json in {adw_dir.name}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error reading adw_state.json in {adw_dir.name}: {e}")
        return None


def import_adw_to_database(adw_data: Dict[str, Any], db_manager) -> bool:
    """
    Import ADW state data into database.

    Args:
        adw_data: Parsed ADW state data from JSON
        db_manager: Database manager instance

    Returns:
        True if successful, False otherwise
    """
    adw_id = adw_data.get('adw_id')
    if not adw_id:
        logger.error("ADW data missing adw_id field")
        return False

    try:
        # Check if ADW already exists in database
        existing = db_manager.execute_query(
            "SELECT id FROM adw_states WHERE adw_id = ?",
            (adw_id,)
        )
        if existing:
            logger.info(f"ADW {adw_id} already exists in database, skipping")
            return "skipped"

        # Determine current stage and status based on completed flag
        completed = adw_data.get('completed', False)
        current_stage = "ready-to-merge" if completed else "backlog"
        status = "completed" if completed else "pending"

        # Prepare JSON fields
        issue_json_str = json.dumps(adw_data.get('issue_json')) if adw_data.get('issue_json') else None
        orchestrator_state_str = json.dumps(adw_data.get('orchestrator')) if adw_data.get('orchestrator') else None
        patch_history_str = json.dumps(adw_data.get('patch_history', []))
        all_adws_str = json.dumps(adw_data.get('all_adws', []))

        # Parse issue class (remove leading slash if present)
        issue_class = adw_data.get('issue_class', '')
        if issue_class and issue_class.startswith('/'):
            issue_class = issue_class[1:]

        # Extract issue title from issue_json
        issue_title = None
        issue_body = None
        if adw_data.get('issue_json'):
            issue_title = adw_data['issue_json'].get('title')
            issue_body = adw_data['issue_json'].get('body')

        # Insert into database
        query = """
            INSERT INTO adw_states (
                adw_id, issue_number, issue_title, issue_body, issue_class,
                branch_name, worktree_path, current_stage, status,
                workflow_name, model_set, data_source, issue_json,
                orchestrator_state, plan_file, all_adws,
                patch_file, patch_history, patch_source_mode,
                backend_port, websocket_port, frontend_port, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        params = (
            adw_id,
            adw_data.get('issue_number'),
            issue_title,
            issue_body,
            issue_class,
            adw_data.get('branch_name'),
            adw_data.get('worktree_path'),
            current_stage,
            status,
            None,  # workflow_name - not in original JSON
            adw_data.get('model_set', 'base'),
            adw_data.get('data_source', 'kanban'),
            issue_json_str,
            orchestrator_state_str,
            adw_data.get('plan_file'),
            all_adws_str,
            adw_data.get('patch_file'),
            patch_history_str,
            adw_data.get('patch_source_mode'),
            adw_data.get('backend_port'),
            adw_data.get('websocket_port'),
            adw_data.get('frontend_port'),
            datetime.utcnow().isoformat() if completed else None
        )

        db_manager.execute_insert(query, params)

        # Log migration activity
        log_query = """
            INSERT INTO adw_activity_logs (adw_id, event_type, event_data)
            VALUES (?, ?, ?)
        """
        log_data = json.dumps({
            "migrated_from": "json",
            "timestamp": datetime.utcnow().isoformat(),
            "source_file": "agents/{}/adw_state.json".format(adw_id)
        })
        db_manager.execute_insert(log_query, (adw_id, "workflow_started", log_data))

        logger.info(f"Successfully imported ADW {adw_id} to database")
        return True

    except Exception as e:
        logger.error(f"Error importing ADW {adw_id} to database: {e}", exc_info=True)
        return False


def migrate_json_to_database(dry_run: bool = False) -> Dict[str, int]:
    """
    Main migration function.

    Args:
        dry_run: If True, scan files but don't import to database

    Returns:
        Dictionary with migration statistics
    """
    stats = {
        "scanned": 0,
        "valid_json": 0,
        "imported": 0,
        "skipped": 0,
        "already_exists": 0,
        "errors": 0
    }

    # Get project root and agents directory
    project_root = get_project_root()
    agents_dir = project_root / "agents"

    logger.info(f"Starting migration from {agents_dir}")
    logger.info(f"Dry run: {dry_run}")

    # Initialize database manager
    db_manager = get_db_manager()

    # Scan for ADW directories
    adw_dirs = scan_adw_directories(agents_dir)
    stats["scanned"] = len(adw_dirs)

    # Process each ADW directory
    for adw_dir in adw_dirs:
        adw_id = adw_dir.name

        # Read JSON state
        adw_data = read_adw_state_json(adw_dir)
        if adw_data is None:
            logger.warning(f"Skipping {adw_id} - could not read adw_state.json")
            stats["skipped"] += 1
            continue

        stats["valid_json"] += 1

        if dry_run:
            logger.info(f"[DRY RUN] Would import ADW {adw_id}")
            continue

        # Import to database
        result = import_adw_to_database(adw_data, db_manager)
        if result == "skipped":
            stats["already_exists"] += 1
        elif result is True:
            stats["imported"] += 1
        else:
            stats["errors"] += 1

    return stats


def main():
    """Main entry point for migration script."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate ADW states from JSON files to database"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan files but don't import to database"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Run migration
    logger.info("=" * 60)
    logger.info("ADW State Migration: JSON to Database")
    logger.info("=" * 60)

    stats = migrate_json_to_database(dry_run=args.dry_run)

    # Print summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("Migration Summary")
    logger.info("=" * 60)
    logger.info(f"ADW directories scanned:  {stats['scanned']}")
    logger.info(f"Valid JSON files found:   {stats['valid_json']}")
    logger.info(f"Newly imported:           {stats['imported']}")
    logger.info(f"Already in database:      {stats['already_exists']}")
    logger.info(f"Skipped (no JSON):        {stats['skipped']}")
    logger.info(f"Errors:                   {stats['errors']}")
    logger.info("=" * 60)

    if args.dry_run:
        logger.info("DRY RUN - No changes made to database")
    else:
        logger.info("Migration complete!")

    # Exit with error code if there were errors
    sys.exit(1 if stats['errors'] > 0 else 0)


if __name__ == "__main__":
    main()
