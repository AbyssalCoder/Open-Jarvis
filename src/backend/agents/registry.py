"""
Agent Registry — manages agent lifecycle and lookup.
"""

from typing import Any
from agents.base import BaseAgent


class AgentRegistry:
    """Central registry for all JARVIS agents."""

    def __init__(self):
        self._agents: dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent):
        """Register an agent instance."""
        self._agents[agent.agent_id] = agent

    def get(self, agent_id: str) -> BaseAgent | None:
        return self._agents.get(agent_id)

    def list_agents(self) -> list[dict[str, Any]]:
        return [
            {
                "id": a.agent_id,
                "name": a.name,
                "status": a.status,
                "capabilities": a.capabilities,
            }
            for a in self._agents.values()
        ]

    @property
    def active_count(self) -> int:
        return sum(1 for a in self._agents.values() if a.status != "suspended")

    async def initialize(self):
        """Initialize all registered agents."""
        # Import and register built-in agents
        from agents.brain import BrainAgent

        self.register(BrainAgent())

        for agent in self._agents.values():
            try:
                await agent.initialize()
                print(f"  [Agent] {agent.name} initialized")
            except Exception as e:
                agent.status = "error"
                print(f"  [Agent] {agent.name} failed: {e}")

    async def shutdown(self):
        """Shutdown all agents."""
        for agent in self._agents.values():
            try:
                await agent.shutdown()
            except Exception:
                pass


# Global singleton
agent_registry = AgentRegistry()
