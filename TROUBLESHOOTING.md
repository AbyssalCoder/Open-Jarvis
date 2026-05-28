# JARVIS — Troubleshooting & Manual Startup Guide

Quick reference when things go wrong. JARVIS has 3 services that must all be running:

| Service | Port | What it does |
|---------|------|-------------|
| **Ollama** | 11434 | Runs the AI model (`jarvis:latest` = qwen2.5:1.5b fine-tune) |
| **Backend** | 8420 | Python FastAPI server (intent engine, tools, TTS, vision, WebSocket) |
| **Frontend** | — | Tauri desktop app (UI, avatar, chat panel) |

---

## 1. Quick Health Check

Open PowerShell and run:

```powershell
# Check all 3 services
curl http://localhost:11434/api/tags    # Ollama — should return model list
curl http://localhost:8420/health       # Backend — should return {"status":"ok"}
Get-Process jarvis*                     # Frontend — should show jarvis.exe
```

---

## 2. Starting Services Manually

### Ollama (AI Model)
```powershell
# Check if running
Get-Process ollama*

# If not running, start it:
ollama serve

# Verify model is loaded
ollama list    # should show "jarvis:latest"
```

If `jarvis:latest` is missing:
```powershell
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\backend"
ollama create jarvis -f Modelfile
```

### Backend (Python API)

**Option A — Run from source (recommended for debugging):**
```powershell
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\backend"
.\.venv\Scripts\Activate.ps1
python main.py
```
You should see:
```
[JARVIS] Starting backend...
  [Agent] Brain initialized
[JARVIS] Backend ready on port 8420
INFO:     Uvicorn running on http://0.0.0.0:8420
```

**Option B — Run the built exe:**
```powershell
& "$env:LOCALAPPDATA\JARVIS\jarvis-backend.exe"
```
> **Note:** The exe is ~2.9GB (PyInstaller onefile). First launch takes 60-90 seconds to extract to temp. Subsequent launches are faster if temp wasn't cleared.

### Frontend (Tauri App)
```powershell
# Run installed version
& "$env:LOCALAPPDATA\JARVIS\jarvis.exe"

# OR run dev mode (hot reload)
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\desktop"
npx tauri dev
```

---

## 3. Common Issues & Fixes

### "Backend OFF" / WebSocket disconnected / Red ERROR indicator

**Cause:** Backend server isn't running on port 8420.

**Fix:**
```powershell
# Kill any zombie processes
Stop-Process -Name "jarvis-backend*" -Force -ErrorAction SilentlyContinue

# Start from source
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\backend"
.\.venv\Scripts\Activate.ps1
python main.py
```

Then restart the frontend app (close and reopen, or it should auto-reconnect via WebSocket).

### Ollama not responding / Model not loading

```powershell
# Restart Ollama
Stop-Process -Name ollama* -Force -ErrorAction SilentlyContinue
Start-Sleep 2
ollama serve
```

In a separate terminal:
```powershell
# Verify model loads
ollama run jarvis "hi"
```

### Avatar shows torso/belly instead of face

This is a camera position issue in `src/frontend/src/components/avatar/AvatarView.tsx`. Key values:
- `vrm.scene.position.set(0, Y_OFFSET, 0)` — lower = model moves down, face visible
- `camera={{ position: [0, CAM_Y, CAM_Z], fov: FOV }}` — higher CAM_Y = camera looks higher

Current working values: model `y=-1.55`, camera `[0, 0.65, 1.2]`, FOV `28`.

### Avatar is washed out white

Lighting too strong for MToon shader materials. Check `LightingRig` in AvatarView.tsx:
- Main directional light: keep intensity ≤ 1.0
- Hemisphere light: keep intensity ≤ 0.4

### Tools not working / Commands return gibberish

The intent engine (`src/backend/agents/intent_engine.py`) uses regex-first matching. If commands return nonsense, the regex patterns might not cover your phrasing, and the LLM fallback (1.5b model) hallucinated.

**Fix:** Add your command pattern to `_regex_detect()` in `intent_engine.py`.

