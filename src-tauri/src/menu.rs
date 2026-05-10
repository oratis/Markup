//! Native macOS menu bar. Items emit `menu-event` notifications which the
//! React side listens for via `listen('menu-event', ...)`.

use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Wry};

pub fn build(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let app_submenu = SubmenuBuilder::new(app, "Markup")
        .item(&PredefinedMenuItem::about(app, Some("About Markup"), None)?)
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let file_submenu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("new_file", "New File")
                .accelerator("CmdOrCtrl+N")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_file", "Open File…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_recent", "Open Recent…")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_vault", "Open Vault…")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("close_vault", "Close Vault")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("save", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("save_as", "Save As…")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("export_html", "Export as HTML…")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("export_pdf", "Export as PDF (Print)…")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("close_tab", "Close Tab")
                .accelerator("CmdOrCtrl+W")
                .build(app)?,
        )
        .build()?;

    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("find_in_file", "Find in File")
                .accelerator("CmdOrCtrl+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("find_in_vault", "Find in Vault")
                .accelerator("CmdOrCtrl+Shift+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("quick_open", "Quick Open")
                .accelerator("CmdOrCtrl+P")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("command_palette", "Command Palette")
                .accelerator("CmdOrCtrl+Shift+P")
                .build(app)?,
        )
        .build()?;

    let view_submenu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("toggle_source_mode", "Toggle Source Mode")
                .accelerator("CmdOrCtrl+/")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
                .accelerator("CmdOrCtrl+B")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_outline", "Toggle Outline")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("toggle_focus", "Focus Mode")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_typewriter", "Typewriter Mode")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("theme_light", "Light Theme").build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("theme_dark", "Dark Theme").build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("theme_sepia", "Sepia Theme").build(app)?,
        )
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let help_submenu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("about", "About Markup").build(app)?)
        .build()?;

    Menu::with_items(
        app,
        &[
            &app_submenu,
            &file_submenu,
            &edit_submenu,
            &view_submenu,
            &window_submenu,
            &help_submenu,
        ],
    )
}
