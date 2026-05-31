"""
JARVIS Cloud Telegram Bot
Lightweight bot that runs on Render.com (free) so JARVIS works even when laptop is off.
Handles: email, weather, news, translate, define, calculate, prices, jokes, conversation (Gemini).
"""

import os
import re
import json
import imaplib
import smtplib
import email as email_lib
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from flask import Flask, request
import httpx

# ─── Configuration ────────────────────────────────────────────────────────────
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
EMAIL_USER = os.environ.get("JARVIS_EMAIL_USER", "")
EMAIL_PASS = os.environ.get("JARVIS_EMAIL_PASSWORD", "")
OWNER_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
OWNER_NAME = os.environ.get("OWNER_NAME", "Boss")

app = Flask(__name__)


# ─── Telegram Helpers ─────────────────────────────────────────────────────────

def tg_send(chat_id, text):
    """Send message to Telegram chat."""
    for i in range(0, len(text), 4000):
        chunk = text[i : i + 4000]
        try:
            httpx.post(
                f"https://api.telegram.org/bot{TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": chunk, "parse_mode": "HTML"},
                timeout=15,
            )
        except Exception:
            httpx.post(
                f"https://api.telegram.org/bot{TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": chunk},
                timeout=15,
            )


# ─── Webhook Endpoint ─────────────────────────────────────────────────────────

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json
    if not data:
        return "ok"

    msg = data.get("message", {})
    text = msg.get("text", "")
    chat_id = msg.get("chat", {}).get("id")

    if not text or not chat_id:
        return "ok"

    # Security: only respond to authorized user
    if OWNER_CHAT_ID and str(chat_id) != str(OWNER_CHAT_ID):
        tg_send(chat_id, "⛔ Unauthorized. This is a private bot.")
        return "ok"

    try:
        response = handle(text)
    except Exception as e:
        response = f"❌ Error: {e}"

    tg_send(chat_id, response)
    return "ok"


@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok", "bot": "JARVIS Cloud", "time": datetime.now().isoformat()}


# ─── Command Router ───────────────────────────────────────────────────────────

LOCAL_COMMANDS = [
    "screenshot", "launch ", "open app", "media ", "play ", "pause",
    "next track", "previous track", "volume", "mute", "system info",
    "type in", "browser ", "vision", "webcam", "whatsapp", "check whatsapp",
    "generate image", "draw ", "paint ", "git ", "run python", "run command",
    "terminal", "create project", "clipboard", "speed test", "qr code",
    "search files", "write code", "write document", "launch app",
]


def handle(text):
    """Route incoming message to the right handler."""
    lower = text.lower().strip()

    # ── Special commands
    if lower in ("/start", "/help"):
        return HELP_TEXT
    if lower == "/status":
        return (
            f"☁️ <b>JARVIS Cloud Bot</b>\n"
            f"Mode: Cloud (laptop may be off)\n"
            f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"Email: {'✅' if EMAIL_USER else '❌'}\n"
            f"Gemini AI: {'✅' if GEMINI_KEY else '❌'}"
        )
    if lower == "/emails":
        return check_email()

    # ── Check if local-only command
    for cmd in LOCAL_COMMANDS:
        if cmd in lower:
            return (
                "🖥️ This command requires your laptop to be running with JARVIS.\n"
                "It's not available in cloud mode.\n\n"
                "Cloud commands: /help"
            )

    # ── Email commands
    if re.match(r"(check|read|show|get).*(email|mail|inbox)", lower):
        return check_email()

    email_match = re.match(
        r"(?:send|write|compose|draft)\s+(?:an?\s+)?(?:email|mail)\s+to\s+"
        r"([\w.\+\-]+@[\w.\-]+)\s+(?:about|regarding|subject|saying)\s+(.+)",
        lower,
    )
    if email_match:
        return send_email(email_match.group(1), email_match.group(2), text)

    # ── Weather
    weather_match = re.match(
        r"(?:weather|temperature|forecast)\s+(?:in|at|for|of)\s+(.+)", lower
    )
    if weather_match:
        return get_weather(weather_match.group(1).strip())
    if lower.startswith("weather"):
        city = lower.replace("weather", "").strip()
        return get_weather(city or "auto")

    # ── News
    news_match = re.match(r"(?:news|headlines|latest)\s*(?:about|on|for)?\s*(.+)", lower)
    if news_match and news_match.group(1).strip():
        return get_news(news_match.group(1).strip())

    # ── Translate
    trans_match = re.match(r"translate\s+(.+?)\s+to\s+(\w+)", lower)
    if trans_match:
        return translate(trans_match.group(1), trans_match.group(2))

    # ── Define
    def_match = re.match(
        r"(?:define|meaning\s+of|what\s+(?:does|is)\s+(?:the\s+)?(?:word\s+)?)"
        r"\s*['\"]?(\w+)['\"]?",
        lower,
    )
    if def_match:
        return define_word(def_match.group(1))

    # ── Calculate
    calc_match = re.match(r"(?:calculate|calc|compute|eval|what\s+is)\s+(.+)", lower)
    if calc_match:
        return calculate(calc_match.group(1).strip().rstrip("?"))

    # ── Time / Date
    if any(w in lower for w in ["what time", "current time", "date today", "what date", "what day"]):
        now = datetime.now()
        return f"🕐 {now.strftime('%A, %B %d, %Y')}\n⏰ {now.strftime('%I:%M %p')} (Server Time)"

    # ── Joke
    if "joke" in lower:
        return tell_joke()

    # ── Price
    price_match = re.match(r"(?:price|value)\s+(?:of\s+)?(\w+)", lower)
    if price_match:
        return get_price(price_match.group(1))
    crypto_match = re.match(r"(bitcoin|btc|ethereum|eth|dogecoin|doge|solana|sol)\s*(?:price)?", lower)
    if crypto_match:
        return get_price(crypto_match.group(1))

    # ── Reminder (not persistent in cloud)
    if re.match(r"remind\s+me", lower):
        return (
            "⚠️ Reminders aren't available in cloud mode (they need your laptop running).\n"
            "Try again when JARVIS desktop is active!"
        )

    # ── Gemini fallback for conversation
    if GEMINI_KEY:
        return gemini_chat(text)

    return "I received your message but couldn't process it. Try /help to see available commands."


