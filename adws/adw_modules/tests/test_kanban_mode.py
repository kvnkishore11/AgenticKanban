"""Tests for kanban_mode module functionality."""


class MockADWState:
    """Mock ADWState for testing."""

    def __init__(self, data=None):
        self.data = data or {}

    def get(self, key, default=None):
        return self.data.get(key, default)

    def update(self, **kwargs):
        self.data.update(kwargs)


class TestAddPatchToHistory:
    """Test cases for add_patch_to_history function."""

    def test_add_first_patch_to_empty_history(self):
        """Test adding first patch to empty history."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

        from adw_modules.kanban_mode import add_patch_to_history

        state = MockADWState(data={"adw_id": "test1234"})

        add_patch_to_history(
            state=state,
            patch_number=1,
            patch_reason="Fix bug in login",
            patch_file="patches/patch_001.md",
            success=True
        )

        patch_history = state.get("patch_history")
        assert len(patch_history) == 1

        patch_entry = patch_history[0]
        assert patch_entry["patch_number"] == 1
        assert patch_entry["patch_reason"] == "Fix bug in login"
        assert patch_entry["patch_file"] == "patches/patch_001.md"
        assert patch_entry["success"] is True
        assert patch_entry["adw_id"] == "test1234"
        assert patch_entry["status"] == "completed"
        assert "timestamp" in patch_entry

    def test_add_patch_stores_adw_id(self):
        """Test that adw_id is stored in patch entry."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

        from adw_modules.kanban_mode import add_patch_to_history

        state = MockADWState(data={"adw_id": "abc12345"})

        add_patch_to_history(
            state=state,
            patch_number=1,
            patch_reason="Test patch",
            patch_file="test.md",
            success=True
        )

        patch_entry = state.get("patch_history")[0]
        assert patch_entry["adw_id"] == "abc12345"

    def test_add_patch_with_success_false(self):
        """Test adding failed patch."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

        from adw_modules.kanban_mode import add_patch_to_history

        state = MockADWState(data={"adw_id": "fail1234"})

        add_patch_to_history(
            state=state,
            patch_number=1,
            patch_reason="Failed patch",
            patch_file="patches/fail.md",
            success=False
        )

        patch_entry = state.get("patch_history")[0]
        assert patch_entry["success"] is False
        assert patch_entry["status"] == "failed"

    def test_add_multiple_patches(self):
        """Test adding multiple patches to history."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

        from adw_modules.kanban_mode import add_patch_to_history

        state = MockADWState(data={"adw_id": "multi123"})

        # Add first patch
        add_patch_to_history(
            state=state,
            patch_number=1,
            patch_reason="First patch",
            patch_file="patch_001.md",
            success=True
        )

        # Add second patch
        add_patch_to_history(
            state=state,
            patch_number=2,
            patch_reason="Second patch",
            patch_file="patch_002.md",
            success=True
        )

        patch_history = state.get("patch_history")
        assert len(patch_history) == 2
        assert patch_history[0]["patch_number"] == 1
        assert patch_history[1]["patch_number"] == 2

    def test_patch_entry_has_required_fields(self):
        """Test that patch entry has all required fields."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

        from adw_modules.kanban_mode import add_patch_to_history

        state = MockADWState(data={"adw_id": "fields12"})

        add_patch_to_history(
            state=state,
            patch_number=1,
            patch_reason="Test",
            patch_file="test.md",
            success=True
        )

        patch_entry = state.get("patch_history")[0]

        # Check all required fields for frontend compatibility
        required_fields = [
            "patch_number",
            "patch_reason",
            "patch_file",
            "timestamp",
            "success",
            "adw_id",
            "status"
        ]

        for field in required_fields:
            assert field in patch_entry, f"Missing required field: {field}"


class TestGetNextPatchNumber:
    """Test cases for get_next_patch_number function."""

    def test_first_patch_number(self):
        """Test getting first patch number with empty history."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

        from adw_modules.kanban_mode import get_next_patch_number

        state = MockADWState(data={})

        patch_number = get_next_patch_number(state)
        assert patch_number == 1

    def test_next_patch_number_with_existing_patches(self):
        """Test getting next patch number with existing patches."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

        from adw_modules.kanban_mode import get_next_patch_number

        state = MockADWState(data={
            "patch_history": [
                {"patch_number": 1},
                {"patch_number": 2}
            ]
        })

        patch_number = get_next_patch_number(state)
        assert patch_number == 3
