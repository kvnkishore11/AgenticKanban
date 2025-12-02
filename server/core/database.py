"""
Database Connection Manager for AgenticKanban

Provides thread-safe SQLite connection management with connection pooling,
transaction support, and schema initialization.
"""

import sqlite3
import os
import logging
from pathlib import Path
from contextlib import contextmanager
from typing import Optional, Any, Dict, List
from threading import Lock

logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Manages SQLite database connections with thread-safe connection pooling.

    Features:
    - Thread-safe connection management
    - Automatic schema initialization
    - Transaction support with context managers
    - Migration tracking and execution
    - Connection health checks
    """

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize database manager.

        Args:
            db_path: Path to SQLite database file. If None, uses default location.
        """
        self._lock = Lock()
        self._initialized = False

        # Determine database path
        if db_path:
            self.db_path = Path(db_path)
        else:
            # Default: adws/database/agentickanban.db in project root
            project_root = self._get_project_root()
            self.db_path = project_root / "adws" / "database" / "agentickanban.db"

        # Ensure database directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Database manager initialized with path: {self.db_path}")

    def _get_project_root(self) -> Path:
        """
        Get the project root directory.

        Handles both main project and worktree environments.
        - If running from a worktree (trees/<adw_id>/server), goes up to main project
        - If running from main project (server), uses relative path
        """
        current_file = Path(__file__).resolve()
        # From server/core/database.py -> server/core -> server -> (root)
        current_root = current_file.parent.parent.parent

        # Check if we're in a worktree
        path_parts = current_root.parts
        if 'trees' in path_parts:
            # We're in a worktree, navigate to main project root
            trees_index = path_parts.index('trees')
            main_project_root = Path(*path_parts[:trees_index])
            logger.info(f"Detected worktree. Main project root: {main_project_root}")
            return main_project_root
        else:
            # We're in the main project
            logger.info(f"Detected main project. Using root: {current_root}")
            return current_root

    def initialize(self) -> None:
        """
        Initialize database with schema if not already initialized.

        This method is idempotent - safe to call multiple times.
        """
        with self._lock:
            if self._initialized:
                logger.debug("Database already initialized")
                return

            # Check if database file exists
            db_exists = self.db_path.exists()

            if not db_exists:
                logger.info(f"Creating new database at {self.db_path}")
                self._create_schema()
            else:
                logger.info(f"Using existing database at {self.db_path}")
                # Verify schema is up to date
                self._verify_schema()

            self._initialized = True
            logger.info("Database initialization complete")

    def _create_schema(self) -> None:
        """Create database schema from schema.sql file."""
        schema_file = self.db_path.parent / "schema.sql"

        # If schema file doesn't exist in main project, try worktree location
        if not schema_file.exists():
            # Try worktree schema.sql
            current_file = Path(__file__).resolve()
            worktree_root = current_file.parent.parent.parent  # server/core/database.py -> root
            worktree_schema = worktree_root / "adws" / "database" / "schema.sql"

            if worktree_schema.exists():
                schema_file = worktree_schema
                logger.info(f"Using worktree schema file: {schema_file}")
            else:
                raise FileNotFoundError(f"Schema file not found: {schema_file} or {worktree_schema}")

        # Read schema SQL
        with open(schema_file, 'r', encoding='utf-8') as f:
            schema_sql = f.read()

        # Execute schema SQL
        with self.get_connection() as conn:
            conn.executescript(schema_sql)
            conn.commit()

        logger.info(f"Schema created from {schema_file}")

    def _verify_schema(self) -> None:
        """Verify that required tables exist in the database."""
        required_tables = [
            'schema_migrations',
            'adw_states',
            'adw_activity_logs',
            'issue_tracker',
            'adw_deletions'
        ]

        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            existing_tables = {row[0] for row in cursor.fetchall()}

        missing_tables = set(required_tables) - existing_tables

        if missing_tables:
            logger.warning(f"Missing tables: {missing_tables}. Recreating schema.")
            self._create_schema()
        else:
            logger.debug("Schema verification passed")
            # Run migrations to add any missing columns
            self._run_migrations()

    def _run_migrations(self) -> None:
        """Run database migrations to add missing columns."""
        migrations = [
            # Migration 001: Add plan_file and all_adws columns
            {
                "version": "001_add_plan_file_all_adws",
                "columns": [
                    ("adw_states", "plan_file", "TEXT"),
                    ("adw_states", "all_adws", "TEXT"),
                ],
            },
        ]

        with self.transaction() as conn:
            for migration in migrations:
                version = migration["version"]

                # Check if migration already applied
                cursor = conn.execute(
                    "SELECT 1 FROM schema_migrations WHERE version = ?",
                    (version,)
                )
                if cursor.fetchone():
                    logger.debug(f"Migration {version} already applied")
                    continue

                # Get existing columns for each table
                for table, column, col_type in migration.get("columns", []):
                    cursor = conn.execute(f"PRAGMA table_info({table})")
                    existing_columns = {row[1] for row in cursor.fetchall()}

                    if column not in existing_columns:
                        logger.info(f"Adding column {column} to {table}")
                        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

                # Record migration
                conn.execute(
                    "INSERT INTO schema_migrations (version, description) VALUES (?, ?)",
                    (version, f"Added columns: {[c[1] for c in migration.get('columns', [])]}")
                )
                logger.info(f"Migration {version} applied successfully")

    @contextmanager
    def get_connection(self):
        """
        Context manager for database connections.

        Usage:
            with db_manager.get_connection() as conn:
                cursor = conn.execute("SELECT * FROM adw_states")
                results = cursor.fetchall()

        Yields:
            sqlite3.Connection: Database connection
        """
        conn = None
        try:
            conn = sqlite3.connect(
                str(self.db_path),
                check_same_thread=False,
                timeout=30.0
            )
            # Enable foreign key constraints
            conn.execute("PRAGMA foreign_keys = ON")
            # Return rows as dictionaries
            conn.row_factory = sqlite3.Row
            yield conn
        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

    @contextmanager
    def transaction(self):
        """
        Context manager for database transactions.

        Automatically commits on success, rolls back on exception.

        Usage:
            with db_manager.transaction() as conn:
                conn.execute("INSERT INTO adw_states (...) VALUES (...)")
                conn.execute("INSERT INTO adw_activity_logs (...) VALUES (...)")

        Yields:
            sqlite3.Connection: Database connection with transaction
        """
        with self.get_connection() as conn:
            try:
                yield conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.error(f"Transaction rolled back due to error: {e}")
                raise

    def execute_query(
        self,
        query: str,
        params: Optional[tuple] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a SELECT query and return results as list of dictionaries.

        Args:
            query: SQL query string
            params: Optional query parameters

        Returns:
            List of result dictionaries
        """
        with self.get_connection() as conn:
            cursor = conn.execute(query, params or ())
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def execute_update(
        self,
        query: str,
        params: Optional[tuple] = None
    ) -> int:
        """
        Execute an INSERT/UPDATE/DELETE query.

        Args:
            query: SQL query string
            params: Optional query parameters

        Returns:
            Number of affected rows
        """
        with self.transaction() as conn:
            cursor = conn.execute(query, params or ())
            return cursor.rowcount

    def execute_insert(
        self,
        query: str,
        params: Optional[tuple] = None
    ) -> int:
        """
        Execute an INSERT query and return the last inserted row ID.

        Args:
            query: SQL INSERT query string
            params: Optional query parameters

        Returns:
            Last inserted row ID
        """
        with self.transaction() as conn:
            cursor = conn.execute(query, params or ())
            return cursor.lastrowid

    def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the database connection.

        Returns:
            Dictionary with health check results
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.execute("SELECT COUNT(*) FROM adw_states")
                count = cursor.fetchone()[0]

            return {
                "healthy": True,
                "database_path": str(self.db_path),
                "database_exists": self.db_path.exists(),
                "adw_count": count,
                "message": "Database connection healthy"
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "healthy": False,
                "database_path": str(self.db_path),
                "error": str(e),
                "message": "Database connection unhealthy"
            }

    def get_table_info(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Get schema information for a table.

        Args:
            table_name: Name of the table

        Returns:
            List of column information dictionaries
        """
        query = f"PRAGMA table_info({table_name})"
        return self.execute_query(query)

    def get_all_tables(self) -> List[str]:
        """
        Get list of all tables in the database.

        Returns:
            List of table names
        """
        query = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        results = self.execute_query(query)
        return [row['name'] for row in results]

    def vacuum(self) -> None:
        """
        Vacuum the database to reclaim space and optimize performance.
        """
        with self.get_connection() as conn:
            conn.execute("VACUUM")
        logger.info("Database vacuumed successfully")

    def backup(self, backup_path: str) -> None:
        """
        Create a backup of the database.

        Args:
            backup_path: Path to backup file
        """
        import shutil
        backup_file = Path(backup_path)
        backup_file.parent.mkdir(parents=True, exist_ok=True)

        shutil.copy2(self.db_path, backup_file)
        logger.info(f"Database backed up to {backup_file}")

    def deduplicate_issue_numbers(self) -> Dict[str, Any]:
        """
        Deduplicate issue numbers in the issue_tracker table.

        For each set of duplicate issue numbers:
        1. Keep the oldest record (by created_at) with the original issue_number
        2. Reassign new sequential numbers to duplicates starting from MAX(issue_number) + 1
        3. Update corresponding adw_states.issue_number to match
        4. Log all reassignments for audit trail

        Returns:
            Dictionary with deduplication results
        """
        logger.info("Starting issue_number deduplication")

        reassignments = []

        with self.transaction() as conn:
            # Find all duplicate issue numbers
            duplicate_query = """
                SELECT issue_number, COUNT(*) as count
                FROM issue_tracker
                GROUP BY issue_number
                HAVING count > 1
                ORDER BY issue_number
            """
            cursor = conn.execute(duplicate_query)
            duplicates = cursor.fetchall()

            if not duplicates:
                logger.info("No duplicate issue numbers found")
                return {
                    "duplicates_found": 0,
                    "records_reassigned": 0,
                    "reassignments": []
                }

            logger.info(f"Found {len(duplicates)} sets of duplicate issue numbers")

            # Get the current maximum issue number
            max_query = "SELECT COALESCE(MAX(issue_number), 0) as max_num FROM issue_tracker"
            cursor = conn.execute(max_query)
            next_available_number = cursor.fetchone()['max_num'] + 1

            # Process each set of duplicates
            for dup_row in duplicates:
                issue_num = dup_row['issue_number']

                # Get all records with this issue number, ordered by created_at (oldest first)
                records_query = """
                    SELECT id, adw_id, issue_title, created_at
                    FROM issue_tracker
                    WHERE issue_number = ?
                    ORDER BY created_at ASC
                """
                cursor = conn.execute(records_query, (issue_num,))
                records = cursor.fetchall()

                # Keep the first (oldest) record, reassign the rest
                for idx, record in enumerate(records):
                    if idx == 0:
                        # Keep the oldest record with original number
                        logger.info(f"Keeping issue_number {issue_num} for record ID {record['id']} (oldest)")
                        continue

                    old_number = issue_num
                    new_number = next_available_number
                    next_available_number += 1

                    # Update issue_tracker
                    update_tracker_query = """
                        UPDATE issue_tracker
                        SET issue_number = ?
                        WHERE id = ?
                    """
                    conn.execute(update_tracker_query, (new_number, record['id']))

                    # Update corresponding adw_states if exists
                    if record['adw_id']:
                        update_adw_query = """
                            UPDATE adw_states
                            SET issue_number = ?
                            WHERE adw_id = ?
                        """
                        conn.execute(update_adw_query, (new_number, record['adw_id']))

                        logger.info(
                            f"Reassigned issue_number {old_number} -> {new_number} "
                            f"for ADW {record['adw_id']} (ID: {record['id']})"
                        )
                    else:
                        logger.info(
                            f"Reassigned issue_number {old_number} -> {new_number} "
                            f"for record ID {record['id']} (no ADW link)"
                        )

                    reassignments.append({
                        "record_id": record['id'],
                        "adw_id": record['adw_id'],
                        "old_issue_number": old_number,
                        "new_issue_number": new_number,
                        "issue_title": record['issue_title']
                    })

        result = {
            "duplicates_found": len(duplicates),
            "records_reassigned": len(reassignments),
            "reassignments": reassignments
        }

        logger.info(
            f"Deduplication complete: {result['duplicates_found']} duplicate sets, "
            f"{result['records_reassigned']} records reassigned"
        )

        return result

    def close(self) -> None:
        """
        Close the database manager and clean up resources.
        """
        with self._lock:
            self._initialized = False
        logger.info("Database manager closed")


# Global database manager instance
_db_manager: Optional[DatabaseManager] = None
_db_lock = Lock()


def get_db_manager() -> DatabaseManager:
    """
    Get the global database manager instance (singleton).

    Returns:
        DatabaseManager instance
    """
    global _db_manager

    if _db_manager is None:
        with _db_lock:
            if _db_manager is None:
                _db_manager = DatabaseManager()
                _db_manager.initialize()

    return _db_manager


def reset_db_manager() -> None:
    """Reset the global database manager instance (for testing)."""
    global _db_manager
    with _db_lock:
        if _db_manager:
            _db_manager.close()
        _db_manager = None
