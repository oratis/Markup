//! Vault-scoped IPC commands (open vault, list files, search).

use crate::authorized::WriteScope;
use crate::error::{AppError, AppResult};
use crate::index::{index_dir_for_vault, SearchHit};
use crate::vault::{VaultFileEntry, VaultState};
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

/// Persisted "last vault" record. `bookmark_b64` is a macOS
/// security-scoped bookmark (sandbox builds); null on non-sandbox builds,
/// where `path` resolves directly.
#[derive(Serialize, Deserialize)]
struct VaultSession {
    path: String,
    bookmark_b64: Option<String>,
}

fn session_file(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(format!("app_data_dir: {e}")))?;
    std::fs::create_dir_all(&dir).ok();
    Ok(dir.join("last-vault.json"))
}

/// Persist the just-opened vault so the next launch can restore it.
/// Creates a security-scoped bookmark when possible (sandbox); best-effort.
fn persist_vault_session(app: &AppHandle, path: &str) {
    let bookmark_b64 = crate::bookmark::create(path)
        .map(|bytes| base64::engine::general_purpose::STANDARD.encode(bytes));
    let session = VaultSession {
        path: path.to_string(),
        bookmark_b64,
    };
    let Ok(file) = session_file(app) else { return };
    if let Ok(json) = serde_json::to_string(&session) {
        let _ = std::fs::write(file, json);
    }
}

#[derive(Debug, Serialize)]
pub struct VaultOpened {
    pub root: String,
    pub file_count: usize,
}

#[tauri::command]
pub async fn pick_vault(app: AppHandle) -> AppResult<Option<String>> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |maybe_path| {
        let _ = tx.send(maybe_path);
    });
    let picked = rx.await.map_err(|e| AppError::Other(e.to_string()))?;
    let Some(p) = picked else { return Ok(None) };
    let path: PathBuf = p
        .into_path()
        .map_err(|e| AppError::Other(format!("dialog returned non-path target: {e}")))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
pub async fn open_vault(
    app: AppHandle,
    state: State<'_, VaultState>,
    scope: State<'_, WriteScope>,
    path: String,
) -> AppResult<VaultOpened> {
    let root = PathBuf::from(&path);
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(format!("app_data_dir: {e}")))?;
    let index_dir = index_dir_for_vault(&app_data, &root);

    let count = state.open(root.clone(), app.clone(), index_dir).await?;
    // Grant write access to the whole vault tree so write_file / rename_file /
    // write_image accept targets inside it (the scope guard rejects anything
    // outside an opened folder).
    scope.authorize_dir(&root);
    // Remember this vault (+ a security-scoped bookmark on sandbox builds)
    // so the next launch can restore it. Best-effort.
    persist_vault_session(&app, &path);
    Ok(VaultOpened {
        root: root.to_string_lossy().into_owned(),
        file_count: count,
    })
}

/// Resolve the last vault for launch-time restore. Returns the folder
/// path after (on sandbox) re-acquiring access via its security-scoped
/// bookmark, or None if there's nothing to restore / access can't be
/// re-granted. The frontend opens the returned path through the normal
/// open-vault flow.
#[tauri::command]
pub fn restore_vault(app: AppHandle) -> AppResult<Option<String>> {
    let Ok(file) = session_file(&app) else {
        return Ok(None);
    };
    let Ok(raw) = std::fs::read_to_string(&file) else {
        return Ok(None);
    };
    let Ok(session) = serde_json::from_str::<VaultSession>(&raw) else {
        return Ok(None);
    };

    match session.bookmark_b64 {
        // Sandbox: must re-acquire access via the bookmark before std::fs
        // can read the folder. If that fails, don't hand back a path we
        // can't actually open.
        Some(b64) => {
            let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64) else {
                return Ok(None);
            };
            Ok(crate::bookmark::resolve_and_start(&bytes))
        }
        // Non-sandbox: the plain path resolves directly, but only offer it
        // if it still exists.
        None => {
            if PathBuf::from(&session.path).is_dir() {
                Ok(Some(session.path))
            } else {
                Ok(None)
            }
        }
    }
}

#[tauri::command]
pub fn close_vault(state: State<'_, VaultState>) -> AppResult<()> {
    state.close();
    Ok(())
}

#[tauri::command]
pub fn list_vault_files(state: State<'_, VaultState>) -> AppResult<Vec<VaultFileEntry>> {
    state.list_files()
}

#[tauri::command]
pub fn current_vault(state: State<'_, VaultState>) -> AppResult<Option<String>> {
    Ok(state.root().map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn search_vault(
    state: State<'_, VaultState>,
    query: String,
    limit: Option<usize>,
) -> AppResult<Vec<SearchHit>> {
    let index = state.index().ok_or(AppError::NoVault)?;
    index.search(&query, limit.unwrap_or(50))
}
