"""
Provider base class — unified interface for all LLM backends.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md §5
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator
from enum import Enum


class ModelTier(Enum):
    """4-tier model hierarchy from fastest to most capable."""
    LOCAL_LIGHT = "local_light"       # Tier 1: classification, simple tasks
    LOCAL_HEAVY = "local_heavy"       # Tier 2: reasoning, coding, analysis
    CLOUD_STANDARD = "cloud_standard" # Tier 3: when local is insufficient
    CLOUD_PREMIUM = "cloud_premium"   # Tier 4: complex reasoning, large context


@dataclass
class GenerationParams:
    """Parameters for text generation."""
    model_name: str = ""
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 2048
    context_length: int = 4096
    stop: list[str] = field(default_factory=list)


@dataclass
class ModelSpec:
    """Full specification for a model in the registry."""
    id: str
    name: str
    provider: str                      # ollama | llamacpp | gemini | openrouter
    tier: ModelTier
    context_length: int
    parameter_count: str               # "1.5B", "7B", "8B", etc.
    specialization: list[str]          # ["chat", "code", "reasoning", "vision"]
    ram_required_mb: int
    vram_required_mb: int
    avg_tokens_per_second: float
    quality_score: float               # 0.0 — 1.0
    quantization: str | None = None    # Q4_K_M, Q6_K, F16, etc.
    is_available: bool = False
    ollama_name: str | None = None
    file_path: str | None = None       # For GGUF models


class ModelProvider(ABC):
    """Abstract base class for all model providers."""

    @abstractmethod
    async def stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        params: GenerationParams | None = None,
    ) -> AsyncIterator[str]:
        """Stream tokens from a prompt."""
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if this provider is reachable."""
        ...

    @abstractmethod
    async def list_models(self) -> list[str]:
        """List available models from this provider."""
        ...
