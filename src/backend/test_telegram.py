"""Quick standalone test for Telegram bot — send and receive."""
import httpx
import sys
import time

TOKEN = "8906864852:AAGF4pZELptKQ3trKI5xOu-xJPyZbq_qXgk"
BASE = f"https://api.telegram.org/bot{TOKEN}"

print("1) Verifying bot token...", flush=True)
r = httpx.get(f"{BASE}/getMe", timeout=10)
print(f"   Status: {r.status_code}", flush=True)
data = r.json()
print(f"   Bot: @{data['result']['username']} ({data['result']['first_name']})", flush=True)

print("\n2) Checking for pending updates (offset=0)...", flush=True)
r = httpx.get(f"{BASE}/getUpdates", params={"offset": 0, "timeout": 0}, timeout=15)
updates = r.json().get("result", [])
print(f"   Found {len(updates)} pending update(s)", flush=True)

if updates:
    for u in updates:
        msg = u.get("message", {})
        text = msg.get("text", "N/A")
        chat_id = msg.get("chat", {}).get("id", "?")
        user = msg.get("from", {}).get("first_name", "?")
        print(f"   -> [{u['update_id']}] {user}: {text!r}  (chat_id={chat_id})", flush=True)

    # Reply to last message
    last_msg = updates[-1].get("message", {})
    chat_id = last_msg.get("chat", {}).get("id")
    if chat_id:
        print(f"\n3) Sending test reply to chat_id={chat_id}...", flush=True)
        r = httpx.post(f"{BASE}/sendMessage", json={
            "chat_id": chat_id,
            "text": "Hello! JARVIS Telegram bot is working! Send /help to see available commands."
        }, timeout=10)
        print(f"   Send status: {r.status_code} ok={r.json().get('ok')}", flush=True)

        # Confirm offset to avoid re-processing
        max_id = max(u["update_id"] for u in updates)
        httpx.get(f"{BASE}/getUpdates", params={"offset": max_id + 1, "timeout": 0}, timeout=10)
        print(f"   Confirmed offset to {max_id + 1}", flush=True)
        print(f"\n   CHAT_ID for .env: {chat_id}", flush=True)
else:
    print("\n   No messages yet. Please send a message to the bot on Telegram.", flush=True)
    print("   Waiting 30 seconds for a message...", flush=True)
    for i in range(6):
        time.sleep(5)
        r = httpx.get(f"{BASE}/getUpdates", params={"timeout": 0}, timeout=15)
        updates = r.json().get("result", [])
        if updates:
            msg = updates[-1].get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            text = msg.get("text", "")
            user = msg.get("from", {}).get("first_name", "?")
            print(f"\n   Got message from {user}: {text!r} (chat_id={chat_id})", flush=True)
            
            r = httpx.post(f"{BASE}/sendMessage", json={
                "chat_id": chat_id,
                "text": "Hello! JARVIS Telegram bot is working! Send /help to see available commands."
            }, timeout=10)
            print(f"   Reply sent: {r.status_code}", flush=True)
            
            max_id = max(u["update_id"] for u in updates)
            httpx.get(f"{BASE}/getUpdates", params={"offset": max_id + 1, "timeout": 0}, timeout=10)
            print(f"\n   CHAT_ID for .env: {chat_id}", flush=True)
            break
        print(f"   ... waiting ({(i+1)*5}s)", flush=True)
    else:
        print("\n   Timed out. Send a message to the bot and run this script again.", flush=True)

print("\nDone!", flush=True)
