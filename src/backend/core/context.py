"""Context object — carries conversation and task state through the pipeline."""

from dataclasses import dataclass, field
from typing import Any
import uuid


@dataclass
class ConversationTurn:
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: float = 0.0


@dataclass
class JarvisContext:
    """Immutable context object passed through the agent pipeline."""

    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_input: str = ""
    conversation_history: list[ConversationTurn] = field(default_factory=list)
    active_agent: str | None = None
    task_plan: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    # Accumulated response
    response_chunks: list[str] = field(default_factory=list)

    @property
    def full_response(self) -> str:
        return "".join(self.response_chunks)

    def add_history(self, role: str, content: str):
        self.conversation_history.append(ConversationTurn(role=role, content=content))
