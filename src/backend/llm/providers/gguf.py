"""
GGUF Direct provider — loads .gguf models via llama-cpp-python.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md §7

Requires: pip install llama-cpp-python
Only loaded when user has GGUF files on disk.
"""

import asyncio
import gc
from pathlib import Path
from typing import AsyncGenerator

from llm.providers.base import ModelProvider, GenerationParams


class GGUFProvider(ModelProvider):
    """Direct GGUF model loading via llama-cpp-python."""

    def __init__(self):
        self._models: dict[str, object] = {}
        self._llama_cpp = None

    def _ensure_import(self):
        """Lazy import — only load llama_cpp when actually needed."""
        if self._llama_cpp is None:
            try:
                import llama_cpp
                self._llama_cpp = llama_cpp
            except ImportError:
                raise RuntimeError(
                    "llama-cpp-python not installed. "
                    "Install with: pip install llama-cpp-python"
                )

    async def is_available(self) -> bool:
        try:
            self._ensure_import()
            return True
        except RuntimeError:
            return False

    async def list_models(self) -> list[str]:
        return list(self._models.keys())

    async def load_model(
        self,
        model_id: str,
        model_path: str,
        n_ctx: int = 4096,
        n_batch: int = 512,
        n_threads: int = 4,
        n_gpu_layers: int = 0,
    ):
        """Load a GGUF model file into memory."""
        self._ensure_import()
        Llama = self._llama_cpp.Llama

        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(
            None,
            lambda: Llama(
                model_path=model_path,
                n_ctx=n_ctx,
                n_batch=n_batch,
                n_threads=n_threads,
                n_gpu_layers=n_gpu_layers,
                use_mmap=True,
                verbose=False,
            ),
        )
        self._models[model_id] = model

    async def unload_model(self, model_id: str):
        """Unload a model to free RAM/VRAM."""
        if model_id in self._models:
            del self._models[model_id]
            gc.collect()

    async def stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        params: GenerationParams | None = None,
    ) -> AsyncGenerator[str, None]:
        model_id = model or (list(self._models.keys())[0] if self._models else None)
        if model_id is None or model_id not in self._models:
            yield "[Error: No GGUF model loaded]"
            return

        llm = self._models[model_id]
        params = params or GenerationParams()
        loop = asyncio.get_event_loop()

        def _generate():
            return llm.create_chat_completion(
                messages=messages,
                stream=True,
                temperature=params.temperature,
                top_p=params.top_p,
                max_tokens=params.max_tokens,
            )

        try:
            stream = await loop.run_in_executor(None, _generate)
            for chunk in stream:
                delta = chunk["choices"][0].get("delta", {})
                token = delta.get("content", "")
                if token:
                    yield token
        except Exception as e:
            yield f"[GGUF Error: {e}]"


class GGUFScanner:
    """Scan for GGUF model files on disk."""

    SEARCH_PATHS = [
        Path.home() / ".jarvis" / "models",
        Path.home() / "models",
        Path.home() / ".cache" / "lm-studio" / "models",
        Path("data") / "models",
    ]

    async def scan(self) -> list[dict]:
        """Find all GGUF files in known locations."""
        found = []
        for search_path in self.SEARCH_PATHS:
            if not search_path.exists():
                continue
            for gguf_file in search_path.rglob("*.gguf"):
                info = {
                    "path": str(gguf_file),
                    "name": gguf_file.stem,
                    "size_gb": round(gguf_file.stat().st_size / (1024**3), 2),
                }
                found.append(info)
        return found
