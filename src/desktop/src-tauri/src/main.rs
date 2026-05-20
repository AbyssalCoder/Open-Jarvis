// JARVIS — Desktop Runtime Entry Point
// Tauri 2.x application shell

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod hotkeys;
mod state;
mod tray;

use tauri::{Emitter, Manager};

/// Write a debug line to %TEMP%/jarvis_boot.log
fn log(msg: &str) {
    use std::io::Write;
    let path = std::env::temp_dir().join("jarvis_boot.log");
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
        let elapsed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let _ = writeln!(f, "[{elapsed}] {msg}");
    }
}

fn main() {
    log("main() entered");
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            log("setup() entered");

            // Initialize application state
            let app_state = state::AppState::new(app.handle());
            app.manage(app_state);
            log("state initialized");

            // Setup system tray
            if let Err(e) = tray::setup_tray(app) {
                log(&format!("tray FAILED: {e}"));
                return Err(e);
            }
            log("tray OK");

            // Register global hotkeys
            if let Err(e) = hotkeys::register_hotkeys(app) {
                log(&format!("hotkeys FAILED: {e}"));
                // Non-fatal: continue even if hotkeys fail
            } else {
                log("hotkeys OK");
            }

            // Auto-start Ollama + Python backend
            let handle = app.handle().clone();
            log("spawning async boot task");
            tauri::async_runtime::spawn(async move {
                log("async boot task STARTED");

                // Step 1: Start Ollama if not running
                let _ = handle.emit("boot:status", "Starting Ollama...");
                log("starting Ollama...");
                match commands::process::ensure_ollama_running().await {
                    Ok(()) => {
                        log("Ollama started OK, warming up model...");
                        let _ = handle.emit("boot:status", "Loading AI model...");
                        commands::process::warmup_model().await;
                        log("model warmup done");
                    }
                    Err(e) => {
                        log(&format!("Ollama start warning: {e}"));
                    }
                }

                // Step 2: Start Python backend
                let _ = handle.emit("boot:status", "Starting Backend...");
                log("starting backend...");
                match commands::process::start_python_backend(&handle).await {
                    Ok(()) => log("backend started OK"),
                    Err(e) => log(&format!("backend FAILED: {e}")),
                }

                let _ = handle.emit("boot:status", "Ready");
                log("boot sequence complete");
            });

            log("setup() returning Ok");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::system::get_hardware_profile,
            commands::window::toggle_main_window,
            commands::window::create_overlay,
            commands::process::get_backend_status,
            commands::process::restart_backend,
            commands::file::read_file_safe,
            commands::file::write_file_safe,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JARVIS");
}
