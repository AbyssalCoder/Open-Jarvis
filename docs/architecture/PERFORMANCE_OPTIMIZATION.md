# JARVIS — Performance Optimization

## Comprehensive Performance Engineering Specification

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Cross-Cutting → Performance

---

## Table of Contents

1. [Performance Philosophy](#1-performance-philosophy)
2. [Hardware Profiles & Adaptive Scaling](#2-hardware-profiles--adaptive-scaling)
3. [RAM Optimization](#3-ram-optimization)
4. [VRAM Optimization](#4-vram-optimization)
5. [CPU Optimization](#5-cpu-optimization)
6. [GPU Rendering Pipeline](#6-gpu-rendering-pipeline)
7. [Frontend Frame Budget](#7-frontend-frame-budget)
8. [Backend Async Performance](#8-backend-async-performance)
9. [LLM Inference Optimization](#9-llm-inference-optimization)
10. [Lazy Loading & Code Splitting](#10-lazy-loading--code-splitting)
11. [Caching Architecture](#11-caching-architecture)
12. [Startup Optimization](#12-startup-optimization)
13. [Adaptive Quality System](#13-adaptive-quality-system)
14. [Benchmarking & Monitoring](#14-benchmarking--monitoring)

---

## 1. Performance Philosophy

### 1.1 Non-Negotiable Targets

| Metric | Target | Hard Limit |
|---|---|---|
| UI frame rate | 60fps | Never below 30fps |
| Cold start time | < 3 seconds | Never above 5 seconds |
| Hot start (from tray) | < 1 second | Never above 2 seconds |
| First LLM token | < 2 seconds | Never above 5 seconds |
| Voice-to-first-audio | < 1.5 seconds | Never above 3 seconds |
| Idle CPU usage | < 2% | Never above 5% |
| Idle RAM usage | < 300MB | Never above 500MB |
| WebSocket round-trip | < 10ms | Never above 50ms |
| Memory recall (vector) | < 50ms | Never above 200ms |
| UI interaction response | < 100ms | Never above 200ms |

### 1.2 Design-for-Low-End-First

Every feature is designed to run on the minimum spec first:
- **Minimum:** 8GB RAM, integrated graphics, 4-core CPU
- **Recommended:** 16GB RAM, 6GB VRAM GPU, 8-core CPU
- **Optimal:** 32GB RAM, 12GB+ VRAM GPU, 12-core CPU

The system MUST be usable on minimum spec. Higher hardware unlocks richer visuals and larger models, never core functionality.

### 1.3 The "Never Block" Rule

```
NEVER block the:
1. UI thread (React render loop)
2. Three.js render loop (requestAnimationFrame)
3. Python asyncio event loop
4. WebSocket message handler
5. User input handler

ALL heavy work goes to:
- Web Workers (frontend computation)
- Worker threads (Three.js heavy geometry)
- asyncio.run_in_executor() (CPU-bound Python)
- Subprocess (model inference, external tools)
```

---

## 2. Hardware Profiles & Adaptive Scaling

### 2.1 Hardware Detection

```python
import psutil
import subprocess

@dataclass
class HardwareProfile:
    cpu_cores: int
    cpu_threads: int
    cpu_freq_mhz: int
    total_ram_mb: int
    available_ram_mb: int
    gpu_name: str
    gpu_vram_mb: int
    gpu_type: str             # "nvidia", "amd", "intel", "none"
    disk_type: str            # "ssd", "hdd"
    disk_free_gb: int

    @property
    def performance_tier(self) -> str:
        """Classify hardware into performance tier."""
        if self.gpu_vram_mb >= 12000 and self.total_ram_mb >= 32000:
            return "ultra"
        elif self.gpu_vram_mb >= 6000 and self.total_ram_mb >= 16000:
            return "high"
        elif self.gpu_vram_mb >= 4000 and self.total_ram_mb >= 12000:
            return "medium"
        elif self.total_ram_mb >= 8000:
            return "low"
        else:
            return "minimal"

def detect_hardware() -> HardwareProfile:
    cpu = psutil.cpu_count(logical=False)
    threads = psutil.cpu_count(logical=True)
    freq = psutil.cpu_freq().max if psutil.cpu_freq() else 0
    ram = psutil.virtual_memory()
    
    # GPU detection via nvidia-smi or fallback
    gpu_name, gpu_vram, gpu_type = _detect_gpu()
    
    return HardwareProfile(
        cpu_cores=cpu, cpu_threads=threads, cpu_freq_mhz=int(freq),
        total_ram_mb=int(ram.total / 1024 / 1024),
        available_ram_mb=int(ram.available / 1024 / 1024),
        gpu_name=gpu_name, gpu_vram_mb=gpu_vram, gpu_type=gpu_type,
        disk_type=_detect_disk_type(),
        disk_free_gb=int(psutil.disk_usage('/').free / 1024 / 1024 / 1024)
    )
```

### 2.2 Performance Profiles

```python
PERFORMANCE_PROFILES = {
    "ultra": {
        "ui_quality": "ULTRA",
        "max_particles": 10000,
        "post_processing": ["bloom", "chromatic", "vignette", "ssao", "god_rays"],
        "shadow_quality": "high",
        "antialiasing": "msaa_4x",
        "max_concurrent_models": 3,
        "default_quantization": "Q6_K",
        "max_context_tokens": 32768,
        "voice_model": "whisper-large-v3",
        "tts_model": "xtts-v2",
        "background_workers": 8,
    },
    "high": {
        "ui_quality": "HIGH",
        "max_particles": 5000,
        "post_processing": ["bloom", "chromatic", "vignette"],
        "shadow_quality": "medium",
        "antialiasing": "msaa_2x",
        "max_concurrent_models": 2,
        "default_quantization": "Q4_K_M",
        "max_context_tokens": 16384,
        "voice_model": "whisper-medium",
        "tts_model": "piper-hq",
        "background_workers": 6,
    },
    "medium": {
        "ui_quality": "MEDIUM",
        "max_particles": 2000,
        "post_processing": ["bloom"],
        "shadow_quality": "low",
        "antialiasing": "fxaa",
        "max_concurrent_models": 1,
        "default_quantization": "Q4_K_M",
        "max_context_tokens": 8192,
        "voice_model": "whisper-small",
        "tts_model": "piper",
        "background_workers": 4,
    },
    "low": {
        "ui_quality": "LOW",
        "max_particles": 500,
        "post_processing": [],
        "shadow_quality": "none",
        "antialiasing": "none",
        "max_concurrent_models": 1,
        "default_quantization": "Q4_K_M",
        "max_context_tokens": 4096,
        "voice_model": "whisper-base",
        "tts_model": "piper-fast",
        "background_workers": 2,
    },
    "minimal": {
        "ui_quality": "MINIMAL",
        "max_particles": 100,
        "post_processing": [],
        "shadow_quality": "none",
        "antialiasing": "none",
        "max_concurrent_models": 1,
        "default_quantization": "Q3_K_M",
        "max_context_tokens": 2048,
        "voice_model": "whisper-tiny",
        "tts_model": "piper-fast",
        "background_workers": 1,
    },
}
```

---

## 3. RAM Optimization

### 3.1 Memory Budget (8GB System)

```
Total RAM: 8192MB
├── OS + Services:       ~2500MB
├── Tauri Shell:           ~80MB    (vs ~300MB Electron)
├── WebView2 (Frontend):  ~200MB
├── Python Backend:       ~150MB
├── Agent Framework:       ~50MB
├── SQLite + ChromaDB:     ~50MB
├── Voice Pipeline:       ~100MB    (Whisper-base loaded)
├── Available for LLM:  ~4500MB    ← One 7B Q4 model fits here
└── Headroom:             ~500MB    ← Safety buffer
```

### 3.2 RAM Strategies

| Strategy | Implementation | Savings |
|---|---|---|
| **Tauri over Electron** | WebView2 vs Chromium | ~220MB |
| **Lazy agent loading** | Only instantiate on first use | ~200MB |
| **Model memory-mapping** | mmap GGUF files, OS manages paging | Variable |
| **Single embedding model** | Share one instance across all agents | ~300MB |
| **Context window pruning** | Compress old conversation turns | ~100MB |
| **Worker pool reuse** | Don't spawn new processes per task | ~50MB/worker |
| **Frontend code splitting** | Dynamic imports via React.lazy | ~100MB |
| **Texture compression** | KTX2/Basis for 3D textures | ~200MB |
| **SQLite WAL mode** | Lower memory overhead vs rollback journal | ~20MB |
| **Aggressive GC** | Force Python gc.collect() after model unload | Variable |

### 3.3 Memory Monitoring & Emergency Response

```python
class MemoryWatchdog:
    THRESHOLDS = {
        "normal": 70,      # Below 70% — normal operation
        "warning": 80,     # 80% — start optimizing
        "critical": 90,    # 90% — emergency cleanup
        "emergency": 95,   # 95% — panic mode
    }
    
    async def monitor_loop(self):
        while True:
            usage = psutil.virtual_memory().percent
            
            if usage >= self.THRESHOLDS["emergency"]:
                await self._emergency_cleanup()
            elif usage >= self.THRESHOLDS["critical"]:
                await self._critical_cleanup()
            elif usage >= self.THRESHOLDS["warning"]:
                await self._gentle_optimization()
            
            await asyncio.sleep(5)
    
    async def _emergency_cleanup(self):
        """Panic: unload ALL models, clear all caches."""
        await model_manager.unload_all()
        cache.clear_all()
        gc.collect()
        await event_bus.emit("system.memory.emergency")
    
    async def _critical_cleanup(self):
        """Unload non-essential models, prune caches."""
        await model_manager.unload_idle()
        cache.prune(keep_percent=0.3)
        gc.collect()
    
    async def _gentle_optimization(self):
        """Suggest model downgrades, prune old cache entries."""
        cache.prune(keep_percent=0.7)
```

---

## 4. VRAM Optimization

### 4.1 VRAM Budget Allocation

```
VRAM Budget (6GB GPU example):
├── WebGL Rendering:      ~300MB    (reserved, never share with LLM)
├── LLM Inference:       ~4500MB    (7B Q4 with KV cache)
├── KV Cache:             ~500MB    (dynamic, scales with context)
└── Headroom:             ~700MB    (safety buffer)

Rule: WebGL always gets its reservation FIRST.
      LLM gets the remainder.
```

### 4.2 VRAM Strategies

```python
class VRAMManager:
    def __init__(self, total_vram_mb: int, webgl_reservation_mb: int = 300):
        self.total = total_vram_mb
        self.webgl_reserved = webgl_reservation_mb
        self.available_for_models = total_vram_mb - webgl_reservation_mb
        self._loaded_models: dict[str, int] = {}  # model_id → vram_used_mb
    
    def can_load_model(self, model_vram_mb: int) -> bool:
        used = sum(self._loaded_models.values())
        return (used + model_vram_mb) <= self.available_for_models
    
    async def ensure_space(self, needed_mb: int):
        """Free VRAM by unloading idle models until space is available."""
        while not self.can_load_model(needed_mb):
            idle_model = self._find_least_recently_used()
            if idle_model is None:
                raise InsufficientVRAMError()
            await self._unload(idle_model)
    
    def get_optimal_gpu_layers(self, model_total_layers: int, model_per_layer_mb: float) -> int:
        """Calculate how many layers to offload to GPU."""
        available = self.available_for_models - sum(self._loaded_models.values())
        max_layers = int(available / model_per_layer_mb)
        return min(max_layers, model_total_layers)
```

### 4.3 GPU Layer Auto-Tuning

| GPU VRAM | Strategy | GPU Layers (7B model) |
|---|---|---|
| 0 GB | CPU-only inference | 0 |
| 2 GB | Partial offload | ~8 of 32 |
| 4 GB | Partial offload | ~20 of 32 |
| 6 GB | Full model offload | 32 (all) |
| 8 GB | Full + large KV cache | 32 + generous KV |
| 12 GB+ | Full model + WebGL headroom | 32 + 2nd model possible |

---

## 5. CPU Optimization

### 5.1 Thread Allocation

```python
def allocate_threads(cpu_threads: int) -> dict:
    """Allocate CPU threads across subsystems."""
    return {
        "asyncio_event_loop": 1,               # Main event loop (never block)
        "llm_inference": max(2, cpu_threads // 3),  # llama.cpp threads
        "voice_processing": 2,                  # STT + TTS
        "io_pool": min(4, cpu_threads // 2),    # File I/O, DB queries
        "background_workers": max(1, cpu_threads // 4),
    }

# Example: 8-thread CPU
# asyncio: 1, LLM: 2, voice: 2, I/O: 4, background: 2
# (Note: pools share threads when idle)
```

### 5.2 CPU-Bound Work Isolation

```python
# NEVER run CPU-bound work in the asyncio event loop
# ALWAYS use run_in_executor or subprocess

# Bad:
async def bad_embedding():
    embedding = compute_embedding(text)  # Blocks event loop!

# Good:
async def good_embedding():
    loop = asyncio.get_event_loop()
    embedding = await loop.run_in_executor(
        thread_pool, compute_embedding, text
    )

# Best (for heavy inference):
async def best_inference():
    # Use subprocess for complete isolation
    result = await run_in_subprocess(inference_function, prompt)
```

### 5.3 SIMD & Optimized Libraries

| Operation | Library | SIMD Support |
|---|---|---|
| Matrix ops | NumPy (OpenBLAS/MKL) | AVX2, AVX-512 |
| Inference | llama.cpp | AVX2, AVX-512, ARM NEON |
| Embeddings | ONNX Runtime | CPU optimization |
| Audio | Faster-Whisper (CTranslate2) | AVX2, INT8 |
| Image | Pillow-SIMD | SSE4, AVX2 |

---

## 6. GPU Rendering Pipeline

### 6.1 Three.js Rendering Optimization

```typescript
// Renderer configuration
const renderer = new THREE.WebGLRenderer({
    antialias: profile.antialiasing !== 'none',
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,              // Disable if not using stencil ops
    depth: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
```

### 6.2 Draw Call Optimization

| Technique | When to Use | Draw Call Reduction |
|---|---|---|
| **InstancedMesh** | Agent nodes (20 similar objects) | 20 → 1 |
| **Merged geometry** | Static environment pieces | N → 1 |
| **Texture atlasing** | Multiple icons/labels | N materials → 1 |
| **LOD (Level of Detail)** | Distant objects | Fewer polygons |
| **Frustum culling** | Off-screen objects | Auto by Three.js |
| **Occlusion culling** | Hidden objects | Manual for complex scenes |

### 6.3 Shader Optimization

```glsl
// Performance-conscious fragment shader
// Avoid: branching, texture-dependent branching, excessive math
// Prefer: step(), mix(), smoothstep() over if/else

// Bad:
if (uv.x > 0.5) {
    color = texture(tex1, uv);
} else {
    color = texture(tex2, uv);
}

// Good:
float mask = step(0.5, uv.x);
color = mix(texture(tex2, uv), texture(tex1, uv), mask);
```

---

## 7. Frontend Frame Budget

### 7.1 Budget Allocation (16.67ms for 60fps)

```
Total budget: 16.67ms per frame
├── React reconciliation:   2.0ms   (12%)
├── Three.js scene update:  2.0ms   (12%)
├── Shader execution:       3.0ms   (18%)
├── Post-processing:        2.5ms   (15%)
├── Particle update:        2.0ms   (12%)
├── HUD/DOM overlay:        1.5ms   (9%)
├── Audio processing:       0.5ms   (3%)
├── WebSocket messages:     0.5ms   (3%)
├── State management:       0.5ms   (3%)
└── Headroom:               2.17ms  (13%)
```

### 7.2 React Optimization

```typescript
// 1. Memoize expensive components
const AgentNode = React.memo(({ agent }: { agent: Agent }) => {
    // Only re-renders if agent reference changes
    return <mesh position={agent.position}>...</mesh>;
});

// 2. Use refs for frequently-changing values (don't trigger re-render)
function ParticleSystem() {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    useFrame((state, delta) => {
        // Update particles directly via ref — no React re-render
        meshRef.current.instanceMatrix.needsUpdate = true;
    });
}

// 3. Split state: fast-changing vs slow-changing
const useUIStore = create<UIState>()((set) => ({
    // Slow state (triggers re-renders, but rarely changes)
    currentScene: 'command-center',
    sidebarOpen: true,
    
    // Fast state lives in refs, not Zustand
}));

// 4. Debounce expensive state updates
const debouncedSetMetrics = useMemo(
    () => debounce((metrics: SystemMetrics) => setMetrics(metrics), 1000),
    []
);
```

### 7.3 Three.js Optimization

```typescript
// 1. Object pooling — reuse geometry/materials
const sharedGeometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
const sharedMaterial = useMemo(() => new THREE.MeshStandardMaterial({...}), []);

// 2. Dispose on unmount
useEffect(() => {
    return () => {
        geometry.dispose();
        material.dispose();
        texture.dispose();
    };
}, []);

// 3. Use InstancedMesh for repeated objects
function AgentNodes({ agents }: { agents: Agent[] }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const temp = useMemo(() => new THREE.Object3D(), []);
    
    useFrame(() => {
        agents.forEach((agent, i) => {
            temp.position.set(...agent.position);
            temp.updateMatrix();
            meshRef.current!.setMatrixAt(i, temp.matrix);
        });
        meshRef.current!.instanceMatrix.needsUpdate = true;
    });
    
    return (
        <instancedMesh ref={meshRef} args={[sharedGeometry, sharedMaterial, agents.length]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#00F0FF" />
        </instancedMesh>
    );
}
```

---

## 8. Backend Async Performance

### 8.1 Event Loop Protection

```python
# Global rule: NEVER block the event loop for more than 1ms

# Monitor event loop lag
class EventLoopMonitor:
    def __init__(self, threshold_ms: float = 50):
        self.threshold = threshold_ms
    
    async def monitor(self):
        while True:
            start = time.perf_counter()
            await asyncio.sleep(0)  # Yield to event loop
            lag = (time.perf_counter() - start) * 1000
            
            if lag > self.threshold:
                logger.warning(f"Event loop lag: {lag:.1f}ms")
                # Could trigger: reduce background work, defer non-critical tasks
            
            await asyncio.sleep(0.1)
```

### 8.2 Connection Pooling

```python
# Database connection pool
async def create_db_pool():
    return aiosqlite.connect(
        "data/db/jarvis.db",
        isolation_level="DEFERRED",
    )

# HTTP connection pool (for API calls)
http_session = aiohttp.ClientSession(
    connector=aiohttp.TCPConnector(
        limit=20,         # Max connections
        limit_per_host=5, # Per-host limit
        keepalive_timeout=30,
    ),
    timeout=aiohttp.ClientTimeout(total=30),
)
```

### 8.3 Streaming Response Pipeline

```python
async def stream_response(websocket, generator):
    """Stream tokens with backpressure handling."""
    buffer = []
    BATCH_SIZE = 5  # Send tokens in small batches to reduce WS overhead
    
    async for token in generator:
        buffer.append(token)
        if len(buffer) >= BATCH_SIZE:
            await websocket.send_json({
                "type": "ai.tokens",
                "data": {"tokens": buffer}
            })
            buffer = []
    
    # Flush remaining
    if buffer:
        await websocket.send_json({
            "type": "ai.tokens",
            "data": {"tokens": buffer, "final": True}
        })
```

---

## 9. LLM Inference Optimization

### 9.1 llama.cpp Configuration

```python
# Optimal llama-cpp-python settings per hardware tier
LLAMA_CONFIGS = {
    "low": {
        "n_ctx": 2048,        # Small context window
        "n_batch": 256,       # Small batch
        "n_threads": 4,
        "n_gpu_layers": 0,    # CPU only
        "use_mmap": True,
        "use_mlock": False,   # Don't lock in RAM on low-memory systems
        "f16_kv": True,       # Half-precision KV cache
    },
    "medium": {
        "n_ctx": 4096,
        "n_batch": 512,
        "n_threads": 6,
        "n_gpu_layers": "auto",  # Detect available VRAM
        "use_mmap": True,
        "use_mlock": False,
        "f16_kv": True,
    },
    "high": {
        "n_ctx": 8192,
        "n_batch": 1024,
        "n_threads": 8,
        "n_gpu_layers": -1,   # All layers on GPU
        "use_mmap": True,
        "use_mlock": True,    # Lock model in RAM
        "f16_kv": True,
    },
    "ultra": {
        "n_ctx": 32768,
        "n_batch": 2048,
        "n_threads": 12,
        "n_gpu_layers": -1,
        "use_mmap": True,
        "use_mlock": True,
        "f16_kv": False,      # Full precision KV for quality
        "flash_attn": True,   # Flash attention if supported
    },
}
```

### 9.2 Speculative Decoding (Future)

```python
# Use small draft model to generate candidates, large model to verify
# Speeds up inference by 2-3x with same output quality
async def speculative_generate(prompt, draft_model, target_model, k=5):
    draft_tokens = await draft_model.generate(prompt, n_tokens=k)
    verified = await target_model.verify(prompt, draft_tokens)
    return verified
```

### 9.3 KV Cache Management

```python
class KVCacheManager:
    """Manage KV cache to prevent VRAM overflow."""
    
    def __init__(self, max_cache_mb: int):
        self.max_cache = max_cache_mb
        self.current_size = 0
    
    def estimate_cache_size(self, n_ctx: int, n_layers: int, n_heads: int, head_dim: int) -> int:
        """Estimate KV cache size in MB."""
        # KV cache = 2 * n_layers * n_ctx * n_heads * head_dim * dtype_size
        dtype_size = 2  # FP16
        cache_bytes = 2 * n_layers * n_ctx * n_heads * head_dim * dtype_size
        return cache_bytes // (1024 * 1024)
    
    def get_max_context(self, available_vram_mb: int, model_layers: int, 
                        n_heads: int, head_dim: int) -> int:
        """Calculate maximum context length given VRAM constraints."""
        per_token_bytes = 2 * model_layers * n_heads * head_dim * 2
        max_tokens = (available_vram_mb * 1024 * 1024) // per_token_bytes
        return min(max_tokens, 32768)  # Cap at 32K
```

---

## 10. Lazy Loading & Code Splitting

### 10.1 Frontend Code Splitting

```typescript
// vite.config.ts — Manual chunk splitting
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
                    'vendor-gsap': ['gsap'],
                    'vendor-motion': ['framer-motion'],
                    'scene-boot': ['./src/scenes/boot'],
                    'scene-command': ['./src/scenes/command-center'],
                    'scene-consciousness': ['./src/scenes/consciousness'],
                    'scene-memory': ['./src/scenes/memory-palace'],
                    'scene-agents': ['./src/scenes/agent-network'],
                    'scene-diagnostics': ['./src/scenes/diagnostics'],
                    'scrollytelling': ['./src/scrollytelling'],
                },
            },
        },
        chunkSizeWarningLimit: 500,  // KB
    },
});
```

### 10.2 Scene Lazy Loading

```typescript
// Lazy load scenes only when navigated to
const scenes = {
    boot: lazy(() => import('./scenes/boot/BootScene')),
    'command-center': lazy(() => import('./scenes/command-center/CommandCenter')),
    consciousness: lazy(() => import('./scenes/consciousness/Consciousness')),
    'memory-palace': lazy(() => import('./scenes/memory-palace/MemoryPalace')),
    'agent-network': lazy(() => import('./scenes/agent-network/AgentNetwork')),
    diagnostics: lazy(() => import('./scenes/diagnostics/Diagnostics')),
};

function SceneRouter({ currentScene }: { currentScene: string }) {
    const Scene = scenes[currentScene];
    return (
        <Suspense fallback={<SceneLoadingIndicator />}>
            <Scene />
        </Suspense>
    );
}
```

### 10.3 Backend Lazy Loading

```python
class LazyAgentLoader:
    """Load agents only when they're first needed."""
    
    _instances: dict[str, BaseAgent] = {}
    
    async def get(self, agent_id: str) -> BaseAgent:
        if agent_id not in self._instances:
            # Dynamic import of agent module
            module = importlib.import_module(f"agents.{agent_id}_agent")
            agent_class = getattr(module, f"{agent_id.title()}Agent")
            agent = agent_class(config=load_agent_config(agent_id))
            await agent.start()
            self._instances[agent_id] = agent
        return self._instances[agent_id]
```

### 10.4 Bundle Size Targets

| Bundle | Target | Loading Phase |
|---|---|---|
| Initial (shell + boot scene) | < 200KB gzipped | Instant |
| Core vendor (React + Three.js) | < 300KB gzipped | Parallel |
| Command center scene | < 150KB gzipped | After boot |
| Each additional scene | < 100KB gzipped | On navigate |
| Scrollytelling (first-launch) | < 200KB gzipped | First launch only |
| Total application | < 2MB gzipped | Full load |

---

## 11. Caching Architecture

### 11.1 Three-Layer Cache

```
L1: In-Memory (Python dict / LRU)
├── Capacity: 1000 entries / 100MB max
├── TTL: Session (cleared on restart)
├── Use: Hot data — recent embeddings, model metadata, API responses
├── Eviction: LRU
└── Access time: < 1μs

L2: Disk Cache (SQLite table)
├── Capacity: 10,000 entries / 1GB max
├── TTL: 24 hours default (configurable per entry)
├── Use: Warm data — embeddings, search results, API cache
├── Eviction: TTL + LRU
└── Access time: < 5ms

L3: Persistent Store (ChromaDB / SQLite)
├── Capacity: 100,000 vectors / unlimited structured
├── TTL: Indefinite
├── Use: Cold data — knowledge base, episodic memory, procedural memory
├── Eviction: Manual (via Memory Agent consolidation)
└── Access time: < 50ms
```

### 11.2 Cache Keys & Strategies

```python
class CacheManager:
    def __init__(self):
        self.l1 = LRUCache(maxsize=1000)
        self.l2 = DiskCache(db_path="data/cache/cache.db", max_size_mb=1024)
    
    async def get(self, key: str) -> Optional[Any]:
        # Try L1 first
        if result := self.l1.get(key):
            return result
        # Try L2
        if result := await self.l2.get(key):
            self.l1.set(key, result)  # Promote to L1
            return result
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600, layers: list = ["l1", "l2"]):
        if "l1" in layers:
            self.l1.set(key, value)
        if "l2" in layers:
            await self.l2.set(key, value, ttl=ttl)
```

---

## 12. Startup Optimization

### 12.1 Startup Sequence

```
T+0ms     App launches (Tauri binary)
T+100ms   WebView2 initializes
T+200ms   index.html loaded, React bundle starts
T+400ms   Boot scene renders (minimal 3D — just logo + particles)
T+500ms   WebSocket connection to backend initiated
T+600ms   Backend FastAPI server starts (background process)
T+800ms   WebSocket connected, handshake complete
T+1000ms  Boot animation plays (AI core materializes)
T+1500ms  Tier 0-1 agents loaded (Brain, Memory, Personality, Knowledge)
T+2000ms  Hardware profile detected, performance profile applied
T+2500ms  System ready — boot scene transitions to command center
T+3000ms  User can interact (text input active)
T+5000ms  Background: remaining agents lazy-loadable
T+10000ms Background: model health checks, memory consolidation
```

### 12.2 Startup Optimizations

| Optimization | Implementation | Time Saved |
|---|---|---|
| Pre-compiled Tauri binary | AOT Rust compilation | ~500ms |
| Inline critical CSS | Embed boot styles in HTML | ~100ms |
| Module preloading | `<link rel="modulepreload">` | ~200ms |
| Python pre-warming | Background Python process starts with Tauri | ~1000ms |
| Deferred model loading | Models load only when first needed | ~2000ms |
| SQLite WAL + mmap | Fast database initialization | ~50ms |
| Cached hardware profile | Store profile, re-detect periodically | ~200ms |

### 12.3 Boot Scene (Lightweight)

```typescript
// Boot scene uses MINIMAL resources — just enough for a cinematic entrance
function BootScene() {
    // Total budget: < 50KB code, < 100 particles, < 2 draw calls
    return (
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 60 }}>
            <ambientLight intensity={0.1} />
            <AICoreSimple /> {/* Simplified version — just a sphere with glow */}
            <ParticleField count={100} /> {/* Minimal particles */}
        </Canvas>
    );
}
```

---

## 13. Adaptive Quality System

### 13.1 Runtime Quality Adaptation

```typescript
class AdaptiveQuality {
    private currentQuality: QualityLevel = 'HIGH';
    private fpsHistory: number[] = [];
    private readonly FPS_WINDOW = 60;  // Track last 60 frames
    
    onFrame(fps: number) {
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > this.FPS_WINDOW) {
            this.fpsHistory.shift();
        }
        
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        
        // Downgrade if consistently below target
        if (avgFps < 45 && this.currentQuality !== 'MINIMAL') {
            this.downgrade();
        }
        // Upgrade if consistently above target
        else if (avgFps > 58 && this.fpsHistory.length === this.FPS_WINDOW) {
            this.upgrade();
        }
    }
    
    private downgrade() {
        const levels: QualityLevel[] = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'];
        const current = levels.indexOf(this.currentQuality);
        if (current < levels.length - 1) {
            this.currentQuality = levels[current + 1];
            this.applyQualitySettings(this.currentQuality);
        }
    }
    
    private upgrade() {
        const levels: QualityLevel[] = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL'];
        const current = levels.indexOf(this.currentQuality);
        if (current > 0) {
            this.currentQuality = levels[current - 1];
            this.applyQualitySettings(this.currentQuality);
        }
    }
}
```

### 13.2 What Changes Per Quality Level

| Feature | ULTRA | HIGH | MEDIUM | LOW | MINIMAL |
|---|---|---|---|---|---|
| Particles | 10,000 | 5,000 | 2,000 | 500 | 100 |
| Post-processing | Full | Bloom+CA+Vig | Bloom | None | None |
| Shadows | PCF Soft | PCF | Basic | None | None |
| Anti-aliasing | MSAA 4x | MSAA 2x | FXAA | None | None |
| Pixel ratio | 2.0 | 1.5 | 1.0 | 1.0 | 0.75 |
| Agent animations | Full 3D | 3D simplified | 2D + glow | 2D static | Icons only |
| Background effects | Ray marching | Shader | Gradient | Solid | Solid |
| Text animations | Split-chars | Fade-up | Simple fade | Instant | Instant |

---

## 14. Benchmarking & Monitoring

### 14.1 Built-in Performance Monitor

```typescript
class PerformanceMonitor {
    private stats = {
        fps: 0,
        frameTime: 0,
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        programs: 0,
        jsHeap: 0,
        ramUsage: 0,
        gpuUsage: 0,
    };
    
    update(renderer: THREE.WebGLRenderer) {
        const info = renderer.info;
        this.stats.drawCalls = info.render.calls;
        this.stats.triangles = info.render.triangles;
        this.stats.textures = info.memory.textures;
        this.stats.programs = info.programs?.length || 0;
        
        if (performance.memory) {
            this.stats.jsHeap = performance.memory.usedJSHeapSize / 1024 / 1024;
        }
    }
}
```

### 14.2 Backend Performance Metrics

```python
import time

class PerformanceTracker:
    """Track backend performance metrics."""
    
    async def track(self, operation: str):
        """Context manager for tracking operation duration."""
        start = time.perf_counter()
        try:
            yield
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            await self._record(operation, duration_ms)
    
    async def _record(self, operation: str, duration_ms: float):
        # Emit to event bus for frontend display
        await event_bus.emit("perf.metric", {
            "operation": operation,
            "duration_ms": duration_ms,
            "timestamp": time.time(),
        })
        
        # Check against targets
        targets = {
            "llm.first_token": 2000,
            "memory.recall": 50,
            "voice.stt": 200,
            "voice.tts_start": 200,
            "ws.roundtrip": 10,
        }
        
        if operation in targets and duration_ms > targets[operation]:
            logger.warning(f"Performance degradation: {operation} took {duration_ms:.1f}ms "
                          f"(target: {targets[operation]}ms)")
```

### 14.3 Diagnostics Dashboard

The System Monitor Agent + frontend Diagnostics scene show:

- Real-time FPS graph
- RAM/VRAM usage bars
- CPU per-core utilization
- GPU utilization & temperature
- Model memory footprint
- Agent activity timeline
- WebSocket message rate
- Cache hit/miss ratios
- LLM tokens/second
- Voice pipeline latency breakdown

---

*This document specifies all performance optimization strategies for JARVIS. Every implementation decision should reference these targets and strategies.*

*Last Updated: 2026-05-19*
