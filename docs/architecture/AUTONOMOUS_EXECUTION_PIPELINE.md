# JARVIS — Autonomous Execution Pipeline

## Self-Directed Task Planning & Safe Execution

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Backend → Autonomous Execution

---

## Table of Contents

1. [Execution Philosophy](#1-execution-philosophy)
2. [Task Planning Engine](#2-task-planning-engine)
3. [Execution Flow](#3-execution-flow)
4. [CrewAI Flows-Inspired Orchestration](#4-crewai-flows-inspired-orchestration)
5. [Human-in-the-Loop Gates](#5-human-in-the-loop-gates)
6. [Sandbox Environments](#6-sandbox-environments)
7. [Code Execution Runtime](#7-code-execution-runtime)
8. [Self-Correction Loops](#8-self-correction-loops)
9. [Error Recovery & Rollback](#9-error-recovery--rollback)
10. [Plan Visualization](#10-plan-visualization)
11. [Task Queue & Scheduling](#11-task-queue--scheduling)
12. [Streaming Execution Output](#12-streaming-execution-output)
13. [Agent Delegation During Execution](#13-agent-delegation-during-execution)
14. [Testing & Validation](#14-testing--validation)

---

## 1. Execution Philosophy

### 1.1 Autonomy Levels

JARVIS operates at different autonomy levels, configurable by the user:

| Level | Name | Behavior | Example |
|---|---|---|---|
| 0 | **Manual** | Ask permission for everything | "Should I create this file?" |
| 1 | **Supervised** | Execute safe actions, ask for risky ones | Read files freely, ask before write |
| 2 | **Guided** | Execute most actions, ask for destructive ones | Write files, ask before delete |
| 3 | **Autonomous** | Execute everything, report results | Full autonomy within safety bounds |
| 4 | **Full Auto** | Execute multi-step plans without interruption | Batch operations, background tasks |

**Default: Level 2 (Guided)** — Users can change at any time.

### 1.2 Safety Invariants

```
NEVER violate these invariants regardless of autonomy level:

1. Never delete files without backup (snapshot first)
2. Never execute code that modifies system files (/etc, registry, etc.)
3. Never transmit personal data to external services
4. Never install packages with known CVEs
5. Never run commands with sudo/admin unless explicitly approved
6. Never make irreversible changes without user confirmation
7. Always log every action for audit trail
```

---

## 2. Task Planning Engine

### 2.1 Plan Structure

```python
@dataclass
class TaskPlan:
    id: str
    name: str                          # "Deploy React app to Vercel"
    description: str
    status: str                        # "planning", "approved", "executing", "completed", "failed"
    steps: list[PlanStep]
    created_at: float
    estimated_duration_seconds: int
    risk_level: str                    # "low", "medium", "high", "critical"
    requires_approval: bool
    rollback_plan: Optional[list[PlanStep]]
    context: dict                      # Relevant context for execution

@dataclass
class PlanStep:
    id: str
    order: int
    description: str                   # Human-readable description
    agent: str                         # Which agent handles this
    action: str                        # Tool or function to call
    parameters: dict                   # Parameters for the action
    risk_level: str
    requires_approval: bool
    expected_output: str               # What success looks like
    rollback_action: Optional[dict]    # How to undo this step
    status: str = "pending"            # "pending", "running", "completed", "failed", "skipped"
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
```

### 2.2 Plan Generation

```python
class PlanGenerator:
    """Generate execution plans from user requests."""
    
    async def generate_plan(self, request: str, context: dict) -> TaskPlan:
        """Use LLM to decompose a request into an executable plan."""
        
        # Retrieve relevant procedural memories
        similar_procedures = await memory.recall_procedural(request, k=3)
        
        # Generate plan using LLM
        plan_prompt = f"""
You are a task planner for JARVIS AI assistant.
Decompose this user request into specific, executable steps.

Request: {request}

Available agents and their capabilities:
- coding_agent: Write code, edit files, run tests
- terminal_agent: Execute terminal commands
- file_agent: File operations (create, read, move, delete)
- web_agent: Web browsing and search
- knowledge_agent: Research and explain topics

Similar past procedures:
{format_procedures(similar_procedures)}

Output a JSON plan with steps. Each step needs:
- description, agent, action, parameters, risk_level, expected_output

Risk levels: "low" (read-only), "medium" (creates/modifies), "high" (deletes/installs), "critical" (system changes)
"""
        
        plan_json = await llm.generate_json(plan_prompt)
        
        return TaskPlan(
            id=str(uuid4()),
            name=plan_json["name"],
            description=plan_json["description"],
            status="planning",
            steps=[PlanStep(**step) for step in plan_json["steps"]],
            created_at=time.time(),
            estimated_duration_seconds=plan_json.get("estimated_seconds", 60),
            risk_level=max(s["risk_level"] for s in plan_json["steps"]),
            requires_approval=any(s["risk_level"] in ("high", "critical") for s in plan_json["steps"]),
            rollback_plan=None,
            context=context,
        )
```

---

## 3. Execution Flow

### 3.1 Main Execution Pipeline

```python
class ExecutionPipeline:
    """Execute task plans step by step."""
    
    async def execute(self, plan: TaskPlan) -> TaskResult:
        """Execute a plan, respecting autonomy level and gates."""
        
        # 1. Validate plan
        await self._validate_plan(plan)
        
        # 2. Check if approval needed
        if plan.requires_approval and self.autonomy_level < 3:
            await self._request_approval(plan)
            # Wait for user response
            approval = await self._wait_for_approval(plan.id, timeout=300)
            if not approval:
                return TaskResult(status="cancelled", reason="User declined")
        
        plan.status = "executing"
        await event_bus.emit("plan.started", plan)
        
        # 3. Execute steps sequentially
        completed_steps: list[PlanStep] = []
        
        for step in plan.steps:
            try:
                # Check step-level approval
                if step.requires_approval and self.autonomy_level < 3:
                    approved = await self._request_step_approval(step)
                    if not approved:
                        step.status = "skipped"
                        continue
                
                # Execute step
                step.status = "running"
                step.started_at = time.time()
                await event_bus.emit("step.started", step)
                
                result = await self._execute_step(step)
                
                step.result = result
                step.status = "completed"
                step.completed_at = time.time()
                completed_steps.append(step)
                
                await event_bus.emit("step.completed", step)
                
            except StepError as e:
                step.status = "failed"
                step.error = str(e)
                
                # Attempt self-correction
                corrected = await self._attempt_correction(step, e, plan)
                if not corrected:
                    # Rollback completed steps
                    await self._rollback(completed_steps)
                    plan.status = "failed"
                    return TaskResult(status="failed", error=str(e), 
                                     completed_steps=len(completed_steps))
        
        plan.status = "completed"
        await event_bus.emit("plan.completed", plan)
        
        # Learn from successful execution
        await self._learn_procedure(plan)
        
        return TaskResult(status="completed", completed_steps=len(completed_steps))
```

---

## 4. CrewAI Flows-Inspired Orchestration

### 4.1 Flow Definition

Inspired by CrewAI's Flows feature — multi-step workflows with conditional branching:

```python
class ExecutionFlow:
    """Define a multi-step execution flow with branching."""
    
    def __init__(self, name: str):
        self.name = name
        self.nodes: dict[str, FlowNode] = {}
        self.edges: list[FlowEdge] = []
        self.entry_node: Optional[str] = None
    
    def add_node(self, node_id: str, handler: Callable, 
                 condition: Optional[Callable] = None):
        self.nodes[node_id] = FlowNode(id=node_id, handler=handler, condition=condition)
    
    def add_edge(self, from_node: str, to_node: str, 
                 condition: Optional[Callable] = None):
        self.edges.append(FlowEdge(from_node=from_node, to_node=to_node, condition=condition))
    
    async def run(self, initial_state: dict) -> dict:
        """Execute the flow from entry point."""
        state = initial_state.copy()
        current = self.entry_node
        
        while current:
            node = self.nodes[current]
            
            # Execute node handler
            state = await node.handler(state)
            
            # Find next node
            current = None
            for edge in self.edges:
                if edge.from_node == node.id:
                    if edge.condition is None or await edge.condition(state):
                        current = edge.to_node
                        break
        
        return state


# Example: Code generation flow
code_flow = ExecutionFlow("code_generation")
code_flow.add_node("analyze", analyze_request)
code_flow.add_node("generate", generate_code)
code_flow.add_node("test", run_tests)
code_flow.add_node("fix", fix_errors)
code_flow.add_node("commit", commit_changes)

code_flow.add_edge("analyze", "generate")
code_flow.add_edge("generate", "test")
code_flow.add_edge("test", "commit", condition=lambda s: s["tests_passed"])
code_flow.add_edge("test", "fix", condition=lambda s: not s["tests_passed"])
code_flow.add_edge("fix", "test")  # Loop back to test after fix

code_flow.entry_node = "analyze"
```

### 4.2 Pipeline Patterns

```
Sequential:      A → B → C → D
Conditional:     A → B → [pass? C : D] → E
Loop:           A → B → [pass? C : B] (retry)
Fan-Out:        A → [B, C, D] → E (parallel)
Saga:           A → B → C → (fail? rollback C → B → A)
```

---

## 5. Human-in-the-Loop Gates

### 5.1 Gate Types

```python
class ApprovalGate:
    """Gates that require human approval before proceeding."""
    
    GATE_TYPES = {
        "confirm": {
            "description": "Simple yes/no confirmation",
            "ui": "dialog",
            "timeout": 60,
        },
        "review": {
            "description": "Review content before applying",
            "ui": "diff_viewer",
            "timeout": 300,
        },
        "choose": {
            "description": "Choose between multiple options",
            "ui": "selection",
            "timeout": 120,
        },
        "edit": {
            "description": "Allow user to edit before applying",
            "ui": "editor",
            "timeout": 600,
        },
    }
    
    async def request_approval(self, gate_type: str, context: dict) -> ApprovalResult:
        """Send approval request to frontend, wait for response."""
        request = ApprovalRequest(
            id=str(uuid4()),
            type=gate_type,
            context=context,
            timeout=self.GATE_TYPES[gate_type]["timeout"],
        )
        
        await event_bus.emit("approval.requested", request)
        
        # Wait for response
        try:
            response = await asyncio.wait_for(
                self._wait_for_response(request.id),
                timeout=request.timeout
            )
            return response
        except asyncio.TimeoutError:
            return ApprovalResult(approved=False, reason="timeout")
```

### 5.2 When Gates Trigger

| Action | Level 0 | Level 1 | Level 2 | Level 3 | Level 4 |
|---|---|---|---|---|---|
| Read file | GATE | ✓ | ✓ | ✓ | ✓ |
| Write file | GATE | GATE | ✓ | ✓ | ✓ |
| Delete file | GATE | GATE | GATE | ✓ | ✓ |
| Run terminal cmd | GATE | GATE | ✓ | ✓ | ✓ |
| Install package | GATE | GATE | GATE | ✓ | ✓ |
| Network request | GATE | ✓ | ✓ | ✓ | ✓ |
| System modification | GATE | GATE | GATE | GATE | GATE |
| Code execution | GATE | GATE | ✓ | ✓ | ✓ |
| Browser automation | GATE | GATE | GATE | ✓ | ✓ |

---

## 6. Sandbox Environments

### 6.1 Sandbox Tiers (Inspired by OpenHands)

```python
class SandboxManager:
    """Manage isolated execution environments."""
    
    SANDBOX_TIERS = {
        "in_process": {
            "description": "Run in the main Python process",
            "isolation": "none",
            "use_case": "Safe read-only operations, computation",
            "overhead": "0ms",
        },
        "subprocess": {
            "description": "Isolated subprocess with resource limits",
            "isolation": "process",
            "use_case": "Terminal commands, script execution",
            "overhead": "~50ms",
        },
        "docker": {
            "description": "Full Docker container isolation",
            "isolation": "container",
            "use_case": "Untrusted code, risky operations",
            "overhead": "~500ms",
        },
    }
    
    async def create_sandbox(self, tier: str, config: dict = None) -> Sandbox:
        if tier == "subprocess":
            return SubprocessSandbox(config)
        elif tier == "docker":
            return DockerSandbox(config)
        else:
            return InProcessSandbox(config)
```

### 6.2 Subprocess Sandbox

```python
class SubprocessSandbox:
    """Execute commands in an isolated subprocess with resource limits."""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.timeout = self.config.get("timeout", 30)
        self.max_memory_mb = self.config.get("max_memory_mb", 512)
        self.allowed_paths = self.config.get("allowed_paths", [])
        self.working_dir = self.config.get("working_dir", tempfile.mkdtemp())
    
    async def execute(self, command: str) -> ExecutionResult:
        """Execute a command in the sandbox."""
        
        # Validate command against blocklist
        self._validate_command(command)
        
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.working_dir,
                env=self._get_safe_env(),
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), 
                timeout=self.timeout
            )
            
            return ExecutionResult(
                exit_code=process.returncode,
                stdout=stdout.decode(),
                stderr=stderr.decode(),
            )
            
        except asyncio.TimeoutError:
            process.kill()
            return ExecutionResult(exit_code=-1, stderr="Execution timed out")
    
    def _validate_command(self, command: str):
        """Block dangerous commands."""
        BLOCKED = [
            "rm -rf /", "del /s /q C:\\", "format", "mkfs",
            ":(){ :|:& };:", "dd if=", "> /dev/sda",
            "shutdown", "reboot", "halt",
        ]
        for blocked in BLOCKED:
            if blocked in command:
                raise DangerousCommandError(f"Blocked command pattern: {blocked}")
    
    def _get_safe_env(self) -> dict:
        """Return a sanitized environment."""
        safe_env = {
            "PATH": os.environ.get("PATH", ""),
            "HOME": self.working_dir,
            "TEMP": os.path.join(self.working_dir, "tmp"),
            "LANG": "en_US.UTF-8",
        }
        return safe_env
```

### 6.3 Docker Sandbox

```python
class DockerSandbox:
    """Full container isolation for untrusted code execution."""
    
    IMAGE = "jarvis-sandbox:latest"
    
    async def create(self) -> str:
        """Create a Docker container for code execution."""
        container = await self.docker_client.containers.create(
            image=self.IMAGE,
            command="sleep infinity",
            mem_limit="512m",
            cpu_period=100000,
            cpu_quota=50000,     # 50% CPU
            network_mode="none",  # No network access
            read_only=True,       # Read-only root filesystem
            tmpfs={"/tmp": "size=100m"},  # Writable /tmp
            security_opt=["no-new-privileges"],
        )
        await container.start()
        return container.id
    
    async def execute_in_container(self, container_id: str, command: str) -> ExecutionResult:
        container = await self.docker_client.containers.get(container_id)
        exec_result = await container.exec_run(
            cmd=["sh", "-c", command],
            workdir="/workspace",
        )
        return ExecutionResult(
            exit_code=exec_result.exit_code,
            stdout=exec_result.output.decode(),
        )
```

---

## 7. Code Execution Runtime

### 7.1 Safe Code Runner

```python
class CodeRunner:
    """Execute code with safety measures."""
    
    SUPPORTED_LANGUAGES = {
        "python": {"extension": ".py", "command": "python {file}", "sandbox": "subprocess"},
        "javascript": {"extension": ".js", "command": "node {file}", "sandbox": "subprocess"},
        "typescript": {"extension": ".ts", "command": "npx ts-node {file}", "sandbox": "subprocess"},
        "shell": {"extension": ".sh", "command": "bash {file}", "sandbox": "subprocess"},
    }
    
    async def run(self, code: str, language: str, sandbox_tier: str = None) -> ExecutionResult:
        """Execute code in the appropriate sandbox."""
        
        if language not in self.SUPPORTED_LANGUAGES:
            raise UnsupportedLanguageError(language)
        
        lang_config = self.SUPPORTED_LANGUAGES[language]
        tier = sandbox_tier or lang_config["sandbox"]
        
        # Write code to temp file
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, f"script{lang_config['extension']}")
        with open(file_path, "w") as f:
            f.write(code)
        
        # Create sandbox and execute
        sandbox = await self.sandbox_manager.create_sandbox(tier, {
            "working_dir": temp_dir,
            "timeout": 30,
        })
        
        command = lang_config["command"].format(file=file_path)
        result = await sandbox.execute(command)
        
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return result
```

---

## 8. Self-Correction Loops

### 8.1 Error Analysis & Retry

```python
class SelfCorrector:
    """Analyze failures and attempt automatic correction."""
    
    MAX_RETRIES = 3
    
    async def attempt_correction(self, step: PlanStep, error: StepError, 
                                  plan: TaskPlan) -> bool:
        """Attempt to correct a failed step."""
        
        for attempt in range(self.MAX_RETRIES):
            # 1. Analyze the error
            analysis = await self._analyze_error(step, error)
            
            if analysis.is_correctable:
                # 2. Generate corrected step
                corrected_step = await self._generate_correction(
                    step, error, analysis, attempt
                )
                
                # 3. Execute corrected step
                try:
                    result = await self.executor.execute_step(corrected_step)
                    step.result = result
                    step.status = "completed"
                    logger.info(f"Self-correction succeeded on attempt {attempt + 1}")
                    return True
                except StepError as new_error:
                    error = new_error
                    continue
            else:
                break
        
        return False
    
    async def _analyze_error(self, step: PlanStep, error: StepError) -> ErrorAnalysis:
        """Use LLM to analyze the error and suggest fixes."""
        analysis_prompt = f"""
Analyze this execution error and determine if it can be automatically fixed.

Step: {step.description}
Action: {step.action}
Parameters: {step.parameters}
Error: {error}

Can this be automatically fixed? If yes, what should change?
Respond with JSON: {{"is_correctable": bool, "fix_strategy": str, "modified_parameters": dict}}
"""
        return await llm.generate_json(analysis_prompt)
```

### 8.2 Common Self-Correction Patterns

| Error Type | Correction Strategy |
|---|---|
| File not found | Search for file, correct path |
| Import error | Install missing package, retry |
| Syntax error in generated code | Regenerate with error context |
| Permission denied | Switch sandbox tier or request elevation |
| Timeout | Increase timeout, optimize command |
| Port in use | Find available port, retry |
| Test failure | Analyze output, fix code, re-test |

---

## 9. Error Recovery & Rollback

### 9.1 Rollback Engine

```python
class RollbackEngine:
    """Undo completed steps when a plan fails."""
    
    async def rollback(self, completed_steps: list[PlanStep]):
        """Rollback steps in reverse order."""
        for step in reversed(completed_steps):
            if step.rollback_action:
                try:
                    logger.info(f"Rolling back: {step.description}")
                    await self._execute_rollback(step.rollback_action)
                except Exception as e:
                    logger.error(f"Rollback failed for step {step.id}: {e}")
                    # Continue rolling back other steps
    
    async def _execute_rollback(self, rollback_action: dict):
        """Execute a single rollback action."""
        action_type = rollback_action["type"]
        
        if action_type == "restore_file":
            # Restore file from snapshot
            await self._restore_file(rollback_action["path"], rollback_action["snapshot_id"])
        
        elif action_type == "delete_file":
            # Delete a created file
            os.remove(rollback_action["path"])
        
        elif action_type == "run_command":
            # Run an undo command
            await subprocess_execute(rollback_action["command"])
```

### 9.2 File Snapshotting

```python
class FileSnapshot:
    """Snapshot files before modification for rollback capability."""
    
    SNAPSHOT_DIR = "data/snapshots"
    
    async def snapshot(self, file_path: str) -> str:
        """Create a snapshot of a file, return snapshot ID."""
        snapshot_id = str(uuid4())
        
        if os.path.exists(file_path):
            snapshot_path = os.path.join(self.SNAPSHOT_DIR, snapshot_id)
            shutil.copy2(file_path, snapshot_path)
        
        # Record in database
        await db.execute(
            "INSERT INTO file_snapshots (id, original_path, created_at) VALUES (?, ?, ?)",
            (snapshot_id, file_path, time.time())
        )
        
        return snapshot_id
    
    async def restore(self, snapshot_id: str):
        """Restore a file from snapshot."""
        row = await db.query_one(
            "SELECT * FROM file_snapshots WHERE id = ?", (snapshot_id,)
        )
        
        snapshot_path = os.path.join(self.SNAPSHOT_DIR, snapshot_id)
        if os.path.exists(snapshot_path):
            shutil.copy2(snapshot_path, row["original_path"])
```

---

## 10. Plan Visualization

### 10.1 Frontend Plan Display

The execution plan is visualized in the UI as an interactive flowchart:

```typescript
interface PlanVisualization {
    // Node for each step
    nodes: PlanNode[];
    // Edges showing step order
    edges: PlanEdge[];
    // Current execution position
    activeNodeId: string | null;
    // Overall progress
    progress: number; // 0-100
}

interface PlanNode {
    id: string;
    label: string;
    agent: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    duration?: number; // milliseconds
    requiresApproval: boolean;
}
```

### 10.2 WebSocket Events

```python
# Events emitted during execution for real-time UI updates
EXECUTION_EVENTS = [
    "plan.created",        # New plan generated
    "plan.started",        # Execution begun
    "plan.completed",      # All steps done
    "plan.failed",         # Execution failed
    "step.started",        # Individual step started
    "step.completed",      # Individual step done
    "step.failed",         # Individual step failed
    "step.output",         # Streaming output from a step
    "approval.requested",  # Human approval needed
    "approval.received",   # Human responded
    "correction.attempt",  # Self-correction in progress
    "rollback.started",    # Rolling back changes
    "rollback.completed",  # Rollback finished
]
```

---

## 11. Task Queue & Scheduling

### 11.1 Task Queue

```python
class TaskQueue:
    """Priority queue for pending tasks."""
    
    def __init__(self):
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._active_task: Optional[TaskPlan] = None
    
    async def enqueue(self, plan: TaskPlan, priority: int = 5):
        """Add a task to the queue. Lower priority number = higher priority."""
        await self._queue.put((priority, time.time(), plan))
    
    async def process_loop(self):
        """Main processing loop — execute tasks from queue."""
        while True:
            # Wait for next task
            priority, queued_at, plan = await self._queue.get()
            
            self._active_task = plan
            try:
                result = await self.executor.execute(plan)
                await event_bus.emit("task.completed", {"plan_id": plan.id, "result": result})
            except Exception as e:
                await event_bus.emit("task.failed", {"plan_id": plan.id, "error": str(e)})
            finally:
                self._active_task = None
                self._queue.task_done()
```

### 11.2 Scheduled Tasks

```python
class TaskScheduler:
    """Schedule recurring or delayed tasks."""
    
    async def schedule(self, plan: TaskPlan, schedule: str):
        """Schedule a task. Supports: 'once:TIMESTAMP', 'cron:EXPRESSION', 'interval:SECONDS'"""
        
        if schedule.startswith("once:"):
            timestamp = float(schedule[5:])
            delay = timestamp - time.time()
            asyncio.get_event_loop().call_later(delay, lambda: asyncio.create_task(
                self.queue.enqueue(plan)
            ))
        
        elif schedule.startswith("interval:"):
            interval = int(schedule[9:])
            async def recurring():
                while True:
                    await self.queue.enqueue(plan)
                    await asyncio.sleep(interval)
            asyncio.create_task(recurring())
        
        elif schedule.startswith("cron:"):
            # Parse cron expression and schedule
            cron_expr = schedule[5:]
            asyncio.create_task(self._cron_loop(plan, cron_expr))
```

---

## 12. Streaming Execution Output

### 12.1 Output Streaming

```python
class OutputStreamer:
    """Stream execution output to the frontend in real-time."""
    
    async def stream_step_output(self, step_id: str, output_stream):
        """Stream output from a running step to WebSocket."""
        buffer = []
        FLUSH_INTERVAL = 0.1  # 100ms
        
        async def flush():
            if buffer:
                await event_bus.emit("step.output", {
                    "step_id": step_id,
                    "lines": buffer.copy(),
                    "timestamp": time.time(),
                })
                buffer.clear()
        
        async for line in output_stream:
            buffer.append(line)
            if len(buffer) >= 10:
                await flush()
        
        await flush()  # Final flush
```

---

## 13. Agent Delegation During Execution

### 13.1 Multi-Agent Execution

```python
async def execute_step(self, step: PlanStep) -> Any:
    """Execute a single step by delegating to the appropriate agent."""
    
    # Get the agent for this step
    agent = await self.agent_loader.get(step.agent)
    
    # Prepare the agent task
    task = AgentTask(
        description=step.description,
        action=step.action,
        parameters=step.parameters,
        context=self.plan.context,
        timeout=step.timeout or 60,
    )
    
    # Execute via the agent
    result = await agent.execute_task(task)
    
    return result
```

---

## 14. Testing & Validation

### 14.1 Plan Validation

```python
class PlanValidator:
    """Validate plans before execution."""
    
    async def validate(self, plan: TaskPlan) -> list[str]:
        """Return list of validation errors (empty = valid)."""
        errors = []
        
        # Check all referenced agents exist
        for step in plan.steps:
            if step.agent not in self.available_agents:
                errors.append(f"Step {step.order}: Unknown agent '{step.agent}'")
        
        # Check dependencies make sense
        for i, step in enumerate(plan.steps):
            if step.action == "write_file" and i > 0:
                prev = plan.steps[i-1]
                # Ensure we're not writing before reading
        
        # Check risk levels are consistent
        if plan.risk_level == "low" and any(s.risk_level in ("high", "critical") for s in plan.steps):
            errors.append("Plan risk level 'low' but contains high-risk steps")
        
        return errors
```

---

*This document specifies the autonomous execution pipeline for JARVIS. The execution engine is what allows JARVIS to go beyond chat — it can plan, execute, self-correct, and learn from every task.*

*Last Updated: 2026-05-19*
