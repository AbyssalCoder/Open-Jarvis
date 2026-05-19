"""Event bus — async pub/sub system for inter-module communication."""

import asyncio
from collections import defaultdict
from typing import Any, Callable, Coroutine


EventHandler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class EventBus:
    """Lightweight async event bus for the JARVIS backend."""

    def __init__(self):
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)
        self._sync_handlers: dict[str, list[Callable]] = defaultdict(list)

    def on(self, event_type: str, handler: EventHandler):
        """Subscribe an async handler to an event type."""
        self._handlers[event_type].append(handler)

    def on_sync(self, event_type: str, handler: Callable):
        """Subscribe a sync handler (wrapped in asyncio)."""
        self._sync_handlers[event_type].append(handler)

    def off(self, event_type: str, handler: EventHandler):
        """Unsubscribe a handler."""
        if handler in self._handlers[event_type]:
            self._handlers[event_type].remove(handler)

    def emit(self, event_type: str, data: dict[str, Any]):
        """Fire-and-forget event emission. Schedules handlers as tasks."""
        for handler in self._handlers.get(event_type, []):
            asyncio.ensure_future(handler(data))

        for handler in self._sync_handlers.get(event_type, []):
            try:
                handler(data)
            except Exception as e:
                print(f"[EventBus] Sync handler error for {event_type}: {e}")

    async def emit_await(self, event_type: str, data: dict[str, Any]):
        """Emit and await all handlers to complete."""
        tasks = []
        for handler in self._handlers.get(event_type, []):
            tasks.append(handler(data))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        for handler in self._sync_handlers.get(event_type, []):
            try:
                handler(data)
            except Exception as e:
                print(f"[EventBus] Sync handler error for {event_type}: {e}")


# Global singleton
event_bus = EventBus()
