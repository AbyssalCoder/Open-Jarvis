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

    yield

    # Shutdown
    print("[JARVIS] Shutting down...")
    training_collector.flush()
    await agent_registry.shutdown()


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
        "main:app",
        host="0.0.0.0",
        port=8420,
        reload=False,
        log_level="info",
        ws="websockets",
    )


if __name__ == "__main__":
    main()
