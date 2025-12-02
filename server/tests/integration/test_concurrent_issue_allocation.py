"""
Integration tests for concurrent issue allocation.

Simulates real-world scenarios with multiple concurrent ADW creations
to verify that issue numbers are allocated uniquely without duplicates.
"""

import pytest
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from fastapi.testclient import TestClient
from server import app
from server.core.database import get_db_manager, reset_db_manager

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown():
    """Setup and teardown for each test."""
    # Reset database manager before each test
    reset_db_manager()
    yield
    # Cleanup after test
    reset_db_manager()


def test_concurrent_adw_creation_with_issue_allocation():
    """
    Test concurrent ADW creation with automatic issue allocation.

    Simulates 10 concurrent ADW creations, each requesting a unique issue number.
    Verifies that all allocations succeed and no duplicates are created.
    """
    num_concurrent = 10
    results = []
    errors = []

    def create_adw_with_issue(index):
        """Create an ADW by first allocating an issue number."""
        try:
            # Allocate issue number
            issue_data = {
                "issue_title": f"Concurrent Test Issue {index}",
                "project_id": "default"
            }
            issue_response = client.post("/api/issues/allocate", json=issue_data)

            if issue_response.status_code != 201:
                return {
                    "success": False,
                    "error": f"Issue allocation failed: {issue_response.json()}"
                }

            issue_number = issue_response.json()["issue_number"]

            # Create ADW with allocated issue number
            adw_data = {
                "adw_id": f"test{index:04d}",
                "issue_number": issue_number,
                "issue_title": f"Concurrent Test Issue {index}",
                "current_stage": "backlog",
                "status": "pending"
            }

            adw_response = client.post("/api/adws", json=adw_data)

            if adw_response.status_code != 201:
                return {
                    "success": False,
                    "error": f"ADW creation failed: {adw_response.json()}"
                }

            return {
                "success": True,
                "issue_number": issue_number,
                "adw_id": f"test{index:04d}"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    # Run concurrent ADW creations
    with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
        futures = [executor.submit(create_adw_with_issue, i) for i in range(num_concurrent)]
        for future in as_completed(futures):
            result = future.result()
            if result["success"]:
                results.append(result)
            else:
                errors.append(result["error"])

    # Verify all allocations succeeded
    assert len(errors) == 0, f"Errors occurred during concurrent creation: {errors}"
    assert len(results) == num_concurrent, f"Expected {num_concurrent} successful creations, got {len(results)}"

    # Extract issue numbers
    issue_numbers = [r["issue_number"] for r in results]

    # Verify all issue numbers are unique
    assert len(issue_numbers) == len(set(issue_numbers)), \
        f"Duplicate issue numbers detected: {issue_numbers}"

    # Verify issue numbers are sequential
    sorted_numbers = sorted(issue_numbers)
    assert sorted_numbers == list(range(1, num_concurrent + 1)), \
        f"Issue numbers should be sequential from 1, got {sorted_numbers}"

    # Verify database state
    db_manager = get_db_manager()

    # Check issue_tracker for duplicates
    duplicate_check = db_manager.execute_query(
        """
        SELECT issue_number, COUNT(*) as count
        FROM issue_tracker
        GROUP BY issue_number
        HAVING count > 1
        """
    )
    assert len(duplicate_check) == 0, \
        f"Duplicate issue numbers found in database: {duplicate_check}"

    # Verify all ADWs were created
    adws = db_manager.execute_query("SELECT COUNT(*) as count FROM adw_states")
    assert adws[0]["count"] == num_concurrent, \
        f"Expected {num_concurrent} ADWs in database, found {adws[0]['count']}"


def test_concurrent_issue_allocation_only():
    """
    Test concurrent issue allocation without ADW creation.

    Directly tests the issue allocation endpoint with high concurrency.
    """
    num_concurrent = 20
    allocated_numbers = []
    errors = []

    def allocate_issue(index):
        """Allocate an issue number."""
        try:
            issue_data = {
                "issue_title": f"Concurrent Issue {index}",
                "project_id": "default"
            }
            response = client.post("/api/issues/allocate", json=issue_data)

            if response.status_code == 201:
                return response.json()["issue_number"]
            else:
                errors.append(f"Status {response.status_code}: {response.json()}")
                return None

        except Exception as e:
            errors.append(str(e))
            return None

    # Run concurrent allocations
    with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
        futures = [executor.submit(allocate_issue, i) for i in range(num_concurrent)]
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                allocated_numbers.append(result)

    # Verify all allocations succeeded
    assert len(errors) == 0, f"Errors occurred: {errors}"
    assert len(allocated_numbers) == num_concurrent, \
        f"Expected {num_concurrent} allocations, got {len(allocated_numbers)}"

    # Verify all numbers are unique
    assert len(allocated_numbers) == len(set(allocated_numbers)), \
        f"Duplicate issue numbers: {allocated_numbers}"

    # Verify sequential allocation
    sorted_numbers = sorted(allocated_numbers)
    assert sorted_numbers == list(range(1, num_concurrent + 1)), \
        f"Expected sequential 1-{num_concurrent}, got {sorted_numbers}"


def test_mixed_concurrent_operations():
    """
    Test mixed concurrent operations: issue allocation + ADW creation + updates.

    This simulates a realistic scenario where multiple operations happen simultaneously.
    """
    num_operations = 15
    results = {"allocations": [], "adw_creations": [], "errors": []}

    def mixed_operation(index):
        """Perform different operations based on index."""
        try:
            if index % 3 == 0:
                # Allocate issue only
                issue_data = {
                    "issue_title": f"Mixed Test Issue {index}",
                    "project_id": "default"
                }
                response = client.post("/api/issues/allocate", json=issue_data)
                if response.status_code == 201:
                    return ("allocation", response.json()["issue_number"])
                else:
                    return ("error", f"Issue allocation failed: {response.json()}")

            elif index % 3 == 1:
                # Allocate issue and create ADW
                issue_data = {
                    "issue_title": f"Mixed Test Issue {index}",
                    "project_id": "default"
                }
                issue_response = client.post("/api/issues/allocate", json=issue_data)

                if issue_response.status_code != 201:
                    return ("error", f"Issue allocation failed: {issue_response.json()}")

                issue_number = issue_response.json()["issue_number"]

                adw_data = {
                    "adw_id": f"mix{index:04d}",
                    "issue_number": issue_number,
                    "issue_title": f"Mixed Test Issue {index}"
                }

                adw_response = client.post("/api/adws", json=adw_data)
                if adw_response.status_code == 201:
                    return ("adw_creation", issue_number)
                else:
                    return ("error", f"ADW creation failed: {adw_response.json()}")

            else:
                # Allocate and create, then update
                issue_data = {
                    "issue_title": f"Mixed Test Issue {index}",
                    "project_id": "default"
                }
                issue_response = client.post("/api/issues/allocate", json=issue_data)

                if issue_response.status_code != 201:
                    return ("error", f"Issue allocation failed: {issue_response.json()}")

                issue_number = issue_response.json()["issue_number"]

                adw_data = {
                    "adw_id": f"mix{index:04d}",
                    "issue_number": issue_number,
                    "issue_title": f"Mixed Test Issue {index}"
                }

                adw_response = client.post("/api/adws", json=adw_data)

                if adw_response.status_code != 201:
                    return ("error", f"ADW creation failed: {adw_response.json()}")

                # Update the ADW
                update_data = {"status": "in_progress"}
                update_response = client.patch(f"/api/adws/mix{index:04d}", json=update_data)

                if update_response.status_code == 200:
                    return ("adw_creation", issue_number)
                else:
                    return ("error", f"ADW update failed: {update_response.json()}")

        except Exception as e:
            return ("error", str(e))

    # Run mixed concurrent operations
    with ThreadPoolExecutor(max_workers=num_operations) as executor:
        futures = [executor.submit(mixed_operation, i) for i in range(num_operations)]
        for future in as_completed(futures):
            op_type, result = future.result()
            if op_type == "allocation":
                results["allocations"].append(result)
            elif op_type == "adw_creation":
                results["adw_creations"].append(result)
            elif op_type == "error":
                results["errors"].append(result)

    # Verify no errors
    assert len(results["errors"]) == 0, f"Errors occurred: {results['errors']}"

    # Collect all issue numbers
    all_issue_numbers = results["allocations"] + results["adw_creations"]

    # Verify all are unique
    assert len(all_issue_numbers) == len(set(all_issue_numbers)), \
        f"Duplicate issue numbers in mixed operations: {all_issue_numbers}"

    # Verify database has no duplicates
    db_manager = get_db_manager()
    duplicate_check = db_manager.execute_query(
        """
        SELECT issue_number, COUNT(*) as count
        FROM issue_tracker
        GROUP BY issue_number
        HAVING count > 1
        """
    )
    assert len(duplicate_check) == 0, \
        f"Duplicate issue numbers found in database after mixed operations: {duplicate_check}"


def test_rapid_sequential_allocation():
    """
    Test rapid sequential issue allocation.

    Tests that sequential allocations (not concurrent) also maintain uniqueness.
    """
    num_allocations = 50
    allocated_numbers = []

    for i in range(num_allocations):
        issue_data = {
            "issue_title": f"Sequential Issue {i}",
            "project_id": "default"
        }
        response = client.post("/api/issues/allocate", json=issue_data)
        assert response.status_code == 201, f"Allocation {i} failed: {response.json()}"
        allocated_numbers.append(response.json()["issue_number"])

    # Verify all are unique
    assert len(allocated_numbers) == len(set(allocated_numbers)), \
        "Duplicate numbers in sequential allocation"

    # Verify sequential
    assert allocated_numbers == list(range(1, num_allocations + 1)), \
        f"Expected sequential 1-{num_allocations}, got {allocated_numbers}"
