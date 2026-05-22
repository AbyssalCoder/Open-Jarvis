"""
Hybrid Intent Engine — regex-first, LLM-fallback.

Regex patterns handle ALL known command types reliably (instant).
LLM fallback only kicks in for ambiguous/novel requests the patterns miss.
This is critical because qwen2.5:1.5b can't reliably output JSON classification.
"""

import json
import re
import httpx
from typing import Optional

from config import config


# ── Primary: Regex-based intent detection (instant, reliable) ─────────

def _regex_detect(text: str) -> Optional[tuple[str, dict]]:
    """Pattern-match user input to tools. Handles all known command types.
    Returns (tool_name, args) or None if no pattern matches.
    """
    lower = text.lower().strip()

    # ── Open App / Website ──────────────────────────────────────────
    open_pats = [
        r'(?:open|go\s+to|launch)\s+(youtube|amazon|flipkart|spotify|instagram|github|google|whatsapp|gmail|twitter|linkedin|reddit|chatgpt|x|blinkit|zepto|zomato|swiggy|myntra|meesho|ajio|bigbasket)\b',
    ]
    for pat in open_pats:
        m = re.search(pat, lower)
        if m:
            return ("open_app", {"name": m.group(1)})

    # Explicit URL
    url_match = re.search(r'open\s+(https?://\S+)', lower)
    if url_match:
        return ("open_url", {"url": url_match.group(1)})

    # ── YouTube Play ────────────────────────────────────────────────
    yt_pats = [
        r'play\s+(.+?)\s+on\s+youtube',
        r'youtube\s+play\s+(.+)',
        r'play\s+(?:the\s+)?(?:song|video|music)\s+(.+)',
        r'play\s+(.+?)(?:\s+on\s+youtube)?$',
        r'put\s+on\s+(.+)',
    ]
    for pat in yt_pats:
        m = re.search(pat, lower)
        if m:
            query = m.group(1).strip()
            if query and len(query) > 1:
                return ("youtube_play", {"query": query})

    # ── Media Control ───────────────────────────────────────────────
    media_map = {
        "pause music": "play_pause", "resume music": "play_pause", "pause the music": "play_pause",
        "play pause": "play_pause", "resume playback": "play_pause", "pause playback": "play_pause",
        "next track": "next", "next song": "next", "skip song": "next", "skip track": "next",
        "previous track": "previous", "previous song": "previous",
        "volume up": "volume_up", "increase volume": "volume_up", "louder": "volume_up", "turn up": "volume_up",
        "volume down": "volume_down", "decrease volume": "volume_down", "quieter": "volume_down", "turn down": "volume_down",
        "mute": "mute", "unmute": "mute",
    }
    for phrase, action in media_map.items():
        if phrase in lower:
            return ("media_control", {"action": action})
    if lower.strip() in ("pause", "resume", "skip", "mute", "unmute"):
        single_map = {"pause": "play_pause", "resume": "play_pause", "skip": "next", "mute": "mute", "unmute": "mute"}
        return ("media_control", {"action": single_map[lower.strip()]})

    # ── WhatsApp ────────────────────────────────────────────────────
    wa_match = re.search(r'(?:send|open)\s+(?:a\s+)?whatsapp\s*(?:to\s+)?(.+)?', lower)
    if wa_match or "whatsapp" in lower:
        to = wa_match.group(1).strip() if wa_match and wa_match.group(1) else ""
        msg_match = re.search(r'(?:saying|message|text)\s+(.+)', lower)
        message = msg_match.group(1).strip() if msg_match else ""
        return ("mobile_sync", {"action": "whatsapp", "message": message, "to": to})

    # ── Vision / Camera ─────────────────────────────────────────────
    vision_words = ["analyze this", "what is this", "look at this", "what do you see",
                    "in front of me", "scan this", "capture and analyze", "use camera",
                    "use the camera", "use my camera", "open camera", "open the camera",
                    "open webcam", "open the webcam", "what am i holding",
                    "take a photo", "take a picture", "take photo", "take picture",
                    "what is in front", "identify this", "what can you see", "webcam",
                    "look at me", "see me", "my face", "click a picture", "click a photo",
                    "snap a photo", "capture image"]
    if any(w in lower for w in vision_words):
        return ("vision_analyze", {"query": text})

    # ── Scheduler / Reminders ───────────────────────────────────────
    if re.search(r'(?:show|list|my|check)\s*(?:all\s+)?reminders?', lower) or lower.strip() in ("reminders", "my reminders"):
        return ("scheduler", {"action": "list"})
    if re.search(r'(?:clear|delete|remove)\s*(?:all\s+)?reminders?', lower):
        return ("scheduler", {"action": "clear"})
    if re.search(r'(?:remind|reminder|schedule|alarm|set\s+(?:a\s+)?reminder)', lower):
        text_match = re.search(r'(?:remind\s+me\s+to|reminder\s+to|remind\s+me\s+about)\s+(.+?)(?:\s+(?:in|at|on|after|tomorrow)\s+|$)', lower)
        time_match = re.search(r'(?:in|at|after)\s+(\d+\s*(?:min|minute|hour|h|m|d|day)s?|tomorrow\s*\d*\s*(?:am|pm)?|\d{1,2}:\d{2})', lower)
        reminder_text = text_match.group(1).strip() if text_match else text
        time_str = time_match.group(1).strip() if time_match else ""
        return ("scheduler", {"action": "add", "text": reminder_text, "time": time_str})

    # ── Weather ─────────────────────────────────────────────────────
    weather_words = ["weather", "temperature", "forecast", "rain today", "sunny today", "humid"]
    if any(w in lower for w in weather_words):
        city_match = re.search(r'(?:weather|temperature|forecast)\s+(?:in|at|for|of)\s+([a-zA-Z\s]+)', lower)
        city = city_match.group(1).strip() if city_match else "auto"
        return ("weather", {"city": city})

    # ── System Info ─────────────────────────────────────────────────
    sys_words = ["cpu", "ram", "memory usage", "disk", "system info", "system status", "battery", "storage"]
    if any(w in lower for w in sys_words):
        return ("system_info", {})

    # ── Date / Time ─────────────────────────────────────────────────
    time_words = ["what time", "current time", "what date", "today's date", "what day"]
    if any(w in lower for w in time_words):
        return ("datetime", {})

    # ── Terminal Command ────────────────────────────────────────────
    cmd_match = re.search(r'(?:run|execute)\s+(?:command\s+)?["`\']?(.+?)["`\']?\s*$', lower)
    if cmd_match:
        return ("terminal", {"command": cmd_match.group(1).strip()})

    # ── Screenshot ──────────────────────────────────────────────────
    if any(w in lower for w in ["take a screenshot", "screenshot", "capture screen", "capture my screen"]):
        return ("screenshot", {})

    # ── Shopping / Add to Cart ──────────────────────────────────────
    cart_match = re.search(r'(?:add|put)\s+(.+?)\s+(?:to|in)\s+(?:my\s+)?cart(?:\s+(?:on|from|at)\s+(\w+))?', lower)
    if cart_match:
        item = cart_match.group(1).strip()
        site = cart_match.group(2) or "amazon"
        return ("browser_action", {"action": "add_to_cart", "query": item, "site": site})

    need_match = re.search(r'(?:i\s+)?(?:need|want|get\s+me|get|grab|order|buy|purchase)\s+(\d+)?\s*(.+?)\s+(?:from|on|at)\s+(\w+)', lower)
    if need_match:
        qty = int(need_match.group(1)) if need_match.group(1) else 1
        item = need_match.group(2).strip()
        site = need_match.group(3).strip()
        if site in ("amazon", "flipkart", "blinkit", "zepto", "bigbasket", "myntra", "meesho", "ajio"):
            return ("browser_action", {"action": "add_to_cart", "query": item, "site": site, "quantity": qty})

    buy_match = re.search(r'(?:buy|order|purchase)\s+(\d+)?\s*(.+?)(?:\s+(?:from|on|at)\s+(\w+))?$', lower)
    if buy_match:
        qty = int(buy_match.group(1)) if buy_match.group(1) else 1
        item = buy_match.group(2).strip()
        site = (buy_match.group(3) or "").strip()
        if site in ("amazon", "flipkart", "blinkit", "zepto", "bigbasket"):
            return ("browser_action", {"action": "add_to_cart", "query": item, "site": site, "quantity": qty})
        elif item and len(item) > 2:
            return ("browser_action", {"action": "add_to_cart", "query": item, "site": "amazon", "quantity": qty})

    shop_words = ["shop online", "buy online", "add to cart", "purchase"]
    if any(w in lower for w in shop_words):
        buy_item_match = re.search(r'(?:buy|order|add|get|purchase)\s+(?:a\s+|some\s+|the\s+)?(.+?)(?:\s+online|\s+from|\s+on|$)', lower)
        item = buy_item_match.group(1).strip() if buy_item_match else text
        site = "blinkit" if any(u in lower for u in ["need it now", "quickly", "fast", "instant", "blinkit", "zepto"]) else "flipkart" if "flipkart" in lower else "amazon"
        return ("browser_action", {"action": "add_to_cart", "query": item, "site": site})

    # ── Food Ordering ───────────────────────────────────────────────
    food_words = ["hungry", "order food", "food delivery", "order dinner", "order lunch", "order breakfast", "get food", "want to eat"]
    if any(w in lower for w in food_words):
        return ("open_app", {"name": "swiggy" if "swiggy" in lower else "zomato"})

    # ── Study / Learning ────────────────────────────────────────────
    study_match = re.search(r'(?:study|learn|prepare|revision|revise|exam|test prep)\s+(?:for\s+)?(?:(?:my|the|a)\s+)?(.+)', lower)
    if study_match:
        topic = study_match.group(1).strip()
        action = "find_video" if any(w in lower for w in ["video", "watch", "tutorial"]) else "find_pdf" if any(w in lower for w in ["pdf", "notes", "material"]) else "study_plan" if any(w in lower for w in ["plan", "schedule"]) else "quiz" if any(w in lower for w in ["quiz", "test me"]) else "explain"
        return ("study_help", {"subject": topic, "topic": topic, "action": action})

    if any(w in lower for w in ["help me study", "i need to study", "prepare for exam", "exam preparation"]):
        return ("study_help", {"subject": text, "topic": "", "action": "study_plan"})

    video_find = re.search(r'(?:find|get|show)\s+(?:a\s+|me\s+)?(?:video|tutorial|lecture)s?\s+(?:about|on|for)\s+(.+)', lower)
    if video_find:
        return ("study_help", {"subject": video_find.group(1).strip(), "topic": "", "action": "find_video"})

    pdf_find = re.search(r'(?:find|get|download|show)\s+(?:a\s+|me\s+)?(?:pdf|notes|material|document)s?\s+(?:about|on|for|of)\s+(.+)', lower)
    if pdf_find:
        return ("study_help", {"subject": pdf_find.group(1).strip(), "topic": "", "action": "find_pdf"})

    # ── Research ────────────────────────────────────────────────────
    research_match = re.search(r'(?:research|investigate|deep dive|explore|dig into)\s+(?:about\s+|on\s+|into\s+)?(.+)', lower)
    if research_match:
        depth = "deep" if any(w in lower for w in ["deep", "thorough", "detailed"]) else "overview"
        return ("research_topic", {"query": research_match.group(1).strip(), "depth": depth})

    # ── Translation ─────────────────────────────────────────────────
    trans_match = re.search(r'translate\s+["\']?(.+?)["\']?\s+(?:to|in|into)\s+(\w+)', lower)
    if trans_match:
        return ("translate", {"text": trans_match.group(1).strip(), "target_lang": trans_match.group(2).strip()})
    say_match = re.search(r'(?:say|how\s+(?:do\s+you\s+)?say)\s+["\']?(.+?)["\']?\s+in\s+(\w+)', lower)
    if say_match:
        return ("translate", {"text": say_match.group(1).strip(), "target_lang": say_match.group(2).strip()})

    # ── Dictionary ──────────────────────────────────────────────────
    define_match = re.search(r'(?:define|meaning of|what does|what is the meaning of|definition of)\s+["\']?(\w+)["\']?', lower)
    if define_match:
        return ("define", {"word": define_match.group(1).strip()})

    # ── News ────────────────────────────────────────────────────────
    news_words = ["news", "headlines", "latest news", "current events", "whats happening"]
    if any(w in lower for w in news_words):
        topic_match = re.search(r'(?:news|headlines)\s+(?:about|on|regarding)\s+(.+)', lower)
        topic = topic_match.group(1).strip() if topic_match else "top"
        return ("news", {"topic": topic})

    # ── Calculator ──────────────────────────────────────────────────
    calc_match = re.search(r'(?:calculate|compute|solve|what is|whats)\s+([\d\s+\-*/^x\u00d7\u00f7().]+)', lower)
    if calc_match:
        expr = calc_match.group(1).strip()
        if len(expr) > 2 and any(c in expr for c in "+-*/^x\u00d7\u00f7"):
            return ("calculate", {"expression": expr})

    math_match = re.search(r'(\d+[\d\s]*)\s+(plus|minus|times|divided by|multiplied by|mod|power)\s+(\d+[\d\s]*)', lower)
    if math_match:
        return ("calculate", {"expression": f"{math_match.group(1).strip()} {math_match.group(2)} {math_match.group(3).strip()}"})

    # ── Joke ────────────────────────────────────────────────────────
    if any(w in lower for w in ["tell me a joke", "make me laugh", "joke", "something funny", "tell a joke"]):
        cat = "programming" if "programming" in lower or "coding" in lower else "any"
        return ("joke", {"category": cat})

    # ── System Control ──────────────────────────────────────────────
    sys_ctrl_map = {
        "shut down": "shutdown", "shutdown": "shutdown", "turn off": "shutdown",
        "restart": "restart", "reboot": "restart",
        "sleep": "sleep", "go to sleep": "sleep", "hibernate": "sleep",
        "lock screen": "lock", "lock my computer": "lock", "lock the screen": "lock",
        "empty recycle bin": "empty_recycle_bin", "clear recycle bin": "empty_recycle_bin",
    }
    for phrase, act in sys_ctrl_map.items():
        if phrase in lower:
            return ("system_control", {"action": act})

    # ── Clipboard ───────────────────────────────────────────────────
    if any(w in lower for w in ["whats on clipboard", "what's on clipboard", "read clipboard", "show clipboard", "clipboard contents"]):
        return ("clipboard", {"action": "read"})
    copy_match = re.search(r'(?:copy|put)\s+["\']?(.+?)["\']?\s+(?:to|on|in)\s+clipboard', lower)
    if copy_match:
        return ("clipboard", {"action": "write", "text": copy_match.group(1).strip()})

    # ── Speed Test ──────────────────────────────────────────────────
    if any(w in lower for w in ["speed test", "internet speed", "test my internet", "how fast is my internet", "bandwidth test"]):
        return ("speed_test", {})

    # ── QR Code ─────────────────────────────────────────────────────
    qr_match = re.search(r'(?:generate|create|make)\s+(?:a\s+)?qr\s*code\s+(?:for|of|with)\s+(.+)', lower)
    if qr_match:
        return ("qr_code", {"data": qr_match.group(1).strip()})

    # ── IP Info ─────────────────────────────────────────────────────
    if any(w in lower for w in ["my ip", "ip address", "what is my ip", "where am i", "my location"]):
        return ("ip_info", {})

    # ── Crypto / Stock Price ────────────────────────────────────────
    if any(w in lower for w in ["bitcoin price", "ethereum price", "crypto price", "btc price", "eth price"]):
        sym = "BTC" if "bitcoin" in lower or "btc" in lower else "ETH" if "eth" in lower else "BTC"
        return ("price", {"symbol": sym})
    price_match = re.search(r'(?:price of|how much is|check)\s+(?:the\s+)?(?:price\s+(?:of\s+)?)?(\w+)\s*(?:price|stock|crypto|coin)?', lower)
    if price_match:
        sym = price_match.group(1).strip().upper()
        if sym in ("BTC", "ETH", "SOL", "DOGE", "ADA", "XRP", "DOT", "MATIC", "AVAX",
                    "BITCOIN", "ETHEREUM", "AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "META", "NVDA"):
            return ("price", {"symbol": sym})

    # ── Timer ───────────────────────────────────────────────────────
    if any(w in lower for w in ["start timer", "start stopwatch", "begin timer"]):
        return ("timer", {"action": "start", "name": "default"})
    if any(w in lower for w in ["stop timer", "stop stopwatch", "end timer"]):
        return ("timer", {"action": "stop", "name": "default"})
    if any(w in lower for w in ["check timer", "timer status", "how long"]):
        return ("timer", {"action": "check", "name": "default"})

    # ── Email Draft ─────────────────────────────────────────────────
    email_match = re.search(r'(?:draft|write|compose)\s+(?:an?\s+)?email\s+(?:to\s+)?(.+?)(?:\s+about\s+(.+))?$', lower)
    if email_match:
        return ("draft_email", {"to": email_match.group(1).strip(), "subject": email_match.group(2).strip() if email_match.group(2) else "", "body_hint": text})

    # ── Summarize ───────────────────────────────────────────────────
    summarize_url = re.search(r'summarize\s+(?:this\s+)?(?:url\s+|link\s+|page\s+)?(https?://\S+)', lower)
    if summarize_url:
        return ("summarize", {"url": summarize_url.group(1).strip()})
    if "summarize" in lower or "tldr" in lower or "summary" in lower:
        return ("summarize", {"text": text})

    # ── File/Folder Search ──────────────────────────────────────────
    file_indicators = ["file", "folder", "document", ".pdf", ".docx", ".txt", ".xlsx",
                       ".jpg", ".png", ".mp4", ".zip", ".exe", ".py", ".js",
                       "on my computer", "on my device", "on my pc", "in my downloads", "in my documents"]
    if any(fi in lower for fi in file_indicators):
        file_search_match = re.search(r'(?:find|search for|locate|where is|look for)\s+(?:the\s+|a\s+|my\s+)?(.+?)(?:\s+on\s+(?:my|the|this)\s+\w+)?$', lower)
        if file_search_match:
            query = re.sub(r'\s+on\s+(?:my|the|this)\s+\w+$', '', file_search_match.group(1).strip())
            if query:
                return ("search_files", {"query": query})

    file_search_match = re.search(r'(?:find|locate|where is|look for)\s+(?:the\s+)?(?:file|folder|document|photo|image|video)s?\s+(?:named?\s+|called\s+)?(.+)', lower)
    if file_search_match:
        return ("search_files", {"query": file_search_match.group(1).strip()})

    # ── Check Email / Gmail ─────────────────────────────────────────
    if any(w in lower for w in ["check email", "check gmail", "check my email", "check my gmail",
                                 "any new email", "any new mail", "new emails", "unread email",
                                 "read my email", "inbox", "check inbox"]):
        return ("check_gmail", {})

    # ── Check WhatsApp ──────────────────────────────────────────────
    if any(w in lower for w in ["check whatsapp", "check my whatsapp", "any new messages",
                                 "any whatsapp messages", "unread messages", "whatsapp messages",
                                 "check messages", "new messages"]):
        return ("check_whatsapp", {})

    # ── Git Operations ──────────────────────────────────────────────
    if any(w in lower for w in ["git commit", "commit changes", "commit my changes", "save changes to git"]):
        msg_match = re.search(r'(?:message|msg|with)\s+["\']?(.+?)["\']?$', lower)
        msg = msg_match.group(1) if msg_match else ""
        return ("git_commit", {"message": msg})
    if any(w in lower for w in ["git status", "git changes", "what changed in git", "show git status"]):
        return ("git_status", {})
    if any(w in lower for w in ["git push", "push to remote", "push changes", "push commits"]):
        return ("git_push", {})
    if any(w in lower for w in ["git pull", "pull changes", "pull latest", "update from remote"]):
        return ("git_pull", {})

    # ── Run Python ──────────────────────────────────────────────────
    py_match = re.search(r'(?:run|execute)\s+(?:the\s+)?(?:python\s+)?(?:file|script)\s+(.+)', lower)
    if py_match:
        return ("run_python", {"file": py_match.group(1).strip()})
    py_code_match = re.search(r'(?:run|execute)\s+(?:this\s+)?python\s+(?:code\s+)?["`](.+?)["`]', lower)
    if py_code_match:
        return ("run_python", {"code": py_code_match.group(1).strip()})

    # ── Create Project ──────────────────────────────────────────────
    proj_match = re.search(r'(?:create|make|new|start)\s+(?:a\s+)?(?:new\s+)?(?:(\w+)\s+)?project\s+(?:called\s+|named\s+)?["\']?(.+?)["\']?$', lower)
    if proj_match:
        template = proj_match.group(1) or "python"
        return ("create_project", {"name": proj_match.group(2).strip(), "template": template})

    # ── Create Folder ───────────────────────────────────────────────
    folder_match = re.search(r'(?:create|make|new)\s+(?:a\s+)?(?:folder|directory)\s+(?:called\s+|named\s+)?["\']?(.+?)["\']?(?:\s+(?:on|in|at)\s+(.+))?$', lower)
    if folder_match:
        return ("create_folder", {"name": folder_match.group(1).strip(), "path": folder_match.group(2).strip() if folder_match.group(2) else ""})
    if any(w in lower for w in ["create folder", "make folder", "new folder", "create directory"]):
        name_match = re.search(r'(?:folder|directory)\s+(.+)', lower)
        return ("create_folder", {"name": name_match.group(1).strip() if name_match else "New Folder"})

    # ── Write Code / VS Code ────────────────────────────────────────
    if any(w in lower for w in ["write code", "create a file", "create file", "write a file",
                                 "open vscode and write", "write a program", "write a script", "code for"]):
        return ("write_code", {"filename": "main.py", "code": "", "folder": "", "language": text})

    # ── Write Document (Notepad/Word) ───────────────────────────────
    if any(w in lower for w in ["write in notepad", "type in notepad", "open notepad and write",
                                 "write in word", "type in word", "create a document",
                                 "write a document", "make a document"]):
        app = "word" if "word" in lower else "notepad"
        return ("write_document", {"text": text, "app": app})

    # ── Draw / Paint ────────────────────────────────────────────────
    draw_match = re.search(r'(?:draw|paint|sketch|illustrate)\s+(?:a\s+|an\s+|me\s+(?:a\s+)?|the\s+)?(.+?)(?:\s+in\s+(?:ms\s+)?paint)?$', lower)
    if draw_match:
        subject = draw_match.group(1).strip()
        if subject and len(subject) > 1:
            return ("draw_diagram", {"subject": subject, "description": text})

    # ── Browser site search ─────────────────────────────────────────
    site_search = re.search(r'search\s+(?:for\s+)?(.+?)\s+on\s+(amazon|flipkart|youtube|google|github|stackoverflow)', lower)
    if site_search:
        return ("browser_action", {"action": "search", "query": site_search.group(1).strip(), "site": site_search.group(2).strip()})

    # ── Web Search (explicit) ───────────────────────────────────────
    search_words = ["search for", "look up", "google", "find out about", "search the web", "what is the latest"]
    if any(w in lower for w in search_words):
        return ("web_search", {"query": text})

    # ── Launch Desktop App ──────────────────────────────────────────
    desktop_apps = ["notepad", "calculator", "calc", "paint", "ms paint", "cmd", "powershell", "terminal",
                   "task manager", "control panel", "settings", "file explorer", "explorer",
                   "word", "excel", "powerpoint", "outlook", "teams", "discord", "chrome",
                   "firefox", "edge", "brave", "vscode", "vs code", "visual studio",
                   "steam", "vlc", "obs", "telegram", "signal", "zoom", "slack", "notion"]
    launch_match = re.search(r'(?:launch|start|run|open)\s+(?:the\s+)?(?:app\s+)?(?:called\s+)?(.+?)(?:\s+app(?:lication)?)?$', lower)
    if launch_match:
        target = launch_match.group(1).strip()
        if any(w in target for w in ["dashboard", "agent network", "agents"]):
            return None
        if any(app in target for app in desktop_apps):
            return ("launch_app", {"name": target})

    # ── Generic "open [something]" ──────────────────────────────────
    generic_open = re.search(r'open\s+(.+)', lower)
    if generic_open:
        target = generic_open.group(1).strip()
        if target and len(target) > 1:
            if any(w in target for w in ["dashboard", "agent network", "agents"]):
                return None
            desktop_kw = ["notepad", "calculator", "paint", "terminal", "settings",
                          "explorer", "word", "excel", "chrome", "firefox", "edge",
                          "brave", "vscode", "code", "discord", "steam", "vlc", "obs",
                          "telegram", "zoom", "slack", "notion", "task manager"]
            if any(dk in target for dk in desktop_kw):
                return ("launch_app", {"name": target})
            return ("open_app", {"name": target})

    # ── Find [something] → file search ──────────────────────────────
    find_match = re.search(r'(?:find|locate)\s+(?:my\s+|the\s+)?(.+)', lower)
    if find_match:
        target = find_match.group(1).strip()
        if target and not target.startswith("out") and len(target) > 1:
            return ("search_files", {"query": target})

    return None


# ── LLM-based fallback (for novel/ambiguous requests) ────────────────

_LLM_INTENT_PROMPT = """Classify this user message into ONE tool call. Available tools:
open_app, launch_app, youtube_play, media_control, weather, system_info, datetime,
terminal, screenshot, vision_analyze, scheduler, search_files, web_search,
browser_action, study_help, research_topic, translate, define, news, calculate,
joke, system_control, clipboard, speed_test, qr_code, ip_info, price, timer,
draft_email, summarize, create_folder, write_code, write_document, draw_diagram,
check_gmail, check_whatsapp, git_commit, git_status, git_push, git_pull,
run_python, create_project, mobile_sync, read_file, write_file, open_url, none.

Use "none" for general conversation, coding help, opinions, explanations.
Respond with ONLY valid JSON: {"tool": "name", "args": {"key": "value"}}"""


async def _llm_classify(user_input: str) -> Optional[tuple[str, dict]]:
    """LLM fallback for when regex patterns don't match."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{config.ollama_url}/api/chat",
                json={
                    "model": config.default_model,
                    "messages": [
                        {"role": "system", "content": _LLM_INTENT_PROMPT},
                        {"role": "user", "content": user_input},
                    ],
                    "stream": False,
                    "options": {"num_gpu": -1, "num_ctx": 512, "temperature": 0.1},
                    "format": "json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        content = data.get("message", {}).get("content", "").strip()
        result = json.loads(content)
        tool = result.get("tool", "none")
        args = result.get("args", {})

        from agents.tools import TOOLS
        if tool != "none" and tool not in TOOLS:
            return None

        if tool == "none":
            return None

        return (tool, args)
    except Exception:
        return None


# ── Public API ────────────────────────────────────────────────────────

async def classify_intent(user_input: str) -> tuple[str, dict]:
    """Classify user intent. Regex first (instant), LLM fallback (slow).
    Returns (tool_name, args). tool_name is "none" for general conversation.
    """
    # 1. Try regex patterns (instant, reliable)
    result = _regex_detect(user_input)
    if result:
        return result

    # 2. Try LLM classification (for novel/ambiguous requests)
    llm_result = await _llm_classify(user_input)
    if llm_result:
        return llm_result

    # 3. No match — general conversation
    return ("none", {})
