//! Vault-scoped IPC commands (open vault, list files, search).

use crate::error::{AppError, AppResult};
use crate::index::{index_dir_for_vault, SearchHit};
use crate::vault::{VaultFileEntry, VaultState};
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

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
    path: String,
) -> AppResult<VaultOpened> {
    let root = PathBuf::from(&path);
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(format!("app_data_dir: {e}")))?;
    let index_dir = index_dir_for_vault(&app_data, &root);

    let count = state.open(root.clone(), app.clone(), index_dir).await?;
    Ok(VaultOpened {
        root: root.to_string_lossy().into_owned(),
        file_count: count,
    })
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
