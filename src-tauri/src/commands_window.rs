//! Open additional Markup windows on demand. Each new window is an
//! independent WebView that boots the same SPA — its tabs, vault, and
//! settings live in localStorage which is shared per origin, so opening
//! the same vault in two windows reflects state changes between them on
//! the next reload (we keep that out of scope for now and let each
//! window operate independently).

use crate::error::{AppError, AppResult};
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub fn new_window(app: AppHandle) -> AppResult<()> {
    // Pick a label that won't collide with the existing "main" window.
    let suffix = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let label = format!("w{}", suffix);

    let builder = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title("Markup")
        .inner_size(1100.0, 720.0)
        .min_inner_size(640.0, 400.0)
        .resizable(true);

    // Transparent title bar + hidden title text are macOS-only builder methods;
    // Windows/Linux use the default decorations. Matches the static window in
    // tauri.conf.json, whose `titleBarStyle`/`hiddenTitle` are likewise ignored
    // off macOS.
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Transparent)
        .hidden_title(true);

    builder
        .build()
        .map_err(|e| AppError::Other(format!("create window: {e}")))?;
    Ok(())
}
