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

#[tauri::command]
pub async fn rename_file(from: String, to: String) -> AppResult<()> {
    let from_path = PathBuf::from(&from);
    let to_path = PathBuf::from(&to);
    if to_path.exists() {
        return Err(AppError::Other(format!(
            "destination already exists: {to}"
        )));
    }
    if let Some(parent) = to_path.parent() {
        if !parent.exists() {
            tokio::fs::create_dir_all(parent).await?;
        }
    }
    tokio::fs::rename(&from_path, &to_path).await?;
    Ok(())
}

/// Move a file to the user's Trash. macOS-only — uses NSFileManager via
/// `osascript` to keep dependencies trivial. Note: this requires the user
/// to grant Automation access to System Events on first use.
#[tauri::command]
pub async fn trash_file(path: String) -> AppResult<()> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(AppError::Other(format!("not found: {path}")));
    }
    // Use AppleScript to move to Trash. POSIX path handles arbitrary chars.
    let script = format!(
        "tell application \"Finder\" to delete POSIX file \"{}\"",
        path.replace('\\', "\\\\").replace('"', "\\\"")
    );
    let status = tokio::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .status()
        .await?;
    if !status.success() {
        return Err(AppError::Other(format!(
            "osascript trash failed (status: {status})"
        )));
    }
    Ok(())
}

/// Write an image (typically clipboard paste) to the vault and return the
/// relative path used to reference it from markdown.
///
/// `dir_relative` is appended to the vault root (eg. "assets" or
/// "images/{date}"). `bytes` is the raw image data; `ext` is the image
/// extension without the dot (eg. "png").
#[tauri::command]
pub async fn write_image(
    vault_root: String,
    dir_relative: String,
    bytes: Vec<u8>,
    ext: String,
) -> AppResult<String> {
    let root = PathBuf::from(&vault_root);
    if !root.is_dir() {
        return Err(AppError::Other(format!("vault root not a dir: {vault_root}")));
    }
    let safe_ext = ext.trim_start_matches('.');
    let safe_ext = if safe_ext.is_empty() { "png" } else { safe_ext };
    let dir = root.join(dir_relative.trim_start_matches('/'));
    tokio::fs::create_dir_all(&dir).await?;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let file_name = format!("paste-{now_ms}.{safe_ext}");
    let abs = dir.join(&file_name);
    tokio::fs::write(&abs, bytes).await?;
    let rel = abs
        .strip_prefix(&root)
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|_| abs.clone());
    Ok(rel.to_string_lossy().into_owned())
}

/// Render markdown to standalone HTML (used by the export commands).
#[tauri::command]
pub async fn render_html(content: String, title: Option<String>) -> AppResult<String> {
    let mut opts = comrak::Options::default();
    opts.extension.table = true;
    opts.extension.strikethrough = true;
    opts.extension.tasklist = true;
    opts.extension.autolink = true;
    opts.extension.footnotes = true;
    opts.render.unsafe_ = true; // allow inline HTML

    let body = comrak::markdown_to_html(&content, &opts);
    let title = title.unwrap_or_else(|| "Markup export".to_string());

    let html = format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{}</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif;
    max-width: 720px;
    margin: 2.5rem auto;
    line-height: 1.7;
    color: #1f2328;
    padding: 0 1.25rem;
  }}
  h1, h2, h3, h4, h5, h6 {{ line-height: 1.25; }}
  pre {{ background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow: auto; }}
  code {{ font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9em; }}
  blockquote {{ border-left: 3px solid #d0d7de; padding-left: 1rem; color: #57606a; }}
  table {{ border-collapse: collapse; }}
  th, td {{ border: 1px solid #d0d7de; padding: 6px 12px; }}
  hr {{ border: none; border-top: 1px solid #d0d7de; margin: 2rem 0; }}
  img {{ max-width: 100%; }}
</style>
</head>
<body>
{}
</body>
</html>
"#,
        html_escape(&title),
        body
    );
    Ok(html)
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
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
