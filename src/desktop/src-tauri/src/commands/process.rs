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

pub async fn start_python_backend(app: &AppHandle) -> Result<(), String> {
    set_status(BackendStatus::Starting);

    // First check if backend is already running (user started it manually)
    if let Ok(resp) = reqwest::get(format!("http://{BACKEND_HOST}:{BACKEND_PORT}/health")).await {
        if resp.status().is_success() {
            set_status(BackendStatus::Running);
            return Ok(());
        }
    }

    // Find the backend directory by searching multiple candidate paths
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
        // Installed: user's project directory (stored in env or well-known path)
        std::path::PathBuf::from(r"C:\Users\Aniket\OneDrive\Desktop\Jarvis\src\backend"),
    ];

    let backend_dir = candidates
        .iter()
        .map(|p| std::fs::canonicalize(p).unwrap_or(p.clone()))
        .find(|p| p.join("main.py").exists());

    let backend_dir = match backend_dir {
        Some(dir) => dir,
        None => {
            set_status(BackendStatus::Error);
            return Err("Could not find backend directory (main.py). Start the backend manually: cd src/backend && python main.py".into());
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

    let child = std::process::Command::new(&python)
        .args([
            "-u",
            backend_main.to_str().unwrap(),
        ])
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
    for _ in 0..60 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        if let Ok(resp) = reqwest::get(format!("http://{BACKEND_HOST}:{BACKEND_PORT}/health")).await
        {
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
