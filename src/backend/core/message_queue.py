"""Async message queue for ordered task/message processing."""

import asyncio
from typing import Any
from dataclasses import dataclass, field
from datetime import datetime
import uuid


@dataclass
class Message:
    type: str
    data: dict[str, Any]
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    priority: int = 0  # Higher = more urgent


class MessageQueue:
    """Priority-based async message queue."""

    def __init__(self, maxsize: int = 1000):
        self._queue: asyncio.PriorityQueue[tuple[int, float, Message]] = (
            asyncio.PriorityQueue(maxsize=maxsize)
        )

    async def put(self, message: Message):
        # Negate priority so higher priority = dequeued first
        await self._queue.put((-message.priority, message.timestamp, message))

    async def get(self) -> Message:
        _, _, message = await self._queue.get()
        return message

    def empty(self) -> bool:
        return self._queue.empty()

    @property
    def size(self) -> int:
        return self._queue.qsize()


# Global queue
message_queue = MessageQueue()
