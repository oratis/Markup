//! Sync the JS-side locale to the native macOS menu by rebuilding it.
//!
//! Tauri 2's `Manager::set_menu` swaps the menu atomically; the user sees
//! the new labels the next time they open a top-level item. Items keep
//! the same IDs so existing event listeners on the JS side stay valid.

use crate::error::{AppError, AppResult};
use crate::i18n::Locale;
use crate::menu;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn set_locale(app: AppHandle, locale: String) -> AppResult<()> {
    let loc = Locale::from_str(&locale);
    let new_menu = menu::build_with_locale(&app, loc)
        .map_err(|e| AppError::Other(format!("rebuild menu: {e}")))?;
    app.set_menu(new_menu)
        .map_err(|e| AppError::Other(format!("set_menu: {e}")))?;
    Ok(())
}
