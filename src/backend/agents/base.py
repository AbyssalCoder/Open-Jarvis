"""
Base Agent class — all JARVIS agents inherit from this.
Defines the lifecycle, messaging, and capability interface.
"""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator
from core.event_bus import event_bus
from core.context import JarvisContext


class BaseAgent(ABC):
    """Abstract base class for all JARVIS agents."""

    def __init__(self, agent_id: str, name: str, capabilities: list[str] | None = None):
        self.agent_id = agent_id
        self.name = name
        self.capabilities = capabilities or []
        self.status: str = "idle"  # idle | active | busy | error | suspended

    async def initialize(self):
        """Called once during system startup. Override for setup logic."""
        self.status = "idle"

    async def shutdown(self):
        """Called during system shutdown. Override for cleanup."""
        self.status = "suspended"

    @abstractmethod
    async def process(self, context: JarvisContext) -> AsyncGenerator[str, None]:
        """
        Process a request. Yields response tokens for streaming.
        Must be implemented by every agent.
        """
        yield ""

    def can_handle(self, intent: str) -> float:
        """
        Return a confidence score (0.0–1.0) for whether this agent
        can handle the given intent. Used by the orchestrator for routing.
        """
        return 0.0

    def _emit_state(self, task: str | None = None):
        """Broadcast current state to frontend."""
        event_bus.emit("agent.state", {
            "agent_id": self.agent_id,
            "name": self.name,
            "status": self.status,
            "currentTask": task,
        })
