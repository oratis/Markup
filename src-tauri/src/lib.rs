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
use tauri::{Emitter, Manager, State};
// RunEvent::Opened (the Finder open-document event) only exists on macOS.
#[cfg(target_os = "macos")]
use tauri::RunEvent;
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

/// True for paths we treat as openable Markdown documents.
fn is_markdown_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.ends_with(".md")
        || lower.ends_with(".markdown")
        || lower.ends_with(".mdx")
        || lower.ends_with(".mkd")
}

/// Convert the `file://` URLs from a macOS open-document event into
/// filesystem paths, keeping only Markdown files we recognise.
#[cfg(target_os = "macos")]
fn open_urls_to_paths(urls: &[tauri::Url]) -> Vec<String> {
    urls.iter()
        .filter_map(|u| u.to_file_path().ok())
        .map(|p| p.to_string_lossy().into_owned())
        .filter(|p| is_markdown_path(p))
        .collect()
}

/// Extract openable Markdown paths from a process argv. Windows/Linux deliver
/// "Open With" / double-click as a launch argument rather than a
/// `RunEvent::Opened` event. Skips argv[0] and keeps only args that point at an
/// existing Markdown file (guards against flags or stale paths).
#[cfg(any(target_os = "windows", target_os = "linux"))]
fn paths_from_argv(argv: &[String]) -> Vec<String> {
    argv.iter()
        .skip(1)
        .filter(|a| is_markdown_path(a) && std::path::Path::new(a).is_file())
        .cloned()
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

    let builder = tauri::Builder::default();

    // single-instance must be registered FIRST. macOS already enforces a single
    // instance for .app bundles and delivers file opens via RunEvent::Opened, so
    // this path is Windows/Linux only: focus the running window and forward any
    // Markdown file passed on the second instance's argv.
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.set_focus();
        }
        let paths = paths_from_argv(&argv);
        if paths.is_empty() {
            return;
        }
        if let Some(state) = app.try_state::<PendingOpenFiles>() {
            if let Ok(mut v) = state.0.lock() {
                v.extend(paths.iter().cloned());
            }
        }
        let _ = app.emit("open-files", paths);
    }));

    builder
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

            // Windows/Linux: open a Markdown file passed on the initial launch
            // argv (macOS receives RunEvent::Opened instead). The frontend
            // drains PendingOpenFiles on startup via take_pending_files.
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                let paths = paths_from_argv(&std::env::args().collect::<Vec<_>>());
                if !paths.is_empty() {
                    if let Some(state) = app.try_state::<PendingOpenFiles>() {
                        if let Ok(mut v) = state.0.lock() {
                            v.extend(paths);
                        }
                    }
                }
            }
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
        .run(|_handle, _event| {
            // macOS delivers Finder double-clicks / "Open With" / `open
            // file.md` as RunEvent::Opened. We both buffer (for cold
            // start, before the webview listener exists) and emit (for
            // when the app is already running). Windows/Linux deliver file
            // arguments differently (argv) — see the hardening to-do.
            #[cfg(target_os = "macos")]
            if let RunEvent::Opened { urls } = _event {
                let paths = open_urls_to_paths(&urls);
                if paths.is_empty() {
                    return;
                }
                if let Some(state) = _handle.try_state::<PendingOpenFiles>() {
                    if let Ok(mut v) = state.0.lock() {
                        v.extend(paths.iter().cloned());
                    }
                }
                let _ = _handle.emit("open-files", paths);
            }
        });
}
