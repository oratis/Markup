mod authorized;
mod bookmark;
mod commands;
mod commands_locale;
mod commands_vault;
mod commands_window;
mod github;
mod github_vault;
mod menu;
mod recent;
mod token_store;

pub mod error;
pub mod i18n;
pub mod index;
pub mod scanner;
pub mod vault;
pub mod watcher;

use authorized::{authorize_paths, WriteScope};
use commands::{
    log_perf, open_file, read_file, rename_file, render_html, trash_file, write_file, write_image,
    write_preview_html,
};
use commands_locale::set_locale;
use commands_vault::{
    close_vault, current_vault, list_vault_files, open_vault, pick_vault, restore_vault,
    search_vault,
};
use commands_window::new_window;
use recent::{clear_recent_files, list_recent_files, push_recent_file};
use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent, State};
use vault::VaultState;

/// Files macOS asked us to open (Finder double-click / "Open With" /
/// `open file.md`) before the webview's listener was ready. The frontend
/// drains this once on startup; live opens come through the "open-files"
/// event instead.
#[derive(Default)]
struct PendingOpenFiles(Mutex<Vec<String>>);

#[tauri::command]
fn take_pending_files(state: State<PendingOpenFiles>) -> Vec<String> {
    let mut v = state.0.lock().unwrap_or_else(|e| e.into_inner());
    std::mem::take(&mut *v)
}

/// Convert the `file://` URLs from a macOS open-document event into
/// filesystem paths, keeping only Markdown files we recognise.
fn open_urls_to_paths(urls: &[tauri::Url]) -> Vec<String> {
    urls.iter()
        .filter_map(|u| u.to_file_path().ok())
        .map(|p| p.to_string_lossy().into_owned())
        .filter(|p| {
            let lower = p.to_ascii_lowercase();
            lower.ends_with(".md")
                || lower.ends_with(".markdown")
                || lower.ends_with(".mdx")
                || lower.ends_with(".mkd")
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("info,tantivy=warn,markup=debug")
            }),
        )
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        // Persists the user-selected vault folder as a security-scoped
        // bookmark so access survives relaunch under the App Sandbox
        // (MAS). Harmless in the non-sandboxed direct build. Must be
        // registered AFTER fs so it can wrap the fs scope.
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(VaultState::new())
        .manage(WriteScope::new())
        .manage(PendingOpenFiles::default())
        .setup(|app| {
            let menu = menu::build(app.handle())?;
            app.set_menu(menu)?;
            let handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                let id = event.id().0.clone();
                if let Err(e) = handle.emit("menu-event", id) {
                    tracing::warn!("emit menu-event failed: {e}");
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_file,
            read_file,
            write_file,
            rename_file,
            trash_file,
            write_image,
            render_html,
            write_preview_html,
            log_perf,
            set_locale,
            new_window,
            list_recent_files,
            push_recent_file,
            clear_recent_files,
            pick_vault,
            open_vault,
            close_vault,
            list_vault_files,
            current_vault,
            search_vault,
            restore_vault,
            take_pending_files,
            authorize_paths,
            github::github_device_start,
            github::github_device_poll,
            token_store::github_token_load,
            token_store::github_token_save,
            token_store::github_token_delete,
            github_vault::github_open_repo_vault,
            github_vault::github_refresh_vault,
            github_vault::github_vault_info,
            github_vault::github_vault_status,
            github_vault::github_propose_changes,
        ])
        .build(tauri::generate_context!())
        .expect("error while building markup")
        .run(|handle, event| {
            // macOS delivers Finder double-clicks / "Open With" / `open
            // file.md` as RunEvent::Opened. We both buffer (for cold
            // start, before the webview listener exists) and emit (for
            // when the app is already running).
            if let RunEvent::Opened { urls } = event {
                let paths = open_urls_to_paths(&urls);
                if paths.is_empty() {
                    return;
                }
                if let Some(state) = handle.try_state::<PendingOpenFiles>() {
                    if let Ok(mut v) = state.0.lock() {
                        v.extend(paths.iter().cloned());
                    }
                }
                let _ = handle.emit("open-files", paths);
            }
        });
}
