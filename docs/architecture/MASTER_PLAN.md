# JARVIS — Master Plan

## A Local-First AI Operating System

**Version:** 0.1.0-alpha  
**Codename:** ARC REACTOR  
**Status:** Architecture Phase  
**Target Platforms:** Windows 10/11 (primary), Linux (secondary)  
**License:** Proprietary / Open-Core (TBD)

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Core Philosophy](#2-core-philosophy)
3. [Full System Architecture](#3-full-system-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Agent Hierarchy](#5-agent-hierarchy)
6. [Multi-Agent Communication Flow](#6-multi-agent-communication-flow)
7. [Memory Architecture](#7-memory-architecture)
8. [LLM Routing System](#8-llm-routing-system)
9. [Voice Architecture](#9-voice-architecture)
10. [Vision Architecture](#10-vision-architecture)
11. [Web Automation Pipeline](#11-web-automation-pipeline)
12. [Desktop Control Pipeline](#12-desktop-control-pipeline)
13. [Tool Orchestration](#13-tool-orchestration)
14. [Event-Driven Architecture](#14-event-driven-architecture)
15. [Queue Systems](#15-queue-systems)
16. [Background Workers](#16-background-workers)
17. [Async Orchestration](#17-async-orchestration)
18. [Streaming Architecture](#18-streaming-architecture)
19. [WebSocket Communication](#19-websocket-communication)
20. [Frontend-Backend Communication](#20-frontend-backend-communication)
21. [Plugin System](#21-plugin-system)
22. [Model Manager](#22-model-manager)
23. [API Provider Manager](#23-api-provider-manager)
24. [RAM Optimization](#24-ram-optimization)
25. [VRAM Optimization](#25-vram-optimization)
26. [CPU Fallback Strategies](#26-cpu-fallback-strategies)
27. [GPU Fallback Strategies](#27-gpu-fallback-strategies)
28. [Quantization Strategy](#28-quantization-strategy)
29. [Lazy Loading Systems](#29-lazy-loading-systems)
30. [Smart Caching Systems](#30-smart-caching-systems)
31. [Logging Architecture](#31-logging-architecture)
32. [Error Recovery Systems](#32-error-recovery-systems)
33. [Retry Systems](#33-retry-systems)
34. [Task Execution Engine](#34-task-execution-engine)
35. [Autonomous Workflows](#35-autonomous-workflows)
36. [Mobile Integration](#36-mobile-integration)
37. [Local Database Architecture](#37-local-database-architecture)
38. [Vector Memory Systems](#38-vector-memory-systems)
39. [Security Architecture](#39-security-architecture)
40. [Sandboxing](#40-sandboxing)
41. [Permissions System](#41-permissions-system)
42. [Offline Mode](#42-offline-mode)
43. [Cloud Fallback Mode](#43-cloud-fallback-mode)
44. [Hybrid Inference Mode](#44-hybrid-inference-mode)
45. [Fine-Tuning Possibilities](#45-fine-tuning-possibilities)
46. [Future Scalability](#46-future-scalability)
47. [Deployment Architecture](#47-deployment-architecture)
48. [Windows Optimization](#48-windows-optimization)
49. [Linux Compatibility](#49-linux-compatibility)
50. [Performance Benchmarks](#50-performance-benchmarks)
51. [Open-Source Integration Strategy](#51-open-source-integration-strategy)
52. [Ethical Safeguards](#52-ethical-safeguards)
53. [AI Alignment Safeguards](#53-ai-alignment-safeguards)
54. [Prompt Routing Systems](#54-prompt-routing-systems)
55. [Context Management](#55-context-management)
56. [Streaming Voice Pipeline](#56-streaming-voice-pipeline)
57. [Realtime Interaction Systems](#57-realtime-interaction-systems)
58. [Model Switching Logic](#58-model-switching-logic)
59. [Dependency Explanation](#59-dependency-explanation)
60. [Future Roadmap](#60-future-roadmap)

---

## 1. Project Vision

JARVIS is a **local-first AI operating system** — a fully modular, cinematic, multi-agent desktop intelligence platform that turns any Windows PC into a command center for autonomous AI workflows, coding assistance, desktop automation, vision understanding, browser control, and immersive interaction.

**Core Vision Statement:**  
> "If Tony Stark built a modern local AI operating system in 2026 using advanced WebGL, realtime agentic AI systems, cinematic interfaces, and local-first intelligence."

### Key Differentiators

| Dimension | JARVIS | Typical AI Assistants |
|---|---|---|
| Execution | Local-first, offline capable | Cloud-dependent |
| Interface | Cinematic WebGL 3D operating system | Chat windows |
| Agency | Multi-agent autonomous orchestration | Single-turn Q&A |
| Desktop Integration | Deep OS-level hooks, overlays, HUD | Browser tabs |
| Performance | Hardware-adaptive, runs on 8GB RAM | Fixed requirements |
| Architecture | Modular agent ecosystem | Monolithic |

### What JARVIS Is NOT

- Not a chatbot wrapper around an LLM API
- Not a generic dashboard with glowing circles
- Not a website pretending to be a desktop app
- Not a toy project or proof of concept
- Not a clone of any existing open-source project

### What JARVIS IS

- A genuine AI operating system layer for your desktop
- A multi-agent orchestration platform with autonomous capabilities
- A cinematic, immersive 3D interface that reacts to AI state in realtime
- A local AI runtime capable of offline inference, memory persistence, and tool use
- A deeply integrated desktop companion with overlays, HUDs, system tray, global hotkeys
- A production-grade, installable .exe application

---

## 2. Core Philosophy

### 2.1 Design Principles

1. **Local-First Intelligence** — All core capabilities must work without internet. Cloud is a fallback, never a dependency.
2. **Hardware Empathy** — Design for 8GB RAM laptops first, then scale up. Never assume GPU availability.
3. **Cinematic Immersion** — The interface is not decoration; it's the operating system. Every visual element communicates AI state.
4. **Modular Autonomy** — Every agent is an independent service. Agents collaborate through protocols, not monolithic code.
5. **Performance Obsession** — 60fps at all times. Sub-100ms response latency. Zero UI freezes. Ever.
6. **Progressive Capability** — System detects hardware and enables features accordingly. Low-end gets functional beauty; high-end gets cinematic spectacle.
7. **Practical Intelligence** — Every feature must solve a real problem. No feature exists solely for visual appeal.
8. **Async Everything** — No blocking operations anywhere in the stack. All I/O, inference, rendering is non-blocking.
9. **Secure by Default** — All autonomous actions are sandboxed. Destructive operations require explicit approval.
10. **Incrementally Buildable** — System must be functional at every phase. No "it'll work when everything is done."

### 2.2 Technical Philosophies

- **Event-Driven Over Request-Response** — The system is a living event stream, not a series of API calls.
- **Streaming Over Batching** — All LLM outputs, voice, vision, and agent communications stream in realtime.
- **Adaptive Over Static** — Graphics quality, model selection, memory allocation all adapt to runtime conditions.
- **Composition Over Inheritance** — Agents, tools, and services compose into workflows; nothing extends a base class hierarchy.
- **Convention Over Configuration** — Sensible defaults that work out of the box; deep configurability for power users.

---

## 3. Full System Architecture

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JARVIS AI Operating System                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 PRESENTATION LAYER                             │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────┐  │  │
│  │  │ Tauri Shell  │ │ Overlay HUD  │ │ System Tray + Hotkeys  │  │  │
│  │  └──────┬───────┘ └──────┬───────┘ └────────────┬───────────┘  │  │
│  │         │                │                      │              │  │
│  │  ┌──────▼────────────────▼──────────────────────▼───────────┐  │  │
│  │  │              React + TypeScript Frontend                  │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │  │  │
│  │  │  │ Three.js  │ │ R3F      │ │ GSAP     │ │ Tailwind   │  │  │  │
│  │  │  │ WebGL     │ │ Scenes   │ │ Anims    │ │ UI Panels  │  │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │  │  │
│  │  └──────────────────────┬───────────────────────────────────┘  │  │
│  └─────────────────────────┼─────────────────────────────────────┘  │
│                            │ WebSocket + Tauri IPC                   │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                   GATEWAY LAYER                                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐ │  │
│  │  │ WebSocket    │ │ REST API     │ │ Tauri Command Bridge   │ │  │
│  │  │ Server       │ │ Endpoints    │ │ (IPC)                  │ │  │
│  │  └──────┬───────┘ └──────┬───────┘ └────────────┬───────────┘ │  │
│  └─────────┼────────────────┼──────────────────────┼─────────────┘  │
│            │                │                      │                │
│  ┌─────────▼────────────────▼──────────────────────▼─────────────┐  │
│  │                 ORCHESTRATION LAYER                             │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │              Brain / Orchestrator Agent                   │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │  │  │
│  │  │  │ Intent   │ │ Task     │ │ Agent    │ │ Context    │  │  │  │
│  │  │  │ Router   │ │ Planner  │ │ Dispatch │ │ Manager    │  │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ Voice    │ │ Vision   │ │ Coding   │ │ Web      │         │  │
│  │  │ Agent    │ │ Agent    │ │ Agent    │ │ Agent    │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ Terminal │ │ File     │ │ Memory   │ │ Media    │         │  │
│  │  │ Agent    │ │ Agent    │ │ Agent    │ │ Agent    │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ System   │ │ Security │ │ Scheduler│ │ Auto     │         │  │
│  │  │ Monitor  │ │ Agent    │ │ Agent    │ │ Task     │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ Overlay  │ │ Persona  │ │ Knowledge│ │ Gaming   │         │  │
│  │  │ HUD      │ │ Agent    │ │ Agent    │ │ Agent    │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  │  ┌──────────┐ ┌──────────┐                                    │  │
│  │  │ Mobile   │ │ Model    │                                    │  │
│  │  │ Sync     │ │ Manager  │                                    │  │
│  │  └──────────┘ └──────────┘                                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                            │                                        │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                   SERVICE LAYER                                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ LLM      │ │ Voice    │ │ Vision   │ │ Embedding│         │  │
│  │  │ Runtime  │ │ Runtime  │ │ Runtime  │ │ Runtime  │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ Browser  │ │ Desktop  │ │ Terminal │ │ File     │         │  │
│  │  │ Automator│ │ Control  │ │ Service  │ │ System   │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                            │                                        │
│  ┌─────────────────────────▼─────────────────────────────────────┐  │
│  │                   DATA LAYER                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │ SQLite   │ │ ChromaDB │ │ File     │ │ Config   │         │  │
│  │  │ Core DB  │ │ Vectors  │ │ Cache    │ │ Store    │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Layer Responsibilities

| Layer | Responsibility | Key Technologies |
|---|---|---|
| **Presentation** | Rendering, 3D scenes, UI panels, overlays | React, Three.js, R3F, GSAP, Tailwind |
| **Gateway** | Transport, protocol bridging, auth | WebSocket, REST, Tauri IPC |
| **Orchestration** | Agent management, task routing, planning | Python asyncio, custom orchestrator |
| **Service** | Domain capabilities, tools, runtimes | FastAPI services, subprocess managers |
| **Data** | Persistence, vectors, caching, config | SQLite, ChromaDB, filesystem |

### 3.3 Communication Protocols

| Path | Protocol | Use Case |
|---|---|---|
| Frontend ↔ Backend | WebSocket | Streaming AI responses, realtime events |
| Frontend ↔ Tauri | Tauri IPC (invoke) | Native OS operations, file access |
| Agent ↔ Agent | Internal async message bus | Task delegation, results sharing |
| Backend ↔ LLM | HTTP/gRPC/subprocess | Model inference requests |
| Backend ↔ Browser | CDP / Playwright | Browser automation |
| Backend ↔ Desktop | Win32 API / PyAutoGUI | Desktop control |

---

## 4. Folder Structure

```
jarvis/
├── docs/
│   └── architecture/          # All architecture markdown files
│
├── src/
│   ├── frontend/              # React + TypeScript frontend application
│   │   ├── public/
│   │   │   ├── assets/
│   │   │   │   ├── models/    # 3D models (.glb, .gltf)
│   │   │   │   ├── textures/  # Textures, HDRIs
│   │   │   │   ├── audio/     # Sound effects, ambient audio
│   │   │   │   └── fonts/     # Custom fonts
│   │   │   └── index.html
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   ├── Router.tsx
│   │   │   │   └── Providers.tsx
│   │   │   ├── core/
│   │   │   │   ├── websocket/       # WebSocket client manager
│   │   │   │   ├── ipc/             # Tauri IPC bridge
│   │   │   │   ├── store/           # Zustand global state
│   │   │   │   ├── events/          # Frontend event bus
│   │   │   │   └── hooks/           # Shared React hooks
│   │   │   ├── scenes/
│   │   │   │   ├── boot/            # Boot sequence scene
│   │   │   │   ├── consciousness/   # AI core visualization
│   │   │   │   ├── command-center/  # Main operating view
│   │   │   │   ├── memory-palace/   # Memory visualization
│   │   │   │   ├── agent-network/   # Agent activity view
│   │   │   │   └── diagnostics/     # System diagnostics
│   │   │   ├── components/
│   │   │   │   ├── hud/             # HUD overlay components
│   │   │   │   ├── panels/          # Modular UI panels
│   │   │   │   ├── chat/            # Conversation interface
│   │   │   │   ├── terminal/        # Embedded terminal
│   │   │   │   ├── controls/        # Buttons, sliders, toggles
│   │   │   │   └── visualizers/     # Audio, data visualizers
│   │   │   ├── three/
│   │   │   │   ├── shaders/         # GLSL vertex/fragment shaders
│   │   │   │   ├── materials/       # Custom Three.js materials
│   │   │   │   ├── geometries/      # Procedural geometry generators
│   │   │   │   ├── effects/         # Post-processing effects
│   │   │   │   ├── particles/       # Particle systems
│   │   │   │   ├── lighting/        # Lighting rigs
│   │   │   │   └── cameras/         # Camera controllers
│   │   │   ├── scrollytelling/
│   │   │   │   ├── ScrollManager.tsx
│   │   │   │   ├── chapters/        # Each scroll chapter
│   │   │   │   ├── transitions/     # Chapter transitions
│   │   │   │   └── timelines/       # GSAP timeline definitions
│   │   │   ├── audio/
│   │   │   │   ├── AudioEngine.ts
│   │   │   │   ├── SpatialAudio.ts
│   │   │   │   └── sounds/          # Sound effect definitions
│   │   │   ├── overlay/
│   │   │   │   ├── OverlayWindow.tsx
│   │   │   │   ├── FloatingHUD.tsx
│   │   │   │   └── widgets/         # Overlay widget components
│   │   │   ├── styles/
│   │   │   │   ├── globals.css
│   │   │   │   ├── tailwind.config.ts
│   │   │   │   └── theme.ts
│   │   │   └── utils/
│   │   │       ├── performance.ts    # FPS monitor, adaptive quality
│   │   │       ├── math.ts           # Math utilities
│   │   │       └── constants.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── index.html
│   │
│   ├── desktop/                # Tauri desktop shell
│   │   ├── src-tauri/
│   │   │   ├── src/
│   │   │   │   ├── main.rs          # Tauri entry point
│   │   │   │   ├── commands/        # Tauri IPC command handlers
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── system.rs    # System info, tray, hotkeys
│   │   │   │   │   ├── files.rs     # File system operations
│   │   │   │   │   ├── window.rs    # Window management
│   │   │   │   │   ├── overlay.rs   # Overlay window management
│   │   │   │   │   ├── audio.rs     # Microphone, audio devices
│   │   │   │   │   └── process.rs   # Process management
│   │   │   │   ├── tray.rs          # System tray setup
│   │   │   │   ├── hotkeys.rs       # Global hotkey registration
│   │   │   │   ├── autostart.rs     # Startup-on-boot
│   │   │   │   └── ipc_bridge.rs    # Backend communication bridge
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   ├── build.rs
│   │   │   └── icons/
│   │   └── package.json
│   │
│   ├── backend/                # Python FastAPI backend
│   │   ├── main.py             # FastAPI app entry
│   │   ├── config/
│   │   │   ├── settings.py     # Application settings
│   │   │   ├── hardware.py     # Hardware detection
│   │   │   └── profiles.py     # Performance profiles
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── chat.py
│   │   │   │   ├── agents.py
│   │   │   │   ├── models.py
│   │   │   │   ├── memory.py
│   │   │   │   ├── system.py
│   │   │   │   ├── voice.py
│   │   │   │   ├── vision.py
│   │   │   │   └── automation.py
│   │   │   └── websocket/
│   │   │       ├── handler.py
│   │   │       ├── events.py
│   │   │       └── streams.py
│   │   ├── agents/
│   │   │   ├── base.py          # Base agent class
│   │   │   ├── registry.py      # Agent registry
│   │   │   ├── orchestrator.py  # Brain / Orchestrator
│   │   │   ├── voice_agent.py
│   │   │   ├── memory_agent.py
│   │   │   ├── vision_agent.py
│   │   │   ├── coding_agent.py
│   │   │   ├── terminal_agent.py
│   │   │   ├── web_agent.py
│   │   │   ├── file_agent.py
│   │   │   ├── productivity_agent.py
│   │   │   ├── media_agent.py
│   │   │   ├── personality_agent.py
│   │   │   ├── system_monitor_agent.py
│   │   │   ├── mobile_sync_agent.py
│   │   │   ├── model_manager_agent.py
│   │   │   ├── autonomous_task_agent.py
│   │   │   ├── security_agent.py
│   │   │   ├── overlay_hud_agent.py
│   │   │   ├── gaming_agent.py
│   │   │   ├── knowledge_agent.py
│   │   │   └── scheduler_agent.py
│   │   ├── core/
│   │   │   ├── event_bus.py      # Internal event bus
│   │   │   ├── message_queue.py  # Task queue
│   │   │   ├── task_engine.py    # Task execution engine
│   │   │   ├── context.py        # Context management
│   │   │   ├── planner.py        # Autonomous planning
│   │   │   └── router.py         # Intent routing
│   │   ├── llm/
│   │   │   ├── router.py         # Model router
│   │   │   ├── providers/
│   │   │   │   ├── base.py
│   │   │   │   ├── ollama.py
│   │   │   │   ├── gemini.py
│   │   │   │   ├── openrouter.py
│   │   │   │   ├── llamacpp.py
│   │   │   │   ├── transformers_local.py
│   │   │   │   └── vllm_provider.py
│   │   │   ├── manager.py        # Model lifecycle manager
│   │   │   └── quantization.py   # Quantization utilities
│   │   ├── voice/
│   │   │   ├── stt/
│   │   │   │   ├── whisper_stt.py
│   │   │   │   ├── faster_whisper_stt.py
│   │   │   │   └── vad.py         # Voice activity detection
│   │   │   ├── tts/
│   │   │   │   ├── piper_tts.py
│   │   │   │   ├── xtts_tts.py
│   │   │   │   └── coqui_tts.py
│   │   │   ├── wake_word.py
│   │   │   └── pipeline.py        # Streaming voice pipeline
│   │   ├── vision/
│   │   │   ├── screenshot.py
│   │   │   ├── ocr.py
│   │   │   ├── analyzer.py
│   │   │   ├── webcam.py
│   │   │   └── pipeline.py
│   │   ├── automation/
│   │   │   ├── browser/
│   │   │   │   ├── playwright_driver.py
│   │   │   │   └── browser_agent.py
│   │   │   ├── desktop/
│   │   │   │   ├── pyautogui_driver.py
│   │   │   │   ├── win32_driver.py
│   │   │   │   └── accessibility.py
│   │   │   └── terminal/
│   │   │       ├── executor.py
│   │   │       └── sandbox.py
│   │   ├── memory/
│   │   │   ├── store.py           # Memory store interface
│   │   │   ├── episodic.py        # Episodic memory
│   │   │   ├── semantic.py        # Semantic/vector memory
│   │   │   ├── working.py         # Working memory (context)
│   │   │   ├── procedural.py      # Procedural memory (how-to)
│   │   │   └── consolidation.py   # Memory consolidation
│   │   ├── security/
│   │   │   ├── sandbox.py
│   │   │   ├── permissions.py
│   │   │   ├── validator.py
│   │   │   └── audit.py
│   │   ├── services/
│   │   │   ├── file_service.py
│   │   │   ├── system_service.py
│   │   │   ├── notification_service.py
│   │   │   └── update_service.py
│   │   ├── db/
│   │   │   ├── sqlite_db.py
│   │   │   ├── chroma_db.py
│   │   │   ├── migrations/
│   │   │   └── models.py         # ORM models
│   │   └── utils/
│   │       ├── hardware.py       # Hardware detection
│   │       ├── logging.py        # Structured logging
│   │       ├── async_utils.py
│   │       └── retry.py          # Retry logic
│   │
│   └── shared/                # Shared types/contracts
│       ├── types/
│       │   ├── events.ts
│       │   ├── agents.ts
│       │   ├── models.ts
│       │   └── messages.ts
│       └── constants/
│           ├── events.ts
│           └── agents.ts
│
├── models/                    # Local model storage
│   ├── llm/
│   ├── whisper/
│   ├── tts/
│   ├── embeddings/
│   └── vision/
│
├── data/                      # Runtime data
│   ├── db/                    # SQLite databases
│   ├── vectors/               # ChromaDB data
│   ├── cache/                 # Temporary cache
│   ├── logs/                  # Application logs
│   └── config/                # User configuration
│
├── scripts/
│   ├── setup.py               # Development setup
│   ├── build.py               # Build script
│   ├── install_models.py      # Model downloader
│   └── hardware_check.py      # Hardware detection
│
├── installer/
│   ├── windows/
│   │   ├── installer.nsi       # NSIS installer script
│   │   └── setup_wizard/       # Setup wizard assets
│   └── bootstrap/
│       ├── bootstrap.py        # Dependency bootstrapper
│       └── requirements.txt
│
├── tests/
│   ├── frontend/
│   ├── backend/
│   ├── integration/
│   └── performance/
│
├── .github/
│   └── workflows/
│       ├── build.yml
│       └── test.yml
│
├── package.json               # Root workspace
├── pyproject.toml             # Python project config
├── README.md
└── LICENSE
```

---

## 5. Agent Hierarchy

### 5.1 Agent Tiers

```
TIER 0 — METACOGNITION
├── Brain / Orchestrator Agent
│   └── Oversees ALL other agents
│   └── Makes routing decisions
│   └── Manages global context
│   └── Plans autonomous workflows

TIER 1 — CORE INTELLIGENCE
├── Memory Agent         → Persistent knowledge, retrieval
├── Knowledge Agent      → Research, information synthesis
├── Personality Agent    → Tone, style, identity consistency

TIER 2 — INTERACTION
├── Voice Agent          → STT, TTS, wake word, streaming
├── Vision Agent         → Screenshots, OCR, webcam, visual reasoning
├── Overlay HUD Agent    → Desktop overlays, floating HUD management

TIER 3 — EXECUTION
├── Coding Agent         → Code generation, analysis, debugging
├── Terminal Agent       → Shell execution, sandboxed commands
├── Web Agent            → Browser automation, web research
├── File Management Agent→ File operations, organization
├── Desktop Control Agent→ Mouse, keyboard, app automation

TIER 4 — SYSTEM
├── System Monitor Agent → CPU, RAM, GPU, disk, network monitoring
├── Security Agent       → Sandboxing, permissions, threat detection
├── Model Manager Agent  → Model lifecycle, download, switching
├── Scheduler Agent      → Cron jobs, deferred tasks, reminders

TIER 5 — DOMAIN
├── Productivity Agent   → Calendar, email, document assistance
├── Media Agent          → Image, video, audio processing
├── Gaming Agent         → Game overlays, FPS counters, assistance
├── Mobile Sync Agent    → Phone notifications, sync, relay

TIER 6 — AUTONOMOUS
├── Autonomous Task Agent→ Multi-step autonomous workflows
```

### 5.2 Agent Properties

Every agent implements:

| Property | Description |
|---|---|
| `agent_id` | Unique identifier |
| `name` | Human-readable name |
| `tier` | Priority tier (0-6) |
| `capabilities` | List of tool/action capabilities |
| `state` | idle / active / busy / error / suspended |
| `memory_scope` | What memory regions it can access |
| `resource_budget` | Max RAM/VRAM/CPU it can consume |
| `retry_policy` | How failures are handled |
| `stream_enabled` | Whether it supports streaming output |
| `autonomous` | Whether it can act without user approval |

---

## 6. Multi-Agent Communication Flow

### 6.1 Message Bus Architecture

```
User Input (voice/text/vision)
       │
       ▼
┌──────────────┐
│ Gateway      │ ← WebSocket / REST / IPC
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Intent       │ ← Classifies intent: chat, code, automate, research, etc.
│ Router       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Orchestrator │ ← Creates execution plan
│ (Brain)      │ ← Selects agents
└──────┬───────┘   ← Manages context
       │
       ├──────── AgentMessage ──────► Agent A
       ├──────── AgentMessage ──────► Agent B
       └──────── AgentMessage ──────► Agent C
                                         │
                                    AgentResult
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │ Orchestrator  │ ← Aggregates results
                                  │ Merge/Stream  │ ← Streams to frontend
                                  └──────────────┘
```

### 6.2 Message Format

```python
@dataclass
class AgentMessage:
    id: str                    # Unique message ID
    source: str                # Source agent ID
    target: str                # Target agent ID  
    type: MessageType          # REQUEST | RESPONSE | EVENT | ERROR
    intent: str                # What the message is about
    payload: dict              # Message data
    context: ContextWindow     # Shared context snapshot
    priority: int              # 0 (critical) to 9 (background)
    timestamp: float
    trace_id: str              # For distributed tracing
    reply_to: Optional[str]    # Parent message ID
    ttl: int                   # Time-to-live in seconds
    retry_count: int           # Current retry attempt
```

### 6.3 Communication Patterns

| Pattern | Use Case | Example |
|---|---|---|
| **Request-Reply** | Single agent task | User asks to read a file |
| **Fan-Out** | Parallel agent work | Research query → Web + Knowledge + Memory |
| **Pipeline** | Sequential processing | Voice → STT → Intent → Brain → Response → TTS |
| **Pub-Sub** | Event broadcasting | System alert → all monitoring agents |
| **Saga** | Multi-step autonomous | "Build me a website" → plan → code → test → deploy |

---

## 7. Memory Architecture

### 7.1 Memory Types

```
┌─────────────────────────────────────────────────┐
│              JARVIS Memory System                │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ WORKING MEMORY (Active Context)            │  │
│  │ • Current conversation                     │  │
│  │ • Active task state                        │  │
│  │ • Recent agent outputs                     │  │
│  │ • Window: 8K-32K tokens (adaptive)         │  │
│  │ • Storage: In-memory (Python dict/deque)   │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ EPISODIC MEMORY (Conversations/Events)     │  │
│  │ • Past conversations                       │  │
│  │ • Task history                             │  │
│  │ • Decision logs                            │  │
│  │ • Timestamped, searchable                  │  │
│  │ • Storage: SQLite + embeddings             │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ SEMANTIC MEMORY (Knowledge/Facts)          │  │
│  │ • Learned facts about user                 │  │
│  │ • Project knowledge                        │  │
│  │ • Document summaries                       │  │
│  │ • General knowledge                        │  │
│  │ • Storage: ChromaDB vector store           │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ PROCEDURAL MEMORY (Skills/How-To)          │  │
│  │ • Learned workflows                        │  │
│  │ • Tool usage patterns                      │  │
│  │ • User preference patterns                 │  │
│  │ • Automation templates                     │  │
│  │ • Storage: SQLite + structured JSON        │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ MEMORY CONSOLIDATION ENGINE                │  │
│  │ • Periodic summarization                   │  │
│  │ • Importance scoring                       │  │
│  │ • Decay / forgetting                       │  │
│  │ • Cross-memory linking                     │  │
│  │ • Runs as background worker                │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 7.2 Memory Operations

| Operation | Description | Latency Target |
|---|---|---|
| `store(memory)` | Persist a memory entry | < 10ms |
| `recall(query, k)` | Retrieve top-k relevant memories | < 50ms |
| `forget(criteria)` | Remove memories by criteria | < 100ms |
| `consolidate()` | Summarize and compress old memories | Background |
| `link(memory_a, memory_b)` | Create association between memories | < 10ms |
| `importance_score(memory)` | Score memory importance for retention | < 5ms |

---

## 8. LLM Routing System

### 8.1 Router Overview

The LLM Router dynamically selects the optimal model for each request based on:

- Task type (chat, code, reasoning, creative, vision, embeddings)
- Required capabilities (tool use, long context, structured output)
- Available hardware (RAM, VRAM, GPU type)
- Current system load
- User preference
- Latency requirements
- Cost constraints (for cloud APIs)

### 8.2 Model Tiers

```
TIER 1 — LOCAL LIGHTWEIGHT (Always Available)
├── Qwen2.5-3B-Q4_K_M         → General chat, fast responses
├── Phi-3.5-mini-Q4            → Reasoning, instruction following
├── CodeGemma-2B-Q4            → Quick code completions
├── all-MiniLM-L6-v2           → Embeddings (384-dim)
└── Whisper-tiny/base          → Voice transcription

TIER 2 — LOCAL MEDIUM (6-8GB VRAM)
├── Qwen2.5-7B-Q4_K_M         → Quality chat + reasoning
├── DeepSeek-Coder-6.7B-Q4    → Code generation
├── Llama-3.1-8B-Q4            → General purpose
├── Whisper-small/medium       → Better transcription
└── nomic-embed-text           → Better embeddings

TIER 3 — LOCAL HEAVY (12GB+ VRAM)
├── Qwen2.5-14B-Q4             → High-quality reasoning
├── CodeLlama-13B-Q4           → Advanced coding
├── LLaVA-7B-Q4                → Vision + language
└── Whisper-large-v3           → Best transcription

TIER 4 — CLOUD FALLBACK
├── Gemini 2.0 Flash           → Fast cloud inference
├── Gemini 1.5 Pro             → Long context, multimodal
├── DeepSeek-V3 (OpenRouter)   → Quality + cost balance
├── Claude 3.5 Sonnet (OR)     → Complex reasoning
└── GPT-4o-mini (OR)           → Fast, cheap cloud
```

### 8.3 Routing Decision Matrix

| Task Type | Preferred Model | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Quick chat | Local 3B | Local 7B | Gemini Flash |
| Code generation | DeepSeek-Coder | Local 7B | Cloud code model |
| Complex reasoning | Local 7B+ | Gemini Pro | Cloud reasoning |
| Vision analysis | LLaVA local | Gemini Flash | GPT-4o-mini |
| Embeddings | MiniLM local | Nomic local | — |
| Voice STT | Whisper local | Faster-Whisper | Cloud STT |
| Voice TTS | Piper local | XTTS local | Cloud TTS |
| Autonomous planning | Local 7B+ | Gemini Pro | Claude Sonnet |

---

## 9. Voice Architecture

### 9.1 Voice Pipeline

```
Microphone → VAD → Wake Word → STT → Intent → Brain → Response → TTS → Speaker
    │         │        │         │       │        │        │         │
    │         │        │      Stream   Route    Plan    Stream    Stream
    │         │        │         │       │        │        │         │
    │      Silero    "Jarvis"  Faster   LLM    Agents   Token    Piper/
    │      VAD       Porcupine Whisper  Router          Stream   XTTS
    │                or custom
    │
    └── Continuous audio capture (16kHz, mono, 16-bit)
```

### 9.2 Latency Targets

| Stage | Target | Strategy |
|---|---|---|
| VAD detection | < 50ms | Silero VAD, small model |
| Wake word | < 100ms | Local keyword spotter |
| STT start | < 200ms | Streaming Faster-Whisper |
| First LLM token | < 500ms | Streaming inference |
| TTS start | < 200ms | Streaming Piper TTS |
| **Total: voice to first audio** | **< 1 second** | Streaming everything |

### 9.3 Interrupt Handling

- User speaking while TTS is playing → immediately stop TTS
- New wake word during processing → queue or cancel current task
- Continuous listening mode with energy-based silence detection
- Configurable: push-to-talk, wake word, always-on

---

## 10. Vision Architecture

### 10.1 Vision Capabilities

| Capability | Implementation | Use Case |
|---|---|---|
| Screenshot capture | `mss` / Win32 API | Desktop understanding |
| OCR | Tesseract / EasyOCR / PaddleOCR | Text extraction |
| Visual Q&A | LLaVA / Gemini Vision | "What's on my screen?" |
| Webcam analysis | OpenCV | Face detection, gestures |
| UI element detection | YOLO / accessibility API | Automation targeting |
| Browser page analysis | Playwright screenshot + LLM | Web understanding |
| Coding error detection | Screenshot → OCR → LLM | Visual debugging |

### 10.2 Vision Pipeline

```
Trigger (user request / scheduled / event)
       │
       ▼
┌──────────────┐
│ Capture      │ ← Screenshot / Webcam frame / Browser snapshot
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Preprocess   │ ← Resize, crop ROI, enhance contrast
└──────┬───────┘
       │
       ├─── OCR Path ──────► Text extraction ──► LLM analysis
       │
       ├─── Vision LLM ───► Direct visual understanding
       │
       └─── Detection ────► UI element / object detection
                                    │
                                    ▼
                            ┌──────────────┐
                            │ Result       │ ← Structured output
                            │ Aggregation  │ ← Sent to Brain
                            └──────────────┘
```

---

## 11. Web Automation Pipeline

### 11.1 Architecture

```
Brain (goal: "Book a flight to Tokyo")
       │
       ▼
┌──────────────┐
│ Web Agent    │ ← Receives structured goal
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Planner      │ ← Breaks goal into browser steps
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Playwright   │ ← Executes browser actions
│ Driver       │ ← Screenshots after each action
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Vision +     │ ← Verifies action results
│ Validator    │ ← Decides next step
└──────┬───────┘
       │
       ▼
  Loop until goal complete or max steps reached
```

### 11.2 Browser Capabilities

- Page navigation, form filling, clicking
- Cookie/session management
- Multi-tab orchestration
- Download management
- Authentication handling (with user credentials vault)
- Screenshot-based verification
- DOM extraction for structured data
- JavaScript execution

---

## 12. Desktop Control Pipeline

### 12.1 Architecture

```
Brain (goal: "Open VS Code and create a new Python file")
       │
       ▼
┌──────────────┐
│ Desktop      │
│ Agent        │
└──────┬───────┘
       │
       ├─── Accessibility API ───► Preferred: structured UI tree
       │                           Win32 UI Automation
       │
       ├─── PyAutoGUI ──────────► Fallback: pixel-based control
       │                           Mouse/keyboard simulation
       │
       └─── Win32 API ──────────► Direct: window management
                                   Process control, app launch
```

### 12.2 Desktop Capabilities

| Capability | Implementation |
|---|---|
| App launching | `subprocess`, Win32 ShellExecute |
| Window management | Win32 API (FindWindow, SetForegroundWindow) |
| Mouse control | PyAutoGUI with safety bounds |
| Keyboard input | PyAutoGUI, Win32 SendInput |
| UI element interaction | Windows UI Automation API |
| Clipboard management | Win32 clipboard API |
| Screenshot + OCR | MSS + Tesseract |
| Process monitoring | psutil |

---

## 13. Tool Orchestration

### 13.1 Tool Registry

Every capability the agents can use is registered as a **Tool**:

```python
@dataclass
class Tool:
    name: str                   # e.g., "read_file"
    description: str            # For LLM tool-use prompting
    agent: str                  # Owning agent
    parameters: dict            # JSON Schema for parameters
    requires_approval: bool     # Whether user must approve
    risk_level: RiskLevel       # LOW / MEDIUM / HIGH / CRITICAL
    timeout: int                # Max execution time (seconds)
    async_capable: bool         # Can run asynchronously
    resource_requirements: dict # RAM/VRAM/CPU needs
```

### 13.2 Tool Categories

| Category | Tools | Risk |
|---|---|---|
| Information | web_search, read_file, get_system_info | LOW |
| Creation | write_file, create_directory, generate_code | MEDIUM |
| Execution | run_command, run_script, execute_code | HIGH |
| Automation | click, type, navigate, browser_action | HIGH |
| System | install_package, change_settings, restart_service | CRITICAL |
| Destructive | delete_file, format_disk, kill_process | CRITICAL |

---

## 14. Event-Driven Architecture

### 14.1 Event Bus

The entire system is built on an asynchronous event bus using Python's `asyncio`:

```python
class EventBus:
    """Central event bus for all inter-component communication."""
    
    async def emit(self, event: Event) -> None
    async def on(self, event_type: str, handler: Callable) -> str
    async def off(self, handler_id: str) -> None
    async def once(self, event_type: str, handler: Callable) -> str
    async def wait_for(self, event_type: str, timeout: float) -> Event
```

### 14.2 Event Categories

| Category | Events |
|---|---|
| **User** | `user.input.text`, `user.input.voice`, `user.input.vision` |
| **Agent** | `agent.started`, `agent.completed`, `agent.error`, `agent.stream` |
| **System** | `system.cpu`, `system.ram`, `system.gpu`, `system.network` |
| **Model** | `model.loaded`, `model.unloaded`, `model.inference.start/end` |
| **Memory** | `memory.stored`, `memory.recalled`, `memory.consolidated` |
| **UI** | `ui.scene.change`, `ui.overlay.show/hide`, `ui.notification` |
| **Automation** | `automation.step`, `automation.complete`, `automation.error` |

---

## 15. Queue Systems

### 15.1 Task Queue

```python
class TaskQueue:
    """Priority-based async task queue."""
    
    # Priority levels:
    # 0 = CRITICAL (user interaction, voice response)
    # 1 = HIGH (active task execution)
    # 2 = NORMAL (background processing)
    # 3 = LOW (indexing, consolidation)
    # 4 = IDLE (optimization, cleanup)
    
    async def enqueue(self, task: Task, priority: int) -> str
    async def dequeue(self) -> Task
    async def cancel(self, task_id: str) -> bool
    async def get_status(self, task_id: str) -> TaskStatus
```

### 15.2 Queue Configuration

| Queue | Max Concurrent | Priority | Worker Count |
|---|---|---|---|
| Inference | 1 (GPU) / 2 (CPU) | 0-1 | 1 |
| Agent Tasks | 4 | 1-2 | 4 |
| Background | 2 | 3-4 | 2 |
| I/O Operations | 8 | 2 | 8 |

---

## 16. Background Workers

### 16.1 Worker Types

| Worker | Purpose | Interval | Resource Budget |
|---|---|---|---|
| Memory Consolidator | Summarize old memories | 30 min | Low CPU |
| System Monitor | Track CPU/RAM/GPU/Disk | 5 sec | Minimal |
| Model Health Checker | Verify model availability | 60 sec | Minimal |
| Index Builder | Index files, docs for search | On change | Low CPU |
| Cache Cleaner | Prune expired cache entries | 10 min | Minimal |
| Scheduler Runner | Execute scheduled tasks | 1 sec | Varies |
| Voice Listener | Background wake word detection | Continuous | Low CPU |
| Notification Watcher | Check for new notifications | 5 sec | Minimal |

### 16.2 Worker Lifecycle

- Workers start in **suspended** state
- Activated based on user activity and system load
- Throttled automatically when system is under load
- Graceful shutdown on application exit
- Crash recovery with exponential backoff

---

## 17. Async Orchestration

### 17.1 Execution Model

All operations in JARVIS use Python's `asyncio`:

```python
# Agent execution is fully async
async def execute_agent_task(agent: Agent, task: Task) -> AgentResult:
    async with resource_limiter(agent.resource_budget):
        context = await memory_agent.recall(task.query)
        plan = await orchestrator.plan(task, context)
        
        results = []
        for step in plan.steps:
            if step.parallel_with:
                # Execute parallel steps concurrently
                parallel_results = await asyncio.gather(
                    *[execute_step(s) for s in step.parallel_with]
                )
                results.extend(parallel_results)
            else:
                result = await execute_step(step)
                results.append(result)
        
        return AgentResult(results=results, trace_id=task.trace_id)
```

### 17.2 Concurrency Limits

| Resource | Max Concurrent | Reason |
|---|---|---|
| GPU Inference | 1 | VRAM contention |
| CPU Inference | 2 | Prevent CPU saturation |
| File I/O | 16 | OS file descriptor limits |
| Network | 8 | Bandwidth management |
| Browser instances | 2 | Memory usage |
| Agent execution | 6 | Context management |

---

## 18. Streaming Architecture

### 18.1 Streaming Philosophy

Everything that can stream, must stream:

- LLM token generation → stream to frontend
- Voice synthesis → stream audio chunks
- Agent progress → stream status updates
- File operations → stream progress
- Vision analysis → stream intermediate results

### 18.2 Streaming Implementation

```python
async def stream_llm_response(prompt: str, model: str):
    """Stream LLM tokens via WebSocket."""
    async for token in llm_provider.generate_stream(prompt, model):
        await websocket.send_json({
            "type": "llm.token",
            "data": {"token": token, "model": model}
        })
```

### 18.3 Backpressure Handling

- Frontend maintains a token buffer (max 100 tokens)
- If buffer is full, backend pauses generation
- WebSocket ping/pong for connection health
- Automatic reconnection with state recovery

---

## 19. WebSocket Communication

### 19.1 Protocol

```json
{
    "type": "event_type",
    "id": "unique_message_id",
    "timestamp": 1716163200000,
    "data": { },
    "trace_id": "optional_trace_id"
}
```

### 19.2 Event Types

| Direction | Type | Description |
|---|---|---|
| Client → Server | `user.message` | Text message from user |
| Client → Server | `user.voice.start` | Start voice recording |
| Client → Server | `user.voice.chunk` | Audio data chunk |
| Client → Server | `user.voice.stop` | Stop voice recording |
| Client → Server | `ui.scene.ready` | Scene finished loading |
| Server → Client | `ai.token` | Streaming LLM token |
| Server → Client | `ai.complete` | Response complete |
| Server → Client | `agent.status` | Agent state change |
| Server → Client | `agent.stream` | Agent streaming output |
| Server → Client | `system.metrics` | CPU/RAM/GPU metrics |
| Server → Client | `memory.event` | Memory operation result |
| Server → Client | `voice.tts.chunk` | TTS audio chunk |
| Server → Client | `notification` | System notification |
| Bidirectional | `ping` / `pong` | Health check |

### 19.3 Connection Management

- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Session ID preserved across reconnections
- Message queue for offline buffering
- Binary WebSocket frames for audio/image data
- Text frames for JSON events

---

## 20. Frontend-Backend Communication

### 20.1 Communication Layers

```
Frontend (React)
    │
    ├── WebSocket Client ──────────────► FastAPI WebSocket Server
    │   └── Streaming AI, events, audio        (Port 8765)
    │
    ├── REST Client ───────────────────► FastAPI REST API
    │   └── Configuration, models, files       (Port 8765)
    │
    └── Tauri IPC (invoke) ────────────► Tauri Rust Commands
        └── Native OS operations               (In-process)
```

### 20.2 Data Flow Rules

| Operation | Channel | Reason |
|---|---|---|
| AI chat messages | WebSocket | Streaming required |
| Voice audio | WebSocket (binary) | Low latency |
| System metrics | WebSocket | Realtime updates |
| Agent status | WebSocket | Live monitoring |
| File uploads | REST (multipart) | Large payloads |
| Configuration changes | REST | Request-response |
| Model management | REST | CRUD operations |
| System tray actions | Tauri IPC | Native integration |
| File dialogs | Tauri IPC | Native dialogs |
| Global hotkeys | Tauri IPC | OS-level hooks |
| Window management | Tauri IPC | Native windows |

---

## 21. Plugin System

### 21.1 Plugin Architecture

```
plugins/
├── plugin-name/
│   ├── manifest.json      # Plugin metadata, permissions
│   ├── agent.py           # Optional: custom agent
│   ├── tools.py           # Optional: custom tools
│   ├── ui/                # Optional: React UI components
│   │   ├── Panel.tsx
│   │   └── Widget.tsx
│   └── README.md
```

### 21.2 Plugin Manifest

```json
{
    "name": "spotify-control",
    "version": "1.0.0",
    "description": "Control Spotify playback via JARVIS",
    "author": "community",
    "permissions": ["network", "process.launch"],
    "agent": {
        "name": "SpotifyAgent",
        "tier": 5,
        "capabilities": ["play_music", "pause_music", "next_track"]
    },
    "tools": [
        {
            "name": "play_track",
            "description": "Play a specific track on Spotify",
            "parameters": { "track": "string" }
        }
    ],
    "ui": {
        "panel": "ui/Panel.tsx",
        "widget": "ui/Widget.tsx"
    }
}
```

### 21.3 Plugin Isolation

- Plugins run in sandboxed Python subprocesses
- Limited filesystem access (plugin directory only)
- Network access requires explicit permission
- Resource budgets enforced per-plugin
- Plugins can be hot-reloaded without restart

---

## 22. Model Manager

### 22.1 Responsibilities

| Function | Description |
|---|---|
| Discovery | Scan for available models (local + remote) |
| Download | Download models with progress tracking |
| Verification | SHA256 checksum verification |
| Loading | Load models into RAM/VRAM with memory budgeting |
| Unloading | Free model memory when not in use |
| Switching | Hot-swap models without restart |
| Profiling | Benchmark model performance on current hardware |
| Updating | Check for newer model versions |

### 22.2 Model Lifecycle

```
AVAILABLE → DOWNLOADING → DOWNLOADED → LOADING → READY → ACTIVE → UNLOADING → IDLE
                                                    ↑                    │
                                                    └────────────────────┘
                                                      (on-demand reload)
```

### 22.3 Memory Budgeting

```python
class MemoryBudget:
    total_ram: int          # System total RAM
    available_ram: int      # Currently free RAM
    total_vram: int         # GPU total VRAM
    available_vram: int     # Currently free VRAM
    
    # Reservation rules:
    # - System overhead: 2GB RAM reserved for OS
    # - Frontend: 500MB RAM reserved
    # - Backend: 500MB RAM reserved
    # - Remaining = available for models
    
    # Example: 8GB RAM system
    # OS: 2GB, Frontend: 500MB, Backend: 500MB
    # Model budget: ~5GB RAM
    # Can load: 1x 7B Q4 model (~4.5GB) OR 2x 3B Q4 models (~2x2GB)
```

---

## 23. API Provider Manager

### 23.1 Provider Registry

```python
providers = {
    "ollama": {
        "type": "local",
        "url": "http://localhost:11434",
        "health_check": "/api/tags",
        "supports_streaming": True,
        "supports_tools": True
    },
    "gemini": {
        "type": "cloud",
        "url": "https://generativelanguage.googleapis.com",
        "requires_key": True,
        "supports_streaming": True,
        "supports_vision": True,
        "rate_limit": 60  # requests per minute
    },
    "openrouter": {
        "type": "cloud",
        "url": "https://openrouter.ai/api/v1",
        "requires_key": True,
        "supports_streaming": True,
        "model_catalog": True  # Dynamic model list
    },
    "llamacpp": {
        "type": "local",
        "binary": "llama-server",
        "supports_streaming": True,
        "gpu_layers": "auto"
    }
}
```

### 23.2 Provider Selection Logic

1. Check if local model can handle the task
2. If local is available and capable → use local
3. If local is overloaded → check cloud quotas
4. Select cheapest cloud provider that meets requirements
5. Apply rate limiting and cost tracking
6. Fall back to next provider on failure

---

## 24. RAM Optimization

### 24.1 Strategies

| Strategy | Implementation | Savings |
|---|---|---|
| Lazy agent loading | Only instantiate agents when first needed | ~200MB |
| Model memory mapping | Use mmap for GGUF models | OS manages paging |
| Shared embeddings | Single embedding model instance shared across agents | ~300MB |
| Context pruning | Trim old conversation context aggressively | ~100MB |
| Worker pooling | Reuse worker processes instead of spawning new ones | ~50MB/worker |
| Frontend code splitting | Dynamic imports for scene components | ~100MB |
| Image/texture compression | Use compressed textures (KTX2, Basis) | ~200MB |
| SQLite WAL mode | Write-ahead logging for lower memory overhead | ~20MB |

### 24.2 Memory Monitoring

```python
async def monitor_memory():
    """Continuously monitor and optimize memory usage."""
    while True:
        ram_usage = psutil.virtual_memory().percent
        
        if ram_usage > 90:
            await emergency_memory_cleanup()  # Unload non-essential models
        elif ram_usage > 80:
            await gentle_memory_optimization()  # Prune caches, compact memory
        elif ram_usage > 70:
            await suggest_model_downgrade()  # Suggest smaller models
        
        await asyncio.sleep(5)
```

---

## 25. VRAM Optimization

### 25.1 Strategies

| Strategy | Implementation |
|---|---|
| Single model loading | Only one LLM in VRAM at a time |
| Dynamic GPU layers | Adjust GPU offloading based on VRAM |
| Model unloading | Unload model after idle timeout (60s default) |
| Quantization | Q4_K_M default, Q2_K for extreme low VRAM |
| Shared VRAM budgeting | Reserve VRAM for WebGL rendering (256MB) |
| KV cache limiting | Cap KV cache size based on available VRAM |
| Batch size tuning | Reduce batch size under VRAM pressure |

### 25.2 VRAM Budget Allocation

| Component | VRAM Budget | Priority |
|---|---|---|
| WebGL Rendering | 256-512MB | Always reserved |
| Primary LLM | Remaining | On-demand |
| Vision Model | Swap with LLM | On-demand |
| Embedding Model | CPU fallback available | Low priority |
| TTS Model | CPU preferred | Low priority |
| STT Model | CPU preferred | Low priority |

---

## 26. CPU Fallback Strategies

### 26.1 When GPU is Unavailable

| Capability | GPU Mode | CPU Fallback |
|---|---|---|
| LLM Inference | Full GPU offload | llama.cpp CPU, smaller models |
| WebGL Rendering | Full shaders | Reduced quality, 30fps target |
| Voice STT | GPU Whisper | CPU Faster-Whisper tiny/base |
| Voice TTS | GPU XTTS | CPU Piper (much faster on CPU) |
| Embeddings | GPU compute | CPU MiniLM (fast enough) |
| Vision | GPU LLaVA | Cloud vision API fallback |

### 26.2 CPU Optimization

- Use SIMD-optimized libraries (numpy, ONNX Runtime)
- Thread pool sizing based on core count
- Avoid CPU-bound work in asyncio event loop (use `run_in_executor`)
- Prefer smaller models with acceptable quality trade-offs

---

## 27. GPU Fallback Strategies

### 27.1 GPU Detection Hierarchy

```python
def detect_gpu():
    """Detect available GPU and set capabilities."""
    
    # Check NVIDIA (CUDA)
    if nvidia_available():
        vram = get_nvidia_vram()
        return GPUProfile(type="cuda", vram=vram, compute=get_compute_capability())
    
    # Check AMD (ROCm) — limited support
    if amd_available():
        vram = get_amd_vram()
        return GPUProfile(type="rocm", vram=vram)
    
    # Check Intel (oneAPI) — future support
    if intel_gpu_available():
        return GPUProfile(type="intel", vram=get_intel_vram())
    
    # CPU-only mode
    return GPUProfile(type="cpu", vram=0)
```

### 27.2 Adaptive GPU Strategy

| VRAM | Strategy | Max Model Size |
|---|---|---|
| 0 GB (CPU only) | CPU inference, reduced UI | 3B Q4 (RAM) |
| 2-4 GB | Partial GPU offload, simple UI | 3B Q4 (partial GPU) |
| 4-6 GB | Full small model + decent UI | 7B Q4 (partial GPU) |
| 6-8 GB | Full medium model + good UI | 7B Q4 (full GPU) |
| 8-12 GB | Large model + rich UI | 13B Q4 (full GPU) |
| 12+ GB | Multiple models + cinematic UI | 14B+ Q4 |

---

## 28. Quantization Strategy

### 28.1 Supported Formats

| Format | Use Case | Quality | Size Reduction |
|---|---|---|---|
| Q2_K | Extreme low memory | Low | ~75% |
| Q3_K_M | Low memory | Acceptable | ~70% |
| Q4_K_M | **Default / Recommended** | Good | ~60% |
| Q5_K_M | High quality local | Very good | ~50% |
| Q6_K | Near-original quality | Excellent | ~40% |
| Q8_0 | Maximum local quality | Near-perfect | ~25% |
| F16 | Full precision (cloud/high VRAM) | Perfect | 0% |

### 28.2 Auto-Quantization Selection

```python
def select_quantization(model_size_params: int, available_ram_mb: int, available_vram_mb: int):
    """Automatically select best quantization for hardware."""
    
    model_sizes = {
        "Q2_K": model_size_params * 0.25,
        "Q3_K_M": model_size_params * 0.30,
        "Q4_K_M": model_size_params * 0.40,
        "Q5_K_M": model_size_params * 0.50,
        "Q6_K": model_size_params * 0.60,
        "Q8_0": model_size_params * 0.75,
    }
    
    available = available_vram_mb if available_vram_mb > 0 else available_ram_mb
    
    # Select highest quality that fits
    for quant in ["Q8_0", "Q6_K", "Q5_K_M", "Q4_K_M", "Q3_K_M", "Q2_K"]:
        if model_sizes[quant] < available * 0.85:  # 85% headroom
            return quant
    
    return None  # Model too large for system
```

---

## 29. Lazy Loading Systems

### 29.1 Frontend Lazy Loading

| Component | Load Trigger | Bundle Size |
|---|---|---|
| Boot scene | Always loaded | ~50KB |
| Command center | After boot | ~200KB |
| 3D consciousness | After boot | ~500KB |
| Agent network view | On navigate | ~100KB |
| Memory palace | On navigate | ~150KB |
| Diagnostics | On navigate | ~80KB |
| Code editor | On demand | ~300KB |
| Terminal | On demand | ~100KB |

Implementation: React `lazy()` + Suspense with loading scenes.

### 29.2 Backend Lazy Loading

| Component | Load Trigger |
|---|---|
| Agents | First request to agent |
| Models | First inference request |
| Browser driver | First web automation task |
| Vision pipeline | First vision request |
| Voice pipeline | First voice interaction or wake word enabled |
| Plugin system | After core boot complete |
| Scheduler | After core boot complete |

---

## 30. Smart Caching Systems

### 30.1 Cache Layers

| Layer | Technology | TTL | Purpose |
|---|---|---|---|
| L1 (Memory) | Python `lru_cache` / dict | Session | Hot data, recent queries |
| L2 (Disk) | SQLite cache table | 24 hours | Embeddings, API responses |
| L3 (Persistent) | ChromaDB | Indefinite | Vector embeddings |

### 30.2 Cache Invalidation

- LRU eviction for memory cache (max 1000 entries)
- Time-based expiry for disk cache
- Manual invalidation via Memory Agent
- Size-based eviction when disk cache exceeds 1GB

### 30.3 What Gets Cached

| Data | Cache Layer | Invalidation |
|---|---|---|
| Embedding vectors | L2 + L3 | On source change |
| API responses | L1 + L2 | TTL (1 hour) |
| Model metadata | L1 | On model change |
| File hashes | L2 | On file change |
| Search results | L1 | TTL (5 minutes) |
| System metrics | L1 | Overwrite (ring buffer) |

---

## 31. Logging Architecture

### 31.1 Log Levels

| Level | Use Case | Destinations |
|---|---|---|
| TRACE | Shader compilation, token generation | File only |
| DEBUG | Agent decisions, memory operations | File only |
| INFO | User actions, task completion | File + Console |
| WARN | Performance issues, fallbacks | File + Console + UI |
| ERROR | Operation failures, model errors | File + Console + UI + Notification |
| FATAL | System crashes, unrecoverable errors | File + Console + UI + Notification + Restart |

### 31.2 Structured Logging

```python
logger.info("agent.task.completed", extra={
    "agent": "CodingAgent",
    "task_id": "abc123",
    "duration_ms": 1523,
    "model": "deepseek-coder-6.7b",
    "tokens_in": 500,
    "tokens_out": 1200,
    "trace_id": "xyz789"
})
```

### 31.3 Log Rotation

- Max file size: 50MB per file
- Max files: 10 (rotated)
- Total log budget: 500MB
- Compression: gzip for archived logs
- Retention: 7 days default

---

## 32. Error Recovery Systems

### 32.1 Recovery Strategies

| Error Type | Recovery Strategy |
|---|---|
| Model OOM | Unload model, retry with smaller quantization |
| Model crash | Restart inference process, retry |
| WebSocket disconnect | Auto-reconnect with state recovery |
| Agent timeout | Cancel, retry with simpler approach |
| Browser automation fail | Screenshot, re-analyze, retry |
| File I/O error | Retry with backoff, notify user |
| Network error | Queue request, retry when connected |
| GPU error | Fall back to CPU, notify user |

### 32.2 Circuit Breaker

```python
class CircuitBreaker:
    """Prevent cascading failures."""
    
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half"     # Testing recovery
    
    failure_threshold: int = 5
    recovery_timeout: int = 30  # seconds
    
    async def call(self, func, *args, **kwargs):
        if self.state == self.OPEN:
            if time_since_last_failure > self.recovery_timeout:
                self.state = self.HALF_OPEN
            else:
                raise CircuitOpenError()
        
        try:
            result = await func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise
```

---

## 33. Retry Systems

### 33.1 Retry Policies

| Operation | Max Retries | Backoff | Strategy |
|---|---|---|---|
| LLM inference | 3 | Exponential (1s, 2s, 4s) | Model downgrade on failure |
| API calls | 5 | Exponential (500ms base) | Provider switch |
| File I/O | 3 | Linear (100ms) | Direct retry |
| Browser action | 3 | Linear (1s) | Re-analyze + retry |
| Voice STT | 2 | None | Model switch |
| Agent task | 2 | Exponential (2s, 4s) | Simplify approach |

### 33.2 Retry Implementation

```python
async def retry_with_backoff(
    func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
    fallback: Optional[Callable] = None,
    on_retry: Optional[Callable] = None
):
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries:
                if fallback:
                    return await fallback()
                raise
            
            delay = base_delay * (backoff_factor ** attempt)
            if on_retry:
                await on_retry(attempt, delay, e)
            await asyncio.sleep(delay)
```

---

## 34. Task Execution Engine

### 34.1 Task Lifecycle

```
CREATED → QUEUED → PLANNING → EXECUTING → STREAMING → COMPLETED
                       │           │                      │
                       │           ├── RETRYING ──────────┘
                       │           │
                       │           └── FAILED
                       │
                       └── CANCELLED
```

### 34.2 Task Definition

```python
@dataclass
class Task:
    id: str
    type: TaskType          # CHAT, CODE, AUTOMATE, RESEARCH, SYSTEM
    input: dict             # Task input data
    context: ContextWindow  # Relevant context
    priority: int           # 0-9
    timeout: int            # Seconds
    requires_approval: bool # User must approve before execution
    trace_id: str           # For distributed tracing
    parent_id: Optional[str]  # For sub-tasks
    
    # Execution state
    status: TaskStatus
    assigned_agents: List[str]
    plan: Optional[ExecutionPlan]
    results: List[StepResult]
    error: Optional[str]
    created_at: float
    started_at: Optional[float]
    completed_at: Optional[float]
```

---

## 35. Autonomous Workflows

### 35.1 Autonomous Planning

```
User Goal: "Build a Python web scraper for product prices"
       │
       ▼
┌──────────────┐
│ Goal Parser  │ ← Understand intent, extract requirements
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Task Planner │ ← Create multi-step execution plan
└──────┬───────┘
       │
       ▼
  Plan:
  1. Create project directory
  2. Initialize virtual environment
  3. Install dependencies (requests, beautifulsoup4)
  4. Write scraper code
  5. Test scraper on sample URL
  6. Handle errors, add retry logic
  7. Report results to user
       │
       ▼
┌──────────────┐
│ Plan Review  │ ← User approves or modifies plan
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Executor     │ ← Execute steps, streaming progress
│              │ ← Self-correct on failures
│              │ ← Adapt plan dynamically
└──────────────┘
```

### 35.2 Self-Correction Loop

```python
async def autonomous_execute(plan: ExecutionPlan):
    for step in plan.steps:
        result = await execute_step(step)
        
        if result.failed:
            # Analyze failure
            analysis = await brain.analyze_failure(step, result.error)
            
            if analysis.can_fix:
                # Self-correct
                fixed_step = await brain.create_fix(step, analysis)
                result = await execute_step(fixed_step)
            elif analysis.can_skip:
                # Skip and continue
                continue
            elif analysis.needs_replanning:
                # Replan remaining steps
                new_plan = await brain.replan(plan, step, result.error)
                return await autonomous_execute(new_plan)
            else:
                # Escalate to user
                await notify_user(f"Step failed: {step.description}")
                break
        
        # Stream progress to frontend
        await stream_progress(step, result)
```

---

## 36. Mobile Integration

### 36.1 Architecture

```
┌──────────────┐         ┌──────────────┐
│ JARVIS       │◄───────►│ Mobile App   │
│ Desktop      │  REST/  │ (React       │
│ Backend      │  WS     │  Native /    │
│              │         │  PWA)        │
└──────────────┘         └──────────────┘
```

### 36.2 Mobile Capabilities (Future)

| Feature | Implementation |
|---|---|
| Remote chat | WebSocket relay |
| Phone notifications | Push notifications via backend |
| Voice relay | Audio stream over WebSocket |
| File sharing | REST upload/download |
| Status monitoring | Real-time system status |
| Remote commands | Authenticated command execution |

### 36.3 Priority

Mobile integration is **Phase 4+** — desktop-first always. The backend API design should be mobile-ready from Day 1, but the mobile client is a future milestone.

---

## 37. Local Database Architecture

### 37.1 SQLite Schema (Core)

```sql
-- Conversations
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at REAL,
    updated_at REAL,
    metadata JSON
);

-- Messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role TEXT CHECK(role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT,
    model TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    latency_ms REAL,
    created_at REAL,
    metadata JSON
);

-- Agent Tasks
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    type TEXT,
    status TEXT,
    input JSON,
    output JSON,
    agent TEXT,
    parent_id TEXT REFERENCES tasks(id),
    trace_id TEXT,
    created_at REAL,
    completed_at REAL,
    error TEXT
);

-- Memory (Episodic)
CREATE TABLE episodic_memory (
    id TEXT PRIMARY KEY,
    type TEXT,
    content TEXT,
    summary TEXT,
    importance REAL,
    access_count INTEGER DEFAULT 0,
    last_accessed REAL,
    created_at REAL,
    metadata JSON
);

-- Procedural Memory
CREATE TABLE procedural_memory (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    steps JSON,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_used REAL,
    created_at REAL
);

-- Schedules
CREATE TABLE schedules (
    id TEXT PRIMARY KEY,
    name TEXT,
    cron TEXT,
    task_type TEXT,
    task_input JSON,
    enabled INTEGER DEFAULT 1,
    last_run REAL,
    next_run REAL,
    created_at REAL
);

-- Model Registry
CREATE TABLE models (
    id TEXT PRIMARY KEY,
    name TEXT,
    provider TEXT,
    path TEXT,
    size_bytes INTEGER,
    quantization TEXT,
    capabilities JSON,
    performance_profile JSON,
    downloaded_at REAL
);

-- Audit Log
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    agent TEXT,
    details JSON,
    risk_level TEXT,
    approved INTEGER,
    timestamp REAL
);
```

### 37.2 Database Configuration

```python
# SQLite optimization settings
PRAGMA journal_mode = WAL;          # Write-ahead logging
PRAGMA synchronous = NORMAL;        # Balance safety/speed
PRAGMA cache_size = -8000;          # 8MB cache
PRAGMA temp_store = MEMORY;         # In-memory temp tables
PRAGMA mmap_size = 268435456;       # 256MB memory-mapped I/O
PRAGMA foreign_keys = ON;           # Enforce foreign keys
```

---

## 38. Vector Memory Systems

### 38.1 ChromaDB Configuration

```python
chroma_client = chromadb.PersistentClient(
    path="./data/vectors",
    settings=Settings(
        anonymized_telemetry=False,
        allow_reset=True
    )
)

# Collections
conversations_collection = chroma_client.get_or_create_collection(
    name="conversations",
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)

knowledge_collection = chroma_client.get_or_create_collection(
    name="knowledge",
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)

files_collection = chroma_client.get_or_create_collection(
    name="files",
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)
```

### 38.2 Embedding Strategy

| Content Type | Embedding Model | Dimensions | Latency |
|---|---|---|---|
| Short text (< 512 tokens) | all-MiniLM-L6-v2 | 384 | < 5ms |
| Long documents | nomic-embed-text | 768 | < 20ms |
| Code | CodeBERT or StarCoder embed | 768 | < 20ms |

### 38.3 Vector Search Optimization

- HNSW index with `ef_construction=128`, `M=16`
- Batch embedding for bulk operations
- Incremental indexing (only new/changed content)
- Max collection size: 100K vectors per collection (sufficient for personal use)
- Periodic compaction during idle time

---

## 39. Security Architecture

### 39.1 Threat Model

| Threat | Mitigation |
|---|---|
| LLM prompt injection | Input sanitization, output validation |
| Autonomous code execution | Sandboxed execution, approval workflow |
| File system damage | Permission boundaries, backup before destructive ops |
| API key exposure | Encrypted local storage, never in logs |
| Network attacks | Local-first, minimal network exposure |
| Malicious plugins | Plugin sandboxing, permission system |
| Data exfiltration | No telemetry, local-only by default |

### 39.2 Security Layers

```
User Input → Sanitization → Intent Classification → Risk Assessment →
   │
   ├── LOW risk → Execute directly
   ├── MEDIUM risk → Log + Execute
   ├── HIGH risk → Request approval → Execute if approved
   └── CRITICAL risk → Request approval + confirmation → Execute
```

---

## 40. Sandboxing

### 40.1 Execution Sandboxes

| Context | Sandbox Type | Restrictions |
|---|---|---|
| Code execution | subprocess + tempdir | No network, limited FS, timeout |
| Terminal commands | subprocess + limited env | Allowlisted commands only |
| Browser automation | Isolated browser profile | No extension access |
| Plugin execution | subprocess + venv | Limited permissions |
| File operations | Restricted path access | User-defined boundaries |

### 40.2 Sandbox Implementation

```python
class Sandbox:
    """Sandboxed execution environment."""
    
    def __init__(self, 
                 allowed_paths: List[str],
                 allowed_commands: List[str],
                 network_access: bool = False,
                 max_runtime: int = 30,
                 max_memory_mb: int = 256):
        self.allowed_paths = allowed_paths
        self.allowed_commands = allowed_commands
        self.network_access = network_access
        self.max_runtime = max_runtime
        self.max_memory_mb = max_memory_mb
    
    async def execute(self, command: str) -> SandboxResult:
        """Execute a command within sandbox constraints."""
        self.validate_command(command)
        
        # Create restricted subprocess
        proc = await asyncio.create_subprocess_shell(
            command,
            cwd=self.temp_dir,
            env=self.restricted_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), 
                timeout=self.max_runtime
            )
            return SandboxResult(
                exit_code=proc.returncode,
                stdout=stdout.decode(),
                stderr=stderr.decode()
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise SandboxTimeoutError()
```

---

## 41. Permissions System

### 41.1 Permission Levels

| Level | Description | Example Actions |
|---|---|---|
| READ | View data, no modifications | Read files, view system info |
| WRITE | Create or modify data | Write files, save settings |
| EXECUTE | Run commands or scripts | Terminal commands, code execution |
| AUTOMATE | Control desktop/browser | Mouse/keyboard, browser actions |
| SYSTEM | Modify system configuration | Install software, change settings |
| ADMIN | Full system access | All operations |

### 41.2 Default Agent Permissions

| Agent | Permissions | Auto-Approve |
|---|---|---|
| Brain | READ, WRITE | Yes |
| Memory | READ, WRITE | Yes |
| Voice | READ | Yes |
| Coding | READ, WRITE, EXECUTE | Execute needs approval |
| Terminal | EXECUTE | Always needs approval |
| Web | READ, AUTOMATE | Automate needs approval |
| File | READ, WRITE | Write needs approval for system dirs |
| System Monitor | READ | Yes |
| Security | READ, ADMIN | Admin needs approval |

---

## 42. Offline Mode

### 42.1 Offline Capabilities

| Feature | Offline Support | Requirements |
|---|---|---|
| Chat | Full (with local model) | Local LLM downloaded |
| Code assistance | Full | Local code model |
| Voice input | Full | Local Whisper model |
| Voice output | Full | Local Piper/XTTS model |
| Memory | Full | SQLite + ChromaDB local |
| File operations | Full | Local filesystem |
| Terminal | Full | Local terminal |
| Browser automation | Partial (local pages only) | Playwright |
| Web search | Unavailable | — |
| Cloud models | Unavailable | — |

### 42.2 Offline Detection

```python
async def check_connectivity():
    """Check internet connectivity."""
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
            async with session.head("https://dns.google") as resp:
                return resp.status == 200
    except:
        return False

# Periodic check (every 30 seconds)
# Update system state, enable/disable cloud features
```

---

## 43. Cloud Fallback Mode

### 43.1 Fallback Logic

```python
async def inference(prompt: str, task_type: TaskType) -> str:
    """Inference with automatic cloud fallback."""
    
    # 1. Try local model
    local_model = model_router.select_local(task_type)
    if local_model and local_model.is_loaded():
        try:
            return await local_model.generate(prompt)
        except ModelOverloadedError:
            pass
    
    # 2. Try loading local model
    if local_model and not local_model.is_loaded():
        try:
            await model_manager.load(local_model)
            return await local_model.generate(prompt)
        except InsufficientMemoryError:
            pass
    
    # 3. Cloud fallback (if online and user allows)
    if await check_connectivity() and settings.allow_cloud_fallback:
        cloud_model = model_router.select_cloud(task_type)
        return await cloud_model.generate(prompt)
    
    # 4. Degrade gracefully
    raise NoModelAvailableError(
        "No model available. Please download a local model or enable cloud access."
    )
```

---

## 44. Hybrid Inference Mode

### 44.1 Strategy

Hybrid inference uses local models for simple tasks and cloud models for complex ones:

| Complexity | Assessment Criteria | Target |
|---|---|---|
| Simple | Short query, no context, no tools | Local 3B model |
| Medium | Moderate context, basic tools | Local 7B model |
| Complex | Long context, multi-step reasoning | Cloud or local 13B+ |
| Multimodal | Vision + language | Cloud vision model |

### 44.2 Complexity Assessment

```python
def assess_complexity(query: str, context: dict) -> ComplexityLevel:
    """Assess query complexity to route to appropriate model."""
    
    score = 0
    
    # Token count
    tokens = estimate_tokens(query)
    if tokens > 500: score += 2
    elif tokens > 200: score += 1
    
    # Context size
    if context.get("files"): score += 1
    if context.get("conversation_length", 0) > 10: score += 1
    
    # Task type
    if "code" in query.lower() or "write" in query.lower(): score += 1
    if "analyze" in query.lower() or "compare" in query.lower(): score += 2
    if "plan" in query.lower() or "design" in query.lower(): score += 2
    
    # Tool requirements
    if requires_tools(query): score += 1
    
    if score <= 2: return ComplexityLevel.SIMPLE
    elif score <= 4: return ComplexityLevel.MEDIUM
    else: return ComplexityLevel.COMPLEX
```

---

## 45. Fine-Tuning Possibilities

### 45.1 Fine-Tuning Opportunities

| Target | Method | Purpose |
|---|---|---|
| Personality model | LoRA on 3B model | Consistent JARVIS personality |
| Intent classifier | Fine-tune small classifier | Accurate intent routing |
| Tool use model | LoRA on 7B model | Better tool selection |
| User adaptation | LoRA on base model | Learn user preferences |

### 45.2 Implementation (Future)

- Use unsloth or PEFT for efficient LoRA fine-tuning
- Training data from user interactions (opt-in only)
- Small adapter sizes (4-16MB) for quick switching
- Local-only training, no data leaves the machine

---

## 46. Future Scalability

### 46.1 Scalability Dimensions

| Dimension | Current | Future |
|---|---|---|
| Models | 1 loaded at a time | Multi-model serving |
| Agents | 20 agents | Plugin-based unlimited |
| Memory | SQLite + ChromaDB | Distributed vector DB |
| Users | Single user | Multi-user with profiles |
| Platforms | Windows | Windows + Linux + macOS |
| Deployment | Local only | Local + cloud hybrid |
| Mobile | None | React Native / PWA |

### 46.2 Architecture Decisions for Scalability

- All inter-component communication via message bus (can be replaced with network bus)
- Database access through repository pattern (can swap SQLite for PostgreSQL)
- Model inference through provider interface (can add any new provider)
- Frontend through WebSocket (can serve to remote clients)

---

## 47. Deployment Architecture

### 47.1 Build Pipeline

```
Source Code
     │
     ├── Frontend Build (Vite)
     │   └── Optimized JS/CSS/Assets → dist/
     │
     ├── Tauri Build (Cargo)
     │   └── Native binary + WebView → target/release/
     │
     ├── Backend Package (PyInstaller / embedded Python)
     │   └── Python runtime + dependencies → backend/
     │
     └── Installer Build (NSIS / WiX)
         └── .exe installer with all components
```

### 47.2 Distribution

| Channel | Format | Size Target |
|---|---|---|
| Main installer | .exe (NSIS) | ~100-150MB (without models) |
| Portable | .zip | ~100-150MB |
| Auto-update | Delta patches | ~5-20MB per update |
| Models | Separate downloads | 500MB-8GB each |

---

## 48. Windows Optimization

### 48.1 Windows-Specific Optimizations

| Area | Optimization |
|---|---|
| Startup | Background service pre-loading |
| Memory | Use Windows memory-mapped files for models |
| GPU | DirectML fallback for non-NVIDIA GPUs |
| UI | WinUI WebView2 (via Tauri) for best performance |
| System tray | Native Windows notification area |
| Hotkeys | Win32 RegisterHotKey API |
| Overlay | WS_EX_LAYERED + WS_EX_TRANSPARENT windows |
| Audio | WASAPI for low-latency audio |
| Process | Windows Job Objects for sandbox isolation |

### 48.2 Windows Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Windows 10 1903+ | Windows 11 |
| RAM | 8GB | 16GB |
| Storage | 5GB + models | SSD, 50GB+ |
| GPU | None (CPU mode) | NVIDIA 4GB+ VRAM |
| CPU | 4 cores | 8+ cores |
| WebView2 | Required | Auto-installed |

---

## 49. Linux Compatibility

### 49.1 Linux Adaptations

| Component | Windows | Linux |
|---|---|---|
| Desktop shell | Tauri (WebView2) | Tauri (WebKitGTK) |
| System tray | Win32 API | libappindicator |
| Hotkeys | RegisterHotKey | X11/Wayland keybinding |
| Overlay | Layered windows | X11 composite + EWMH |
| Audio | WASAPI | PulseAudio / PipeWire |
| Process control | Win32 API | POSIX signals |
| Desktop automation | Win32 + PyAutoGUI | xdotool + PyAutoGUI |
| File paths | C:\ | /home/ |

### 49.2 Priority

Linux is a **Phase 3** target. Architecture decisions should not block Linux compatibility, but Windows is the primary development platform.

---

## 50. Performance Benchmarks

### 50.1 Target Benchmarks

| Metric | Target | Measurement |
|---|---|---|
| Cold start time | < 3 seconds | App launch to usable UI |
| Hot start time | < 1 second | Resume from tray |
| First LLM response | < 2 seconds | Text input to first token |
| Voice response latency | < 1.5 seconds | Speech end to first audio |
| UI frame rate | 60fps | Three.js render loop |
| Idle RAM usage | < 300MB | No model loaded |
| Active RAM usage | < 2GB | With 3B model loaded |
| Idle CPU usage | < 2% | Background with wake word |
| WebSocket latency | < 10ms | Message round-trip |
| Memory recall | < 50ms | Vector similarity search |

### 50.2 Benchmark Methodology

- Automated performance tests in CI/CD
- Profile with Chrome DevTools (frontend) and py-spy (backend)
- GPU monitoring with `nvidia-smi`
- Memory profiling with `tracemalloc` (Python) and Chrome Memory panel (frontend)
- Continuous monitoring in production via System Monitor Agent

---

## 51. Open-Source Integration Strategy

### 51.1 Architecture Inspirations

| Project | What to Borrow | What to Improve |
|---|---|---|
| **Open Interpreter** | Tool use patterns, code execution flow | Add multi-agent, better UI |
| **OpenHands** | Autonomous coding workflows | Local-first, not cloud-dependent |
| **CrewAI** | Agent role definitions, crew patterns | Lighter weight, async-first |
| **AutoGen** | Multi-agent conversation patterns | Simpler API, better performance |
| **LangGraph** | Stateful agent graphs, cycles | Less overhead, direct Python |
| **LangChain** | Tool abstractions, chain patterns | Avoid over-abstraction |
| **LocalAI** | Local model serving, API compatibility | Deeper integration, not separate service |
| **Jan** | Desktop AI app patterns, model management | Better UI, multi-agent |
| **OpenWebUI** | Chat UI patterns, model switching | Desktop-native, not browser-only |
| **AnythingLLM** | Document processing, RAG pipeline | Better agent system |
| **bolt.diy** | Browser-based coding agent | Desktop-native, local models |
| **browser-use** | Browser automation with AI | Integrated as agent, not standalone |

### 51.2 Integration Principles

1. **Study, don't clone** — Understand architectural decisions, don't copy code
2. **Adapt to local-first** — Every cloud-dependent pattern must have a local equivalent
3. **Merge strengths** — Combine the best ideas from multiple projects
4. **Eliminate redundancy** — One cohesive system, not a patchwork
5. **Optimize for desktop** — Everything must work in a desktop app context

---

## 52. Ethical Safeguards

### 52.1 Principles

1. **User sovereignty** — The user owns their data. No telemetry, no cloud sync without explicit consent.
2. **Transparency** — The AI explains its reasoning when asked. No hidden actions.
3. **Consent** — Destructive or irreversible actions always require explicit approval.
4. **No deception** — The AI identifies itself as AI. No pretending to be human.
5. **Harm prevention** — Refuse to assist with clearly harmful actions.

### 52.2 Implementation

| Safeguard | Implementation |
|---|---|
| Data privacy | All data local by default, encrypted at rest |
| Action transparency | Audit log for all autonomous actions |
| Content filtering | Refuse clearly harmful requests |
| Rate limiting | Prevent autonomous action loops |
| Kill switch | Global hotkey to immediately stop all AI activity |
| Human-in-the-loop | Configurable approval thresholds |

---

## 53. AI Alignment Safeguards

### 53.1 Behavioral Boundaries

```python
HARD_LIMITS = [
    "Never execute commands that could damage the operating system",
    "Never access or transmit data without user knowledge",
    "Never impersonate the user in external communications",
    "Never bypass security controls or approval workflows",
    "Always explain what actions will be taken before executing",
    "Stop immediately when the user says 'stop' or 'cancel'",
    "Never exceed the granted permission level",
]

SOFT_LIMITS = [
    "Prefer reversible actions over irreversible ones",
    "Ask for clarification when intent is ambiguous",
    "Suggest alternatives when a request seems risky",
    "Log all autonomous decisions for review",
]
```

### 53.2 Autonomous Action Limits

| Scope | Max Actions | Requires Approval |
|---|---|---|
| File creation | 10 per task | After 5 |
| File modification | 5 per task | After 3 |
| File deletion | 0 without approval | Always |
| Terminal commands | 20 per task | Each HIGH+ risk command |
| Browser navigations | 30 per task | After 20 |
| Desktop automation | 50 actions per task | Each HIGH+ risk |

---

## 54. Prompt Routing Systems

### 54.1 Intent Classification

```python
INTENT_CATEGORIES = {
    "chat": "General conversation, questions, explanations",
    "code": "Code generation, debugging, review, refactoring",
    "research": "Web search, information gathering, analysis",
    "automate": "Desktop/browser automation, workflow execution",
    "file": "File operations, organization, search",
    "system": "System information, settings, configuration",
    "memory": "Save/recall information, context management",
    "schedule": "Reminders, scheduled tasks, calendar",
    "creative": "Writing, brainstorming, content creation",
    "vision": "Screenshot analysis, visual understanding",
    "voice_control": "Voice commands, dictation",
    "meta": "Questions about JARVIS itself, help, settings",
}
```

### 54.2 Routing Pipeline

```
User Input
     │
     ▼
┌──────────────┐
│ Fast Intent  │ ← Local classifier (MiniLM or rule-based)
│ Classification│ ← < 10ms latency
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Agent        │ ← Map intent to agent(s)
│ Selection    │ ← Consider agent availability
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Model        │ ← Select optimal model for task
│ Selection    │ ← Consider hardware, complexity
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Context      │ ← Gather relevant context
│ Assembly     │ ← Memory recall, file context
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Prompt       │ ← Build final prompt
│ Construction │ ← System prompt + context + tools + user input
└──────────────┘
```

---

## 55. Context Management

### 55.1 Context Window Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                     CONTEXT WINDOW (4K-32K tokens)               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [System Prompt]           ~500 tokens    (always present)       │
│  [Personality]             ~200 tokens    (always present)       │
│  [Active Tools]            ~300 tokens    (if tools needed)      │
│  [Retrieved Memory]        ~500 tokens    (relevant memories)    │
│  [File Context]            ~1000 tokens   (if file-related)      │
│  [Conversation History]    ~1500 tokens   (recent messages)      │
│  [Current User Message]    variable       (user input)           │
│                                                                  │
│  Total budget: adaptive based on model context length            │
│  Priority: User message > System > Memory > History > Files      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 55.2 Context Compression

- Older conversation turns are summarized (by LLM) to save tokens
- Only top-k relevant memories included
- File context trimmed to relevant sections
- Tool definitions filtered to likely-needed tools only
- System prompt cached and reused across requests

---

## 56. Streaming Voice Pipeline

### 56.1 End-to-End Streaming

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Mic      │───►│ VAD      │───►│ STT      │───►│ LLM      │───►│ TTS      │───► Speaker
│ (16kHz)  │    │ (Silero) │    │ (Whisper) │    │ (Stream) │    │ (Piper)  │
│          │    │          │    │ Streaming │    │          │    │ Streaming│
│ Chunks:  │    │ Speech/  │    │ Partial   │    │ Token by │    │ Sentence │
│ 30ms     │    │ Silence  │    │ results   │    │ token    │    │ by sent  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘

Total target latency: < 1.5 seconds (end of speech to first audio output)
```

### 56.2 Streaming Optimizations

| Optimization | Implementation |
|---|---|
| VAD chunking | Process 30ms audio chunks for VAD |
| Streaming STT | Feed audio to Whisper in chunks, get partial results |
| Sentence-level TTS | Start TTS as soon as first sentence is complete |
| Audio buffering | Pre-buffer TTS output for smooth playback |
| Interrupt detection | Monitor mic during TTS playback |

---

## 57. Realtime Interaction Systems

### 57.1 Interaction Modes

| Mode | Trigger | Behavior |
|---|---|---|
| **Chat** | Text input | Standard text conversation |
| **Voice** | Wake word / push-to-talk | Voice conversation |
| **Vision** | Screenshot hotkey / "look at my screen" | Visual analysis |
| **Autonomous** | Complex task request | Multi-step execution |
| **Overlay** | Hotkey / system event | Floating HUD response |
| **Background** | Scheduled / triggered | Silent background work |

### 57.2 Realtime UI Updates

All UI elements update in realtime via the event bus:

```typescript
// Frontend event subscription (React hook)
function useAgentStatus(agentId: string): AgentStatus {
    const [status, setStatus] = useState<AgentStatus>("idle");
    
    useEffect(() => {
        const unsubscribe = eventBus.on(`agent.${agentId}.status`, (event) => {
            setStatus(event.data.status);
        });
        return unsubscribe;
    }, [agentId]);
    
    return status;
}

// 3D scene reacts to agent activity
function AICore() {
    const agentActivity = useAgentActivity();
    const micLevel = useMicrophoneLevel();
    
    return (
        <mesh>
            <aiCoreMaterial
                activity={agentActivity}
                audioLevel={micLevel}
                time={useFrame().clock.elapsedTime}
            />
        </mesh>
    );
}
```

---

## 58. Model Switching Logic

### 58.1 Switch Triggers

| Trigger | Action |
|---|---|
| Task type change | Load appropriate specialist model |
| VRAM pressure | Downgrade to smaller quantization |
| User preference | Switch to user-selected model |
| Model failure | Fall back to alternative |
| Performance degradation | Switch to faster model |
| Context length exceeded | Switch to longer-context model |

### 58.2 Switch Process

```python
async def switch_model(target_model: ModelSpec):
    """Hot-swap the active model."""
    
    # 1. Check if target model is already loaded
    if model_manager.is_loaded(target_model):
        model_manager.set_active(target_model)
        return
    
    # 2. Check if we have enough memory
    required_memory = target_model.estimated_memory
    available = model_manager.available_memory()
    
    if required_memory > available:
        # Unload current model first
        await model_manager.unload_current()
        await asyncio.sleep(0.5)  # Allow GC
    
    # 3. Load new model
    await model_manager.load(target_model)
    
    # 4. Verify loaded correctly
    test_result = await model_manager.health_check(target_model)
    if not test_result.ok:
        raise ModelLoadError(f"Model {target_model.name} failed health check")
    
    # 5. Emit event
    await event_bus.emit(Event("model.switched", data={
        "model": target_model.name,
        "memory_used": target_model.actual_memory
    }))
```

---

## 59. Dependency Explanation

### 59.1 Frontend Dependencies

| Package | Purpose | Size | Required |
|---|---|---|---|
| react, react-dom | UI framework | ~45KB | Yes |
| typescript | Type safety | Dev only | Yes |
| three | 3D rendering engine | ~150KB | Yes |
| @react-three/fiber | React Three.js binding | ~30KB | Yes |
| @react-three/drei | R3F utilities | ~50KB | Yes |
| @react-three/postprocessing | Visual effects | ~20KB | Yes |
| gsap | Animation engine | ~30KB | Yes |
| gsap/ScrollTrigger | Scroll-driven animation | ~10KB | Yes |
| framer-motion | React animations | ~30KB | Yes |
| tailwindcss | Utility CSS | Dev only | Yes |
| zustand | State management | ~3KB | Yes |
| vite | Build tool | Dev only | Yes |
| @tauri-apps/api | Tauri frontend API | ~15KB | Yes (desktop) |

### 59.2 Backend Dependencies

| Package | Purpose | Required |
|---|---|---|
| fastapi | API framework | Yes |
| uvicorn | ASGI server | Yes |
| websockets | WebSocket support | Yes |
| pydantic | Data validation | Yes |
| aiohttp | Async HTTP client | Yes |
| aiosqlite | Async SQLite | Yes |
| chromadb | Vector database | Yes |
| sentence-transformers | Embeddings | Yes |
| faster-whisper | Speech-to-text | Yes (voice) |
| piper-tts | Text-to-speech | Yes (voice) |
| silero-vad | Voice activity detection | Yes (voice) |
| pyautogui | Desktop automation | Yes (automation) |
| playwright | Browser automation | Yes (web agent) |
| mss | Screenshot capture | Yes (vision) |
| psutil | System monitoring | Yes |
| Pillow | Image processing | Yes |
| numpy | Numerical computation | Yes |
| llama-cpp-python | Local LLM inference | Recommended |
| httpx | Modern HTTP client | Yes |
| structlog | Structured logging | Yes |

### 59.3 Desktop Dependencies

| Package | Purpose | Required |
|---|---|---|
| @tauri-apps/cli | Build tooling | Yes |
| Rust toolchain | Tauri compilation | Yes |

---

## 60. Future Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project scaffolding and build system
- [ ] Basic Tauri + React + Three.js shell
- [ ] Backend FastAPI with WebSocket
- [ ] Basic chat with Ollama integration
- [ ] Simple 3D boot scene
- [ ] System tray + global hotkey

### Phase 2: Intelligence (Weeks 5-8)
- [ ] Multi-agent framework (Brain, Memory, Coding, Terminal)
- [ ] Model router with local + cloud fallback
- [ ] Memory system (SQLite + ChromaDB)
- [ ] Voice pipeline (Whisper + Piper)
- [ ] Cinematic 3D command center
- [ ] Scrollytelling experience

### Phase 3: Autonomy (Weeks 9-12)
- [ ] Autonomous task execution
- [ ] Browser automation (Playwright)
- [ ] Desktop automation (PyAutoGUI)
- [ ] Vision system (screenshots, OCR)
- [ ] Advanced 3D scenes (consciousness, memory palace)
- [ ] Overlay HUD system

### Phase 4: Polish (Weeks 13-16)
- [ ] Plugin system
- [ ] Advanced audio/immersion
- [ ] Performance optimization pass
- [ ] Installer and auto-update
- [ ] Linux compatibility
- [ ] Documentation and testing

### Phase 5: Scale (Weeks 17+)
- [ ] Mobile integration
- [ ] Fine-tuning pipeline
- [ ] Advanced autonomous workflows
- [ ] Community plugin ecosystem
- [ ] Multi-user support
- [ ] Cloud deployment option

---

*This document serves as the single source of truth for the JARVIS AI Operating System architecture. All implementation decisions should reference this plan.*

*Last Updated: 2026-05-19*
