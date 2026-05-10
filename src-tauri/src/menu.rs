//! Native macOS menu bar. Items emit `menu-event` notifications which the
//! React side listens for via `listen('menu-event', ...)`. Labels are
//! localised via [`crate::i18n`].

use crate::i18n::{self, Locale};
use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Wry};

pub fn build(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let loc = i18n::detect();
    build_with_locale(app, loc)
}

pub fn build_with_locale(app: &AppHandle, loc: Locale) -> tauri::Result<Menu<Wry>> {
    let app_submenu = SubmenuBuilder::new(app, "Markup")
        .item(&PredefinedMenuItem::about(app, Some(i18n::t(loc, "menu.about")), None)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("settings", i18n::t(loc, "menu.settings"))
                .accelerator("CmdOrCtrl+,")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let file_submenu = SubmenuBuilder::new(app, i18n::t(loc, "menu.file"))
        .item(
            &MenuItemBuilder::with_id("new_file", i18n::t(loc, "menu.new"))
                .accelerator("CmdOrCtrl+N")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("new_window", i18n::t(loc, "menu.newWindow"))
                .accelerator("CmdOrCtrl+Shift+N")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_file", i18n::t(loc, "menu.open"))
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_recent", i18n::t(loc, "menu.openRecent"))
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_vault", i18n::t(loc, "menu.openVault"))
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("close_vault", i18n::t(loc, "menu.closeVault"))
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("save", i18n::t(loc, "menu.save"))
                .accelerator("CmdOrCtrl+S")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("save_as", i18n::t(loc, "menu.saveAs"))
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("export_html", i18n::t(loc, "menu.exportHtml"))
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("export_pdf", i18n::t(loc, "menu.exportPdf"))
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("close_tab", i18n::t(loc, "menu.closeTab"))
                .accelerator("CmdOrCtrl+W")
                .build(app)?,
        )
        .build()?;

    let edit_submenu = SubmenuBuilder::new(app, i18n::t(loc, "menu.edit"))
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("find_in_file", i18n::t(loc, "menu.findInFile"))
                .accelerator("CmdOrCtrl+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("find_in_vault", i18n::t(loc, "menu.findInVault"))
                .accelerator("CmdOrCtrl+Shift+F")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("quick_open", i18n::t(loc, "menu.quickOpen"))
                .accelerator("CmdOrCtrl+P")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("command_palette", i18n::t(loc, "menu.commandPalette"))
                .accelerator("CmdOrCtrl+Shift+P")
                .build(app)?,
        )
        .build()?;

    let view_submenu = SubmenuBuilder::new(app, i18n::t(loc, "menu.view"))
        .item(
            &MenuItemBuilder::with_id(
                "toggle_source_mode",
                i18n::t(loc, "menu.toggleSourceMode"),
            )
            .accelerator("CmdOrCtrl+/")
            .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_sidebar", i18n::t(loc, "menu.toggleSidebar"))
                .accelerator("CmdOrCtrl+B")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_outline", i18n::t(loc, "menu.toggleOutline"))
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("toggle_focus", i18n::t(loc, "menu.focusMode"))
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle_typewriter", i18n::t(loc, "menu.typewriterMode"))
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("theme_light", i18n::t(loc, "menu.themeLight"))
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("theme_dark", i18n::t(loc, "menu.themeDark"))
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("theme_sepia", i18n::t(loc, "menu.themeSepia"))
                .build(app)?,
        )
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, i18n::t(loc, "menu.window"))
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let help_submenu = SubmenuBuilder::new(app, i18n::t(loc, "menu.help"))
        .item(&MenuItemBuilder::with_id("about", i18n::t(loc, "menu.about")).build(app)?)
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
