# Open JARVIS — Local-First AI Operating System

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-00D4FF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows" />
  <img src="https://img.shields.io/badge/AI-Local--First-FF9500?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

A fully modular, cinematic, local-first AI assistant inspired by Iron Man's JARVIS. Features a stunning 3D Arc Reactor visualization, real-time tool execution, persistent memory, voice interaction, and a Tauri desktop app — all running locally on your machine.

## Features

- **JARVIS Personality** — British-butler AI that calls you "sir", created by Aniket
- **Local LLM** — Runs on Ollama with custom `jarvis` model (qwen2.5:1.5b), falls back to Gemini API
- **8 Built-in Tools** — System info, weather, web search, datetime, terminal, file read/write, screenshot
- **Persistent Memory** — Conversation history saved across sessions (50 turns)
- **3D Arc Reactor Engine** — Three.js visualization with breathing animation, bloom, orbital rings
- **Voice I/O** — Browser-native speech recognition + text-to-speech with JARVIS voice
- **Streaming Chat** — Real-time SSE token streaming with markdown stripping for TTS
- **Smart Routing** — 4-tier LLM routing: intent classification → complexity scoring → model selection
- **Desktop App** — Tauri 2 native app with system tray, global hotkeys, auto-backend launch

## Architecture

```
src/
├── frontend/          React 18 + Three.js + R3F + Vite (port 1420)
├── backend/           Python FastAPI + Agents + Tools (port 8420)
│   ├── agents/        Brain orchestrator + 8 tool agents
│   ├── llm/           4-provider routing (Ollama, Gemini, OpenRouter, GGUF)
│   ├── memory/        Persistent conversation history
│   └── api/           REST + WebSocket endpoints
├── desktop/           Tauri 2.x Desktop Shell (Rust)
└── shared/            Shared types & constants

docs/
└── architecture/      Design documents
```

## Tech Stack

| Layer       | Technology                                     |
|-------------|------------------------------------------------|
| Desktop     | Tauri 2.x (Rust) with system tray & hotkeys    |
| Frontend    | React 18, Three.js/R3F, GSAP, Framer Motion, TailwindCSS |
| Backend     | Python FastAPI, WebSockets, asyncio            |
| AI/LLM      | Ollama (local), Gemini API, OpenRouter         |
| Voice       | Web Speech API (STT + TTS)                     |
| State       | Zustand (8 stores)                             |

## Quick Start

### Prerequisites
- Node.js 20+
- Rust & Cargo (for Tauri)
- Python 3.11+
- Ollama (for local LLMs)

### Setup

```bash
# Frontend
cd src/frontend && npm install

# Backend
cd src/backend && pip install -e .

# Desktop (Tauri)
cd src/desktop && cargo build

# Start development
npm run dev:frontend    # Port 1420
npm run backend         # Port 8420
npm run dev:desktop     # Tauri shell
```

## Hardware Tiers

| Tier    | RAM   | GPU VRAM | Recommended Model       |
|---------|-------|----------|-------------------------|
| Minimal | 8 GB  | None     | Phi-3 Mini 3.8B Q4      |
| Low     | 10 GB | 2 GB     | Llama 3.2 3B Q4         |
| Medium  | 16 GB | 6 GB     | Llama 3.1 8B Q6         |
| High    | 24 GB | 8 GB     | Llama 3.1 8B F16        |
| Ultra   | 32 GB | 12 GB+   | Llama 3.1 70B Q4        |

## License

MIT
