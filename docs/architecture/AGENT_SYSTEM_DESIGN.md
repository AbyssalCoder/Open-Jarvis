# JARVIS — Agent System Design

## Multi-Agent Orchestration Architecture

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Backend → Agent Framework

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Agent Base Architecture](#2-agent-base-architecture)
3. [Agent Registry & Lifecycle](#3-agent-registry--lifecycle)
4. [Message Bus & Communication](#4-message-bus--communication)
5. [Brain / Orchestrator Agent (Tier 0)](#5-brain--orchestrator-agent)
6. [All 20 Agents — Detailed Specifications](#6-all-20-agents)
7. [Agent Communication Patterns](#7-agent-communication-patterns)
8. [Context Sharing & Memory Access](#8-context-sharing--memory-access)
9. [Task Delegation & Collaboration](#9-task-delegation--collaboration)
10. [Retry & Self-Healing](#10-retry--self-healing)
11. [Streaming Output System](#11-streaming-output-system)
12. [Autonomous Planning Integration](#12-autonomous-planning-integration)
13. [Agent Configuration (YAML)](#13-agent-configuration-yaml)
14. [Resource Budgeting](#14-resource-budgeting)
15. [Testing & Observability](#15-testing--observability)

---

## 1. Design Philosophy

### 1.1 Inspired By (Research-Backed)

| Source | Pattern Adopted | Adaptation for JARVIS |
|---|---|---|
| **CrewAI** | Agent(role, goal, backstory, tools) | Core agent definition model |
| **CrewAI Flows** | @start, @listen, @router decorators | Event-driven pipeline orchestration |
| **LangGraph** | Durable execution, checkpoint/resume | Autonomous task persistence |
| **AutoGen (legacy)** | AgentTool — wrap agent as callable tool | Agent delegation mechanism |
| **OpenHands** | Docker sandbox for execution | Sandboxed code/terminal agents |
| **Open Interpreter** | LiteLLM multi-provider + exec() | Model routing + code execution |

### 1.2 Core Principles

1. **Every agent is a standalone async service** — Can run, fail, restart independently
2. **Agents communicate via messages, never direct calls** — Decoupled, testable, replaceable
3. **Agents declare capabilities, don't hard-code routing** — Brain discovers what agents can do
4. **Agents share memory, never share state** — Memory Agent mediates all persistent knowledge
5. **Agents stream results, never batch** — Every intermediate result goes to the frontend immediately
6. **Agents have resource budgets** — No agent can monopolize CPU/RAM/VRAM
7. **Agents self-heal** — Retry with backoff, degrade gracefully, escalate to Brain on failure

---

## 2. Agent Base Architecture

### 2.1 Base Agent Class

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional
from enum import Enum

class AgentState(Enum):
    IDLE = "idle"
    ACTIVE = "active"
    BUSY = "busy"
    ERROR = "error"
    SUSPENDED = "suspended"
    LOADING = "loading"

class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AgentCapability:
    name: str                      # e.g., "read_file"
    description: str               # For LLM tool prompting
    parameters: dict               # JSON Schema
    risk_level: RiskLevel
    requires_approval: bool
    timeout_seconds: int = 30

@dataclass
class AgentConfig:
    agent_id: str
    name: str
    role: str                      # CrewAI-style role description
    goal: str                      # What this agent optimizes for
    backstory: str                 # Personality/context for LLM
    tier: int                      # 0-6 priority tier
    capabilities: list[AgentCapability] = field(default_factory=list)
    memory_scopes: list[str] = field(default_factory=list)  # e.g., ["episodic", "semantic"]
    max_ram_mb: int = 100
    max_concurrent_tasks: int = 2
    auto_load: bool = False        # Load on startup vs lazy
    autonomous: bool = False       # Can act without user approval

class BaseAgent(ABC):
    """Base class for all JARVIS agents."""

    def __init__(self, config: AgentConfig, event_bus, memory_store, llm_router):
        self.config = config
        self.event_bus = event_bus
        self.memory = memory_store
        self.llm = llm_router
        self.state = AgentState.IDLE
        self._task_count = 0

    @abstractmethod
    async def handle_message(self, message: AgentMessage) -> AsyncIterator[AgentResponse]:
        """Process an incoming message. Yields streaming responses."""
        ...

    async def start(self):
        """Initialize the agent (load resources, register handlers)."""
        self.state = AgentState.LOADING
        await self._register_capabilities()
        self.state = AgentState.IDLE
        await self.event_bus.emit(AgentEvent("agent.started", agent_id=self.config.agent_id))

    async def stop(self):
        """Gracefully shut down the agent."""
        self.state = AgentState.SUSPENDED
        await self.event_bus.emit(AgentEvent("agent.stopped", agent_id=self.config.agent_id))

    async def health_check(self) -> bool:
        """Return True if agent is healthy."""
        return self.state not in (AgentState.ERROR, AgentState.SUSPENDED)

    async def _register_capabilities(self):
        """Register this agent's capabilities with the Brain."""
        for cap in self.config.capabilities:
            await self.event_bus.emit(AgentEvent(
                "agent.capability.registered",
                agent_id=self.config.agent_id,
                data={"capability": cap.name, "description": cap.description}
            ))

    def _check_resource_budget(self):
        """Verify agent is within resource limits."""
        if self._task_count >= self.config.max_concurrent_tasks:
            raise AgentOverloadedError(f"{self.config.name} at max concurrent tasks")
```

### 2.2 Agent Message Protocol

```python
@dataclass
class AgentMessage:
    id: str                        # UUID
    source: str                    # Source agent_id (or "user")
    target: str                    # Target agent_id (or "brain")
    type: str                      # "request" | "response" | "event" | "error"
    intent: str                    # What the message is about
    payload: dict                  # Message data
    context: dict                  # Shared context snapshot
    priority: int = 5              # 0 (critical) to 9 (background)
    timestamp: float = 0.0
    trace_id: str = ""             # Distributed tracing
    reply_to: Optional[str] = None # Parent message ID
    ttl: int = 300                 # Time-to-live seconds
    retry_count: int = 0

@dataclass
class AgentResponse:
    id: str
    source: str
    type: str                      # "partial" | "complete" | "error"
    data: dict
    trace_id: str
    timestamp: float
```

---

## 3. Agent Registry & Lifecycle

### 3.1 Registry

```python
class AgentRegistry:
    """Central registry of all agents and their capabilities."""

    def __init__(self):
        self._agents: dict[str, BaseAgent] = {}
        self._capabilities: dict[str, list[str]] = {}  # capability → [agent_ids]

    async def register(self, agent: BaseAgent):
        self._agents[agent.config.agent_id] = agent
        for cap in agent.config.capabilities:
            self._capabilities.setdefault(cap.name, []).append(agent.config.agent_id)

    def find_agents_for_capability(self, capability: str) -> list[BaseAgent]:
        agent_ids = self._capabilities.get(capability, [])
        return [self._agents[aid] for aid in agent_ids if self._agents[aid].state != AgentState.SUSPENDED]

    def get_agent(self, agent_id: str) -> BaseAgent:
        return self._agents[agent_id]

    def get_all_healthy(self) -> list[BaseAgent]:
        return [a for a in self._agents.values() if a.state not in (AgentState.ERROR, AgentState.SUSPENDED)]
```

### 3.2 Lifecycle

```
REGISTERED → LOADING → IDLE ⇄ ACTIVE ⇄ BUSY → SUSPENDED
                                  ↓
                                ERROR → (auto-restart) → LOADING
```

| State | Description |
|---|---|
| REGISTERED | Agent class registered but not initialized |
| LOADING | Loading models, tools, connections |
| IDLE | Ready, waiting for work |
| ACTIVE | Processing a task |
| BUSY | At max concurrent tasks, queuing new work |
| ERROR | Failed, awaiting recovery |
| SUSPENDED | Manually disabled or shutdown |

### 3.3 Lazy Loading

```python
async def get_or_load_agent(agent_id: str) -> BaseAgent:
    agent = registry.get_agent(agent_id)
    if agent.state == AgentState.REGISTERED:
        await agent.start()  # Lazy initialization
    return agent
```

Only Tier 0 (Brain) and Tier 1 (Memory, Knowledge, Personality) agents auto-load on startup. All others load on first use.

---

## 4. Message Bus & Communication

### 4.1 Event Bus Implementation

```python
import asyncio
from collections import defaultdict

class EventBus:
    def __init__(self):
        self._handlers: dict[str, list[tuple[str, callable]]] = defaultdict(list)
        self._queue = asyncio.PriorityQueue(maxsize=10000)
        self._running = False

    async def emit(self, event_type: str, data: dict = None, priority: int = 5):
        await self._queue.put((priority, time.time(), event_type, data or {}))

    def on(self, event_type: str, handler: callable) -> str:
        handler_id = str(uuid4())
        self._handlers[event_type].append((handler_id, handler))
        return handler_id

    def off(self, handler_id: str):
        for event_type, handlers in self._handlers.items():
            self._handlers[event_type] = [(hid, h) for hid, h in handlers if hid != handler_id]

    async def start(self):
        self._running = True
        asyncio.create_task(self._process_loop())

    async def _process_loop(self):
        while self._running:
            priority, timestamp, event_type, data = await self._queue.get()
            handlers = self._handlers.get(event_type, [])
            # Also match wildcard handlers
            for pattern, pattern_handlers in self._handlers.items():
                if pattern.endswith("*") and event_type.startswith(pattern[:-1]):
                    handlers.extend(pattern_handlers)
            # Fire all handlers concurrently
            await asyncio.gather(*[h(data) for _, h in handlers], return_exceptions=True)
```

### 4.2 Message Routing

```
Message arrives at EventBus
       │
       ▼
  Priority Queue (sorted by priority, then timestamp)
       │
       ▼
  Event Type Matching
       │
       ├── Exact match: "agent.coding.request" → CodingAgent
       ├── Wildcard match: "agent.*" → Brain (monitors all)
       └── Pattern match: "system.*" → SystemMonitorAgent
       │
       ▼
  Concurrent handler execution (asyncio.gather)
       │
       ▼
  Responses emitted back to bus as new events
```

---

## 5. Brain / Orchestrator Agent

### 5.1 Specification

```yaml
agent_id: brain
name: Brain / Orchestrator
role: "Central intelligence coordinator that receives all user requests, 
      classifies intent, creates execution plans, delegates to specialized 
      agents, aggregates results, and streams responses to the user."
goal: "Fulfill user requests with maximum quality and minimum latency by 
      selecting the optimal combination of agents, models, and strategies."
backstory: "You are JARVIS's central nervous system. You understand the 
           capabilities of every agent in the system and know which ones 
           to engage for any given task."
tier: 0
auto_load: true
autonomous: true
```

### 5.2 Brain Decision Pipeline

```python
class BrainAgent(BaseAgent):
    async def handle_message(self, message: AgentMessage) -> AsyncIterator[AgentResponse]:
        # Step 1: Classify intent
        intent = await self._classify_intent(message.payload["text"])

        # Step 2: Assess complexity
        complexity = await self._assess_complexity(message, intent)

        # Step 3: Select model
        model = await self.llm.select_model(intent, complexity)

        # Step 4: Gather context
        context = await self._assemble_context(message, intent)

        # Step 5: Create execution plan
        if complexity == "autonomous":
            plan = await self._create_plan(message, intent, context)
            async for response in self._execute_plan(plan):
                yield response
        else:
            # Simple: single agent + single model call
            agent = self._select_agent(intent)
            async for response in agent.handle_message(message):
                yield response

    async def _classify_intent(self, text: str) -> str:
        # Fast local classifier (rule-based + small model)
        # Returns: chat, code, research, automate, file, system, memory,
        #          schedule, creative, vision, voice_control, meta
        ...

    async def _assess_complexity(self, message, intent) -> str:
        # Returns: simple, medium, complex, autonomous
        ...

    def _select_agent(self, intent: str) -> BaseAgent:
        intent_to_agent = {
            "chat": "personality",
            "code": "coding",
            "research": "web",
            "automate": "autonomous_task",
            "file": "file_management",
            "system": "system_monitor",
            "memory": "memory",
            "schedule": "scheduler",
            "creative": "coding",  # Uses coding agent with creative prompt
            "vision": "vision",
            "voice_control": "voice",
            "meta": "personality",
        }
        agent_id = intent_to_agent.get(intent, "personality")
        return self.registry.get_agent(agent_id)
```

---

## 6. All 20 Agents — Detailed Specifications

### Agent 1: Brain / Orchestrator (Tier 0)
*See Section 5 above.*

### Agent 2: Voice Agent (Tier 2)

```yaml
agent_id: voice
name: Voice Agent
role: "Handles all voice interactions — speech-to-text, text-to-speech, 
      wake word detection, and streaming audio processing."
goal: "Provide sub-second voice interaction with natural, expressive speech."
tier: 2
capabilities:
  - name: speech_to_text
    description: "Transcribe audio to text using Whisper"
    risk_level: LOW
  - name: text_to_speech
    description: "Synthesize speech from text using Piper/XTTS"
    risk_level: LOW
  - name: wake_word_detect
    description: "Listen for wake word activation"
    risk_level: LOW
  - name: voice_interrupt
    description: "Detect user interruption during TTS playback"
    risk_level: LOW
memory_scopes: ["working"]
models: ["faster-whisper-base", "piper-tts"]
```

### Agent 3: Memory Agent (Tier 1)

```yaml
agent_id: memory
name: Memory Agent
role: "Manages all memory operations — storing, recalling, consolidating,
      and forgetting across episodic, semantic, procedural, and working memory."
goal: "Ensure JARVIS remembers everything important and forgets nothing critical."
tier: 1
auto_load: true
capabilities:
  - name: memory_store
    description: "Store a memory entry with metadata and importance scoring"
    risk_level: LOW
  - name: memory_recall
    description: "Retrieve relevant memories using vector similarity search"
    risk_level: LOW
  - name: memory_consolidate
    description: "Summarize and compress old memories (background task)"
    risk_level: LOW
  - name: memory_forget
    description: "Remove memories by criteria or age"
    risk_level: MEDIUM
memory_scopes: ["episodic", "semantic", "procedural", "working"]
```

### Agent 4: Vision Agent (Tier 2)

```yaml
agent_id: vision
name: Vision Agent
role: "Captures and analyzes visual information — screenshots, webcam, 
      OCR, UI element detection, and visual question answering."
goal: "Give JARVIS eyes to understand what's on screen and in the world."
tier: 2
capabilities:
  - name: capture_screenshot
    description: "Take a screenshot of the desktop or specific window"
    risk_level: LOW
  - name: ocr_extract
    description: "Extract text from images using OCR"
    risk_level: LOW
  - name: visual_qa
    description: "Answer questions about images using vision LLM"
    risk_level: LOW
  - name: webcam_capture
    description: "Capture frame from webcam"
    risk_level: MEDIUM
    requires_approval: true
  - name: ui_element_detect
    description: "Detect clickable UI elements on screen"
    risk_level: LOW
memory_scopes: ["working"]
models: ["llava-7b", "tesseract-ocr"]
```

### Agent 5: Coding Agent (Tier 3)

```yaml
agent_id: coding
name: Coding Agent
role: "Generates, analyzes, debugs, refactors, and explains code across
      multiple programming languages."
goal: "Write production-quality code that solves the user's problem correctly."
tier: 3
capabilities:
  - name: generate_code
    description: "Generate code from natural language description"
    risk_level: MEDIUM
  - name: analyze_code
    description: "Analyze code for bugs, performance, security issues"
    risk_level: LOW
  - name: debug_code
    description: "Debug code given error messages and context"
    risk_level: LOW
  - name: refactor_code
    description: "Refactor code for better structure and performance"
    risk_level: MEDIUM
  - name: explain_code
    description: "Explain code functionality in natural language"
    risk_level: LOW
memory_scopes: ["working", "procedural"]
models: ["deepseek-coder-6.7b", "qwen2.5-coder-7b"]
```

### Agent 6: Terminal Agent (Tier 3)

```yaml
agent_id: terminal
name: Terminal Agent
role: "Executes shell commands in a sandboxed environment, manages terminal
      sessions, and interprets command output."
goal: "Execute system commands safely and report results clearly."
tier: 3
capabilities:
  - name: run_command
    description: "Execute a shell command in sandbox"
    risk_level: HIGH
    requires_approval: true
    timeout_seconds: 60
  - name: run_script
    description: "Execute a script file in sandbox"
    risk_level: HIGH
    requires_approval: true
    timeout_seconds: 120
  - name: check_command
    description: "Validate a command before execution (dry run)"
    risk_level: LOW
memory_scopes: ["working"]
```

### Agent 7: Web Agent (Tier 3)

```yaml
agent_id: web
name: Web Agent
role: "Performs web research, browser automation, data extraction, and
      multi-page navigation using Playwright."
goal: "Navigate and interact with the web autonomously to fulfill user goals."
tier: 3
capabilities:
  - name: web_search
    description: "Search the web for information"
    risk_level: LOW
  - name: navigate_url
    description: "Navigate browser to a specific URL"
    risk_level: LOW
  - name: extract_page_data
    description: "Extract structured data from a web page"
    risk_level: LOW
  - name: fill_form
    description: "Fill out a web form with provided data"
    risk_level: MEDIUM
    requires_approval: true
  - name: browser_action
    description: "Click, type, scroll on a web page"
    risk_level: MEDIUM
  - name: download_file
    description: "Download a file from a URL"
    risk_level: MEDIUM
memory_scopes: ["working", "episodic"]
models: ["browser-use inspired — screenshot + LLM loop"]
```

### Agent 8: File Management Agent (Tier 3)

```yaml
agent_id: file_management
name: File Management Agent
role: "Handles all file system operations — reading, writing, searching,
      organizing, and monitoring files and directories."
goal: "Manage files efficiently and safely, always preserving data integrity."
tier: 3
capabilities:
  - name: read_file
    description: "Read contents of a file"
    risk_level: LOW
  - name: write_file
    description: "Write content to a file"
    risk_level: MEDIUM
  - name: search_files
    description: "Search for files by name, content, or metadata"
    risk_level: LOW
  - name: create_directory
    description: "Create a new directory"
    risk_level: LOW
  - name: delete_file
    description: "Delete a file or directory"
    risk_level: CRITICAL
    requires_approval: true
  - name: move_file
    description: "Move or rename a file"
    risk_level: MEDIUM
  - name: watch_directory
    description: "Monitor a directory for changes"
    risk_level: LOW
memory_scopes: ["working"]
```

### Agent 9: Productivity Agent (Tier 5)

```yaml
agent_id: productivity
name: Productivity Agent
role: "Assists with productivity tasks — document creation, spreadsheet
      operations, note-taking, summarization, and workflow optimization."
goal: "Help users be more productive by automating routine knowledge work."
tier: 5
capabilities:
  - name: create_document
    description: "Create a document (markdown, text, etc.)"
    risk_level: MEDIUM
  - name: summarize_text
    description: "Summarize long text or documents"
    risk_level: LOW
  - name: translate_text
    description: "Translate text between languages"
    risk_level: LOW
  - name: extract_data
    description: "Extract structured data from unstructured text"
    risk_level: LOW
memory_scopes: ["working", "semantic"]
```

### Agent 10: Media Agent (Tier 5)

```yaml
agent_id: media
name: Media Agent
role: "Handles media processing — image generation prompts, audio/video
      information, format conversion, and media organization."
goal: "Help users create, organize, and process media content."
tier: 5
capabilities:
  - name: describe_image
    description: "Describe an image in natural language"
    risk_level: LOW
  - name: suggest_image_prompt
    description: "Generate prompts for image generation tools"
    risk_level: LOW
  - name: organize_media
    description: "Suggest organization for media files"
    risk_level: LOW
  - name: convert_format
    description: "Convert media between formats"
    risk_level: MEDIUM
memory_scopes: ["working"]
```

### Agent 11: Personality Agent (Tier 1)

```yaml
agent_id: personality
name: Personality Agent
role: "Maintains JARVIS's consistent personality, tone, and communication
      style across all interactions. Handles general conversation."
goal: "Ensure every interaction feels like talking to JARVIS — intelligent,
      witty, helpful, and never generic."
tier: 1
auto_load: true
capabilities:
  - name: general_chat
    description: "Handle general conversation and questions"
    risk_level: LOW
  - name: style_response
    description: "Apply JARVIS personality to any response text"
    risk_level: LOW
  - name: contextual_greeting
    description: "Generate contextually appropriate greetings"
    risk_level: LOW
memory_scopes: ["working", "episodic", "semantic"]
personality_traits:
  tone: "Intelligent, slightly witty, professional but warm"
  formality: "Adaptive — formal for work, casual for chat"
  humor: "Dry, subtle, never forced"
  references: "Occasional tech/science references"
  identity: "JARVIS — a capable AI assistant, not a human"
```

### Agent 12: System Monitor Agent (Tier 4)

```yaml
agent_id: system_monitor
name: System Monitor Agent
role: "Continuously monitors system resources — CPU, RAM, GPU, disk, network,
      and running processes. Provides diagnostics and alerts."
goal: "Keep the user informed about system health and prevent resource issues."
tier: 4
auto_load: true
capabilities:
  - name: get_system_info
    description: "Get current CPU, RAM, GPU, disk usage"
    risk_level: LOW
  - name: get_process_list
    description: "List running processes with resource usage"
    risk_level: LOW
  - name: kill_process
    description: "Terminate a running process"
    risk_level: CRITICAL
    requires_approval: true
  - name: get_network_info
    description: "Get network status and connections"
    risk_level: LOW
memory_scopes: ["working"]
background_interval: 5  # seconds
```

### Agent 13: Mobile Sync Agent (Tier 5)

```yaml
agent_id: mobile_sync
name: Mobile Sync Agent
role: "Manages synchronization between JARVIS desktop and mobile devices —
      notifications, file sharing, and remote command relay."
goal: "Keep mobile devices in sync with JARVIS desktop seamlessly."
tier: 5
capabilities:
  - name: push_notification
    description: "Send a notification to connected mobile device"
    risk_level: LOW
  - name: sync_clipboard
    description: "Sync clipboard between desktop and mobile"
    risk_level: MEDIUM
  - name: relay_command
    description: "Relay a command from mobile to desktop"
    risk_level: MEDIUM
memory_scopes: ["working"]
phase: "Phase 4+ (future)"
```

### Agent 14: AI Model Manager Agent (Tier 4)

```yaml
agent_id: model_manager
name: AI Model Manager Agent
role: "Manages the lifecycle of AI models — discovery, download, loading,
      unloading, switching, health checking, and performance profiling."
goal: "Ensure the right model is available at the right time with optimal
      resource usage."
tier: 4
auto_load: true
capabilities:
  - name: list_models
    description: "List all available models (local and remote)"
    risk_level: LOW
  - name: download_model
    description: "Download a model from HuggingFace or Ollama"
    risk_level: MEDIUM
  - name: load_model
    description: "Load a model into RAM/VRAM"
    risk_level: MEDIUM
  - name: unload_model
    description: "Unload a model to free memory"
    risk_level: LOW
  - name: switch_model
    description: "Hot-swap the active model"
    risk_level: MEDIUM
  - name: profile_model
    description: "Benchmark model performance on current hardware"
    risk_level: LOW
memory_scopes: ["working", "procedural"]
```

### Agent 15: Autonomous Task Agent (Tier 6)

```yaml
agent_id: autonomous_task
name: Autonomous Task Agent
role: "Handles multi-step autonomous workflows — breaks down complex goals,
      creates execution plans, coordinates multiple agents, self-corrects
      on failure, and reports progress."
goal: "Complete complex multi-step tasks autonomously with minimal user
      intervention while maintaining safety and transparency."
tier: 6
capabilities:
  - name: plan_task
    description: "Create a multi-step execution plan from a goal"
    risk_level: MEDIUM
  - name: execute_plan
    description: "Execute a multi-step plan with progress streaming"
    risk_level: HIGH
    requires_approval: true
  - name: self_correct
    description: "Analyze failure and create a fix/workaround"
    risk_level: MEDIUM
  - name: replan
    description: "Modify execution plan based on intermediate results"
    risk_level: MEDIUM
memory_scopes: ["working", "episodic", "procedural"]
autonomous: true
max_steps_per_plan: 20
approval_checkpoints: [5, 10, 15]  # Ask user approval at these step counts
```

### Agent 16: Security Agent (Tier 4)

```yaml
agent_id: security
name: Security Agent
role: "Validates all agent actions against security policies, manages
      permissions, audits operations, and prevents harmful actions."
goal: "Ensure all JARVIS operations are safe, sandboxed, and auditable."
tier: 4
auto_load: true
capabilities:
  - name: validate_action
    description: "Check if an action is allowed by security policy"
    risk_level: LOW
  - name: audit_log
    description: "Record an action in the audit log"
    risk_level: LOW
  - name: check_permissions
    description: "Verify agent has permission for an operation"
    risk_level: LOW
  - name: sandbox_command
    description: "Create a sandboxed environment for command execution"
    risk_level: LOW
  - name: scan_output
    description: "Scan agent output for sensitive data leaks"
    risk_level: LOW
memory_scopes: ["working"]
```

### Agent 17: Overlay HUD Agent (Tier 2)

```yaml
agent_id: overlay_hud
name: Overlay HUD Agent
role: "Manages desktop overlays, floating HUD windows, transparent panels,
      and world-space UI elements."
goal: "Provide contextual, unobtrusive AI assistance overlaid on the desktop."
tier: 2
capabilities:
  - name: show_overlay
    description: "Display a floating overlay panel on the desktop"
    risk_level: LOW
  - name: hide_overlay
    description: "Hide an active overlay panel"
    risk_level: LOW
  - name: update_overlay
    description: "Update content of an active overlay"
    risk_level: LOW
  - name: show_notification
    description: "Display a desktop notification"
    risk_level: LOW
  - name: show_diagnostics
    description: "Show realtime system diagnostics overlay"
    risk_level: LOW
memory_scopes: ["working"]
```

### Agent 18: Gaming Assistant Agent (Tier 5)

```yaml
agent_id: gaming
name: Gaming Assistant Agent
role: "Provides gaming assistance — FPS counters, performance overlays,
      game-specific tips, streaming assistance, and gaming optimization."
goal: "Enhance the gaming experience without impacting game performance."
tier: 5
capabilities:
  - name: gaming_overlay
    description: "Show gaming performance overlay (FPS, GPU temp, etc.)"
    risk_level: LOW
  - name: optimize_for_gaming
    description: "Reduce JARVIS resource usage for gaming"
    risk_level: MEDIUM
  - name: game_tips
    description: "Provide contextual tips for detected game"
    risk_level: LOW
memory_scopes: ["working"]
phase: "Phase 4+ (lower priority)"
```

### Agent 19: Knowledge Agent (Tier 1)

```yaml
agent_id: knowledge
name: Knowledge Agent
role: "Manages JARVIS's knowledge base — research, information synthesis,
      document indexing, and knowledge graph operations."
goal: "Make JARVIS increasingly knowledgeable about the user's world."
tier: 1
auto_load: true
capabilities:
  - name: index_document
    description: "Index a document into the knowledge base"
    risk_level: LOW
  - name: search_knowledge
    description: "Search the knowledge base for information"
    risk_level: LOW
  - name: synthesize_info
    description: "Combine information from multiple sources"
    risk_level: LOW
  - name: update_knowledge
    description: "Update or correct knowledge entries"
    risk_level: LOW
memory_scopes: ["semantic", "episodic"]
```

### Agent 20: Scheduler Agent (Tier 4)

```yaml
agent_id: scheduler
name: Scheduler Agent
role: "Manages scheduled tasks, reminders, cron jobs, deferred actions,
      and time-based automation triggers."
goal: "Ensure tasks happen at the right time, every time."
tier: 4
capabilities:
  - name: create_schedule
    description: "Create a new scheduled task"
    risk_level: MEDIUM
  - name: list_schedules
    description: "List all active scheduled tasks"
    risk_level: LOW
  - name: cancel_schedule
    description: "Cancel a scheduled task"
    risk_level: LOW
  - name: create_reminder
    description: "Set a reminder for a specific time"
    risk_level: LOW
  - name: run_scheduled
    description: "Execute a scheduled task when triggered"
    risk_level: MEDIUM
memory_scopes: ["working", "procedural"]
background_interval: 1  # Check every second
```

---

## 7. Agent Communication Patterns

### 7.1 Pattern: Request-Reply

```
User → Brain → CodingAgent → Brain → User
       "Write a Python function"
```

### 7.2 Pattern: Fan-Out (Parallel)

```
User → Brain ─┬→ WebAgent        ─┐
              ├→ KnowledgeAgent   ├→ Brain (aggregate) → User
              └→ MemoryAgent      ─┘
       "What do I know about React performance?"
```

### 7.3 Pattern: Pipeline (Sequential)

```
User → VoiceAgent(STT) → Brain(intent) → CodingAgent(code) → 
       TerminalAgent(execute) → Brain(result) → VoiceAgent(TTS) → User
```

### 7.4 Pattern: Saga (Autonomous Multi-Step)

```
User → Brain → AutonomousTaskAgent → [
  Step 1: FileAgent(create_dir) →
  Step 2: CodingAgent(generate_code) →
  Step 3: FileAgent(write_file) →
  Step 4: TerminalAgent(run_tests) →
  Step 5: (if fail) CodingAgent(debug) → TerminalAgent(run_tests) →
  Step 6: Brain(report_result)
] → User
```

### 7.5 Pattern: Pub-Sub (Event Broadcast)

```
SystemMonitorAgent → [Event: "system.ram.high"]
  → ModelManagerAgent (unload unused models)
  → OverlayHUDAgent (show warning)
  → Brain (adjust quality settings)
```

---

## 8. Context Sharing & Memory Access

### 8.1 Context Window per Agent Call

```python
@dataclass
class AgentContext:
    # Provided by Brain to each agent
    user_message: str                    # Current user input
    conversation_history: list[dict]     # Recent conversation (last 10 turns)
    relevant_memories: list[dict]        # From Memory Agent recall
    active_files: list[str]              # Currently open/discussed files
    system_state: dict                   # CPU/RAM/GPU snapshot
    agent_states: dict[str, str]         # Other agents' current states
    trace_id: str                        # For tracing this interaction
    max_tokens: int                      # Token budget for this call
```

### 8.2 Memory Access Rules

| Agent | Episodic | Semantic | Procedural | Working |
|---|---|---|---|---|
| Brain | Read | Read | Read | Read/Write |
| Memory | Read/Write | Read/Write | Read/Write | Read/Write |
| Knowledge | Read | Read/Write | - | Read/Write |
| Personality | Read | Read | - | Read |
| Coding | - | - | Read/Write | Read/Write |
| Terminal | - | - | Read | Read/Write |
| All Others | - | - | - | Read/Write |

---

## 9. Task Delegation & Collaboration

### 9.1 Delegation Protocol

```python
async def delegate_to_agent(self, target_agent_id: str, task: dict) -> AsyncIterator:
    """Delegate a task to another agent."""
    message = AgentMessage(
        id=str(uuid4()),
        source=self.config.agent_id,
        target=target_agent_id,
        type="request",
        intent=task["intent"],
        payload=task,
        context=self._current_context,
        priority=task.get("priority", 5),
        trace_id=self._current_trace_id,
    )
    
    target = await get_or_load_agent(target_agent_id)
    async for response in target.handle_message(message):
        yield response
```

### 9.2 Multi-Agent Collaboration

When a task requires multiple agents:

```python
async def collaborate(self, agents: list[str], task: dict):
    """Run multiple agents in parallel and merge results."""
    tasks = [
        self.delegate_to_agent(agent_id, task)
        for agent_id in agents
    ]
    
    results = []
    for coro in asyncio.as_completed([self._collect(t) for t in tasks]):
        result = await coro
        results.append(result)
        # Stream partial results as they arrive
        yield AgentResponse(type="partial", data=result)
    
    # Final merged result
    merged = await self._merge_results(results)
    yield AgentResponse(type="complete", data=merged)
```

---

## 10. Retry & Self-Healing

### 10.1 Per-Agent Retry Policy

```python
@dataclass
class RetryPolicy:
    max_retries: int = 3
    base_delay: float = 1.0
    backoff_factor: float = 2.0
    max_delay: float = 30.0
    retry_on: list[type] = field(default_factory=lambda: [Exception])
    fallback_agent: Optional[str] = None  # Agent to try if retries exhausted
    degrade_strategy: Optional[str] = None  # "simplify", "smaller_model", "cloud"
```

### 10.2 Self-Healing Loop

```python
async def execute_with_healing(self, message: AgentMessage) -> AsyncIterator:
    policy = self.config.retry_policy
    
    for attempt in range(policy.max_retries + 1):
        try:
            async for response in self.handle_message(message):
                yield response
            return  # Success
        except Exception as e:
            if attempt == policy.max_retries:
                # Try fallback agent
                if policy.fallback_agent:
                    fallback = await get_or_load_agent(policy.fallback_agent)
                    async for response in fallback.handle_message(message):
                        yield response
                    return
                # Try degradation
                if policy.degrade_strategy == "smaller_model":
                    message.payload["model_override"] = "smallest_available"
                    async for response in self.handle_message(message):
                        yield response
                    return
                # Give up
                yield AgentResponse(type="error", data={"error": str(e)})
                return
            
            delay = min(
                policy.base_delay * (policy.backoff_factor ** attempt),
                policy.max_delay
            )
            await asyncio.sleep(delay)
            self.state = AgentState.ACTIVE  # Reset from ERROR
```

---

## 11. Streaming Output System

### 11.1 Token-Level Streaming

Every agent streams output token-by-token to the frontend:

```python
async def stream_llm_to_frontend(self, prompt: str, model: str):
    async for token in self.llm.generate_stream(prompt, model):
        await self.event_bus.emit("ai.token", {
            "token": token,
            "agent": self.config.agent_id,
            "model": model,
            "trace_id": self._current_trace_id,
        })
```

### 11.2 Progress Streaming

For multi-step tasks:

```python
async def stream_progress(self, step: int, total: int, description: str):
    await self.event_bus.emit("agent.progress", {
        "agent": self.config.agent_id,
        "step": step,
        "total": total,
        "description": description,
        "trace_id": self._current_trace_id,
    })
```

### 11.3 Frontend Consumption

```typescript
// React hook for consuming agent streams
function useAgentStream(traceId: string) {
    const [tokens, setTokens] = useState<string[]>([]);
    const [progress, setProgress] = useState<Progress | null>(null);

    useEffect(() => {
        const unsub1 = ws.on("ai.token", (data) => {
            if (data.trace_id === traceId) {
                setTokens(prev => [...prev, data.token]);
            }
        });
        const unsub2 = ws.on("agent.progress", (data) => {
            if (data.trace_id === traceId) {
                setProgress(data);
            }
        });
        return () => { unsub1(); unsub2(); };
    }, [traceId]);

    return { text: tokens.join(""), progress };
}
```

---

## 12. Autonomous Planning Integration

### 12.1 Planning Pipeline

```python
class AutonomousTaskAgent(BaseAgent):
    async def plan_and_execute(self, goal: str) -> AsyncIterator[AgentResponse]:
        # Step 1: Decompose goal into tasks
        plan = await self._create_plan(goal)
        
        yield AgentResponse(type="partial", data={
            "event": "plan_created",
            "plan": plan.to_dict(),
        })
        
        # Step 2: Request user approval
        yield AgentResponse(type="partial", data={
            "event": "approval_needed",
            "plan": plan.to_dict(),
            "message": f"I've created a {len(plan.steps)}-step plan. Shall I proceed?"
        })
        
        # Step 3: Wait for approval (via event bus)
        approval = await self.event_bus.wait_for("user.approval", timeout=300)
        if not approval.data.get("approved"):
            yield AgentResponse(type="complete", data={"status": "cancelled"})
            return
        
        # Step 4: Execute with self-correction
        for i, step in enumerate(plan.steps):
            yield AgentResponse(type="partial", data={
                "event": "step_started",
                "step": i + 1,
                "total": len(plan.steps),
                "description": step.description,
            })
            
            result = await self._execute_step(step)
            
            if result.failed:
                # Self-correct
                fix = await self._attempt_fix(step, result.error)
                if fix.success:
                    result = fix.result
                else:
                    # Replan remaining steps
                    new_plan = await self._replan(plan, i, result.error)
                    plan = new_plan
            
            yield AgentResponse(type="partial", data={
                "event": "step_completed",
                "step": i + 1,
                "result": result.to_dict(),
            })
        
        yield AgentResponse(type="complete", data={"status": "success"})
```

---

## 13. Agent Configuration (YAML)

### 13.1 User-Customizable Agent Config

```yaml
# config/agents.yaml — Users can modify this

agents:
  brain:
    enabled: true
    model_preference: "auto"  # auto, local, cloud, specific model name
    
  voice:
    enabled: true
    wake_word: "jarvis"
    stt_model: "faster-whisper-base"
    tts_model: "piper-en-us"
    vad_threshold: 0.5
    listen_mode: "wake_word"  # wake_word, push_to_talk, always_on
    
  coding:
    enabled: true
    preferred_model: "deepseek-coder-6.7b"
    auto_format: true
    default_language: "python"
    
  terminal:
    enabled: true
    shell: "powershell"  # powershell, cmd, bash
    auto_approve_safe: false  # Auto-approve LOW risk commands
    max_runtime: 60
    
  web:
    enabled: true
    headless: true
    max_pages: 5
    
  autonomous_task:
    enabled: true
    max_steps: 20
    approval_required: true
    approval_interval: 5  # Ask approval every N steps
```

---

## 14. Resource Budgeting

### 14.1 Per-Agent Resource Limits

| Agent | Max RAM | Max CPU% | Max Tasks | GPU Access |
|---|---|---|---|---|
| Brain | 200MB | 20% | 4 | Via LLM Router |
| Voice | 300MB | 15% | 1 (STT) + 1 (TTS) | For Whisper |
| Memory | 100MB | 10% | 8 | No |
| Vision | 500MB | 25% | 1 | For LLaVA |
| Coding | 100MB | 15% | 2 | Via LLM Router |
| Terminal | 50MB | 30% | 2 | No |
| Web | 300MB | 20% | 2 browsers | No |
| File Mgmt | 50MB | 10% | 8 | No |
| System Monitor | 30MB | 2% | 1 | No |
| Model Manager | 100MB | 10% | 1 | Yes (loading) |
| All Others | 50MB each | 10% | 2 | No |

### 14.2 Global Resource Governor

```python
class ResourceGovernor:
    """Ensures total agent resource usage stays within system budget."""
    
    def __init__(self, total_ram_budget_mb: int, total_cpu_percent: int):
        self.ram_budget = total_ram_budget_mb
        self.cpu_budget = total_cpu_percent
        self._allocations: dict[str, ResourceAllocation] = {}
    
    async def request_resources(self, agent_id: str, ram_mb: int, cpu_pct: int) -> bool:
        current_ram = sum(a.ram_mb for a in self._allocations.values())
        current_cpu = sum(a.cpu_pct for a in self._allocations.values())
        
        if current_ram + ram_mb > self.ram_budget:
            # Try to free resources by suspending idle agents
            freed = await self._free_idle_resources(ram_mb)
            if not freed:
                return False
        
        self._allocations[agent_id] = ResourceAllocation(ram_mb, cpu_pct)
        return True
```

---

## 15. Testing & Observability

### 15.1 Agent Testing Strategy

```python
# Unit test for an agent
async def test_coding_agent_generates_python():
    agent = CodingAgent(config=test_config, event_bus=MockEventBus(), 
                        memory=MockMemory(), llm=MockLLMRouter())
    
    message = AgentMessage(
        id="test-1", source="brain", target="coding",
        type="request", intent="generate_code",
        payload={"language": "python", "description": "fibonacci function"},
        context={}, trace_id="test-trace"
    )
    
    responses = [r async for r in agent.handle_message(message)]
    assert any(r.type == "complete" for r in responses)
    assert "def fibonacci" in responses[-1].data["code"]
```

### 15.2 Observability

```python
# Every agent operation emits structured events for observability
# Frontend visualizes these as:
# - Agent activity graph (3D neural network)
# - Task timeline (Gantt-like visualization)
# - Resource usage per agent (bar charts)
# - Message flow (animated connections)
```

---

*This document specifies the complete multi-agent system for JARVIS. Implementation follows the CrewAI-inspired role/goal/backstory pattern with async-first Python architecture.*

*Last Updated: 2026-05-19*