# ─── Command Implementations ──────────────────────────────────────────────────

def check_email():
    """Check Gmail for unread emails via IMAP."""
    if not EMAIL_USER or not EMAIL_PASS:
        return "❌ Email not configured. Set JARVIS_EMAIL_USER and JARVIS_EMAIL_PASSWORD."
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", timeout=15)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("INBOX")
        _, data = mail.search(None, "UNSEEN")
        ids = data[0].split()
        if not ids:
            mail.logout()
            return "📭 No unread emails."

        results = [f"📬 {len(ids)} unread email(s):\n"]
        for eid in ids[-5:]:
            _, msg_data = mail.fetch(eid, "(RFC822)")
            msg = email_lib.message_from_bytes(msg_data[0][1])

            subject = ""
            raw_subj = msg.get("Subject", "")
            if raw_subj:
                parts = decode_header(raw_subj)
                subject = "".join(
                    p.decode(c or "utf-8") if isinstance(p, bytes) else p
                    for p, c in parts
                )

            sender = msg.get("From", "Unknown")
            results.append(f"• <b>{subject}</b>\n  From: {sender}")

        mail.logout()
        return "\n\n".join(results)
    except Exception as e:
        return f"❌ Email error: {e}"


def send_email(to_addr, subject, body_hint):
    """Send an email via Gmail SMTP."""
    if not EMAIL_USER or not EMAIL_PASS:
        return "❌ Email not configured."

    # Use Gemini to draft a professional email body
    body = body_hint
    if GEMINI_KEY:
        try:
            body = gemini_generate(
                f"Draft a professional but friendly email body. Subject: {subject}. "
                f"Sender name: {OWNER_NAME}. Keep it concise (3-5 sentences). "
                f"Return ONLY the email body text, no subject line or extra formatting."
            )
        except Exception:
            body = f"Hi,\n\n{body_hint}\n\nBest regards,\n{OWNER_NAME}"

    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_USER
        msg["To"] = to_addr
        msg["Subject"] = subject.title()
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)

        return f"✅ Email sent to {to_addr}\nSubject: {subject.title()}\n\n{body}"
    except Exception as e:
        return f"❌ Send error: {e}"


def get_weather(city):
    """Get weather via wttr.in (free, no API key needed)."""
    try:
        r = httpx.get(f"https://wttr.in/{city}?format=3", timeout=10)
        detailed = httpx.get(f"https://wttr.in/{city}?format=%C+%t+%h+%w+%p", timeout=10)
        return f"🌤 {r.text.strip()}\n📊 {detailed.text.strip()}"
    except Exception as e:
        return f"❌ Weather error: {e}"


def get_news(topic):
    """Get news headlines via Gemini."""
    if GEMINI_KEY:
        return gemini_generate(
            f"Give me 5 latest news headlines about '{topic}' as of {datetime.now().strftime('%B %Y')}. "
            f"Format as a numbered list with brief 1-line summaries. Be factual and current."
        )
    return "❌ News requires Gemini API key."


def translate(text, target_lang):
    """Translate text using MyMemory API (free)."""
    try:
        r = httpx.get(
            "https://api.mymemory.translated.net/get",
            params={"q": text, "langpair": f"en|{target_lang}"},
            timeout=10,
        )
        data = r.json()
        translated = data.get("responseData", {}).get("translatedText", "")
        if translated:
            return f"🌐 {text} → <b>{translated}</b>"
        return "❌ Translation failed."
    except Exception as e:
        return f"❌ Translation error: {e}"


def define_word(word):
    """Look up word definition via free dictionary API."""
    try:
        r = httpx.get(
            f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}", timeout=10
        )
        if r.status_code == 200:
            data = r.json()[0]
            meanings = data.get("meanings", [])
            result = [f"📖 <b>{word}</b>"]
            for m in meanings[:3]:
                pos = m.get("partOfSpeech", "")
                defs = m.get("definitions", [])
                if defs:
                    result.append(
                        f"\n<i>{pos}</i>: {defs[0].get('definition', '')}"
                    )
            return "\n".join(result)
        return f"❌ Word '{word}' not found."
    except Exception as e:
        return f"❌ Definition error: {e}"


