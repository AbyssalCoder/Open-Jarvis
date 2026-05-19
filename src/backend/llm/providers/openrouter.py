"""
OpenRouter LLM provider — access multiple cloud models via OpenRouter API.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md §8.2
"""

import json
from typing import AsyncGenerator

import httpx

from config import config
from llm.providers.base import ModelProvider, GenerationParams


OPENROUTER_BASE = "https://openrouter.ai/api/v1"


class OpenRouterProvider(ModelProvider):
    """Streams completions via OpenRouter (multi-model cloud gateway)."""

    def __init__(self):
        self.api_key = config.openrouter_api_key
        self.default_model = "meta-llama/llama-3.1-8b-instruct:free"

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def list_models(self) -> list[str]:
        if not self.api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{OPENROUTER_BASE}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return [m["id"] for m in data.get("data", [])]
        except Exception:
            pass
        return []

    async def stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        params: GenerationParams | None = None,
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield "[Error: OPENROUTER_API_KEY not configured]"
            return

        model = model or self.default_model
        params = params or GenerationParams()

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://jarvis-ai.local",
            "X-Title": "JARVIS AI Assistant",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "temperature": params.temperature,
            "max_tokens": params.max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{OPENROUTER_BASE}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        yield f"[OpenRouter Error {resp.status_code}: {body.decode()[:200]}]"
                        return

                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            return
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            token = delta.get("content", "")
                            if token:
                                yield token
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue

        except httpx.ConnectError:
            yield "[Error: Cannot connect to OpenRouter API]"
        except Exception as e:
            yield f"[OpenRouter Error: {e}]"
