"""Backend configuration — loaded from .env file and env vars."""

import os
import sys
from pathlib import Path
from dataclasses import dataclass, field


def _find_env_file() -> Path | None:
    """Search for .env in multiple locations (supports PyInstaller bundles)."""
    candidates = []

    # 1. PyInstaller bundle: look next to the actual exe
    if getattr(sys, 'frozen', False):
        exe_dir = Path(sys.executable).resolve().parent
        candidates.append(exe_dir / ".env")
        # Also check %APPDATA%/JARVIS/.env
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            candidates.append(Path(appdata) / "JARVIS" / ".env")

    # 2. Dev mode: .env in backend root (parent of config/)
    candidates.append(Path(__file__).resolve().parent.parent / ".env")

    # 3. Home directory fallback
    candidates.append(Path.home() / ".jarvis" / ".env")

    for p in candidates:
        if p.exists():
            return p
    return None


# Load .env file if present (before reading os.getenv)
_env_path = _find_env_file()
if _env_path and _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


@dataclass
class JarvisConfig:
    """Central configuration for the JARVIS backend."""

    # Paths
    workspace_root: Path = field(
        default_factory=lambda: Path(os.getenv("JARVIS_WORKSPACE", str(Path.home() / "jarvis-workspace")))
    )
    data_dir: Path = field(
        default_factory=lambda: Path(os.getenv("JARVIS_DATA", str(Path.home() / ".jarvis")))
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8420

    # LLM — Ollama
    ollama_url: str = field(default_factory=lambda: os.getenv("OLLAMA_URL", "http://localhost:11434"))
    default_model: str = field(default_factory=lambda: os.getenv("JARVIS_DEFAULT_MODEL", "jarvis"))

    # LLM — Gemini
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))

    # LLM — OpenRouter
    openrouter_api_key: str = field(default_factory=lambda: os.getenv("OPENROUTER_API_KEY", ""))

    # Voice
    voice_enabled: bool = field(default_factory=lambda: os.getenv("JARVIS_VOICE", "0") == "1")
    tts_engine: str = field(default_factory=lambda: os.getenv("JARVIS_TTS", "piper"))
    stt_engine: str = field(default_factory=lambda: os.getenv("JARVIS_STT", "faster-whisper"))

    # Vision
    vision_enabled: bool = field(default_factory=lambda: os.getenv("JARVIS_VISION", "0") == "1")

    # Security
    sandbox_enabled: bool = True
    max_file_size_mb: int = 50

    def __post_init__(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.workspace_root.mkdir(parents=True, exist_ok=True)


# Singleton
config = JarvisConfig()
