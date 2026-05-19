"""
Model Registry — catalog of known models with specs, availability tracking.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md §4
"""

from llm.providers.base import ModelSpec, ModelTier


DEFAULT_MODELS: list[ModelSpec] = [
    # ═══════════════════════════════════════════
    # Tier 1: Local Light — fast, classification, simple Q&A
    # ═══════════════════════════════════════════
    ModelSpec(
        id="qwen2.5-1.5b", name="Qwen 2.5 1.5B", provider="ollama",
        tier=ModelTier.LOCAL_LIGHT, context_length=4096, parameter_count="1.5B",
        specialization=["chat", "classification"],
        ram_required_mb=1200, vram_required_mb=1200,
        avg_tokens_per_second=60, quality_score=0.58,
        quantization="Q4_K_M", ollama_name="qwen2.5:1.5b",
    ),
    ModelSpec(
        id="jarvis", name="JARVIS (Custom)", provider="ollama",
        tier=ModelTier.LOCAL_LIGHT, context_length=4096, parameter_count="1.5B",
        specialization=["chat", "classification", "general"],
        ram_required_mb=1200, vram_required_mb=1200,
        avg_tokens_per_second=60, quality_score=0.60,
        quantization="Q4_K_M", ollama_name="jarvis",
    ),
    ModelSpec(
        id="phi3-mini", name="Phi-3 Mini", provider="ollama",
        tier=ModelTier.LOCAL_LIGHT, context_length=4096, parameter_count="3.8B",
        specialization=["chat", "classification", "reasoning"],
        ram_required_mb=2500, vram_required_mb=2500,
        avg_tokens_per_second=40, quality_score=0.65,
        quantization="Q4_K_M", ollama_name="phi3:mini",
    ),

    # ═══════════════════════════════════════════
    # Tier 2: Local Heavy — reasoning, coding, analysis
    # ═══════════════════════════════════════════
    ModelSpec(
        id="llama3.2-3b", name="Llama 3.2 3B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, parameter_count="3B",
        specialization=["chat", "reasoning", "code"],
        ram_required_mb=2200, vram_required_mb=2200,
        avg_tokens_per_second=35, quality_score=0.72,
        quantization="Q4_K_M", ollama_name="llama3.2:3b",
    ),
    ModelSpec(
        id="qwen2.5-coder-7b", name="Qwen 2.5 Coder 7B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, parameter_count="7B",
        specialization=["code", "reasoning"],
        ram_required_mb=4700, vram_required_mb=4700,
        avg_tokens_per_second=22, quality_score=0.86,
        quantization="Q4_K_M", ollama_name="qwen2.5-coder:7b",
    ),
    ModelSpec(
        id="llama3.1-8b", name="Llama 3.1 8B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, parameter_count="8B",
        specialization=["chat", "reasoning", "code"],
        ram_required_mb=5000, vram_required_mb=5000,
        avg_tokens_per_second=20, quality_score=0.82,
        quantization="Q4_K_M", ollama_name="llama3.1:8b",
    ),
    ModelSpec(
        id="mistral-7b", name="Mistral 7B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, parameter_count="7B",
        specialization=["chat", "reasoning"],
        ram_required_mb=4800, vram_required_mb=4800,
        avg_tokens_per_second=22, quality_score=0.80,
        quantization="Q4_K_M", ollama_name="mistral:7b",
    ),
    ModelSpec(
        id="deepseek-coder-6.7b", name="DeepSeek Coder 6.7B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, parameter_count="6.7B",
        specialization=["code"],
        ram_required_mb=4500, vram_required_mb=4500,
        avg_tokens_per_second=22, quality_score=0.85,
        quantization="Q4_K_M", ollama_name="deepseek-coder:6.7b",
    ),
    ModelSpec(
        id="qwen2.5-14b", name="Qwen 2.5 14B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, parameter_count="14B",
        specialization=["chat", "reasoning", "code"],
        ram_required_mb=9000, vram_required_mb=9000,
        avg_tokens_per_second=12, quality_score=0.88,
        quantization="Q4_K_M", ollama_name="qwen2.5:14b",
    ),

    # ═══════════════════════════════════════════
    # Tier 3: Cloud Standard
    # ═══════════════════════════════════════════
    ModelSpec(
        id="gemini-flash", name="Gemini 2.0 Flash", provider="gemini",
        tier=ModelTier.CLOUD_STANDARD, context_length=1048576,
        parameter_count="unknown",
        specialization=["chat", "reasoning", "code", "vision"],
        ram_required_mb=0, vram_required_mb=0,
        avg_tokens_per_second=100, quality_score=0.88,
    ),
    ModelSpec(
        id="openrouter-llama3.1-8b", name="Llama 3.1 8B (Cloud)", provider="openrouter",
        tier=ModelTier.CLOUD_STANDARD, context_length=131072,
        parameter_count="8B",
        specialization=["chat", "reasoning", "code"],
        ram_required_mb=0, vram_required_mb=0,
        avg_tokens_per_second=80, quality_score=0.82,
    ),

    # ═══════════════════════════════════════════
    # Tier 4: Cloud Premium
    # ═══════════════════════════════════════════
    ModelSpec(
        id="gemini-pro", name="Gemini 2.5 Pro", provider="gemini",
        tier=ModelTier.CLOUD_PREMIUM, context_length=1048576,
        parameter_count="unknown",
        specialization=["chat", "reasoning", "code", "vision"],
        ram_required_mb=0, vram_required_mb=0,
        avg_tokens_per_second=80, quality_score=0.95,
    ),
]


class ModelRegistry:
    """Registry of all known models with runtime availability tracking."""

    def __init__(self):
        self._models: dict[str, ModelSpec] = {}
        for m in DEFAULT_MODELS:
            self._models[m.id] = m

    def get(self, model_id: str) -> ModelSpec | None:
        return self._models.get(model_id)

    def get_by_ollama_name(self, ollama_name: str) -> ModelSpec | None:
        for m in self._models.values():
            if m.ollama_name == ollama_name:
                return m
        return None

    def list_all(self) -> list[ModelSpec]:
        return list(self._models.values())

    def list_available(self, min_tier: ModelTier | None = None) -> list[ModelSpec]:
        models = [m for m in self._models.values() if m.is_available]
        if min_tier:
            tier_order = list(ModelTier)
            min_idx = tier_order.index(min_tier)
            models = [m for m in models if tier_order.index(m.tier) >= min_idx]
        return models

    def mark_available(self, model_id: str, available: bool = True):
        if model_id in self._models:
            self._models[model_id].is_available = available

    async def sync_ollama_availability(self, available_names: list[str]):
        """Mark models available/unavailable based on Ollama's loaded models."""
        for m in self._models.values():
            if m.provider == "ollama" and m.ollama_name:
                m.is_available = m.ollama_name in available_names

    def add(self, spec: ModelSpec):
        self._models[spec.id] = spec


# Global singleton
model_registry = ModelRegistry()
