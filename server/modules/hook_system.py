"""
Hook System Module

Provides infrastructure for pre/post tool execution hooks, thinking blocks,
and text blocks. Enables granular workflow event broadcasting.
"""

from typing import Callable, Dict, List, Any, Optional
from enum import Enum
from datetime import datetime
import logging
import asyncio
from functools import wraps

logger = logging.getLogger(__name__)


class HookType(Enum):
    """Types of hooks available in the system"""
    PRE_TOOL_USE = "pre_tool_use"
    POST_TOOL_USE = "post_tool_use"
    THINKING_BLOCK = "thinking_block"
    TEXT_BLOCK = "text_block"
    USER_PROMPT = "user_prompt"
    WORKFLOW_START = "workflow_start"
    WORKFLOW_END = "workflow_end"


class HookPriority(Enum):
    """Hook execution priority"""
    HIGH = 1
    NORMAL = 2
    LOW = 3


class Hook:
    """
    Represents a registered hook with its callback and priority.
    """

    def __init__(
        self,
        callback: Callable,
        priority: HookPriority = HookPriority.NORMAL,
        name: Optional[str] = None
    ):
        self.callback = callback
        self.priority = priority
        self.name = name or callback.__name__

    def __repr__(self):
        return f"Hook(name={self.name}, priority={self.priority.name})"


