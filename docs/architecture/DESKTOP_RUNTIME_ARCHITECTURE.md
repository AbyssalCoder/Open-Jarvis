# JARVIS — Desktop Runtime Architecture

## Tauri 2.x Native Shell & System Integration

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Desktop → Runtime Shell

---

## Table of Contents

1. [Why Tauri 2.x](#1-why-tauri-2x)
2. [Architecture Overview](#2-architecture-overview)
3. [Rust Backend Core](#3-rust-backend-core)
4. [IPC Command System](#4-ipc-command-system)
5. [Window Management](#5-window-management)
6. [System Tray & Background Mode](#6-system-tray--background-mode)
7. [Global Hotkeys](#7-global-hotkeys)
8. [Native File Access](#8-native-file-access)
9. [Python Backend Management](#9-python-backend-management)
10. [Auto-Update System](#10-auto-update-system)
11. [Build & Distribution](#11-build--distribution)
12. [Electron Fallback](#12-electron-fallback)
13. [Multi-Window Architecture](#13-multi-window-architecture)
14. [Platform-Specific Integration](#14-platform-specific-integration)

---

## 1. Why Tauri 2.x

### 1.1 Decision Rationale

Validated by Jan (42.6k stars) — a production desktop AI app built with Tauri + TypeScript + Rust:

| Factor | Tauri 2.x | Electron | Decision |
|---|---|---|---|
| **Bundle size** | ~10MB | ~150MB+ | Tauri wins |
| **RAM (idle)** | ~80MB | ~300MB+ | Tauri wins — critical for 8GB machines |
| **Startup time** | ~200ms | ~1-2s | Tauri wins |
| **Security** | Strong sandbox, Rust backend | Full Node.js access | Tauri wins |
| **Native APIs** | Via Rust + plugins | Via Node.js | Both good |
| **Ecosystem** | Growing (v2 stable) | Mature | Electron ahead |
| **Rendering** | System WebView2 | Bundled Chromium | Trade-off |

**Verdict: Tauri 2.x is PRIMARY. Electron is optional fallback only.**

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     TAURI 2.x SHELL                       │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │                 RUST CORE (src-tauri/)              │  │
│  │                                                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │  │
│  │  │ Window   │ │ System   │ │ Python Process    │  │  │
│  │  │ Manager  │ │ Tray     │ │ Manager           │  │  │
│  │  └──────────┘ └──────────┘ └───────────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │  │
│  │  │ Global   │ │ File     │ │ Auto-Update       │  │  │
│  │  │ Hotkeys  │ │ System   │ │ Manager           │  │  │
│  │  └──────────┘ └──────────┘ └───────────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │  │
│  │  │ IPC      │ │ Overlay  │ │ Hardware          │  │  │
│  │  │ Bridge   │ │ Window   │ │ Detection         │  │  │
│  │  └──────────┘ └──────────┘ └───────────────────┘  │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │ Tauri IPC (invoke/events)       │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │              WEBVIEW2 (Frontend)                    │  │
│  │  React 18 + Three.js + TailwindCSS                 │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │ Tauri API (window, fs, shell, etc.)          │   │  │
│  │  │ WebSocket Client → Python Backend            │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │ Manages                          │ WebSocket
         ▼                                  ▼
┌──────────────────┐              ┌──────────────────────┐
│ Python Backend   │              │ Ollama / llama.cpp   │
│ (FastAPI)        │◄────────────►│ (Model Runtime)      │
│ Port 8420        │              │ Port 11434           │
└──────────────────┘              └──────────────────────┘
```

---

## 3. Rust Backend Core

### 3.1 Project Structure

```
src-tauri/
├── Cargo.toml
├── build.rs
├── tauri.conf.json
├── capabilities/
│   ├── default.json          # Default permissions
│   └── overlay.json          # Overlay window permissions
├── icons/
│   ├── icon.ico
│   ├── icon.png
│   └── tray-icon.png
└── src/
    ├── main.rs               # Entry point
    ├── lib.rs                 # Core setup
    ├── commands/
    │   ├── mod.rs
    │   ├── window.rs          # Window management commands
    │   ├── system.rs          # System info commands
    │   ├── file.rs            # File system commands
    │   ├── process.rs         # Python process management
    │   └── hardware.rs        # Hardware detection
    ├── state/
    │   ├── mod.rs
    │   └── app_state.rs       # Global application state
    ├── tray/
    │   ├── mod.rs
    │   └── menu.rs            # System tray menu
    ├── hotkeys/
    │   ├── mod.rs
    │   └── global.rs          # Global hotkey registration
    └── updater/
        ├── mod.rs
        └── check.rs           # Auto-update logic
```

### 3.2 Main Entry Point

```rust
// src-tauri/src/main.rs

use tauri::Manager;

mod commands;
mod state;
mod tray;
mod hotkeys;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // Initialize application state
            let state = state::AppState::new(app.handle().clone());
            app.manage(state);
            
            // Setup system tray
            tray::setup_tray(app)?;
            
            // Register global hotkeys
            hotkeys::register_hotkeys(app)?;
            
            // Start Python backend
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                commands::process::start_python_backend(&handle).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::create_overlay,
            commands::window::toggle_main_window,
            commands::system::get_system_info,
            commands::system::get_hardware_profile,
            commands::file::read_file_safe,
            commands::file::write_file_safe,
            commands::process::get_backend_status,
            commands::process::restart_backend,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JARVIS");
}
```

---

## 4. IPC Command System

### 4.1 Command Pattern

```rust
// src-tauri/src/commands/system.rs

use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::State;

use crate::state::AppState;

#[derive(Serialize)]
pub struct SystemInfo {
    pub cpu_cores: usize,
    pub cpu_usage: f32,
    pub total_ram_mb: u64,
    pub used_ram_mb: u64,
    pub gpu_name: String,
    pub gpu_vram_mb: u64,
    pub os_name: String,
    pub hostname: String,
}

#[tauri::command]
pub async fn get_system_info(state: State<'_, AppState>) -> Result<SystemInfo, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    Ok(SystemInfo {
        cpu_cores: sys.cpus().len(),
        cpu_usage: sys.global_cpu_usage(),
        total_ram_mb: sys.total_memory() / 1024 / 1024,
        used_ram_mb: sys.used_memory() / 1024 / 1024,
        gpu_name: state.hardware.gpu_name.clone(),
        gpu_vram_mb: state.hardware.gpu_vram_mb,
        os_name: System::os_version().unwrap_or_default(),
        hostname: System::host_name().unwrap_or_default(),
    })
}

#[derive(Serialize)]
pub struct HardwareProfile {
    pub tier: String,
    pub cpu_threads: usize,
    pub ram_total_mb: u64,
    pub gpu_vram_mb: u64,
    pub recommended_model: String,
    pub ui_quality: String,
}

#[tauri::command]
pub async fn get_hardware_profile(state: State<'_, AppState>) -> Result<HardwareProfile, String> {
    let hw = &state.hardware;
    
    let (tier, quality, model) = match (hw.gpu_vram_mb, hw.ram_total_mb) {
        (v, r) if v >= 12000 && r >= 32000 => ("ultra", "ULTRA", "llama3-8b-q6k"),
        (v, r) if v >= 6000 && r >= 16000 => ("high", "HIGH", "llama3-8b-q4km"),
        (v, r) if v >= 4000 && r >= 12000 => ("medium", "MEDIUM", "mistral-7b-q4km"),
        (_, r) if r >= 8000 => ("low", "LOW", "phi3-mini-q4km"),
        _ => ("minimal", "MINIMAL", "qwen2-1.5b-q4km"),
    };
    
    Ok(HardwareProfile {
        tier: tier.to_string(),
        cpu_threads: hw.cpu_threads,
        ram_total_mb: hw.ram_total_mb,
        gpu_vram_mb: hw.gpu_vram_mb,
        recommended_model: model.to_string(),
        ui_quality: quality.to_string(),
    })
}
```

### 4.2 Frontend IPC Usage

```typescript
import { invoke } from '@tauri-apps/api/core';

// Typed invoke wrappers
export const tauriAPI = {
    async getSystemInfo(): Promise<SystemInfo> {
        return invoke<SystemInfo>('get_system_info');
    },
    
    async getHardwareProfile(): Promise<HardwareProfile> {
        return invoke<HardwareProfile>('get_hardware_profile');
    },
    
    async toggleMainWindow(): Promise<void> {
        return invoke('toggle_main_window');
    },
    
    async createOverlay(): Promise<void> {
        return invoke('create_overlay');
    },
    
    async getBackendStatus(): Promise<BackendStatus> {
        return invoke<BackendStatus>('get_backend_status');
    },
};
```

---

## 5. Window Management

### 5.1 Window Types

```rust
// src-tauri/src/commands/window.rs

use tauri::{WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn toggle_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn create_overlay(app: tauri::AppHandle) -> Result<(), String> {
    let _overlay = WebviewWindowBuilder::new(
        &app,
        "overlay",
        WebviewUrl::App("overlay.html".into()),
    )
    .title("JARVIS Overlay")
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .inner_size(400.0, 600.0)
    .position(
        // Position at right edge of screen
        screen_width - 420.0,
        100.0,
    )
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}
```

### 5.2 Tauri Window Configuration

```json
// src-tauri/tauri.conf.json
{
    "app": {
        "windows": [
            {
                "label": "main",
                "title": "JARVIS",
                "width": 1280,
                "height": 800,
                "minWidth": 800,
                "minHeight": 600,
                "resizable": true,
                "decorations": true,
                "transparent": false,
                "center": true,
                "visible": true
            }
        ],
        "security": {
            "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ws://localhost:8420 http://localhost:8420 http://localhost:11434"
        }
    },
    "bundle": {
        "active": true,
        "targets": "all",
        "identifier": "com.jarvis.ai",
        "icon": [
            "icons/32x32.png",
            "icons/128x128.png",
            "icons/128x128@2x.png",
            "icons/icon.icns",
            "icons/icon.ico"
        ]
    }
}
```

---

## 6. System Tray & Background Mode

### 6.1 System Tray

```rust
// src-tauri/src/tray/mod.rs

use tauri::{
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    menu::{Menu, MenuItem},
    Manager,
};

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show JARVIS", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    
    let menu = Menu::with_items(app, &[&show, &settings, &quit])?;
    
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("JARVIS AI Assistant")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "settings" => {
                    let _ = app.emit("navigate", "/settings");
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;
    
    Ok(())
}
```

---

## 7. Global Hotkeys

### 7.1 Hotkey Registration

```rust
// src-tauri/src/hotkeys/mod.rs

use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

pub fn register_hotkeys(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.global_shortcut().on_shortcuts(
        [
            // Ctrl+Space: Toggle JARVIS main window
            tauri_plugin_global_shortcut::Shortcut::new(Some(Modifiers::CONTROL), Code::Space),
            
            // Ctrl+Shift+J: Quick command input
            tauri_plugin_global_shortcut::Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyJ
            ),
            
            // Ctrl+Shift+V: Voice input
            tauri_plugin_global_shortcut::Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyV
            ),
            
            // Ctrl+Shift+O: Toggle overlay
            tauri_plugin_global_shortcut::Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyO
            ),
        ],
        |app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let code = shortcut.key;
                let mods = shortcut.mods;
                
                match code {
                    Code::Space if mods == Some(Modifiers::CONTROL) => {
                        let _ = app.emit("hotkey:toggle-window", ());
                    }
                    Code::KeyJ => {
                        let _ = app.emit("hotkey:quick-command", ());
                    }
                    Code::KeyV => {
                        let _ = app.emit("hotkey:voice-input", ());
                    }
                    Code::KeyO => {
                        let _ = app.emit("hotkey:toggle-overlay", ());
                    }
                    _ => {}
                }
            }
        },
    )?;
    
    Ok(())
}
```

### 7.2 Frontend Hotkey Handling

```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for hotkey events from Rust
listen('hotkey:toggle-window', () => {
    // Toggle main window visibility
    tauriAPI.toggleMainWindow();
});

listen('hotkey:quick-command', () => {
    // Focus the chat input
    document.getElementById('chat-input')?.focus();
});

listen('hotkey:voice-input', () => {
    // Start voice recording
    useUIStore.getState().toggleVoiceRecording();
});

listen('hotkey:toggle-overlay', () => {
    useUIStore.getState().toggleOverlay();
});
```

---

## 8. Native File Access

### 8.1 File Operations

```rust
// src-tauri/src/commands/file.rs

use std::path::PathBuf;
use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub async fn read_file_safe(
    path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let path = PathBuf::from(&path);
    
    // Validate path is within allowed scope
    if !state.path_validator.is_allowed(&path) {
        return Err("Access denied: path is outside allowed scope".to_string());
    }
    
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file_safe(
    path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&path);
    
    // Validate path
    if !state.path_validator.is_allowed(&path) {
        return Err("Access denied: path is outside allowed scope".to_string());
    }
    
    // Create parent directories if needed
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }
    
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| e.to_string())
}
```

---

## 9. Python Backend Management

### 9.1 Process Manager

```rust
// src-tauri/src/commands/process.rs

use std::process::Command;
use tokio::process::Command as AsyncCommand;

pub async fn start_python_backend(app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let python_dir = app_data_dir.join("backend");
    let venv_python = if cfg!(windows) {
        python_dir.join("venv/Scripts/python.exe")
    } else {
        python_dir.join("venv/bin/python")
    };
    
    let mut child = AsyncCommand::new(&venv_python)
        .arg("-m")
        .arg("uvicorn")
        .arg("main:app")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg("8420")
        .arg("--workers")
        .arg("1")
        .current_dir(&python_dir)
        .spawn()
        .map_err(|e| format!("Failed to start Python backend: {}", e))?;
    
    // Store PID for management
    if let Some(pid) = child.id() {
        app.emit("backend:started", pid).ok();
    }
    
    // Monitor process
    tokio::spawn(async move {
        let status = child.wait().await;
        // Backend crashed — attempt restart
        if let Ok(status) = status {
            if !status.success() {
                // Emit crash event to frontend
                // Auto-restart logic
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
pub async fn get_backend_status() -> Result<BackendStatus, String> {
    // Health check against Python backend
    match reqwest::get("http://127.0.0.1:8420/health").await {
        Ok(resp) if resp.status().is_success() => {
            Ok(BackendStatus { running: true, port: 8420 })
        }
        _ => Ok(BackendStatus { running: false, port: 8420 }),
    }
}
```

---

## 10. Auto-Update System

### 10.1 Update Configuration

```json
// src-tauri/tauri.conf.json (updater section)
{
    "plugins": {
        "updater": {
            "endpoints": [
                "https://releases.jarvis-ai.local/{{target}}/{{arch}}/{{current_version}}"
            ],
            "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ...",
            "windows": {
                "installMode": "passive"
            }
        }
    }
}
```

### 10.2 Update Check Flow

```rust
use tauri_plugin_updater::UpdaterExt;

pub async fn check_for_updates(app: &tauri::AppHandle) -> Result<bool, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            // Notify frontend about available update
            app.emit("update:available", &update.version).ok();
            Ok(true)
        }
        Ok(None) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}
```

---

## 11. Build & Distribution

### 11.1 Build Configuration

```toml
# src-tauri/Cargo.toml
[package]
name = "jarvis"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-global-shortcut = "2"
tauri-plugin-shell = "2"
tauri-plugin-fs = "2"
tauri-plugin-notification = "2"
tauri-plugin-clipboard-manager = "2"
tauri-plugin-updater = "2"
tauri-plugin-window-state = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sysinfo = "0.31"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json"] }

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

### 11.2 Build Script

```powershell
# Build for Windows
npm run build              # Build frontend
cargo tauri build          # Build Tauri app

# Output: src-tauri/target/release/bundle/
#   ├── msi/jarvis_0.1.0_x64.msi
#   └── nsis/jarvis_0.1.0_x64-setup.exe
```

---

## 12. Electron Fallback

### 12.1 When to Use Electron

Electron is ONLY used as fallback when:
- WebView2 is not available (very old Windows)
- User explicitly requests it
- Specific platform limitation prevents Tauri

### 12.2 Abstraction Layer

```typescript
// src/platform/desktop.ts — Abstract desktop API that works with both Tauri and Electron

interface DesktopAPI {
    getSystemInfo(): Promise<SystemInfo>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    toggleWindow(): Promise<void>;
    showNotification(title: string, body: string): Promise<void>;
}

// Auto-detect runtime
export const desktop: DesktopAPI = 
    window.__TAURI__ ? new TauriDesktopAPI() : new ElectronDesktopAPI();
```

---

## 13. Multi-Window Architecture

### 13.1 Window Types

| Window | Purpose | Properties |
|---|---|---|
| `main` | Primary JARVIS interface | Standard window, resizable, taskbar |
| `overlay` | Always-on-top HUD | Transparent, no decorations, always on top |
| `quick-input` | Quick command palette | Small, centered, auto-close |
| `settings` | Settings panel | Modal, fixed size |
| `diagnostics` | System diagnostics | Separate window, resizable |

---

## 14. Platform-Specific Integration

### 14.1 Windows-Specific

```rust
#[cfg(target_os = "windows")]
mod windows {
    use windows::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;
    
    pub fn setup() {
        // Set app user model ID for taskbar grouping
        unsafe {
            SetCurrentProcessExplicitAppUserModelID(
                windows::core::w!("com.jarvis.ai")
            ).ok();
        }
    }
}
```

### 14.2 macOS-Specific (Future)

```rust
#[cfg(target_os = "macos")]
mod macos {
    pub fn setup(app: &tauri::App) {
        // macOS-specific setup
        // - Menu bar integration
        // - Dock icon
        // - Accessibility permissions
    }
}
```

### 14.3 Linux-Specific (Future)

```rust
#[cfg(target_os = "linux")]
mod linux {
    pub fn setup(app: &tauri::App) {
        // Linux-specific setup
        // - D-Bus integration
        // - Desktop entry
        // - Notification daemon
    }
}
```

---

*This document specifies the complete desktop runtime architecture for JARVIS using Tauri 2.x. The Rust backend provides native performance and security while the WebView2 frontend delivers the cinematic UI experience.*

*Last Updated: 2026-05-19*
