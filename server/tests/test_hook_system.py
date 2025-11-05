"""
Tests for Hook System module

Tests hook registration, execution, priorities, and integration patterns.
"""

import pytest
import asyncio
from server.modules.hook_system import (
    HookSystem,
    HookType,
    HookPriority,
    Hook,
    with_hooks
)


class TestHookSystemBasic:
    """Basic hook system functionality tests"""

    def test_initialization(self):
        """Test HookSystem initialization"""
        hook_system = HookSystem()

        assert hook_system.get_hook_count() == 0
        assert hook_system.get_execution_count() == 0

        # Verify all hook types are initialized
        for hook_type in HookType:
            assert hook_system.get_hook_count(hook_type) == 0

    def test_register_hook(self):
        """Test registering a hook"""
        hook_system = HookSystem()

        def test_callback(context):
            pass

        hook_system.register_hook(HookType.PRE_TOOL_USE, test_callback)

        assert hook_system.get_hook_count(HookType.PRE_TOOL_USE) == 1
        assert hook_system.get_hook_count() == 1

    def test_register_multiple_hooks(self):
        """Test registering multiple hooks"""
        hook_system = HookSystem()

        def callback1(context):
            pass

        def callback2(context):
            pass

        def callback3(context):
            pass

        hook_system.register_hook(HookType.PRE_TOOL_USE, callback1)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback2)
        hook_system.register_hook(HookType.POST_TOOL_USE, callback3)

        assert hook_system.get_hook_count(HookType.PRE_TOOL_USE) == 2
        assert hook_system.get_hook_count(HookType.POST_TOOL_USE) == 1
        assert hook_system.get_hook_count() == 3

    def test_register_hook_with_name(self):
        """Test registering hook with custom name"""
        hook_system = HookSystem()

        def test_callback(context):
            pass

        hook_system.register_hook(
            HookType.PRE_TOOL_USE,
            test_callback,
            name="custom_hook"
        )

        hooks = hook_system.get_registered_hooks(HookType.PRE_TOOL_USE)
        assert "custom_hook" in hooks

    def test_unregister_hook(self):
        """Test unregistering a hook"""
        hook_system = HookSystem()

        def test_callback(context):
            pass

        hook_system.register_hook(
            HookType.PRE_TOOL_USE,
            test_callback,
            name="test_hook"
        )

        assert hook_system.get_hook_count(HookType.PRE_TOOL_USE) == 1

        # Unregister
        result = hook_system.unregister_hook(HookType.PRE_TOOL_USE, "test_hook")

        assert result is True
        assert hook_system.get_hook_count(HookType.PRE_TOOL_USE) == 0

    def test_unregister_nonexistent_hook(self):
        """Test unregistering a hook that doesn't exist"""
        hook_system = HookSystem()

        result = hook_system.unregister_hook(HookType.PRE_TOOL_USE, "nonexistent")

        assert result is False


class TestHookExecution:
    """Hook execution tests"""

    def test_execute_single_hook(self):
        """Test executing a single hook"""
        hook_system = HookSystem()
        executed = []

        def test_callback(context):
            executed.append(context["tool_name"])

        hook_system.register_hook(HookType.PRE_TOOL_USE, test_callback)

        context = {"tool_name": "Read"}
        hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        assert len(executed) == 1
        assert executed[0] == "Read"

    def test_execute_multiple_hooks(self):
        """Test executing multiple hooks"""
        hook_system = HookSystem()
        executed = []

        def callback1(context):
            executed.append("callback1")

        def callback2(context):
            executed.append("callback2")

        def callback3(context):
            executed.append("callback3")

        hook_system.register_hook(HookType.PRE_TOOL_USE, callback1)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback2)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback3)

        context = {}
        hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        assert len(executed) == 3
        assert "callback1" in executed
        assert "callback2" in executed
        assert "callback3" in executed

    def test_execute_hooks_with_return_values(self):
        """Test that hook return values are collected"""
        hook_system = HookSystem()

        def callback1(context):
            return "result1"

        def callback2(context):
            return "result2"

        hook_system.register_hook(HookType.PRE_TOOL_USE, callback1)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback2)

        context = {}
        results = hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        assert len(results) == 2
        assert "result1" in results
        assert "result2" in results

    def test_execute_hooks_with_no_registered_hooks(self):
        """Test executing hooks when none are registered"""
        hook_system = HookSystem()

        context = {}
        results = hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        assert len(results) == 0

    def test_execute_hooks_with_exception(self):
        """Test that hook exceptions don't break execution"""
        hook_system = HookSystem()
        executed = []

        def callback1(context):
            executed.append("callback1")

        def callback2(context):
            raise ValueError("Test error")

        def callback3(context):
            executed.append("callback3")

        hook_system.register_hook(HookType.PRE_TOOL_USE, callback1)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback2)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback3)

        context = {}
        # Should not raise exception
        hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        # Other hooks should still execute
        assert "callback1" in executed
        assert "callback3" in executed

    def test_execution_count_tracking(self):
        """Test that execution counts are tracked"""
        hook_system = HookSystem()

        def test_callback(context):
            pass

        hook_system.register_hook(HookType.PRE_TOOL_USE, test_callback)

        # Execute multiple times
        for _ in range(5):
            hook_system.execute_hooks(HookType.PRE_TOOL_USE, {})

        assert hook_system.get_execution_count(HookType.PRE_TOOL_USE) == 5
        assert hook_system.get_execution_count() == 5