class HookSystem:
    """
    Hook infrastructure for workflow execution events.

    This class manages hook registration and execution for various workflow
    events like tool use, thinking blocks, and text blocks. Hooks are executed
    in priority order and support both sync and async callbacks.

    Example:
        hook_system = HookSystem()

        # Register a hook
        def log_tool_use(context):
            print(f"Tool used: {context['tool_name']}")

        hook_system.register_hook(HookType.POST_TOOL_USE, log_tool_use)

        # Execute hooks
        context = hook_system.create_tool_use_context(
            tool_name="Read",
            input_data={"file_path": "/path/to/file.py"},
            adw_id="abc123"
        )
        hook_system.execute_hooks(HookType.POST_TOOL_USE, context)
    """

    def __init__(self):
        """Initialize HookSystem with empty hook registry"""
        self._hooks: Dict[HookType, List[Hook]] = {
            hook_type: [] for hook_type in HookType
        }
        self._execution_count: Dict[HookType, int] = {
            hook_type: 0 for hook_type in HookType
        }

    def register_hook(
        self,
        hook_type: HookType,
        callback: Callable,
        priority: HookPriority = HookPriority.NORMAL,
        name: Optional[str] = None
    ) -> None:
        """
        Register a callback for a specific hook type.

        Args:
            hook_type: Type of hook to register
            callback: Function to call when hook is triggered
            priority: Execution priority (HIGH, NORMAL, LOW)
            name: Optional name for the hook (defaults to function name)
        """
        hook = Hook(callback=callback, priority=priority, name=name)
        self._hooks[hook_type].append(hook)

        # Sort hooks by priority
        self._hooks[hook_type].sort(key=lambda h: h.priority.value)

        logger.info(f"Registered hook '{hook.name}' for {hook_type.value} with priority {priority.name}")

    def unregister_hook(self, hook_type: HookType, name: str) -> bool:
        """
        Unregister a hook by name.

        Args:
            hook_type: Type of hook to unregister
            name: Name of the hook to remove

        Returns:
            True if hook was found and removed, False otherwise
        """
        hooks = self._hooks[hook_type]
        initial_count = len(hooks)

        self._hooks[hook_type] = [h for h in hooks if h.name != name]

        removed = len(self._hooks[hook_type]) < initial_count

        if removed:
            logger.info(f"Unregistered hook '{name}' for {hook_type.value}")
        else:
            logger.warning(f"Hook '{name}' not found for {hook_type.value}")

        return removed

    def execute_hooks(self, hook_type: HookType, context: Dict[str, Any]) -> List[Any]:
        """
        Execute all registered hooks for the given type.

        Hooks are executed in priority order. If a hook raises an exception,
        it's logged but doesn't prevent other hooks from executing.

        Args:
            hook_type: Type of hook to execute
            context: Context data passed to each hook callback

        Returns:
            List of hook results (for hooks that return values)
        """
        hooks = self._hooks[hook_type]

        if not hooks:
            logger.debug(f"No hooks registered for {hook_type.value}")
            return []

        self._execution_count[hook_type] += 1
        logger.debug(f"Executing {len(hooks)} hook(s) for {hook_type.value}")

        results = []

        for hook in hooks:
            try:
                # Check if callback is async
                if asyncio.iscoroutinefunction(hook.callback):
                    # For async callbacks, create task but don't wait
                    logger.debug(f"Scheduling async hook '{hook.name}'")
                    asyncio.create_task(hook.callback(context))
                    results.append(None)
                else:
                    # Execute sync callback
                    result = hook.callback(context)
                    results.append(result)
                    logger.debug(f"Executed hook '{hook.name}' successfully")

            except Exception as e:
                logger.error(
                    f"Error executing hook '{hook.name}' for {hook_type.value}: {str(e)}",
                    exc_info=True
                )
                # Continue with other hooks
                results.append(None)

        return results

    async def execute_hooks_async(
        self,
        hook_type: HookType,
        context: Dict[str, Any]
    ) -> List[Any]:
        """
        Execute all registered hooks for the given type asynchronously.

        Similar to execute_hooks but waits for async callbacks to complete.

        Args:
            hook_type: Type of hook to execute
            context: Context data passed to each hook callback

        Returns:
            List of hook results
        """
        hooks = self._hooks[hook_type]

        if not hooks:
            logger.debug(f"No hooks registered for {hook_type.value}")
            return []

        self._execution_count[hook_type] += 1
        logger.debug(f"Executing {len(hooks)} hook(s) for {hook_type.value} (async)")

        results = []

        for hook in hooks:
            try:
                if asyncio.iscoroutinefunction(hook.callback):
                    result = await hook.callback(context)
                    results.append(result)
                else:
                    result = hook.callback(context)
                    results.append(result)

                logger.debug(f"Executed hook '{hook.name}' successfully")

            except Exception as e:
                logger.error(
                    f"Error executing hook '{hook.name}' for {hook_type.value}: {str(e)}",
                    exc_info=True
                )
                results.append(None)

        return results

    def create_tool_use_context(
        self,
        tool_name: str,
        input_data: dict,
        output_data: Any = None,
        tool_use_id: Optional[str] = None,
        adw_id: Optional[str] = None,
        duration_ms: Optional[int] = None,
        success: bool = True,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Build context dictionary for tool use hooks.

        Args:
            tool_name: Name of the tool being used
            input_data: Input parameters for the tool
            output_data: Output from the tool (for POST hooks)
            tool_use_id: Unique identifier for this tool use
            adw_id: Workflow execution identifier
            duration_ms: Execution duration in milliseconds
            success: Whether tool execution succeeded
            error: Error message if execution failed

        Returns:
            Context dictionary for hook callbacks
        """
        return {
            "tool_name": tool_name,
            "input": input_data,
            "output": output_data,
            "tool_use_id": tool_use_id,
            "adw_id": adw_id,
            "duration_ms": duration_ms,
            "success": success,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }

    def create_thinking_context(
        self,
        content: str,
        adw_id: Optional[str] = None,
        sequence: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Build context dictionary for thinking block hooks.

        Args:
            content: Thinking content from Claude
            adw_id: Workflow execution identifier
            sequence: Sequence number for ordering

        Returns:
            Context dictionary for hook callbacks
        """
        return {
            "content": content,
            "adw_id": adw_id,
            "sequence": sequence,
            "timestamp": datetime.utcnow().isoformat()
        }

    def create_text_context(
        self,
        content: str,
        adw_id: Optional[str] = None,
        sequence: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Build context dictionary for text block hooks.

        Args:
            content: Text content from Claude
            adw_id: Workflow execution identifier
            sequence: Sequence number for ordering

        Returns:
            Context dictionary for hook callbacks
        """
        return {
            "content": content,
            "adw_id": adw_id,
            "sequence": sequence,
            "timestamp": datetime.utcnow().isoformat()
        }

    def create_workflow_context(
        self,
        adw_id: str,
        workflow_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build context dictionary for workflow start/end hooks.

        Args:
            adw_id: Workflow execution identifier
            workflow_type: Type of workflow (e.g., "sdlc_planner", "sdlc_implementor")
            metadata: Additional workflow metadata

        Returns:
            Context dictionary for hook callbacks
        """
        return {
            "adw_id": adw_id,
            "workflow_type": workflow_type,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_hook_count(self, hook_type: Optional[HookType] = None) -> int:
        """
        Get the number of registered hooks.

        Args:
            hook_type: Specific hook type to count (None for total)

        Returns:
            Number of registered hooks
        """
        if hook_type:
            return len(self._hooks[hook_type])
        else:
            return sum(len(hooks) for hooks in self._hooks.values())

    def get_execution_count(self, hook_type: Optional[HookType] = None) -> int:
        """
        Get the number of times hooks have been executed.

        Args:
            hook_type: Specific hook type to count (None for total)

        Returns:
            Number of hook executions
        """
        if hook_type:
            return self._execution_count[hook_type]
        else:
            return sum(self._execution_count.values())

    def clear_hooks(self, hook_type: Optional[HookType] = None) -> None:
        """
        Clear registered hooks.

        Args:
            hook_type: Specific hook type to clear (None for all)
        """
        if hook_type:
            self._hooks[hook_type] = []
            logger.info(f"Cleared hooks for {hook_type.value}")
        else:
            for ht in HookType:
                self._hooks[ht] = []
            logger.info("Cleared all hooks")

    def get_registered_hooks(self, hook_type: HookType) -> List[str]:
        """
        Get names of registered hooks for a specific type.

        Args:
            hook_type: Hook type to query

        Returns:
            List of hook names
        """
        return [hook.name for hook in self._hooks[hook_type]]


def with_hooks(hook_system: HookSystem, pre_type: HookType, post_type: HookType):
    """
    Decorator to automatically trigger pre/post hooks for a function.

    Example:
        @with_hooks(hook_system, HookType.PRE_TOOL_USE, HookType.POST_TOOL_USE)
        def execute_tool(tool_name, input_data, adw_id):
            # Tool execution logic
            return output

    Args:
        hook_system: HookSystem instance
        pre_type: Hook type to execute before function
        post_type: Hook type to execute after function

    Returns:
        Decorated function
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract context info
            tool_name = kwargs.get('tool_name') or (args[0] if args else None)
            input_data = kwargs.get('input_data', {})
            adw_id = kwargs.get('adw_id')

            # Execute pre-hook
            pre_context = hook_system.create_tool_use_context(
                tool_name=tool_name,
                input_data=input_data,
                adw_id=adw_id
            )
            hook_system.execute_hooks(pre_type, pre_context)

            # Execute function
            start_time = datetime.utcnow()
            try:
                result = func(*args, **kwargs)
                success = True
                error = None
            except Exception as e:
                result = None
                success = False
                error = str(e)
                raise
            finally:
                # Execute post-hook
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                post_context = hook_system.create_tool_use_context(
                    tool_name=tool_name,
                    input_data=input_data,
                    output_data=result,
                    adw_id=adw_id,
                    duration_ms=duration_ms,
                    success=success,
                    error=error
                )
                hook_system.execute_hooks(post_type, post_context)

            return result

        return wrapper
    return decorator
