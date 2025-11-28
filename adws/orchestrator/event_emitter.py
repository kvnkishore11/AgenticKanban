"""
Event Emitter - Pub/sub system for stage lifecycle events.

Allows the orchestrator to emit events that can be consumed by
multiple handlers (WebSocket notifications, logging, state persistence, etc.)
"""

from typing import Callable, Dict, List, TYPE_CHECKING
import logging

if TYPE_CHECKING:
    from orchestrator.events import StageEventType, StageEventPayload

# Type alias for event handlers
EventHandler = Callable[["StageEventPayload"], None]


class StageEventEmitter:
    """Event emitter for stage lifecycle events.

    Supports both type-specific and global handlers, allowing:
    - WebSocket notifications
    - Logging
    - State persistence
    - Custom hooks
    """

    def __init__(self):
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._global_handlers: List[EventHandler] = []
        self.logger = logging.getLogger(__name__)

    def on(self, event_type: "StageEventType", handler: EventHandler) -> None:
        """Register a handler for a specific event type.

        Args:
            event_type: The event type to listen for
            handler: Callback function to invoke when event occurs
        """
        event_key = event_type.value
        if event_key not in self._handlers:
            self._handlers[event_key] = []
        self._handlers[event_key].append(handler)

    def on_all(self, handler: EventHandler) -> None:
        """Register a handler for all event types.

        Args:
            handler: Callback function to invoke for all events
        """
        self._global_handlers.append(handler)

    def off(self, event_type: "StageEventType", handler: EventHandler) -> bool:
        """Remove a handler for a specific event type.

        Args:
            event_type: The event type
            handler: The handler to remove

        Returns:
            True if handler was found and removed
        """
        event_key = event_type.value
        handlers = self._handlers.get(event_key, [])
        if handler in handlers:
            handlers.remove(handler)
            return True
        return False

    def emit(self, event: "StageEventPayload") -> None:
        """Emit an event to all registered handlers.

        Errors in handlers are logged but don't propagate,
        ensuring all handlers get a chance to process the event.

        Args:
            event: The event payload to emit
        """
        # Call type-specific handlers
        handlers = self._handlers.get(event.event_type.value, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                self.logger.error(
                    f"Error in event handler for {event.event_type.value}: {e}"
                )

        # Call global handlers
        for handler in self._global_handlers:
            try:
                handler(event)
            except Exception as e:
                self.logger.error(f"Error in global event handler: {e}")

    def clear(self) -> None:
        """Clear all registered handlers."""
        self._handlers.clear()
        self._global_handlers.clear()

    def handler_count(self, event_type: "StageEventType" = None) -> int:
        """Get the number of registered handlers.

        Args:
            event_type: Optional specific event type to count

        Returns:
            Number of handlers registered
        """
        if event_type:
            return len(self._handlers.get(event_type.value, []))
        return sum(len(h) for h in self._handlers.values()) + len(self._global_handlers)
