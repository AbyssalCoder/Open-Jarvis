"""
Tool functions that the Brain agent can dispatch.
Each tool takes string args and returns a string result.
"""

import json
import subprocess
import httpx
import base64
from pathlib import Path
from datetime import datetime


async def web_search(query: str) -> str:
    """Search the web using DuckDuckGo instant answer API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # DuckDuckGo Instant Answer API (no key needed)
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"},
            )
            data = resp.json()

            results = []
            # Abstract (main answer)
            if data.get("Abstract"):
                results.append(f"**{data.get('Heading', 'Result')}**: {data['Abstract']}")
                if data.get("AbstractURL"):
                    results.append(f"Source: {data['AbstractURL']}")

            # Answer (instant answer)
            if data.get("Answer"):
                results.append(f"Answer: {data['Answer']}")

            # Related topics
            for topic in data.get("RelatedTopics", [])[:5]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append(f"- {topic['Text'][:200]}")

            if results:
                return "\n".join(results)
            else:
                return f"No instant results found for '{query}'. Try asking me to explain it instead."
    except Exception as e:
        return f"Search error: {e}"


async def get_weather(city: str = "auto") -> str:
    """Get current weather using wttr.in."""
    try:
        url = f"https://wttr.in/{city}?format=j1" if city != "auto" else "https://wttr.in/?format=j1"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            data = resp.json()
            current = data.get("current_condition", [{}])[0]
            area = data.get("nearest_area", [{}])[0]
            city_name = area.get("areaName", [{}])[0].get("value", "Unknown")
            country = area.get("country", [{}])[0].get("value", "")
            temp_c = current.get("temp_C", "?")
            desc = current.get("weatherDesc", [{}])[0].get("value", "")
            humidity = current.get("humidity", "?")
            feels = current.get("FeelsLikeC", "?")
            return f"Weather in {city_name}, {country}: {desc}, {temp_c}°C (feels {feels}°C), humidity {humidity}%"
    except Exception as e:
        return f"Weather error: {e}"


async def run_terminal_command(command: str) -> str:
    """Execute a terminal command and return output. CAUTION: sandboxed."""
    # Safety: block obviously dangerous commands
    blocked = ["rm -rf /", "format ", "del /s /q", "rmdir /s", ":(){", "fork bomb"]
    cmd_lower = command.lower()
    for b in blocked:
        if b in cmd_lower:
            return f"Blocked dangerous command: {command}"

    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=30,
            cwd=str(Path.home()),
        )
        output = result.stdout[:2000] if result.stdout else ""
        error = result.stderr[:500] if result.stderr else ""
        if error and not output:
            return f"Error:\n{error}"
        return output or "(no output)"
    except subprocess.TimeoutExpired:
        return "Command timed out (30s limit)"
    except Exception as e:
        return f"Command error: {e}"


async def capture_screen() -> str:
    """Take a screenshot and return base64 data."""
    try:
        import mss
        with mss.mss() as sct:
            monitor = sct.monitors[1]  # Primary monitor
            img = sct.grab(monitor)
            # Convert to PNG bytes
            from mss.tools import to_png
            png_bytes = to_png(img.rgb, img.size)
            b64 = base64.b64encode(png_bytes).decode()
            return f"Screenshot captured ({img.size.width}x{img.size.height}). Base64 length: {len(b64)}"
    except ImportError:
        return "Screen capture requires 'mss' package. Install with: pip install mss"
    except Exception as e:
        return f"Screenshot error: {e}"


async def get_system_info() -> str:
    """Get current system information."""
    import platform
    import psutil
    try:
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        return (
            f"System: {platform.system()} {platform.release()}\n"
            f"CPU: {cpu}% used ({psutil.cpu_count()} cores)\n"
            f"RAM: {mem.percent}% used ({mem.used // (1024**3)}GB / {mem.total // (1024**3)}GB)\n"
            f"Disk: {disk.percent}% used ({disk.used // (1024**3)}GB / {disk.total // (1024**3)}GB)\n"
            f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
    except ImportError:
        return "System info requires 'psutil' package."
    except Exception as e:
        return f"System info error: {e}"


async def read_file(filepath: str) -> str:
    """Read a file and return its contents (truncated to 3000 chars)."""
    try:
        p = Path(filepath).expanduser().resolve()
        if not p.exists():
            return f"File not found: {filepath}"
        if p.stat().st_size > 1_000_000:
            return f"File too large (>{1_000_000} bytes): {filepath}"
        content = p.read_text(encoding="utf-8", errors="replace")
        if len(content) > 3000:
            return content[:3000] + f"\n... (truncated, {len(content)} total chars)"
        return content
    except Exception as e:
        return f"Read error: {e}"


async def write_file(filepath: str, content: str) -> str:
    """Write content to a file."""
    try:
        p = Path(filepath).expanduser().resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return f"Written {len(content)} chars to {p}"
    except Exception as e:
        return f"Write error: {e}"


async def get_datetime() -> str:
    """Get current date, time, and day."""
    now = datetime.now()
    return now.strftime("Date: %A, %B %d, %Y\nTime: %I:%M:%S %p\nTimezone: Local")


# Tool registry
TOOLS = {
    "web_search": {"fn": web_search, "desc": "Search the web for information", "args": ["query"]},
    "weather": {"fn": get_weather, "desc": "Get current weather for a city", "args": ["city"]},
    "terminal": {"fn": run_terminal_command, "desc": "Run a terminal/shell command", "args": ["command"]},
    "screenshot": {"fn": capture_screen, "desc": "Capture a screenshot of the screen", "args": []},
    "system_info": {"fn": get_system_info, "desc": "Get CPU, RAM, disk stats", "args": []},
    "read_file": {"fn": read_file, "desc": "Read a file's contents", "args": ["filepath"]},
    "write_file": {"fn": write_file, "desc": "Write content to a file", "args": ["filepath", "content"]},
    "datetime": {"fn": get_datetime, "desc": "Get current date and time", "args": []},
}


def get_tools_description() -> str:
    """Get a description of all available tools for the system prompt."""
    lines = []
    for name, info in TOOLS.items():
        args = ", ".join(info["args"]) if info["args"] else "none"
        lines.append(f"  - {name}({args}): {info['desc']}")
    return "\n".join(lines)


async def execute_tool(name: str, args: dict) -> str:
    """Execute a tool by name with given args."""
    tool = TOOLS.get(name)
    if not tool:
        return f"Unknown tool: {name}"
    try:
        return await tool["fn"](**args)
    except Exception as e:
        return f"Tool error ({name}): {e}"
