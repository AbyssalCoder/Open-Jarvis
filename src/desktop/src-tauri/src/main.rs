// JARVIS — Desktop Runtime Entry Point
// Tauri 2.x application shell

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod hotkeys;
mod state;
mod tray;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // Initialize application state
            let app_state = state::AppState::new(app.handle());
            app.manage(app_state);

            // Setup system tray
            tray::setup_tray(app)?;

            // Register global hotkeys
            hotkeys::register_hotkeys(app)?;

            // Start Python backend process
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = commands::process::start_python_backend(&handle).await {
                    eprintln!("[JARVIS] Failed to start Python backend: {e}");
                }
            });

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
