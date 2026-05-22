"""REST API routes."""

import json
import httpx
from fastapi import APIRouter, UploadFile, File
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
    return {"models": [{"name": m["name"], "provider": m["provider"], "size_gb": m["size_gb"]} for m in models]}


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


@router.post("/vision/analyze")
async def vision_analyze_image(file: UploadFile = File(...), query: str = "Describe what you see in detail"):
    """Analyze image with multi-model pipeline (YOLO + GroundingDINO + LLM)."""
    from vision.pipeline import get_vision_pipeline

    image_data = await file.read()
    pipeline = get_vision_pipeline()

    try:
        result = await pipeline.analyze(image_data, query)
        return result
    except Exception as e:
        return {"result": f"Vision analysis error: {e}", "model": None}


@router.post("/vision/detect")
async def vision_detect_objects(file: UploadFile = File(...), query: str = None):
    """Fast detection returning bounding boxes for live overlay. No LLM call.
    Uses YOLO by default; adds GroundingDINO for open-vocabulary queries.
    """
    from vision.pipeline import get_vision_pipeline

    image_data = await file.read()
    pipeline = get_vision_pipeline()

    try:
        detections = await pipeline.detect(image_data, query=query)
        return {"detections": detections}
    except Exception as e:
        return {"detections": [], "error": str(e)}


@router.get("/weather")
async def weather():
    """Get current weather data for the HUD panel."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get("https://wttr.in/?format=j1")
            data = resp.json()
            c = data.get("current_condition", [{}])[0]
            a = data.get("nearest_area", [{}])[0]
            return {
                "temp": int(c.get("temp_C", 0)),
                "condition": c.get("weatherDesc", [{}])[0].get("value", "Unknown"),
                "code": int(c.get("weatherCode", 0)),
                "city": a.get("areaName", [{}])[0].get("value", "Unknown"),
                "humidity": c.get("humidity", "0"),
                "feels_like": c.get("FeelsLikeC", "0"),
            }
    except Exception:
        return {"temp": 0, "condition": "Unavailable", "code": 0, "city": "Offline", "humidity": "0", "feels_like": "0"}


@router.get("/system")
async def system_metrics():
    """Get live system metrics for the HUD panel."""
    import psutil
    try:
        cpu = psutil.cpu_percent(interval=0.3)
        mem = psutil.virtual_memory()
        return {
            "cpu": round(cpu, 1),
            "ram_used_mb": round(mem.used / (1024 ** 2)),
            "ram_total_mb": round(mem.total / (1024 ** 2)),
            "gpu": 0,  # GPU monitoring requires pynvml — omitted for size
        }
    except Exception:
        return {"cpu": 0, "ram_used_mb": 0, "ram_total_mb": 0, "gpu": 0}


@router.get("/scheduler")
async def list_reminders():
    """List all scheduled reminders."""
    from agents.tools import scheduler as scheduler_fn
    result = await scheduler_fn("list")
    return {"result": result}


@router.post("/scheduler")
async def manage_reminder(body: dict):
    """Add/remove/clear reminders via REST."""
    from agents.tools import scheduler as scheduler_fn
    action = body.get("action", "list")
    text = body.get("text", "")
    time = body.get("time", "")
    result = await scheduler_fn(action, text, time)
    return {"result": result}


@router.get("/ollama/status")
async def ollama_status():
    """Proxy Ollama health check — auto-restarts Ollama if it died."""
    from config import config
    import subprocess
    import os
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{config.ollama_url}/api/tags", timeout=3.0)
            data = resp.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            return {"status": "ok", "models": models}
    except Exception:
        # Ollama is down — try to restart it
        try:
            ollama_paths = ["ollama"]
            localappdata = os.environ.get("LOCALAPPDATA", "")
            if localappdata:
                ollama_paths.append(os.path.join(localappdata, "Programs", "Ollama", "ollama.exe"))
            ollama_paths.append(r"C:\Program Files\Ollama\ollama.exe")
            for p in ollama_paths:
                try:
                    CREATE_NEW_PROCESS_GROUP = 0x00000200
                    CREATE_NO_WINDOW = 0x08000000
                    subprocess.Popen(
                        [p, "serve"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                        creationflags=CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW,
                        env={
                            **os.environ,
                            "OLLAMA_ORIGINS": "https://tauri.localhost,http://localhost:1420,http://localhost:8420",
                            "OLLAMA_NUM_GPU": "-1",          # Offload ALL layers to GPU
                            "OLLAMA_GPU_OVERHEAD": "0",      # Don't reserve extra VRAM
                            "CUDA_VISIBLE_DEVICES": "0",     # Use first GPU
                        },
                    )
                    return {"status": "restarting", "models": []}
                except FileNotFoundError:
                    continue
        except Exception:
            pass
        return {"status": "error", "models": []}


class TTSRequest(BaseModel):
    text: str
    voice: str | None = None
    singing: bool = False


@router.post("/tts")
async def text_to_speech(body: TTSRequest):
    """Generate high-quality neural TTS audio using edge-tts.
    Returns audio/mpeg stream directly playable in browser.
    When singing=True, uses slower rate and higher pitch for a sing-song quality."""
    import edge_tts

    text = body.text.strip()
    if not text:
        return {"error": "No text provided"}

    voice = body.voice or "en-US-AvaMultilingualNeural"

    if body.singing:
        # Singing mode: slower rate, higher pitch, expressive
        async def audio_stream():
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            # Alternate pitches for musical variation
            pitches = ["+12Hz", "+18Hz", "+8Hz", "+15Hz", "+10Hz", "+20Hz"]
            rates = ["-18%", "-22%", "-15%", "-20%", "-16%", "-24%"]
            for i, line in enumerate(lines):
                communicate = edge_tts.Communicate(
                    line, voice,
                    rate=rates[i % len(rates)],
                    pitch=pitches[i % len(pitches)],
                    volume="+10%",
                )
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        yield chunk["data"]
    else:
        async def audio_stream():
            communicate = edge_tts.Communicate(
                text, voice,
                rate="-5%",
                pitch="+8Hz",
                volume="+10%",
            )
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]

    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline"},
    )


@router.get("/tts/voices")
async def list_tts_voices():
    """List available neural voices for TTS."""
    import edge_tts
    voices = await edge_tts.list_voices()
    # Filter to English female voices
    en_female = [
        {"name": v["ShortName"], "friendly": v["FriendlyName"], "locale": v["Locale"]}
        for v in voices
        if v["Locale"].startswith("en") and v["Gender"] == "Female"
    ]
    return {"voices": en_female}
