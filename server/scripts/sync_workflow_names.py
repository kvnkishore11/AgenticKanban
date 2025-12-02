#!/usr/bin/env python3
"""
Script to sync workflow_name from JSON files to database.

Reads adw_state.json files and extracts workflow stages from 'all_adws' array,
then updates the database with a derived workflow_name.
"""

import os
import sqlite3
import json
import logging
from pathlib import Path
from typing import Optional, List

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_project_root() -> Path:
    """Get the main project root directory."""
    current_file = Path(__file__).resolve()
    current_root = current_file.parent.parent.parent

    path_parts = current_root.parts
    if 'trees' in path_parts:
        trees_index = path_parts.index('trees')
        main_project_root = Path(*path_parts[:trees_index])
        return main_project_root
    return current_root


def derive_workflow_name(all_adws: List[str]) -> Optional[str]:
    """
    Derive workflow_name from all_adws array.

    Examples:
        ['adw_plan_iso', 'adw_build_iso'] -> 'adw_plan_build_iso'
        ['adw_plan_iso', 'adw_build_iso', 'adw_test_iso'] -> 'adw_plan_build_test_iso'
    """
    if not all_adws:
        return None

    # Extract stage names from adw names
    stages = []
    for adw in all_adws:
        # adw_plan_iso -> plan, adw_build_iso -> build, etc.
        parts = adw.replace('adw_', '').replace('_iso', '').split('_')
        if parts:
            stages.append(parts[0])

    if not stages:
        return None

    # Construct workflow name: adw_plan_build_test_iso
    return f"adw_{'_'.join(stages)}_iso"


def sync_workflow_names(dry_run: bool = False) -> dict:
    """Sync workflow names from JSON files to database."""
    stats = {
        "scanned": 0,
        "updated": 0,
        "skipped": 0,
        "errors": 0
    }

    project_root = get_project_root()
    agents_dir = project_root / "agents"
    db_path = project_root / "adws" / "database" / "agentickanban.db"

    if not db_path.exists():
        logger.error(f"Database not found at {db_path}")
        return stats

    if not agents_dir.exists():
        logger.error(f"Agents directory not found at {agents_dir}")
        return stats

    conn = sqlite3.connect(str(db_path), timeout=5.0)
    cursor = conn.cursor()

    # Get all ADWs from database
    cursor.execute("SELECT adw_id, workflow_name FROM adw_states WHERE deleted_at IS NULL")
    db_adws = {row[0]: row[1] for row in cursor.fetchall()}

    # Scan agents directory
    for item in agents_dir.iterdir():
        if not item.is_dir():
            continue

        adw_id = item.name
        if len(adw_id) != 8 or not adw_id.isalnum():
            continue

        stats["scanned"] += 1
        state_file = item / "adw_state.json"

        if not state_file.exists():
            stats["skipped"] += 1
            continue

        try:
            with open(state_file, 'r') as f:
                data = json.load(f)

            all_adws = data.get('all_adws', [])
            if not all_adws:
                stats["skipped"] += 1
                continue

            workflow_name = derive_workflow_name(all_adws)
            if not workflow_name:
                stats["skipped"] += 1
                continue

            # Check if ADW exists in database
            if adw_id not in db_adws:
                logger.debug(f"ADW {adw_id} not in database, skipping")
                stats["skipped"] += 1
                continue

            # Check if already has workflow_name
            if db_adws[adw_id]:
                logger.debug(f"ADW {adw_id} already has workflow_name: {db_adws[adw_id]}")
                stats["skipped"] += 1
                continue

            if dry_run:
                logger.info(f"[DRY RUN] Would update {adw_id}: workflow_name = {workflow_name}")
            else:
                cursor.execute(
                    "UPDATE adw_states SET workflow_name = ? WHERE adw_id = ?",
                    (workflow_name, adw_id)
                )
                logger.info(f"Updated {adw_id}: workflow_name = {workflow_name}")

            stats["updated"] += 1

        except Exception as e:
            logger.error(f"Error processing {adw_id}: {e}")
            stats["errors"] += 1

    if not dry_run:
        conn.commit()
    conn.close()

    return stats


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Sync workflow names from JSON to database")
    parser.add_argument("--dry-run", action="store_true", help="Only report, don't update")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("=" * 60)
    logger.info("Workflow Name Sync")
    logger.info("=" * 60)

    stats = sync_workflow_names(dry_run=args.dry_run)

    logger.info("")
    logger.info("=" * 60)
    logger.info("Summary")
    logger.info("=" * 60)
    logger.info(f"ADW directories scanned: {stats['scanned']}")
    logger.info(f"Updated:                 {stats['updated']}")
    logger.info(f"Skipped:                 {stats['skipped']}")
    logger.info(f"Errors:                  {stats['errors']}")
    logger.info("=" * 60)

    if args.dry_run:
        logger.info("DRY RUN - No changes made")


if __name__ == "__main__":
    main()
