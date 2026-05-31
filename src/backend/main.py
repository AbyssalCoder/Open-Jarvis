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

    # Take over Telegram from cloud bot (delete webhook → enable polling)
    await _telegram_take_over()

    # Start background reminder checker
    reminder_task = asyncio.create_task(_check_reminders_loop())
    email_monitor_task = asyncio.create_task(_check_email_monitor_loop())
    telegram_task = asyncio.create_task(_telegram_bot_loop())

    yield

    # Shutdown — hand Telegram back to cloud bot
    print("[JARVIS] Shutting down...")
    reminder_task.cancel()
    email_monitor_task.cancel()
    telegram_task.cancel()
    await _telegram_hand_off()
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


async def _check_email_monitor_loop():
    """Background loop: check for important emails every 5 minutes and send notifications."""
    from agents.tools import (
        _email_monitor_active,
        check_important_emails,
        _send_notification,
    )
    while True:
        try:
            await asyncio.sleep(300)  # Check every 5 minutes
            # Re-import to get current state (mutable global)
            from agents import tools as tools_mod
            if not tools_mod._email_monitor_active:
                continue

            important = await check_important_emails()
            for em in important:
                msg = (
                    f"📧 Important Email!\n"
                    f"From: {em['sender']}\n"
                    f"Subject: {em['subject']}\n"
                    f"Reason: {em['reason']} (Score: {em['score']}/10)"
                )
                result = await _send_notification(msg)
                print(f"[JARVIS] Email alert sent: {em['subject']} — {result}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[JARVIS] Email monitor error: {e}")


async def _telegram_take_over():
    """Delete webhook so local polling takes over from cloud bot."""
    from agents.tools import _TELEGRAM_BOT_TOKEN
    if not _TELEGRAM_BOT_TOKEN:
        return
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{_TELEGRAM_BOT_TOKEN}/deleteWebhook"
            )
            if resp.status_code == 200:
                print("[JARVIS] Telegram webhook deleted — local polling active")
    except Exception as e:
        print(f"[JARVIS] Webhook delete error: {e}")


async def _telegram_hand_off():
    """Set webhook back to cloud bot URL so it takes over when laptop is off."""
    from agents.tools import _TELEGRAM_BOT_TOKEN
    import os
    cloud_url = os.getenv("CLOUD_BOT_URL", "")
    if not _TELEGRAM_BOT_TOKEN or not cloud_url:
        return
    try:
        import httpx
        webhook_url = f"{cloud_url.rstrip('/')}/webhook"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{_TELEGRAM_BOT_TOKEN}/setWebhook",
                json={"url": webhook_url},
            )
            if resp.status_code == 200:
                print(f"[JARVIS] Telegram webhook set to cloud bot: {webhook_url}")
    except Exception as e:
        print(f"[JARVIS] Webhook set error: {e}")


async def _telegram_bot_loop():
    """Background loop: poll Telegram for incoming messages and process commands."""
    from agents.tools import (
        _TELEGRAM_BOT_TOKEN,
        telegram_get_updates,
        telegram_handle_command,
        telegram_send,
    )
    if not _TELEGRAM_BOT_TOKEN:
        print("[JARVIS] Telegram bot not configured (set TELEGRAM_BOT_TOKEN in .env)")
        return

    print("[JARVIS] Telegram bot started — listening for messages...")
    while True:
        try:
            updates = await telegram_get_updates()
            for update in updates:
                msg = update.get("message", {})
                text = msg.get("text", "")
                chat_id = msg.get("chat", {}).get("id", "")
                user = msg.get("from", {}).get("first_name", "User")

                if not text or not chat_id:
                    continue

                print(f"[JARVIS] Telegram from {user}: {text}")
                response = await telegram_handle_command(text, str(chat_id))
                await telegram_send(str(chat_id), response)

            # Short pause between polls (Telegram long-polling handles the wait)
            await asyncio.sleep(1)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[JARVIS] Telegram bot error: {e}")
            await asyncio.sleep(5)  # Back off on error


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
