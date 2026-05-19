use sysinfo::System;
use std::path::PathBuf;
use tauri::Manager;

pub struct AppState {
    pub gpu_name: String,
    pub gpu_vram_mb: u64,
    pub cpu_threads: usize,
    pub ram_total_mb: u64,
    pub workspace_root: PathBuf,
}

impl AppState {
    pub fn new(app: &tauri::AppHandle) -> Self {
        let sys = System::new_all();

        let ram_total_mb = sys.total_memory() / 1024 / 1024;
        let cpu_threads = sys.cpus().len();

        // GPU detection — best-effort via nvidia-smi
        let (gpu_name, gpu_vram_mb) = detect_gpu();

        let workspace_root = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));

        Self {
            gpu_name,
            gpu_vram_mb,
            cpu_threads,
            ram_total_mb,
            workspace_root,
        }
    }
}

fn detect_gpu() -> (String, u64) {
    // Try nvidia-smi
    if let Ok(output) = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=name,memory.total",
            "--format=csv,noheader,nounits",
        ])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let line = stdout.trim();
            if let Some((name, vram_str)) = line.split_once(", ") {
                let vram = vram_str.trim().parse::<u64>().unwrap_or(0);
                return (name.trim().to_string(), vram);
            }
        }
    }

    ("Integrated / None".to_string(), 0)
}
