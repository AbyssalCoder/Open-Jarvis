# JARVIS — Model Routing System

## Intelligent LLM Selection & Multi-Provider Architecture

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Backend → Model Routing

---

## Table of Contents

1. [Routing Philosophy](#1-routing-philosophy)
2. [4-Tier Model Hierarchy](#2-4-tier-model-hierarchy)
3. [Intent Classification](#3-intent-classification)
4. [Model Registry](#4-model-registry)
5. [Provider Adapters](#5-provider-adapters)
6. [Ollama Integration](#6-ollama-integration)
7. [llama.cpp Direct Integration](#7-llamacpp-direct-integration)
8. [Cloud Provider Integration](#8-cloud-provider-integration)
9. [Routing Logic Engine](#9-routing-logic-engine)
10. [Model Hot-Swapping](#10-model-hot-swapping)
11. [Quantization Strategy](#11-quantization-strategy)
12. [Fallback & Retry Logic](#12-fallback--retry-logic)
13. [Token Budgeting & Cost Control](#13-token-budgeting--cost-control)
14. [Model Profiling & Auto-Selection](#14-model-profiling--auto-selection)

---

## 1. Routing Philosophy

### 1.1 Core Principles

1. **Local-first, cloud-optional** — Always attempt local inference first
2. **Right model for the right task** — Small fast model for classification, large model for reasoning
3. **Transparent routing** — User can always see which model is being used
4. **User override** — User can force a specific model at any time
5. **Cost-aware** — Track cloud API costs, alert on budget limits
6. **Latency-aware** — Route to fastest model that meets quality threshold

### 1.2 Routing Decision Flow

```
User Request
    │
    ├── [1] Classify Intent
    │       ↓
    ├── [2] Determine complexity
    │       ↓
    ├── [3] Check local model availability
    │       ↓
    ├── [4] Select optimal model from available options
    │       ↓
    ├── [5] If local fails → fallback to cloud (if enabled)
    │       ↓
    └── [6] Route to selected provider → stream response
```

---

## 2. 4-Tier Model Hierarchy

### 2.1 Tier Definitions

```python
class ModelTier(Enum):
    """4-tier model hierarchy from fastest/cheapest to most capable."""
    
    LOCAL_LIGHT = "local_light"      # Tier 1: Fast local — classification, simple tasks
    LOCAL_HEAVY = "local_heavy"      # Tier 2: Powerful local — reasoning, coding, analysis
    CLOUD_STANDARD = "cloud_standard"  # Tier 3: Cloud standard — when local is insufficient
    CLOUD_PREMIUM = "cloud_premium"  # Tier 4: Cloud premium — complex reasoning, large context
```

### 2.2 Tier Assignments

| Tier | Models | Context | Speed | Use Cases |
|---|---|---|---|---|
| **Tier 1: Local Light** | Phi-3-mini (3.8B), TinyLlama (1.1B), Qwen2-1.5B | 2K-4K | < 1s first token | Classification, simple Q&A, commands, entity extraction |
| **Tier 2: Local Heavy** | Llama 3 8B, Mistral 7B, CodeLlama 7B, DeepSeek-Coder 6.7B | 4K-8K | < 2s first token | Code generation, analysis, reasoning, conversation |
| **Tier 3: Cloud Standard** | Gemini Flash, GPT-4o-mini, Claude Haiku | 32K-128K | < 2s first token | Large context, complex tasks local can't handle |
| **Tier 4: Cloud Premium** | Gemini Pro, GPT-4o, Claude Sonnet/Opus | 128K-200K | < 3s first token | Expert reasoning, very long context, critical tasks |

---

## 3. Intent Classification

### 3.1 Fast Intent Classifier

```python
class IntentClassifier:
    """Classify user intent using local lightweight model or rules."""
    
    # Rule-based fast path (< 1ms)
    KEYWORD_INTENTS = {
        "chat": ["hello", "hi", "hey", "how are you", "what's up", "thanks"],
        "code": ["write code", "function", "class", "debug", "fix bug", "implement", "code"],
        "file": ["create file", "open file", "read file", "delete file", "find file"],
        "terminal": ["run command", "execute", "terminal", "shell", "npm", "pip", "git"],
        "web": ["search", "browse", "open website", "google", "look up"],
        "system": ["system info", "cpu", "memory", "disk", "process", "monitor"],
        "automation": ["automate", "schedule", "workflow", "cron", "recurring"],
        "knowledge": ["explain", "what is", "how does", "teach me", "describe"],
        "memory": ["remember", "recall", "forget", "what did I say", "history"],
    }
    
    async def classify(self, message: str) -> Intent:
        """Classify intent, trying rules first, then LLM."""
        # Fast path: keyword matching
        message_lower = message.lower()
        for intent, keywords in self.KEYWORD_INTENTS.items():
            if any(kw in message_lower for kw in keywords):
                return Intent(type=intent, confidence=0.7, method="keyword")
        
        # Slow path: use Tier 1 model for classification
        result = await self.light_model.generate(
            f"Classify this user message into one category: "
            f"chat, code, file, terminal, web, system, automation, knowledge, memory, other.\n"
            f"Message: {message}\n"
            f"Category:"
        )
        return Intent(type=result.strip(), confidence=0.85, method="llm")
```

### 3.2 Complexity Estimation

```python
def estimate_complexity(message: str, intent: str, context: dict) -> str:
    """Estimate task complexity to determine model tier."""
    
    score = 0
    
    # Message length
    if len(message) > 500:
        score += 2
    elif len(message) > 200:
        score += 1
    
    # Multi-step indicators
    multi_step_words = ["and then", "after that", "also", "additionally", "step by step"]
    score += sum(1 for w in multi_step_words if w in message.lower())
    
    # Reasoning indicators
    reasoning_words = ["analyze", "compare", "evaluate", "design", "architect", "optimize"]
    score += sum(2 for w in reasoning_words if w in message.lower())
    
    # Context size
    if context.get("file_tokens", 0) > 2000:
        score += 2
    
    if score <= 1:
        return "simple"     # Tier 1
    elif score <= 3:
        return "moderate"   # Tier 2
    elif score <= 5:
        return "complex"    # Tier 2 or 3
    else:
        return "expert"     # Tier 3 or 4
```

---

## 4. Model Registry

### 4.1 Model Definition

```python
@dataclass
class ModelSpec:
    id: str                         # Unique ID: "llama3-8b-q4km"
    name: str                       # Display name
    provider: str                   # "ollama", "llamacpp", "gemini", "openrouter"
    tier: ModelTier
    context_length: int
    quantization: Optional[str]     # "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0", "F16"
    parameter_count: str            # "7B", "13B", etc.
    specialization: list[str]       # ["code", "chat", "reasoning"]
    ram_required_mb: int
    vram_required_mb: int
    avg_tokens_per_second: float    # Benchmark result
    quality_score: float            # 0-1 quality rating
    is_available: bool = False      # Set at runtime
    file_path: Optional[str] = None # For GGUF files
    ollama_name: Optional[str] = None  # For Ollama models
```

### 4.2 Default Model Registry

```python
DEFAULT_MODELS = [
    # Tier 1: Local Light
    ModelSpec(
        id="phi3-mini-q4km", name="Phi-3 Mini", provider="ollama",
        tier=ModelTier.LOCAL_LIGHT, context_length=4096, quantization="Q4_K_M",
        parameter_count="3.8B", specialization=["chat", "classification"],
        ram_required_mb=2500, vram_required_mb=2500, avg_tokens_per_second=40,
        quality_score=0.65, ollama_name="phi3:mini",
    ),
    ModelSpec(
        id="qwen2-1.5b-q4km", name="Qwen2 1.5B", provider="ollama",
        tier=ModelTier.LOCAL_LIGHT, context_length=2048, quantization="Q4_K_M",
        parameter_count="1.5B", specialization=["chat", "classification"],
        ram_required_mb=1200, vram_required_mb=1200, avg_tokens_per_second=60,
        quality_score=0.55, ollama_name="qwen2:1.5b",
    ),
    
    # Tier 2: Local Heavy
    ModelSpec(
        id="llama3-8b-q4km", name="Llama 3 8B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, quantization="Q4_K_M",
        parameter_count="8B", specialization=["chat", "reasoning", "code"],
        ram_required_mb=5000, vram_required_mb=5000, avg_tokens_per_second=20,
        quality_score=0.82, ollama_name="llama3:8b",
    ),
    ModelSpec(
        id="deepseek-coder-6.7b-q4km", name="DeepSeek Coder 6.7B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, quantization="Q4_K_M",
        parameter_count="6.7B", specialization=["code"],
        ram_required_mb=4500, vram_required_mb=4500, avg_tokens_per_second=22,
        quality_score=0.85, ollama_name="deepseek-coder:6.7b",
    ),
    ModelSpec(
        id="mistral-7b-q4km", name="Mistral 7B", provider="ollama",
        tier=ModelTier.LOCAL_HEAVY, context_length=8192, quantization="Q4_K_M",
        parameter_count="7B", specialization=["chat", "reasoning"],
        ram_required_mb=4800, vram_required_mb=4800, avg_tokens_per_second=22,
        quality_score=0.80, ollama_name="mistral:7b",
    ),
    
    # Tier 3: Cloud Standard
    ModelSpec(
        id="gemini-flash", name="Gemini 2.0 Flash", provider="gemini",
        tier=ModelTier.CLOUD_STANDARD, context_length=1048576, quantization=None,
        parameter_count="unknown", specialization=["chat", "reasoning", "code", "vision"],
        ram_required_mb=0, vram_required_mb=0, avg_tokens_per_second=100,
        quality_score=0.88,
    ),
    
    # Tier 4: Cloud Premium
    ModelSpec(
        id="gemini-pro", name="Gemini 2.5 Pro", provider="gemini",
        tier=ModelTier.CLOUD_PREMIUM, context_length=1048576, quantization=None,
        parameter_count="unknown", specialization=["chat", "reasoning", "code", "vision"],
        ram_required_mb=0, vram_required_mb=0, avg_tokens_per_second=80,
        quality_score=0.95,
    ),
]
```

---

## 5. Provider Adapters

### 5.1 Unified Provider Interface

```python
class ModelProvider(ABC):
    """Abstract base class for all model providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, params: GenerationParams) -> AsyncIterator[str]:
        """Generate tokens from a prompt, yielding streaming output."""
        ...
    
    @abstractmethod
    async def chat(self, messages: list[Message], params: GenerationParams) -> AsyncIterator[str]:
        """Chat completion with message history."""
        ...
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if this provider is currently available."""
        ...
    
    @abstractmethod
    async def get_loaded_models(self) -> list[str]:
        """List currently loaded/available models."""
        ...
```

### 5.2 Provider Registry

```python
class ProviderRegistry:
    """Registry of all available model providers."""
    
    def __init__(self):
        self._providers: dict[str, ModelProvider] = {}
    
    def register(self, name: str, provider: ModelProvider):
        self._providers[name] = provider
    
    async def initialize(self):
        """Initialize all providers, check availability."""
        self.register("ollama", OllamaProvider())
        self.register("llamacpp", LlamaCppProvider())
        self.register("gemini", GeminiProvider())
        self.register("openrouter", OpenRouterProvider())
        
        for name, provider in self._providers.items():
            available = await provider.is_available()
            logger.info(f"Provider {name}: {'available' if available else 'unavailable'}")
    
    def get(self, name: str) -> ModelProvider:
        return self._providers[name]
```

---

## 6. Ollama Integration

### 6.1 Ollama Provider

```python
class OllamaProvider(ModelProvider):
    """Integration with Ollama for local model serving."""
    
    BASE_URL = "http://localhost:11434"
    
    async def is_available(self) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.BASE_URL}/api/tags", timeout=aiohttp.ClientTimeout(total=2)) as resp:
                    return resp.status == 200
        except:
            return False
    
    async def get_loaded_models(self) -> list[str]:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.BASE_URL}/api/tags") as resp:
                data = await resp.json()
                return [m["name"] for m in data.get("models", [])]
    
    async def chat(self, messages: list[Message], params: GenerationParams) -> AsyncIterator[str]:
        payload = {
            "model": params.model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": True,
            "options": {
                "temperature": params.temperature,
                "top_p": params.top_p,
                "num_predict": params.max_tokens,
                "num_ctx": params.context_length,
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.BASE_URL}/api/chat", json=payload) as resp:
                async for line in resp.content:
                    if line:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                        if data.get("done", False):
                            return
    
    async def pull_model(self, model_name: str, progress_callback=None):
        """Download a model from Ollama registry."""
        payload = {"name": model_name, "stream": True}
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.BASE_URL}/api/pull", json=payload) as resp:
                async for line in resp.content:
                    if line:
                        data = json.loads(line)
                        if progress_callback and "completed" in data:
                            await progress_callback(data)
```

---

## 7. llama.cpp Direct Integration

### 7.1 LlamaCpp Provider

```python
from llama_cpp import Llama

class LlamaCppProvider(ModelProvider):
    """Direct GGUF model loading via llama-cpp-python."""
    
    def __init__(self):
        self._models: dict[str, Llama] = {}
        self._model_paths: dict[str, str] = {}
    
    async def load_model(self, model_id: str, model_path: str, config: dict):
        """Load a GGUF model file."""
        loop = asyncio.get_event_loop()
        
        model = await loop.run_in_executor(None, lambda: Llama(
            model_path=model_path,
            n_ctx=config.get("n_ctx", 4096),
            n_batch=config.get("n_batch", 512),
            n_threads=config.get("n_threads", 4),
            n_gpu_layers=config.get("n_gpu_layers", 0),
            use_mmap=True,
            use_mlock=config.get("use_mlock", False),
            verbose=False,
        ))
        
        self._models[model_id] = model
        self._model_paths[model_id] = model_path
    
    async def chat(self, messages: list[Message], params: GenerationParams) -> AsyncIterator[str]:
        model = self._models[params.model_name]
        
        formatted = [{"role": m.role, "content": m.content} for m in messages]
        
        loop = asyncio.get_event_loop()
        
        # Run inference in executor to avoid blocking event loop
        def _generate():
            return model.create_chat_completion(
                messages=formatted,
                stream=True,
                temperature=params.temperature,
                top_p=params.top_p,
                max_tokens=params.max_tokens,
            )
        
        stream = await loop.run_in_executor(None, _generate)
        
        for chunk in stream:
            delta = chunk["choices"][0].get("delta", {})
            if "content" in delta:
                yield delta["content"]
    
    async def unload_model(self, model_id: str):
        """Unload a model to free RAM/VRAM."""
        if model_id in self._models:
            del self._models[model_id]
            import gc
            gc.collect()
```

---

## 8. Cloud Provider Integration

### 8.1 Gemini Provider

```python
import google.generativeai as genai

class GeminiProvider(ModelProvider):
    """Google Gemini API integration."""
    
    def __init__(self):
        self.api_key = None
        self._configured = False
    
    async def configure(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self._configured = True
    
    async def is_available(self) -> bool:
        return self._configured and self.api_key is not None
    
    async def chat(self, messages: list[Message], params: GenerationParams) -> AsyncIterator[str]:
        model = genai.GenerativeModel(
            model_name=params.model_name,
            generation_config=genai.GenerationConfig(
                temperature=params.temperature,
                top_p=params.top_p,
                max_output_tokens=params.max_tokens,
            )
        )
        
        # Convert to Gemini format
        history = [
            {"role": "user" if m.role == "user" else "model", "parts": [m.content]}
            for m in messages[:-1]
        ]
        
        chat = model.start_chat(history=history)
        response = await chat.send_message_async(
            messages[-1].content, stream=True
        )
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text
```

### 8.2 OpenRouter Provider

```python
class OpenRouterProvider(ModelProvider):
    """OpenRouter API for accessing multiple cloud models."""
    
    BASE_URL = "https://openrouter.ai/api/v1"
    
    async def chat(self, messages: list[Message], params: GenerationParams) -> AsyncIterator[str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://jarvis-ai.local",
            "X-Title": "JARVIS AI Assistant",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": params.model_name,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": True,
            "temperature": params.temperature,
            "max_tokens": params.max_tokens,
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.BASE_URL}/chat/completions",
                headers=headers, json=payload
            ) as resp:
                async for line in resp.content:
                    line = line.decode().strip()
                    if line.startswith("data: ") and line != "data: [DONE]":
                        data = json.loads(line[6:])
                        delta = data["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]
```

---

## 9. Routing Logic Engine

### 9.1 Main Router

```python
class ModelRouter:
    """Central routing engine that selects the optimal model for each request."""
    
    def __init__(self, registry: ModelRegistry, providers: ProviderRegistry):
        self.registry = registry
        self.providers = providers
        self.user_preferences = {}
    
    async def route(self, request: RoutingRequest) -> RoutingDecision:
        """Select the optimal model for a request."""
        
        # 1. User override — always respected
        if request.forced_model:
            return RoutingDecision(
                model=self.registry.get(request.forced_model),
                reason="user_override"
            )
        
        # 2. Classify intent and complexity
        intent = await self.intent_classifier.classify(request.message)
        complexity = estimate_complexity(request.message, intent.type, request.context)
        
        # 3. Determine minimum tier
        min_tier = self._get_min_tier(intent, complexity, request)
        
        # 4. Find available models at or above minimum tier
        candidates = self.registry.get_available(min_tier=min_tier)
        
        # 5. Filter by specialization
        if intent.type in ("code",):
            candidates = [m for m in candidates if "code" in m.specialization] or candidates
        
        # 6. Score and select best candidate
        best = self._score_candidates(candidates, request)
        
        return RoutingDecision(
            model=best,
            reason=f"auto:{intent.type}:{complexity}",
            tier=best.tier,
            alternatives=[c for c in candidates if c.id != best.id][:3]
        )
    
    def _get_min_tier(self, intent: Intent, complexity: str, request: RoutingRequest) -> ModelTier:
        """Determine minimum required model tier."""
        TIER_MAP = {
            ("chat", "simple"): ModelTier.LOCAL_LIGHT,
            ("chat", "moderate"): ModelTier.LOCAL_HEAVY,
            ("chat", "complex"): ModelTier.LOCAL_HEAVY,
            ("code", "simple"): ModelTier.LOCAL_LIGHT,
            ("code", "moderate"): ModelTier.LOCAL_HEAVY,
            ("code", "complex"): ModelTier.LOCAL_HEAVY,
            ("code", "expert"): ModelTier.CLOUD_STANDARD,
            ("knowledge", "simple"): ModelTier.LOCAL_LIGHT,
            ("knowledge", "complex"): ModelTier.LOCAL_HEAVY,
            ("knowledge", "expert"): ModelTier.CLOUD_STANDARD,
        }
        
        key = (intent.type, complexity)
        tier = TIER_MAP.get(key, ModelTier.LOCAL_HEAVY)
        
        # If context exceeds local model capacity, bump tier
        if request.estimated_tokens > 8192:
            tier = max(tier, ModelTier.CLOUD_STANDARD)
        if request.estimated_tokens > 32768:
            tier = ModelTier.CLOUD_PREMIUM
        
        return tier
    
    def _score_candidates(self, candidates: list[ModelSpec], request: RoutingRequest) -> ModelSpec:
        """Score candidates and return the best one."""
        scored = []
        for model in candidates:
            score = 0.0
            
            # Prefer local over cloud
            if model.provider in ("ollama", "llamacpp"):
                score += 0.3
            
            # Quality score
            score += model.quality_score * 0.3
            
            # Speed score (normalize tokens/sec to 0-1)
            speed_norm = min(model.avg_tokens_per_second / 100, 1.0)
            score += speed_norm * 0.2
            
            # Context fit (model's context length vs required)
            if model.context_length >= request.estimated_tokens:
                score += 0.2
            
            scored.append((model, score))
        
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[0][0]
```

---

## 10. Model Hot-Swapping

### 10.1 Hot-Swap Manager

```python
class ModelHotSwap:
    """Swap models without interrupting the user experience."""
    
    async def swap(self, from_model: str, to_model: str):
        """Hot-swap from one model to another."""
        # 1. Load new model (may take time for large models)
        await event_bus.emit("model.swap.loading", {"model": to_model})
        await self.provider.load_model(to_model)
        
        # 2. Verify new model works
        test_response = await self.provider.generate("Hello", GenerationParams(model_name=to_model, max_tokens=5))
        if not test_response:
            raise ModelSwapError(f"New model {to_model} failed verification")
        
        # 3. Update router to use new model
        self.router.set_active_model(to_model)
        
        # 4. Unload old model (free memory)
        await self.provider.unload_model(from_model)
        
        await event_bus.emit("model.swap.complete", {"from": from_model, "to": to_model})
```

---

## 11. Quantization Strategy

### 11.1 Quantization Levels

| Quantization | Bits/Weight | Quality | RAM (7B) | Use Case |
|---|---|---|---|---|
| Q3_K_M | ~3.5 | ★★☆☆ | ~3.3GB | Minimum viable, low-RAM systems |
| Q4_K_M | ~4.5 | ★★★☆ | ~4.4GB | **Default** — best quality/size ratio |
| Q5_K_M | ~5.5 | ★★★★ | ~5.1GB | Higher quality, 16GB+ RAM |
| Q6_K | ~6.5 | ★★★★ | ~5.9GB | Near-original quality |
| Q8_0 | 8.0 | ★★★★★ | ~7.2GB | Almost lossless |
| F16 | 16.0 | ★★★★★ | ~14GB | Full precision (32GB+ RAM) |

### 11.2 Auto-Quantization Selection

```python
def select_quantization(available_ram_mb: int, available_vram_mb: int, 
                         model_params: str) -> str:
    """Select best quantization given hardware constraints."""
    param_b = float(model_params.replace("B", ""))
    
    # Estimate RAM needed per quantization level
    estimates = {
        "Q3_K_M": param_b * 0.47,  # GB
        "Q4_K_M": param_b * 0.63,
        "Q5_K_M": param_b * 0.73,
        "Q6_K": param_b * 0.84,
        "Q8_0": param_b * 1.03,
    }
    
    # Available memory (whichever the model will use — VRAM or RAM)
    available_gb = max(available_vram_mb, available_ram_mb) / 1024
    
    # Leave 2GB headroom
    usable_gb = available_gb - 2.0
    
    # Pick highest quality that fits
    for quant in ["Q8_0", "Q6_K", "Q5_K_M", "Q4_K_M", "Q3_K_M"]:
        if estimates[quant] <= usable_gb:
            return quant
    
    return "Q3_K_M"  # Fallback to smallest
```

---

## 12. Fallback & Retry Logic

### 12.1 Fallback Chain

```python
class FallbackChain:
    """If the primary model fails, fallback to alternatives."""
    
    async def generate_with_fallback(self, request: RoutingRequest) -> AsyncIterator[str]:
        decision = await self.router.route(request)
        
        # Try primary model
        try:
            async for token in self._try_model(decision.model, request):
                yield token
            return
        except ModelError as e:
            logger.warning(f"Primary model {decision.model.id} failed: {e}")
        
        # Try alternatives in order
        for alt_model in decision.alternatives:
            try:
                logger.info(f"Falling back to {alt_model.id}")
                await event_bus.emit("model.fallback", {"to": alt_model.id})
                async for token in self._try_model(alt_model, request):
                    yield token
                return
            except ModelError as e:
                logger.warning(f"Fallback model {alt_model.id} failed: {e}")
                continue
        
        # All local models failed — try cloud if enabled
        if self.cloud_enabled:
            cloud_model = self.registry.get_first_available(tier=ModelTier.CLOUD_STANDARD)
            if cloud_model:
                async for token in self._try_model(cloud_model, request):
                    yield token
                return
        
        raise AllModelsFailedError("No model could handle this request")
```

---

## 13. Token Budgeting & Cost Control

### 13.1 Cost Tracking

```python
class CostTracker:
    """Track cloud API costs."""
    
    # Prices per 1M tokens (input/output)
    PRICING = {
        "gemini-flash": {"input": 0.075, "output": 0.30},
        "gemini-pro": {"input": 1.25, "output": 5.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "claude-haiku": {"input": 0.25, "output": 1.25},
        "claude-sonnet": {"input": 3.00, "output": 15.00},
    }
    
    def __init__(self):
        self.daily_budget: float = 1.00  # $1/day default
        self.monthly_budget: float = 20.00
        self.today_spent: float = 0.0
        self.month_spent: float = 0.0
    
    def estimate_cost(self, model_id: str, input_tokens: int, output_tokens: int) -> float:
        prices = self.PRICING.get(model_id, {"input": 0, "output": 0})
        return (input_tokens * prices["input"] + output_tokens * prices["output"]) / 1_000_000
    
    def can_afford(self, model_id: str, estimated_tokens: int) -> bool:
        estimated_cost = self.estimate_cost(model_id, estimated_tokens, estimated_tokens)
        return (self.today_spent + estimated_cost) <= self.daily_budget
    
    def record_usage(self, model_id: str, input_tokens: int, output_tokens: int):
        cost = self.estimate_cost(model_id, input_tokens, output_tokens)
        self.today_spent += cost
        self.month_spent += cost
```

---

## 14. Model Profiling & Auto-Selection

### 14.1 Benchmark on First Run

```python
class ModelProfiler:
    """Benchmark models on the user's hardware for optimal selection."""
    
    BENCHMARK_PROMPT = "Explain the concept of recursion in programming in 3 sentences."
    
    async def profile_model(self, model: ModelSpec) -> ModelBenchmark:
        """Run a standardized benchmark on a model."""
        
        # Measure time to first token
        start = time.perf_counter()
        first_token_time = None
        total_tokens = 0
        
        async for token in self.provider.generate(self.BENCHMARK_PROMPT, 
                                                   GenerationParams(model_name=model.id)):
            if first_token_time is None:
                first_token_time = time.perf_counter() - start
            total_tokens += 1
        
        total_time = time.perf_counter() - start
        tokens_per_second = total_tokens / total_time if total_time > 0 else 0
        
        return ModelBenchmark(
            model_id=model.id,
            first_token_seconds=first_token_time,
            tokens_per_second=tokens_per_second,
            total_tokens=total_tokens,
            ram_usage_mb=_measure_ram_delta(),
            vram_usage_mb=_measure_vram_delta(),
            benchmarked_at=time.time(),
        )
    
    async def profile_all_available(self) -> dict[str, ModelBenchmark]:
        """Profile all available local models."""
        results = {}
        for model in self.registry.get_local_models():
            if await self.provider.is_model_available(model.id):
                results[model.id] = await self.profile_model(model)
        return results
```

---

*This document specifies the complete model routing system for JARVIS. The router is the intelligence behind model selection — it ensures the right model handles every request.*

*Last Updated: 2026-05-19*
