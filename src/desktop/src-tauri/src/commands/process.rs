use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Clone, PartialEq)]
pub enum BackendStatus {
    Starting,
    Running,
    Stopped,
    Error,
}

pub struct BackendState {
    pub status: BackendStatus,
    pub pid: Option<u32>,
}

static BACKEND: Mutex<Option<BackendState>> = Mutex::new(None);

const BACKEND_PORT: u16 = 8420;
const BACKEND_HOST: &str = "127.0.0.1";
const OLLAMA_URL: &str = "http://127.0.0.1:11434";

/// Ensure Ollama is running. If not, try to start it.
/// Helper: build a reqwest client with short timeout and no proxy (avoids Windows proxy hangs)
fn http_client(timeout_secs: u64) -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .build()
        .unwrap_or_default()
}

pub async fn ensure_ollama_running() -> Result<(), String> {
    let client = http_client(5);

    // Check if already running
    if let Ok(resp) = client.get(format!("{OLLAMA_URL}/api/tags")).send().await {
        if resp.status().is_success() {
            crate::log("Ollama already running");
            return Ok(());
        }
    }
    crate::log("Ollama not running, searching for binary...");

    // Build dynamic search paths for Ollama
    let mut ollama_paths = vec!["ollama".to_string()];

    // User-specific install location (dynamic, not hardcoded)
    if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
        ollama_paths.push(format!(r"{}\Programs\Ollama\ollama.exe", localappdata));
    }
    // System-wide install locations
    ollama_paths.push(r"C:\Program Files\Ollama\ollama.exe".to_string());
    ollama_paths.push(r"C:\Program Files (x86)\Ollama\ollama.exe".to_string());

    // Also check PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(';') {
            let candidate = std::path::PathBuf::from(dir).join("ollama.exe");
            if candidate.exists() {
                ollama_paths.push(candidate.to_string_lossy().to_string());
                break;
            }
        }
    }

    let mut started = false;
    for path in &ollama_paths {
        crate::log(&format!("Trying Ollama from: {path}"));
        match std::process::Command::new(path)
            .arg("serve")
            // Allow Tauri webview origin for CORS
            .env("OLLAMA_ORIGINS", "https://tauri.localhost,http://localhost:1420,http://localhost:5173,http://localhost:8420")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
        {
            Ok(_child) => {
                crate::log(&format!("Ollama spawned from: {path}"));
                started = true;
                break;
            }
            Err(e) => {
                crate::log(&format!("Ollama spawn failed from {path}: {e}"));
                continue;
            }
        }
    }

    if !started {
        return Err("Could not find or start Ollama. Please install it from https://ollama.ai".into());
    }

    // Wait for Ollama to be ready (up to 20s)
    for i in 0..40 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        if let Ok(resp) = client.get(format!("{OLLAMA_URL}/api/tags")).send().await {
            if resp.status().is_success() {
                crate::log(&format!("Ollama ready (took ~{}ms)", i * 500));
                return Ok(());
            }
        }
    }

    Err("Ollama started but not responding within 20s".into())
}

/// Pre-load the jarvis model so the first chat response is fast
pub async fn warmup_model() {
    crate::log("warming up jarvis model...");
    let client = http_client(60);
    // Send a tiny generate request to load the model into memory
    let body = serde_json::json!({
        "model": "jarvis",
        "prompt": "hi",
        "stream": false,
        "options": { "num_predict": 1 }
    });
    match client
        .post(format!("{OLLAMA_URL}/api/generate"))
        .json(&body)
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            crate::log("Model 'jarvis' loaded into memory");
        }
        Ok(resp) => {
            crate::log(&format!("Model warmup response: {}", resp.status()));
        }
        Err(e) => {
            crate::log(&format!("Model warmup failed (non-critical): {e}"));
        }
    }
}

pub async fn start_python_backend(app: &AppHandle) -> Result<(), String> {
    set_status(BackendStatus::Starting);

    let client = http_client(5);

    // First check if backend is already running (user started it manually)
    if let Ok(resp) = client.get(format!("http://{BACKEND_HOST}:{BACKEND_PORT}/health")).send().await {
        if resp.status().is_success() {
            crate::log("Backend already running");
            set_status(BackendStatus::Running);
            return Ok(());
        }
    }

    // --- Strategy 1: Try Tauri sidecar (bundled exe) ---
    let sidecar_result = try_sidecar_backend(app).await;
    if sidecar_result.is_ok() {
        return sidecar_result;
    }
    crate::log(&format!("Sidecar not available, trying Python fallback: {:?}", sidecar_result.err()));

    // --- Strategy 2: Find and run Python backend (dev mode / unbundled) ---
    try_python_backend().await
}

