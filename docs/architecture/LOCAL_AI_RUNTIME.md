# JARVIS — Local AI Runtime

## Model Management & Inference Engine

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Backend → Local AI Runtime

---

## Table of Contents

1. [Runtime Philosophy](#1-runtime-philosophy)
2. [Model Management Architecture](#2-model-management-architecture)
3. [GGUF Model Loading](#3-gguf-model-loading)
4. [Ollama Integration Layer](#4-ollama-integration-layer)
5. [Hardware Auto-Detection](#5-hardware-auto-detection)
6. [VRAM & RAM Management](#6-vram--ram-management)
7. [Model Switching & Hot-Swap](#7-model-switching--hot-swap)
8. [Embedding Model Runtime](#8-embedding-model-runtime)
9. [Voice Model Runtime](#9-voice-model-runtime)
10. [Vision Model Runtime](#10-vision-model-runtime)
11. [Model Download & Gallery](#11-model-download--gallery)
12. [Offline Mode](#12-offline-mode)
13. [Inference Optimization](#13-inference-optimization)
14. [Health Monitoring](#14-health-monitoring)

---

## 1. Runtime Philosophy

### 1.1 Core Principles

1. **Local inference as primary** — Cloud is fallback, not default
2. **One model at a time** — On 8GB systems, only one LLM loaded at once
3. **Hardware-aware** — Auto-detect and optimize for user's specific hardware
4. **Model-agnostic** — Support any GGUF model, any Ollama model
5. **Transparent** — User always knows what model is loaded, how much memory it uses
6. **Graceful degradation** — If GPU inference fails, fall back to CPU

### 1.2 Model Categories

| Category | Purpose | Examples | Loaded When |
|---|---|---|---|
| **LLM (Chat)** | Main conversation & reasoning | Llama 3, Mistral, Phi-3 | Always (primary) |
| **LLM (Code)** | Code generation & analysis | DeepSeek-Coder, CodeLlama | On code tasks |
| **Embedding** | Vector embeddings for memory | MiniLM, nomic-embed | Always (lightweight) |
| **STT** | Speech-to-text | Faster-Whisper | On voice activation |
| **TTS** | Text-to-speech | Piper, XTTS | On voice activation |
| **Vision** | Image understanding | LLaVA, moondream | On vision tasks |
| **OCR** | Text extraction from images | Tesseract, EasyOCR | On vision tasks |

---

## 2. Model Management Architecture

### 2.1 Model Manager

```python
class ModelManager:
    """Central manager for all AI models in JARVIS."""
    
    def __init__(self, hardware: HardwareProfile, config: dict):
        self.hardware = hardware
        self.config = config
        self.loaded_models: dict[str, LoadedModel] = {}
        self.model_registry: dict[str, ModelSpec] = {}
        self.vram_manager = VRAMManager(hardware.gpu_vram_mb)
        self.ram_manager = RAMManager(hardware.total_ram_mb)
    
    async def initialize(self):
        """Initialize model manager on startup."""
        # 1. Scan for available models
        await self._scan_local_models()
        
        # 2. Check Ollama availability
        await self._check_ollama()
        
        # 3. Load embedding model (always needed, small)
        await self.load_model("embedding", self._get_default_embedding())
        
        # 4. Pre-load default LLM based on hardware
        default_llm = self._get_recommended_llm()
        if default_llm:
            await self.load_model("llm_primary", default_llm)
    
    async def load_model(self, slot: str, model_spec: ModelSpec) -> LoadedModel:
        """Load a model into a named slot."""
        
        # Check if we need to free memory
        needed_mb = model_spec.ram_required_mb
        if model_spec.provider == "llamacpp" and self.hardware.gpu_vram_mb > 0:
            needed_mb = model_spec.vram_required_mb
        
        await self._ensure_memory_available(needed_mb)
        
        # Unload existing model in this slot
        if slot in self.loaded_models:
            await self.unload_model(slot)
        
        # Load based on provider
        if model_spec.provider == "ollama":
            loaded = await self._load_ollama(model_spec)
        elif model_spec.provider == "llamacpp":
            loaded = await self._load_llamacpp(model_spec)
        elif model_spec.provider == "sentence_transformer":
            loaded = await self._load_sentence_transformer(model_spec)
        elif model_spec.provider == "whisper":
            loaded = await self._load_whisper(model_spec)
        elif model_spec.provider == "piper":
            loaded = await self._load_piper(model_spec)
        else:
            raise ValueError(f"Unknown provider: {model_spec.provider}")
        
        self.loaded_models[slot] = loaded
        await event_bus.emit("model.loaded", {"slot": slot, "model": model_spec.id})
        
        return loaded
    
    async def unload_model(self, slot: str):
        """Unload a model from a slot to free memory."""
        if slot in self.loaded_models:
            loaded = self.loaded_models[slot]
            await loaded.unload()
            del self.loaded_models[slot]
            
            import gc
            gc.collect()
            
            await event_bus.emit("model.unloaded", {"slot": slot})
    
    async def unload_all(self):
        """Emergency: unload all models."""
        for slot in list(self.loaded_models.keys()):
            await self.unload_model(slot)
```

### 2.2 Loaded Model Wrapper

```python
@dataclass
class LoadedModel:
    spec: ModelSpec
    slot: str
    provider_instance: Any           # Actual model object
    loaded_at: float
    memory_used_mb: int
    gpu_layers: int
    
    async def generate(self, prompt: str, params: GenerationParams) -> AsyncIterator[str]:
        """Generate text from this model."""
        ...
    
    async def unload(self):
        """Unload this model and free memory."""
        ...
```

---

## 3. GGUF Model Loading

### 3.1 GGUF File Discovery

```python
class GGUFScanner:
    """Scan for GGUF model files on disk."""
    
    SEARCH_PATHS = [
        "data/models/",                          # JARVIS models directory
        "~/.cache/lm-studio/models/",            # LM Studio models
        "~/.ollama/models/blobs/",               # Ollama model blobs
    ]
    
    async def scan(self) -> list[GGUFModelInfo]:
        """Find all GGUF files in known locations."""
        models = []
        
        for search_path in self.SEARCH_PATHS:
            path = Path(search_path).expanduser()
            if path.exists():
                for gguf_file in path.rglob("*.gguf"):
                    info = await self._parse_gguf_metadata(gguf_file)
                    if info:
                        models.append(info)
        
        return models
    
    async def _parse_gguf_metadata(self, path: Path) -> Optional[GGUFModelInfo]:
        """Read GGUF file header for model metadata."""
        try:
            # Read GGUF magic bytes and metadata
            with open(path, "rb") as f:
                magic = f.read(4)
                if magic != b"GGUF":
                    return None
                
                # Parse version, tensor count, metadata
                # (simplified — actual GGUF parsing is more complex)
            
            file_size_mb = path.stat().st_size / (1024 * 1024)
            
            return GGUFModelInfo(
                path=str(path),
                file_size_mb=int(file_size_mb),
                name=path.stem,
                estimated_ram_mb=int(file_size_mb * 1.1),  # Rough estimate
            )
        except Exception:
            return None
```

### 3.2 GGUF Loading with Auto GPU Layers

```python
async def _load_llamacpp(self, spec: ModelSpec) -> LoadedModel:
    """Load a GGUF model via llama-cpp-python."""
    
    # Calculate optimal GPU layers
    if self.hardware.gpu_vram_mb > 0:
        gpu_layers = self.vram_manager.get_optimal_gpu_layers(
            model_total_layers=spec.metadata.get("layers", 32),
            model_per_layer_mb=spec.metadata.get("per_layer_mb", 150),
        )
    else:
        gpu_layers = 0
    
    # Get tier-based llama.cpp config
    tier = self.hardware.performance_tier
    llama_config = LLAMA_CONFIGS[tier]
    
    loop = asyncio.get_event_loop()
    model = await loop.run_in_executor(None, lambda: Llama(
        model_path=spec.file_path,
        n_ctx=llama_config["n_ctx"],
        n_batch=llama_config["n_batch"],
        n_threads=llama_config["n_threads"],
        n_gpu_layers=gpu_layers,
        use_mmap=True,
        use_mlock=llama_config.get("use_mlock", False),
        flash_attn=llama_config.get("flash_attn", False),
        verbose=False,
    ))
    
    return LoadedModel(
        spec=spec,
        slot="",  # Set by caller
        provider_instance=model,
        loaded_at=time.time(),
        memory_used_mb=spec.ram_required_mb,
        gpu_layers=gpu_layers,
    )
```

---

## 4. Ollama Integration Layer

### 4.1 Ollama Manager

```python
class OllamaManager:
    """Manage Ollama server and models."""
    
    BASE_URL = "http://localhost:11434"
    
    async def is_running(self) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.BASE_URL}/api/tags", timeout=aiohttp.ClientTimeout(total=2)) as resp:
                    return resp.status == 200
        except:
            return False
    
    async def start_server(self):
        """Start Ollama server if not running."""
        if await self.is_running():
            return
        
        # Try to start Ollama
        process = await asyncio.create_subprocess_exec(
            "ollama", "serve",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        
        # Wait for server to be ready
        for _ in range(30):
            await asyncio.sleep(1)
            if await self.is_running():
                return
        
        raise RuntimeError("Failed to start Ollama server")
    
    async def list_models(self) -> list[dict]:
        """List all locally available Ollama models."""
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.BASE_URL}/api/tags") as resp:
                data = await resp.json()
                return data.get("models", [])
    
    async def pull_model(self, model_name: str, progress_callback=None) -> bool:
        """Download a model from Ollama registry."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.BASE_URL}/api/pull",
                json={"name": model_name, "stream": True}
            ) as resp:
                async for line in resp.content:
                    if line and progress_callback:
                        data = json.loads(line)
                        await progress_callback(data)
                return True
    
    async def delete_model(self, model_name: str) -> bool:
        """Delete a locally stored Ollama model."""
        async with aiohttp.ClientSession() as session:
            async with session.delete(
                f"{self.BASE_URL}/api/delete",
                json={"name": model_name}
            ) as resp:
                return resp.status == 200
```

---

## 5. Hardware Auto-Detection

### 5.1 GPU Detection

```python
async def detect_gpu() -> GPUInfo:
    """Detect GPU type, VRAM, and capabilities."""
    
    # Try NVIDIA first (nvidia-smi)
    try:
        result = await asyncio.create_subprocess_exec(
            "nvidia-smi", "--query-gpu=name,memory.total,driver_version",
            "--format=csv,noheader,nounits",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await result.communicate()
        
        if result.returncode == 0:
            parts = stdout.decode().strip().split(", ")
            return GPUInfo(
                name=parts[0],
                vram_mb=int(parts[1]),
                type="nvidia",
                driver_version=parts[2],
                cuda_available=True,
            )
    except FileNotFoundError:
        pass
    
    # Try AMD (rocm-smi)
    try:
        result = await asyncio.create_subprocess_exec(
            "rocm-smi", "--showmeminfo", "vram",
            stdout=asyncio.subprocess.PIPE,
        )
        stdout, _ = await result.communicate()
        if result.returncode == 0:
            # Parse ROCm output
            return GPUInfo(name="AMD GPU", vram_mb=_parse_rocm(stdout), type="amd")
    except FileNotFoundError:
        pass
    
    # Fallback: no discrete GPU
    return GPUInfo(name="Integrated/None", vram_mb=0, type="none")
```

### 5.2 Optimal Model Recommendation

```python
def recommend_models(hardware: HardwareProfile) -> dict[str, str]:
    """Recommend models based on detected hardware."""
    
    tier = hardware.performance_tier
    
    RECOMMENDATIONS = {
        "ultra": {
            "primary_llm": "llama3:8b-instruct-q6_K",
            "code_llm": "deepseek-coder:6.7b-instruct-q6_K",
            "embedding": "nomic-embed-text",
            "stt": "whisper-large-v3",
            "tts": "xtts-v2",
        },
        "high": {
            "primary_llm": "llama3:8b-instruct-q4_K_M",
            "code_llm": "deepseek-coder:6.7b-instruct-q4_K_M",
            "embedding": "all-MiniLM-L6-v2",
            "stt": "whisper-medium",
            "tts": "piper-hq",
        },
        "medium": {
            "primary_llm": "mistral:7b-instruct-q4_K_M",
            "code_llm": None,  # Share primary
            "embedding": "all-MiniLM-L6-v2",
            "stt": "whisper-small",
            "tts": "piper",
        },
        "low": {
            "primary_llm": "phi3:mini-q4_K_M",
            "code_llm": None,
            "embedding": "all-MiniLM-L6-v2",
            "stt": "whisper-base",
            "tts": "piper-fast",
        },
        "minimal": {
            "primary_llm": "qwen2:1.5b-instruct-q4_K_M",
            "code_llm": None,
            "embedding": "all-MiniLM-L6-v2",
            "stt": "whisper-tiny",
            "tts": "piper-fast",
        },
    }
    
    return RECOMMENDATIONS[tier]
```

---

## 6. VRAM & RAM Management

### 6.1 Memory Budget Controller

```python
class MemoryBudget:
    """Manage memory allocation across all models."""
    
    def __init__(self, hardware: HardwareProfile):
        self.total_ram = hardware.total_ram_mb
        self.total_vram = hardware.gpu_vram_mb
        
        # Reserve memory for system and JARVIS processes
        self.reserved_ram = 3000    # 3GB for OS + Tauri + Python
        self.reserved_vram = 300    # 300MB for WebGL rendering
        
        self.available_ram = self.total_ram - self.reserved_ram
        self.available_vram = self.total_vram - self.reserved_vram
        
        self.allocated_ram: dict[str, int] = {}
        self.allocated_vram: dict[str, int] = {}
    
    def can_allocate(self, slot: str, ram_mb: int, vram_mb: int = 0) -> bool:
        used_ram = sum(self.allocated_ram.values())
        used_vram = sum(self.allocated_vram.values())
        return (used_ram + ram_mb <= self.available_ram and 
                used_vram + vram_mb <= self.available_vram)
    
    def allocate(self, slot: str, ram_mb: int, vram_mb: int = 0):
        self.allocated_ram[slot] = ram_mb
        if vram_mb > 0:
            self.allocated_vram[slot] = vram_mb
    
    def free(self, slot: str):
        self.allocated_ram.pop(slot, None)
        self.allocated_vram.pop(slot, None)
    
    def get_status(self) -> dict:
        return {
            "ram": {
                "total": self.total_ram,
                "available": self.available_ram,
                "used_by_models": sum(self.allocated_ram.values()),
                "free": self.available_ram - sum(self.allocated_ram.values()),
            },
            "vram": {
                "total": self.total_vram,
                "available": self.available_vram,
                "used_by_models": sum(self.allocated_vram.values()),
                "free": self.available_vram - sum(self.allocated_vram.values()),
            },
        }
```

---

## 7. Model Switching & Hot-Swap

### 7.1 Context-Aware Model Switching

```python
class ModelSwitcher:
    """Intelligently switch models based on task requirements."""
    
    async def switch_for_task(self, task_type: str, required_quality: str = "auto"):
        """Switch to the appropriate model for a task type."""
        
        current = self.model_manager.loaded_models.get("llm_primary")
        
        # Determine needed model
        if task_type == "code" and "code" not in (current.spec.specialization if current else []):
            # Need a code-specialized model
            code_model = self._find_best_code_model()
            if code_model and code_model.id != (current.spec.id if current else None):
                await self.model_manager.load_model("llm_primary", code_model)
        
        elif task_type == "chat" and current and "chat" not in current.spec.specialization:
            # Switch back to chat model
            chat_model = self._find_best_chat_model()
            if chat_model:
                await self.model_manager.load_model("llm_primary", chat_model)
```

---

## 8. Embedding Model Runtime

### 8.1 Embedding Manager

```python
class EmbeddingRuntime:
    """Manage embedding model for vector generation."""
    
    def __init__(self):
        self.model = None
        self.model_name = None
        self._cache = LRUCache(maxsize=5000)
    
    async def initialize(self, model_name: str = "all-MiniLM-L6-v2"):
        """Load embedding model."""
        from sentence_transformers import SentenceTransformer
        
        loop = asyncio.get_event_loop()
        self.model = await loop.run_in_executor(
            None, SentenceTransformer, model_name
        )
        self.model_name = model_name
    
    async def embed(self, text: str) -> list[float]:
        """Generate embedding, with caching."""
        cache_key = hashlib.md5(text.encode()).hexdigest()
        if cached := self._cache.get(cache_key):
            return cached
        
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(None, self.model.encode, text)
        result = embedding.tolist()
        self._cache.set(cache_key, result)
        return result
    
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch embed for efficiency."""
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, self.model.encode, texts)
        return [e.tolist() for e in embeddings]
```

---

## 9. Voice Model Runtime

### 9.1 STT Runtime (Faster-Whisper)

```python
class STTRuntime:
    """Speech-to-text using Faster-Whisper (CTranslate2)."""
    
    def __init__(self):
        self.model = None
        self.model_size = None
    
    async def initialize(self, model_size: str = "base"):
        """Load Whisper model."""
        from faster_whisper import WhisperModel
        
        compute_type = "float16" if torch.cuda.is_available() else "int8"
        
        loop = asyncio.get_event_loop()
        self.model = await loop.run_in_executor(None, lambda: WhisperModel(
            model_size, device="auto", compute_type=compute_type
        ))
        self.model_size = model_size
    
    async def transcribe(self, audio_data: bytes, language: str = None) -> TranscriptionResult:
        """Transcribe audio to text."""
        # Write to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_data)
            temp_path = f.name
        
        try:
            loop = asyncio.get_event_loop()
            segments, info = await loop.run_in_executor(
                None, lambda: self.model.transcribe(
                    temp_path, language=language, beam_size=5
                )
            )
            
            text = " ".join(segment.text for segment in segments)
            return TranscriptionResult(text=text.strip(), language=info.language)
        finally:
            os.unlink(temp_path)
```

### 9.2 TTS Runtime (Piper)

```python
class TTSRuntime:
    """Text-to-speech using Piper."""
    
    async def initialize(self, voice: str = "en_US-lessac-medium"):
        """Load Piper TTS voice."""
        voice_path = f"data/models/tts/{voice}.onnx"
        config_path = f"data/models/tts/{voice}.onnx.json"
        
        if not os.path.exists(voice_path):
            await self._download_voice(voice)
        
        self.voice = voice
        self.voice_path = voice_path
        self.config_path = config_path
    
    async def synthesize(self, text: str) -> bytes:
        """Convert text to speech audio (WAV bytes)."""
        loop = asyncio.get_event_loop()
        
        audio = await loop.run_in_executor(None, lambda: _piper_synthesize(
            text, self.voice_path, self.config_path
        ))
        
        return audio
```

---

## 10. Vision Model Runtime

### 10.1 Vision Pipeline

```python
class VisionRuntime:
    """Image understanding using LLaVA or similar models."""
    
    async def analyze_image(self, image_path: str, prompt: str = "Describe this image.") -> str:
        """Analyze an image using a vision-language model."""
        
        # Check if we have a local vision model
        if "vision" in self.model_manager.loaded_models:
            return await self._local_vision(image_path, prompt)
        
        # Fallback to cloud vision if available
        if self.cloud_enabled:
            return await self._cloud_vision(image_path, prompt)
        
        raise NoVisionModelError("No vision model available")
    
    async def ocr(self, image_path: str) -> str:
        """Extract text from an image."""
        try:
            import easyocr
            reader = easyocr.Reader(['en'])
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, reader.readtext, image_path)
            return "\n".join(r[1] for r in results)
        except ImportError:
            # Fallback to Tesseract
            import pytesseract
            from PIL import Image
            img = Image.open(image_path)
            return pytesseract.image_to_string(img)
```

---

## 11. Model Download & Gallery

### 11.1 Model Gallery (Inspired by LocalAI)

```python
class ModelGallery:
    """Browse and download models from a curated gallery."""
    
    GALLERY = [
        {
            "id": "llama3-8b",
            "name": "Llama 3 8B",
            "description": "Meta's powerful 8B parameter model, great for general use",
            "sizes": {
                "Q4_K_M": {"size_gb": 4.7, "url": "ollama:llama3:8b"},
                "Q5_K_M": {"size_gb": 5.3, "url": "ollama:llama3:8b-q5_K_M"},
                "Q6_K": {"size_gb": 6.1, "url": "ollama:llama3:8b-q6_K"},
            },
            "tags": ["chat", "reasoning", "recommended"],
            "min_ram_gb": 6,
        },
        {
            "id": "deepseek-coder-6.7b",
            "name": "DeepSeek Coder 6.7B",
            "description": "Specialized for code generation and understanding",
            "sizes": {
                "Q4_K_M": {"size_gb": 4.5, "url": "ollama:deepseek-coder:6.7b"},
            },
            "tags": ["code", "recommended"],
            "min_ram_gb": 6,
        },
        {
            "id": "phi3-mini",
            "name": "Phi-3 Mini",
            "description": "Microsoft's efficient 3.8B model, runs on low-end hardware",
            "sizes": {
                "Q4_K_M": {"size_gb": 2.3, "url": "ollama:phi3:mini"},
            },
            "tags": ["chat", "lightweight", "recommended-low-end"],
            "min_ram_gb": 4,
        },
        {
            "id": "whisper-base",
            "name": "Whisper Base (STT)",
            "description": "OpenAI's speech recognition model — base size",
            "sizes": {
                "default": {"size_gb": 0.15, "url": "faster-whisper:base"},
            },
            "tags": ["voice", "stt"],
            "min_ram_gb": 1,
        },
        {
            "id": "piper-lessac",
            "name": "Piper Lessac (TTS)",
            "description": "High quality English text-to-speech voice",
            "sizes": {
                "medium": {"size_gb": 0.07, "url": "piper:en_US-lessac-medium"},
            },
            "tags": ["voice", "tts"],
            "min_ram_gb": 0.5,
        },
    ]
    
    def get_compatible(self, hardware: HardwareProfile) -> list[dict]:
        """Return models compatible with user's hardware."""
        available_gb = hardware.total_ram_mb / 1024
        return [m for m in self.GALLERY if m["min_ram_gb"] <= available_gb - 3]
    
    async def download(self, model_id: str, quantization: str, 
                       progress_callback=None) -> str:
        """Download a model from the gallery."""
        model = next((m for m in self.GALLERY if m["id"] == model_id), None)
        if not model:
            raise ValueError(f"Unknown model: {model_id}")
        
        size_info = model["sizes"][quantization]
        url = size_info["url"]
        
        if url.startswith("ollama:"):
            # Download via Ollama
            ollama_name = url.replace("ollama:", "")
            await self.ollama.pull_model(ollama_name, progress_callback)
            return ollama_name
        else:
            # Direct download
            return await self._download_file(url, progress_callback)
```

---

## 12. Offline Mode

### 12.1 Offline Capabilities

```python
class OfflineMode:
    """Ensure JARVIS works completely offline."""
    
    def get_offline_status(self) -> dict:
        """Check what's available offline."""
        return {
            "llm_available": any(
                m.provider in ("ollama", "llamacpp") 
                for m in self.model_manager.loaded_models.values()
            ),
            "embedding_available": "embedding" in self.model_manager.loaded_models,
            "stt_available": "stt" in self.model_manager.loaded_models,
            "tts_available": "tts" in self.model_manager.loaded_models,
            "memory_available": True,  # SQLite + ChromaDB are always local
            "web_search": False,       # No web search offline
            "cloud_models": False,     # No cloud inference offline
        }
    
    async def ensure_offline_ready(self):
        """Verify all models needed for offline operation are downloaded."""
        required = ["llm_primary", "embedding"]
        missing = [slot for slot in required if slot not in self.model_manager.loaded_models]
        
        if missing:
            await event_bus.emit("offline.models_needed", {"missing": missing})
```

---

## 13. Inference Optimization

### 13.1 Prompt Caching

```python
class PromptCache:
    """Cache common prompt prefixes to speed up inference."""
    
    def __init__(self):
        self._cache: dict[str, Any] = {}
    
    def get_cached_prefix(self, messages: list[Message]) -> Optional[tuple[str, int]]:
        """Check if we have a cached prefix for these messages."""
        # Hash the system prompt + first N messages
        prefix_key = self._hash_prefix(messages[:-1])
        
        if prefix_key in self._cache:
            return prefix_key, self._cache[prefix_key]["token_count"]
        return None
```

### 13.2 Batch Inference

```python
async def batch_classify(self, texts: list[str]) -> list[str]:
    """Batch classify multiple texts for efficiency."""
    # Process multiple texts in a single model call
    batch_prompt = "\n".join(
        f"{i+1}. {text}" for i, text in enumerate(texts)
    )
    
    result = await self.generate(
        f"Classify each item:\n{batch_prompt}\n\nCategories for each:",
        GenerationParams(max_tokens=len(texts) * 20)
    )
    
    return self._parse_batch_result(result, len(texts))
```

---

## 14. Health Monitoring

### 14.1 Model Health Checks

```python
class ModelHealthMonitor:
    """Monitor loaded model health and performance."""
    
    async def health_check(self) -> dict[str, ModelHealth]:
        """Check health of all loaded models."""
        results = {}
        
        for slot, model in self.model_manager.loaded_models.items():
            try:
                start = time.perf_counter()
                # Quick generation test
                output = ""
                async for token in model.generate("Hello", GenerationParams(max_tokens=5)):
                    output += token
                
                latency = (time.perf_counter() - start) * 1000
                
                results[slot] = ModelHealth(
                    status="healthy",
                    latency_ms=latency,
                    responsive=len(output) > 0,
                )
            except Exception as e:
                results[slot] = ModelHealth(
                    status="unhealthy",
                    error=str(e),
                )
        
        return results
```

---

*This document specifies the complete local AI runtime for JARVIS. The runtime manages all model loading, inference, and hardware optimization to deliver the best possible AI experience on the user's hardware.*

*Last Updated: 2026-05-19*
