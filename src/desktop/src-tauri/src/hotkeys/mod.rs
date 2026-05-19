use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

pub fn register_hotkeys(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.global_shortcut().on_shortcuts(
        [
            // Ctrl+Space: Toggle JARVIS main window
            tauri_plugin_global_shortcut::Shortcut::new(Some(Modifiers::CONTROL), Code::Space),
            // Ctrl+Shift+J: Quick command input
            tauri_plugin_global_shortcut::Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::KeyJ,
            ),
            // Ctrl+Shift+V: Voice input toggle
            tauri_plugin_global_shortcut::Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::KeyV,
            ),
            // Ctrl+Shift+O: Toggle overlay
            tauri_plugin_global_shortcut::Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::KeyO,
            ),
        ],
        |app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let code = shortcut.key;
                let mods = shortcut.mods;

                match code {
                    Code::Space if mods == Modifiers::CONTROL => {
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