def calculate(expr):
    """Safely evaluate a math expression."""
    try:
        safe_expr = expr.replace("^", "**").replace("x", "*").replace("×", "*").replace("÷", "/")
        allowed = set("0123456789+-*/.() ")
        if not all(c in allowed for c in safe_expr):
            if GEMINI_KEY:
                return gemini_generate(f"Calculate: {expr}. Give just the numerical answer.")
            return "❌ Invalid expression. Use only numbers and operators."
        result = eval(safe_expr)
        return f"🔢 {expr} = <b>{result}</b>"
    except Exception as e:
        return f"❌ Calculation error: {e}"


def tell_joke():
    """Get a random joke."""
    try:
        r = httpx.get(
            "https://v2.jokeapi.dev/joke/Any?type=twopart&safe-mode", timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("type") == "single":
                return f"😄 {data['joke']}"
            return f"😄 {data.get('setup', '')}\n\n{data.get('delivery', '')}"
    except Exception:
        pass

    if GEMINI_KEY:
        return gemini_generate("Tell me a short, clean, funny joke. Just the joke, nothing else.")
    return "😄 Why do programmers prefer dark mode? Because light attracts bugs!"


def get_price(symbol):
    """Get crypto or stock price."""
    symbol = symbol.upper().strip()
    crypto_map = {
        "BTC": "bitcoin", "BITCOIN": "bitcoin",
        "ETH": "ethereum", "ETHEREUM": "ethereum",
        "DOGE": "dogecoin", "DOGECOIN": "dogecoin",
        "SOL": "solana", "SOLANA": "solana",
        "ADA": "cardano", "XRP": "ripple",
    }

    coin_id = crypto_map.get(symbol)
    if coin_id:
        try:
            r = httpx.get(
                f"https://api.coingecko.com/api/v3/simple/price"
                f"?ids={coin_id}&vs_currencies=usd,inr&include_24hr_change=true",
                timeout=10,
            )
            data = r.json().get(coin_id, {})
            usd = data.get("usd", 0)
            inr = data.get("inr", 0)
            change = data.get("usd_24h_change", 0)
            emoji = "📈" if change >= 0 else "📉"
            return (
                f"{emoji} <b>{symbol}</b>\n"
                f"USD: ${usd:,.2f}\n"
                f"INR: ₹{inr:,.2f}\n"
                f"24h: {change:+.2f}%"
            )
        except Exception as e:
            return f"❌ Price error: {e}"

    # Stock — use Gemini
    if GEMINI_KEY:
        return gemini_generate(
            f"What is the current stock price of {symbol}? Give a brief answer with the price and 24h change."
        )
    return f"❌ Unknown symbol: {symbol}"


# ─── Gemini API ───────────────────────────────────────────────────────────────

def gemini_generate(prompt):
    """Generate text using Google Gemini API."""
    try:
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={GEMINI_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        return f"❌ Gemini error: {e}"
    return "❌ Could not generate response."


def gemini_chat(user_msg):
    """Conversational response using Gemini."""
    prompt = (
        f"You are JARVIS, a smart AI assistant for {OWNER_NAME}. "
        f"You're running in cloud mode (the user's laptop may be off). "
        f"Be helpful, concise, and friendly. Use 2-4 sentences max. "
        f"If the user asks to do something that requires their laptop "
        f"(launching apps, screenshots, media control, etc.), "
        f"politely tell them that feature needs the laptop version running.\n\n"
        f"User: {user_msg}"
    )
    return gemini_generate(prompt)


# ─── Help Text ────────────────────────────────────────────────────────────────

HELP_TEXT = (
    "☁️ <b>JARVIS Cloud Bot</b>\n"
    "<i>Works even when your laptop is off!</i>\n\n"
    "<b>📧 Email</b>\n"
    "• check email\n"
    "• send email to user@mail.com about meeting\n\n"
    "<b>🌤 Weather</b>\n"
    "• weather in Kolkata\n\n"
    "<b>📰 News</b>\n"
    "• news about technology\n\n"
    "<b>🌐 Language</b>\n"
    "• translate hello to hindi\n"
    "• define ephemeral\n\n"
    "<b>🔢 Math</b>\n"
    "• calculate 1567 * 89\n\n"
    "<b>📊 Finance</b>\n"
    "• bitcoin price\n"
    "• price of ETH\n\n"
    "<b>🎲 Fun</b>\n"
    "• tell me a joke\n\n"
    "<b>🕐 Time</b>\n"
    "• what time is it\n\n"
    "<b>💬 Chat</b>\n"
    "• Ask me anything! (powered by Gemini AI)\n\n"
    "<b>🖥️ Laptop Commands</b> (need laptop ON)\n"
    "• screenshot, launch app, media control,\n"
    "  WhatsApp, browser, vision, git, etc.\n\n"
    "<b>Commands:</b> /status /emails /help"
)


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
