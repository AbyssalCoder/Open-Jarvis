"""
Model Manager — handles downloading, listing, switching, and recommending LLM models.
Works with Ollama, HuggingFace, and local GGUF files.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md §10–§11
"""

import json
from pathlib import Path
from dataclasses import dataclass

import httpx

from config import config
from llm.registry import model_registry


# Recommended models per hardware tier
TIER_MODELS: dict[str, list[str]] = {
    "minimal": ["qwen2.5:1.5b", "jarvis"],
    "low": ["llama3.2:3b", "qwen2.5:1.5b", "jarvis"],
    "medium": ["llama3.1:8b", "qwen2.5-coder:7b", "llama3.2:3b", "jarvis"],
    "high": ["qwen2.5:14b", "llama3.1:8b", "qwen2.5-coder:7b", "jarvis"],
    "ultra": ["qwen2.5:32b", "deepseek-r1:32b", "qwen2.5:14b", "jarvis"],
}


def select_quantization(available_ram_mb: int, available_vram_mb: int, param_count: str) -> str:
    """Select best quantization level given hardware constraints."""
    try:
        param_b = float(param_count.replace("B", ""))
    except ValueError:
        return "Q4_K_M"

    estimates = {
        "Q3_K_M": param_b * 0.47,
        "Q4_K_M": param_b * 0.63,
        "Q5_K_M": param_b * 0.73,
        "Q6_K": param_b * 0.84,
        "Q8_0": param_b * 1.03,
    }

    available_gb = max(available_vram_mb, available_ram_mb) / 1024
    usable_gb = available_gb - 2.0

    for quant in ["Q8_0", "Q6_K", "Q5_K_M", "Q4_K_M", "Q3_K_M"]:
        if estimates[quant] <= usable_gb:
            return quant
    return "Q3_K_M"


class ModelManager:
    """Manages LLM models: list, pull, delete, recommend, hot-swap."""

    def __init__(self):
        self.ollama_url = config.ollama_url

    async def list_ollama_models(self) -> list[dict]:
        """List models available in local Ollama instance."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.ollama_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = []
                for m in data.get("models", []):
                    size_gb = m.get("size", 0) / (1024 ** 3)
                    models.append({
                        "name": m["name"],
                        "provider": "ollama",
                        "size_gb": round(size_gb, 2),
                        "is_available": True,
                    })
                return models
        except Exception:
            return []

    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry."""
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/pull",
                    json={"name": model_name, "stream": False},
                )
                return resp.status_code == 200
        except Exception:
            return False

    async def delete_model(self, model_name: str) -> bool:
        """Delete a model from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.delete(
                    f"{self.ollama_url}/api/delete",
                    json={"name": model_name},
                )
                return resp.status_code == 200
        except Exception:
            return False

    def recommend_models(self, tier: str) -> list[str]:
        """Recommend models for a hardware tier."""
        return TIER_MODELS.get(tier, TIER_MODELS["minimal"])

    async def get_model_info(self, model_name: str) -> dict | None:
        """Get detailed info about a specific Ollama model."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/show",
                    json={"name": model_name},
                )
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            pass
        return None

    async def sync_registry(self):
        """Sync Ollama available models into the model registry."""
        models = await self.list_ollama_models()
        names = [m["name"] for m in models]
        await model_registry.sync_ollama_availability(names)

    async def hot_swap(self, from_model: str, to_model: str) -> bool:
        """Hot-swap models: pull new, verify, then optionally unload old."""
        # Pull the new model if needed
        models = await self.list_ollama_models()
        available = [m["name"] for m in models]

        if to_model not in available:
            success = await self.pull_model(to_model)
            if not success:
                return False

        # Verify the new model works with a quick test
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": to_model,
                        "messages": [{"role": "user", "content": "hi"}],
                        "stream": False,
                    },
                )
                if resp.status_code != 200:
                    return False
        except Exception:
            return False

        # Sync registry
        await self.sync_registry()
        return True


# Global singleton
model_manager = ModelManager()