class TestHookPriority:
    """Hook priority tests"""

    def test_priority_execution_order(self):
        """Test that hooks execute in priority order"""
        hook_system = HookSystem()
        executed = []

        def high_priority(context):
            executed.append("high")

        def normal_priority(context):
            executed.append("normal")

        def low_priority(context):
            executed.append("low")

        # Register in random order
        hook_system.register_hook(
            HookType.PRE_TOOL_USE,
            normal_priority,
            priority=HookPriority.NORMAL
        )
        hook_system.register_hook(
            HookType.PRE_TOOL_USE,
            low_priority,
            priority=HookPriority.LOW
        )
        hook_system.register_hook(
            HookType.PRE_TOOL_USE,
            high_priority,
            priority=HookPriority.HIGH
        )

        context = {}
        hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        # Should execute in priority order: HIGH, NORMAL, LOW
        assert executed == ["high", "normal", "low"]

    def test_same_priority_maintains_registration_order(self):
        """Test that hooks with same priority maintain registration order"""
        hook_system = HookSystem()
        executed = []

        def callback1(context):
            executed.append("callback1")

        def callback2(context):
            executed.append("callback2")

        def callback3(context):
            executed.append("callback3")

        # All with same priority
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback1)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback2)
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback3)

        context = {}
        hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        # Should maintain registration order
        assert executed == ["callback1", "callback2", "callback3"]


class TestContextCreation:
    """Context creation helper tests"""

    def test_create_tool_use_context(self):
        """Test creating tool use context"""
        hook_system = HookSystem()

        context = hook_system.create_tool_use_context(
            tool_name="Read",
            input_data={"file_path": "/path/to/file.py"},
            adw_id="test123"
        )

        assert context["tool_name"] == "Read"
        assert context["input"]["file_path"] == "/path/to/file.py"
        assert context["adw_id"] == "test123"
        assert context["success"] is True
        assert context["error"] is None
        assert "timestamp" in context

    def test_create_tool_use_context_with_output(self):
        """Test creating tool use context with output"""
        hook_system = HookSystem()

        context = hook_system.create_tool_use_context(
            tool_name="Read",
            input_data={"file_path": "/path/to/file.py"},
            output_data="File contents",
            duration_ms=150,
            adw_id="test123"
        )

        assert context["output"] == "File contents"
        assert context["duration_ms"] == 150

    def test_create_tool_use_context_with_error(self):
        """Test creating tool use context with error"""
        hook_system = HookSystem()

        context = hook_system.create_tool_use_context(
            tool_name="Read",
            input_data={"file_path": "/path/to/file.py"},
            success=False,
            error="File not found",
            adw_id="test123"
        )

        assert context["success"] is False
        assert context["error"] == "File not found"

    def test_create_thinking_context(self):
        """Test creating thinking context"""
        hook_system = HookSystem()

        context = hook_system.create_thinking_context(
            content="I need to analyze...",
            adw_id="test123",
            sequence=1
        )

        assert context["content"] == "I need to analyze..."
        assert context["adw_id"] == "test123"
        assert context["sequence"] == 1
        assert "timestamp" in context

    def test_create_text_context(self):
        """Test creating text context"""
        hook_system = HookSystem()

        context = hook_system.create_text_context(
            content="Here's the result...",
            adw_id="test123",
            sequence=2
        )

        assert context["content"] == "Here's the result..."
        assert context["adw_id"] == "test123"
        assert context["sequence"] == 2
        assert "timestamp" in context

    def test_create_workflow_context(self):
        """Test creating workflow context"""
        hook_system = HookSystem()

        context = hook_system.create_workflow_context(
            adw_id="test123",
            workflow_type="sdlc_planner",
            metadata={"issue_number": 49}
        )

        assert context["adw_id"] == "test123"
        assert context["workflow_type"] == "sdlc_planner"
        assert context["metadata"]["issue_number"] == 49
        assert "timestamp" in context


