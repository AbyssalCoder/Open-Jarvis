"""
Training Data Collector — captures conversations for future fine-tuning.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md §12

Stores high-quality Q&A pairs in JSONL format for:
- Custom Jarvis model fine-tuning via Unsloth / LLaMA-Factory
- Prompt improvement & evaluation
"""

import json
import time
from pathlib import Path
from dataclasses import dataclass, field, asdict


TRAINING_DIR = Path(__file__).parent.parent / "data" / "training"


@dataclass
class TrainingExample:
    instruction: str
    input: str
    output: str
    model_used: str
    quality_score: float = 0.0  # 0–1, rated by user or heuristic
    intent: str = ""
    timestamp: float = field(default_factory=time.time)


class TrainingDataCollector:
    """Collects conversation data for fine-tuning."""

    def __init__(self, output_dir: Path | None = None):
        self.output_dir = output_dir or TRAINING_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._buffer: list[TrainingExample] = []

    def record(
        self,
        user_message: str,
        assistant_response: str,
        model_used: str,
        intent: str = "",
        system_prompt: str = "",
    ):
        """Record a Q&A pair."""
        example = TrainingExample(
            instruction=system_prompt or "You are JARVIS, an advanced AI assistant.",
            input=user_message,
            output=assistant_response,
            model_used=model_used,
            intent=intent,
        )
        self._buffer.append(example)

        # Flush every 10 examples
        if len(self._buffer) >= 10:
            self.flush()

    def rate(self, idx: int, score: float):
        """User rates a response quality (0–1)."""
        if 0 <= idx < len(self._buffer):
            self._buffer[idx].quality_score = score

    def flush(self):
        """Write buffered examples to JSONL file."""
        if not self._buffer:
            return

        filepath = self.output_dir / "conversations.jsonl"
        with open(filepath, "a", encoding="utf-8") as f:
            for ex in self._buffer:
                f.write(json.dumps(asdict(ex), ensure_ascii=False) + "\n")
        self._buffer.clear()

    def export_for_finetuning(self, min_quality: float = 0.0) -> Path:
        """Export filtered training data in Alpaca format for fine-tuning."""
        self.flush()

        source = self.output_dir / "conversations.jsonl"
        output = self.output_dir / "finetune_dataset.jsonl"

        if not source.exists():
            output.touch()
            return output

        with open(source, "r", encoding="utf-8") as src, \
             open(output, "w", encoding="utf-8") as dst:
            for line in src:
                try:
                    ex = json.loads(line)
                    if ex.get("quality_score", 0) >= min_quality:
                        alpaca = {
                            "instruction": ex["instruction"],
                            "input": ex["input"],
                            "output": ex["output"],
                        }
                        dst.write(json.dumps(alpaca, ensure_ascii=False) + "\n")
                except json.JSONDecodeError:
                    continue

        return output

    def stats(self) -> dict:
        """Get statistics about collected data."""
        source = self.output_dir / "conversations.jsonl"
        if not source.exists():
            return {"total": 0, "buffered": len(self._buffer)}

        count = sum(1 for _ in open(source, encoding="utf-8"))
        return {"total": count, "buffered": len(self._buffer)}


# Global singleton
training_collector = TrainingDataCollector()
