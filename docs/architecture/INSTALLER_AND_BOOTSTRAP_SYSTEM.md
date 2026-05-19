# JARVIS — Installer & Bootstrap System

## First-Run Experience & Dependency Management

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Setup → Installer & Bootstrap

---

## Table of Contents

1. [Installer Philosophy](#1-installer-philosophy)
2. [System Requirements Validation](#2-system-requirements-validation)
3. [Installer Package Generation](#3-installer-package-generation)
4. [First-Run Setup Wizard](#4-first-run-setup-wizard)
5. [Python Environment Bootstrap](#5-python-environment-bootstrap)
6. [Ollama Auto-Install](#6-ollama-auto-install)
7. [Model Download Manager](#7-model-download-manager)
8. [Hardware-Based Model Recommendations](#8-hardware-based-model-recommendations)
9. [Dependency Checker & Resolver](#9-dependency-checker--resolver)
10. [Configuration Generator](#10-configuration-generator)
11. [Update Mechanism](#11-update-mechanism)
12. [Uninstaller & Cleanup](#12-uninstaller--cleanup)
13. [Portable Mode](#13-portable-mode)
14. [Error Recovery & Diagnostics](#14-error-recovery--diagnostics)

---

## 1. Installer Philosophy

### 1.1 Design Goals

1. **One-click install** — User downloads one `.exe`, clicks install, JARVIS works
2. **No prerequisites** — Installer handles Python, Ollama, models, everything
3. **Hardware-adaptive** — Setup wizard recommends models for the user's hardware
4. **Resumable** — Model downloads can be paused and resumed
5. **Offline-capable** — After first install, JARVIS never requires internet
6. **Non-destructive** — Never overwrites user data, always backs up configs
7. **Fast startup** — Under 3 seconds from click to UI (after initial setup)

### 1.2 Install Flow Overview

```
Download JARVIS.exe (or .msi)
         │
         ▼
┌─────────────────────────┐
│  System Requirements    │ ── Fail → Show requirements & exit
│  Check                  │
└──────────┬──────────────┘
           │ Pass
           ▼
┌─────────────────────────┐
│  Install Tauri Shell    │ (Extract bundled app)
│  + Frontend Assets      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  First-Run Wizard       │ (Only on first launch)
│  - Hardware detection   │
│  - Privacy settings     │
│  - Model selection      │
│  - Voice setup          │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Bootstrap Backend      │
│  - Create Python venv   │
│  - Install pip deps     │
│  - Install Ollama       │
│  - Download models      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Launch JARVIS          │
│  - Start Python backend │
│  - Start Tauri window   │
│  - Show main UI         │
└─────────────────────────┘
```

---

## 2. System Requirements Validation

### 2.1 Requirements Checker (Rust — runs before anything else)

```rust
#[derive(Serialize)]
pub struct SystemCheck {
    pub os_supported: bool,
    pub os_version: String,
    pub ram_mb: u64,
    pub ram_sufficient: bool,
    pub disk_free_gb: f64,
    pub disk_sufficient: bool,
    pub gpu_name: Option<String>,
    pub gpu_vram_mb: Option<u64>,
    pub cpu_cores: usize,
    pub python_found: bool,
    pub python_version: Option<String>,
    pub ollama_found: bool,
    pub internet_available: bool,
    pub overall_ready: bool,
    pub issues: Vec<String>,
}

pub fn check_system_requirements() -> SystemCheck {
    let mut check = SystemCheck::default();
    let mut issues = Vec::new();
    
    // OS Check
    check.os_version = std::env::consts::OS.to_string();
    check.os_supported = matches!(check.os_version.as_str(), "windows" | "linux" | "macos");
    if !check.os_supported {
        issues.push("Unsupported operating system".into());
    }
    
    // RAM Check
    let sys = sysinfo::System::new_all();
    check.ram_mb = sys.total_memory() / 1024 / 1024;
    check.ram_sufficient = check.ram_mb >= 8192;  // 8GB minimum
    if !check.ram_sufficient {
        issues.push(format!(
            "Insufficient RAM: {}MB detected, 8192MB required. JARVIS may run slowly.",
            check.ram_mb
        ));
    }
    
    // Disk Check
    check.disk_free_gb = get_free_disk_space_gb();
    check.disk_sufficient = check.disk_free_gb >= 15.0;  // 15GB for app + models
    if !check.disk_sufficient {
        issues.push(format!(
            "Low disk space: {:.1}GB free, 15GB recommended for models.",
            check.disk_free_gb
        ));
    }
    
    // CPU Check
    check.cpu_cores = num_cpus::get();
    
    // GPU Check (via nvidia-smi or platform APIs)
    if let Some(gpu) = detect_gpu_info() {
        check.gpu_name = Some(gpu.name);
        check.gpu_vram_mb = Some(gpu.vram_mb);
    }
    
    // Python Check
    if let Ok(output) = std::process::Command::new("python")
        .args(["--version"]).output() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        check.python_version = Some(version.clone());
        check.python_found = true;
    }
    
    // Ollama Check
    check.ollama_found = std::process::Command::new("ollama")
        .arg("--version").output().is_ok();
    
    // Internet Check (quick HEAD request)
    check.internet_available = check_internet();
    
    check.issues = issues;
    check.overall_ready = check.os_supported && check.ram_sufficient && check.disk_sufficient;
    
    check
}
```

### 2.2 Minimum & Recommended Specs

```
MINIMUM (8GB RAM, no GPU):
  - OS: Windows 10+, macOS 12+, Ubuntu 22.04+
  - RAM: 8GB
  - Disk: 10GB free
  - CPU: 4 cores
  - GPU: None (CPU inference)
  - Models: phi3:mini Q4, whisper-tiny, piper-fast

RECOMMENDED (16GB RAM, 6GB+ VRAM):
  - RAM: 16GB
  - Disk: 30GB free
  - GPU: NVIDIA GTX 1660+ (6GB VRAM)
  - Models: llama3:8b Q4_K_M, whisper-small, piper-medium

OPTIMAL (32GB RAM, 12GB+ VRAM):
  - RAM: 32GB+
  - Disk: 50GB+ free
  - GPU: NVIDIA RTX 3060+ (12GB VRAM)
  - Models: llama3:8b Q6_K, whisper-medium, xtts-v2
```

---

## 3. Installer Package Generation

### 3.1 Tauri Build Configuration

```json
// tauri.conf.json — Bundle section
{
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "identifier": "com.jarvis.ai",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "python/**",
      "data/config/**",
      "data/prompts/**"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "nsis": {
        "installMode": "currentUser",
        "displayLanguageSelector": false,
        "installerIcon": "icons/icon.ico",
        "headerImage": "icons/header.bmp",
        "sidebarImage": "icons/sidebar.bmp"
      }
    }
  }
}
```

### 3.2 Build Script

```powershell
# build-installer.ps1

# 1. Build frontend
Set-Location frontend
npm run build
Set-Location ..

# 2. Build Tauri app
Set-Location src-tauri
cargo tauri build

# Output: src-tauri/target/release/bundle/
#   - msi/JARVIS_0.1.0_x64_en-US.msi
#   - nsis/JARVIS_0.1.0_x64-setup.exe
```

---

## 4. First-Run Setup Wizard

### 4.1 Wizard Steps

```typescript
type WizardStep = 
    | 'welcome'
    | 'hardware-scan'
    | 'privacy-settings'
    | 'model-selection'
    | 'voice-setup'
    | 'api-keys'        // Optional
    | 'installing'
    | 'complete';

interface WizardState {
    currentStep: WizardStep;
    hardwareProfile: HardwareProfile;
    settings: {
        enableTelemetry: boolean;
        enableCloudFallback: boolean;
        dataStorageLocation: string;
    };
    selectedModels: {
        primaryLLM: string;
        codeLLM: string | null;
        sttModel: string;
        ttsVoice: string;
        embeddingModel: string;
    };
    voiceSettings: {
        wakeWord: string;
        ttsEnabled: boolean;
        sttEnabled: boolean;
    };
    apiKeys: {
        gemini?: string;
        openrouter?: string;
    };
}
```

### 4.2 Welcome Screen

```typescript
function WelcomeStep({ onNext }: StepProps) {
    return (
        <div className="wizard-step">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 style={{ color: '#00F0FF', fontSize: 36 }}>
                    Welcome to JARVIS
                </h1>
                <p style={{ color: '#8899AA', fontSize: 16, maxWidth: 500 }}>
                    Your personal AI operating system. Let's set everything up 
                    for your hardware — this will only take a few minutes.
                </p>
                <button onClick={onNext} className="wizard-primary-btn">
                    Get Started
                </button>
            </motion.div>
        </div>
    );
}
```

### 4.3 Hardware Scan Step

```typescript
function HardwareScanStep({ onNext, setState }: StepProps) {
    const [scanning, setScanning] = useState(true);
    const [profile, setProfile] = useState<HardwareProfile | null>(null);
    
    useEffect(() => {
        invoke<HardwareProfile>('detect_hardware').then((hw) => {
            setProfile(hw);
            setState(prev => ({ ...prev, hardwareProfile: hw }));
            setScanning(false);
        });
    }, []);
    
    return (
        <div className="wizard-step">
            {scanning ? (
                <div>
                    <Spinner />
                    <p>Scanning your hardware...</p>
                </div>
            ) : profile && (
                <div>
                    <h2>Your System</h2>
                    <div className="hardware-card">
                        <div>CPU: {profile.cpu_name} ({profile.cpu_cores} cores)</div>
                        <div>RAM: {(profile.total_ram_mb / 1024).toFixed(1)} GB</div>
                        <div>GPU: {profile.gpu_name || 'None detected'}</div>
                        {profile.gpu_vram_mb > 0 && (
                            <div>VRAM: {(profile.gpu_vram_mb / 1024).toFixed(1)} GB</div>
                        )}
                        <div className="tier-badge" data-tier={profile.performance_tier}>
                            Performance Tier: {profile.performance_tier.toUpperCase()}
                        </div>
                    </div>
                    <button onClick={onNext} className="wizard-primary-btn">
                        Continue
                    </button>
                </div>
            )}
        </div>
    );
}
```

### 4.4 Model Selection Step

```typescript
function ModelSelectionStep({ state, onNext }: StepProps) {
    const recommendations = getModelRecommendations(state.hardwareProfile);
    const [selected, setSelected] = useState(recommendations);
    
    const totalSize = calculateTotalDownloadSize(selected);
    
    return (
        <div className="wizard-step">
            <h2>Choose Your Models</h2>
            <p>Based on your hardware, we recommend these models:</p>
            
            <div className="model-grid">
                {/* Primary LLM */}
                <ModelSelector
                    label="Chat Model"
                    description="Main AI model for conversations"
                    options={getCompatibleModels('chat', state.hardwareProfile)}
                    selected={selected.primaryLLM}
                    onChange={(m) => setSelected(prev => ({ ...prev, primaryLLM: m }))}
                    recommended={recommendations.primaryLLM}
                />
                
                {/* Voice STT */}
                <ModelSelector
                    label="Speech Recognition"
                    options={getCompatibleModels('stt', state.hardwareProfile)}
                    selected={selected.sttModel}
                    onChange={(m) => setSelected(prev => ({ ...prev, sttModel: m }))}
                    recommended={recommendations.sttModel}
                />
                
                {/* TTS Voice */}
                <ModelSelector
                    label="Voice Output"
                    options={getCompatibleModels('tts', state.hardwareProfile)}
                    selected={selected.ttsVoice}
                    onChange={(m) => setSelected(prev => ({ ...prev, ttsVoice: m }))}
                    recommended={recommendations.ttsVoice}
                />
            </div>
            
            <div className="download-summary">
                Total download: {totalSize.toFixed(1)} GB
                <br />
                Estimated time: {estimateDownloadTime(totalSize)}
            </div>
            
            <button onClick={() => onNext(selected)} className="wizard-primary-btn">
                Download & Install Models
            </button>
        </div>
    );
}
```

---

## 5. Python Environment Bootstrap

### 5.1 Python Venv Creation

```python
# bootstrap.py — Run by Tauri on first launch

import subprocess
import sys
import os
import venv

JARVIS_DIR = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.join(JARVIS_DIR, ".venv")
REQUIREMENTS_FILE = os.path.join(JARVIS_DIR, "requirements.txt")

def create_venv():
    """Create a Python virtual environment for JARVIS."""
    if os.path.exists(VENV_DIR):
        return  # Already exists
    
    print("Creating Python environment...")
    venv.create(VENV_DIR, with_pip=True, system_site_packages=False)

def install_dependencies():
    """Install all Python dependencies."""
    pip = get_pip_path()
    
    # Upgrade pip first
    subprocess.run([pip, "install", "--upgrade", "pip"], check=True)
    
    # Install requirements
    subprocess.run(
        [pip, "install", "-r", REQUIREMENTS_FILE, "--no-warn-script-location"],
        check=True,
    )

def get_pip_path():
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "pip.exe")
    return os.path.join(VENV_DIR, "bin", "pip")

def get_python_path():
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python")
```

### 5.2 Requirements Tiers

```
# requirements-core.txt — Always installed
fastapi==0.115.*
uvicorn[standard]==0.34.*
websockets==13.*
pydantic==2.*
aiohttp==3.*
aiosqlite==0.20.*
chromadb==0.5.*
sentence-transformers==3.*

# requirements-voice.txt — If voice enabled
faster-whisper==1.*
piper-tts==1.*
silero-vad==5.*
sounddevice==0.5.*
numpy>=1.24

# requirements-vision.txt — If vision enabled
Pillow>=10.0
mss>=9.0
easyocr>=1.7
opencv-python-headless>=4.8

# requirements-automation.txt — If automation enabled
playwright==1.*
pyautogui==0.9.*

# requirements-gpu.txt — If NVIDIA GPU detected
llama-cpp-python==0.3.*  # With CUDA
# Note: Install with CMAKE_ARGS="-DGGML_CUDA=on" pip install llama-cpp-python
```

### 5.3 Rust-Side Bootstrap Orchestration

```rust
#[tauri::command]
async fn bootstrap_python(
    app: tauri::AppHandle,
    window: tauri::Window,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let venv_dir = data_dir.join(".venv");
    let bootstrap_script = data_dir.join("python").join("bootstrap.py");
    
    // Emit progress events to the setup wizard UI
    window.emit("bootstrap:progress", json!({
        "step": "Creating Python environment...",
        "percent": 10
    })).ok();
    
    // Find system Python
    let python = find_python().ok_or("Python not found. Installing...")?;
    
    // Create venv
    let status = Command::new(&python)
        .args(["-m", "venv", venv_dir.to_str().unwrap()])
        .status()
        .map_err(|e| e.to_string())?;
    
    if !status.success() {
        return Err("Failed to create Python environment".into());
    }
    
    window.emit("bootstrap:progress", json!({
        "step": "Installing dependencies...",
        "percent": 30
    })).ok();
    
    // Install pip dependencies
    let venv_pip = if cfg!(windows) {
        venv_dir.join("Scripts").join("pip.exe")
    } else {
        venv_dir.join("bin").join("pip")
    };
    
    let requirements = data_dir.join("python").join("requirements-core.txt");
    let status = Command::new(&venv_pip)
        .args(["install", "-r", requirements.to_str().unwrap()])
        .status()
        .map_err(|e| e.to_string())?;
    
    if !status.success() {
        return Err("Failed to install dependencies".into());
    }
    
    window.emit("bootstrap:progress", json!({
        "step": "Python environment ready!",
        "percent": 100
    })).ok();
    
    Ok(())
}
```

---

## 6. Ollama Auto-Install

### 6.1 Ollama Installer

```rust
#[tauri::command]
async fn install_ollama(window: tauri::Window) -> Result<(), String> {
    // Check if already installed
    if Command::new("ollama").arg("--version").output().is_ok() {
        return Ok(());
    }
    
    window.emit("bootstrap:progress", json!({
        "step": "Downloading Ollama...",
        "percent": 0
    })).ok();
    
    #[cfg(target_os = "windows")]
    {
        // Download Ollama installer for Windows
        let url = "https://ollama.com/download/OllamaSetup.exe";
        let installer_path = std::env::temp_dir().join("OllamaSetup.exe");
        
        // Download with progress
        download_file(url, &installer_path, |progress| {
            window.emit("bootstrap:progress", json!({
                "step": "Downloading Ollama...",
                "percent": (progress * 50.0) as u32
            })).ok();
        }).await?;
        
        // Run silent install
        window.emit("bootstrap:progress", json!({
            "step": "Installing Ollama...",
            "percent": 60
        })).ok();
        
        let status = Command::new(&installer_path)
            .args(["/VERYSILENT", "/NORESTART"])
            .status()
            .map_err(|e| e.to_string())?;
        
        if !status.success() {
            return Err("Ollama installation failed".into());
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let status = Command::new("sh")
            .args(["-c", "curl -fsSL https://ollama.com/install.sh | sh"])
            .status()
            .map_err(|e| e.to_string())?;
        
        if !status.success() {
            return Err("Ollama installation failed".into());
        }
    }
    
    // Start Ollama server
    window.emit("bootstrap:progress", json!({
        "step": "Starting Ollama...",
        "percent": 90
    })).ok();
    
    Command::new("ollama")
        .arg("serve")
        .spawn()
        .map_err(|e| e.to_string())?;
    
    // Wait for server
    for _ in 0..30 {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        if reqwest::get("http://localhost:11434/api/tags").await.is_ok() {
            window.emit("bootstrap:progress", json!({
                "step": "Ollama ready!",
                "percent": 100
            })).ok();
            return Ok(());
        }
    }
    
    Err("Ollama started but not responding".into())
}
```

---

## 7. Model Download Manager

### 7.1 Download Manager with Resume Support

```python
class ModelDownloadManager:
    """Download models with progress tracking and resume support."""
    
    def __init__(self, models_dir: str):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.active_downloads: dict[str, DownloadTask] = {}
    
    async def download_model(
        self, 
        model_id: str, 
        url: str,
        expected_size: int,
        progress_callback=None,
    ) -> str:
        """Download a model file with resume support."""
        
        dest_path = self.models_dir / f"{model_id}.gguf"
        partial_path = self.models_dir / f"{model_id}.gguf.partial"
        
        # Check for existing partial download
        existing_size = 0
        if partial_path.exists():
            existing_size = partial_path.stat().st_size
        
        headers = {}
        if existing_size > 0:
            headers["Range"] = f"bytes={existing_size}-"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as resp:
                total = expected_size
                downloaded = existing_size
                
                mode = "ab" if existing_size > 0 else "wb"
                
                with open(partial_path, mode) as f:
                    async for chunk in resp.content.iter_chunked(1024 * 1024):  # 1MB chunks
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if progress_callback:
                            await progress_callback({
                                "model_id": model_id,
                                "downloaded": downloaded,
                                "total": total,
                                "percent": (downloaded / total) * 100,
                            })
        
        # Rename partial to final
        partial_path.rename(dest_path)
        
        return str(dest_path)
    
    async def download_ollama_model(
        self,
        model_name: str,
        progress_callback=None,
    ):
        """Download via Ollama pull."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:11434/api/pull",
                json={"name": model_name, "stream": True},
            ) as resp:
                async for line in resp.content:
                    if line:
                        data = json.loads(line)
                        if progress_callback and "total" in data:
                            await progress_callback({
                                "model_id": model_name,
                                "status": data.get("status", "downloading"),
                                "downloaded": data.get("completed", 0),
                                "total": data.get("total", 0),
                                "percent": (
                                    data.get("completed", 0) / data["total"] * 100
                                    if data.get("total") else 0
                                ),
                            })
```

---

## 8. Hardware-Based Model Recommendations

### 8.1 Recommendation Engine

```python
def get_model_recommendations(hardware: HardwareProfile) -> ModelRecommendations:
    """Generate model recommendations based on hardware."""
    
    ram_gb = hardware.total_ram_mb / 1024
    vram_gb = hardware.gpu_vram_mb / 1024
    
    # Chat model — the most important choice
    if vram_gb >= 10:
        primary_llm = "llama3:8b-instruct-q6_K"
        primary_reason = "Best quality — your GPU has plenty of VRAM"
    elif vram_gb >= 6:
        primary_llm = "llama3:8b-instruct-q4_K_M"
        primary_reason = "Great balance of quality and speed for your GPU"
    elif ram_gb >= 16:
        primary_llm = "mistral:7b-instruct-q4_K_M"
        primary_reason = "Efficient model — good quality with CPU inference"
    elif ram_gb >= 12:
        primary_llm = "phi3:mini-q4_K_M"
        primary_reason = "Lightweight but capable — optimized for your RAM"
    else:
        primary_llm = "qwen2:1.5b-instruct-q4_K_M"
        primary_reason = "Ultra-light model for your 8GB system"
    
    # STT model
    if ram_gb >= 16 and vram_gb >= 4:
        stt = "whisper-medium"
    elif ram_gb >= 12:
        stt = "whisper-small"
    elif ram_gb >= 8:
        stt = "whisper-base"
    else:
        stt = "whisper-tiny"
    
    # TTS voice
    if ram_gb >= 16:
        tts = "en_US-lessac-medium"
    else:
        tts = "en_US-lessac-low"
    
    total_download_gb = estimate_download_size(primary_llm, stt, tts)
    
    return ModelRecommendations(
        primary_llm=ModelRecommendation(
            model_id=primary_llm,
            reason=primary_reason,
            size_gb=MODEL_SIZES[primary_llm],
        ),
        stt=ModelRecommendation(model_id=stt, size_gb=MODEL_SIZES[stt]),
        tts=ModelRecommendation(model_id=tts, size_gb=MODEL_SIZES[tts]),
        embedding=ModelRecommendation(model_id="all-MiniLM-L6-v2", size_gb=0.08),
        total_download_gb=total_download_gb,
    )
```

---

## 9. Dependency Checker & Resolver

### 9.1 Runtime Dependency Validation

```python
class DependencyChecker:
    """Verify all JARVIS dependencies are installed and working."""
    
    async def check_all(self) -> DependencyReport:
        """Check all runtime dependencies."""
        checks = await asyncio.gather(
            self.check_python_packages(),
            self.check_ollama(),
            self.check_models(),
            self.check_database(),
            self.check_voice_deps(),
        )
        
        return DependencyReport(
            python_packages=checks[0],
            ollama=checks[1],
            models=checks[2],
            database=checks[3],
            voice=checks[4],
            all_ok=all(c.ok for c in checks),
        )
    
    async def check_python_packages(self) -> CheckResult:
        """Verify critical Python packages are importable."""
        required = [
            "fastapi", "uvicorn", "websockets", "pydantic",
            "aiohttp", "aiosqlite", "chromadb", "sentence_transformers",
        ]
        
        missing = []
        for pkg in required:
            try:
                __import__(pkg)
            except ImportError:
                missing.append(pkg)
        
        return CheckResult(
            ok=len(missing) == 0,
            missing=missing,
            message=f"{len(missing)} missing packages" if missing else "All packages installed",
        )
    
    async def check_models(self) -> CheckResult:
        """Verify at least one LLM model is available."""
        available = await self.model_manager.list_available()
        has_llm = any(m.type == "llm" for m in available)
        has_embedding = any(m.type == "embedding" for m in available)
        
        issues = []
        if not has_llm:
            issues.append("No LLM model available")
        if not has_embedding:
            issues.append("No embedding model available")
        
        return CheckResult(ok=len(issues) == 0, missing=issues)
```

---

## 10. Configuration Generator

### 10.1 Config File Generation

```python
def generate_default_config(hardware: HardwareProfile, wizard_state: dict) -> dict:
    """Generate jarvis.toml configuration from wizard selections."""
    
    config = {
        "jarvis": {
            "version": "0.1.0",
            "first_run": False,
            "data_dir": str(Path.home() / ".jarvis"),
        },
        "backend": {
            "host": "127.0.0.1",
            "port": 8000,
            "workers": 1,
        },
        "models": {
            "primary_llm": wizard_state["selectedModels"]["primaryLLM"],
            "embedding": wizard_state["selectedModels"]["embeddingModel"],
            "provider": "ollama",  # Default
        },
        "voice": {
            "enabled": wizard_state["voiceSettings"]["sttEnabled"],
            "stt_model": wizard_state["selectedModels"]["sttModel"],
            "tts_voice": wizard_state["selectedModels"]["ttsVoice"],
            "wake_word": wizard_state["voiceSettings"]["wakeWord"],
        },
        "ui": {
            "quality": hardware.performance_tier,
            "overlay_enabled": True,
            "quick_command_hotkey": "Ctrl+Space",
        },
        "privacy": {
            "telemetry": wizard_state["settings"]["enableTelemetry"],
            "cloud_fallback": wizard_state["settings"]["enableCloudFallback"],
        },
        "hardware": {
            "tier": hardware.performance_tier,
            "gpu_layers": "auto",
            "cpu_threads": max(1, hardware.cpu_cores - 2),
        },
    }
    
    return config
```

---

## 11. Update Mechanism

### 11.1 Tauri Updater

```json
// tauri.conf.json — Updater section
{
  "plugins": {
    "updater": {
      "active": true,
      "dialog": true,
      "pubkey": "JARVIS_UPDATE_PUBLIC_KEY",
      "endpoints": [
        "https://releases.jarvis.ai/{{target}}/{{arch}}/{{current_version}}"
      ]
    }
  }
}
```

### 11.2 Update Orchestration

```rust
#[tauri::command]
async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    // Check app updates
    let updater = app.updater_builder().build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => Ok(Some(UpdateInfo {
            version: update.version.clone(),
            notes: update.body.clone(),
            date: update.date.clone(),
        })),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
```

### 11.3 Model Update Check

```python
async def check_model_updates(self) -> list[ModelUpdate]:
    """Check if newer versions of installed models are available."""
    updates = []
    
    for model in self.installed_models:
        if model.provider == "ollama":
            # Check Ollama registry for updates
            latest = await self.ollama.check_manifest(model.name)
            if latest and latest.digest != model.digest:
                updates.append(ModelUpdate(
                    model_id=model.id,
                    current_version=model.digest[:12],
                    latest_version=latest.digest[:12],
                    size_delta_mb=latest.size - model.size,
                ))
    
    return updates
```

---

## 12. Uninstaller & Cleanup

### 12.1 Clean Uninstall

```rust
// NSIS uninstaller hook — registered by Tauri bundle
// Removes:
//   - Application files (executable, frontend assets)
//   - Python venv (.venv/)
//   - Application data (AppData/com.jarvis.ai/)
// Does NOT remove:
//   - User's downloaded models (data/models/) — too large, user should decide
//   - Ollama installation — shared with other apps
//   - User conversation history (data/memory/) — user data

#[tauri::command]
async fn cleanup_on_uninstall(app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // Remove venv
    let venv = data_dir.join(".venv");
    if venv.exists() {
        std::fs::remove_dir_all(&venv).ok();
    }
    
    // Remove cache
    let cache = data_dir.join("cache");
    if cache.exists() {
        std::fs::remove_dir_all(&cache).ok();
    }
    
    // Preserve user data — do NOT delete models/ or memory/
    Ok(())
}
```

---

## 13. Portable Mode

### 13.1 Portable Detection

```rust
fn is_portable_mode() -> bool {
    // If a "portable.txt" file exists next to the executable, run in portable mode
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));
    
    if let Some(dir) = exe_dir {
        dir.join("portable.txt").exists()
    } else {
        false
    }
}

fn get_data_dir(app: &tauri::AppHandle) -> PathBuf {
    if is_portable_mode() {
        // Store everything next to the executable
        std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .join("jarvis-data")
    } else {
        // Standard AppData location
        app.path().app_data_dir().unwrap()
    }
}
```

---

## 14. Error Recovery & Diagnostics

### 14.1 Bootstrap Error Handling

```python
class BootstrapRecovery:
    """Handle common bootstrap failures."""
    
    RECOVERY_STRATEGIES = {
        "pip_install_failed": [
            "Retry with --no-cache-dir",
            "Upgrade pip and retry",
            "Install packages one-by-one to identify the failing package",
        ],
        "ollama_not_starting": [
            "Check if port 11434 is already in use",
            "Restart Ollama service",
            "Reinstall Ollama",
        ],
        "model_download_failed": [
            "Check internet connection",
            "Resume partial download",
            "Try alternative download source",
        ],
        "venv_creation_failed": [
            "Check Python installation",
            "Remove corrupted .venv and retry",
            "Install Python from python.org",
        ],
    }
    
    async def recover(self, error_type: str, error_msg: str) -> bool:
        """Attempt automatic recovery from a bootstrap error."""
        
        if error_type == "pip_install_failed":
            # Retry without cache
            result = subprocess.run(
                [get_pip_path(), "install", "-r", "requirements-core.txt", "--no-cache-dir"],
                capture_output=True
            )
            return result.returncode == 0
        
        elif error_type == "venv_creation_failed":
            import shutil
            venv_path = Path(VENV_DIR)
            if venv_path.exists():
                shutil.rmtree(venv_path)
            create_venv()
            return True
        
        return False
```

### 14.2 Diagnostic Report

```python
async def generate_diagnostic_report() -> dict:
    """Generate a full diagnostic report for troubleshooting."""
    return {
        "system": {
            "os": platform.platform(),
            "python": sys.version,
            "architecture": platform.machine(),
        },
        "hardware": (await detect_hardware()).dict(),
        "dependencies": (await DependencyChecker().check_all()).dict(),
        "config": load_config(),
        "models": {
            "installed": [m.dict() for m in await list_installed_models()],
            "loaded": [s for s in model_manager.loaded_models.keys()],
        },
        "services": {
            "backend_running": await check_backend_health(),
            "ollama_running": await OllamaManager().is_running(),
        },
        "logs": {
            "last_errors": get_recent_errors(limit=20),
        },
    }
```

---

*This document specifies the complete installer and bootstrap system for JARVIS. The goal is a seamless first-run experience: one download, one click, and JARVIS is ready — with hardware-optimal models pre-selected and all dependencies automatically managed.*

*Last Updated: 2026-05-19*
