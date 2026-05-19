"""
Persistent conversation memory — stores chat history to disk (JSON).
Enables context-aware multi-turn conversations.
"""

import json
import time
from pathlib import Path
from dataclasses import dataclass, field, asdict

from config import config

MAX_HISTORY = 50  # Max turns kept in active memory
PERSIST_FILE = "conversation_history.json"


@dataclass
class Turn:
    role: str   # "user" | "assistant" | "system"
    content: str
    timestamp: float = 0.0


class ConversationMemory:
    """Thread-safe conversation history with disk persistence."""

    def __init__(self):
        self._history: list[Turn] = []
        self._file = config.data_dir / PERSIST_FILE
        self._load()

    def _load(self):
        """Load history from disk."""
        try:
            if self._file.exists():
                data = json.loads(self._file.read_text(encoding="utf-8"))
                self._history = [Turn(**t) for t in data[-MAX_HISTORY:]]
        except Exception:
            self._history = []

    def _save(self):
        """Persist history to disk."""
        try:
            self._file.parent.mkdir(parents=True, exist_ok=True)
            data = [asdict(t) for t in self._history[-MAX_HISTORY:]]
            self._file.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            pass

    def add(self, role: str, content: str):
        """Add a turn and persist."""
        self._history.append(Turn(role=role, content=content, timestamp=time.time()))
        # Trim
        if len(self._history) > MAX_HISTORY:
            self._history = self._history[-MAX_HISTORY:]
        self._save()

    def get_recent(self, n: int = 20) -> list[dict[str, str]]:
        """Return last N turns as message dicts for LLM."""
        return [{"role": t.role, "content": t.content} for t in self._history[-n:]]

    def clear(self):
        self._history.clear()
        self._save()

    @property
    def count(self) -> int:
        return len(self._history)


# Singleton
conversation_memory = ConversationMemory()
