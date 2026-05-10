//! Persistent "recent files" list. Mirrors the JS-side localStorage list
//! but lives on disk so a fresh WebView (e.g. a second window) sees the
//! same recents on first paint, before any in-page hydration.
//!
//! Storage: ~/Library/Application Support/markup/recent.json — newline-
//! tolerant JSON array of absolute paths, oldest-first... actually we
//! write newest-first to match the JS store. Cap at 50 to keep the file
//! tiny.

use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const MAX: usize = 50;

#[derive(Default, Serialize, Deserialize)]
struct RecentList {
    paths: Vec<String>,
}

fn recent_path() -> Option<PathBuf> {
    let home = std::env::var_os("HOME")?;
    Some(
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("markup")
            .join("recent.json"),
    )
}

fn load() -> RecentList {
    let Some(p) = recent_path() else {
        return RecentList::default();
    };
    let Ok(raw) = std::fs::read_to_string(&p) else {
        return RecentList::default();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn save(list: &RecentList) {
    let Some(p) = recent_path() else { return };
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(s) = serde_json::to_string(list) {
        let _ = std::fs::write(&p, s);
    }
}

#[tauri::command]
pub fn list_recent_files() -> AppResult<Vec<String>> {
    Ok(load().paths)
}

#[tauri::command]
pub fn push_recent_file(path: String) -> AppResult<()> {
    let mut list = load();
    list.paths.retain(|p| p != &path);
    list.paths.insert(0, path);
    list.paths.truncate(MAX);
    save(&list);
    Ok(())
}

#[tauri::command]
pub fn clear_recent_files() -> AppResult<()> {
    save(&RecentList::default());
    Ok(())
}
