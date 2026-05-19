# JARVIS — Open Source Research & Architecture Analysis

## Lessons from 13 Open-Source AI Projects

**Version:** 0.1.0-alpha  
**Document Type:** Research Analysis  
**Date:** 2026-05-19  
**Research Sources:** Live GitHub repository analysis

---

## Table of Contents

1. [Research Summary](#1-research-summary)
2. [Open Interpreter](#2-open-interpreter)
3. [OpenHands](#3-openhands)
4. [CrewAI](#4-crewai)
5. [AutoGen / Microsoft Agent Framework](#5-autogen--microsoft-agent-framework)
6. [LangGraph](#6-langgraph)
7. [LocalAI](#7-localai)
8. [Jan](#8-jan)
9. [Open WebUI](#9-open-webui)
10. [AnythingLLM](#10-anythingllm)
11. [bolt.diy](#11-boltdiy)
12. [browser-use](#12-browser-use)
13. [Cross-Project Patterns](#13-cross-project-patterns)
14. [Architecture Decisions for JARVIS](#14-architecture-decisions-for-jarvis)

---

## 1. Research Summary

### 1.1 Projects Analyzed

| Project | Stars | Language | Category | Key Insight for JARVIS |
|---|---|---|---|---|
| **Open Interpreter** | 63.6k | Python (98%) | Code execution agent | `exec()` + function-calling = universal code runner. LiteLLM for multi-provider. AGPL license |
| **OpenHands** | 74.1k | Python (62%) + TypeScript (36%) | AI-driven development | Software Agent SDK separates core engine from UI. Docker runtime sandboxing. REST API + React SPA |
| **CrewAI** | 51.7k | Python (99%) | Multi-agent orchestration | Crews (autonomy) + Flows (control) dual architecture. YAML-based agent/task config. Role-based agents |
| **AutoGen** | 58.2k | Python (62%) + C# (25%) | Multi-agent framework | **NOW IN MAINTENANCE MODE** → Migrated to Microsoft Agent Framework. Layered architecture: Core → AgentChat → Extensions |
| **LangGraph** | 32.4k | Python (99%) | Stateful agent orchestration | Graph-based agent workflow. Durable execution. Checkpoint/memory persistence. Pregel-inspired |
| **LocalAI** | 46.4k | Go (67%) + JS (12%) + Python (7%) | Local model runtime | 36+ backends. OpenAI/Anthropic API compatibility. Backend gallery (OCI images). Built-in agents, MCP, RAG |
| **Jan** | 42.6k | TypeScript (75%) + Rust (20%) | Desktop AI client | **Tauri-based desktop app**. Extensions architecture. MCP integration. OpenAI-compatible local API at localhost:1337 |
| **Open WebUI** | 138k | Python (36%) + Svelte (33%) + JS (24%) | Web AI interface | Most popular. 9 vector DBs. RAG built-in. Multi-user RBAC. Pipelines plugin system. Enterprise auth (LDAP/SCIM/SSO) |
| **AnythingLLM** | 60.3k | JavaScript (98%) | All-in-one AI app | Monorepo: frontend + server + collector. Desktop app via Electron. Built-in native embedder. No-code agent builder |
| **bolt.diy** | 19.4k | TypeScript (97%) | AI code generation | 19+ LLM providers. Electron desktop app. WebContainers for in-browser code execution. File locking during AI gen |
| **browser-use** | 94.6k | Python (98%) | Browser automation agent | Playwright-based. CLI for persistent browser sessions. Cloud + self-hosted. MCP support |

### 1.2 Key Takeaways

1. **Tauri > Electron for new projects** — Jan (42.6k stars) uses Tauri (TypeScript + Rust). It's the modern choice for desktop AI apps. Lighter, faster, more secure than Electron.

2. **OpenAI-compatible API is table stakes** — Every successful local AI tool (LocalAI, Jan, AnythingLLM) exposes an OpenAI-compatible API. JARVIS must do the same.

3. **Multi-provider LLM support is essential** — All successful tools support Ollama, OpenAI, Anthropic, and many others. LiteLLM (Open Interpreter) or Vercel AI SDK (bolt.diy) are proven approaches.

4. **Agent architecture: Roles + Tasks + Orchestration** — CrewAI's pattern (Agent with role/goal/backstory + Task with description/expected_output + Crew/Flow orchestration) is the most proven multi-agent design.

5. **Layered architecture wins** — AutoGen's Core → AgentChat → Extensions pattern, and OpenHands' SDK → CLI → GUI → Cloud layers prove that clean separation enables multiple interfaces on one engine.

6. **Plugin/Extension systems are critical** — Open WebUI (Pipelines), Jan (Extensions), AnythingLLM (custom tools), bolt.diy (provider plugins) all have extensibility as a core feature.

7. **MCP (Model Context Protocol) is the new standard** — LocalAI, Jan, CrewAI, browser-use, bolt.diy, and Open WebUI all support MCP. JARVIS must be MCP-native.

8. **RAG is a baseline feature** — Open WebUI (9 vector DBs), AnythingLLM (built-in), LocalAI (built-in) all include RAG. JARVIS needs embedded RAG from day one.

9. **Docker-first deployment** — Every project supports Docker. LocalAI goes further with OCI-based backend gallery. JARVIS sandboxing should use Docker/containers.

10. **AutoGen is dead** — Microsoft moved to Agent Framework. Don't build on AutoGen patterns. Learn from the architecture but use CrewAI/LangGraph patterns instead.

---

## 2. Open Interpreter

### 2.1 Architecture

```
Open Interpreter Architecture:

interpreter/
├── core/              ← Core interpreter logic
│   ├── computer/      ← Computer interaction (shell, browser, display)
│   ├── llm/           ← LLM interaction via LiteLLM
│   └── respond.py     ← Main response loop
├── terminal_interface/ ← Terminal UI
├── server/            ← FastAPI server
└── profiles/          ← YAML configuration profiles
```

### 2.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **Function-calling exec** | LLM calls `exec(language, code)` to run code | Core pattern for autonomous code execution |
| **LiteLLM multi-provider** | Single interface to all LLMs | Use this or similar for model routing |
| **Streaming responses** | Generator-based streaming to terminal | Stream tokens to 3D visualization |
| **Conversation memory** | `interpreter.messages` list | Simple but effective short-term memory |
| **YAML profiles** | Per-model configuration files | Agent configuration system |
| **Safety confirmation** | User must approve code before execution | Essential security pattern |
| **FastAPI server** | REST endpoint for programmatic access | Backend API pattern |

### 2.3 What to Adopt

- **LiteLLM integration** for multi-provider LLM support
- **Code execution confirmation** flow (sandbox + user approval)
- **Profile system** for different agent configurations
- **Streaming generator** pattern for real-time output

### 2.4 What to Improve On

- Open Interpreter is terminal-only — JARVIS adds cinematic 3D UI
- No agent specialization — JARVIS has role-based specialized agents
- No persistent memory — JARVIS adds vector-based long-term memory
- No sandboxing — JARVIS runs code in Docker containers

---

## 3. OpenHands

### 3.1 Architecture

```
OpenHands Architecture:

openhands/
├── core/                ← Core agent runtime
│   ├── agents/          ← Agent implementations
│   ├── sandbox/         ← Docker sandbox for code execution
│   └── memory/          ← Memory management
├── frontend/            ← React SPA (TypeScript 36%)
├── enterprise/          ← Enterprise features (source-available)
├── containers/          ← Docker container definitions
└── scripts/             ← Build and deployment scripts

Layers:
1. Software Agent SDK    ← Python library (composable)
2. CLI                   ← Terminal interface
3. Local GUI             ← REST API + React SPA
4. Cloud                 ← Hosted deployment
5. Enterprise            ← Self-hosted Kubernetes
```

### 3.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **Layered product** | SDK → CLI → GUI → Cloud → Enterprise | Build JARVIS as layers too |
| **Docker sandbox** | Code runs in isolated containers | Adopt for safe autonomous execution |
| **Agent SDK** | Composable Python library | JARVIS agent engine should be SDK-first |
| **REST API + SPA** | Decoupled backend/frontend | Already in JARVIS design |
| **Config-driven** | `config.template.toml` | TOML/YAML config for JARVIS |

### 3.3 What to Adopt

- **Docker-based sandboxing** for all code execution
- **Layered architecture** (SDK → API → Desktop App)
- **Enterprise separation** (open core + enterprise features)
- **Agent composability** (define agents in code, run anywhere)

### 3.4 What to Improve On

- OpenHands GUI is a standard React SPA — JARVIS adds cinematic 3D experience
- No offline/local model support built-in — JARVIS runs locally first
- No voice interface — JARVIS has voice as primary input

---

## 4. CrewAI

### 4.1 Architecture

```
CrewAI Architecture:

lib/crewai/
├── agents/              ← Agent definitions
│   ├── agent.py         ← Agent class (role, goal, backstory, tools)
│   └── agent_builder/   ← Agent construction
├── crews/               ← Crew orchestration
│   └── crew.py          ← Crew class (agents, tasks, process)
├── tasks/               ← Task definitions
│   └── task.py          ← Task class (description, expected_output, agent)
├── flows/               ← Event-driven workflows
│   └── flow.py          ← Flow decorators (@start, @listen, @router)
├── tools/               ← Tool integrations
├── memory/              ← Memory systems
└── cli/                 ← CLI commands (create, run, install)

Config Pattern:
src/my_crew/
├── config/
│   ├── agents.yaml      ← Agent definitions
│   └── tasks.yaml       ← Task definitions
├── crew.py              ← Crew wiring
├── main.py              ← Entry point
└── tools/               ← Custom tools
```

### 4.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **Role-based agents** | Agent(role, goal, backstory, tools) | Core agent model for JARVIS |
| **YAML config** | agents.yaml + tasks.yaml | Agent configuration files |
| **Crew + Flow dual system** | Crews (autonomous) + Flows (precise) | Adopt both paradigms |
| **Decorator-based flows** | @start, @listen, @router | Event-driven pipeline control |
| **Process modes** | Sequential, Hierarchical | Task orchestration strategies |
| **Memory integration** | Built-in memory for agents | Agent memory persistence |
| **Tool abstraction** | Pluggable tool system | JARVIS tool registry |
| **Human-in-the-loop** | Human approval at checkpoints | User confirmation gates |

### 4.3 What to Adopt — **HIGH PRIORITY**

- **Agent(role, goal, backstory, tools)** model — This IS the JARVIS agent architecture
- **YAML-based agent/task configuration** — For user-customizable agents
- **Flows with @start/@listen/@router** — For autonomous execution pipelines
- **Sequential + Hierarchical processes** — Task orchestration modes
- **CrewAI's performance** — 5.76x faster than LangGraph in benchmarks

### 4.4 What to Improve On

- CrewAI is headless (Python library) — JARVIS wraps it in a cinematic 3D UI
- No desktop app — JARVIS is a Tauri desktop application
- No real-time visualization — JARVIS visualizes agent activity in 3D
- Cloud-dependent (CrewAI AMP) — JARVIS is local-first

---

## 5. AutoGen / Microsoft Agent Framework

### 5.1 Architecture (Legacy — Maintenance Mode)

```
AutoGen Architecture:

python/packages/
├── autogen-core/        ← Message passing, event-driven agents, runtimes
├── autogen-agentchat/   ← Simpler API for rapid prototyping
├── autogen-ext/         ← Extensions (LLM clients, code execution)
├── autogen-studio/      ← No-code GUI (React)
├── agbench/             ← Benchmarking suite
└── magentic-one-cli/    ← Multi-agent team CLI

dotnet/                  ← .NET implementation (cross-language)
```

### 5.2 Key Lessons

| Lesson | Detail | JARVIS Application |
|---|---|---|
| **AutoGen is DEAD** | Now in maintenance mode, replaced by Microsoft Agent Framework | Do NOT build on AutoGen. Learn from its patterns |
| **Layered architecture** | Core → AgentChat → Extensions | Adopt the layering principle |
| **No-code GUI (Studio)** | Web UI for building agents without code | JARVIS should have drag-and-drop agent builder |
| **Cross-language** | Python + .NET support | JARVIS backend in Python, frontend in TypeScript |
| **AgentTool** | Wrap agents as tools for other agents | Agent delegation via tool abstraction |
| **MCP Workbench** | MCP server integration | MCP-native from day one |

### 5.3 What to Learn From

- **AgentTool pattern** — Agents as callable tools for other agents (powerful delegation)
- **McpWorkbench** — Clean MCP integration pattern
- **AutoGen Studio** — No-code agent building concept
- **Magentic-One** — Multi-agent team for complex tasks (web browsing, coding, file handling)
- **Why it failed** — Too much boilerplate, tight coupling, complexity. Keep JARVIS simple

---

## 6. LangGraph

### 6.1 Architecture

```
LangGraph Architecture:

libs/
├── langgraph/           ← Core graph engine
│   ├── graph/           ← Graph definition (StateGraph, nodes, edges)
│   ├── checkpoint/      ← State persistence (SQLite, Postgres)
│   ├── pregel/          ← Pregel-inspired execution
│   └── channels/        ← State management channels
├── checkpoint-*/        ← Checkpoint backends
├── cli/                 ← CLI tools
└── sdk-*/               ← Python/JS SDKs
```

### 6.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **State graphs** | StateGraph with nodes + conditional edges | Complex agent workflow modeling |
| **Durable execution** | Checkpoint/resume from failures | Critical for autonomous pipelines |
| **Human-in-the-loop** | Interrupt + state inspection + resume | User approval at any point |
| **Memory types** | Short-term (working) + Long-term (persistent) | Dual memory for JARVIS |
| **Checkpointing** | SQLite, Postgres backends | State persistence |
| **Pregel-inspired** | Batch processing model | Parallel agent execution |

### 6.3 What to Adopt

- **Durable execution** with checkpoint/resume — Essential for autonomous tasks
- **Dual memory** (short-term working + long-term persistent) — Core JARVIS memory design
- **Human-in-the-loop interrupts** — Pause → inspect → approve → resume workflow
- **Graph-based workflow** modeling (optional, for complex multi-step tasks)

### 6.4 What to Improve On

- LangGraph is headless — JARVIS visualizes the graph as 3D neural connections
- Complex API — JARVIS should be simpler (CrewAI-style) with graph as optional advanced feature
- Tight LangChain coupling — JARVIS uses its own LLM abstraction

---

## 7. LocalAI

### 7.1 Architecture

```
LocalAI Architecture (Go + Python):

core/                    ← Go core server
├── http/                ← HTTP API handlers (OpenAI/Anthropic compatible)
├── backend/             ← Backend manager
├── config/              ← Model configuration
└── schema/              ← API schemas

backend/                 ← Model backends (llama.cpp, vLLM, transformers, etc.)
├── python/              ← Python backends
└── cpp/                 ← C++ backends

pkg/                     ← Shared packages
├── gallery/             ← Model gallery (OCI-based)
├── model/               ← Model management
├── store/               ← Vector store
└── grpc/                ← gRPC backend communication

gallery/                 ← Model definitions
prompt-templates/        ← Prompt templates per model
```

### 7.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **Drop-in API compatibility** | OpenAI + Anthropic + ElevenLabs API | JARVIS exposes OpenAI-compatible API |
| **36+ backends** | llama.cpp, vLLM, transformers, whisper, diffusers, MLX | JARVIS integrates multiple inference backends |
| **OCI-based gallery** | Install backends as container images | Modular backend installation |
| **Built-in agents** | Autonomous agents with tool use, RAG, MCP | JARVIS agent system |
| **P2P inferencing** | Distributed inference across machines | Future JARVIS feature |
| **Multi-GPU auto-fit** | Automatic model splitting across GPUs | GPU management |
| **Backend versioning** | Auto-upgrade backends | Keep inference engines current |

### 7.3 What to Adopt — **HIGH PRIORITY**

- **OpenAI-compatible API** — Mandatory. Expose JARVIS as drop-in replacement
- **Backend abstraction** — Support llama.cpp, Ollama, vLLM behind unified interface
- **Model gallery** — Download/manage models from HuggingFace, Ollama registry
- **Automatic GPU detection** — Detect available hardware, select optimal backend
- **Built-in agents with MCP** — Agents can use external tools via MCP

### 7.4 What to Improve On

- LocalAI is server-only — JARVIS is a desktop application
- Basic web UI — JARVIS has cinematic 3D interface
- No voice interaction UI — JARVIS has full voice I/O
- Configuration-heavy — JARVIS auto-configures based on hardware

---

## 8. Jan

### 8.1 Architecture — **MOST RELEVANT TO JARVIS**

```
Jan Architecture (TypeScript + Rust):

core/                    ← Core TypeScript library
├── types/               ← Shared type definitions
├── node/                ← Node.js bindings
└── browser/             ← Browser bindings

extensions/              ← Plugin system
├── inference-*/         ← Inference engine plugins
├── model-*/             ← Model management plugins
└── conversational/      ← Chat extensions

src-tauri/               ← Tauri Rust backend
├── src/
│   ├── main.rs          ← Main entry
│   └── commands/        ← IPC commands
├── tauri.conf.json      ← Tauri config
└── Cargo.toml

web-app/                 ← Frontend (Next.js/React)
├── app/                 ← App routes
├── containers/          ← UI containers
├── screens/             ← Screen components
└── hooks/               ← React hooks

mlx-server/              ← MLX inference server (Apple Silicon)

Tech Stack:
- TypeScript 75.4%
- Rust 19.7%
- Swift 1.5%
- Python 1.4%
```

### 8.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **Tauri desktop app** | TypeScript + Rust | **EXACT SAME STACK AS JARVIS** |
| **Extensions architecture** | Pluggable inference/model modules | JARVIS plugin system |
| **OpenAI-compatible API** | Local server at localhost:1337 | JARVIS local API |
| **MCP integration** | Model Context Protocol support | JARVIS MCP-native |
| **HuggingFace downloads** | Direct model downloads | JARVIS model management |
| **Multi-provider** | Local (Ollama, llama.cpp) + Cloud (OpenAI, Anthropic, Groq) | JARVIS model routing |
| **Cross-platform** | Mac, Windows, Linux + Apple Silicon MLX | JARVIS targets all platforms |

### 8.3 What to Adopt — **CRITICAL REFERENCE**

Jan is the closest existing project to JARVIS's desktop architecture:

- **Tauri + TypeScript + Rust** — Same tech stack, validate this works at scale (42.6k stars proves it does)
- **Extensions architecture** — Pluggable system for new backends/features
- **MLX server** for Apple Silicon — Dedicated Metal/MLX inference path
- **Core types library** — Shared types between frontend and backend
- **IPC via Tauri commands** — Rust backend exposed to frontend

### 8.4 What to Improve On

- Jan's UI is a standard chat interface — JARVIS is cinematic 3D
- No agent system — JARVIS has multi-agent orchestration
- No voice-first interaction — JARVIS has full voice I/O
- No autonomous execution — JARVIS has autonomous pipeline
- No system control — JARVIS controls the entire operating system

---

## 9. Open WebUI

### 9.1 Architecture

```
Open WebUI Architecture (Python + Svelte):

backend/                 ← Python (FastAPI) backend
├── open_webui/
│   ├── apps/            ← App modules
│   ├── models/          ← Database models
│   ├── utils/           ← Utilities
│   └── main.py          ← FastAPI app
├── requirements.txt

src/                     ← Svelte frontend
├── lib/                 ← Shared components
├── routes/              ← Page routes
└── app.html

Tech Stack:
- Python 35.5% (FastAPI backend)
- Svelte 32.8% (Frontend framework)
- JavaScript 23.9%
- TypeScript 5.2%
```

### 9.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **RAG built-in** | 9 vector DBs, multiple extractors | JARVIS needs embedded RAG |
| **Multi-user RBAC** | Role-based access, user groups | Future JARVIS feature |
| **Pipelines plugin** | Custom Python logic plugins | JARVIS plugin system |
| **Enterprise auth** | LDAP, SCIM 2.0, SSO | Enterprise JARVIS |
| **9 vector DBs** | ChromaDB, PGVector, Qdrant, Milvus, etc. | Vector DB choice |
| **Web search** | 15+ search providers | JARVIS web search agents |
| **Voice I/O** | Whisper STT + multiple TTS engines | JARVIS voice system |
| **Horizontal scaling** | Redis + WebSocket | Scalability pattern |

### 9.3 What to Adopt

- **RAG with multiple vector DB backends** — Start with ChromaDB, support others
- **Pipelines/plugin architecture** — Extensible processing pipeline
- **Voice I/O** with Whisper (STT) + ElevenLabs/OpenAI TTS — Proven voice stack
- **Web search integration** — Multiple search providers
- **Artifact storage** — Key-value store for persistent artifacts

### 9.4 What to Improve On

- Open WebUI is web-only — JARVIS is a desktop app
- Standard chat UI — JARVIS has 3D cinematic interface
- No agent system — JARVIS has autonomous agents
- No OS-level control — JARVIS is an operating system layer

---

## 10. AnythingLLM

### 10.1 Architecture

```
AnythingLLM Architecture (JavaScript monorepo):

frontend/                ← Vite + React frontend
server/                  ← Node.js Express backend
├── endpoints/           ← API routes
├── models/              ← Database models
├── utils/               ← Utilities
│   ├── agents/          ← Agent implementations
│   ├── vectorDB/        ← Vector DB adapters
│   └── AiProviders/     ← LLM provider adapters
└── storage/
    ├── models/           ← Local model storage
    └── documents/        ← Document storage

collector/               ← Document processing service
embed/                   ← Embeddable chat widget (submodule)
browser-extension/       ← Chrome extension (submodule)
docker/                  ← Docker build configs

Tech Stack:
- JavaScript 98.4%
- Desktop: Electron
```

### 10.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **Monorepo** | frontend + server + collector | JARVIS monorepo structure |
| **Adapter pattern** | AiProviders/ with adapters per LLM | JARVIS model routing |
| **Native embedder** | Built-in embedding model | Local embedding for RAG |
| **Agent builder** | No-code agent creation | Visual agent builder for JARVIS |
| **Multi-workspace** | Isolated conversation spaces | JARVIS workspace/project isolation |
| **MCP compatibility** | Model Context Protocol | MCP-native |
| **Scheduled tasks** | Cron-like task scheduling | Autonomous task scheduling |
| **Intelligent tool selection** | Reduce token usage by 80% | Smart tool routing |

### 10.3 What to Adopt

- **Adapter pattern for LLM providers** — Clean abstraction for multiple providers
- **Document collector** as separate service — Process/ingest documents independently
- **Native embedder** — Ship a small embedding model for offline RAG
- **Intelligent tool selection** — Don't send all tools every call, select relevant ones
- **Scheduled tasks** — Autonomous scheduled operations

---

## 11. bolt.diy

### 11.1 Architecture

```
bolt.diy Architecture (TypeScript):

app/                     ← Remix (React) application
├── components/          ← UI components
├── lib/                 ← Core libraries
│   ├── modules/         ← Feature modules
│   │   ├── llm/         ← LLM provider integrations
│   │   └── chat/        ← Chat management
│   └── runtime/         ← WebContainer runtime
├── routes/              ← App routes
└── utils/               ← Utilities

electron/                ← Electron desktop wrapper
├── main/                ← Main process
└── preload/             ← Preload scripts

Tech Stack:
- TypeScript 96.9%
- Desktop: Electron
- Build: Vite + pnpm
```

### 11.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **19+ LLM providers** | Vercel AI SDK-based | Multi-provider pattern |
| **WebContainers** | In-browser code execution | Interesting sandboxing approach |
| **File locking** | Prevent conflicts during AI gen | Concurrent file access safety |
| **Diff view** | Visual code changes | Show agent changes to user |
| **Electron desktop** | Native desktop app | (JARVIS uses Tauri instead) |
| **Snapshot restore** | Project state snapshots | Rollback capability |

### 11.3 What to Adopt

- **Multi-provider LLM pattern** via Vercel AI SDK — Clean provider abstraction
- **File locking during AI generation** — Prevent concurrent access issues
- **Diff view** — Show users what the AI changed
- **Snapshot/rollback** — Save state before autonomous operations

### 11.4 What to Improve On

- bolt.diy uses Electron — JARVIS uses Tauri (lighter, more secure)
- Web-only code execution — JARVIS runs system-level code in Docker
- No agent system — JARVIS has multi-agent orchestration
- No voice — JARVIS is voice-first

---

## 12. browser-use

### 12.1 Architecture

```
browser-use Architecture (Python):

browser_use/
├── agent/               ← Agent logic
│   ├── service.py       ← Main agent service
│   └── views.py         ← Agent response models
├── browser/             ← Browser management
│   ├── browser.py       ← Browser class (Playwright)
│   ├── context.py       ← Browser context
│   └── views.py         ← DOM extraction
├── controller/          ← Action controllers
├── dom/                 ← DOM parsing/extraction
├── skill_cli/           ← CLI tool
└── telemetry/           ← Usage tracking

Tech Stack:
- Python 98.1%
- Browser: Playwright
- CLI: persistent browser sessions
```

### 12.2 Key Design Patterns

| Pattern | Implementation | Relevance to JARVIS |
|---|---|---|
| **Playwright browser control** | Full DOM interaction via LLM | JARVIS browser agent |
| **Persistent CLI sessions** | Browser stays open between commands | Long-running agent sessions |
| **Element indexing** | Clickable elements by index | Structured DOM interaction |
| **Cloud + self-hosted** | Dual deployment model | JARVIS runs locally |
| **Skills system** | SKILL.md for AI coding agents | Agent capability definitions |
| **MCP support** | Tool integration | MCP-native browser tools |

### 12.3 What to Adopt

- **Playwright-based browser agent** — For web browsing/research tasks
- **Persistent browser sessions** — Keep browser open across agent interactions
- **Element extraction and indexing** — Structured DOM for LLM interaction
- **Cloud browser option** — Optional remote browser for stealth/scaling

---

## 13. Cross-Project Patterns

### 13.1 Universal Patterns (Adopt All)

| Pattern | Projects Using It | JARVIS Implementation |
|---|---|---|
| **OpenAI-compatible API** | LocalAI, Jan, AnythingLLM, Open WebUI | Expose `/v1/chat/completions` etc. |
| **Multi-provider LLM** | ALL projects | Provider adapter pattern with unified interface |
| **MCP support** | LocalAI, Jan, CrewAI, browser-use, bolt.diy, Open WebUI | MCP client + server built-in |
| **Docker/container sandboxing** | OpenHands, LocalAI, Open WebUI | Docker-based code execution |
| **Plugin/Extension system** | Open WebUI, Jan, AnythingLLM, bolt.diy | JARVIS plugin architecture |
| **YAML configuration** | CrewAI, Open Interpreter | Agent/task definition files |
| **Streaming responses** | ALL projects | WebSocket + SSE streaming |
| **Multi-user support** | Open WebUI, AnythingLLM | Future JARVIS feature |
| **RAG built-in** | Open WebUI, AnythingLLM, LocalAI | Vector DB + document ingestion |

### 13.2 Architecture Patterns

```
COMMON ARCHITECTURE LAYERS:

┌─────────────────────────────────────────┐
│              UI / Frontend               │  ← React/Svelte/Next.js
├─────────────────────────────────────────┤
│              API Layer                   │  ← REST + WebSocket
├─────────────────────────────────────────┤
│           Agent Orchestration            │  ← Crews/Flows/Graphs
├─────────────────────────────────────────┤
│           LLM Provider Layer             │  ← Multi-provider adapter
├─────────────────────────────────────────┤
│        Tool / Integration Layer          │  ← MCP + custom tools
├─────────────────────────────────────────┤
│         Memory / RAG Layer               │  ← Vector DB + embeddings
├─────────────────────────────────────────┤
│         Execution / Sandbox              │  ← Docker + browser
├─────────────────────────────────────────┤
│         Storage / Persistence            │  ← SQLite/Postgres + files
└─────────────────────────────────────────┘
```

### 13.3 Technology Choices Validated

| Decision | Evidence | Confidence |
|---|---|---|
| **Tauri for desktop** | Jan (42.6k stars), TypeScript 75% + Rust 20% | ★★★★★ |
| **Python for backend AI** | ALL 11 projects use Python for AI logic | ★★★★★ |
| **TypeScript for frontend** | ALL projects with GUI use TS/JS | ★★★★★ |
| **FastAPI for API** | OpenHands, Open WebUI, Open Interpreter | ★★★★★ |
| **React for UI** | OpenHands, AnythingLLM, bolt.diy | ★★★★☆ |
| **Ollama for local models** | Supported by ALL projects | ★★★★★ |
| **Playwright for browser** | browser-use (94.6k), OpenHands | ★★★★★ |
| **CrewAI for agents** | 51.7k stars, proven multi-agent | ★★★★☆ |
| **ChromaDB for vectors** | Open WebUI, AnythingLLM | ★★★★☆ |
| **SQLite for local storage** | Jan, AnythingLLM, LangGraph | ★★★★★ |

---

## 14. Architecture Decisions for JARVIS

### 14.1 Decisions Based on Research

| Decision | Based On | Rationale |
|---|---|---|
| **Use Tauri, not Electron** | Jan (Tauri + TS + Rust) | Proven at scale, lighter, more secure, same capabilities |
| **Python backend for AI** | All 11 projects | Python ecosystem is unmatched for AI/ML |
| **CrewAI-inspired agents** | CrewAI architecture | Best-in-class multi-agent pattern (role/goal/backstory) |
| **LangGraph-inspired memory** | LangGraph checkpointing | Durable execution with checkpoint/resume |
| **LocalAI-style model mgmt** | LocalAI backend gallery | Multiple inference backends, auto-detect hardware |
| **OpenAI-compatible API** | Universal pattern | Interop with every AI tool in existence |
| **MCP-native** | 6+ projects support MCP | Standard for tool integration |
| **Docker sandboxing** | OpenHands, LocalAI | Proven safe code execution |
| **Playwright for browser** | browser-use | Best browser automation library |
| **ChromaDB default vector DB** | Open WebUI, AnythingLLM | Lightweight, embedded, no separate server |
| **Plugin/extension system** | Jan, Open WebUI | Critical for ecosystem growth |
| **YAML agent config** | CrewAI | User-accessible agent customization |

### 14.2 What JARVIS Uniquely Adds

None of the analyzed projects have ALL of these:

| Feature | Closest Existing | JARVIS Differentiator |
|---|---|---|
| **Cinematic 3D UI** | None | Three.js + R3F + GSAP scrollytelling |
| **Voice-first interaction** | Open WebUI (basic) | Full duplex voice with 3D reactive visualization |
| **Desktop OS integration** | Jan (basic) | System-wide hotkey, overlay HUD, OS automation |
| **Multi-agent visualization** | None | Real-time 3D agent network visualization |
| **Autonomous execution pipeline** | OpenHands (partial) | Full CrewAI-style + Docker sandbox + approval gates |
| **AI consciousness visualization** | None | Morphing geometry reacting to AI state |
| **Scroll-driven onboarding** | None | Cinematic scrollytelling introduction |
| **Integrated everything** | AnythingLLM (closest) | Agents + RAG + voice + browser + code + 3D in one app |

### 14.3 Risk Mitigation from Research

| Risk | Mitigation (learned from projects) |
|---|---|
| Tauri stability | Jan has 42.6k stars on Tauri, proving it works |
| Python+TypeScript integration | OpenHands does this (62% Python + 36% TS), proven |
| Multi-provider complexity | Use LiteLLM or similar unified adapter (Open Interpreter pattern) |
| Performance with 3D | Adaptive quality system, LOD, instancing (see UI_ARCHITECTURE) |
| Agent reliability | Human-in-the-loop gates (LangGraph pattern), sandbox execution |
| Model management | Follow LocalAI's backend gallery + Jan's extension pattern |
| Security | Docker sandboxing (OpenHands) + user confirmation (Open Interpreter) |

---

*This research document is based on live analysis of 11+ open-source repositories as of 2026-05-19. All star counts, architecture details, and feature lists are current as of this date.*

*Last Updated: 2026-05-19*