class TestAsyncHooks:
    """Async hook execution tests"""

    @pytest.mark.asyncio
    async def test_execute_async_hook(self):
        """Test executing async hooks"""
        hook_system = HookSystem()
        executed = []

        async def async_callback(context):
            await asyncio.sleep(0.01)
            executed.append("async")

        hook_system.register_hook(HookType.PRE_TOOL_USE, async_callback)

        context = {}
        await hook_system.execute_hooks_async(HookType.PRE_TOOL_USE, context)

        assert "async" in executed

    @pytest.mark.asyncio
    async def test_execute_mixed_sync_async_hooks(self):
        """Test executing mix of sync and async hooks"""
        hook_system = HookSystem()
        executed = []

        def sync_callback(context):
            executed.append("sync")

        async def async_callback(context):
            await asyncio.sleep(0.01)
            executed.append("async")

        hook_system.register_hook(HookType.PRE_TOOL_USE, sync_callback)
        hook_system.register_hook(HookType.PRE_TOOL_USE, async_callback)

        context = {}
        await hook_system.execute_hooks_async(HookType.PRE_TOOL_USE, context)

        assert "sync" in executed
        assert "async" in executed

    def test_execute_async_hook_without_waiting(self):
        """Test that async hooks are scheduled but not waited for"""
        hook_system = HookSystem()
        executed = []

        async def async_callback(context):
            await asyncio.sleep(0.1)
            executed.append("async")

        hook_system.register_hook(HookType.PRE_TOOL_USE, async_callback)

        context = {}
        # execute_hooks doesn't wait for async callbacks
        hook_system.execute_hooks(HookType.PRE_TOOL_USE, context)

        # Async callback hasn't completed yet
        assert len(executed) == 0


class TestUtilityMethods:
    """Utility method tests"""

    def test_get_registered_hooks(self):
        """Test getting registered hook names"""
        hook_system = HookSystem()

        def callback1(context):
            pass

        def callback2(context):
            pass

        hook_system.register_hook(HookType.PRE_TOOL_USE, callback1, name="hook1")
        hook_system.register_hook(HookType.PRE_TOOL_USE, callback2, name="hook2")

        hooks = hook_system.get_registered_hooks(HookType.PRE_TOOL_USE)

        assert "hook1" in hooks
        assert "hook2" in hooks
        assert len(hooks) == 2

    def test_clear_specific_hook_type(self):
        """Test clearing hooks for specific type"""
        hook_system = HookSystem()

        def callback(context):
            pass

        hook_system.register_hook(HookType.PRE_TOOL_USE, callback)
        hook_system.register_hook(HookType.POST_TOOL_USE, callback)

        hook_system.clear_hooks(HookType.PRE_TOOL_USE)

        assert hook_system.get_hook_count(HookType.PRE_TOOL_USE) == 0
        assert hook_system.get_hook_count(HookType.POST_TOOL_USE) == 1

    def test_clear_all_hooks(self):
        """Test clearing all hooks"""
        hook_system = HookSystem()

        def callback(context):
            pass

        hook_system.register_hook(HookType.PRE_TOOL_USE, callback)
        hook_system.register_hook(HookType.POST_TOOL_USE, callback)
        hook_system.register_hook(HookType.THINKING_BLOCK, callback)

        hook_system.clear_hooks()

        assert hook_system.get_hook_count() == 0


