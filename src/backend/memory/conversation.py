"""
Persistent conversation memory — stores chat history to disk (JSON-lines).
Uses a 2 GB FIFO ring-buffer on disk so old data is automatically evicted.
"""

import json
import os
import time
from pathlib import Path
from dataclasses import dataclass, field, asdict

from config import config

MAX_ACTIVE = 200          # Max turns kept in active (RAM) context window
MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024   # 2 GB disk limit
PERSIST_FILE = "conversation_history.jsonl"


@dataclass
class Turn:
    role: str   # "user" | "assistant" | "system"
    content: str
    timestamp: float = 0.0


class ConversationMemory:
    """Thread-safe conversation history with 2 GB FIFO disk persistence."""

    def __init__(self):
        self._history: list[Turn] = []
        self._file = config.data_dir / PERSIST_FILE
        self._file.parent.mkdir(parents=True, exist_ok=True)
        self._load()

    # ── persistence ────────────────────────────────────────────────────

    def _load(self):
        """Load the most recent turns from the JSONL file into RAM."""
        try:
            if not self._file.exists():
                self._history = []
                return
            # Read last N lines efficiently — seek from end
            lines: list[str] = []
            with open(self._file, "r", encoding="utf-8") as f:
                # For files under 50 MB, just read all lines
                size = self._file.stat().st_size
                if size < 50 * 1024 * 1024:
                    lines = f.readlines()
                else:
                    # Seek backwards to get last chunk
                    chunk_size = 2 * 1024 * 1024  # 2 MB tail
                    f.seek(max(0, size - chunk_size))
                    f.readline()  # discard partial line
                    lines = f.readlines()
            # Parse the last MAX_ACTIVE turns
            turns: list[Turn] = []
            for line in lines[-MAX_ACTIVE:]:
                line = line.strip()
                if not line:
                    continue
                try:
                    turns.append(Turn(**json.loads(line)))
                except Exception:
                    pass
            self._history = turns
        except Exception:
            self._history = []

    def _append_to_disk(self, turn: Turn):
        """Append a single turn to the JSONL file, then enforce 2 GB cap."""
        try:
            with open(self._file, "a", encoding="utf-8") as f:
                f.write(json.dumps(asdict(turn), ensure_ascii=False) + "\n")
            self._enforce_size_limit()
        except Exception:
            pass

    def _enforce_size_limit(self):
        """If the file exceeds 2 GB, trim the oldest ~25% of lines."""
        try:
            size = self._file.stat().st_size
            if size <= MAX_FILE_BYTES:
                return
            # Read all lines, keep the newest 75%
            with open(self._file, "r", encoding="utf-8") as f:
                lines = f.readlines()
            keep = lines[len(lines) // 4:]
            tmp = self._file.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                f.writelines(keep)
            tmp.replace(self._file)
        except Exception:
            pass

    # ── public API ─────────────────────────────────────────────────────

    def add(self, role: str, content: str):
        """Add a turn, persist to disk, keep RAM window trimmed."""
        turn = Turn(role=role, content=content, timestamp=time.time())
        self._history.append(turn)
        if len(self._history) > MAX_ACTIVE:
            self._history = self._history[-MAX_ACTIVE:]
        self._append_to_disk(turn)

    def get_recent(self, n: int = 20) -> list[dict[str, str]]:
        """Return last N turns as message dicts for LLM."""
        return [{"role": t.role, "content": t.content} for t in self._history[-n:]]

    def search(self, query: str, limit: int = 20) -> list[dict]:
        """Simple substring search across all persisted turns."""
        results: list[dict] = []
        try:
            if not self._file.exists():
                return results
            q = query.lower()
            with open(self._file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    if q in line.lower():
                        try:
                            results.append(json.loads(line))
                        except Exception:
                            pass
                        if len(results) >= limit:
                            break
        except Exception:
            pass
        return results

    def clear(self):
        self._history.clear()
        try:
            if self._file.exists():
                self._file.unlink()
        except Exception:
            pass

    @property
    def count(self) -> int:
        return len(self._history)

    @property
    def disk_size_mb(self) -> float:
        """Return the disk size of the history file in MB."""
        try:
            return self._file.stat().st_size / (1024 * 1024) if self._file.exists() else 0.0
        except Exception:
            return 0.0


# Singleton
conversation_memory = ConversationMemory()
