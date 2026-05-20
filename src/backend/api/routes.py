"""REST API routes."""

import json
import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agents.registry import agent_registry
from llm.model_manager import model_manager
from llm.router import llm_router
from core.context import JarvisContext

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    model: str | None = None


@router.post("/chat")
async def chat_stream(body: ChatRequest):
    """SSE streaming chat endpoint — primary chat path."""

    async def generate():
        content = body.message.strip()
        if not content:
            return

        ctx = JarvisContext(user_input=content)
        brain = agent_registry.get("brain")

        if brain is None:
            yield f"data: {json.dumps({'type': 'error', 'token': 'Brain agent not available'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'start'})}\n\n"

        try:
            async for token in brain.process(ctx):
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'token': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'end'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/agents")
async def list_agents():
    return {"agents": agent_registry.list_agents()}


@router.get("/models")
async def list_models():
    models = await model_manager.list_ollama_models()
    return {"models": [{"name": m.name, "provider": m.provider, "size_gb": m.size_gb} for m in models]}


@router.post("/models/pull")
async def pull_model(body: dict):
    name = body.get("name", "")
    if not name:
        return {"error": "Model name required"}
    success = await model_manager.pull_model(name)
    return {"success": success, "model": name}


@router.delete("/models/{model_name}")
async def delete_model(model_name: str):
    success = await model_manager.delete_model(model_name)
    return {"success": success, "model": model_name}


@router.get("/models/recommend/{tier}")
async def recommend_models(tier: str):
    return {"tier": tier, "models": model_manager.recommend_models(tier)}


@router.get("/models/{model_name}")
async def model_info(model_name: str):
    info = await model_manager.get_model_info(model_name)
    if info is None:
        return {"error": "Model not found"}
    return info


@router.get("/status")
async def status():
    return {
        "status": "running",
        "agents": agent_registry.active_count,
    }


@router.get("/ollama/status")
async def ollama_status():
    """Proxy Ollama health check — avoids CORS issues from Tauri webview."""
    from config import config
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{config.ollama_url}/api/tags", timeout=3.0)
            data = resp.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            return {"status": "ok", "models": models}
    except Exception:
        return {"status": "error", "models": []}
