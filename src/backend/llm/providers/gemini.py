"""
Gemini LLM provider — connects to Google's Gemini API.
Uses the REST API directly (no SDK dependency).
"""

import json
from typing import AsyncGenerator

import httpx

from config import config

GEMINI_STREAM_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
GEMINI_DEFAULT_MODEL = "gemini-2.0-flash"


class GeminiProvider:
    """Streams completions from Google Gemini API."""

    def __init__(self):
        self.api_key = config.gemini_api_key
        self.default_model = GEMINI_DEFAULT_MODEL

    async def stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from Gemini."""
        if not self.api_key:
            yield "[Error: GEMINI_API_KEY not configured]"
            return

        model = model or self.default_model
        url = GEMINI_STREAM_URL.format(model=model)

        # Convert OpenAI-style messages to Gemini format
        contents = []
        system_instruction = None

        for msg in messages:
            role = msg["role"]
            text = msg["content"]
            if role == "system":
                system_instruction = text
            elif role == "user":
                contents.append({"role": "user", "parts": [{"text": text}]})
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": text}]})

        payload: dict = {"contents": contents}
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        params = {"alt": "sse", "key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST", url, json=payload, params=params
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        yield f"[Gemini Error {resp.status_code}: {body.decode()[:200]}]"
                        return

                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            return
                        try:
                            data = json.loads(data_str)
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        yield text
                        except json.JSONDecodeError:
                            continue

        except httpx.ConnectError as e:
            raise ConnectionError(f"Cannot connect to Gemini API") from e
        except Exception as e:
            raise ConnectionError(f"Gemini error: {e}") from e

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
    ) -> str:
        """Non-streaming completion."""
        chunks = []
        async for token in self.stream(messages, model=model):
            chunks.append(token)
        return "".join(chunks)
