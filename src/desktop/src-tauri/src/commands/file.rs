use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::State;

use crate::state::AppState;

/// Validate path is within allowed workspace scope
fn validate_path(path: &str, workspace: &Path) -> Result<PathBuf, String> {
    let requested = PathBuf::from(path);
    let canonical = requested
        .canonicalize()
        .map_err(|_| format!("Path does not exist: {path}"))?;

    if !canonical.starts_with(workspace) {
        return Err("Access denied: path is outside workspace".into());
    }

    // Block sensitive extensions
    if let Some(ext) = canonical.extension() {
        let blocked = ["exe", "dll", "bat", "cmd", "ps1", "msi", "sys"];
        if blocked.contains(&ext.to_str().unwrap_or("")) {
            return Err("Access denied: blocked file type".into());
        }
    }

    Ok(canonical)
}

#[tauri::command]
pub async fn read_file_safe(
    path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let validated = validate_path(&path, &state.workspace_root)?;
    std::fs::read_to_string(validated).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file_safe(
    path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let validated = validate_path(&path, &state.workspace_root)?;

    // Create parent dirs if needed
    if let Some(parent) = validated.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(validated, content).map_err(|e| e.to_string())
}