### Browser automation fails / "Gemini error"

Browser tools use Playwright. If Chromium isn't installed:
```powershell
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\backend"
.\.venv\Scripts\Activate.ps1
python -m playwright install chromium
```

### Port already in use (8420)

```powershell
# Find what's using the port
netstat -ano | findstr :8420

# Kill that process (replace PID)
Stop-Process -Id <PID> -Force
```

---

## 4. Full Rebuild from Source

When you need to rebuild everything after code changes:

```powershell
# 1. Frontend
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\frontend"
npm run build

# 2. Backend (PyInstaller)
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\backend"
.\.venv\Scripts\Activate.ps1
pyinstaller --onefile --name "jarvis-backend" `
  --hidden-import=tiktoken_ext.openai_public --hidden-import=tiktoken_ext `
  --hidden-import=multipart --hidden-import=python_multipart `
  --hidden-import=edge_tts --hidden-import=aiohttp `
  --hidden-import=ultralytics --hidden-import=playwright `
  --hidden-import=PIL --hidden-import=groundingdino `
  --hidden-import=groundingdino.util --hidden-import=groundingdino.util.inference `
  --hidden-import=groundingdino.models --hidden-import=groundingdino.datasets `
  --hidden-import=groundingdino.datasets.transforms `
  --hidden-import=groundingdino.util.slconfig --hidden-import=groundingdino.util.utils `
  --hidden-import=groundingdino.config --hidden-import=timm `
  --hidden-import=transformers --hidden-import=huggingface_hub `
  --hidden-import=supervision --hidden-import=vision --hidden-import=vision.pipeline `
  --collect-all tiktoken_ext --collect-all multipart `
  --collect-all edge_tts --collect-all ultralytics --collect-all groundingdino `
  main.py

# 3. Copy sidecar
Copy-Item "dist\jarvis-backend.exe" "..\desktop\src-tauri\binaries\jarvis-backend-x86_64-pc-windows-msvc.exe" -Force

# 4. Tauri desktop
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\desktop"
cmd /c "`"C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvarsall.bat`" x64 && npx tauri build"
# Note: MSI bundler may fail — ignore it. The exe at src-tauri/target/release/jarvis.exe is what matters.

# 5. Deploy
Stop-Process -Name "jarvis*" -Force -ErrorAction SilentlyContinue
Start-Sleep 1
Copy-Item "src-tauri\target\release\jarvis.exe" "$env:LOCALAPPDATA\JARVIS\jarvis.exe" -Force
Copy-Item "..\backend\dist\jarvis-backend.exe" "$env:LOCALAPPDATA\JARVIS\jarvis-backend.exe" -Force
```

---

## 5. Git Operations

```powershell
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis"
git add -A
git commit -m "your message"
git push origin master
```

Remote: `https://github.com/AbyssalCoder/Open-Jarvis.git`

---

## 6. Dev Mode (No Build Needed)

For quick testing without rebuilding:

**Terminal 1 — Backend:**
```powershell
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\backend"
.\.venv\Scripts\Activate.ps1
python main.py
```

**Terminal 2 — Frontend + Tauri:**
```powershell
cd "c:\Users\Aniket\OneDrive\Desktop\Jarvis\src\desktop"
npx tauri dev
```

This gives hot-reload for frontend changes — no rebuild needed.

---

## 7. Environment

| Component | Version/Path |
|-----------|-------------|
| Python | 3.12, venv at `src/backend/.venv` |
| Node | Check with `node --version` |
| Rust | Check with `rustc --version` |
| Ollama | Model: `jarvis:latest` (qwen2.5:1.5b fine-tune) |
| GPU | RTX 4060 Laptop, 8GB VRAM |
| PyTorch | 2.12.0+cu126 |
| VS Build Tools | 2026 v18 |
| Install dir | `%LOCALAPPDATA%\JARVIS\` |
| Config | `src/backend/.env` (also copied to `%LOCALAPPDATA%\JARVIS\.env`) |
