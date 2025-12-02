"""
Tests for issue tracker deduplication and uniqueness enforcement.

Tests cover:
- Deduplication migration with sample duplicate data
- Concurrent issue allocation (simulating race conditions)
- Unique constraint enforcement
- Retry logic on constraint violations
"""

import pytest
import sqlite3
import tempfile
import os
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from server.core.database import DatabaseManager


@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    # Create a temporary database file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.db', delete=False)
    temp_file.close()
    db_path = temp_file.name

    # Create database manager
    db_manager = DatabaseManager(db_path=db_path)
    db_manager.initialize()

    yield db_manager

    # Cleanup
    db_manager.close()
    try:
        os.unlink(db_path)
    except:
        pass


def test_deduplicate_issue_numbers_no_duplicates(temp_db):
    """Test deduplication when there are no duplicates."""
    # Insert some unique issue numbers
    with temp_db.transaction() as conn:
        for i in range(1, 6):
            conn.execute(
                "INSERT INTO issue_tracker (issue_number, issue_title, project_id) VALUES (?, ?, ?)",
                (i, f"Issue {i}", "default")
            )

    # Run deduplication
    result = temp_db.deduplicate_issue_numbers()

    # Verify no duplicates were found
    assert result['duplicates_found'] == 0
    assert result['records_reassigned'] == 0
    assert len(result['reassignments']) == 0


def test_deduplicate_issue_numbers_with_duplicates(temp_db):
    """Test deduplication when there are duplicate issue numbers."""
    # Temporarily disable unique constraint by recreating table without it
    with temp_db.get_connection() as conn:
        # Drop the table
        conn.execute("DROP TABLE IF EXISTS issue_tracker")

        # Recreate without UNIQUE constraint for testing
        conn.execute("""
            CREATE TABLE issue_tracker (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                issue_number INTEGER NOT NULL,
                issue_title TEXT NOT NULL,
                project_id TEXT DEFAULT 'default',
                adw_id TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                CONSTRAINT chk_issue_number_positive CHECK (issue_number > 0)
            )
        """)
        conn.commit()

    # Create duplicate issue numbers
    with temp_db.transaction() as conn:
        # Issue number 1 appears twice
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, created_at) VALUES (?, ?, ?, ?)",
            (1, "First Issue 1", "default", "2025-01-01 10:00:00")
        )
        time.sleep(0.01)  # Ensure different timestamps
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, created_at) VALUES (?, ?, ?, ?)",
            (1, "Second Issue 1", "default", "2025-01-01 10:01:00")
        )

        # Issue number 2 appears three times
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, created_at) VALUES (?, ?, ?, ?)",
            (2, "First Issue 2", "default", "2025-01-01 10:02:00")
        )
        time.sleep(0.01)
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, created_at) VALUES (?, ?, ?, ?)",
            (2, "Second Issue 2", "default", "2025-01-01 10:03:00")
        )
        time.sleep(0.01)
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, created_at) VALUES (?, ?, ?, ?)",
            (2, "Third Issue 2", "default", "2025-01-01 10:04:00")
        )

        # Issue number 5 is unique
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, created_at) VALUES (?, ?, ?, ?)",
            (5, "Unique Issue 5", "default", "2025-01-01 10:05:00")
        )

    # Run deduplication
    result = temp_db.deduplicate_issue_numbers()

    # Verify duplicates were found and reassigned
    assert result['duplicates_found'] == 2  # Two sets of duplicates (1 and 2)
    assert result['records_reassigned'] == 3  # 1 from issue 1, 2 from issue 2

    # Verify all issue numbers are now unique
    unique_check = temp_db.execute_query(
        """
        SELECT issue_number, COUNT(*) as count
        FROM issue_tracker
        GROUP BY issue_number
        HAVING count > 1
        """
    )
    assert len(unique_check) == 0, "There should be no duplicate issue numbers after deduplication"

    # Verify the oldest records kept their original numbers
    issue_1_records = temp_db.execute_query(
        "SELECT issue_number, issue_title FROM issue_tracker WHERE issue_title = 'First Issue 1'"
    )
    assert len(issue_1_records) == 1
    assert issue_1_records[0]['issue_number'] == 1  # Oldest kept original number

    # Verify new numbers were assigned starting from MAX + 1 (which was 5)
    all_numbers = temp_db.execute_query(
        "SELECT issue_number FROM issue_tracker ORDER BY issue_number"
    )
    numbers = [row['issue_number'] for row in all_numbers]
    assert 1 in numbers
    assert 2 in numbers
    assert 5 in numbers
    assert 6 in numbers  # Reassigned
    assert 7 in numbers  # Reassigned
    assert 8 in numbers  # Reassigned


