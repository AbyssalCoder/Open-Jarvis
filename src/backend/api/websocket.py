"""
WebSocket handler — real-time bidirectional communication with the frontend.
"""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.event_bus import event_bus
from core.context import JarvisContext
from agents.registry import agent_registry

ws_router = APIRouter()

# Connected clients
_clients: set[WebSocket] = set()


async def broadcast(msg_type: str, data: dict):
    """Send a message to all connected WebSocket clients."""
    payload = json.dumps({"type": msg_type, "data": data})
    disconnected = set()
    for ws in _clients:
        try:
            await ws.send_text(payload)
        except Exception:
            disconnected.add(ws)
    _clients.difference_update(disconnected)


# Wire event bus → WebSocket broadcast
event_bus.on("agent.state", lambda data: broadcast("agent.state", data))


@ws_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    _clients.add(websocket)

    # Send initial state
    await websocket.send_text(
        json.dumps({"type": "system.connected", "data": {"status": "ready"}})
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")
            msg_data = msg.get("data", {})

            if msg_type == "chat.message":
                await handle_chat(websocket, msg_data)
            else:
                # Forward unknown messages to event bus
                event_bus.emit(msg_type, msg_data)

    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)


async def handle_chat(ws: WebSocket, data: dict):
    """Process a chat message through the agent pipeline."""
    content = data.get("content", "").strip()
    if not content:
        return

    # Build context
    ctx = JarvisContext(user_input=content)

    # Signal stream start
    await ws.send_text(
        json.dumps({"type": "stream.start", "data": {}})
    )

    # Route to brain agent (orchestrator)
    brain = agent_registry.get("brain")
    if brain is None:
        await ws.send_text(
            json.dumps({
                "type": "stream.token",
                "data": {"token": "[Error: Brain agent not available]"},
            })
        )
    else:
        async for token in brain.process(ctx):
            await ws.send_text(
                json.dumps({"type": "stream.token", "data": {"token": token}})
            )

    # Signal stream end
    await ws.send_text(
        json.dumps({"type": "stream.end", "data": {}})
    )
