//! Filesystem watcher for an open vault. Wraps notify-debouncer-full so we
//! coalesce rapid bursts (the typical "save" sequence is several events on
//! macOS — touch tmp, rename, modify mtime).

use crate::error::AppResult;
use notify::RecursiveMode;
use notify_debouncer_full::{new_debouncer, DebouncedEvent, Debouncer, RecommendedCache};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

pub struct VaultWatcher {
    _debouncer: Debouncer<notify::RecommendedWatcher, RecommendedCache>,
}

#[derive(Debug, Clone)]
pub enum VaultChange {
    /// File created or modified on disk.
    Upserted(PathBuf),
    /// File removed from disk.
    Removed(PathBuf),
    /// Renamed: (old, new). Note: notify emits this as remove+create on some FSes.
    Renamed(PathBuf, PathBuf),
}

/// Start watching `root` recursively. The closure is invoked for each *batched*
/// change set after a short debounce window. It runs on the watcher's own
/// thread; keep it cheap and offload work to your async runtime.
pub fn watch_vault<F>(root: &Path, mut on_changes: F) -> AppResult<VaultWatcher>
where
    F: FnMut(Vec<VaultChange>) + Send + 'static,
{
    let (tx, rx) = mpsc::channel();
    let mut debouncer = new_debouncer(Duration::from_millis(150), None, tx)?;

    debouncer.watch(root, RecursiveMode::Recursive)?;

    // Consumer thread translates DebouncedEvent → VaultChange.
    std::thread::spawn(move || {
        while let Ok(res) = rx.recv() {
            let events = match res {
                Ok(events) => events,
                Err(errs) => {
                    tracing::warn!("watcher errors: {:?}", errs);
                    continue;
                }
            };
            let mut changes = Vec::new();
            for ev in events {
                changes.extend(translate(ev));
            }
            if !changes.is_empty() {
                on_changes(changes);
            }
        }
    });

    Ok(VaultWatcher {
        _debouncer: debouncer,
    })
}

fn translate(ev: DebouncedEvent) -> Vec<VaultChange> {
    use notify::EventKind::*;
    let paths = ev.event.paths;
    match ev.event.kind {
        Create(_) | Modify(_) => paths.into_iter().map(VaultChange::Upserted).collect(),
        Remove(_) => paths.into_iter().map(VaultChange::Removed).collect(),
        // Rename "both" arrives with two paths; "from"/"to" arrive separately.
        // We treat both ends as Upserted/Removed to keep the index in sync.
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;
    use tempfile::tempdir;

    #[test]
    fn detects_create_event() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().to_path_buf();
        let collected: Arc<Mutex<Vec<VaultChange>>> = Arc::new(Mutex::new(Vec::new()));
        let collected_cloned = collected.clone();

        let _w = watch_vault(&root, move |changes| {
            collected_cloned.lock().unwrap().extend(changes);
        })
        .unwrap();

        // The watcher takes a moment to subscribe.
        std::thread::sleep(Duration::from_millis(200));
        std::fs::write(root.join("hello.md"), "hi").unwrap();

        // Wait long enough for the 150ms debounce + filesystem notification.
        std::thread::sleep(Duration::from_millis(800));

        let got = collected.lock().unwrap().clone();
        assert!(
            got.iter().any(|c| matches!(c, VaultChange::Upserted(p) if p.ends_with("hello.md"))),
            "expected upsert for hello.md, got {:?}",
            got
        );
    }
}
