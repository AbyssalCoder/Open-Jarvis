use serde::Serialize;
use sysinfo::System;
use tauri::State;

use crate::state::AppState;

#[derive(Serialize, Clone)]
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
        gpu_name: state.gpu_name.clone(),
        gpu_vram_mb: state.gpu_vram_mb,
        os_name: System::os_version().unwrap_or_default(),
        hostname: System::host_name().unwrap_or_default(),
    })
}

#[derive(Serialize, Clone)]
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
    let ram = state.ram_total_mb;
    let vram = state.gpu_vram_mb;

    let (tier, quality, model) = match (vram, ram) {
        (v, r) if v >= 12000 && r >= 32000 => ("ultra", "ULTRA", "llama3-8b-q6k"),
        (v, r) if v >= 6000 && r >= 16000 => ("high", "HIGH", "llama3-8b-q4km"),
        (v, r) if v >= 4000 && r >= 12000 => ("medium", "MEDIUM", "mistral-7b-q4km"),
        (_, r) if r >= 8000 => ("low", "LOW", "phi3-mini-q4km"),
        _ => ("minimal", "MINIMAL", "qwen2-1.5b-q4km"),
    };

    Ok(HardwareProfile {
        tier: tier.to_string(),
        cpu_threads: state.cpu_threads,
        ram_total_mb: ram,
        gpu_vram_mb: vram,
        recommended_model: model.to_string(),
        ui_quality: quality.to_string(),
    })
}
