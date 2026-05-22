"""
Ollama LLM provider — connects to local Ollama instance.
"""

import json
from typing import AsyncGenerator

import httpx

from config import config


class OllamaProvider:
    """Streams completions from a local Ollama server."""

    def __init__(self):
        self.base_url = config.ollama_url
        self.default_model = config.default_model

    async def stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from Ollama /api/chat."""
        model = model or self.default_model
        url = f"{self.base_url}/api/chat"

        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "num_gpu": -1,       # Offload ALL layers to GPU (VRAM) instead of RAM
                "num_ctx": 2048,     # Smaller context window = less memory
            },
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            if token:
                                yield token
                            if data.get("done", False):
                                return
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError as e:
            raise ConnectionError(f"Cannot connect to Ollama at {self.base_url}") from e
        except httpx.HTTPStatusError as e:
            raise ConnectionError(f"Ollama HTTP error: {e}") from e
        except Exception as e:
            raise ConnectionError(f"Ollama error: {e}") from e

    async def list_models(self) -> list[str]:
        """Get available models from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []
