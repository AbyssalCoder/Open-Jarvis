"""
JARVIS AI Operating System — Backend Entry Point

Launches FastAPI server on port 8420 with:
- REST API endpoints
- WebSocket handler for real-time communication
- Agent system initialization
- Model router startup
"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as api_router
from api.websocket import ws_router
from core.event_bus import event_bus
from agents.registry import agent_registry
from llm.router import llm_router
from llm.training_data import training_collector


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Startup
    print("[JARVIS] Starting backend...")
    await agent_registry.initialize()
    await llm_router.initialize()
    event_bus.emit("system.ready", {})
    print("[JARVIS] Backend ready on port 8420")

    # Start background reminder checker
    reminder_task = asyncio.create_task(_check_reminders_loop())

    yield

    # Shutdown
    print("[JARVIS] Shutting down...")
    reminder_task.cancel()
    training_collector.flush()
    await agent_registry.shutdown()


async def _check_reminders_loop():
    """Background loop: check for due reminders every 30s and emit events."""
    from datetime import datetime
    from agents.tools import _load_reminders, _save_reminders
    while True:
        try:
            await asyncio.sleep(30)
            reminders = _load_reminders()
            now = datetime.now()
            due = [r for r in reminders if datetime.fromisoformat(r["due"]) <= now]
            if due:
                remaining = [r for r in reminders if datetime.fromisoformat(r["due"]) > now]
                _save_reminders(remaining)
                for r in due:
                    event_bus.emit("reminder.due", {"text": r["text"], "due": r["due"]})
                    print(f"[JARVIS] Reminder due: {r['text']}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[JARVIS] Reminder check error: {e}")


app = FastAPI(
    title="JARVIS Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Tauri and dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://localhost:5173",
        "tauri://localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(api_router, prefix="/api")
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "agents": agent_registry.active_count,
    }


def main():
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8420,
        reload=False,
        log_level="info",
        ws="websockets",
    )


if __name__ == "__main__":
    main()
