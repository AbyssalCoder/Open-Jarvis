"""
LLM Router — intelligent model selection and multi-provider routing.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md

Routing flow:
  1. Classify intent (keyword rules)
  2. Estimate complexity
  3. Determine minimum model tier
  4. Find available models at/above that tier
  5. Score candidates (quality, speed, locality, specialization)
  6. Stream from best candidate; fallback on failure
"""

from dataclasses import dataclass
from typing import Any, AsyncGenerator

from config import config
from llm.providers.base import ModelProvider, ModelTier, ModelSpec, GenerationParams
from llm.providers.ollama import OllamaProvider
from llm.providers.gemini import GeminiProvider
from llm.providers.openrouter import OpenRouterProvider
from llm.registry import model_registry, ModelRegistry
from llm.intent import intent_classifier, IntentClassifier


@dataclass
class RoutingDecision:
    model: ModelSpec | None
    provider_name: str
    reason: str
    fallbacks: list[str]


# Map (intent, complexity) → minimum tier
_TIER_MAP: dict[tuple[str, str], ModelTier] = {
    ("chat", "simple"): ModelTier.LOCAL_LIGHT,
    ("chat", "moderate"): ModelTier.LOCAL_LIGHT,
    ("chat", "complex"): ModelTier.LOCAL_HEAVY,
    ("chat", "expert"): ModelTier.CLOUD_STANDARD,
    ("code", "simple"): ModelTier.LOCAL_LIGHT,
    ("code", "moderate"): ModelTier.LOCAL_HEAVY,
    ("code", "complex"): ModelTier.LOCAL_HEAVY,
    ("code", "expert"): ModelTier.CLOUD_STANDARD,
    ("knowledge", "simple"): ModelTier.LOCAL_LIGHT,
    ("knowledge", "moderate"): ModelTier.LOCAL_HEAVY,
    ("knowledge", "complex"): ModelTier.LOCAL_HEAVY,
    ("knowledge", "expert"): ModelTier.CLOUD_STANDARD,
    ("file", "simple"): ModelTier.LOCAL_LIGHT,
    ("terminal", "simple"): ModelTier.LOCAL_LIGHT,
    ("system", "simple"): ModelTier.LOCAL_LIGHT,
    ("vision", "simple"): ModelTier.CLOUD_STANDARD,
    ("vision", "moderate"): ModelTier.CLOUD_STANDARD,
}


class LLMRouter:
    """Central routing engine — selects the optimal model for each request."""

    def __init__(self):
        self._providers: dict[str, ModelProvider] = {}
        self._classifier = intent_classifier
        self._registry = model_registry

        # Register providers
        self._providers["ollama"] = OllamaProvider()

        if config.gemini_api_key:
            self._providers["gemini"] = GeminiProvider()

        if config.openrouter_api_key:
            self._providers["openrouter"] = OpenRouterProvider()

    async def initialize(self):
        """Sync model availability with Ollama at startup."""
        try:
            ollama = self._providers.get("ollama")
            if ollama:
                names = await ollama.list_models()
                await self._registry.sync_ollama_availability(names)
        except Exception:
            pass

        # Cloud models are always available if API key is set
        if config.gemini_api_key:
            self._registry.mark_available("gemini-flash", True)
            self._registry.mark_available("gemini-pro", True)

    def route(self, message: str, forced_model: str | None = None) -> RoutingDecision:
        """Select the optimal model for a user message."""

        # User override — always respected
        if forced_model:
            spec = self._registry.get(forced_model) or self._registry.get_by_ollama_name(forced_model)
            if spec:
                return RoutingDecision(
                    model=spec,
                    provider_name=spec.provider,
                    reason="user_override",
                    fallbacks=[],
                )

        # Classify intent and complexity
        intent = self._classifier.classify(message)
        complexity = self._classifier.estimate_complexity(message, intent.type)

        # Determine minimum tier
        key = (intent.type, complexity.level)
        min_tier = _TIER_MAP.get(key, ModelTier.LOCAL_HEAVY)

        # Find available candidates
        candidates = self._registry.list_available(min_tier=min_tier)

        # If no candidates at required tier, try all available
        if not candidates:
            candidates = self._registry.list_available()

        # Filter by specialization for code/vision tasks
        if intent.type in ("code",) and candidates:
            specialized = [m for m in candidates if "code" in m.specialization]
            if specialized:
                candidates = specialized

        # If still no candidates, fall back to any provider
        if not candidates:
            # Last resort: just use whatever is configured
            provider_name = "gemini" if "gemini" in self._providers else "ollama"
            return RoutingDecision(
                model=None,
                provider_name=provider_name,
                reason="no_models_available",
                fallbacks=[],
            )

        # Score candidates
        best = self._score_candidates(candidates, intent.type)
        fallbacks = [m.id for m in candidates if m.id != best.id][:3]

        return RoutingDecision(
            model=best,
            provider_name=best.provider,
            reason=f"auto:{intent.type}:{complexity.level}",
            fallbacks=fallbacks,
        )

    def _score_candidates(self, candidates: list[ModelSpec], intent_type: str) -> ModelSpec:
        """Score and rank candidates, return the best."""
        scored: list[tuple[ModelSpec, float]] = []

        for model in candidates:
            score = 0.0

            # Strongly prefer local over cloud (privacy + latency + no API limits)
            if model.provider in ("ollama", "llamacpp"):
                score += 0.6

            # Quality
            score += model.quality_score * 0.2

            # Speed (normalized to 0–1)
            speed_norm = min(model.avg_tokens_per_second / 100, 1.0)
            score += speed_norm * 0.2

            # Specialization match
            if intent_type in model.specialization:
                score += 0.15

            # Prefer custom JARVIS model for general chat
            if model.id == "jarvis" and intent_type == "chat":
                score += 0.1

            scored.append((model, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[0][0]

    async def stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        provider: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens — auto-routes if no model/provider specified."""

        # If explicit provider given, use it directly
        if provider and provider in self._providers:
            async for token in self._providers[provider].stream(messages, model=model):
                yield token
            return

        # Auto-route based on the last user message
        user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_msg = m.get("content", "")
                break

        decision = self.route(user_msg, forced_model=model)
        prov = self._providers.get(decision.provider_name)

        if prov is None:
            # Fallback to any available provider
            for name, p in self._providers.items():
                prov = p
                break

        if prov is None:
            yield "[Error: No LLM provider available]"
            return

        # Determine the model name to pass to the provider
        model_name = None
        if decision.model:
            if decision.model.provider == "ollama":
                model_name = decision.model.ollama_name
            elif decision.model.provider == "gemini":
                model_name = {
                    "gemini-flash": "gemini-2.0-flash",
                    "gemini-pro": "gemini-2.5-pro",
                }.get(decision.model.id)

        # Try primary, fallback on error
        try:
            async for token in prov.stream(messages, model=model_name):
                yield token
        except Exception as primary_err:
            # Fallback: try next available provider
            for fb_name, fb_prov in self._providers.items():
                if fb_name == decision.provider_name:
                    continue
                try:
                    async for token in fb_prov.stream(messages):
                        yield token
                    return
                except Exception:
                    continue
            yield f"[Error: All providers failed. Primary: {primary_err}]"

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        provider: str | None = None,
    ) -> str:
        """Non-streaming completion."""
        chunks = []
        async for token in self.stream(messages, model=model, provider=provider):
            chunks.append(token)
        return "".join(chunks)


# Global singleton
llm_router = LLMRouter()
