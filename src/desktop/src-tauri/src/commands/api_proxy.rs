/// API Proxy — relays HTTP requests from the Tauri webview to the local backend,
/// bypassing browser mixed-content / CORS restrictions.

use serde::Serialize;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

const BACKEND_URL: &str = "http://127.0.0.1:8420";

fn client(timeout: u64) -> reqwest::Client {
    reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(timeout))
        .build()
        .unwrap_or_default()
}

#[derive(Serialize, Clone)]
pub struct ProxyResponse {
    pub status: u16,
    pub body: String,
}

#[tauri::command]
pub async fn proxy_get(path: String) -> Result<ProxyResponse, String> {
    let url = format!("{BACKEND_URL}{path}");
    let resp = client(10)
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let body = resp.text().await.map_err(|e| e.to_string())?;
    Ok(ProxyResponse { status, body })
}

#[tauri::command]
pub async fn proxy_post(path: String, body: String) -> Result<ProxyResponse, String> {
    let url = format!("{BACKEND_URL}{path}");
    let resp = client(60)
        .post(&url)
        .header("Content-Type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let rbody = resp.text().await.map_err(|e| e.to_string())?;
    Ok(ProxyResponse { status, body: rbody })
}

/// Streaming chat — sends each SSE chunk through a Tauri Channel
#[tauri::command]
pub async fn proxy_stream_chat(
    message: String,
    on_event: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let url = format!("{BACKEND_URL}/api/chat");
    let body = serde_json::json!({ "message": message });

    let resp = client(120)
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Backend unreachable: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Backend returned {}", resp.status()));
    }

    // Read response in chunks and forward raw SSE lines to the frontend
    let mut response = resp;
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        let text = String::from_utf8_lossy(&chunk);
        on_event.send(text.to_string()).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// TTS proxy — fetches audio from backend and returns as base64
/// This bypasses the mixed-content restriction for audio blob playback
#[tauri::command]
pub async fn proxy_tts(text: String, singing: Option<bool>) -> Result<String, String> {
    let url = format!("{BACKEND_URL}/api/tts");
    let body = serde_json::json!({ "text": text, "singing": singing.unwrap_or(false) });

    let resp = client(30)
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("TTS backend unreachable: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("TTS backend returned {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    Ok(BASE64.encode(&bytes))
}

/// Vision proxy — uploads image to backend vision endpoint and returns result
#[tauri::command]
pub async fn proxy_vision(image_base64: String, query: String) -> Result<String, String> {
    let url = format!("{BACKEND_URL}/api/vision/analyze?query={}", urlencoding::encode(&query));

    // Decode base64 image to bytes
    let image_bytes = BASE64.decode(&image_base64)
        .map_err(|e| format!("Invalid base64: {e}"))?;

    // Create multipart form
    let part = reqwest::multipart::Part::bytes(image_bytes)
        .file_name("webcam-frame.jpg")
        .mime_str("image/jpeg")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new().part("file", part);

    let resp = client(90)
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Vision backend unreachable: {e}"))?;

    let status = resp.status().as_u16();
    let body = resp.text().await.map_err(|e| e.to_string())?;

    if status != 200 {
        return Err(format!("Vision error ({}): {}", status, body));
    }
    Ok(body)
}

/// Fast YOLO detection proxy — returns bounding boxes for live overlay
#[tauri::command]
pub async fn proxy_vision_detect(image_base64: String) -> Result<String, String> {
    let url = format!("{BACKEND_URL}/api/vision/detect");

    let image_bytes = BASE64.decode(&image_base64)
        .map_err(|e| format!("Invalid base64: {e}"))?;

    let part = reqwest::multipart::Part::bytes(image_bytes)
        .file_name("frame.jpg")
        .mime_str("image/jpeg")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new().part("file", part);

    let resp = client(10)
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Detect unreachable: {e}"))?;

    let body = resp.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}
