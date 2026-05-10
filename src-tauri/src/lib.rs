mod commands;
mod commands_locale;
mod commands_vault;
mod commands_window;
mod menu;

pub mod error;
pub mod i18n;
pub mod index;
pub mod scanner;
pub mod vault;
pub mod watcher;

use commands::{
    log_perf, open_file, read_file, rename_file, render_html, trash_file, write_file,
    write_image,
};
use commands_locale::set_locale;
use commands_window::new_window;
use commands_vault::{
    close_vault, current_vault, list_vault_files, open_vault, pick_vault, search_vault,
};
use tauri::Emitter;
use vault::VaultState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,tantivy=warn,markup=debug")),
        )
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(VaultState::new())
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
            log_perf,
            set_locale,
            new_window,
            pick_vault,
            open_vault,
            close_vault,
            list_vault_files,
            current_vault,
            search_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running markup");
}
