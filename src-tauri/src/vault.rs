//! Vault: an open directory of markdown files plus its index and watcher.
//!
//! Holds shared state behind a parking_lot::RwLock so multiple Tauri commands
//! can read concurrently. Designed to be `manage()`d by the Tauri app builder.

use crate::error::{AppError, AppResult};
use crate::index::MarkupIndex;
use crate::scanner;
use crate::watcher::{VaultChange, VaultWatcher};
use parking_lot::RwLock;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Clone)]
pub struct VaultFileEntry {
    pub path: String,
    pub rel_path: String,
    pub name: String,
    pub mtime_ms: i64,
    pub size: u64,
}

#[derive(Default)]
pub struct VaultState {
    inner: RwLock<Option<OpenVault>>,
    /// Serializes `open()` calls. Without it, a launch-time restore and a
    /// user-triggered open could run concurrently and race on the Tantivy
    /// index writer lock / the final state swap.
    open_lock: tokio::sync::Mutex<()>,
}

struct OpenVault {
    root: PathBuf,
    index: Arc<MarkupIndex>,
    _watcher: VaultWatcher,
}

impl VaultState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn root(&self) -> Option<PathBuf> {
        self.inner.read().as_ref().map(|v| v.root.clone())
    }

    pub fn index(&self) -> Option<Arc<MarkupIndex>> {
        self.inner.read().as_ref().map(|v| v.index.clone())
    }

    pub fn close(&self) {
        *self.inner.write() = None;
    }

    /// Replace the open vault. Returns the file count discovered.
    pub async fn open(
        &self,
        root: PathBuf,
        app: AppHandle,
        index_dir: PathBuf,
    ) -> AppResult<usize> {
        // Serialize concurrent opens (e.g. launch restore vs. user open).
        let _open_guard = self.open_lock.lock().await;
        if !root.is_dir() {
            return Err(AppError::Other(format!(
                "vault path is not a directory: {}",
                root.display()
            )));
        }

        // Drop any currently-open vault FIRST so its Tantivy index writer
        // releases the `.tantivy-writer.lock` (a non-blocking *exclusive*
        // lock) and its watcher stops, before we open the new index. Without
        // this, re-opening the *same* vault — the user re-picks the open
        // folder — fails with a writer LockBusy error, because the old writer
        // is still alive until the state swap below. Trade-off: if the open
        // below fails (rare; the path is already validated as a dir), we're
        // left with no open vault rather than the previous one.
        *self.inner.write() = None;

        let index = Arc::new(MarkupIndex::open_or_create(&index_dir)?);

        // The persisted index can still hold docs for files deleted while the
        // app was closed (the watcher never saw those removals) — they'd
        // otherwise surface as dead search hits forever. open() reindexes
        // every current file below anyway, so clear the index first (a
        // separate commit, so the wipe is fully applied before the re-adds).
        index.clear().await?;
        index.commit().await?;

        let files = scanner::scan_indexable_files(&root)?;

        // Bulk index. Keep memory bounded by reading files one at a time.
        // HTML is stripped to visible text so it's searchable like markdown.
        for path in &files {
            let content = std::fs::read_to_string(path).unwrap_or_default();
            let (body, title) = if scanner::is_html(path) {
                (scanner::strip_html(&content), scanner::html_title(&content))
            } else {
                (content, None)
            };
            let mtime = file_mtime_ms(path);
            index
                .upsert_file_titled(path, &body, mtime, title.as_deref())
                .await?;
        }
        index.commit().await?;

        let count = files.len();
        let index_for_watcher = index.clone();
        let watcher = crate::watcher::watch_vault(&root, move |changes| {
            let app = app.clone();
            let index = index_for_watcher.clone();
            // Move event handling off the watcher thread.
            tauri::async_runtime::spawn(async move {
                if let Err(e) = handle_changes(&app, &index, &changes).await {
                    tracing::warn!("handle_changes error: {e}");
                }
            });
        })?;

        *self.inner.write() = Some(OpenVault {
            root,
            index,
            _watcher: watcher,
        });
        Ok(count)
    }

    /// List every file the sidebar should surface — markdown + canvas.
    /// Re-scans disk. Tantivy indexing still uses scan_markdown_files
    /// so canvas JSON doesn't pollute body search.
    pub fn list_files(&self) -> AppResult<Vec<VaultFileEntry>> {
        let root = self.root().ok_or(AppError::NoVault)?;
        let paths = scanner::scan_vault_files(&root)?;
        Ok(paths
            .into_iter()
            .map(|p| {
                let rel = p
                    .strip_prefix(&root)
                    .map(|r| r.to_path_buf())
                    .unwrap_or_else(|_| p.clone());
                let meta = std::fs::metadata(&p).ok();
                VaultFileEntry {
                    name: p
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string(),
                    rel_path: rel.to_string_lossy().into_owned(),
                    path: p.to_string_lossy().into_owned(),
                    mtime_ms: meta.as_ref().map(file_mtime_ms_from_meta).unwrap_or(0),
                    size: meta.map(|m| m.len()).unwrap_or(0),
                }
            })
            .collect())
    }
}

async fn handle_changes(
    app: &AppHandle,
    index: &MarkupIndex,
    changes: &[VaultChange],
) -> AppResult<()> {
    for change in changes {
        match change {
            VaultChange::Upserted(path) => {
                if crate::scanner::is_indexable(path) {
                    upsert_indexable(index, path).await?;
                }
            }
            VaultChange::Removed(path) => {
                index.remove_file(path).await?;
            }
            VaultChange::Renamed(from, to) => {
                index.remove_file(from).await?;
                if crate::scanner::is_indexable(to) {
                    upsert_indexable(index, to).await?;
                }
            }
        }
    }
    index.commit().await?;
    let _ = app.emit("vault-changed", ());
    Ok(())
}

/// Read a file and upsert its searchable body into the index (HTML stripped to
/// visible text, markdown verbatim).
async fn upsert_indexable(index: &MarkupIndex, path: &Path) -> AppResult<()> {
    let content = std::fs::read_to_string(path).unwrap_or_default();
    let (body, title) = if crate::scanner::is_html(path) {
        (
            crate::scanner::strip_html(&content),
            crate::scanner::html_title(&content),
        )
    } else {
        (content, None)
    };
    let mtime = file_mtime_ms(path);
    index
        .upsert_file_titled(path, &body, mtime, title.as_deref())
        .await
}

pub fn file_mtime_ms(path: &Path) -> i64 {
    std::fs::metadata(path)
        .ok()
        .as_ref()
        .map(file_mtime_ms_from_meta)
        .unwrap_or(0)
}

pub fn file_mtime_ms_from_meta(meta: &std::fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