class TestHookDecorator:
    """Hook decorator tests"""

    def test_with_hooks_decorator(self):
        """Test with_hooks decorator"""
        hook_system = HookSystem()
        executed = []

        def pre_hook(context):
            executed.append(f"pre:{context['tool_name']}")

        def post_hook(context):
            executed.append(f"post:{context['tool_name']}")

        hook_system.register_hook(HookType.PRE_TOOL_USE, pre_hook)
        hook_system.register_hook(HookType.POST_TOOL_USE, post_hook)

        @with_hooks(hook_system, HookType.PRE_TOOL_USE, HookType.POST_TOOL_USE)
        def execute_tool(tool_name, input_data, adw_id):
            executed.append(f"execute:{tool_name}")
            return "result"

        result = execute_tool(
            tool_name="Read",
            input_data={"file_path": "/path/to/file.py"},
            adw_id="test123"
        )

        assert result == "result"
        assert executed == ["pre:Read", "execute:Read", "post:Read"]

    def test_with_hooks_decorator_with_exception(self):
        """Test with_hooks decorator when function raises exception"""
        hook_system = HookSystem()
        post_hook_executed = []

        def post_hook(context):
            post_hook_executed.append(context["success"])

        hook_system.register_hook(HookType.POST_TOOL_USE, post_hook)

        @with_hooks(hook_system, HookType.PRE_TOOL_USE, HookType.POST_TOOL_USE)
        def execute_tool(tool_name, input_data, adw_id):
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            execute_tool(
                tool_name="Read",
                input_data={},
                adw_id="test123"
            )

        # Post hook should still execute with success=False
        assert len(post_hook_executed) == 1
        assert post_hook_executed[0] is False


class TestIntegrationPatterns:
    """Integration pattern tests"""

    def test_file_tracker_integration(self):
        """Test hook system integration with FileTracker"""
        from server.modules.file_tracker import FileTracker

        hook_system = HookSystem()
        file_tracker = FileTracker(adw_id="test123")

        def track_file_operations(context):
            tool_name = context["tool_name"]
            input_data = context["input"]

            if tool_name == "Read":
                file_path = input_data.get("file_path")
                if file_path:
                    file_tracker.track_read(file_path)

            elif tool_name in ["Write", "Edit"]:
                file_path = input_data.get("file_path")
                if file_path and context["success"]:
                    file_tracker.track_modified(file_path)

        hook_system.register_hook(HookType.POST_TOOL_USE, track_file_operations)

        # Simulate Read operation
        context = hook_system.create_tool_use_context(
            tool_name="Read",
            input_data={"file_path": "/path/to/file.py"},
            adw_id="test123",
            success=True
        )
        hook_system.execute_hooks(HookType.POST_TOOL_USE, context)

        # Simulate Write operation
        context = hook_system.create_tool_use_context(
            tool_name="Write",
            input_data={"file_path": "/path/to/output.py"},
            adw_id="test123",
            success=True
        )
        hook_system.execute_hooks(HookType.POST_TOOL_USE, context)

        # Verify tracking
        tracked = file_tracker.get_tracked_files()
        assert "/path/to/file.py" in tracked["read"]
        assert "/path/to/output.py" in tracked["modified"]

    def test_multiple_adw_isolation(self):
        """Test that hooks properly handle multiple workflow executions"""
        hook_system = HookSystem()
        adw_operations = {}

        def track_by_adw(context):
            adw_id = context["adw_id"]
            if adw_id not in adw_operations:
                adw_operations[adw_id] = []
            adw_operations[adw_id].append(context["tool_name"])

        hook_system.register_hook(HookType.POST_TOOL_USE, track_by_adw)

        # Execute for different workflows
        for adw_id in ["adw1", "adw2", "adw3"]:
            context = hook_system.create_tool_use_context(
                tool_name="Read",
                input_data={},
                adw_id=adw_id
            )
            hook_system.execute_hooks(HookType.POST_TOOL_USE, context)

        # Verify isolation
        assert len(adw_operations) == 3
        assert "adw1" in adw_operations
        assert "adw2" in adw_operations
        assert "adw3" in adw_operations
