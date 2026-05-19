# JARVIS — Custom Model Strategy

## Current Setup

### 1. Custom JARVIS Ollama Model (Ready)
- **Model**: `jarvis` (based on `qwen2.5:1.5b` with custom system prompt)
- **Size**: ~1GB
- **Created via**: `ollama create jarvis -f Modelfile`
- **Use case**: Default local inference — chat, general tasks, fast responses

### 2. Gemini 2.0 Flash (Cloud Fallback)
- **API Key**: Configured in `.env`
- **Use case**: Complex reasoning, long-context tasks, when local model is insufficient
- **Latency**: Higher (network), but much stronger capabilities

---

## Recommended Multi-Task Models (by Hardware Tier)

| Tier | Model | Size | Strengths |
|------|-------|------|-----------|
| **Minimal** (8GB RAM, no GPU) | `qwen2.5:1.5b` | 1GB | Fast, multilingual, solid reasoning |
| **Low** (10GB RAM, 2GB VRAM) | `llama3.2:3b` | 2GB | Good code + chat, Meta quality |
| **Medium** (16GB, 6GB VRAM) | `qwen2.5-coder:7b` | 4.7GB | Best code model at this size |
| **Medium** (16GB, 6GB VRAM) | `llama3.1:8b` | 4.7GB | Best general model at this size |
| **High** (24GB, 8GB VRAM) | `qwen2.5:14b` | 9GB | Near-GPT-4 quality for many tasks |
| **Ultra** (32GB+, 12GB+ VRAM) | `qwen2.5:32b` or `deepseek-r1:32b` | 20GB | Exceptional reasoning |

## Fine-Tuning Infrastructure (For Future Custom Training)

### Option A: Unsloth (Recommended for Consumer GPUs)
- **Repo**: https://github.com/unslothai/unsloth (64.7k stars)
- **Why**: 2x faster training, 70% less VRAM, works on consumer GPUs
- **Supports**: Qwen, Llama, Gemma, Mistral, DeepSeek
- **Training**: LoRA/QLoRA fine-tuning on 6GB+ VRAM
- **Install**: `irm https://unsloth.ai/install.ps1 | iex` (Windows)
- **Key feature**: Unsloth Studio — web UI for training + running models locally
- **Export**: GGUF, safetensors, merged models → load in Ollama

### Option B: LLaMA-Factory (Best for Comprehensive Training)
- **Repo**: https://github.com/hiyouga/LLaMA-Factory (71.4k stars)
- **Why**: Zero-code CLI + WebUI, 100+ models, all training methods
- **Supports**: LoRA, QLoRA, full fine-tuning, RLHF, DPO, PPO, KTO, ORPO
- **Install**: `pip install -e .` from source
- **Key feature**: Built-in dataset management, experiment tracking

### Training Strategy for JARVIS
1. **Start with Ollama Modelfile** (done) — custom system prompt, personality
2. **Collect interaction data** — save user conversations to build training set
3. **Fine-tune with Unsloth** — LoRA on Qwen 2.5 for JARVIS-specific behavior
4. **Export to GGUF** — load back into Ollama as upgraded `jarvis` model
5. **Iterate** — continuously improve from user feedback

---

## Model Routing Logic
```
User Request → Brain Agent → Intent Classification
                                   ↓
                          ┌─ Simple chat → jarvis (local, ~1GB)
                          ├─ Code task → qwen2.5-coder (local)
                          ├─ Complex reasoning → Gemini Flash (cloud)
                          ├─ Vision task → LLaVA (local) or Gemini (cloud)
                          └─ Embedding → nomic-embed-text (local)
```