/// Launch the bundled sidecar binary (jarvis-backend.exe built by PyInstaller)
async fn try_sidecar_backend(app: &AppHandle) -> Result<(), String> {
    // Copy .env from resources to exe directory so the sidecar can find it
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_env = resource_dir.join(".env");
        if bundled_env.exists() {
            // Also copy to %APPDATA%/JARVIS/ for persistence
            if let Ok(appdata) = std::env::var("APPDATA") {
                let jarvis_dir = std::path::PathBuf::from(appdata).join("JARVIS");
                let _ = std::fs::create_dir_all(&jarvis_dir);
                let dest_env = jarvis_dir.join(".env");
                if !dest_env.exists() {
                    let _ = std::fs::copy(&bundled_env, &dest_env);
                    crate::log(&format!("Copied .env to {}", dest_env.display()));
                }
            }
        }
    }

    // Find the sidecar exe
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .to_path_buf();

    let sidecar_exe = exe_dir.join("jarvis-backend.exe");
    if !sidecar_exe.exists() {
        return Err(format!("Sidecar not found at {}", sidecar_exe.display()));
    }

    crate::log(&format!("Starting sidecar backend: {}", sidecar_exe.display()));

    let child = std::process::Command::new(&sidecar_exe)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start sidecar: {e}"))?;

    let pid = child.id();
    {
        let mut lock = BACKEND.lock().unwrap();
        *lock = Some(BackendState {
            status: BackendStatus::Running,
            pid: Some(pid),
        });
    }

    // Wait for backend to be healthy (sidecar takes a few seconds to extract + start)
    let client = http_client(5);
    for i in 0..60 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        if let Ok(resp) = client.get(format!("http://{BACKEND_HOST}:{BACKEND_PORT}/health")).send().await {
            if resp.status().is_success() {
                crate::log(&format!("Sidecar backend ready (took ~{}ms)", i * 500));
                set_status(BackendStatus::Running);
                return Ok(());
            }
        }
    }

    set_status(BackendStatus::Error);
    Err("Sidecar backend failed to become healthy within 30s".into())
}

/// Dev mode: find and run the Python backend directly
async fn try_python_backend() -> Result<(), String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .to_path_buf();

    let candidates = vec![
        // Dev mode: exe is in src/desktop/src-tauri/target/{debug,release}
        exe_dir.join("../../../../backend"),
        // Dev mode: CWD based
        std::env::current_dir().unwrap_or_default().join("../../backend"),
        // Installed: backend alongside exe
        exe_dir.join("backend"),
    ];

    let backend_dir = candidates
        .iter()
        .map(|p| std::fs::canonicalize(p).unwrap_or(p.clone()))
        .find(|p| p.join("main.py").exists());

    let backend_dir = match backend_dir {
        Some(dir) => dir,
        None => {
            set_status(BackendStatus::Error);
            return Err("Could not find backend directory (main.py). The backend sidecar is not bundled and Python source was not found.".into());
        }
    };

    let backend_main = backend_dir.join("main.py");

    // Find python — prefer the backend's own venv
    let venv_python = backend_dir.join(".venv").join("Scripts").join("python.exe");
    let python = if venv_python.exists() {
        venv_python.to_str().unwrap().to_string()
    } else {
        "python".to_string()
    };

    crate::log(&format!("Starting Python backend: {python} {}", backend_main.display()));

    let child = std::process::Command::new(&python)
        .args(["-u", backend_main.to_str().unwrap()])
        .current_dir(&backend_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start backend with {python}: {e}"))?;

    let pid = child.id();
    {
        let mut lock = BACKEND.lock().unwrap();
        *lock = Some(BackendState {
            status: BackendStatus::Running,
            pid: Some(pid),
        });
    }

    // Wait for backend to be healthy
    let client = http_client(5);
    for _ in 0..60 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        if let Ok(resp) = client.get(format!("http://{BACKEND_HOST}:{BACKEND_PORT}/health")).send().await {
            if resp.status().is_success() {
                set_status(BackendStatus::Running);
                return Ok(());
            }
        }
    }

    set_status(BackendStatus::Error);
    Err("Backend failed to become healthy within 30s".into())
}

#[tauri::command]
pub async fn get_backend_status() -> Result<BackendStatus, String> {
    let lock = BACKEND.lock().unwrap();
    match lock.as_ref() {
        Some(state) => Ok(state.status.clone()),
        None => Ok(BackendStatus::Stopped),
    }
}

#[tauri::command]
pub async fn restart_backend(app: tauri::AppHandle) -> Result<(), String> {
    // Kill existing
    {
        let lock = BACKEND.lock().unwrap();
        if let Some(state) = lock.as_ref() {
            if let Some(pid) = state.pid {
                #[cfg(target_os = "windows")]
                {
                    let _ = std::process::Command::new("taskkill")
                        .args(["/PID", &pid.to_string(), "/F"])
                        .output();
                }
            }
        }
    }

    start_python_backend(&app).await
}

fn set_status(status: BackendStatus) {
    let mut lock = BACKEND.lock().unwrap();
    if let Some(state) = lock.as_mut() {
        state.status = status;
    } else {
        *lock = Some(BackendState {
            status,
            pid: None,
        });
    }
}