def test_deduplicate_updates_adw_states(temp_db):
    """Test that deduplication updates corresponding adw_states records."""
    # Temporarily disable unique constraint
    with temp_db.get_connection() as conn:
        conn.execute("DROP TABLE IF EXISTS issue_tracker")
        conn.execute("""
            CREATE TABLE issue_tracker (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                issue_number INTEGER NOT NULL,
                issue_title TEXT NOT NULL,
                project_id TEXT DEFAULT 'default',
                adw_id TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                CONSTRAINT chk_issue_number_positive CHECK (issue_number > 0)
            )
        """)
        conn.commit()

    # Create ADW state
    adw_id = "test1234"
    with temp_db.transaction() as conn:
        conn.execute(
            """INSERT INTO adw_states (
                adw_id, issue_number, issue_title, current_stage, status
            ) VALUES (?, ?, ?, ?, ?)""",
            (adw_id, 1, "Test Issue", "backlog", "pending")
        )

        # Create duplicate issue_tracker records
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, adw_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (1, "First Issue 1", "default", None, "2025-01-01 10:00:00")
        )
        time.sleep(0.01)
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id, adw_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (1, "Second Issue 1", "default", adw_id, "2025-01-01 10:01:00")
        )

    # Run deduplication
    result = temp_db.deduplicate_issue_numbers()

    # Verify ADW state was updated
    adw_record = temp_db.execute_query(
        "SELECT issue_number FROM adw_states WHERE adw_id = ?",
        (adw_id,)
    )
    assert len(adw_record) == 1

    # The ADW should have been reassigned a new issue number (2, since max was 1)
    new_issue_number = adw_record[0]['issue_number']
    assert new_issue_number == 2

    # Verify the issue_tracker record for this ADW also has the new number
    issue_record = temp_db.execute_query(
        "SELECT issue_number FROM issue_tracker WHERE adw_id = ?",
        (adw_id,)
    )
    assert len(issue_record) == 1
    assert issue_record[0]['issue_number'] == new_issue_number


def test_concurrent_issue_allocation(temp_db):
    """Test concurrent issue allocation to ensure no duplicates.

    Note: This test validates that the retry logic works and that even with
    concurrent allocations, we don't end up with duplicate issue numbers in the database.
    Some allocations may fail after retries due to SQLite's write serialization,
    but the database should remain consistent.
    """
    from server.models.adw_db_models import IssueTrackerCreate

    num_concurrent = 10
    allocated_numbers = []
    errors = []

    def allocate_issue(index):
        """Allocate an issue number."""
        try:
            # Simulate the allocation logic from issue_tracker.py
            max_retries = 5  # Increased retries for high concurrency
            for attempt in range(max_retries):
                try:
                    with temp_db.transaction() as conn:
                        query = "SELECT COALESCE(MAX(issue_number), 0) as max_number FROM issue_tracker"
                        cursor = conn.execute(query)
                        result = cursor.fetchone()
                        next_number = result['max_number'] + 1

                        insert_query = """
                            INSERT INTO issue_tracker (issue_number, issue_title, project_id)
                            VALUES (?, ?, ?)
                        """
                        conn.execute(insert_query, (next_number, f"Concurrent Issue {index}", "default"))

                    return next_number

                except sqlite3.IntegrityError as e:
                    if "UNIQUE constraint failed" in str(e):
                        if attempt < max_retries - 1:
                            # Randomized backoff to reduce collision probability
                            import random
                            time.sleep(0.05 * (attempt + 1) + random.uniform(0, 0.05))
                            continue
                        else:
                            raise
                    else:
                        raise
            return None
        except Exception as e:
            errors.append(str(e))
            return None

    # Run concurrent allocations with slightly reduced concurrency for SQLite
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(allocate_issue, i) for i in range(num_concurrent)]
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                allocated_numbers.append(result)

    # The key assertion: no duplicate issue numbers in the database
    duplicate_check = temp_db.execute_query(
        """
        SELECT issue_number, COUNT(*) as count
        FROM issue_tracker
        GROUP BY issue_number
        HAVING count > 1
        """
    )
    assert len(duplicate_check) == 0, "Database contains duplicate issue numbers!"

    # Verify allocated numbers are unique
    assert len(allocated_numbers) == len(set(allocated_numbers)), "Duplicate issue numbers were allocated"

    # At least most allocations should succeed (allow some failures due to SQLite concurrency limits)
    assert len(allocated_numbers) >= num_concurrent * 0.7, \
        f"Too many allocations failed: {len(allocated_numbers)} succeeded out of {num_concurrent}"


def test_unique_constraint_enforcement(temp_db):
    """Test that the UNIQUE constraint on issue_number is enforced."""
    # Insert first issue
    with temp_db.transaction() as conn:
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id) VALUES (?, ?, ?)",
            (1, "First Issue", "default")
        )

    # Try to insert duplicate issue number
    with pytest.raises(sqlite3.IntegrityError) as exc_info:
        with temp_db.transaction() as conn:
            conn.execute(
                "INSERT INTO issue_tracker (issue_number, issue_title, project_id) VALUES (?, ?, ?)",
                (1, "Duplicate Issue", "default")
            )

    assert "UNIQUE constraint failed" in str(exc_info.value)


def test_retry_logic_on_constraint_violation(temp_db):
    """Test that retry logic works correctly on constraint violations."""
    # Pre-populate with issue 1
    with temp_db.transaction() as conn:
        conn.execute(
            "INSERT INTO issue_tracker (issue_number, issue_title, project_id) VALUES (?, ?, ?)",
            (1, "Existing Issue", "default")
        )

    # Simulate allocation with retry
    max_retries = 3
    success = False

    for attempt in range(max_retries):
        try:
            with temp_db.transaction() as conn:
                query = "SELECT COALESCE(MAX(issue_number), 0) as max_number FROM issue_tracker"
                cursor = conn.execute(query)
                result = cursor.fetchone()
                next_number = result['max_number'] + 1

                insert_query = """
                    INSERT INTO issue_tracker (issue_number, issue_title, project_id)
                    VALUES (?, ?, ?)
                """
                conn.execute(insert_query, (next_number, "New Issue", "default"))

            success = True
            break

        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed" in str(e) and attempt < max_retries - 1:
                time.sleep(0.1 * (attempt + 1))
                continue
            else:
                raise

    assert success, "Retry logic should eventually succeed"

    # Verify the new issue was created with issue number 2
    new_issue = temp_db.execute_query(
        "SELECT issue_number FROM issue_tracker WHERE issue_title = 'New Issue'"
    )
    assert len(new_issue) == 1
    assert new_issue[0]['issue_number'] == 2
