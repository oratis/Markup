use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct LoadedFile {
    pub path: String,
    pub content: String,
    pub mtime_ms: u128,
}

fn mtime_ms(meta: &std::fs::Metadata) -> u128 {
    meta.modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn looks_like_markdown(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase()),
        Some(ext) if matches!(ext.as_str(), "md" | "markdown" | "mdx" | "mkd")
    )
}

#[tauri::command]
pub async fn open_file(app: tauri::AppHandle) -> AppResult<Option<LoadedFile>> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "mdx", "mkd"])
        .pick_file(move |maybe_path| {
            let _ = tx.send(maybe_path);
        });

    let picked = rx.await.map_err(|e| AppError::Other(e.to_string()))?;
    let Some(file_path) = picked else { return Ok(None) };

    let path_buf: PathBuf = file_path
        .into_path()
        .map_err(|e| AppError::Other(format!("dialog returned non-path target: {e}")))?;

    let loaded = read_file_inner(&path_buf).await?;
    Ok(Some(loaded))
}

#[tauri::command]
pub async fn read_file(path: String) -> AppResult<LoadedFile> {
    let p = PathBuf::from(&path);
    read_file_inner(&p).await
}

async fn read_file_inner(path: &Path) -> AppResult<LoadedFile> {
    if !looks_like_markdown(path) {
        return Err(AppError::NotMarkdown(path.display().to_string()));
    }
    let content = tokio::fs::read_to_string(path).await?;
    let meta = tokio::fs::metadata(path).await?;
    Ok(LoadedFile {
        path: path.to_string_lossy().into_owned(),
        content,
        mtime_ms: mtime_ms(&meta),
    })
}

/// Append a perf observation to ~/Library/Logs/markup/perf.log.
/// Used by Spike 0.2 instrumentation. Failures are ignored.
#[tauri::command]
pub async fn log_perf(app: tauri::AppHandle, label: String, ms: f64) -> AppResult<()> {
    let log_dir = app
        .path()
        .home_dir()
        .map_err(|e| AppError::Other(format!("home_dir: {e}")))?
        .join("Library/Logs/markup");
    let _ = tokio::fs::create_dir_all(&log_dir).await;
    let log_path = log_dir.join("perf.log");
    let line = format!(
        "{}\t{}\t{:.2}\n",
        chrono_now_iso(),
        label,
        ms
    );
    let line_bytes = line.into_bytes();
    let _ = tokio::task::spawn_blocking(move || {
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .and_then(|mut f| f.write_all(&line_bytes))
    })
    .await;
    Ok(())
}

fn chrono_now_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}.{:03}", now.as_secs(), now.subsec_millis())
}

#[tauri::command]
pub async fn write_file(
    path: String,
    content: String,
    expected_mtime_ms: Option<u128>,
) -> AppResult<u128> {
    let path_buf = PathBuf::from(&path);

    if let Some(expected) = expected_mtime_ms {
        if let Ok(meta) = tokio::fs::metadata(&path_buf).await {
            let actual = mtime_ms(&meta);
            // tolerate small skew; cross-fs mtime can drift up to 1s
            if actual > expected && actual - expected > 1500 {
                return Err(AppError::StaleMtime);
            }
        }
    }

    // Atomic write via temp + rename in the same directory
    let parent = path_buf
        .parent()
        .ok_or_else(|| AppError::Other("path has no parent".into()))?;
    let file_name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::Other("path has no file name".into()))?;
    let tmp = parent.join(format!(".{file_name}.markup.tmp"));

    tokio::fs::write(&tmp, content.as_bytes()).await?;
    tokio::fs::rename(&tmp, &path_buf).await?;

    let meta = tokio::fs::metadata(&path_buf).await?;
    Ok(mtime_ms(&meta))
}
